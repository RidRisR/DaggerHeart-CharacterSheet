# App Preferences and Built-in Equipment Disable Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Consolidate small browser-local preferences into `dhsheet:app-preferences:v1` and allow the built-in equipment runtime source to be disabled without putting `builtin` into equipment pack storage.

**Architecture:** Add a deep `lib/app-preferences.ts` module as the single preference authority. Keep content pack Storage Index and Pack Data unchanged. Equipment gets a narrow source-preferences port, and every runtime cache rebuild receives current disabled source ids.

**Tech Stack:** TypeScript, Zustand, localStorage-compatible storage adapters, Vitest, React Testing Library.

---

## File Map

- Create `lib/app-preferences.ts`: preference document schema, normalization, legacy migration, semantic read/write helpers.
- Create `lib/__tests__/app-preferences.test.ts`: migration and normalization tests.
- Modify `lib/text-mode-store.ts`: remove normal Zustand localStorage persist; hydrate/write through app preferences.
- Modify `lib/dual-page-store.ts`: remove normal Zustand localStorage persist; hydrate/write through app preferences.
- Modify `lib/announcements.ts` and tests: announcement read state goes through app preferences.
- Modify `equipment/runtime-cache/types.ts` and `equipment/runtime-cache/build-cache-view.ts`: accept disabled source ids and report disabled built-in pack state.
- Modify `equipment/packs/application-service.ts`: add `EquipmentSourcePreferences` port and pass disabled source ids through all rebuild paths.
- Modify `equipment/packs/storage-types.ts` and `equipment/packs/local-storage-repository.ts`: reject or recover reserved `builtin` Pack ID at the Storage Index layer.
- Modify `equipment/services/default-equipment-services.ts`: adapt app preferences to equipment source preferences.
- Modify `equipment/ui/types.ts`, `equipment/ui/equipment-ui-store.ts`, `components/content-pack-manager/equipment-pack-tab.tsx`, and `app/card-manager/page.tsx`: required `canDisable` / `canRemove`, built-in toggle enabled, built-in delete disabled.
- Update relevant tests under `equipment/**/__tests__`, `components/content-pack-manager/__tests__`, and existing announcement/text/dual-page tests or add focused coverage.

## Task 1: App Preferences Module

**Files:**
- Create: `lib/app-preferences.ts`
- Test: `lib/__tests__/app-preferences.test.ts`

- [x] **Step 1: Write failing tests for defaults and valid new key**

```ts
import {
  APP_PREFERENCES_STORAGE_KEY,
  getAppPreferences,
  setCardDisplayMode,
  setEquipmentSourceDisabled,
} from "../app-preferences"

it("returns defaults when storage is empty", () => {
  const storage = createMemoryStorage()
  expect(getAppPreferences(storage)).toMatchObject({
    format: "dhsheet.app-preferences.v1",
    ui: {
      cardDisplayMode: "image",
      dualPage: {
        enabled: false,
        leftPageId: "page1",
        rightPageId: "page2",
        leftTabValue: "page1",
        rightTabValue: "page2",
      },
    },
    announcements: {},
    contentSources: { equipmentDisabledSourceIds: [] },
  })
})

it("reads and normalizes the new preferences key", () => {
  const storage = createMemoryStorage({
    [APP_PREFERENCES_STORAGE_KEY]: JSON.stringify({
      format: "dhsheet.app-preferences.v1",
      ui: { cardDisplayMode: "text", dualPage: { enabled: true, leftPageId: "page2" } },
      announcements: { lastReadAnnouncementId: "latest" },
      contentSources: { equipmentDisabledSourceIds: ["builtin", "pack_custom"] },
    }),
  })

  expect(getAppPreferences(storage)).toMatchObject({
    ui: {
      cardDisplayMode: "text",
      dualPage: {
        enabled: true,
        leftPageId: "page2",
        rightPageId: "page2",
        leftTabValue: "page1",
        rightTabValue: "page2",
      },
    },
    announcements: { lastReadAnnouncementId: "latest" },
    contentSources: { equipmentDisabledSourceIds: ["builtin"] },
  })
})
```

- [x] **Step 2: Write failing tests for legacy migration and deletion**

