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

// 缓存所有卡牌数据，避免重复加载
let allCardsCache: StandardCard[] | null = null;

export async function getCardImageUrl(
  card: StandardCard | { imageUrl?: string; id?: string } | undefined,
  isError: boolean = false
): Promise<string> {
  const basePath = getBasePath();
  
  // 如果出错，返回默认的empty-card图片
  if (isError || !card) {
    return `${basePath}/image/empty-card.webp`;
  }
  
  let imageUrl = card.imageUrl;
  
  // 如果没有imageUrl，尝试通过ID从allCards中查找
  if (!imageUrl && card.id) {
    try {
      // 动态导入以避免循环依赖
      const { getAllStandardCardsAsync } = await import("@/card");
      
      // 使用缓存避免重复加载
      if (!allCardsCache) {
        allCardsCache = await getAllStandardCardsAsync();
      }
      
      const matchedCard = allCardsCache.find(c => c.id === card.id);
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

// 同步版本，仅用于已知有imageUrl的情况
export function getCardImageUrlSync(imageUrl: string | undefined, isError: boolean = false): string {
  const basePath = getBasePath();
  
  // 如果出错或没有图片URL，返回默认的empty-card图片
  if (isError || !imageUrl) {
    return `${basePath}/image/empty-card.webp`;
  }
  
  // 确保路径以斜杠开头
  const normalizedUrl = imageUrl.startsWith('/') ? imageUrl : '/' + imageUrl;
  
  // 返回完整的图片路径
  return `${basePath}/image${normalizedUrl}`;
}
