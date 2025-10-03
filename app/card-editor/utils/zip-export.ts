/**
 * ZIP Export Utility for Card Editor
 * Exports card packages as .dhcb/.zip files with images
 */

import JSZip from 'jszip';
import { getAllEditorImageKeys, getImageBlobFromDB } from './image-db-helpers';
import type { CardPackageState } from '../types';
import type { StandardCard } from '@/card/card-types';

/**
 * Export card package as .dhcb/.zip file with images
 * @param packageData - Card package data
 * @param fileName - Output file name (without extension)
 * @returns Promise<Blob> - ZIP file blob
 */
export async function exportCardPackageWithImages(
  packageData: CardPackageState,
  fileName: string
): Promise<Blob> {
  const zip = new JSZip();

  // Create manifest.json
  const manifest = {
    format: 'DaggerHeart Card Batch',
    version: '1.0',
    createdAt: new Date().toISOString(),
    hasImages: true
  };
  zip.file('manifest.json', JSON.stringify(manifest, null, 2));

  // Collect all cards and track which have images
  const allCards: StandardCard[] = [];
  const cardTypes: (keyof CardPackageState)[] = [
    'profession',
    'ancestry',
    'community',
    'subclass',
    'domain',
    'variant'
  ];

  for (const type of cardTypes) {
    const cards = packageData[type];
    if (Array.isArray(cards) && cards.length > 0) {
      allCards.push(...(cards as any[]));
    }
  }

  // Get all available images from IndexedDB
  const imageKeys = await getAllEditorImageKeys();
  const imageKeysSet = new Set(imageKeys);

  // Mark cards with hasLocalImage: true if they have images in IndexedDB
  const cardsForExport = allCards.map(card => {
    const hasImage = imageKeysSet.has(card.id);
    return {
      ...card,
      hasLocalImage: hasImage ? true : undefined,
      // Remove imageUrl if hasLocalImage is true
      imageUrl: hasImage ? undefined : card.imageUrl
    };
  });

  // Create cards.json with card data
  const cardsJSON = {
    name: packageData.name,
    version: packageData.version,
    description: packageData.description,
    author: packageData.author,
    customFieldDefinitions: packageData.customFieldDefinitions,
    cards: cardsForExport
  };
  zip.file('cards.json', JSON.stringify(cardsJSON, null, 2));

  // Add images to ZIP
  const imagesFolder = zip.folder('images');
  if (imagesFolder) {
    let imageCount = 0;
    for (const card of allCards) {
      if (imageKeysSet.has(card.id)) {
        try {
          const blob = await getImageBlobFromDB(card.id);
          if (blob) {
            // Infer file extension from MIME type
            const ext = getExtensionFromMimeType(blob.type);
            imagesFolder.file(`${card.id}${ext}`, blob);
            imageCount++;
          }
        } catch (error) {
          console.warn(`[ZipExport] Failed to get image for ${card.id}:`, error);
        }
      }
    }
    console.log(`[ZipExport] Added ${imageCount} images to ZIP`);
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

/**
 * Trigger download of ZIP file
 * @param blob - ZIP file blob
 * @param fileName - Download file name
 */
export function downloadZipFile(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName.endsWith('.dhcb') ? fileName : `${fileName}.dhcb`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