```ts
it("migrates legacy preference keys and deletes them after writing the new key", () => {
  const storage = createMemoryStorage({
    "text-mode-storage": JSON.stringify({ state: { isTextMode: true }, version: 0 }),
    "dual-page-storage": JSON.stringify({
      state: {
        isDualPageMode: true,
        leftPageId: "page3",
        rightPageId: "page4",
        leftTabValue: "page3",
        rightTabValue: "page4",
      },
      version: 0,
    }),
    "dhsheet:last-read-announcement-id": "announcement-1",
  })

  expect(getAppPreferences(storage)).toMatchObject({
    ui: {
      cardDisplayMode: "text",
      dualPage: {
        enabled: true,
        leftPageId: "page3",
        rightPageId: "page4",
        leftTabValue: "page3",
        rightTabValue: "page4",
      },
    },
    announcements: { lastReadAnnouncementId: "announcement-1" },
  })
  expect(storage.getItem("text-mode-storage")).toBeNull()
  expect(storage.getItem("dual-page-storage")).toBeNull()
  expect(storage.getItem("dhsheet:last-read-announcement-id")).toBeNull()
})

it("does not delete legacy keys when writing the new key fails", () => {
  const storage = createMemoryStorage(
    { "text-mode-storage": JSON.stringify({ state: { isTextMode: true }, version: 0 }) },
    { failWritesFor: [APP_PREFERENCES_STORAGE_KEY] },
  )

  expect(getAppPreferences(storage).ui.cardDisplayMode).toBe("text")
  expect(storage.getItem("text-mode-storage")).not.toBeNull()
})
```

- [x] **Step 3: Implement `lib/app-preferences.ts`**

Implement these exports:

```ts
export const APP_PREFERENCES_STORAGE_KEY = "dhsheet:app-preferences:v1"
export const LEGACY_TEXT_MODE_STORAGE_KEY = "text-mode-storage"
export const LEGACY_DUAL_PAGE_STORAGE_KEY = "dual-page-storage"
export const LEGACY_ANNOUNCEMENT_READ_STORAGE_KEY = "dhsheet:last-read-announcement-id"

export function getAppPreferences(storage: Pick<Storage, "getItem" | "setItem" | "removeItem"> | undefined = globalThis.localStorage): AppPreferencesDocument
export function getCardDisplayMode(storage?: StorageLike): "image" | "text"
export function setCardDisplayMode(mode: "image" | "text", storage?: StorageLike): void
export function getDualPagePreferences(storage?: StorageLike): AppPreferencesDocument["ui"]["dualPage"]
export function setDualPagePreferences(partial: Partial<AppPreferencesDocument["ui"]["dualPage"]>, storage?: StorageLike): void
export function isLatestAnnouncementRead(latestId: string | null, storage?: StorageLike): boolean
export function markAnnouncementRead(id: string | null, storage?: StorageLike): void
export function getEquipmentDisabledSourceIds(storage?: StorageLike): string[]
export function setEquipmentSourceDisabled(sourceId: string, disabled: boolean, storage?: StorageLike): void
```

Unknown equipment source ids are dropped; only `"builtin"` is persisted in this change.

- [x] **Step 4: Run focused test**

Run: `pnpm vitest run lib/__tests__/app-preferences.test.ts`

Expected: tests pass.

## Task 2: Move Existing Preference Callers

**Files:**
- Modify: `lib/text-mode-store.ts`
- Modify: `lib/dual-page-store.ts`
- Modify: `lib/announcements.ts`
- Test: existing or new tests for these helpers/stores

- [x] **Step 1: Update text mode store**

Use app preferences for initial state and writes:

```ts
import { create } from "zustand"
import { getCardDisplayMode, setCardDisplayMode } from "@/lib/app-preferences"

export const useTextModeStore = create<TextModeStore>()((set) => ({
  isTextMode: getCardDisplayMode() === "text",
  toggleTextMode: () =>
    set((state) => {
      const next = !state.isTextMode
      setCardDisplayMode(next ? "text" : "image")
      return { isTextMode: next }
    }),
  setTextMode: (enabled) => {
    setCardDisplayMode(enabled ? "text" : "image")
    set({ isTextMode: enabled })
  },
}))
```

- [x] **Step 2: Update dual-page store**

Hydrate from `getDualPagePreferences()` and call `setDualPagePreferences()` in every mutator.

- [x] **Step 3: Update announcement helpers**

Keep announcement content and sorting unchanged. Replace old key reads/writes:

