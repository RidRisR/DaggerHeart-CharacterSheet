/**
 * ZIP Import Utility for Card Editor
 * Imports .dhcb/.zip card packages with images
 */

import JSZip from 'jszip';
import type { CardPackageState } from '../types';
import { createBrowserCardEditorImageService } from '../services/card-editor-image-service';
import { recoverCardDraftFromDhcbFile } from '../services/card-editor-recovery';

/**
 * Import card package from .dhcb/.zip file
 * @param file - ZIP file to import
 * @returns Promise<CardPackageState> - Imported package data
 */
export async function importCardPackageWithImages(file: File): Promise<CardPackageState> {
  const result = await recoverCardDraftFromDhcbFile(
    file,
    await createBrowserCardEditorImageService(),
  );

  return result.draft;
}

/**
 * Validate ZIP file format
 * @param file - File to validate
 * @returns Promise<boolean> - True if valid
 */
export async function validateZipFormat(file: File): Promise<boolean> {
  try {
    const zip = await JSZip.loadAsync(file);

    // Check for required cards.json
    const cardsFile = zip.file('cards.json');
    if (!cardsFile) {
      return false;
    }

    // Optional: Validate manifest.json if present
    const manifestFile = zip.file('manifest.json');
    if (manifestFile) {
      const manifestText = await manifestFile.async('text');
      const manifest = JSON.parse(manifestText);

      if (!manifest.format || manifest.format !== 'DaggerHeart Card Batch') {
        console.warn('[ZipImport] Invalid manifest format');
      }
    }

    return true;
  } catch (error) {
    console.error('[ZipImport] Validation failed:', error);
    return false;
  }
}
