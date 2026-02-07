
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { User } from '../../types';
import Avatar from '../../components/Avatar';
import Loader from '../../components/Loader';
import { useNotification } from '../../hooks/useNotification';
import Notification from '../../components/Notification';
import RoleFilter from '../../components/RoleFilter';
import DepartmentFilter from '../../components/DepartmentFilter';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import ThemeToggle from '../../components/ThemeToggle';
import UserNav from '../../components/UserNav';
import SearchInput from '../../components/SearchInput';
import Pagination from '../../components/Pagination';
import TableSkeleton from '../../components/TableSkeleton';
import UserImportModal from '../../components/UserImportModal';
import { IconArrowUp, IconArrowDown, IconSelector, IconCirclePlus, IconUpload, IconEdit, IconTrash, IconChevronLeft, IconEye, IconEyeOff, IconFileText, IconLock } from '@tabler/icons-react';
import { ROLES, DEPARTMENTS } from '../../constants';


// --- Types ---
type Profile = {
    id: string;
    full_name: string | null;
    role: 'Преподаватель' | 'Модератор' | 'Администратор' | null;
    avatar_url: string | null;
    department: string | null;
    email?: string;
};
type FormMode = 'list' | 'add' | 'edit';
type SortKey = 'full_name' | 'role' | 'department';
type SortConfig = { key: SortKey | null; order: 'asc' | 'desc' };



// Helper to extract error message safely
const getErrorMessage = (error: any): string => {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    if (typeof error === 'object' && error !== null) {
        if ('message' in error) return String((error as any).message);
        if ('error_description' in error) return String((error as any).error_description);
        if ('details' in error) return String((error as any).details);
    }
    return 'Неизвестная ошибка';
};


// --- Reusable Sort Button Component ---
interface SortButtonProps {
    title: string;
    sortKey: SortKey;
    sortConfig: SortConfig;
    onSort: (key: SortKey) => void;
}
const SortButton: React.FC<SortButtonProps> = ({ title, sortKey, sortConfig, onSort }) => {
    const isSorting = sortConfig.key === sortKey;
    const renderIcon = () => {
        if (!isSorting) return <IconSelector className="h-4 w-4 shrink-0 text-muted-foreground/50" />;
        if (sortConfig.order === 'asc') return <IconArrowUp className="h-4 w-4 shrink-0" />;
        return <IconArrowDown className="h-4 w-4 shrink-0" />;
    };
    return (
        <Button variant="ghost" size="sm" onClick={() => onSort(sortKey)} className="flex items-center gap-1.5 h-auto p-1 -m-1 font-normal text-muted-foreground hover:text-foreground">
            <span>{title}</span>
            {renderIcon()}
        </Button>
    );
};


// --- Main Page Component ---
interface UserManagementPageProps {
    user: User;
    onLogout: () => void;
    theme: string;
    onToggleTheme: () => void;
    onNavigateToJournal: () => void;
    onNavigateToProfile: () => void;
    onNavigateToRequests: () => void;
}

