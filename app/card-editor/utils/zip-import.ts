/**
 * ZIP Import Utility for Card Editor
 * Imports .dhcb/.zip card packages with images
 */

import JSZip from 'jszip';
import { saveImageToDB, clearAllEditorImages } from './image-db-helpers';
import type { CardPackageState } from '../types';

/**
 * Import card package from .dhcb/.zip file
 * @param file - ZIP file to import
 * @returns Promise<CardPackageState> - Imported package data
 */
export async function importCardPackageWithImages(file: File): Promise<CardPackageState> {
  const zip = await JSZip.loadAsync(file);

  // Read manifest.json (optional)
  let manifest: any = null;
  const manifestFile = zip.file('manifest.json');
  if (manifestFile) {
    const manifestText = await manifestFile.async('text');
    manifest = JSON.parse(manifestText);
    console.log('[ZipImport] Manifest:', manifest);
  }

  // Read cards.json
  const cardsFile = zip.file('cards.json');
  if (!cardsFile) {
    throw new Error('cards.json not found in ZIP file');
  }

  const cardsText = await cardsFile.async('text');
  const cardsData = JSON.parse(cardsText);

  // Clear existing editor images before importing
  await clearAllEditorImages();

  // Import images from images/ folder
  const imagesFolder = zip.folder('images');
  const importedImageIds = new Set<string>();

  if (imagesFolder) {
    const imageFiles = Object.keys(zip.files).filter(name => name.startsWith('images/'));
    let imageCount = 0;

    for (const filePath of imageFiles) {
      const file = zip.file(filePath);
      if (file && !file.dir) {
        try {
          const blob = await file.async('blob');
          // Extract cardId from filename (remove 'images/' prefix and file extension)
          const fileName = filePath.replace('images/', '');
          const cardId = fileName.replace(/\.(webp|png|jpg|jpeg|gif|svg)$/i, '');

          await saveImageToDB(cardId, blob);
          importedImageIds.add(cardId);
          imageCount++;
        } catch (error) {
          console.warn(`[ZipImport] Failed to import image ${filePath}:`, error);
        }
      }
    }

    console.log(`[ZipImport] Imported ${imageCount} images`);
  }

  // Debug: log cards.json structure
  console.log('[ZipImport] cards.json keys:', Object.keys(cardsData));
  console.log('[ZipImport] profession count:', cardsData.profession?.length || 0);
  console.log('[ZipImport] ancestry count:', cardsData.ancestry?.length || 0);
  console.log('[ZipImport] community count:', cardsData.community?.length || 0);
  console.log('[ZipImport] subclass count:', cardsData.subclass?.length || 0);
  console.log('[ZipImport] domain count:', cardsData.domain?.length || 0);
  console.log('[ZipImport] variant count:', cardsData.variant?.length || 0);

  // If cardsData has a 'cards' field (StandardCard format), we need to convert it
  if (cardsData.cards && Array.isArray(cardsData.cards)) {
    console.log('[ZipImport] Found cards array with', cardsData.cards.length, 'cards');
    console.log('[ZipImport] This is StandardCard format, not native format!');
    console.log('[ZipImport] Sample card:', cardsData.cards[0]);
  }

  // Import cards.json using the same logic as JSON import
  const { ensureAncestryPairs, ensureSubclassTriples } = await import('./import-export');

  // Process cards.json with the same logic as regular JSON import
  const tempPackageData: CardPackageState = {
    ...cardsData,
    name: cardsData.name || '导入卡包',
    author: cardsData.author || '未知作者',
    isModified: false,
    lastSaved: new Date()
  };

  // Fix ancestry pairs (same as JSON import)
  if (cardsData.ancestry && Array.isArray(cardsData.ancestry)) {
    console.log(`[ZipImport] Processing ${cardsData.ancestry.length} ancestry cards`);
    cardsData.ancestry = ensureAncestryPairs(cardsData.ancestry, tempPackageData);
    console.log(`[ZipImport] Fixed to ${cardsData.ancestry.length} ancestry cards`);
  }

  // Fix subclass triples (same as JSON import)
  if (cardsData.subclass && Array.isArray(cardsData.subclass)) {
    console.log(`[ZipImport] Processing ${cardsData.subclass.length} subclass cards`);
    cardsData.subclass = ensureSubclassTriples(cardsData.subclass, tempPackageData);
    console.log(`[ZipImport] Fixed to ${cardsData.subclass.length} subclass cards`);
  }

  // Mark all cards with hasLocalImage if they have imported images
  const markCardsWithImages = (cards: any[] | undefined) => {
    if (!cards || !Array.isArray(cards)) return [];
    return cards.map((card: any) => ({
      ...card,
      hasLocalImage: importedImageIds.has(card.id) ? true : card.hasLocalImage
    }));
  };

  // Apply hasLocalImage to all card types
  const finalPackage: CardPackageState = {
    ...cardsData,
    profession: markCardsWithImages(cardsData.profession),
    ancestry: markCardsWithImages(cardsData.ancestry),
    community: markCardsWithImages(cardsData.community),
    subclass: markCardsWithImages(cardsData.subclass),
    domain: markCardsWithImages(cardsData.domain),
    variant: markCardsWithImages(cardsData.variant),
    isModified: false,
    lastSaved: new Date()
  };

  return finalPackage;
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
