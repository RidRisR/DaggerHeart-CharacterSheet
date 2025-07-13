import { create } from 'zustand'
import type { StandardCard } from '@/card/card-types'
import { showFadeNotification } from '@/components/ui/fade-notification'

export interface PinnedCard {
  id: string;           // 唯一标识：`${card.type}-${card.name}`
  card: StandardCard;   // 卡牌数据
  position: { x: number; y: number }; // 窗口位置
}

interface PinnedCardsStore {
  pinnedCards: PinnedCard[];
  pinCard: (card: StandardCard) => void;
  unpinCard: (cardId: string) => void;
  updatePosition: (cardId: string, position: { x: number; y: number }) => void;
}

export const usePinnedCardsStore = create<PinnedCardsStore>((set, get) => ({
  pinnedCards: [],

  pinCard: (card: StandardCard) => {
    if (!card || !card.name) return;
    
    // 使用固定的cardId来确保同一张卡只有一个窗口
    const cardId = `${card.type}-${card.name}`;
    const { pinnedCards } = get();
    
    // 检查是否已经存在这张卡的窗口
    const existingCardIndex = pinnedCards.findIndex(pinned => pinned.id === cardId);
    
    if (existingCardIndex >= 0) {
      // 如果已存在，则关闭窗口
      set({
        pinnedCards: pinnedCards.filter(pinned => pinned.id !== cardId)
      });
      showFadeNotification({
        message: `取消钉住卡牌: ${card.name}`,
        type: 'info'
      });
    } else {
      // 如果不存在，则创建新窗口
      const newPinnedCard: PinnedCard = {
        id: cardId,
        card: card,
        // 新窗口位置错开避免重叠
        position: { 
          x: 100 + pinnedCards.length * 20, 
          y: 100 + pinnedCards.length * 20 
        }
      };
      
      set({
        pinnedCards: [...pinnedCards, newPinnedCard]
      });
      showFadeNotification({
        message: `已钉住卡牌: ${card.name}`,
        type: 'success'
      });
    }
  },

  unpinCard: (cardId: string) => {
    const { pinnedCards } = get();
    const cardToRemove = pinnedCards.find(pinned => pinned.id === cardId);
    
    set({
      pinnedCards: pinnedCards.filter(pinned => pinned.id !== cardId)
    });
    
    if (cardToRemove) {
      showFadeNotification({
        message: `取消钉住卡牌: ${cardToRemove.card.name}`,
        type: 'info'
      });
    }
  },

  updatePosition: (cardId: string, position: { x: number; y: number }) => {
    const { pinnedCards } = get();
    set({
      pinnedCards: pinnedCards.map(pinned => 
        pinned.id === cardId ? { ...pinned, position } : pinned
      )
    });
  },
}))