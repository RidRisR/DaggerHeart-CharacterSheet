/**
 * ZIP Import Utility for Card Editor
 * Imports .dhcb/.zip card packages with images
 */

import JSZip from 'jszip';
import { saveImageToDB, clearAllEditorImages } from './image-db-helpers';
import type { CardPackageState } from '../types';
import type { StandardCard } from '@/card/card-types';

interface ImportedPackageData {
  name?: string;
  version?: string;
  description?: string;
  author?: string;
  customFieldDefinitions?: any;
  cards: StandardCard[];
}

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
  const packageData: ImportedPackageData = JSON.parse(cardsText);

  // Clear existing editor images before importing
  await clearAllEditorImages();

  // Import images from images/ folder
  const imagesFolder = zip.folder('images');
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
          imageCount++;
        } catch (error) {
          console.warn(`[ZipImport] Failed to import image ${filePath}:`, error);
        }
      }
    }

    console.log(`[ZipImport] Imported ${imageCount} images`);
  }

  // Transform imported data into CardPackageState format
  const transformedPackage: CardPackageState = {
    name: packageData.name || '导入的卡包',
    version: packageData.version || '1.0',
    description: packageData.description || '',
    author: packageData.author || '未知作者',
    customFieldDefinitions: packageData.customFieldDefinitions || {},
    profession: [],
    ancestry: [],
    community: [],
    subclass: [],
    domain: [],
    variant: []
  };

  // Categorize cards by type
  for (const card of packageData.cards) {
    const type = card.type;

    if (type === 'profession' && Array.isArray(transformedPackage.profession)) {
      transformedPackage.profession.push(card as any);
    } else if (type === 'ancestry' && Array.isArray(transformedPackage.ancestry)) {
      transformedPackage.ancestry.push(card as any);
    } else if (type === 'community' && Array.isArray(transformedPackage.community)) {
      transformedPackage.community.push(card as any);
    } else if (type === 'subclass' && Array.isArray(transformedPackage.subclass)) {
      transformedPackage.subclass.push(card as any);
    } else if (type === 'domain' && Array.isArray(transformedPackage.domain)) {
      transformedPackage.domain.push(card as any);
    } else if (type === 'variant' && Array.isArray(transformedPackage.variant)) {
      transformedPackage.variant.push(card as any);
    }
  }

  return transformedPackage;
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
