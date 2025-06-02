# Bug Fix Plan: Custom Field Name Management

## Bug Description

The current system stores all custom field names from imported card packs (batches) in a single `localStorage` key, `daggerheart_custom_field_names`. This list is de-duplicated globally for each field category (e.g., "professions", "ancestries") but lacks any association with the specific card pack that introduced each field name.

This leads to critical issues:

1.  **No Pack Association:** It's impossible to determine which card pack defined a particular custom field.
2.  **Incorrect Deletion:** When a card pack is deleted, its custom field names cannot be reliably removed.
    *   If a field name was also defined by another pack, it might be incorrectly removed or, conversely, if the system tries to be "smart" and not remove it, it's doing so without proper tracking.
    *   The current de-duplication logic means the system doesn't know if multiple packs rely on the same field name.
3.  **Data Integrity:** Maintaining custom field integrity across multiple card packs is compromised, especially when packs are added or removed.

## Current Flawed Logic

Affected file: `data/card/card-storage.ts` and related card pack import/deletion workflows.

*   **Storage Mechanism:** A single `localStorage` item (`daggerheart_custom_field_names`) holds a `CustomFieldNamesStore` object (e.g., `{ "professions": ["战士", "探险家"], "ancestries": ["树人"] }`).
*   **Import Process:**
    *   Custom field definitions are extracted from an imported card pack.
    *   These new field names are merged into the global `CustomFieldNamesStore` for their respective categories.
    *   `CustomCardStorage.saveCustomFieldNames(category, names)` de-duplicates names *within* that category before saving the entire global store. This operation is not pack-specific.
*   **Deletion Process:**
    *   While card pack data (`BatchData`) and its index entry are removed, there's no corresponding logic to selectively remove only the custom field names introduced by that specific pack from the global `daggerheart_custom_field_names` store.

## Proposed Fix Plan

The core idea is to store custom field definitions on a per-batch basis, using the unique `batchId` as the key.

### 1. New Storage Structure

*   **New `localStorage` Key:** `daggerheart_custom_fields_by_batch`
*   **Data Structure:** This key will store a JSON object where each top-level key is a `batchId`. The value for each `batchId` will be an object mirroring the structure of `customFieldDefinitions` from the card pack.

    ```typescript
    // Interface for custom fields defined by a single batch
    interface CustomFieldsForBatch {
        [category: string]: string[]; // e.g., { professions: ["战士"], ancestries: ["树人"] }
    }

    // Interface for the entire structure stored in localStorage
    interface AllCustomFieldsByBatch {
        [batchId: string]: CustomFieldsForBatch;
    }
    ```

*   **Example `localStorage` content for `daggerheart_custom_fields_by_batch`:**
    ```json
    {
      "batch_alpha_001": {
        "professions": ["战士", "星际流浪者", "探险家"],
        "ancestries": ["树人", "机械精灵"],
        "communities": ["河谷之民", "深海之民"],
        "domains": ["时空", "幻术", "奥秘", "虚空"]
      },
      "batch_beta_002": {
        "professions": ["Mage", "战士"], // "战士" can co-exist if defined by this pack too
        "newCustomCategory": ["ValueA", "ValueB"]
      }
    }
    ```

### 2. Modifications to `data/card/card-storage.ts`

*   **Define New Interfaces:** Add `CustomFieldsForBatch` and `AllCustomFieldsByBatch`.
*   **New `STORAGE_KEYS` Constant:**
    ```typescript
    export const STORAGE_KEYS = {
        // ... existing keys ...
        CUSTOM_FIELDS_BY_BATCH: 'daggerheart_custom_fields_by_batch' // New key
    };
    ```
*   **New Function: `saveCustomFieldsForBatch(batchId: string, definitions: CustomFieldsForBatch): void`**
    *   Retrieves the `AllCustomFieldsByBatch` object from `localStorage` (or initializes an empty object).
    *   Sets `allFields[batchId] = definitions;`.
    *   Saves the updated `AllCustomFieldsByBatch` object back to `localStorage`.
*   **New Function: `removeCustomFieldsForBatch(batchId: string): void`**
    *   Retrieves `AllCustomFieldsByBatch`.
    *   Deletes `allFields[batchId];`.
    *   Saves the updated `AllCustomFieldsByBatch` object.
*   **New Function: `getAggregatedCustomFieldNames(): CustomFieldNamesStore`**
    *   This function provides the de-duplicated list of all custom fields from *enabled* batches, for UI or other global uses.
    *   Loads `AllCustomFieldsByBatch`.
    *   Loads the main card index (`CustomCardStorage.loadIndex()`) to check `disabled` status of batches.
    *   Initializes an empty `aggregatedFields: CustomFieldNamesStore = {};`.
    *   Iterates through each `batchId` in `AllCustomFieldsByBatch`:
        *   If the batch `index.batches[batchId]` is not disabled:
            *   For each `category` and `namesArray` in `AllCustomFieldsByBatch[batchId]`:
                *   Ensure `aggregatedFields[category]` exists (initialize as `[]` if not).
                *   Append `namesArray` to `aggregatedFields[category]`.
    *   After collecting all names, iterate through `aggregatedFields` and de-duplicate each category's array: `aggregatedFields[category] = [...new Set(aggregatedFields[category])];`.
    *   Returns `aggregatedFields`.
