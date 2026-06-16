# App Preferences and Built-in Equipment Disable Design

## Context

The app currently stores several small browser-local preferences in separate localStorage keys:

- Card display mode uses Zustand persist under `text-mode-storage`.
- Dual-page display state uses Zustand persist under `dual-page-storage`.
- Announcement read state uses `dhsheet:last-read-announcement-id`.
- Equipment pack lifecycle state uses `dh_equipment_index` and `dh_equipment_pack:*`.

The first three are small user preferences. The equipment keys are content data and must remain separate. Built-in equipment disable state belongs with preferences because `builtin` is a runtime source, not an imported Pack ID and not Pack Data.

## Goal

Create one local preference authority for small browser-local user preferences and use it to support disabling the built-in equipment runtime source.

The initial preference set is:

- Card display mode: image or text.
- Dual-page display state.
- Latest read announcement id.
- Disabled equipment runtime source ids, initially supporting `builtin`.

## Non-Goals

- Do not migrate character saves.
- Do not migrate card pack index or batch data.
- Do not migrate equipment pack index or pack data.
- Do not migrate card image IndexedDB data.
- Do not migrate editor draft data, such as `card-editor-storage`.
- Do not migrate internal card system configuration from `unified-card-storage` or `daggerheart_custom_cards_config` in this change.
- Do not allow deleting built-in equipment.
- Do not make imported card/equipment pack storage share a generic content-source index in this change.

## New Storage Document

Use a single localStorage key:

```ts
const APP_PREFERENCES_STORAGE_KEY = "dhsheet:app-preferences:v1"
```

Document shape:

```ts
interface AppPreferencesDocument {
  format: "dhsheet.app-preferences.v1"
  ui: {
    cardDisplayMode: "image" | "text"
    dualPage: {
      enabled: boolean
      leftPageId: string
      rightPageId: string
      leftTabValue: string
      rightTabValue: string
    }
  }
  announcements: {
    lastReadAnnouncementId?: string
  }
  contentSources: {
    equipmentDisabledSourceIds: string[]
  }
}
```

Defaults:

- `cardDisplayMode: "image"`
- `dualPage.enabled: false`
- `dualPage.leftPageId: "page1"`
- `dualPage.rightPageId: "page2"`
- `dualPage.leftTabValue: "page1"`
- `dualPage.rightTabValue: "page2"`
- no `lastReadAnnouncementId`
- `equipmentDisabledSourceIds: []`

Invalid or partially invalid documents are normalized to defaults for the invalid fields. The module should not throw during normal rendering if localStorage is unavailable or malformed.

## Legacy Migration

Legacy keys:

- `text-mode-storage`
- `dual-page-storage`
- `dhsheet:last-read-announcement-id`

Migration rules:

1. Read the new key first.
2. If the new key exists and parses to a valid preferences document, use it and ignore legacy keys.
3. If the new key is missing or invalid, hydrate defaults from legacy keys where possible.
4. Write the new key.
5. Only after the new key write succeeds, remove legacy keys.
6. If the new key write fails, do not remove legacy keys.
7. If legacy key removal fails, ignore the removal failure; the new key remains the authority.

Legacy `text-mode-storage` should support Zustand persist's current shape:

```json
{ "state": { "isTextMode": true }, "version": 0 }
```

Legacy `dual-page-storage` should support Zustand persist's current shape:

```json
{
  "state": {
    "isDualPageMode": true,
    "leftPageId": "page1",
    "rightPageId": "page2",
    "leftTabValue": "page1",
    "rightTabValue": "page2"
  },
  "version": 0
}
```

Only these legacy preference keys are deleted. Content data keys are never deleted by this migration.

## Module Design

Add a small preferences module, likely `lib/app-preferences.ts`.

The external interface should be semantic rather than exposing raw localStorage:

```ts
getAppPreferences(storage?): AppPreferencesDocument
setCardDisplayMode(mode, storage?): void
getCardDisplayMode(storage?): "image" | "text"
getDualPagePreferences(storage?): AppPreferencesDocument["ui"]["dualPage"]
setDualPagePreferences(partial, storage?): void
isLatestAnnouncementRead(latestId, storage?): boolean
markAnnouncementRead(id, storage?): void
getEquipmentDisabledSourceIds(storage?): string[]
setEquipmentSourceDisabled(sourceId, disabled, storage?): void
```

The module may expose lower-level load/save helpers for tests, but callers should use semantic helpers.

## Equipment Integration

Keep equipment content storage unchanged:

- `dh_equipment_index` remains the Storage Index for imported Equipment Packs.
- `dh_equipment_pack:*` remains Pack Data.
- `builtin` remains a reserved runtime source id and must not enter the Storage Index.

Add a narrow equipment preference port to the equipment Application Service rather than making it depend on unrelated UI/announcement preferences:

```ts
interface EquipmentSourcePreferences {
  getDisabledSourceIds(): readonly RuntimeEquipmentSourceId[]
  setSourceDisabled(sourceId: RuntimeEquipmentSourceId, disabled: boolean): Promise<void> | void
}
```

The default service composition root adapts `lib/app-preferences.ts` to this port.

Runtime cache input gains disabled source ids:

```ts
interface EquipmentRuntimeCacheBuildInput {
  builtinTemplates: RuntimeEquipmentTemplate[]
  storageSnapshot: EquipmentPackStorageSnapshot
  disabledSourceIds?: readonly RuntimeEquipmentSourceId[]
}
```

