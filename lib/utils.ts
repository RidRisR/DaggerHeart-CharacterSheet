import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getBasePath() {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ".";
  return basePath;
}

import type { StandardCard } from "@/card/card-types";

export async function getCardImageUrl(
  card: StandardCard | undefined,
  isError: boolean = false
): Promise<string> {
  const basePath = getBasePath();
  
  // 如果出错，返回默认的empty-card图片
  if (isError || !card) {
    return `${basePath}/image/empty-card.webp`;
  }
  
  let imageUrl = card.imageUrl;
  
  // 如果没有imageUrl，尝试通过ID从store中查找
  if (!imageUrl && card.id) {
    try {
      // 使用 card-store 查找
      const { useCardStore } = await import("@/card/card-store");
      const store = useCardStore.getState();
      
      // 直接从 store 中查找卡片，不触发加载
      const matchedCard = store.allCards.find(c => c.id === card.id);
      if (matchedCard?.imageUrl) {
        imageUrl = matchedCard.imageUrl;
      }
    } catch (error) {
      console.warn('[getCardImageUrl] 查找卡牌图片失败:', error);
    }
  }
  
  // 如果还是没有图片URL，返回默认图片
  if (!imageUrl) {
    return `${basePath}/image/empty-card.webp`;
  }
  
  // 确保路径以斜杠开头
  const normalizedUrl = imageUrl.startsWith('/') ? imageUrl : '/' + imageUrl;
  
  // 返回完整的图片路径
  return `${basePath}/image${normalizedUrl}`;
}