*   **Deprecate and Remove Old Implementation:**
    *   Remove the old `STORAGE_KEYS.CUSTOM_FIELD_NAMES`.
    *   Remove old functions: `getAllCustomFieldNames`, `saveCustomFieldNames`, `loadCustomFieldNames`, `clearCustomFieldNames`, `clearAllCustomFieldNamesData`.

### 3. Update Card Pack Import Process

*   This logic likely resides in a service or manager responsible for handling file uploads/parsing and then calling `CustomCardStorage` methods (e.g., `BuiltinCardManager.ts` or a dedicated importer service).
*   After a card pack is successfully parsed and its main data is saved (i.e., `CustomCardStorage.saveBatch()` and index update):
    1.  Obtain the `batchId` for the newly imported pack.
    2.  Extract the `customFieldDefinitions` object directly from the parsed card pack JSON.
    3.  Call `CustomCardStorage.saveCustomFieldsForBatch(batchId, extractedDefinitions);`.

### 4. Update Card Pack Deletion Process

*   In the logic where a card pack is deleted (e.g., a function that calls `CustomCardStorage.removeBatch(batchId)` and updates the index):
    1.  After successfully removing the batch data and its index entry.
    2.  Call `CustomCardStorage.removeCustomFieldsForBatch(batchId);`.

### 5. UI Layer Custom Field Access

Since we're changing from a direct global store to batch-based storage, we need to ensure the UI components can still access all available custom field names for dropdowns and autocomplete features.

*   **Update Components Using Custom Fields:**
    *   Replace all calls to `CustomCardStorage.getAllCustomFieldNames()` with `CustomCardStorage.getAggregatedCustomFieldNames()`.
    *   This ensures UI components get the properly de-duplicated list of all custom fields from enabled batches.

### 6. Storage of `customFieldDefinitions` in `BatchData`

To properly support this new architecture, we need to ensure that `customFieldDefinitions` are stored as part of the batch data so they can be retrieved later.

*   **Modify `BatchData` Interface:**
    ```typescript
    export interface BatchData {
        metadata: BatchMetadata;
        cards: Card[];
        customFieldDefinitions?: CustomFieldsForBatch; // Add this field
    }
    ```

*   **Update Import Process:**
    *   When importing a card pack, store the `customFieldDefinitions` as part of the `BatchData`.
    *   This ensures we always have access to the original custom field definitions for each batch.

### 7. Data Migration Strategy - REMOVED

~~A migration path is needed for existing users...~~

**Since the system hasn't launched yet, we don't need to support migration from the old storage format. We can simply:**

1.  Remove the old `STORAGE_KEYS.CUSTOM_FIELD_NAMES` entirely.
2.  Remove all old custom field management functions.
3.  Start fresh with the new batch-based storage system.

### 8. Implementation Steps

1.  **Step 1: Update `card-storage.ts`**
    *   Add new interfaces and storage key
    *   Implement new functions: `saveCustomFieldsForBatch`, `removeCustomFieldsForBatch`, `getAggregatedCustomFieldNames`
    *   Remove old custom field functions
    *   Update `BatchData` interface to include `customFieldDefinitions`

2.  **Step 2: Update Import Process**
    *   Modify card pack import logic to store `customFieldDefinitions` in both:
        *   The `BatchData.customFieldDefinitions` field (for future access)
        *   The new batch-based custom fields storage (for immediate aggregation)

3.  **Step 3: Update Deletion Process**
    *   Modify card pack deletion logic to call `removeCustomFieldsForBatch(batchId)`

4.  **Step 4: Update UI Components**
    *   Replace all calls to the old `getAllCustomFieldNames()` with `getAggregatedCustomFieldNames()`

5.  **Step 5: Testing**
    *   Test importing multiple card packs with overlapping custom field names
    *   Test deletion of card packs and verify custom fields are properly cleaned up
    *   Test that remaining card packs still work correctly after deletion

### 9. Key Benefits of This Approach

1.  **Perfect Isolation:** Each card pack's custom fields are stored separately
2.  **Correct Deletion:** Deleting a card pack removes only its custom fields
3.  **No False Dependencies:** Multiple packs can define the same field names independently
4.  **Proper Aggregation:** UI gets properly de-duplicated field names from all active packs
5.  **Future-Proof:** Easy to add per-pack features like field validation or metadata

This revised plan provides a robust, clean solution that correctly handles the lifecycle of custom field names while ensuring proper separation between different card packs.
