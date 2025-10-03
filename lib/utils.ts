import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { StandardCard } from "@/card/card-types";
import { useUnifiedCardStore } from "@/card/stores/unified-card-store";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getBasePath() {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ".";
  return basePath;
}

// 智能导航函数，基于 basePath 判断环境并处理路径
export function navigateToPage(path: string) {
  const basePath = getBasePath();
  
  // 判断是否是本地静态导出环境
  // 在静态导出时，页面是通过 file:// 协议访问的
  const isStaticExport = typeof window !== 'undefined' && 
    window.location.protocol === 'file:';

  let targetUrl: string;

  if (isStaticExport) {
    // 本地静态导出环境：使用 .html 扩展名
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    if (cleanPath === '' || cleanPath === 'index') {
      targetUrl = './车卡器入口.html';
    } else {
      targetUrl = `./${cleanPath}.html`;
    }
  } else {
    // 开发环境或在线环境：使用标准路径
    targetUrl = `${basePath}${path}`;
  }

  console.log(`[navigateToPage] 导航到: ${targetUrl} (basePath: ${basePath}, isStaticExport: ${isStaticExport})`);
  window.location.href = targetUrl;
}

export function getCardImageUrl(
  card: StandardCard | undefined,
  isError: boolean = false
): string {
  const basePath = getBasePath();

  // 如果出错或没有卡片，返回默认图片
  if (isError || !card) {
    return `${basePath}/image/empty-card.webp`;
  }

  // 获取要使用的 imageUrl
  let imageUrl = card.imageUrl;
  
  // 如果当前卡片没有 imageUrl，尝试从 allCards 中查找同 ID 的卡片
  if (!imageUrl && card.id) {
    const store = useUnifiedCardStore.getState();
    if (store.initialized) {
      const foundCard = store.getCardById(card.id);
      if (foundCard?.imageUrl) {
        imageUrl = foundCard.imageUrl;
      }
    }
  }

  // 现在 imageUrl 应该已经在加载时预处理过了
  if (!imageUrl) {
    return `${basePath}/image/empty-card.webp`;
  }

  // 检查是否是完整的 HTTP/HTTPS URL
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    // 对于外部 URL，直接返回（但这些 URL 可能无法访问）
    console.warn(`[getCardImageUrl] 外部图片 URL 可能无法访问: ${imageUrl}`);
    return imageUrl;
  }

  // 确保路径以斜杠开头（用于相对路径）
  const normalizedUrl = imageUrl.startsWith('/') ? imageUrl : '/' + imageUrl;

  // 返回完整的图片路径
  return `${basePath}/image${normalizedUrl}`;
}

/**
 * Get card image URL (async version with IndexedDB support)
 * @param card - Card to get image for
 * @param isError - Whether an error occurred
 * @returns Promise<string> - Image URL or default
 */
export async function getCardImageUrlAsync(
  card: StandardCard | undefined,
  isError: boolean = false
): Promise<string> {
  const basePath = getBasePath();

  // 如果出错或没有卡片，返回默认图片
  if (isError || !card) {
    return `${basePath}/image/empty-card.webp`;
  }

  // Check if card has local image in IndexedDB
  if (card.hasLocalImage && card.id) {
    // Determine which table to query based on batchId
    const extendedCard = card as any;
    if (!extendedCard.batchId) {
      // Editor branch: query editorImages table
      try {
        const { getImageUrlFromDB } = await import('@/app/card-editor/utils/image-db-helpers');
        const blobUrl = await getImageUrlFromDB(card.id);
        if (blobUrl) return blobUrl;
      } catch (error) {
        console.error(`[getCardImageUrlAsync] Failed to load editor image:`, error);
      }
    } else {
      // Real batch branch: query images table via UnifiedStore
      try {
        const store = useUnifiedCardStore.getState();
        if (store.imageService.initialized) {
          const blobUrl = await store.getImageUrl(card.id);
          if (blobUrl) return blobUrl;
        }
      } catch (error) {
        console.error(`[getCardImageUrlAsync] Failed to load batch image:`, error);
      }
    }
  }

  // Fallback to regular imageUrl
  return getCardImageUrl(card, isError);
}
