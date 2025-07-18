import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

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

import type { StandardCard } from "@/card/card-types";

// 缓存推断失败的卡片ID，避免重复推断
const inferredFailureCache = new Set<string>();

export async function getCardImageUrl(
  card: StandardCard | undefined,
  isError: boolean = false
): Promise<string> {
  const basePath = getBasePath();

  // 如果出错，将该卡片标记为推断失败，返回默认图片
  if (isError) {
    if (card?.id) {
      inferredFailureCache.add(card.id);
    }
    return `${basePath}/image/empty-card.webp`;
  }

  // 如果没有卡片，返回默认图片
  if (!card) {
    return `${basePath}/image/empty-card.webp`;
  }

  let imageUrl = card.imageUrl;
  let matchedCard = card;

  // 如果没有imageUrl，尝试通过ID从store中查找
  if (!imageUrl && card.id) {
    try {
      // 使用 card hooks 查找 - 优化的直接查找
      const { useCardStore } = await import("@/card/stores/unified-card-store");
      const store = useCardStore.getState();

      // 使用优化的 getCardById 方法，避免加载所有卡牌
      const foundCard = store.getCardById(card.id);
      if (foundCard?.imageUrl) {
        imageUrl = foundCard.imageUrl;
      } else if (foundCard) {
        matchedCard = foundCard;
      }
    } catch (error) {
      console.warn('[getCardImageUrl] 查找卡牌图片失败:', error);
    }
  }

  // 如果还是没有图片URL，尝试根据卡片信息推断路径
  if (!imageUrl) {
    // 如果之前已经推断失败过，直接返回默认图片
    if (card.id && inferredFailureCache.has(card.id)) {
      return `${basePath}/image/empty-card.webp`;
    }

    try {
      // 获取batch名称，参考 image-card.tsx 的逻辑
      let batchName: string | null = null;

      // 如果是内置卡片，优先使用 builtin-cards
      if ('source' in matchedCard && matchedCard.source === 'builtin') {
        batchName = 'builtin-cards';
      }
      // 如果已经有 batchName，直接使用（但内置卡片除外）
      else if ('batchName' in matchedCard && matchedCard.batchName && typeof matchedCard.batchName === 'string') {
        batchName = matchedCard.batchName;
      }
      // 如果没有 batchName 但有 batchId，通过 getBatchName 获取名称
      else if ('batchId' in matchedCard && matchedCard.batchId && typeof matchedCard.batchId === 'string') {
        const { getBatchName } = await import("@/card");
        batchName = getBatchName(matchedCard.batchId);
      }

      // 如果获取不到 batchName，就直接放弃构建
      if (!batchName) {
        if (card.id) {
          inferredFailureCache.add(card.id);
        }
        return `${basePath}/image/empty-card.webp`;
      }

      // 获取卡片类型
      const cardType = matchedCard.type?.toLowerCase() || 'unknown';

      // 获取卡片名称，转换为适合文件名的格式
      let cardName: string;
      if (cardType === 'ancestry' && 'class' in matchedCard && matchedCard.class) {
        cardName = matchedCard.class.toLowerCase()
          .replace(/[^a-z0-9\u4e00-\u9fff]/g, '')  // 移除特殊字符，保留中文
          .replace(/\s+/g, '');
      } else {
        cardName = matchedCard.name?.toLowerCase()
          .replace(/[^a-z0-9\u4e00-\u9fff]/g, '')  // 移除特殊字符，保留中文
          .replace(/\s+/g, '') || 'unknown';
      }

      // 尝试构建推断的图片路径
      const inferredUrl = `/${batchName}/${cardType}/${cardName}.webp`;

      console.log(`[getCardImageUrl] 推断图片路径: ${basePath}/image${inferredUrl}`);
      return `${basePath}/image${inferredUrl}`;
    } catch (error) {
      console.warn('[getCardImageUrl] 推断图片路径失败:', error);
      if (card.id) {
        inferredFailureCache.add(card.id);
      }
    }

    // 如果推断失败，返回默认图片
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