const UserManagementPage: React.FC<UserManagementPageProps> = ({ user, onLogout, theme, onToggleTheme, onNavigateToJournal, onNavigateToProfile, onNavigateToRequests }) => {
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mode, setMode] = useState<FormMode>('list');
    const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
    const [userToDelete, setUserToDelete] = useState<Profile | null>(null);
    const [userToResetPassword, setUserToResetPassword] = useState<Profile | null>(null);
    const { notification, showNotification } = useNotification();

    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'full_name', order: 'asc' });
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState('all');
    const [filterDepartment, setFilterDepartment] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 15;

    // Debounce search term
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 500);
        return () => clearTimeout(handler);
    }, [searchTerm]);

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearchTerm, filterRole, filterDepartment]);

    const fetchProfiles = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            let query = supabase.from('profiles').select('*', { count: 'exact' });

            // Apply Filters
            if (filterRole !== 'all') {
                query = query.eq('role', filterRole);
            }
            if (filterDepartment !== 'all') {
                query = query.eq('department', filterDepartment);
            }
            if (debouncedSearchTerm) {
                query = query.ilike('full_name', `%${debouncedSearchTerm}%`);
            }

            // Apply Sorting
            if (sortConfig.key) {
                query = query.order(sortConfig.key, { ascending: sortConfig.order === 'asc' });
            } else {
                query = query.order('full_name', { ascending: true });
            }

            // Apply Pagination
            const from = (currentPage - 1) * ITEMS_PER_PAGE;
            const to = from + ITEMS_PER_PAGE - 1;
            query = query.range(from, to);

            const { data, error, count } = await query;

            if (error) throw error;
            setProfiles((data as Profile[]) || []);
            setTotalCount(count || 0);

        } catch (err: any) {
            setError(`Не удалось загрузить профили: ${getErrorMessage(err)}`);
        } finally {
            setLoading(false);
        }
    }, [currentPage, sortConfig, filterRole, filterDepartment, debouncedSearchTerm]);

    useEffect(() => {
        fetchProfiles();
    }, [fetchProfiles]);

    useEffect(() => {
        // Return to list mode when filters change, usually good UX
        if (mode !== 'list') return;
    }, [debouncedSearchTerm, filterRole, filterDepartment]);


    const roleOptions = [
        { value: 'all', label: 'Все роли' },
        ...ROLES.map(r => ({ value: r, label: r }))
    ];

    const departmentOptions = [
        { value: 'all', label: 'Все кафедры' },
        ...DEPARTMENTS.map(d => ({ value: d, label: d }))
    ];

    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

    const onSort = (key: SortKey) => {
        let order: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.order === 'asc') {
            order = 'desc';
        }
        setSortConfig({ key, order });
    };

    const handleEdit = useCallback((user: Profile) => {
        setSelectedUser(user);
        setMode('edit');
    }, []);

    const confirmDelete = async () => {
        if (!userToDelete) return;
        try {
            const { error: adminError } = await (supabase.rpc as any)('delete_user_by_id', { user_id_to_delete: userToDelete.id });
            if (adminError) throw adminError;

            showNotification('Пользователь успешно удален', 'success');
            fetchProfiles();
        } catch (err: any) {
            showNotification(`Ошибка удаления: ${getErrorMessage(err)}. Убедитесь, что у вас есть права.`, 'info');
        } finally {
            setUserToDelete(null);
        }
    };

    const handleFormSuccess = () => {
        fetchProfiles();
        setMode('list');
        setSelectedUser(null);
    };

    const handleDownloadTemplate = () => {
        const csvContent = [
            'full_name;email;password;role;department',
            'Иванов Иван Иванович;ivanov@example.com;password123;Преподаватель;Кафедра правовых дисциплин',
            'Петров Петр Петрович;petrov@example.com;securePass!2;Администратор;',
            'Сидорова Анна Сергеевна;sidorova@example.com;userPass2024;Модератор;Кафедра психологии и конфликтологии'
        ].join('\n');

        const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'users_import_template.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleImportSuccess = () => {
        setIsImportModalOpen(false);
        showNotification('Импорт успешно завершен', 'success');
        fetchProfiles();
    };

    return (
        <div className="min-h-screen bg-muted flex flex-col">

            <main className="flex-1 flex flex-col container mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 gap-6">
                {mode === 'list' && (
                    <>
                        <Card className="shadow-none">
                            <div className="p-4 border-b flex flex-wrap items-center justify-between gap-4">
                                <div>
                                    <h2 className="text-xl font-semibold tracking-tight">Пользователи</h2>
                                    <p className="text-sm text-muted-foreground mt-1">Добавление, редактирование и удаление учетных записей.</p>
                                </div>
                                <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
                                    <Button onClick={() => { setSelectedUser(null); setMode('add'); }}>
                                        <IconCirclePlus className="w-4 h-4" />
                                        Добавить
                                    </Button>
                                    <div className="flex items-center gap-2">
                                        <Button variant="outline" onClick={handleDownloadTemplate} title="Скачать шаблон CSV">
                                            <IconFileText className="w-4 h-4" />
                                            <span className="hidden sm:inline">Шаблон</span>
                                        </Button>
                                        <Button variant="outline" onClick={() => setIsImportModalOpen(true)}>
                                            <IconUpload className="w-4 h-4" />
                                            Импорт
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 flex items-center justify-between gap-4">
                                <SearchInput
                                    value={searchTerm}
                                    onChange={setSearchTerm}
                                    placeholder="Поиск по имени..."
                                />
                                <div className="flex items-center gap-3">
                                    <div className="w-[200px]">
                                        <RoleFilter
                                            roles={roleOptions.map(o => o.value)}
                                            selectedRole={filterRole}
                                            onRoleChange={setFilterRole}
                                        />
                                    </div>
                                    <div className="w-[280px]">
                                        <DepartmentFilter
                                            departments={departmentOptions.map(o => o.value)}
                                            selectedDepartment={filterDepartment}
                                            onDepartmentChange={setFilterDepartment}
                                        />
                                    </div>
                                </div>
                            </div>
                        </Card>

                        <Card className="shadow-none">
                            {error && <div className="p-4 text-sm text-destructive whitespace-pre-wrap">{error}</div>}

                            {loading ? (
                                <div className="p-4">
                                    <TableSkeleton rows={10} />
                                </div>
                            ) : (
                                <>
                                    <div className="overflow-hidden rounded-lg">
                                        {profiles.length === 0 ? (
                                            <div className="p-8 text-center text-muted-foreground">Пользователи не найдены.</div>
                                        ) : (
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead className="w-[50%]">
                                                            <SortButton title="Пользователь" sortKey="full_name" sortConfig={sortConfig} onSort={onSort} />
                                                        </TableHead>
                                                        <TableHead className="hidden md:table-cell">
                                                            <div className="flex items-center">
                                                                <SortButton title="Роль" sortKey="role" sortConfig={sortConfig} onSort={onSort} />
                                                                <span className="mx-1">/</span>
                                                                <SortButton title="Кафедра" sortKey="department" sortConfig={sortConfig} onSort={onSort} />
                                                            </div>
                                                        </TableHead>
                                                        <TableHead className="text-right w-[100px]">Действия</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {profiles.map(profile => (
                                                        <TableRow key={profile.id}>
                                                            <TableCell className='py-0'>
                                                                <div className="flex items-center gap-3">
                                                                    <Avatar name={profile.full_name || '...'} avatarUrl={profile.avatar_url || undefined} className="w-8 h-8 shrink-0" />
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="font-medium text-sm truncate">{profile.full_name || <span className="text-muted-foreground italic">Имя не указано</span>}</p>
                                                                        <div className="md:hidden text-sm text-muted-foreground">
                                                                            <span className="truncate">{profile.role || 'Роль не назначена'}</span>
                                                                            {profile.department && <span className="italic truncate">, {profile.department}</span>}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="hidden md:table-cell">
                                                                <p className="text-sm text-muted-foreground truncate">{profile.role || 'Роль не назначена'}</p>
                                                                {profile.department && <p className="text-xs text-muted-foreground italic truncate">{profile.department}</p>}
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <div className="flex justify-end items-center gap-1">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={() => setUserToResetPassword(profile)}
                                                                        className="h-8 w-8 inline-flex items-center justify-center rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40"
                                                                        aria-label="Сменить пароль"
                                                                        title="Сменить пароль"
                                                                    >
                                                                        <IconLock className="w-4 h-4" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={() => handleEdit(profile)}
                                                                        className="h-8 w-8 inline-flex items-center justify-center rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                                                                        aria-label="Редактировать"
                                                                        title="Редактировать"
                                                                    >
                                                                        <IconEdit className="w-4 h-4" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={() => setUserToDelete(profile)}
                                                                        disabled={profile.id === user.id}
                                                                        className="h-8 w-8 inline-flex items-center justify-center rounded-lg bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40"
                                                                        aria-label="Удалить"
                                                                        title="Удалить"
                                                                    >
                                                                        <IconTrash className="w-4 h-4" />
                                                                    </Button>
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        )}
                                    </div>
                                    <Pagination
                                        currentPage={currentPage}
                                        totalPages={totalPages}
                                        onPageChange={setCurrentPage}
                                        totalItems={totalCount}
                                        itemsPerPage={ITEMS_PER_PAGE}
                                    />
                                </>
                            )}
                        </Card>
                    </>
                )}

                {(mode === 'add' || mode === 'edit') && (
                    <Card className="shadow-none overflow-hidden relative">
                        <UserForm
                            mode={mode}
                            user={selectedUser}
                            onSuccess={handleFormSuccess}
                            onCancel={() => { setMode('list'); setSelectedUser(null); setError(null); }}
                            showNotification={showNotification}
                        />
                    </Card>
                )}

                {/* Confirm Delete Dialog */}
                {userToDelete && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-background/40 backdrop-blur-sm"
                        onClick={() => setUserToDelete(null)}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="delete-dialog-title"
                    >
                        <div className="bg-background rounded-lg border shadow-lg p-6 max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
                            <h3 id="delete-dialog-title" className="text-lg font-semibold">Подтвердите удаление</h3>
                            <p className="mt-2 text-sm text-muted-foreground">
                                Вы уверены, что хотите удалить пользователя "{userToDelete.full_name || 'Без имени'}"? Это действие нельзя отменить.
                            </p>
                            <div className="mt-6 flex justify-end gap-4">
                                <Button
                                    variant="secondary"
                                    onClick={() => setUserToDelete(null)}
                                >
                                    Отмена
                                </Button>
                                <Button
                                    variant="destructive"
                                    onClick={confirmDelete}
                                >
                                    Удалить
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Reset Password Dialog */}
                <ResetPasswordDialog
                    user={userToResetPassword}
                    onClose={() => setUserToResetPassword(null)}
                    showNotification={showNotification}
                />

            </main>

            <UserImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onSuccess={handleImportSuccess}
            />

            <Notification message={notification?.message || null} type={notification?.type} />
        </div >
    );
};


// --- Reset Password Dialog Component ---
const ResetPasswordDialog: React.FC<{ user: Profile | null, onClose: () => void, showNotification: (msg: string, type: 'success' | 'info') => void }> = ({ user, onClose, showNotification }) => {
    const [newPassword, setNewPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    if (!user) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const session = await supabase.auth.getSession();
            const token = session.data.session?.access_token;

            if (!token) throw new Error("No active session");

            // Call Netlify Function
            const response = await fetch('/.netlify/functions/admin-reset-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    userId: user.id,
                    newPassword: newPassword
                })
            });

            let data;
            try {
                const text = await response.text();
                // If text is empty or html (404 from vite), this might fail
                if (text.trim().startsWith('<') || !text.trim()) {
                    throw new Error("Netlify Functions недоступны локально");
                }
                data = JSON.parse(text);
            } catch (e) {
                console.warn("API response parsing failed:", e);
                // Detect if we are on localhost
                if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                    throw new Error("Эта функция работает только после деплоя на Netlify (локальный сервер не поддерживает Backend-функции).");
                }
                throw new Error("Ошибка связи с сервером (Invalid JSON).");
            }

            if (!response.ok) {
                throw new Error(data.error || 'Failed to reset password');
            }

            showNotification(`Пароль для ${user.full_name} успешно изменен.`, 'success');
            onClose();
        } catch (err: any) {
            console.error("Reset Password Failed:", err);
            showNotification(`Ошибка: ${err.message}. Проверьте Server Role Key.`, 'info');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/40 backdrop-blur-sm"
            onClick={onClose}
        >
            <div className="bg-background rounded-lg border shadow-lg p-6 max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-semibold mb-4">Смена пароля</h3>
                <p className="text-sm text-muted-foreground mb-4">
                    Установите новый временный пароль для пользователя <strong>{user.full_name}</strong>.
                </p>
                <form onSubmit={handleSubmit}>
                    <Input
                        type="text"
                        placeholder="Новый пароль (мин. 6 символов)"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        required
                        minLength={6}
                        className="mb-4"
                    />
                    <div className="flex justify-end gap-1">
                        <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>Отмена</Button>
                        <Button type="submit" disabled={isLoading}>{isLoading ? 'Сохранение...' : 'Сменить пароль'}</Button>
                    </div>
                </form>
            </div>
        </div>
    );
};


