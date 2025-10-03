/**
 * Image Database Helper Functions for Card Editor
 * These functions operate on the editorImages table
 */

import { db, ImageRecord, isIndexedDBAvailable } from '@/card/stores/image-service/database';

/**
 * Save an image file to IndexedDB (editorImages table)
 * @param cardId - Unique card identifier
 * @param file - Image file to save
 * @returns Promise<void>
 */
export async function saveImageToDB(cardId: string, file: File | Blob): Promise<void> {
  if (!isIndexedDBAvailable()) {
    throw new Error('IndexedDB is not available');
  }

  const record: ImageRecord = {
    key: cardId,
    blob: file,
    mimeType: file.type,
    size: file.size,
    createdAt: Date.now()
  };

  await db.editorImages.put(record);
}

/**
 * Get image Blob URL from IndexedDB (editorImages table)
 * @param cardId - Card identifier
 * @returns Promise<string | null> - Blob URL or null if not found
 */
export async function getImageUrlFromDB(cardId: string): Promise<string | null> {
  if (!isIndexedDBAvailable()) {
    return null;
  }

  try {
    const record = await db.editorImages.get(cardId);
    if (!record) {
      return null;
    }

    return URL.createObjectURL(record.blob);
  } catch (error) {
    console.error(`[ImageDB] Failed to get image for card ${cardId}:`, error);
    return null;
  }
}

/**
 * Get image Blob from IndexedDB (editorImages table)
 * @param cardId - Card identifier
 * @returns Promise<Blob | null> - Image Blob or null if not found
 */
export async function getImageBlobFromDB(cardId: string): Promise<Blob | null> {
  if (!isIndexedDBAvailable()) {
    return null;
  }

  try {
    const record = await db.editorImages.get(cardId);
    return record?.blob || null;
  } catch (error) {
    console.error(`[ImageDB] Failed to get image blob for card ${cardId}:`, error);
    return null;
  }
}

/**
 * Delete an image from IndexedDB (editorImages table)
 * @param cardId - Card identifier
 * @returns Promise<void>
 */
export async function deleteImageFromDB(cardId: string): Promise<void> {
  if (!isIndexedDBAvailable()) {
    return;
  }

  await db.editorImages.delete(cardId);
}

/**
 * Check if an image exists in IndexedDB (editorImages table)
 * @param cardId - Card identifier
 * @returns Promise<boolean>
 */
export async function hasImageInDB(cardId: string): Promise<boolean> {
  if (!isIndexedDBAvailable()) {
    return false;
  }

  const record = await db.editorImages.get(cardId);
  return !!record;
}

/**
 * Get all image keys from editorImages table
 * @returns Promise<string[]>
 */
export async function getAllEditorImageKeys(): Promise<string[]> {
  if (!isIndexedDBAvailable()) {
    return [];
  }

  return await db.editorImages.toCollection().primaryKeys();
}

/**
 * Clear all images from editorImages table
 * @returns Promise<void>
 */
export async function clearAllEditorImages(): Promise<void> {
  if (!isIndexedDBAvailable()) {
    return;
  }

  await db.editorImages.clear();
}

/**
 * Get the total size of all images in editorImages table
 * @returns Promise<number> - Total size in bytes
 */
export async function getTotalEditorImageSize(): Promise<number> {
  if (!isIndexedDBAvailable()) {
    return 0;
  }

  const records = await db.editorImages.toArray();
  return records.reduce((total, record) => total + record.size, 0);
}

/**
 * Rename an image key in IndexedDB (migrate image from old cardId to new cardId)
 * @param oldCardId - Old card identifier
 * @param newCardId - New card identifier
 * @returns Promise<boolean> - True if migration succeeded, false if no image found
 */
export async function renameImageKey(oldCardId: string, newCardId: string): Promise<boolean> {
  if (!isIndexedDBAvailable()) {
    console.warn('[ImageDB] IndexedDB not available, cannot rename image key');
    return false;
  }

  if (oldCardId === newCardId) {
    return true; // No change needed
  }

  try {
    // Get the old image record
    const oldRecord = await db.editorImages.get(oldCardId);

    if (!oldRecord) {
      // No image to migrate
      return false;
    }

    // Create new record with updated key
    const newRecord: ImageRecord = {
      ...oldRecord,
      key: newCardId
    };

    // Use transaction to ensure atomicity
    await db.transaction('rw', db.editorImages, async () => {
      await db.editorImages.put(newRecord);
      await db.editorImages.delete(oldCardId);
    });

    console.log(`[ImageDB] Successfully renamed image key: ${oldCardId} → ${newCardId}`);
    return true;
  } catch (error) {
    console.error(`[ImageDB] Failed to rename image key from ${oldCardId} to ${newCardId}:`, error);
    throw error;
  }
}
