/**
 * 卡牌选择相关的自定义Hook
 * 专门用于组件中的卡牌选择场景
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    getStandardCardsByType,
    CardType,
    ExtendedStandardCard
} from '@/data/card';

// 卡牌选择Hook的选项
export interface UseCardSelectionOptions {
    cardType?: CardType;
    searchTerm?: string;
    selectedClasses?: string[];
    selectedLevels?: string[];
    enabled?: boolean;
}

// 卡牌选择Hook的返回值
export interface UseCardSelectionReturn {
    cards: ExtendedStandardCard[];
    loading: boolean;
    error: string | null;
    availableClasses: string[];
    availableLevels: string[];
    refresh: () => void;
}

/**
 * 卡牌选择Hook - 为模态框和选择组件优化
 * 使用同步API但提供更好的用户体验
 */
export function useCardSelection(options: UseCardSelectionOptions = {}): UseCardSelectionReturn {
    const {
        cardType,
        searchTerm = '',
        selectedClasses = [],
        selectedLevels = [],
        enabled = true
    } = options;

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [rawCards, setRawCards] = useState<ExtendedStandardCard[]>([]);

    // 加载卡牌数据
    const loadCards = useCallback(() => {
        if (!enabled || !cardType) {
            setRawCards([]);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            console.log(`[useCardSelection] 加载 ${cardType} 类型卡牌`);

            // 使用同步API，但会检查系统状态
            const cards = getStandardCardsByType(cardType);

            setRawCards(cards);
            setLoading(false);

            console.log(`[useCardSelection] 加载完成，共 ${cards.length} 张卡牌`);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : '加载卡牌失败';
            setError(errorMessage);
            setLoading(false);
            setRawCards([]);
            console.error('[useCardSelection] 加载失败:', err);
        }
    }, [cardType, enabled]);

    // 刷新函数
    const refresh = useCallback(() => {
        loadCards();
    }, [loadCards]);

    // 初始加载
    useEffect(() => {
        loadCards();
    }, [loadCards]);

    // 计算可用的类别选项
    const availableClasses = useMemo(() => {
        const classes = new Set<string>();
        rawCards.forEach(card => {
            if (card.class) {
                classes.add(card.class);
            }
        });
        return ['All', ...Array.from(classes).sort()];
    }, [rawCards]);

    // 计算可用的等级选项
    const availableLevels = useMemo(() => {
        const levels = new Set<string>();
        rawCards.forEach(card => {
            if (card.level !== undefined && card.level !== null) {
                levels.add(String(card.level));
            }
        });
        return Array.from(levels).sort((a, b) => Number(a) - Number(b));
    }, [rawCards]);

    // 过滤卡牌
    const filteredCards = useMemo(() => {
        let filtered = rawCards;

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
    }, [rawCards, searchTerm, selectedClasses, selectedLevels]);

    return {
        cards: filteredCards,
        loading,
        error,
        availableClasses,
        availableLevels,
        refresh
    };
}

/**
 * 简化的卡牌获取Hook - 只返回卡牌数据
 */
export function useCards(cardType?: CardType): ExtendedStandardCard[] {
    const [cards, setCards] = useState<ExtendedStandardCard[]>([]);

    useEffect(() => {
        if (!cardType) {
            setCards([]);
            return;
        }

        try {
            const result = getStandardCardsByType(cardType);
            setCards(result);
        } catch (error) {
            console.error(`[useCards] 获取 ${cardType} 卡牌失败:`, error);
            setCards([]);
        }
    }, [cardType]);

    return cards;
}

/**
 * 特定职业的子职业卡牌Hook
 */
export function useSubclassCardsForProfession(professionId?: string): ExtendedStandardCard[] {
    const allSubclassCards = useCards(CardType.Subclass);
    const [professionCards] = useState(() => getStandardCardsByType(CardType.Profession));

    return useMemo(() => {
        if (!professionId) return [];

        // 找到选中的职业卡牌
        const selectedProfession = professionCards.find(card => card.id === professionId);
        if (!selectedProfession) return [];

        // 过滤出匹配的子职业卡牌（等级1且职业匹配）
        return allSubclassCards.filter(card =>
            card.level === 1 && card.class === selectedProfession.name
        );
    }, [allSubclassCards, professionCards, professionId]);
}

/**
 * 按等级过滤的卡牌Hook
 */
export function useCardsByLevel(cardType: CardType, level?: number): ExtendedStandardCard[] {
    const allCards = useCards(cardType);

    return useMemo(() => {
        if (level === undefined) return allCards;
        return allCards.filter(card => card.level === level);
    }, [allCards, level]);
}

/**
 * 卡牌搜索Hook
 */
export function useCardSearch(cards: ExtendedStandardCard[], searchTerm: string): ExtendedStandardCard[] {
    return useMemo(() => {
        if (!searchTerm.trim()) return cards;

        const term = searchTerm.toLowerCase();
        return cards.filter(card =>
            card.name?.toLowerCase().includes(term) ||
            card.description?.toLowerCase().includes(term) ||
            card.class?.toLowerCase().includes(term) ||
            card.type?.toLowerCase().includes(term)
        );
    }, [cards, searchTerm]);
}