Runtime cache behavior:

- Built-in templates are added with `selectable: !disabledSourceIds.includes("builtin")`.
- Built-in runtime pack record reports `disabled` based on the same source state.
- Imported packs continue using `entry.disabled`.

Application Service behavior:

- `initialize()` loads storage snapshot and source preferences, then rebuilds runtime cache.
- `setPackDisabled("builtin", disabled)` writes source preferences, reloads the storage snapshot, and rebuilds runtime cache.
- `setPackDisabled(importedPackId, disabled)` keeps existing repository transaction behavior.
- `importFromSource()`, `removePack(importedPackId)`, and `setPackDisabled(importedPackId, disabled)` must pass current disabled source ids through the shared runtime rebuild helper. Toggling, importing, or deleting imported packs must not accidentally re-enable `builtin`.
- `removePack("builtin")` remains disallowed at the UI layer. The repository still should not contain `builtin`.
- `EquipmentSourcePreferences` should only persist known source ids. In this change, `builtin` is the only known source id; unknown strings are ignored or dropped during normalization.

Repository behavior:

- `builtin` remains a reserved Pack ID at the Storage Index layer, not only at the runtime cache layer.
- `commitImport({ packId: "builtin" })` must fail with a storage transaction error rather than writing it.
- `loadSnapshot()` / recovery should not include `dh_equipment_index.packs.builtin` in the returned Storage Snapshot. It should remove it as invalid reserved-id index state, or at minimum report and exclude it so runtime cache does not fail because of persisted reserved state.
- `removePack("builtin")` and `setPackDisabled("builtin", ...)` should continue to return `PACK_NOT_FOUND` from the repository when called directly; the Application Service handles builtin toggle before repository lifecycle operations.

## UI Integration

Stop using `isSystemPack` to imply every action is unavailable.

Expose clearer list-item capabilities:

```ts
canDisable: boolean
canRemove: boolean
```

Expected capabilities:

- Built-in equipment pack: `canDisable: true`, `canRemove: false`.
- Imported equipment pack: `canDisable: true`, `canRemove: true`.

These fields should be required on `EquipmentPackListItem`. UI should not fall back to deriving action availability from `isSystemPack`.

The equipment pack tab should enable the power button for built-in equipment and keep delete disabled.

The card-manager page should keep the built-in delete guard but remove the built-in toggle guard.

## Announcement Integration

Keep announcement content in `lib/announcements.ts`.

Move read-state persistence to app preferences:

- `isLatestAnnouncementRead()` should ask app preferences whether `latestAnnouncementId` was read.
- `markLatestAnnouncementRead()` should write the latest id through app preferences.
- The old announcement storage key exists only in migration code.

## Card Display Mode Integration

Keep `useTextModeStore` as the UI state Module if that is the smallest change, but replace Zustand persist storage with app preferences read/write.

Required behavior:

- Initial state hydrates from app preferences.
- Toggling writes `cardDisplayMode` to app preferences.
- The old `text-mode-storage` key exists only in migration code.

## Dual-Page Mode Integration

Keep `useDualPageStore` as the UI state Module if that is the smallest change, but replace Zustand persist storage with app preferences read/write.

Required behavior:

- Initial state hydrates from app preferences.
- Toggling dual-page mode and changing left/right page/tab values writes the new dual-page preferences.
- The old `dual-page-storage` key exists only in migration code.

## Testing Plan

Add focused tests for `lib/app-preferences.ts`:

- Defaults with empty storage.
- Reads valid new key.
- Normalizes invalid fields.
- Migrates legacy text mode and announcement keys into the new key.
- Migrates legacy dual-page state into the new key.
- Deletes legacy keys only after successful new-key write.
- Does not delete legacy keys when new-key write fails.
- Ignores legacy keys when a valid new key exists.

Update announcement tests:

- Read/write behavior goes through app preferences.
- localStorage read/write failures do not break announcement helpers.

Update text mode tests or add coverage if none exists:

- Initial state reflects migrated preferences.
- Toggle writes new preferences key.

Update dual-page tests or add coverage if none exists:

- Initial state reflects migrated preferences.
- Dual-page state changes write new preferences key.

Update equipment runtime/application/UI tests:

- Runtime cache excludes built-in templates from selectable indexes when `builtin` is disabled.
- Management reader still lists built-in pack with full detail and `disabled: true`.
- Application Service toggles `builtin` through source preferences and rebuilds from the current storage snapshot.
- Built-in remains disabled after imported pack import/remove/toggle rebuild paths.
- Repository rejects or recovers reserved `builtin` Pack ID in the Storage Index layer before runtime cache rebuild.
- Imported pack disable behavior remains unchanged.
- Equipment UI exposes built-in `canDisable: true` and `canRemove: false`.
- Equipment pack tab allows built-in toggle and keeps built-in delete disabled.
- Card-manager handler no longer blocks built-in toggle.

## Review Focus

Reviewers should check:

- No content data keys are accidentally migrated or deleted.
- All old preference reads are removed from normal runtime paths.
- The new preferences module is the only normal writer for card display mode, announcement read state, and disabled equipment runtime sources.
- The new preferences module is also the only normal writer for dual-page display state.
- `builtin` remains absent from the equipment Storage Index.
- Runtime cache and management read models agree on built-in disabled state.