// --- User Form Sub-component ---
interface UserFormProps {
    mode: 'add' | 'edit';
    user: Profile | null;
    onSuccess: () => void;
    onCancel: () => void;
    showNotification: (message: string, type: 'success' | 'info') => void;
}

const UserForm: React.FC<UserFormProps> = ({ mode, user, onSuccess, onCancel, showNotification }) => {
    const [fullName, setFullName] = useState(user?.full_name || '');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [role, setRole] = useState<User['role']>(user?.role || 'Преподаватель');
    const [department, setDepartment] = useState(user?.department || '');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);
    const firstInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        firstInputRef.current?.focus();
    }, []);

    useEffect(() => {
        if (mode === 'edit' && user) {
            setFullName(user.full_name || '');
            setRole(user.role || 'Преподаватель');
            setDepartment(user.department || '');
        }
    }, [user, mode]);

    const handleFormSubmit = async () => {
        if (!formRef.current?.checkValidity()) {
            formRef.current?.reportValidity();
            return;
        }
        setIsSubmitting(true);
        const TIMEOUT_DURATION = 15000;

        const createTimeout = (): Promise<never> => new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Запрос занял слишком много времени. Проверьте подключение к интернету.')), TIMEOUT_DURATION)
        );

        if (mode === 'add') {
            const { data: { session: adminSession } } = await supabase.auth.getSession();
            if (!adminSession) {
                showNotification('Ошибка аутентификации. Войдите снова.', 'info');
                setIsSubmitting(false);
                return;
            }

            try {
                const signUpPromise = supabase.auth.signUp({
                    email,
                    password,
                    options: { data: { full_name: fullName, role: role, department: department || null } }
                });

                const { error: signUpError } = await Promise.race([signUpPromise, createTimeout()]);
                if (signUpError) throw signUpError;

                const restorePromise = supabase.auth.setSession({
                    access_token: adminSession.access_token,
                    refresh_token: adminSession.refresh_token,
                });

                const { error: restoreError } = await Promise.race([restorePromise, createTimeout()]);
                if (restoreError) throw new Error(`Пользователь создан, но не удалось восстановить сессию администратора: ${getErrorMessage(restoreError)}`);

                showNotification(`Пользователь "${fullName}" успешно создан!`, 'success');
                onSuccess();

            } catch (err: any) {
                showNotification(`Ошибка: ${getErrorMessage(err)}`, 'info');
                if (adminSession) {
                    await supabase.auth.setSession({
                        access_token: adminSession.access_token,
                        refresh_token: adminSession.refresh_token,
                    });
                }
            } finally {
                setIsSubmitting(false);
            }
        } else if (mode === 'edit' && user) {
            try {
                const updatePromise = supabase.from('profiles')
                    .update({ full_name: fullName, role: role, department: department || null })
                    .eq('id', user.id);

                const { error } = await Promise.race([updatePromise, createTimeout()]);
                if (error) throw error;

                showNotification('Данные пользователя обновлены!', 'success');
                onSuccess();
            } catch (err: any) {
                showNotification(`Ошибка: ${getErrorMessage(err)}`, 'info');
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    return (
        <form ref={formRef} onSubmit={(e) => { e.preventDefault(); handleFormSubmit(); }} className="flex-1 flex flex-col mb-0 min-h-0">
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div className="flex items-center mb-4">
                    <Button type="button" variant="ghost" onClick={onCancel} className="text-muted-foreground hover:text-foreground">
                        <IconChevronLeft className="w-4 h-4 mr-1" />
                        Назад к списку
                    </Button>
                </div>
                <h3 className="text-lg font-semibold">{mode === 'add' ? 'Новый пользователь' : 'Редактировать пользователя'}</h3>
                <div>
                    <label htmlFor="fullName" className="block text-sm font-medium mb-1">Полное имя</label>
                    <Input ref={firstInputRef} id="fullName" type="text" value={fullName} onChange={e => setFullName(e.target.value)} required />
                </div>
                {mode === 'add' && (
                    <>
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium mb-1">Email (используется для входа)</label>
                            <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
                        </div>
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium mb-1">Пароль</label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                    minLength={6}
                                    className="pr-10"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 h-full px-3"
                                    aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
                                >
                                    {showPassword
                                        ? <IconEyeOff className="h-5 w-5" />
                                        : <IconEye className="h-5 w-5" />}
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">Минимум 6 символов.</p>
                        </div>
                    </>
                )}
                <div>
                    <label htmlFor="department" className="block text-sm font-medium mb-1">Кафедра (необязательно)</label>
                    <Select value={department || "none"} onValueChange={(value) => setDepartment(value === "none" ? "" : value)}>
                        <SelectTrigger>
                            <SelectValue placeholder="Не выбрана" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">Не выбрана</SelectItem>
                            {DEPARTMENTS.map(d => (
                                <SelectItem key={d} value={d}>{d}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <label htmlFor="role" className="block text-sm font-medium mb-1">Роль</label>
                    <Select value={role} onValueChange={(value) => setRole(value as User['role'])}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {ROLES.map(r => (
                                <SelectItem key={r} value={r}>{r}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-4">
                <Button type="button" variant="secondary" onClick={onCancel}>Отмена</Button>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Сохранение...' : 'Сохранить'}
                </Button>
            </div>
        </form>
    );
};

export default UserManagementPage;
