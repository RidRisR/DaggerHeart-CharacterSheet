"use client"

import { useEffect } from 'react';

/**
 * 处理 Next.js chunk 加载失败的组件
 *
 * 问题：当部署新版本后，旧页面请求的 chunk 文件（带旧 hash）会 404
 * 解决：检测 chunk 加载错误，自动刷新页面获取最新版本
 */
export function ChunkLoadErrorHandler() {
  useEffect(() => {
    // 注册 Service Worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[ChunkLoadErrorHandler] Service Worker registered:', registration.scope);
        })
        .catch((error) => {
          console.error('[ChunkLoadErrorHandler] Service Worker registration failed:', error);
        });

      // 监听来自 Service Worker 的消息
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'CHUNK_LOAD_ERROR') {
          console.warn('[ChunkLoadErrorHandler] Chunk load error detected, reloading page...');
          window.location.reload();
        }
      });
    }

    // 全局错误处理：捕获 chunk 加载失败
    const handleError = (event: ErrorEvent) => {
      const isChunkLoadError =
        event.message?.includes('Loading chunk') ||
        event.message?.includes('Failed to fetch dynamically imported module') ||
        event.message?.includes('Importing a module script failed');

      if (isChunkLoadError) {
        console.warn('[ChunkLoadErrorHandler] Detected chunk load error, reloading...', event.message);
        event.preventDefault();

        // 延迟刷新，避免无限循环
        setTimeout(() => {
          window.location.reload();
        }, 100);
      }
    };

    // 监听未捕获的错误
    window.addEventListener('error', handleError);

    // 监听 Promise rejection（用于动态 import 失败）
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason?.toString() || '';
      const isChunkLoadError =
        reason.includes('Loading chunk') ||
        reason.includes('Failed to fetch dynamically imported module') ||
        reason.includes('/_next/static/');

      if (isChunkLoadError) {
        console.warn('[ChunkLoadErrorHandler] Detected chunk load rejection, reloading...', reason);
        event.preventDefault();

        setTimeout(() => {
          window.location.reload();
        }, 100);
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return null;
}
