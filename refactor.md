<!-- filepath: /Users/ris/Desktop/DaggerHeart-CharacterSheet/refactor.md -->
# Refactoring Steps: Merging Built-in and Custom Card Management

This document outlines the step-by-step process to refactor the card management system according to the agreed-upon plan (`plan.md`).

## Phase 1: Setup and Type Definitions

### Step 1.1: Modify `data/card/card-types.ts`

*   **Action:** Extend the `ImportBatch` interface (or relevant type/interface for batch metadata).
*   **Details:**
    *   Add an optional boolean field: `isSystemBatch?: boolean;`.
    *   Add an optional string field: `version?: string;` (for built-in card versioning).
*   **Reference:** `plan.md` - Section 3.1.

## Phase 2: Implement Built-in Card Data Source

### Step 2.1: Create `data/card/builtin-card-data.ts`

*   **Action:** Create a new file to centralize raw built-in card data and versioning.
*   **Details:**
    *   Define `export const BUILTIN_CARDS_VERSION = "V20250520";` (or the initial version).
    *   Implement functions like `getRawProfessionCards(): ProfessionCardData[]`, `getRawAncestryCards(): AncestryCardData[]`, etc., for all built-in card types (Profession, Ancestry, Community, Domain, Subclass).
    *   These functions should return the raw data structures that `CardManager` currently uses or can convert.
    *   **Note:** This might involve identifying where the current raw data for built-in cards resides (e.g., within each card type's directory like `data/card/profession-card/`) and importing/consolidating it here.
*   **Reference:** `plan.md` - Section 3.5.

### Step 2.2: (Optional) Adjust `data/card/card-manager.ts` (`CardManager`)

*   **Action:** If `CardManager` needs changes to expose raw data for `builtin-card-data.ts` or if its conversion logic needs to be more accessible for the seeding process.
*   **Details:** Ensure `CardManager.ConvertCard()` can be readily used by `CustomCardManager` with the raw data provided by `builtin-card-data.ts`.
*   **Reference:** `plan.md` - Section 3.4.

## Phase 3: Modify `CustomCardManager`

### Step 3.1: Add Constants and Initialization Logic in `data/card/custom-card-manager.ts`

*   **Action:** Define constants and implement the core logic for managing the built-in card batch.
*   **Details:**
    *   Add constants: `const BUILTIN_BATCH_ID = "SYSTEM_BUILTIN_CARDS_V1";` and `const CURRENT_BUILTIN_CARDS_VERSION = BUILTIN_CARDS_VERSION;` (importing from `builtin-card-data.ts`).
    *   In the `CustomCardManager` constructor (or a new `private async initializeSystemData()` method called by the constructor/`getInstance` after `CardManager` is initialized):
        1.  Load the batch index using `CustomCardStorage.loadIndex()`.
        2.  Attempt to get the built-in batch metadata (e.g., `CustomCardStorage.getBatchMetadataById(BUILTIN_BATCH_ID)` - this helper might need to be added to `CustomCardStorage` if not present, or load the full batch and check metadata).
        3.  Determine if seeding/update is needed by checking:
            *   If the batch doesn't exist.
            *   If `batch.metadata.version !== CURRENT_BUILTIN_CARDS_VERSION`.
            *   If `batch.metadata.isSystemBatch !== true`.
        4.  If seeding/update is needed, call `await this._seedOrUpdateBuiltinCards();`.
        5.  After potential seeding, ensure `this.reloadCustomCards()` is called to load all cards, including the system batch, into memory.
*   **Reference:** `plan.md` - Section 3.2 (Initialization Logic).

### Step 3.2: Implement `_seedOrUpdateBuiltinCards()` in `CustomCardManager`

*   **Action:** Create this private asynchronous method.
*   **Details:**
    1.  Log the start of the process.
    2.  **Crucial:** First, attempt to remove any existing batch with `BUILTIN_BATCH_ID` from storage. This involves removing its entry from the index and deleting its card data file. `CustomCardStorage` might need a robust method like `removeBatchAndAssociatedData(batchId)`.
    3.  Fetch all raw built-in card data using the functions from `data/card/builtin-card-data.ts`.
    4.  Initialize an empty array for `ExtendedStandardCard` objects.
    5.  For each raw built-in card:
        *   Use `this.cardManager.ConvertCard(rawCard, cardType)` to convert it to `StandardCard`.
        *   Ensure the `type` property is correctly set on the `StandardCard`.
        *   Transform/map it to `ExtendedStandardCard` format, adding `source: CardSource.Builtin` and any other necessary fields.
        *   Add to the array of converted cards.
    6.  Prepare `BatchData`: 
        *   `metadata`: `batchId: BUILTIN_BATCH_ID`, `name: "Built-in Cards"` (or a localized name), `importTime: new Date().toISOString()`, `isSystemBatch: true`, `version: CURRENT_BUILTIN_CARDS_VERSION`.
        *   `cards`: The array of converted `ExtendedStandardCard` objects.
    7.  Use `CustomCardStorage.saveBatch(BUILTIN_BATCH_ID, batchData)` to store the data.
    8.  Update the main index (`CustomCardStorage.loadIndex()`, add/update the entry for `BUILTIN_BATCH_ID` with correct metadata and card count, then `CustomCardStorage.saveIndex()`). Ensure `totalBatches` and `totalCards` in the index are correctly incremented/adjusted.
    9.  Log completion.
*   **Reference:** `plan.md` - Section 3.2 (`_seedOrUpdateBuiltinCards()`).

### Step 3.3: Modify `removeBatch(batchId)` in `CustomCardManager`

*   **Action:** Prevent deletion of the system batch.
*   **Details:**
    *   At the beginning of the method, check if `batchId === BUILTIN_BATCH_ID`.
    *   Alternatively, load the batch metadata and check if `batch.isSystemBatch === true`.
    *   If it's the system batch, log a warning and return `false` (or throw an error) without proceeding with deletion.
*   **Reference:** `plan.md` - Section 3.2 (`removeBatch(batchId)`).

### Step 3.4: Review and Adjust Card Loading/Access Methods in `CustomCardManager`

*   **Action:** Ensure built-in cards are seamlessly integrated.
*   **Details:**
    *   **`getAllExistingCards()`:** This method previously had logic to load built-in cards separately. This separate logic should be removed. It should now simply return `[...this.customCards]` as `this.customCards` (populated by `reloadCustomCards`) will contain the built-in batch from localStorage.
    *   **`loadCustomCards()` / `reloadCustomCards()`:** Verify these methods correctly load all batches from `CustomCardStorage`, including the built-in system batch, into `this.customCards`.
*   **Reference:** `plan.md` - Section 3.2.

### Step 3.5: Refactor `data/card/index.ts` for Unified Data Access

*   **Action:** Modify `data/card/index.ts` to ensure it sources all card data dynamically from the updated `CustomCardManager`, which now serves as the single source of truth.
*   **Details:**
    *   **Review and Remove/Refactor Built-in Specific Exports:**
        *   Remove the `BUILTIN_STANDARD_CARDS` constant.
        *   Remove the `BUILTIN_CARDS_BY_TYPE` constant.
        *   Refactor `getAllBuiltinCards()`: If this function is still required, it should be updated to retrieve cards from `customCardManager` by filtering for `source: CardSource.Builtin` or by the `BUILTIN_BATCH_ID`.
        *   Refactor `getBuiltinCardsByType(typeId: CardType)`: Similar to `getAllBuiltinCards()`, this should filter data obtained from `customCardManager`.
    *   **Update Combined Card Exports to be Dynamic Functions:**
        *   Convert `ALL_STANDARD_CARDS` from a module-level constant to a function, e.g., `export function getAllStandardCards(): ExtendedStandardCard[] { return customCardManager.getAllExistingCards(); }`.
        *   Convert `STANDARD_CARDS_BY_TYPE` from a module-level constant to a function, e.g., `export function getStandardCardsByType(typeId: CardType): ExtendedStandardCard[] { const allCards = getAllStandardCards(); return allCards.filter(card => card.type === typeId); }`.
        *   The existing functions `getAllStandardCards()` and `getStandardCardsByType()` (if they are already functions rather than constants) must be updated to use `customCardManager.getAllExistingCards()` as their data source.
    *   **Consolidate Access Functions:**
        *   Ensure any alias functions like `getCardsByType` correctly point to or use the new dynamic retrieval methods (e.g., the new `getStandardCardsByType` function).
    *   **Evaluate `cardDataByType`:** Determine if this constant (mapping types to raw data arrays) is still necessary within `data/card/index.ts`, as `data/card/builtin-card-data.ts` and `CustomCardManager` now handle raw built-in data sourcing and conversion.
    *   **Re-evaluate `refreshCustomCards()`:** With card data being fetched dynamically from `CustomCardManager` through functions, the original purpose of `refreshCustomCards()` (to trigger recalculation of module-level constants) may no longer be relevant. Assess if it's still needed for other side effects (like triggering UI updates) or if it can be simplified or removed.
*   **Rationale:** These changes will ensure that all parts of the application using `data/card/index.ts` receive live, consistent data from the unified card management system, preventing issues with stale data from pre-calculated constants.
*   **Reference:** Previous discussion regarding the refactoring of `data/card/index.ts`.

## Phase 4: Modify `CustomCardStorage` (If Necessary)

### Step 4.1: Enhance Batch Removal in `data/card/custom-card-storage.ts`

*   **Action:** Ensure `CustomCardStorage` can fully remove a batch and its associated card data, to support the clean overwrite in `_seedOrUpdateBuiltinCards()`.
*   **Details:**
    *   If not already present, consider adding a method like `removeBatchAndAssociatedData(batchId)` that not only removes the batch entry from the index but also deletes the corresponding `batch-${batchId}.json` file.
    *   The plan suggests primary enforcement of non-deletion of system batch in `CustomCardManager`, so direct checks in `CustomCardStorage.removeBatch` might be redundant if it's only called by `CustomCardManager` for non-system batches.
*   **Reference:** `plan.md` - Section 3.3.

## Phase 5: Testing and UI Adjustments

### Step 5.1: Thorough Testing

*   **Action:** Test all aspects of the new system.
*   **Details:**
    *   **First Launch:** Verify built-in cards are seeded correctly into localStorage.
    *   **Subsequent Launches:** Verify built-in cards are loaded correctly, and no re-seeding occurs if version and integrity are fine.
    *   **Version Update:** Manually change `BUILTIN_CARDS_VERSION` in `builtin-card-data.ts`, relaunch, and verify the built-in batch in localStorage is updated.
    *   **Tampering:** Manually delete or modify the built-in batch in localStorage, relaunch, and verify it's restored correctly.
    *   **Custom Card Import/Management:** Ensure custom card functionality remains unaffected.
    *   **Deletion Attempt:** Verify that attempting to delete the built-in batch (if UI allows or programmatically) is prevented.
    *   Verify all card access methods in `CustomCardManager` return combined data correctly.

### Step 5.2: UI Adjustments (If Applicable)

*   **Action:** If there's a UI for managing card batches.
*   **Details:**
    *   The built-in card batch should be listed (perhaps with a special icon or designation).
    *   The option to delete the built-in card batch must be hidden or disabled.
*   **Reference:** `plan.md` - Section 2.3 (UI).

## Phase 6: Code Cleanup and Documentation

### Step 6.1: Review and Refactor

*   **Action:** Clean up any old code related to separate built-in card loading.
*   **Details:** Remove any redundant methods or variables.

### Step 6.2: Update Documentation

*   **Action:** Update any relevant comments or external documentation to reflect the new unified card management system.
