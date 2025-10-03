/**
 * Image Service Actions for UnifiedCardStore
 * Manages image loading, caching, and cleanup for real card batches
 */

import { db, isIndexedDBAvailable } from './database';
import type { UnifiedCardState } from '../store-types';
import type { StateCreator } from 'zustand';

// LRU Cache management
function updateLRUCache(state: UnifiedCardState, cardId: string, blobUrl: string) {
  const { cache, cacheOrder, maxCacheSize } = state.imageService;

  // Add to cache
  cache.set(cardId, blobUrl);

  // Update LRU order (remove if exists, then add to end)
  const existingIndex = cacheOrder.indexOf(cardId);
  if (existingIndex > -1) {
    cacheOrder.splice(existingIndex, 1);
  }
  cacheOrder.push(cardId);

  // Evict oldest entries if cache is full
  while (cacheOrder.length > maxCacheSize) {
    const evictedId = cacheOrder.shift();
    if (evictedId) {
      const evictedUrl = cache.get(evictedId);
      if (evictedUrl) {
        URL.revokeObjectURL(evictedUrl);
        cache.delete(evictedId);
      }
    }
  }
}

export function createImageServiceActions<T extends UnifiedCardState>(
  set: any,
  get: any
) {
  return {
    /**
     * Initialize image service
     */
    initializeImageService: async () => {
      if (!isIndexedDBAvailable()) {
        console.warn('[ImageService] IndexedDB not available');
        return;
      }

      set((state: any) => ({
        imageService: {
          ...state.imageService,
          initialized: true
        }
      }));
    },

    /**
     * Get image URL for a card (with LRU caching and deduplication)
     * @param cardId - Card identifier
     * @returns Promise<string | null> - Blob URL or null
     */
    getImageUrl: async (cardId: string): Promise<string | null> => {
      const state = get() as any;
      const { cache, loadingImages, failedImages } = state.imageService;

      // Check cache first
      if (cache.has(cardId)) {
        const url = cache.get(cardId);
        // Update LRU order
        const { cacheOrder } = state.imageService;
        const index = cacheOrder.indexOf(cardId);
        if (index > -1) {
          cacheOrder.splice(index, 1);
          cacheOrder.push(cardId);
        }
        return url;
      }

      // Check if already failed
      if (failedImages.has(cardId)) {
        return null;
      }

      // Check if already loading (deduplication)
      if (loadingImages.has(cardId)) {
        // Wait for existing load to complete
        return new Promise((resolve) => {
          const checkInterval = setInterval(() => {
            const currentState = get() as any;
            if (currentState.imageService.cache.has(cardId)) {
              clearInterval(checkInterval);
              resolve(currentState.imageService.cache.get(cardId));
            } else if (currentState.imageService.failedImages.has(cardId)) {
              clearInterval(checkInterval);
              resolve(null);
            }
          }, 50);

          // Timeout after 5 seconds
          setTimeout(() => {
            clearInterval(checkInterval);
            resolve(null);
          }, 5000);
        });
      }

      // Mark as loading
      set((state: any) => ({
        imageService: {
          ...state.imageService,
          loadingImages: new Set([...state.imageService.loadingImages, cardId])
        }
      }));

      try {
        // Load from IndexedDB (images table for real batches)
        const record = await db.images.get(cardId);

        if (!record) {
          // Mark as failed
          set((state: any) => ({
            imageService: {
              ...state.imageService,
              loadingImages: new Set([...state.imageService.loadingImages].filter(id => id !== cardId)),
              failedImages: new Set([...state.imageService.failedImages, cardId])
            }
          }));
          return null;
        }

        // Create blob URL
        const blobUrl = URL.createObjectURL(record.blob);

        // Update cache with LRU
        set((state: any) => {
          const newState = { ...state };
          updateLRUCache(newState, cardId, blobUrl);

          return {
            imageService: {
              ...newState.imageService,
              loadingImages: new Set([...newState.imageService.loadingImages].filter(id => id !== cardId))
            }
          };
        });

        return blobUrl;
      } catch (error) {
        console.error(`[ImageService] Failed to load image for ${cardId}:`, error);

        // Mark as failed
        set((state: any) => ({
          imageService: {
            ...state.imageService,
            loadingImages: new Set([...state.imageService.loadingImages].filter(id => id !== cardId)),
            failedImages: new Set([...state.imageService.failedImages, cardId])
          }
        }));

        return null;
      }
    },

    /**
     * Import batch images to IndexedDB (images table)
     * @param batchId - Batch identifier
     * @param images - Map of cardId -> Blob
     */
    importBatchImages: async (batchId: string, images: Map<string, Blob>) => {
      if (!isIndexedDBAvailable()) {
        throw new Error('IndexedDB not available');
      }

      try {
        // Use transaction for atomic batch import
        await db.transaction('rw', db.images, async () => {
          for (const [cardId, blob] of images.entries()) {
            await db.images.put({
              key: cardId,
              blob,
              mimeType: blob.type,
              size: blob.size,
              createdAt: Date.now()
            });
          }
        });

        console.log(`[ImageService] Imported ${images.size} images for batch ${batchId}`);
      } catch (error) {
        console.error(`[ImageService] Failed to import batch images:`, error);
        throw error;
      }
    },

    /**
     * Delete batch images from IndexedDB (images table)
     * @param imageCardIds - Array of card IDs with images
     */
    deleteBatchImages: async (imageCardIds: string[]) => {
      if (!isIndexedDBAvailable()) {
        return;
      }

      try {
        // Use transaction for atomic batch delete
        await db.transaction('rw', db.images, async () => {
          for (const cardId of imageCardIds) {
            await db.images.delete(cardId);
          }
        });

        // Clear cache entries and revoke URLs
        set((state: any) => {
          const newCache = new Map(state.imageService.cache);
          const newCacheOrder = [...state.imageService.cacheOrder];
          const newFailedImages = new Set(state.imageService.failedImages);

          for (const cardId of imageCardIds) {
            // Revoke blob URL
            const url = newCache.get(cardId);
            if (url) {
              URL.revokeObjectURL(url);
              newCache.delete(cardId);
            }

            // Remove from order
            const index = newCacheOrder.indexOf(cardId);
            if (index > -1) {
              newCacheOrder.splice(index, 1);
            }

            // Remove from failed set
            newFailedImages.delete(cardId);
          }

          return {
            imageService: {
              ...state.imageService,
              cache: newCache,
              cacheOrder: newCacheOrder,
              failedImages: newFailedImages
            }
          };
        });

        console.log(`[ImageService] Deleted ${imageCardIds.length} images`);
      } catch (error) {
        console.error(`[ImageService] Failed to delete batch images:`, error);
      }
    },

    /**
     * Clear all image cache and revoke blob URLs
     */
    clearImageCache: () => {
      const state = get() as any;
      const { cache } = state.imageService;

      // Revoke all blob URLs
      for (const url of cache.values()) {
        URL.revokeObjectURL(url);
      }

      set((state: any) => ({
        imageService: {
          ...state.imageService,
          cache: new Map(),
          cacheOrder: [],
          failedImages: new Set()
        }
      }));
    },

    /**
     * Revoke a specific image URL and remove from cache
     * @param cardId - Card identifier
     */
    revokeImageUrl: (cardId: string) => {
      const state = get() as any;
      const url = state.imageService.cache.get(cardId);

      if (url) {
        URL.revokeObjectURL(url);

        set((state: any) => {
          const newCache = new Map(state.imageService.cache);
          const newCacheOrder = [...state.imageService.cacheOrder];

          newCache.delete(cardId);
          const index = newCacheOrder.indexOf(cardId);
          if (index > -1) {
            newCacheOrder.splice(index, 1);
          }

          return {
            imageService: {
              ...state.imageService,
              cache: newCache,
              cacheOrder: newCacheOrder
            }
          };
        });
      }
    }
  };
}
