/**
 * Browser console diagnostic for DaggerHeart Character Save storage usage.
 *
 * Usage:
 * 1. Open the app in the browser.
 * 2. Open DevTools Console.
 * 3. Paste this entire file and press Enter.
 *
 * The script reads browser localStorage and the character image IndexedDB database.
 * It does not modify storage.
 */
(async function checkCharacterSaveStorageUsage() {
  const CHARACTER_LIST_KEY = "dh_character_list";
  const CHARACTER_DATA_PREFIX = "dh_character_";
  const IMAGE_MIGRATION_MARKER_KEY = "dh_character-image-asset-migration-version";
  const IMAGE_DB_NAME = "DaggerHeartCharacterImages";
  const IMAGE_STORE_NAME = "characterImages";

  const bytesToKB = (bytes) => Math.round((bytes / 1024) * 10) / 10;
  const utf16Bytes = (value) => String(value ?? "").length * 2;
  const utf8Bytes = (value) => new Blob([String(value ?? "")]).size;

  function readJson(value) {
    try {
      return value ? JSON.parse(value) : null;
    } catch {
      return null;
    }
  }

  function readAllLocalStorageEntries() {
    const entries = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key) continue;
      const value = localStorage.getItem(key) ?? "";
      entries.push({
        key,
        value,
        utf16Bytes: utf16Bytes(value),
        utf8Bytes: utf8Bytes(value),
      });
    }
    return entries;
  }

  function readCharacterImageRecords() {
    return new Promise((resolve) => {
      if (!("indexedDB" in window)) {
        resolve([]);
        return;
      }

      const request = indexedDB.open(IMAGE_DB_NAME);

      request.onerror = () => {
        console.warn(`[storage-check] Unable to open IndexedDB database: ${IMAGE_DB_NAME}`, request.error);
        resolve([]);
      };

      request.onsuccess = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(IMAGE_STORE_NAME)) {
          db.close();
          resolve([]);
          return;
        }

        const transaction = db.transaction(IMAGE_STORE_NAME, "readonly");
        const store = transaction.objectStore(IMAGE_STORE_NAME);
        const getAllRequest = store.getAll();

        getAllRequest.onerror = () => {
          console.warn(`[storage-check] Unable to read IndexedDB store: ${IMAGE_STORE_NAME}`, getAllRequest.error);
          db.close();
          resolve([]);
        };

        getAllRequest.onsuccess = () => {
          db.close();
          resolve(Array.isArray(getAllRequest.result) ? getAllRequest.result : []);
        };
      };
    });
  }

  const localEntries = readAllLocalStorageEntries();
  const characterList = readJson(localStorage.getItem(CHARACTER_LIST_KEY));
  const metadataById = new Map(
    Array.isArray(characterList?.characters)
      ? characterList.characters.map((character) => [character.id, character])
      : [],
  );
  const validCharacterIds = new Set(metadataById.keys());
  const markerValue = localStorage.getItem(IMAGE_MIGRATION_MARKER_KEY);

  const characterEntries = localEntries
    .filter((entry) => entry.key.startsWith(CHARACTER_DATA_PREFIX) && entry.key !== CHARACTER_LIST_KEY)
    .map((entry) => {
      const characterId = entry.key.slice(CHARACTER_DATA_PREFIX.length);
      const parsed = readJson(entry.value);
      const imageAssets = parsed?.imageAssets ?? {};
      const characterImageBytes = utf16Bytes(parsed?.characterImage ?? "");
      const companionImageBytes = utf16Bytes(parsed?.companionImage ?? "");
      const embeddedImageBytes = [
        parsed?.characterImage,
        parsed?.companionImage,
      ]
        .filter((value) => typeof value === "string" && value.startsWith("data:image/"))
        .reduce((total, value) => total + utf16Bytes(value), 0);

      return {
        id: characterId,
        saveName: metadataById.get(characterId)?.saveName ?? "(missing metadata)",
        characterName: parsed?.name ?? "",
        schemaVersion: parsed?.schemaVersion ?? "",
        localStorageKB: bytesToKB(entry.utf16Bytes),
        localStorageUtf8KB: bytesToKB(entry.utf8Bytes),
        embeddedImageKB: bytesToKB(embeddedImageBytes),
        characterImageKB: bytesToKB(characterImageBytes),
        companionImageKB: bytesToKB(companionImageBytes),
        imageAssetRefs: Object.keys(imageAssets).length,
        hasEmbeddedImage: entry.value.includes("data:image/"),
        hasMetadata: metadataById.has(characterId),
      };
    });

  const imageRecords = await readCharacterImageRecords();
  const imageBytesByCharacterId = new Map();
  for (const record of imageRecords) {
    const characterId = record?.characterId ?? "(missing characterId)";
    const size = Number(record?.size ?? record?.blob?.size ?? 0);
    imageBytesByCharacterId.set(characterId, (imageBytesByCharacterId.get(characterId) ?? 0) + size);
  }

  const rows = characterEntries
    .map((entry) => ({
      ...entry,
      indexedDBImageKB: bytesToKB(imageBytesByCharacterId.get(entry.id) ?? 0),
      totalLocalAndImageKB: bytesToKB(entry.localStorageKB * 1024 + (imageBytesByCharacterId.get(entry.id) ?? 0)),
    }))
    .sort((a, b) => b.totalLocalAndImageKB - a.totalLocalAndImageKB);

  const localStorageTotalBytes = localEntries.reduce((total, entry) => total + entry.utf16Bytes, 0);
  const characterLocalStorageBytes = characterEntries.reduce((total, entry) => total + entry.localStorageKB * 1024, 0);
  const indexedDBImageBytes = imageRecords.reduce(
    (total, record) => total + Number(record?.size ?? record?.blob?.size ?? 0),
    0,
  );
  const orphanImageRecords = imageRecords.filter((record) => !validCharacterIds.has(record.characterId));
  const orphanImageBytes = orphanImageRecords.reduce(
    (total, record) => total + Number(record?.size ?? record?.blob?.size ?? 0),
    0,
  );

  const summary = {
    generatedAt: new Date().toISOString(),
    characterCount: characterEntries.length,
    metadataCount: validCharacterIds.size,
    migrationMarker: markerValue ?? "(missing)",
    localStorageTotalKB: bytesToKB(localStorageTotalBytes),
    characterLocalStorageKB: bytesToKB(characterLocalStorageBytes),
    indexedDBImageKB: bytesToKB(indexedDBImageBytes),
    combinedCharacterAndImageKB: bytesToKB(characterLocalStorageBytes + indexedDBImageBytes),
    savesWithEmbeddedImages: rows.filter((row) => row.hasEmbeddedImage).length,
    missingMetadataSaves: rows.filter((row) => !row.hasMetadata).length,
    imageRecordCount: imageRecords.length,
    orphanImageRecordCount: orphanImageRecords.length,
    orphanImageKB: bytesToKB(orphanImageBytes),
  };

  console.group("DaggerHeart Character Save Storage Usage");
  console.table([summary]);
  console.table(rows);

  if (orphanImageRecords.length > 0) {
    console.warn("[storage-check] Orphan character image records found:");
    console.table(orphanImageRecords.map((record) => ({
      key: record.key,
      characterId: record.characterId,
      role: record.role,
      sizeKB: bytesToKB(Number(record.size ?? record.blob?.size ?? 0)),
      updatedAt: record.updatedAt ? new Date(record.updatedAt).toISOString() : "",
    })));
  }

  if (summary.savesWithEmbeddedImages > 0) {
    console.warn("[storage-check] Some stored Character Saves still contain embedded data:image payloads.");
  }

  console.groupEnd();

  window.__daggerheartCharacterSaveStorageUsage = {
    summary,
    saves: rows,
    imageRecords,
    orphanImageRecords,
  };

  return window.__daggerheartCharacterSaveStorageUsage;
})();
