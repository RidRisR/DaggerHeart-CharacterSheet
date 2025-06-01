<!-- filepath: /Users/ris/Desktop/DaggerHeart-CharacterSheet/plan.md -->
# Plan: Merging Built-in and Custom Card Management

## 1. Goal

Unify the management of built-in and custom cards by treating built-in cards as a special, non-deletable batch within the existing `CustomCardManager` and `CustomCardStorage` system. This will simplify card access logic and provide a consistent data structure.

## 2. Core Architectural Changes

### 2.1. Special Batch for Built-in Cards

*   **Identification:** A predefined, constant batch ID (e.g., `SYSTEM_BUILTIN_CARDS_V1`) will be used for the built-in card batch.
*   **Metadata Flag:** The `ImportBatch` type (in `data/card/card-types.ts`) will be extended with a new boolean flag, e.g., `isSystemBatch: true` or `isDeletable: false`, to distinguish this batch.
    *   An optional `version: string` field will also be added to `ImportBatch` metadata to manage updates to built-in cards.

### 2.2. Initial Seeding and Update Mechanism for Built-in Cards

*   **Trigger and Robustness:**
    *   On application startup, `CustomCardManager` will rigorously check the state of the built-in card batch in localStorage.
    *   The seeding/update process (`_seedOrUpdateBuiltinCards()`) will be triggered if ANY of the following conditions are met:
        *   The batch with the predefined `BUILTIN_BATCH_ID` does not exist.
        *   The existing batch's `version` metadata does not match the `CURRENT_BUILTIN_CARDS_VERSION` defined in the application.
        *   The existing batch's metadata flag `isSystemBatch` is not `true`.
    *   This ensures that any accidental deletion, modification (even if the version number wasn't updated by the tampering), or metadata corruption of the built-in batch leads to it being overwritten with the correct data from the application's source of truth.
*   **Data Source & Versioning:**
    *   A new module (e.g., `data/card/builtin-card-data.ts`) will define:
        *   The current version string for the built-in card set (e.g., `BUILTIN_CARDS_VERSION = "1.0.0"`).
        *   Functions to provide the raw data for each built-in card type (Professions, Ancestries, etc.), possibly by importing them from their current locations (e.g., `data/card/profession-card/convert.ts` might expose raw data or `CardManager` will be used to fetch/convert them).
*   **Conversion:**
    *   The existing `CardManager.ConvertCard` method will be used to convert raw built-in card data into the `ExtendedStandardCard` format.
*   **Storage:**
    *   The `_seedOrUpdateBuiltinCards()` process will first attempt to remove any existing batch with the `BUILTIN_BATCH_ID` to ensure a clean state.
    *   The converted built-in cards will then be saved as a single batch using `CustomCardStorage.saveBatch` with the predefined batch ID and correct metadata (including `isSystemBatch: true` and the current `CURRENT_BUILTIN_CARDS_VERSION`).
*   **Idempotency:** The seeding/update logic will be designed to be safe if run multiple times and will always result in the built-in cards being in the correct, current state.

### 2.3. Preventing Deletion of the Built-in Batch

*   **`CustomCardManager.removeBatch(batchId)`:** This method will be modified to check if the `batchId` corresponds to the built-in card batch (either by ID or by loading its metadata and checking the `isSystemBatch` flag). If it is the system batch, deletion will be prevented, and an appropriate error or status will be returned.
*   **`CustomCardStorage.removeBatch(batchId)`:** If this method allows direct deletion, it will also need similar protection.
*   **UI:** Any user interface for managing batches must hide or disable the delete option for the built-in card batch.

## 3. Affected Modules and Implementation Details

### 3.1. `data/card/card-types.ts`

*   Modify `ImportBatch` (or the relevant batch metadata interface/type):
    ```typescript
    export interface ImportBatch {
        // ... existing fields
        isSystemBatch?: boolean; // Or isDeletable?: boolean;
        version?: string;        // For built-in card versioning
    }
    ```

### 3.2. `data/card/custom-card-manager.ts` (`CustomCardManager`)

*   **Constants:** Define `BUILTIN_BATCH_ID` and `CURRENT_BUILTIN_CARDS_VERSION`.
*   **Initialization Logic (e.g., in `constructor` or a new `initializeSystem()` method called by `getInstance()`):**
    1.  Load the index using `CustomCardStorage.loadIndex()`.
    2.  Attempt to load the built-in batch metadata using `CustomCardStorage.getBatchById(BUILTIN_BATCH_ID)` (assuming such a method or equivalent exists to get batch metadata without loading all cards).
    3.  Evaluate the conditions for seeding/updating (as detailed in section 2.2):
        *   Batch existence.
        *   `version` match with `CURRENT_BUILTIN_CARDS_VERSION`.
        *   `isSystemBatch` flag is `true`.
    4.  If any condition fails, indicating the built-in batch is missing, outdated, or corrupted:
        *   Call the private method `_seedOrUpdateBuiltinCards()`.
        *   After seeding/updating, ensure the main index and in-memory card cache are refreshed (e.g., by calling `this.reloadCustomCards()` or specific index update logic).
*   **`_seedOrUpdateBuiltinCards()` (private method):**
    1.  Log the start of the seeding/update process for clarity.
    2.  Attempt to remove any pre-existing batch with `BUILTIN_BATCH_ID` from storage (using `CustomCardStorage.removeBatchAndCards(BUILTIN_BATCH_ID)` or similar, ensuring both index entry and card data are cleared). This handles cases of corrupted previous versions.
    3.  Fetch raw built-in card data (from `builtin-card-data.ts` or via `CardManager`).
    4.  Collect all built-in cards (Professions, Ancestries, Communities, Domains, Subclasses).
    5.  Convert each card to `ExtendedStandardCard` using `CardManager.ConvertCard()`. Ensure `type` and other necessary fields are correctly populated.
    6.  Prepare `BatchData` for these cards, including metadata with `batchId: BUILTIN_BATCH_ID`, `name: "Built-in Cards"`, `importTime`, `isSystemBatch: true`, `version: CURRENT_BUILTIN_CARDS_VERSION`.
    7.  Use `CustomCardStorage.saveBatch()` to store this new batch data.
    8.  Update the main index (`CustomCardStorage.loadIndex()`, add/update the entry for `BUILTIN_BATCH_ID`, `CustomCardStorage.saveIndex()`) to accurately reflect this new/updated system batch. Ensure `totalBatches` and `totalCards` in the index are correctly updated.
*   **`removeBatch(batchId)`:**
    *   Before proceeding with deletion, load the batch metadata.
    *   If `batch.isSystemBatch` is true, return `false` or throw an error indicating system batches cannot be deleted.
*   **`getAllExistingCards()`:** This method should continue to return `this.customCards` (which are loaded by `reloadCustomCards` and will now include the built-in batch from localStorage). The direct, separate loading of built-in cards will no longer be needed here.
*   **`loadCustomCards()` / `reloadCustomCards()`:** Ensure these methods correctly load all batches from storage, including the newly added built-in batch, into `this.customCards`.

### 3.3. `data/card/custom-card-storage.ts` (`CustomCardStorage`)

*   **`removeBatch(batchId)`:** (If it's a low-level direct delete) Consider adding a check similar to `CustomCardManager.removeBatch` or rely on `CustomCardManager` to enforce the rule. For simplicity, primary enforcement can be in `CustomCardManager`.

### 3.4. `data/card/card-manager.ts` (`CardManager`)

*   Its role in converting specific card types (`ProfessionCard`, `AncestryCard`, etc.) to `StandardCard` remains essential for the `_seedOrUpdateBuiltinCards()` process.
*   It might need to expose a way to get all raw built-in card data if `builtin-card-data.ts` doesn't centralize this.

### 3.5. New File: `data/card/builtin-card-data.ts` (Example)

```typescript
// data/card/builtin-card-data.ts
import { ProfessionCardData } from './profession-card/types'; // Assuming raw types
import { AncestryCardData } from './ancestry-card/types';
// ... other imports for raw card data types

export const BUILTIN_CARDS_VERSION = "1.0.0"; // Update this when built-in cards change

export function getRawProfessionCards(): ProfessionCardData[] {
    // Return raw data for all built-in professions
    // This might involve importing from existing JSONs or hardcoded objects
    return [/* ... */];
}

export function getRawAncestryCards(): AncestryCardData[] {
    // Return raw data for all built-in ancestries
    return [/* ... */];
}

// ... similar functions for Community, Domain, Subclass
```
*Alternatively, this module could directly provide already somewhat structured data if conversion is complex.*

## 4. Workflow for Built-in Cards

1.  **App Start:** `CustomCardManager.getInstance()` is called.
2.  Initialization logic in `CustomCardManager` checks for the built-in card batch and its version.
3.  If needed, `_seedOrUpdateBuiltinCards()` is called:
    *   Gathers raw built-in card data.
    *   Uses `CardManager` to convert them to `ExtendedStandardCard`.
    *   Saves them as a special batch in localStorage via `CustomCardStorage`.
    *   Updates the index.
4.  `CustomCardManager.reloadCustomCards()` loads *all* batches (including built-in) from localStorage into `this.customCards`.
5.  All card access (e.g., `getCustomCards()`, `getCustomCardsByType()`) now seamlessly includes built-in cards.
6.  Attempting to delete the built-in batch via `CustomCardManager.removeBatch()` will fail.

## 5. Potential Risks and Mitigations

*   **Data Migration for Existing Users:** This change primarily affects how built-in cards are loaded, not custom cards. Existing custom cards in localStorage should remain unaffected. The first time the app runs with this new logic, it will create the built-in card batch.
*   **Performance:** Reading all cards (built-in + custom) from localStorage on load. For a reasonable number of cards, this should be acceptable. The current `reloadCustomCards` already does this for custom cards.
*   **Complexity of Seeding Logic:** The `_seedOrUpdateBuiltinCards()` method needs careful implementation to correctly gather and convert all built-in card types.
*   **Version Mismatch Handling:** Ensure the version comparison logic is robust.

## 6. Future Considerations

*   If built-in card data becomes very large or dynamic (e.g., fetched from a server), the seeding strategy might need to be revisited. For now, assuming they are part of the application bundle.

This plan provides a structured approach to unifying card management.
