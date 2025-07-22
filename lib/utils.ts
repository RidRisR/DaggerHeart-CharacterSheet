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

export function getCardImageUrl(
  card: StandardCard | undefined,
  isError: boolean = false
): string {
  const basePath = getBasePath();

  // 如果出错或没有卡片，返回默认图片
  if (isError || !card) {
    return `${basePath}/image/empty-card.webp`;
  }

  // 现在 imageUrl 应该已经在加载时预处理过了
  if (!card.imageUrl) {
    return `${basePath}/image/empty-card.webp`;
  }

  // 检查是否是完整的 HTTP/HTTPS URL
  if (card.imageUrl.startsWith('http://') || card.imageUrl.startsWith('https://')) {
    // 对于外部 URL，直接返回（但这些 URL 可能无法访问）
    console.warn(`[getCardImageUrl] 外部图片 URL 可能无法访问: ${card.imageUrl}`);
    return card.imageUrl;
  }

  // 确保路径以斜杠开头（用于相对路径）
  const normalizedUrl = card.imageUrl.startsWith('/') ? card.imageUrl : '/' + card.imageUrl;

  // 返回完整的图片路径
  return `${basePath}/image${normalizedUrl}`;
}
