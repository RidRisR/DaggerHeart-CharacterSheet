/**
 * ZIP Export Utility for Card Editor
 * Exports card packages as .dhcb/.zip files with images
 */

import JSZip from 'jszip';
import type { CardPackageState } from '../types';
import { createLegacyDhcbView } from '../services/card-draft-serialization';
import { createBrowserCardEditorImageService } from '../services/card-editor-image-service';

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

  const imageService = await createBrowserCardEditorImageService();
  const view = await createLegacyDhcbView(packageData, imageService);
  zip.file('cards.json', JSON.stringify(view.cardsJson, null, 2));

  // Add images to ZIP (only valid images belonging to current package)
  const imagesFolder = zip.folder('images');
  if (imagesFolder) {
    for (const image of view.images) {
      imagesFolder.file(`${image.cardId}${getExtensionFromMimeType(image.blob.type)}`, image.blob);
    }
    console.log(`[ZipExport] Added ${view.images.length} images to ZIP`);
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
