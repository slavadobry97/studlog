import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { User } from '@/types/index';

// Константы для таймаутов и повторных попыток
const TIMEOUTS = {
    PROFILE_FETCH: 8000,
    PROFILE_FETCH_RETRY_BASE: 1500,
    SAFETY_TIMER: 15000,
};

const RETRY = {
    MAX_ATTEMPTS: 3,
};

interface AuthContextType {
    session: Session | null;
    currentUser: User | null;
    loading: boolean;
    error: string | null;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Helper to create a timeout promise
    const createTimeout = (ms: number) => new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), ms)
    );

    const updateUserState = async (session: Session | null) => {
        setSession(session);
        if (session?.user) {
            try {
                let profileData = null;
                let lastError = null;

                for (let attempt = 0; attempt < RETRY.MAX_ATTEMPTS; attempt++) {
                    try {
                        const fetchProfilePromise = supabase
                            .from('profiles')
                            .select('full_name, avatar_url, role, department')
                            .eq('id', session.user.id)
                            .maybeSingle();

                        const result = await Promise.race([
                            fetchProfilePromise,
                            createTimeout(TIMEOUTS.PROFILE_FETCH)
                        ]) as any;

                        if (result.error) throw result.error;
                        profileData = result.data;
                        lastError = null;
                        break;
                    } catch (e: any) {
                        lastError = e;
                        console.warn(`Profile fetch attempt ${attempt + 1} failed:`, e.message);
                        if (attempt < RETRY.MAX_ATTEMPTS - 1) {
                            await new Promise(r => setTimeout(r, TIMEOUTS.PROFILE_FETCH_RETRY_BASE * (attempt + 1)));
                        }
                    }
                }

                if (lastError) throw lastError;

                if (profileData) {
                    const userObject: User = {
                        id: session.user.id,
                        name: profileData.full_name || 'Пользователь',
                        email: session.user.email,
                        avatarUrl: profileData.avatar_url || undefined,
                        role: (profileData.role as User['role']) || 'Преподаватель',
                        department: profileData.department || undefined,
                    };

                    setCurrentUser(userObject);
                    setError(null);
                } else {
                    // Profile not found, fallback to metadata
                    console.warn('Profile not found in database, using Auth metadata.');
                    const metadata = session.user.user_metadata;
                    const fallbackUser: User = {
                        id: session.user.id,
                        name: metadata.full_name || metadata.name || session.user.email || 'Пользователь',
                        email: session.user.email,
                        avatarUrl: metadata.avatar_url,
                        role: (metadata.role as User['role']) || 'Преподаватель',
                        department: metadata.department,
                    };

                    setCurrentUser(fallbackUser);
                    setError(null);
                }
            } catch (e: any) {
                console.error('Critical error fetching profile:', e);

                // Fallback to Auth Metadata (Double fallback in case of query error)
                const metadata = session.user.user_metadata;
                if (metadata && (metadata.full_name || metadata.name)) {
                    // ... same fallback logic ...
                    // To avoid code duplication, we could extract this, but for now I'll just use the existing catch block logic effectively
                    // Actually, if I handle the "else" above, I don't need to re-do it here for the "missing profile" case, 
                    // but this catch block handles NETWORK errors or TIMEOUTS.

                    console.warn('Recovering from profile fetch error using Auth metadata.');
                    const fallbackUser: User = {
                        id: session.user.id,
                        name: metadata.full_name || metadata.name || session.user.email || 'Пользователь',
                        email: session.user.email,
                        avatarUrl: metadata.avatar_url,
                        role: (metadata.role as User['role']) || 'Преподаватель',
                        department: metadata.department,
                    };

                    setCurrentUser(fallbackUser);
                    setError(null);
                } else {
                    if (e.message === 'Timeout' || e.message === 'Failed to fetch') {
                        setError('Превышено время ожидания ответа от сервера. Возможно, база данных "просыпается" после бездействия.');
                    } else {
                        setError(`Ошибка загрузки профиля: ${e.message}`);
                    }
                    setCurrentUser(null);
                }
            }
        } else {
            setCurrentUser(null);
        }
    };

    useEffect(() => {
        let isMounted = true;

        const initialCheck = async () => {
            try {
                const { data, error } = await supabase.auth.getSession();
                if (error) throw error;
                if (isMounted) {
                    await updateUserState(data?.session ?? null);
                }
            } catch (e: any) {
                console.error('Error during initialization:', e);
                if (isMounted) {
                    setError(`Ошибка инициализации: ${e.message}`);
                    await updateUserState(null);
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        initialCheck();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (_event === 'TOKEN_REFRESHED' && currentUser && session?.user?.id === currentUser.id) {
                console.log('Token refreshed, skipping profile reload');
                return;
            }

            if (_event === 'INITIAL_SESSION' && currentUser) {
                console.log('Initial session, user already loaded, skipping');
                return;
            }

            if (isMounted) {
                await updateUserState(session);

                if (_event === 'SIGNED_OUT') {
                    setCurrentUser(null);
                    setError(null);
                }
            }
        });

        const safetyTimer = setTimeout(() => {
            if (isMounted && loading) {
                console.warn('Force stopping loader due to timeout');
                setError('Время ожидания истекло. Сервер не отвечает.');
                setLoading(false);
            }
        }, TIMEOUTS.SAFETY_TIMER);

        return () => {
            isMounted = false;
            clearTimeout(safetyTimer);
            subscription.unsubscribe();
        };
    }, []);

    const signOut = async () => {
        setLoading(true);
        setError(null);
        sessionStorage.clear();
        await supabase.auth.signOut();
        setCurrentUser(null);
        setLoading(false);
    };

    return (
        <AuthContext.Provider value={{ session, currentUser, loading, error, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};
