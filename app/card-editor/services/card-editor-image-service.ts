export interface CardEditorImageService {
  listImageKeys(): Promise<string[]>;
  getImageBlob(cardId: string): Promise<Blob | null>;
  saveImageBlob(cardId: string, blob: Blob): Promise<void>;
  clearAllImages(): Promise<void>;
  deleteImage(cardId: string): Promise<void>;
  renameImageKey(oldCardId: string, newCardId: string): Promise<boolean>;
  cleanupOrphanImages(validCardIds: ReadonlySet<string>): Promise<{ deleted: string[]; failed: string[] }>;
}

export async function createBrowserCardEditorImageService(): Promise<CardEditorImageService> {
  const helpers = await import("../utils/image-db-helpers");

  return {
    listImageKeys: () => helpers.getAllEditorImageKeys(),
    getImageBlob: (cardId) => helpers.getImageBlobFromDB(cardId),
    saveImageBlob: (cardId, blob) => helpers.saveImageToDB(cardId, blob),
    clearAllImages: () => helpers.clearAllEditorImages(),
    deleteImage: (cardId) => helpers.deleteImageFromDB(cardId),
    renameImageKey: (oldCardId, newCardId) => helpers.renameImageKey(oldCardId, newCardId),
    async cleanupOrphanImages(validCardIds) {
      const keys = await helpers.getAllEditorImageKeys();
      const deleted: string[] = [];
      const failed: string[] = [];

      for (const key of keys) {
        if (validCardIds.has(key)) continue;

        try {
          await helpers.deleteImageFromDB(key);
          deleted.push(key);
        } catch {
          failed.push(key);
        }
      }

      return { deleted, failed };
    },
  };
}
