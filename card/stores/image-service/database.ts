/**
 * IndexedDB Database Setup
 * Manages two tables: editorImages (for card editor) and images (for imported batches)
 */

import Dexie, { Table } from 'dexie';

/**
 * Image record structure
 */
export interface ImageRecord {
  key: string;        // cardId (primary key)
  blob: Blob;         // Image binary data
  mimeType: string;   // Image MIME type (e.g., 'image/webp', 'image/png')
  size: number;       // File size in bytes
  createdAt: number;  // Timestamp
}

/**
 * CardImageDB - IndexedDB database for storing card images
 */
export class CardImageDB extends Dexie {
  editorImages!: Table<ImageRecord, string>;
  images!: Table<ImageRecord, string>;

  constructor() {
    super('CardImageDB');

    this.version(1).stores({
      editorImages: 'key, createdAt',  // Editor temporary images
      images: 'key, createdAt'         // Real batch images
    });
  }
}

// Create singleton instance
export const db = new CardImageDB();

/**
 * Check if IndexedDB is available
 */
export function isIndexedDBAvailable(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    return 'indexedDB' in window && window.indexedDB !== null;
  } catch {
    return false;
  }
}