```ts
export function isLatestAnnouncementRead(storage: Storage | undefined = globalThis.localStorage) {
  return appPreferencesIsLatestAnnouncementRead(latestAnnouncementId, storage)
}

export function markLatestAnnouncementRead(storage: Storage | undefined = globalThis.localStorage) {
  markAnnouncementRead(latestAnnouncementId, storage)
}
```

- [x] **Step 4: Verify old keys only exist in migration/tests**

Run:

```bash
rg -n "text-mode-storage|dual-page-storage|dhsheet:last-read-announcement-id" lib app components card equipment
```

Expected: matches are limited to `lib/app-preferences.ts`, tests, and exported legacy constants.

## Task 3: Equipment Runtime and Application Service

**Files:**
- Modify: `equipment/runtime-cache/types.ts`
- Modify: `equipment/runtime-cache/build-cache-view.ts`
- Modify: `equipment/packs/application-service.ts`
- Modify: `equipment/services/default-equipment-services.ts`
- Tests: `equipment/runtime-cache/__tests__/build-cache-view.test.ts`, `equipment/runtime-cache/__tests__/readers.test.ts`, `equipment/packs/__tests__/application-service.test.ts`

- [x] **Step 1: Add failing runtime tests**

Add tests for:

```ts
const result = tryBuildEquipmentRuntimeCacheView({
  builtinTemplates: [makeRuntimeWeapon({ id: "weapon:builtin" })],
  storageSnapshot: makeStorageSnapshot([]),
  disabledSourceIds: ["builtin"],
})
expect(result.ok).toBe(true)
expect(result.view.queryIndexes.selectableTemplateIds).not.toContain("weapon:builtin")
expect(result.view.templatesById.has("weapon:builtin")).toBe(true)
expect(result.view.packsById.get("builtin")?.disabled).toBe(true)
```

- [x] **Step 2: Implement runtime cache input**

Add `disabledSourceIds?: readonly RuntimeEquipmentSourceId[]` to `EquipmentRuntimeCacheBuildInput`; compute a `Set` in `tryBuildEquipmentRuntimeCacheView`; use it for built-in `selectable` and `toBuiltinRuntimePackRecord(view, disabled)`.

- [x] **Step 3: Add application service source preferences port**

Add:

```ts
export interface EquipmentSourcePreferences {
  getDisabledSourceIds(): readonly RuntimeEquipmentSourceId[]
  setSourceDisabled(sourceId: RuntimeEquipmentSourceId, disabled: boolean): Promise<void> | void
}
```

Default it to an in-memory no-op implementation in tests when omitted.

- [x] **Step 4: Make every rebuild path pass disabled source ids**

Update the shared `rebuildRuntimeCache()` helper to call `sourcePreferences.getDisabledSourceIds()` and pass it into `runtimeCacheService.rebuild()`. Use this helper from import, remove, imported toggle, builtin toggle, and initialize.

- [x] **Step 5: Implement `setPackDisabled("builtin", disabled)`**

Handle builtin before repository calls:

```ts
if (packId === "builtin") {
  await sourcePreferences.setSourceDisabled("builtin", disabled)
  const storageSnapshot = await input.repository.loadSnapshot()
  return rebuildRuntimeCache({ ...sourcePreferences, storageSnapshot })
}
```

- [x] **Step 6: Adapt default services**

In `equipment/services/default-equipment-services.ts`, provide an adapter backed by `getEquipmentDisabledSourceIds()` and `setEquipmentSourceDisabled()` from `lib/app-preferences.ts`.

- [x] **Step 7: Run focused equipment tests**

Run:

```bash
pnpm vitest run equipment/runtime-cache/__tests__/build-cache-view.test.ts equipment/runtime-cache/__tests__/readers.test.ts equipment/packs/__tests__/application-service.test.ts equipment/services/__tests__/default-equipment-services.test.ts
```

Expected: tests pass.

## Task 4: Repository Reserved ID Protection

**Files:**
- Modify: `equipment/packs/storage-types.ts`
- Modify: `equipment/packs/local-storage-repository.ts`
- Tests: `equipment/packs/__tests__/local-storage-repository.test.ts`

- [x] **Step 1: Add failing repository tests**

Add tests for:

```ts
it("commitImport rejects reserved builtin pack id", async () => {
  const repository = createLocalStorageEquipmentPackRepository(createInMemoryEquipmentPackStorageAdapter())
  const result = await repository.commitImport({ ...makeCommitPlan(), packId: "builtin" })
  expect(result.ok).toBe(false)
  expect(result.ok ? undefined : result.error.code).toBe("PACK_ID_RESERVED")
})

it("loadSnapshot removes reserved builtin index entry", async () => {
  const adapter = createInMemoryEquipmentPackStorageAdapter({
    [LOCAL_STORAGE_KEYS.INDEX]: JSON.stringify({
      format: "daggerheart.equipment-pack-index.v1",
      updatedAt: "2026-06-16T00:00:00.000Z",
      packs: { builtin: { importedAt: "2026-06-16T00:00:00.000Z", disabled: false } },
    }),
  })
  const snapshot = await createLocalStorageEquipmentPackRepository(adapter).loadSnapshot()
  expect(snapshot.packs.has("builtin")).toBe(false)
  expect(snapshot.integrity.issues.some((issue) => issue.code === "PACK_ID_RESERVED")).toBe(true)
})
```

- [x] **Step 2: Add storage issue code**

Add `"PACK_ID_RESERVED"` to `EquipmentPackStorageIssueCode`.

- [x] **Step 3: Implement reserved ID checks**

Add `const RESERVED_PACK_IDS = new Set(["builtin"])` in repository implementation. Reject commit plans with reserved IDs and recover reserved index entries by excluding/removing them during snapshot recovery.

- [x] **Step 4: Run repository tests**

Run: `pnpm vitest run equipment/packs/__tests__/local-storage-repository.test.ts`

Expected: tests pass.

## Task 5: Equipment UI Capabilities

**Files:**
- Modify: `equipment/ui/types.ts`
- Modify: `equipment/ui/equipment-ui-store.ts`
- Modify: `components/content-pack-manager/equipment-pack-tab.tsx`
- Modify: `app/card-manager/page.tsx`
- Tests: `equipment/ui/__tests__/equipment-ui-store.test.ts`, `components/content-pack-manager/__tests__/equipment-pack-tab.test.tsx`

- [x] **Step 1: Add required capability fields**

Update `EquipmentPackListItem`:

```ts
canDisable: boolean
canRemove: boolean
```

Builtin list items get `{ canDisable: true, canRemove: false }`; imported list items get `{ canDisable: true, canRemove: true }`.

- [x] **Step 2: Update tab actions**

Use capabilities for button disabled state:

```tsx
disabled={!pack.canDisable}
disabled={!pack.canRemove}
```

Labels should say built-in equipment cannot be deleted, but the toggle label should be normal `启用装备包` / `禁用装备包`.

- [x] **Step 3: Update page handlers**

Keep delete guard for `!pack.canRemove`; remove the built-in toggle guard. `handleToggleEquipmentPack` should call `setPackDisabled()` for `builtin`.

- [x] **Step 4: Update UI tests**

Built-in pack expectations:

- toggle buttons are enabled in mobile and desktop.
- delete buttons are disabled in mobile and desktop.
- clicking toggle calls `onToggleDisabled("builtin", true)`.
- clicking delete does not call `onRemove`.

- [x] **Step 5: Run UI tests**

Run:

```bash
pnpm vitest run equipment/ui/__tests__/equipment-ui-store.test.ts components/content-pack-manager/__tests__/equipment-pack-tab.test.tsx
```

Expected: tests pass.

## Task 6: Full Verification

**Files:**
- All changed files.

- [x] **Step 1: Run targeted suite**

Run:

```bash
pnpm vitest run lib/__tests__ components/content-pack-manager/__tests__ equipment/runtime-cache/__tests__ equipment/ui/__tests__ equipment/packs/__tests__ equipment/services/__tests__ card/stores/__tests__/batch-read-model.test.ts
```

Expected: all selected tests pass.

- [x] **Step 2: Run type check**

Run:

```bash
pnpm exec tsc --noEmit
```

Expected: no TypeScript errors.

- [x] **Step 3: Grep old-key normal paths**

Run:

```bash
rg -n "text-mode-storage|dual-page-storage|dhsheet:last-read-announcement-id" lib app components card equipment
```

Expected: old keys appear only in `lib/app-preferences.ts` and tests.

- [x] **Step 4: Review git diff**

Run:

```bash
git diff --stat
git diff --check
```

Expected: scoped changes, no whitespace errors.
