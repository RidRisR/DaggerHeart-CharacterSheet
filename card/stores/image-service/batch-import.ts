/**
 * Batch Import Utility with Images
 * Handles importing .dhcb/.zip files as real card batches with images
 */

import JSZip from 'jszip';
import { db, isIndexedDBAvailable } from './database';
import type { ExtendedStandardCard } from '../store-types';

interface BatchImportResult {
  cards: ExtendedStandardCard[];
  imageCardIds: string[];
  metadata: {
    name?: string;
    version?: string;
    description?: string;
    author?: string;
    customFieldDefinitions?: any;
  };
}

/**
 * Import batch from .dhcb/.zip file with images
 * @param file - ZIP file to import
 * @param batchId - Target batch ID
 * @returns Promise<BatchImportResult>
 */
export async function importBatchWithImages(
  file: File,
  batchId: string
): Promise<BatchImportResult> {
  if (!isIndexedDBAvailable()) {
    throw new Error('IndexedDB not available');
  }

  const zip = await JSZip.loadAsync(file);

  // Read manifest.json (optional)
  let manifest: any = null;
  const manifestFile = zip.file('manifest.json');
  if (manifestFile) {
    const manifestText = await manifestFile.async('text');
    manifest = JSON.parse(manifestText);
  }

  // Read cards.json
  const cardsFile = zip.file('cards.json');
  if (!cardsFile) {
    throw new Error('cards.json not found in ZIP file');
  }

  const cardsText = await cardsFile.async('text');
  const packageData = JSON.parse(cardsText);

  // Track cards with images
  const imageCardIds: string[] = [];

  // Import images from images/ folder to the 'images' table
  const imagesFolder = zip.folder('images');
  if (imagesFolder) {
    const imageFiles = Object.keys(zip.files).filter(name => name.startsWith('images/'));

    // Use transaction for atomic batch import
    await db.transaction('rw', db.images, async () => {
      for (const filePath of imageFiles) {
        const file = zip.file(filePath);
        if (file && !file.dir) {
          try {
            const blob = await file.async('blob');
            // Extract cardId from filename
            const fileName = filePath.replace('images/', '');
            const cardId = fileName.replace(/\.(webp|png|jpg|jpeg|gif|svg)$/i, '');

            await db.images.put({
              key: cardId,
              blob,
              mimeType: blob.type,
              size: blob.size,
              createdAt: Date.now()
            });

            imageCardIds.push(cardId);
          } catch (error) {
            console.warn(`[BatchImport] Failed to import image ${filePath}:`, error);
          }
        }
      }
    });

    console.log(`[BatchImport] Imported ${imageCardIds.length} images for batch ${batchId}`);
  }

  // Parse cards array
  const cards: ExtendedStandardCard[] = packageData.cards || [];

  return {
    cards,
    imageCardIds,
    metadata: {
      name: packageData.name,
      version: packageData.version,
      description: packageData.description,
      author: packageData.author,
      customFieldDefinitions: packageData.customFieldDefinitions
    }
  };
}

/**
 * Export batch as .dhcb/.zip file with images
 * @param batchCards - Cards to export
 * @param imageCardIds - Card IDs with images
 * @param metadata - Batch metadata
 * @returns Promise<Blob>
 */
export async function exportBatchWithImages(
  batchCards: ExtendedStandardCard[],
  imageCardIds: string[],
  metadata: {
    name?: string;
    version?: string;
    description?: string;
    author?: string;
    customFieldDefinitions?: any;
  }
): Promise<Blob> {
  if (!isIndexedDBAvailable()) {
    throw new Error('IndexedDB not available');
  }

  const zip = new JSZip();

  // Create manifest.json
  const manifest = {
    format: 'DaggerHeart Card Batch',
    version: '1.0',
    createdAt: new Date().toISOString(),
    hasImages: imageCardIds.length > 0
  };
  zip.file('manifest.json', JSON.stringify(manifest, null, 2));

  // Create cards.json
  const cardsJSON = {
    name: metadata.name,
    version: metadata.version,
    description: metadata.description,
    author: metadata.author,
    customFieldDefinitions: metadata.customFieldDefinitions,
    cards: batchCards.map(card => ({
      ...card,
      // Remove batchId and source fields (internal only)
      batchId: undefined,
      source: undefined,
      batchName: undefined
    }))
  };
  zip.file('cards.json', JSON.stringify(cardsJSON, null, 2));

  // Add images to ZIP
  if (imageCardIds.length > 0) {
    const imagesFolder = zip.folder('images');
    if (imagesFolder) {
      for (const cardId of imageCardIds) {
        try {
          const record = await db.images.get(cardId);
          if (record) {
            const ext = getExtensionFromMimeType(record.mimeType);
            imagesFolder.file(`${cardId}${ext}`, record.blob);
          }
        } catch (error) {
          console.warn(`[BatchExport] Failed to get image for ${cardId}:`, error);
        }
      }
    }
  }

  // Generate ZIP blob
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  return zipBlob;
}

/**
 * Infer file extension from MIME type
 */
function getExtensionFromMimeType(mimeType: string): string {
  const mimeMap: Record<string, string> = {
    'image/webp': '.webp',
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/gif': '.gif',
    'image/svg+xml': '.svg'
  };
  return mimeMap[mimeType] || '.png';
}
