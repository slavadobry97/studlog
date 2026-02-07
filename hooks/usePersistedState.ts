import { useState, useEffect, useCallback } from 'react';

/**
 * Hook for persisting state in localStorage/sessionStorage
 * Automatically saves and restores state across page reloads and tab switches
 */
export function usePersistedState<T>(
    key: string,
    defaultValue: T,
    storage: 'local' | 'session' = 'session'
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
    const storageObject = storage === 'local' ? localStorage : sessionStorage;

    // Initialize state from storage or use default
    const [state, setState] = useState<T>(() => {
        try {
            const item = storageObject.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.warn(`Error reading ${key} from ${storage}Storage:`, error);
            return defaultValue;
        }
    });

    // Update storage whenever state changes
    useEffect(() => {
        try {
            storageObject.setItem(key, JSON.stringify(state));
        } catch (error) {
            console.warn(`Error saving ${key} to ${storage}Storage:`, error);
        }
    }, [key, state, storageObject, storage]);

    // Clear function to reset to default
    const clear = useCallback(() => {
        try {
            storageObject.removeItem(key);
            setState(defaultValue);
        } catch (error) {
            console.warn(`Error clearing ${key} from ${storage}Storage:`, error);
        }
    }, [key, defaultValue, storageObject]);

    return [state, setState, clear];
}

/**
 * Hook specifically for session-based state (clears on browser close)
 */
export function useSessionState<T>(key: string, defaultValue: T) {
    return usePersistedState(key, defaultValue, 'session');
}

/**
 * Hook specifically for persistent state (survives browser close)
 */
export function useLocalState<T>(key: string, defaultValue: T) {
    return usePersistedState(key, defaultValue, 'local');
}
