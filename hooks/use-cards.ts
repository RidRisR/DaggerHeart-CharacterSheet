/**
 * 卡牌数据自定义Hook
 * 提供标准化的卡牌数据获取和状态管理
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    getAllStandardCardsAsync,
    getStandardCardsByTypeAsync,
    customCardManager,
    CardType,
    ExtendedStandardCard
} from '@/data/card';

// Hook状态类型定义
export interface UseCardsState {
    cards: ExtendedStandardCard[];
    loading: boolean;
    error: string | null;
    initialized: boolean;
}

// Hook选项类型定义
export interface UseCardsOptions {
    type?: CardType;
    autoRefresh?: boolean;
    fallbackToBuiltin?: boolean;
    enabled?: boolean;
}

// Hook返回值类型定义
export interface UseCardsReturn extends UseCardsState {
    refresh: () => Promise<void>;
    clearError: () => void;
    retry: () => Promise<void>;
}

/**
 * 获取所有卡牌的Hook
 */
export function useAllCards(options: Omit<UseCardsOptions, 'type'> = {}): UseCardsReturn {
    const {
        autoRefresh = false,
        fallbackToBuiltin = true,
        enabled = true
    } = options;

    const [state, setState] = useState<UseCardsState>({
        cards: [],
        loading: true,
        error: null,
        initialized: false
    });

    const loadCards = useCallback(async () => {
        if (!enabled) return;

        setState(prev => ({ ...prev, loading: true, error: null }));

        try {
            console.log('[useAllCards] 开始加载所有卡牌...');
            const cards = await getAllStandardCardsAsync();

            setState({
                cards,
                loading: false,
                error: null,
                initialized: true
            });

            console.log(`[useAllCards] 成功加载 ${cards.length} 张卡牌`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '获取卡牌数据失败';
            console.error('[useAllCards] 加载失败:', error);

            setState(prev => ({
                ...prev,
                loading: false,
                error: errorMessage,
                initialized: true
            }));

            // 如果启用了fallback，尝试获取内置卡牌
            if (fallbackToBuiltin) {
                try {
                    console.log('[useAllCards] 尝试fallback到内置卡牌...');
                    // 这里可以添加获取内置卡牌的逻辑
                    // const builtinCards = getBuiltinStandardCards();
                    // setState(prev => ({ ...prev, cards: builtinCards, error: null }));
                } catch (fallbackError) {
                    console.warn('[useAllCards] Fallback也失败了:', fallbackError);
                }
            }
        }
    }, [enabled, fallbackToBuiltin]);

    const refresh = useCallback(async () => {
        await loadCards();
    }, [loadCards]);

    const clearError = useCallback(() => {
        setState(prev => ({ ...prev, error: null }));
    }, []);

    const retry = useCallback(async () => {
        clearError();
        await refresh();
    }, [clearError, refresh]);

    // 初始加载
    useEffect(() => {
        loadCards();
    }, [loadCards]);

    // 自动刷新
    useEffect(() => {
        if (!autoRefresh || !enabled) return;

        const interval = setInterval(() => {
            loadCards();
        }, 30000); // 30秒刷新一次

        return () => clearInterval(interval);
    }, [autoRefresh, enabled, loadCards]);

    return {
        ...state,
        refresh,
        clearError,
        retry
    };
}

/**
 * 按类型获取卡牌的Hook
 */
export function useCardsByType(type: CardType, options: Omit<UseCardsOptions, 'type'> = {}): UseCardsReturn {
    const {
        autoRefresh = false,
        fallbackToBuiltin = true,
        enabled = true
    } = options;

    const [state, setState] = useState<UseCardsState>({
        cards: [],
        loading: true,
        error: null,
        initialized: false
    });

    const loadCards = useCallback(async () => {
        if (!enabled || !type) return;

        setState(prev => ({ ...prev, loading: true, error: null }));

        try {
            console.log(`[useCardsByType] 开始加载 ${type} 类型卡牌...`);
            const cards = await getStandardCardsByTypeAsync(type);

            setState({
                cards,
                loading: false,
                error: null,
                initialized: true
            });

            console.log(`[useCardsByType] 成功加载 ${cards.length} 张 ${type} 卡牌`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : `获取${type}卡牌数据失败`;
            console.error(`[useCardsByType] 加载 ${type} 失败:`, error);

            setState(prev => ({
                ...prev,
                loading: false,
                error: errorMessage,
                initialized: true
            }));

            // Fallback逻辑
            if (fallbackToBuiltin) {
                try {
                    console.log(`[useCardsByType] 尝试fallback到内置 ${type} 卡牌...`);
                    // 这里可以添加获取内置特定类型卡牌的逻辑
                } catch (fallbackError) {
                    console.warn(`[useCardsByType] ${type} Fallback也失败了:`, fallbackError);
                }
            }
        }
    }, [type, enabled, fallbackToBuiltin]);

    const refresh = useCallback(async () => {
        await loadCards();
    }, [loadCards]);

    const clearError = useCallback(() => {
        setState(prev => ({ ...prev, error: null }));
    }, []);

    const retry = useCallback(async () => {
        clearError();
        await refresh();
    }, [clearError, refresh]);

    // 初始加载
    useEffect(() => {
        loadCards();
    }, [loadCards]);

    // 自动刷新
    useEffect(() => {
        if (!autoRefresh || !enabled) return;

        const interval = setInterval(() => {
            loadCards();
        }, 30000);

        return () => clearInterval(interval);
    }, [autoRefresh, enabled, loadCards]);

    return {
        ...state,
        refresh,
        clearError,
        retry
    };
}

/**
 * 卡牌系统状态Hook
 */
export function useCardSystemStatus() {
    const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const checkStatus = async () => {
            try {
                const isInitialized = customCardManager.isSystemInitialized();

                if (isInitialized) {
                    setStatus('ready');
                    setError(null);
                } else {
                    // 尝试初始化
                    await customCardManager.ensureInitialized();
                    setStatus('ready');
                    setError(null);
                }
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : '系统初始化失败';
                setStatus('error');
                setError(errorMessage);
                console.error('[useCardSystemStatus] 系统状态检查失败:', error);
            }
        };

        checkStatus();

        // 监听系统状态变化
        const interval = setInterval(() => {
            const isInitialized = customCardManager.isSystemInitialized();
            if (isInitialized && status !== 'ready') {
                setStatus('ready');
                setError(null);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [status]);

    return { status, error };
}

/**
 * 便捷的专用Hook - 职业卡牌
 */
export function useProfessionCards(options?: Omit<UseCardsOptions, 'type'>) {
    return useCardsByType(CardType.Profession, options);
}

/**
 * 便捷的专用Hook - 血统卡牌
 */
export function useAncestryCards(options?: Omit<UseCardsOptions, 'type'>) {
    return useCardsByType(CardType.Ancestry, options);
}

/**
 * 便捷的专用Hook - 社群卡牌
 */
export function useCommunityCards(options?: Omit<UseCardsOptions, 'type'>) {
    return useCardsByType(CardType.Community, options);
}

/**
 * 便捷的专用Hook - 子职业卡牌
 */
export function useSubclassCards(options?: Omit<UseCardsOptions, 'type'>) {
    return useCardsByType(CardType.Subclass, options);
}

/**
 * 便捷的专用Hook - 领域卡牌
 */
export function useDomainCards(options?: Omit<UseCardsOptions, 'type'>) {
    return useCardsByType(CardType.Domain, options);
}

/**
 * 卡牌搜索和筛选Hook
 */
export function useCardFilter(cards: ExtendedStandardCard[]) {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
    const [selectedLevels, setSelectedLevels] = useState<string[]>([]);

    const filteredCards = useMemo(() => {
        let filtered = cards;

        // 搜索过滤
        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(card =>
                card.name?.toLowerCase().includes(term) ||
                card.description?.toLowerCase().includes(term) ||
                card.class?.toLowerCase().includes(term)
            );
        }

        // 类别过滤
        if (selectedClasses.length > 0 && !selectedClasses.includes('All')) {
            filtered = filtered.filter(card =>
                selectedClasses.includes(card.class || '')
            );
        }

        // 等级过滤
        if (selectedLevels.length > 0) {
            filtered = filtered.filter(card =>
                selectedLevels.includes(String(card.level || ''))
            );
        }

        return filtered;
    }, [cards, searchTerm, selectedClasses, selectedLevels]);

    const clearFilters = useCallback(() => {
        setSearchTerm('');
        setSelectedClasses([]);
        setSelectedLevels([]);
    }, []);

    return {
        searchTerm,
        setSearchTerm,
        selectedClasses,
        setSelectedClasses,
        selectedLevels,
        setSelectedLevels,
        filteredCards,
        clearFilters
    };
}
