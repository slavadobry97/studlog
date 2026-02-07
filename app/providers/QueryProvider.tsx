import React, { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5 * 60 * 1000, // 5 минут
            gcTime: 10 * 60 * 1000, // 10 минут (ранее cacheTime)
            retry: 1,
            refetchOnWindowFocus: false,
        },
    },
});

interface QueryProviderProps {
    children: ReactNode;
}

export const QueryProvider: React.FC<QueryProviderProps> = ({ children }) => {
    return (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );
};
