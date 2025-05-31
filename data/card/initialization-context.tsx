'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { initializeCards } from './index';

interface InitializationContextType {
    isInitialized: boolean;
    isLoading: boolean;
    error: string | null;
}

const InitializationContext = createContext<InitializationContextType>({
    isInitialized: false,
    isLoading: true,
    error: null,
});

export function useCardInitialization() {
    return useContext(InitializationContext);
}

interface InitializationProviderProps {
    children: React.ReactNode;
}

export function CardInitializationProvider({ children }: InitializationProviderProps) {
    const [isInitialized, setIsInitialized] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // 只在客户端初始化
        if (typeof window !== 'undefined') {
            const initAsync = async () => {
                try {
                    console.log('[CardInitializationProvider] Starting card data initialization...');
                    setIsLoading(true);
                    setError(null);
                    await initializeCards();
                    setIsInitialized(true);
                    console.log('[CardInitializationProvider] Card data initialized successfully');
                } catch (error) {
                    console.error('[CardInitializationProvider] Failed to initialize card data:', error);
                    setError(error instanceof Error ? error.message : 'Unknown error');
                } finally {
                    setIsLoading(false);
                }
            };

            initAsync();
        }
    }, []);

    return (
        <InitializationContext.Provider value={{ isInitialized, isLoading, error }}>
            {children}
        </InitializationContext.Provider>
    );
}
