# Content Pack Editor Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor `/card-editor` validation, draft import/export serialization, editor image handling, and side-effect boundaries according to the phase 2 behavior decisions.

**Architecture:** Keep the editor as an authoring shell over existing card and equipment draft shapes. New editor application services perform recovery, serialization, validation orchestration, and side-effect coordination through explicit ports; formal import pipelines continue to own Dry Run, Commit Plan, and Storage Transaction boundaries.

**Tech Stack:** Next.js App Router, React, TypeScript, Zustand-style editor stores, Vitest, JSZip, existing card/equipment import application services.

---

## Inputs

- `docs/superpowers/specs/2026-06-20-content-pack-editor-phase-2-behavior-decisions.md`
- `docs/contexts/content-pack-import/CONTEXT.md`
- Phase 1 characterization tests under:
  - `app/card-editor/store/__tests__/card-editor-store-characterization.test.ts`
  - `app/card-editor/utils/__tests__/import-export-characterization.test.ts`
  - `app/card-editor/utils/__tests__/zip-import-export-characterization.test.ts`

## File Structure

Create:

- `app/card-editor/services/card-draft-repair.ts`  
  Editor-only card draft repair for ancestry pairs and subclass triples. Returns `{ draft, report }`.
- `app/card-editor/services/card-draft-serialization.ts`  
  Read-only card draft JSON/DHCB-view serialization. Owns whitelist payload construction.
- `app/card-editor/services/card-editor-image-service.ts`  
  Editor image workspace port and browser implementation wrapping `image-db-helpers`.
- `app/card-editor/services/card-editor-recovery.ts`  
  JSON/DHCB editor draft recovery orchestration, image import report, orphan skip, image persistence warning.
- `app/card-editor/services/card-editor-workspace-recovery.ts`
  Silent persisted editor workspace hydration cleanup. Reconciles stale local-image flags against the editor image workspace and performs best-effort orphan cleanup.
- `app/card-editor/services/card-editor-validation.ts`  
  Card editor validation orchestration: serialize default target, run card Dry Run, run Editor-Owned Authoring Checks, project result.
- `app/card-editor/services/editor-validation-view-model.ts`  
  Shared validation view model for card and equipment validation dialogs.
- `app/card-editor/services/diagnostic-source-map.ts`  
  Minimal source-map metadata and lookup helpers for editor validation projection.
- `app/card-editor/components/editor-validation-results.tsx`  
  Shared validation dialog UI consuming `EditorValidationViewModel`.
- `app/card-editor/hooks/use-card-editor-file-actions.ts`  
  UI adapter hook for file input, download, toast, and application-service orchestration.

Modify:

- `app/card-editor/types/index.ts`  
  Remove `isModified` and `lastSaved` from `CardPackageState`.
- `app/card-editor/utils/import-export.ts`  
  Replace old mixed recovery/export code with compatibility facades delegating to new services.
- `app/card-editor/utils/zip-import.ts`  
  Convert to a compatibility facade or delete after call sites move.
- `app/card-editor/utils/zip-export.ts`  
  Convert to a compatibility facade or delete after call sites move.
- `app/card-editor/services/validation-service.ts`  
  Delete after `card-editor-store` and UI no longer import it.
- `app/card-editor/services/error-message-mapper.ts`  
  Delete after shared validation projection replaces it.
- `app/card-editor/components/validation-results.tsx`  
  Replace card-specific validation result rendering with the shared component, or delete if no call sites remain.
- `app/card-editor/equipment/equipment-validation.ts`  
  Project equipment diagnostics into `EditorValidationViewModel`; keep equipment-specific jump target mapping.
- `app/card-editor/equipment/components/equipment-validation-results.tsx`  
  Replace equipment-specific dialog body with shared component wrapper.
- `equipment/import/types.ts`  
  Rename `authoringPreprocess` stage to `sourceAdaptation`, or keep the serialized stage if broader migration risk is too high and document the compatibility facade.
- `equipment/import/import-pipeline.ts`  
  Skip conflict checks in Dry Run; only run storage-aware conflict checks when commit planning is requested.
- `equipment/packs/application-service.ts`  
  Do not load repository snapshot for `mode: "dryRun"`.
- `app/card-editor/store/card-editor-store.ts`  
  Remove validation orchestration and direct new-path image helper imports; keep simple draft mutation and selection state.
- `app/card-editor/page.tsx`  
  Use `use-card-editor-file-actions` for import/export/validate actions.

Test:

- Add focused service tests beside new services under `app/card-editor/services/__tests__/`.
- Update existing characterization tests to reflect intentionally changed behavior.
- Update equipment import/application tests for Dry Run boundary.
- Update shared validation UI tests under `app/card-editor/components/__tests__/`.

## Implementation Tasks

### Task 1: Remove Card Editor-Only Draft Fields

**Files:**
- Modify: `app/card-editor/types/index.ts`
- Modify: `app/card-editor/utils/__tests__/import-export-characterization.test.ts`
- Modify: `app/card-editor/utils/__tests__/zip-import-export-characterization.test.ts`
- Modify: `app/card-editor/store/__tests__/card-editor-store-characterization.test.ts`

- [ ] **Step 1: Update characterization tests for the intended behavior**

  Remove assertions that imported card drafts contain `isModified` or `lastSaved`. Replace them with assertions that imported drafts do not expose these properties:

  ```ts
  expect(imported).not.toHaveProperty("isModified")
  expect(imported).not.toHaveProperty("lastSaved")
  ```

  In tests that build legacy persisted input, keep `isModified` and `lastSaved` in the input object to prove serialization ignores residues.

- [ ] **Step 2: Run the focused old-behavior tests and confirm failures**

  Run:

  ```bash
  pnpm test:run app/card-editor/utils/__tests__/import-export-characterization.test.ts app/card-editor/utils/__tests__/zip-import-export-characterization.test.ts app/card-editor/store/__tests__/card-editor-store-characterization.test.ts
  ```

  Expected: FAIL where production still writes `isModified` or `lastSaved`.

- [ ] **Step 3: Remove editor-only fields from the public draft type**

  In `app/card-editor/types/index.ts`, replace `CardPackageState` with:

  ```ts
  export type CardPackageState = ImportData
  ```

  Keep `defaultPackage` unchanged except do not add editor-only fields.

- [ ] **Step 4: Stop writing the removed fields in recovery/import paths**

  Remove `isModified: false` and `lastSaved: new Date()` from:

  - `app/card-editor/utils/import-export.ts`
  - `app/card-editor/utils/zip-import.ts`
  - `app/card-editor/store/card-editor-store.ts` test setup helpers if production no longer requires those fields

- [ ] **Step 5: Run focused tests**

  Run:

  ```bash
  pnpm test:run app/card-editor/utils/__tests__/import-export-characterization.test.ts app/card-editor/utils/__tests__/zip-import-export-characterization.test.ts app/card-editor/store/__tests__/card-editor-store-characterization.test.ts
  ```

  Expected: PASS for updated editor-only field expectations.

- [ ] **Step 6: Commit**

  ```bash
  git add app/card-editor/types/index.ts app/card-editor/utils app/card-editor/store/__tests__/card-editor-store-characterization.test.ts
  git commit -m "refactor: remove card editor-only draft fields"
  ```

### Task 2: Extract Editor Draft Repair With Report

**Files:**
- Create: `app/card-editor/services/card-draft-repair.ts`
- Create: `app/card-editor/services/__tests__/card-draft-repair.test.ts`
- Modify: `app/card-editor/utils/import-export.ts`
- Modify: `app/card-editor/utils/zip-import.ts`

- [ ] **Step 1: Add failing repair tests**

  Create `app/card-editor/services/__tests__/card-draft-repair.test.ts`:

  ```ts
  import { describe, expect, it } from "vitest"
  import type { CardPackageState } from "../../types"
  import { repairCardEditorDraft } from "../card-draft-repair"

  function baseDraft(partial: Partial<CardPackageState>): CardPackageState {
    return {
      name: "Pack",
      version: "1.0.0",
      description: "",
      author: "Author",
      customFieldDefinitions: {
        professions: [],
        ancestries: [],
        communities: [],
        domains: [],
        variants: [],
      },
      profession: [],
      ancestry: [],
      community: [],
      subclass: [],
      domain: [],
      variant: [],
      ...partial,
    }
  }

  describe("repairCardEditorDraft", () => {
    it("fills missing ancestry pair cards and reports the repair", () => {
      const result = repairCardEditorDraft(
        baseDraft({
          ancestry: [{ id: "anc-1", 名称: "Human 1", 种族: "Human", 简介: "People", 类别: 1, 效果: "A" } as any],
        }),
      )

      expect(result.draft.ancestry).toHaveLength(2)
      expect(result.report.repairs).toContainEqual(
        expect.objectContaining({ kind: "ancestryPairCompleted", group: "Human" }),
      )
    })

    it("fills missing subclass triple cards and reports each created level", () => {
      const result = repairCardEditorDraft(
        baseDraft({
          subclass: [{ id: "sub-1", 名称: "Blade 基石", 主职: "Warrior", 子职业: "Blade", 等级: "基石", 描述: "A", 施法: "" } as any],
        }),
      )

      expect(result.draft.subclass).toHaveLength(3)
      expect(result.report.repairs).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ kind: "subclassTripleCompleted", group: "Warrior/Blade", level: "专精" }),
          expect.objectContaining({ kind: "subclassTripleCompleted", group: "Warrior/Blade", level: "大师" }),
        ]),
      )
    })

    it("does not mutate the input draft", () => {
      const input = baseDraft({
        ancestry: [{ id: "anc-1", 名称: "Human 1", 种族: "Human", 简介: "People", 类别: 1, 效果: "A" } as any],
      })

      repairCardEditorDraft(input)

      expect(input.ancestry).toHaveLength(1)
    })
  })
  ```

- [ ] **Step 2: Run the new test and confirm failure**

  Run:

  ```bash
  pnpm test:run app/card-editor/services/__tests__/card-draft-repair.test.ts
  ```

  Expected: FAIL because `card-draft-repair.ts` does not exist.

- [ ] **Step 3: Implement repair service**

  Create `app/card-editor/services/card-draft-repair.ts`:

  ```ts
  import type { AncestryCard } from "@/card/ancestry-card/convert"
  import type { SubClassCard } from "@/card/subclass-card/convert"
  import type { CardPackageState } from "../types"
  import { createDefaultCard } from "../utils/card-factory"

  export type CardDraftRepair =
    | { kind: "ancestryPairCompleted"; group: string; createdCategory: 1 | 2 }
    | { kind: "subclassTripleCompleted"; group: string; level: "基石" | "专精" | "大师" }

  export interface CardDraftRepairReport {
    repairs: CardDraftRepair[]
  }

  export interface CardDraftRepairResult {
    draft: CardPackageState
    report: CardDraftRepairReport
  }

  export function repairCardEditorDraft(draft: CardPackageState): CardDraftRepairResult {
    const report: CardDraftRepairReport = { repairs: [] }
    const working: CardPackageState = {
      ...draft,
      profession: [...(draft.profession ?? [])],
      ancestry: [...(draft.ancestry ?? [])],
      community: [...(draft.community ?? [])],
      subclass: [...(draft.subclass ?? [])],
      domain: [...(draft.domain ?? [])],
      variant: [...(draft.variant ?? [])],
    }

    working.ancestry = repairAncestryPairs(working, report)
    working.subclass = repairSubclassTriples(working, report)

    return { draft: working, report }
  }

  function blankAncestry(packageData: CardPackageState, reference: AncestryCard, category: 1 | 2): AncestryCard {
    const card = createDefaultCard("ancestry", packageData) as AncestryCard
    card.种族 = reference.种族 || "新种族"
    card.简介 = reference.简介 || ""
    card.类别 = category
    card.名称 = `${reference.种族 || "新种族"}能力${category}`
    card.效果 = `${category === 1 ? "基础" : "进阶"}能力效果`
    return card
  }

  function repairAncestryPairs(packageData: CardPackageState, report: CardDraftRepairReport): AncestryCard[] {
    const groups = new Map<string, { card1?: AncestryCard; card2?: AncestryCard }>()
    for (const card of packageData.ancestry ?? []) {
      // Preserve legacy repair grouping: race + intro define one ancestry pair.
      const key = `${card.种族 ?? ""}-${card.简介 ?? ""}`
      const group = groups.get(key) ?? {}
      if (card.类别 === 1) group.card1 = card
      if (card.类别 === 2) group.card2 = card
      groups.set(key, group)
    }

    const output: AncestryCard[] = []
    for (const [groupName, group] of groups) {
      if (group.card1 && group.card2) {
        output.push(group.card1, group.card2)
        continue
      }
      if (group.card1) {
        output.push(group.card1, blankAncestry(packageData, group.card1, 2))
        report.repairs.push({ kind: "ancestryPairCompleted", group: groupName, createdCategory: 2 })
      } else if (group.card2) {
        output.push(blankAncestry(packageData, group.card2, 1), group.card2)
        report.repairs.push({ kind: "ancestryPairCompleted", group: groupName, createdCategory: 1 })
      }
    }
    return output
  }

  function blankSubclass(packageData: CardPackageState, reference: SubClassCard, level: "基石" | "专精" | "大师"): SubClassCard {
    const card = createDefaultCard("subclass", packageData) as SubClassCard
    card.子职业 = reference.子职业 || "新子职业"
    card.主职 = reference.主职 || reference.子职业 || "新主职"
    card.等级 = level
    card.名称 = `${reference.子职业 || "新子职业"}${level}`
    card.描述 = `${level}等级能力描述`
    card.施法 = reference.施法 || ""
    return card
  }

  function repairSubclassTriples(packageData: CardPackageState, report: CardDraftRepairReport): SubClassCard[] {
    const expected = ["基石", "专精", "大师"] as const
    const groups = new Map<string, { cards: Partial<Record<(typeof expected)[number], SubClassCard>>; reference: SubClassCard }>()
    for (const card of packageData.subclass ?? []) {
      const key = `${card.主职 ?? ""}/${card.子职业 ?? ""}`
      const group = groups.get(key) ?? { cards: {}, reference: card }
      if (card.等级 === "基石" || card.等级 === "专精" || card.等级 === "大师") group.cards[card.等级] = card
      groups.set(key, group)
    }

    const output: SubClassCard[] = []
    for (const [groupName, group] of groups) {
      for (const level of expected) {
        const card = group.cards[level] ?? blankSubclass(packageData, group.reference, level)
        output.push(card)
        if (!group.cards[level]) report.repairs.push({ kind: "subclassTripleCompleted", group: groupName, level })
      }
    }
    return output
  }
  ```

- [ ] **Step 4: Delegate old import repair helpers to the new service**

  Replace calls to `ensureAncestryPairs` and `ensureSubclassTriples` in import recovery paths with:

  ```ts
  const repaired = repairCardEditorDraft(recoveredDraft)
  return repaired.draft
  ```

  Keep old exported helper functions as compatibility wrappers only if existing tests or call sites still import them:

  ```ts
  export function ensureAncestryPairs(ancestryCards: AncestryCard[], packageData: CardPackageState): AncestryCard[] {
    return repairCardEditorDraft({ ...packageData, ancestry: ancestryCards }).draft.ancestry
  }
  ```

- [ ] **Step 5: Run repair and existing import/export tests**

  Run:

  ```bash
  pnpm test:run app/card-editor/services/__tests__/card-draft-repair.test.ts app/card-editor/utils/__tests__/import-export-characterization.test.ts app/card-editor/utils/__tests__/zip-import-export-characterization.test.ts
  ```

  Expected: PASS.

- [ ] **Step 6: Commit**

  ```bash
  git add app/card-editor/services/card-draft-repair.ts app/card-editor/services/__tests__/card-draft-repair.test.ts app/card-editor/utils/import-export.ts app/card-editor/utils/zip-import.ts
  git commit -m "refactor: extract card draft repair"
  ```

### Task 3: Add Card Draft Serialization and Editor Image Port

**Files:**
- Create: `app/card-editor/services/card-editor-image-service.ts`
- Create: `app/card-editor/services/card-draft-serialization.ts`
- Create: `app/card-editor/services/__tests__/card-draft-serialization.test.ts`
- Modify: `app/card-editor/utils/zip-export.ts`
- Modify: `app/card-editor/utils/import-export.ts`

- [ ] **Step 1: Add serialization tests for whitelist output and DHCB image semantics**

  Create `app/card-editor/services/__tests__/card-draft-serialization.test.ts`:

  ```ts
  import { describe, expect, it, vi } from "vitest"
  import { serializeCardDraftToLegacyJson, createLegacyDhcbView } from "../card-draft-serialization"

  const draft: any = {
    name: "Pack",
    version: "1.0.0",
    description: "Desc",
    author: "Author",
    isModified: true,
    lastSaved: new Date("2026-06-19T00:00:00.000Z"),
    unknownEditorField: "remove me",
    customFieldDefinitions: { professions: [], ancestries: [], communities: [], domains: [], variants: [] },
    profession: [{ id: "card-with-image", 名称: "Warrior", imageUrl: "https://example.test/card.png" }],
    ancestry: [],
    community: [],
    subclass: [],
    domain: [],
    variant: [{ id: "card-without-image", 名称: "Variant", imageUrl: "https://example.test/remote.png" }],
  }

  describe("card draft serialization", () => {
    it("serializes legacy JSON from a whitelist", () => {
      const serialized = serializeCardDraftToLegacyJson(draft)

      expect(serialized).not.toHaveProperty("isModified")
      expect(serialized).not.toHaveProperty("lastSaved")
      expect(serialized).not.toHaveProperty("unknownEditorField")
      expect(serialized.profession).toHaveLength(1)
    })

    it("marks packaged images and omits imageUrl only for those cards", async () => {
      const view = await createLegacyDhcbView(draft, {
        listImageKeys: vi.fn().mockResolvedValue(["card-with-image", "orphan-image"]),
        getImageBlob: vi.fn().mockResolvedValue(new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" })),
        saveImageBlob: vi.fn(),
        clearAllImages: vi.fn(),
        deleteImage: vi.fn(),
        renameImageKey: vi.fn(),
        cleanupOrphanImages: vi.fn(),
      })

      expect(view.cardsJson.profession[0]).toMatchObject({ id: "card-with-image", hasLocalImage: true })
      expect(view.cardsJson.profession[0]).not.toHaveProperty("imageUrl")
      expect(view.cardsJson.variant[0]).toMatchObject({ id: "card-without-image", imageUrl: "https://example.test/remote.png" })
      expect(view.images.map((image) => image.cardId)).toEqual(["card-with-image"])
    })
  })
  ```

- [ ] **Step 2: Run the new test and confirm failure**

  Run:

  ```bash
  pnpm test:run app/card-editor/services/__tests__/card-draft-serialization.test.ts
  ```

  Expected: FAIL because the new serializer does not exist.

- [ ] **Step 3: Implement editor image service port**

  Create `app/card-editor/services/card-editor-image-service.ts`:

  ```ts
  export interface CardEditorImageService {
    listImageKeys(): Promise<string[]>
    getImageBlob(cardId: string): Promise<Blob | null>
    saveImageBlob(cardId: string, blob: Blob): Promise<void>
    clearAllImages(): Promise<void>
    deleteImage(cardId: string): Promise<void>
    renameImageKey(oldCardId: string, newCardId: string): Promise<boolean>
    cleanupOrphanImages(validCardIds: ReadonlySet<string>): Promise<{ deleted: string[]; failed: string[] }>
  }

  export async function createBrowserCardEditorImageService(): Promise<CardEditorImageService> {
    const helpers = await import("../utils/image-db-helpers")
    return {
      listImageKeys: helpers.getAllEditorImageKeys,
      getImageBlob: helpers.getImageBlobFromDB,
      saveImageBlob: helpers.saveImageToDB,
      clearAllImages: helpers.clearAllEditorImages,
      deleteImage: helpers.deleteImageFromDB,
      renameImageKey: helpers.renameImageKey,
      async cleanupOrphanImages(validCardIds) {
        const keys = await helpers.getAllEditorImageKeys()
        const deleted: string[] = []
        const failed: string[] = []
        for (const key of keys) {
          if (validCardIds.has(key)) continue
          try {
            await helpers.deleteImageFromDB(key)
            deleted.push(key)
          } catch {
            failed.push(key)
          }
        }
        return { deleted, failed }
      },
    }
  }
  ```

- [ ] **Step 4: Implement serialization service**

  Create `app/card-editor/services/card-draft-serialization.ts` with these exports:

  ```ts
  import type { CardPackageState } from "../types"
  import type { CardEditorImageService } from "./card-editor-image-service"

  const cardTypes = ["profession", "ancestry", "community", "subclass", "domain", "variant"] as const

  export type LegacyCardDraftJson = Pick<
    CardPackageState,
    "name" | "version" | "description" | "author" | "customFieldDefinitions" | "profession" | "ancestry" | "community" | "subclass" | "domain" | "variant"
  >

  export interface LegacyDhcbImageView {
    cardId: string
    blob: Blob
  }

  export interface LegacyDhcbView {
    cardsJson: LegacyCardDraftJson
    images: LegacyDhcbImageView[]
  }

  export function collectCardDraftIds(draft: CardPackageState): Set<string> {
    const ids = new Set<string>()
    for (const type of cardTypes) {
      for (const card of (draft[type] ?? []) as Array<{ id?: string }>) {
        if (card.id) ids.add(card.id)
      }
    }
    return ids
  }

  export function serializeCardDraftToLegacyJson(draft: CardPackageState): LegacyCardDraftJson {
    return {
      name: draft.name,
      version: draft.version,
      description: draft.description,
      author: draft.author,
      customFieldDefinitions: draft.customFieldDefinitions,
      profession: [...(draft.profession ?? [])],
      ancestry: [...(draft.ancestry ?? [])],
      community: [...(draft.community ?? [])],
      subclass: [...(draft.subclass ?? [])],
      domain: [...(draft.domain ?? [])],
      variant: [...(draft.variant ?? [])],
    }
  }

  export async function createLegacyDhcbView(
    draft: CardPackageState,
    imageService: CardEditorImageService,
  ): Promise<LegacyDhcbView> {
    const validCardIds = collectCardDraftIds(draft)
    const imageKeys = (await imageService.listImageKeys()).filter((key) => validCardIds.has(key))
    const imageKeySet = new Set(imageKeys)
    const cardsJson = serializeCardDraftToLegacyJson(draft)

    for (const type of cardTypes) {
      ;(cardsJson[type] as any[]) = ((cardsJson[type] ?? []) as any[]).map((card) => {
        const hasImage = imageKeySet.has(card.id)
        return {
          ...card,
          hasLocalImage: hasImage ? true : card.hasLocalImage,
          imageUrl: hasImage ? undefined : card.imageUrl,
        }
      })
    }

    const images: LegacyDhcbImageView[] = []
    for (const cardId of imageKeys) {
      const blob = await imageService.getImageBlob(cardId)
      if (blob) images.push({ cardId, blob })
    }

    return { cardsJson, images }
  }
  ```

- [ ] **Step 5: Delegate old ZIP export to serializer**

  In `app/card-editor/utils/zip-export.ts`, replace manual card id collection and `exportData` construction with:

  ```ts
  const imageService = await createBrowserCardEditorImageService()
  const view = await createLegacyDhcbView(packageData, imageService)
  zip.file("cards.json", JSON.stringify(view.cardsJson, null, 2))
  for (const image of view.images) {
    imagesFolder.file(`${image.cardId}${getExtensionFromMimeType(image.blob.type)}`, image.blob)
  }
  ```

- [ ] **Step 6: Run focused serialization and old ZIP export tests**

  Run:

  ```bash
  pnpm test:run app/card-editor/services/__tests__/card-draft-serialization.test.ts app/card-editor/utils/__tests__/zip-import-export-characterization.test.ts
  ```

  Expected: PASS.

- [ ] **Step 7: Commit**

  ```bash
  git add app/card-editor/services/card-editor-image-service.ts app/card-editor/services/card-draft-serialization.ts app/card-editor/services/__tests__/card-draft-serialization.test.ts app/card-editor/utils/zip-export.ts app/card-editor/utils/import-export.ts
  git commit -m "refactor: add card draft serialization boundary"
  ```

### Task 4: Refactor Card Editor Draft Recovery and Image Import Reporting

**Files:**
- Create: `app/card-editor/services/card-editor-recovery.ts`
- Create: `app/card-editor/services/__tests__/card-editor-recovery.test.ts`
- Modify: `app/card-editor/utils/import-export.ts`
- Modify: `app/card-editor/utils/zip-import.ts`
- Modify: `app/card-editor/utils/__tests__/zip-import-export-characterization.test.ts`

- [ ] **Step 1: Add failing recovery tests**

  Create tests that assert:

  - JSON recovery clears editor images, runs `repairCardEditorDraft`, and returns a recovery report.
  - DHCB recovery saves only images whose ids match current draft card ids.
  - DHCB orphan images appear in `report.warnings` and are not saved.
  - Image persistence failure appears in `report.warnings` and does not block draft recovery.

  Use this assertion shape:

  ```ts
  expect(result.report.warnings).toContainEqual(
    expect.objectContaining({ kind: "orphanImageSkipped", imageId: "orphan" }),
  )
  ```

- [ ] **Step 2: Run the new tests and confirm failure**

  Run:

  ```bash
  pnpm test:run app/card-editor/services/__tests__/card-editor-recovery.test.ts
  ```

  Expected: FAIL because recovery service does not exist.

- [ ] **Step 3: Implement recovery result types**

  In `app/card-editor/services/card-editor-recovery.ts`, define:

  ```ts
  export type CardEditorRecoveryWarning =
    | { kind: "orphanImageSkipped"; imageId: string; path: string }
    | { kind: "imagePersistenceFailed"; imageId: string; path: string }

  export interface CardEditorRecoveryReport {
    repairs: CardDraftRepairReport["repairs"]
    warnings: CardEditorRecoveryWarning[]
  }

  export interface CardEditorRecoveryResult {
    draft: CardPackageState
    report: CardEditorRecoveryReport
  }
  ```

- [ ] **Step 4: Implement JSON and DHCB recovery**

  Add functions:

  ```ts
  export async function recoverCardDraftFromJsonObject(
    value: unknown,
    imageService: CardEditorImageService,
  ): Promise<CardEditorRecoveryResult>
  ```

  and:

  ```ts
  export async function recoverCardDraftFromDhcbFile(
    file: File,
    imageService: CardEditorImageService,
  ): Promise<CardEditorRecoveryResult>
  ```

  Both functions must call `repairCardEditorDraft`. DHCB recovery must call `imageService.clearAllImages()` before saving matching images. It must compute valid card ids after repair and skip image ids outside that set.

- [ ] **Step 5: Keep compatibility facades**

  Update `importCardPackage()` and `importCardPackageWithImages()` to call the new recovery functions, but keep their old return types for current UI call sites:

  ```ts
  const result = await recoverCardDraftFromDhcbFile(file, await createBrowserCardEditorImageService())
  return result.draft
  ```

  The full `{ draft, report }` will be consumed by `use-card-editor-file-actions` in a later task.

- [ ] **Step 6: Update characterization expectations**

  Change the old orphan test from “saving orphan images” to “skipping orphan images”:

  ```ts
  expect(saveImageToDB).not.toHaveBeenCalledWith("orphan", expect.any(Blob))
  ```

- [ ] **Step 7: Run focused tests**

  Run:

  ```bash
  pnpm test:run app/card-editor/services/__tests__/card-editor-recovery.test.ts app/card-editor/utils/__tests__/zip-import-export-characterization.test.ts app/card-editor/utils/__tests__/import-export-characterization.test.ts
  ```

  Expected: PASS.

- [ ] **Step 8: Commit**

  ```bash
  git add app/card-editor/services/card-editor-recovery.ts app/card-editor/services/__tests__/card-editor-recovery.test.ts app/card-editor/utils/import-export.ts app/card-editor/utils/zip-import.ts app/card-editor/utils/__tests__
  git commit -m "refactor: add card editor recovery reports"
  ```

### Task 5: Fix Equipment Dry Run Boundary

**Files:**
- Modify: `equipment/import/types.ts`
- Modify: `equipment/import/import-pipeline.ts`
- Modify: `equipment/packs/application-service.ts`
- Modify: `equipment/import/__tests__/pipeline-dry-run.test.ts`
- Modify: `equipment/packs/__tests__/application-service.test.ts`
- Modify: `app/card-editor/equipment/__tests__/equipment-validation.test.ts`

- [ ] **Step 1: Add failing application-service dry-run test**

  In `equipment/packs/__tests__/application-service.test.ts`, add:

  ```ts
  it("does not load repository snapshot in dryRun mode", async () => {
    const repository = makeRepository()
    const loadSnapshot = vi.spyOn(repository, "loadSnapshot")
    const service = createEquipmentPackApplicationService({ repository, runtimeCache: makeRuntimeCache() })

    await service.importFromSource(validEquipmentSource(), { mode: "dryRun" })

    expect(loadSnapshot).not.toHaveBeenCalled()
  })
  ```

  Use existing factory names from the test file. If names differ, reuse the local helper that currently creates a service and repository.

- [ ] **Step 2: Add failing dry-run conflict test**

  In `equipment/import/__tests__/pipeline-dry-run.test.ts`, assert that `mode: "dryRun"` does not return `ID_CONFLICT`, `PACK_LIMIT_EXCEEDED`, or `TEMPLATE_LIMIT_EXCEEDED` even when `dependencies.conflictContext` contains conflicts.

- [ ] **Step 3: Run focused equipment tests and confirm failures**

  Run:

  ```bash
  pnpm test:run equipment/import/__tests__/pipeline-dry-run.test.ts equipment/packs/__tests__/application-service.test.ts app/card-editor/equipment/__tests__/equipment-validation.test.ts
  ```

  Expected: FAIL because application service still loads snapshot for dry run and pipeline still performs conflict check.

- [ ] **Step 4: Make conflict context optional for dry run**

  In `equipment/import/types.ts`, change:

  ```ts
  export interface EquipmentPackImportDependencies {
    conflictContext?: EquipmentPackConflictContext
  }
  ```

  Rename stage union member `authoringPreprocess` to `sourceAdaptation` only if all related tests are updated in this task. If that creates excessive churn, keep the stage string for now and add a follow-up note in this plan's "Deferred" section.

- [ ] **Step 5: Skip conflict check for dry run**

  In `equipment/import/import-pipeline.ts`, replace unconditional conflict check with:

  ```ts
  const draft = buildCommitDraft(normalized.pack, source, payload)

  if (mode === "dryRun") {
    return resultFromDiagnostics({
      stage: "stageImportData",
      success: true,
      mode,
      pack: normalized.pack,
      draft,
      diagnostics: diagnosticsAfterSemantic,
    })
  }

  const conflictDiagnostics = dependencies.conflictContext
    ? checkEquipmentPackConflicts(normalized.pack, dependencies.conflictContext)
    : []
  ```

- [ ] **Step 6: Avoid repository snapshot in application dry run**

  In `equipment/packs/application-service.ts`, move `loadSnapshot()` after the dry-run branch:

  ```ts
  const pipelineResult = await importEquipmentPackFromSource(source, options, {})

  if (pipelineResult.mode === "dryRun") {
    return pipelineResult
  }

  const storageSnapshot = await input.repository.loadSnapshot()
  const commitPipelineResult = await importEquipmentPackFromSource(source, options, {
    conflictContext: buildConflictContext(storageSnapshot),
  })
  ```

  Prefer extracting a `runDryRun()` helper if re-reading the source for commit would be a problem. The final implementation must not read repository state for dry run and must not read the source twice for commit.

- [ ] **Step 7: Run focused equipment tests**

  Run:

  ```bash
  pnpm test:run equipment/import/__tests__/pipeline-dry-run.test.ts equipment/packs/__tests__/application-service.test.ts app/card-editor/equipment/__tests__/equipment-validation.test.ts
  ```

  Expected: PASS.

- [ ] **Step 8: Commit**

  ```bash
  git add equipment/import equipment/packs/application-service.ts equipment/packs/__tests__/application-service.test.ts app/card-editor/equipment/__tests__/equipment-validation.test.ts
  git commit -m "refactor: keep equipment dry run storage-free"
  ```

### Task 6: Add Card Editor Workspace Hydration Recovery

**Files:**
- Create: `app/card-editor/services/card-editor-workspace-recovery.ts`
- Create: `app/card-editor/services/__tests__/card-editor-workspace-recovery.test.ts`
- Modify: `app/card-editor/store/card-editor-store.ts`
- Modify: `app/card-editor/store/__tests__/card-editor-store-characterization.test.ts`

- [ ] **Step 1: Add failing workspace recovery service tests**

  Tests must prove:

  - legacy top-level editor-only fields such as `isModified` and `lastSaved` are silently removed from persisted workspace data
  - stale per-card `hasLocalImage` is removed when no matching image blob exists
  - `hasLocalImage: true` is set only when the editor image workspace actually returns a blob for that card id
  - remote `imageUrl` is preserved when no local image exists
  - orphan editor images are cleaned up best-effort when their ids are not present in the current draft
  - image lookup / orphan cleanup failure does not block opening the workspace and does not produce user-facing validation diagnostics
  - recovery does not run `repairCardEditorDraft`, does not auto-complete ancestry/subclass, and does not clear all editor images

- [ ] **Step 2: Implement `recoverPersistedCardEditorWorkspace`**

  Create `card-editor-workspace-recovery.ts` with a small editor-only service:

  ```ts
  export interface CardEditorWorkspaceRecoveryReport {
    staleLocalImageFlagsRemoved: string[]
    localImageFlagsConfirmed: string[]
    orphanImagesDeleted: string[]
    orphanImageCleanupFailed: string[]
    imageLookupFailed: string[]
    legacyEditorFieldsRemoved: string[]
  }

  export async function recoverPersistedCardEditorWorkspace(
    draft: CardPackageState,
    imageService: CardEditorImageService,
  ): Promise<{ draft: CardPackageState; report: CardEditorWorkspaceRecoveryReport }>
  ```

  Behavior:

  - Treat editor image storage as the source of truth for local image existence.
  - Only set or preserve `hasLocalImage: true` when `imageService.getImageBlob(cardId)` returns a blob.
  - Remove `hasLocalImage` when the blob is missing or lookup fails.
  - Preserve `imageUrl` unless a later explicit upload/export path changes it.
  - Silently drop old top-level editor-only fields from the returned draft.
  - Call `imageService.cleanupOrphanImages(validCardIds)` as best-effort maintenance; swallow failure into the report.
  - Do not call `clearAllImages()`, validation, dry run, or repair.

- [ ] **Step 3: Run the new service test and confirm failure before implementation**

  Run:

  ```bash
  pnpm test:run app/card-editor/services/__tests__/card-editor-workspace-recovery.test.ts
  ```

  Expected before implementation: FAIL because the service does not exist.

- [ ] **Step 4: Wire workspace recovery into persisted store hydration**

  In `card-editor-store.ts`, use the Zustand persist hydration hook or an equivalent one-shot startup path to run `recoverPersistedCardEditorWorkspace()` after `card-editor-storage` is loaded.

  Requirements:

  - This path only applies to persisted editor workspace data, not JSON/DHCB import.
  - It should update `packageData` with the recovered draft when recovery completes.
  - It should not show toast, dialog, or validation results.
  - It should not prevent the editor from rendering if recovery fails; log only if needed.
  - It should use `createBrowserCardEditorImageService()` rather than importing `image-db-helpers` directly.

- [ ] **Step 5: Add store characterization coverage for persisted workspace hydration**

  Add or update store tests so a persisted package with stale `hasLocalImage: true` rehydrates into a package whose UI-facing draft no longer claims the image exists when the image service cannot provide a blob.

  If Zustand hydration timing makes the store test brittle, keep the store assertion narrow and rely on the service test for detailed semantics.

- [ ] **Step 6: Run focused tests**

  Run:

  ```bash
  pnpm test:run app/card-editor/services/__tests__/card-editor-workspace-recovery.test.ts app/card-editor/store/__tests__/card-editor-store-characterization.test.ts
  ```

  Expected: PASS.

- [ ] **Step 7: Commit**

  ```bash
  git add app/card-editor/services/card-editor-workspace-recovery.ts app/card-editor/services/__tests__/card-editor-workspace-recovery.test.ts app/card-editor/store/card-editor-store.ts app/card-editor/store/__tests__/card-editor-store-characterization.test.ts
  git commit -m "fix: reconcile card editor workspace images on load"
  ```

### Task 7: Introduce Shared Editor Validation View Model

**Files:**
- Create: `app/card-editor/services/editor-validation-view-model.ts`
- Create: `app/card-editor/services/diagnostic-source-map.ts`
- Create: `app/card-editor/services/__tests__/editor-validation-view-model.test.ts`
- Modify: `app/card-editor/equipment/equipment-validation.ts`

- [ ] **Step 1: Add view model tests**

  Create tests asserting:

  - no diagnostics -> `status: "passed"` and no groups
  - warning diagnostics only -> `status: "passedWithWarnings"` and diagnostics are shown
  - any error -> `status: "failed"`
  - jump target comes from projection, not UI path parsing

- [ ] **Step 2: Implement shared types and builder**

  Create `editor-validation-view-model.ts`:

  ```ts
  export type EditorValidationStatus = "passed" | "passedWithWarnings" | "failed"

  export interface EditorValidationDiagnosticView<TJumpTarget = unknown> {
    severity: "error" | "warning"
    source: "import" | "authoring"
    title: string
    description: string
    suggestion: string
    fieldLabel?: string
    authorPath?: string
    locationLabel?: string
    groupType: string
    specificGroup: string
    jumpTarget?: TJumpTarget
    technical?: {
      code?: string
      internalPath?: string
      value?: unknown
    }
  }

  export interface EditorValidationViewModel<TJumpTarget = unknown> {
    status: EditorValidationStatus
    title: string
    description: string
    summary: {
      errorCount: number
      warningCount: number
      checkedItemCount: number
    }
    diagnostics: EditorValidationDiagnosticView<TJumpTarget>[]
    groups: {
      critical: EditorValidationDiagnosticView<TJumpTarget>[]
      warnings: EditorValidationDiagnosticView<TJumpTarget>[]
      bySpecificGroup: Record<string, EditorValidationDiagnosticView<TJumpTarget>[]>
      byGroupType: Record<string, EditorValidationDiagnosticView<TJumpTarget>[]>
    }
  }
  ```

  Add `createEditorValidationViewModel(input)` that computes status from diagnostic severities.

- [ ] **Step 3: Add minimal diagnostic source map types**

  Create `diagnostic-source-map.ts`:

  ```ts
  export interface DiagnosticSourceMapEntry<TJumpTarget = unknown> {
    internalPath: string
    authorPath: string
    fieldLabel?: string
    locationLabel?: string
    jumpTarget?: TJumpTarget
  }

  export interface DiagnosticSourceMap<TJumpTarget = unknown> {
    lookup(internalPath: string): DiagnosticSourceMapEntry<TJumpTarget> | undefined
  }

  export function createIdentityDiagnosticSourceMap<TJumpTarget>(
    resolve?: (path: string) => Omit<DiagnosticSourceMapEntry<TJumpTarget>, "internalPath" | "authorPath"> | undefined,
  ): DiagnosticSourceMap<TJumpTarget> {
    return {
      lookup(internalPath) {
        return { internalPath, authorPath: internalPath, ...resolve?.(internalPath) }
      },
    }
  }
  ```

- [ ] **Step 4: Project equipment validation to shared view model**

  Add:

  ```ts
  export function createEquipmentEditorValidationViewModel(
    result: EquipmentPackApplicationImportResult,
  ): EditorValidationViewModel<EquipmentValidationJumpTarget>
  ```

  This should call existing `mapEquipmentDiagnosticsToFriendly()` and preserve jump targets.

- [ ] **Step 5: Run focused tests**

  Run:

  ```bash
  pnpm test:run app/card-editor/services/__tests__/editor-validation-view-model.test.ts app/card-editor/equipment/__tests__/equipment-validation.test.ts app/card-editor/equipment/components/__tests__/equipment-validation-results.test.tsx
  ```

  Expected: PASS.

- [ ] **Step 6: Commit**

  ```bash
  git add app/card-editor/services/editor-validation-view-model.ts app/card-editor/services/diagnostic-source-map.ts app/card-editor/services/__tests__/editor-validation-view-model.test.ts app/card-editor/equipment/equipment-validation.ts app/card-editor/equipment/__tests__ app/card-editor/equipment/components/__tests__
  git commit -m "feat: add shared editor validation view model"
  ```

### Task 8: Add Card Editor Validation Orchestration and Remove Old Validator

**Files:**
- Create: `app/card-editor/services/card-editor-validation.ts`
- Create: `app/card-editor/services/__tests__/card-editor-validation.test.ts`
- Modify: `app/card-editor/store/card-editor-store.ts`
- Delete: `app/card-editor/services/validation-service.ts`
- Delete: `app/card-editor/services/error-message-mapper.ts`
- Modify: `app/card-editor/store/__tests__/card-editor-store-characterization.test.ts`

- [ ] **Step 1: Add failing card validation orchestration tests**

  Tests must prove:

  - validation serializes the draft to the default legacy DHCB view source without generating a ZIP blob
  - formal Dry Run diagnostics appear with `source: "import"`
  - Editor-Owned Authoring Checks diagnostics appear with `source: "authoring"`
  - success is false when only Editor-Local diagnostics contain errors
  - no old `validateField()` path is required

- [ ] **Step 2: Implement `validateCardEditorDraft`**

  Create `card-editor-validation.ts` with:

  ```ts
  export interface CardEditorValidationServices {
    imageService: CardEditorImageService
    importFromSource: typeof importCardPackFromSource
  }

  export async function validateCardEditorDraft(
    draft: CardPackageState,
    services: CardEditorValidationServices,
  ): Promise<EditorValidationViewModel<CardValidationJumpTarget>> {
    const dhcbView = await createLegacyDhcbView(draft, services.imageService)
    const dryRunResult = await services.importFromSource(createCardEditorDhcbViewSource(dhcbView), { mode: "dryRun" })
    const authoringDiagnostics = createEditorLocalCardAuthoringDiagnostics(draft)
    return projectCardEditorValidationResult(dryRunResult, authoringDiagnostics)
  }
  ```

  Implement `createCardEditorDhcbViewSource()` as a parsed-object or internal source compatible with current card import pipeline. Do not create a ZIP `Blob`.

- [ ] **Step 3: Remove old validator imports from store**

  In `card-editor-store.ts`, remove:

  ```ts
  import { validationService } from "../services/validation-service"
  ```

  Remove or replace the `validateField` action. If UI call sites still call `validateField`, replace them with no call and add a compile-safe store type change.

- [ ] **Step 4: Delete old validation files**

  Delete:

  ```text
  app/card-editor/services/validation-service.ts
  app/card-editor/services/error-message-mapper.ts
  ```

- [ ] **Step 5: Run focused tests**

  Run:

  ```bash
  pnpm test:run app/card-editor/services/__tests__/card-editor-validation.test.ts app/card-editor/services/__tests__/editor-authoring-diagnostics.test.ts app/card-editor/store/__tests__/card-editor-store-characterization.test.ts
  ```

  Expected: PASS.

- [ ] **Step 6: Type-check by running the broader test suite slice**

  Run:

  ```bash
  pnpm test:run app/card-editor card/import card/packs
  ```

  Expected: PASS.

- [ ] **Step 7: Commit**

  ```bash
  git add app/card-editor/services app/card-editor/store app/card-editor/store/__tests__
  git add -u app/card-editor/services/validation-service.ts app/card-editor/services/error-message-mapper.ts
  git commit -m "refactor: replace card editor validation service"
  ```

### Task 9: Replace Card and Equipment Validation Dialogs With Shared Component

**Files:**
- Create: `app/card-editor/components/editor-validation-results.tsx`
- Create: `app/card-editor/components/__tests__/editor-validation-results.test.tsx`
- Modify: `app/card-editor/components/validation-results.tsx`
- Modify: `app/card-editor/equipment/components/equipment-validation-results.tsx`
- Modify: `app/card-editor/equipment/components/__tests__/equipment-validation-results.test.tsx`

- [ ] **Step 1: Add shared component tests**

  Tests must assert:

  - `status: "passed"` renders a standalone success screen and no empty tabs
  - `status: "passedWithWarnings"` renders diagnostic groups
  - `status: "failed"` renders diagnostic groups and jump buttons
  - click on jump button calls `onJumpToTarget` with the view model target

- [ ] **Step 2: Implement shared component**

  The component takes:

  ```ts
  interface EditorValidationResultsProps<TJumpTarget> {
    viewModel: EditorValidationViewModel<TJumpTarget> | null
    open: boolean
    onClose(): void
    onJumpToTarget?(target: TJumpTarget): void
  }
  ```

  Use the existing card validation dialog visual structure and information hierarchy as the baseline. Card and equipment validation dialogs must share the same design language, component structure, visual hierarchy, status presentation, and interaction model. Equipment should be adapted to the shared component and moved toward the current card validation UI; do not keep two different dialog styles. “Not pixel-level identical” only permits content-driven layout differences, not different colors, component styling, status treatments, or information architecture. Copy must follow phase 2 decisions:

  - passed: “草稿完全符合当前检查要求，可以导出发布文件。”
  - passedWithWarnings: “草稿可以导出发布文件，但有建议处理的问题。”
  - failed: “导出发布前应修复这些草稿问题。”

- [ ] **Step 3: Wrap card validation UI**

  Change `validation-results.tsx` to either:

  - export `EditorValidationResults` directly, or
  - adapt legacy props to the shared view model until page/store call sites are updated.

  Do not import `validation-service.ts` or `error-message-mapper.ts`.

- [ ] **Step 4: Wrap equipment validation UI**

  Replace the body of `equipment-validation-results.tsx` with a projection call plus shared component:

  ```tsx
  const viewModel = validationResult ? createEquipmentEditorValidationViewModel(validationResult) : null
  return <EditorValidationResults viewModel={viewModel} open={open} onClose={onClose} onJumpToTarget={onJumpToTarget} />
  ```

- [ ] **Step 5: Run UI tests**

  Run:

  ```bash
  pnpm test:run app/card-editor/components/__tests__/editor-validation-results.test.tsx app/card-editor/equipment/components/__tests__/equipment-validation-results.test.tsx app/card-editor/__tests__/equipment-editor-page.test.tsx
  ```

  Expected: PASS.

- [ ] **Step 6: Commit**

  ```bash
  git add app/card-editor/components app/card-editor/equipment/components app/card-editor/__tests__
  git commit -m "refactor: unify editor validation results UI"
  ```

### Task 10: Move Editor File Actions and New Side Effects Out of Store

**Files:**
- Create: `app/card-editor/hooks/use-card-editor-file-actions.ts`
- Create: `app/card-editor/hooks/__tests__/use-card-editor-file-actions.test.tsx`
- Modify: `app/card-editor/page.tsx`
- Modify: `app/card-editor/store/card-editor-store.ts`
- Modify: `app/card-editor/store/__tests__/card-editor-store-characterization.test.ts`

- [ ] **Step 1: Add hook tests**

  Mock:

  - `recoverCardDraftFromJsonObject`
  - `recoverCardDraftFromDhcbFile`
  - `createBrowserCardEditorImageService`
  - `validateCardEditorDraft`
  - toast functions

  Assert that import recovery report warnings are surfaced once after import and are not sent to validation.

- [ ] **Step 2: Implement hook**

  `use-card-editor-file-actions.ts` should expose:

  ```ts
  export interface CardEditorFileActions {
    importDraftFromFile(file: File): Promise<void>
    exportDraftAsJson(): Promise<void>
    exportDraftAsDhcb(): Promise<void>
    validateDraft(): Promise<void>
  }
  ```

  The hook receives current draft and store mutation callbacks from `page.tsx`. It owns file/download/toast orchestration and calls services.

- [ ] **Step 3: Use hook in page**

  Move file input handling, download, and validation trigger code out of store paths used by toolbar buttons. Keep store as draft state and selection state owner.

- [ ] **Step 4: Remove new-path direct image helper imports from store**

  Existing simple mutation image cleanup can remain if not touched, but import/export/validation paths must not dynamically import image helpers from `card-editor-store.ts`.

- [ ] **Step 5: Run page/store tests**

  Run:

  ```bash
  pnpm test:run app/card-editor/hooks/__tests__/use-card-editor-file-actions.test.tsx app/card-editor/store/__tests__/card-editor-store-characterization.test.ts app/card-editor/__tests__/equipment-editor-page.test.tsx
  ```

  Expected: PASS.

- [ ] **Step 6: Commit**

  ```bash
  git add app/card-editor/hooks app/card-editor/page.tsx app/card-editor/store app/card-editor/store/__tests__
  git commit -m "refactor: move editor file side effects to hook"
  ```

### Task 11: Final Compatibility Sweep

**Files:**
- Modify only files required by failing tests.
- Update docs only if implementation discovers a behavior gap in the phase 2 decision document.

- [ ] **Step 1: Run targeted editor/import suite**

  Run:

  ```bash
  pnpm test:run app/card-editor card/import card/packs equipment/import equipment/packs
  ```

  Expected: PASS.

- [ ] **Step 2: Run full test suite**

  Run:

  ```bash
  pnpm test:run
  ```

  Expected: PASS.

- [ ] **Step 3: Search for deleted/forbidden paths**

  Run:

  ```bash
  rg "validation-service|error-message-mapper|validateField|isModified|lastSaved|authoringPreprocess" app/card-editor card equipment
  ```

  Expected:

  - no references to deleted card editor validation service files
  - no `CardPackageState` dependence on `isModified` or `lastSaved`
  - `authoringPreprocess` only remains if Task 5 explicitly deferred stage-string migration

- [ ] **Step 4: Run docs marker scan**

  Run:

  ```bash
  rg "状态：草案|决策状态：部分" docs/superpowers/specs/2026-06-20-content-pack-editor-phase-2-behavior-decisions.md docs/contexts/content-pack-import/CONTEXT.md
  ```

  Expected: no output.

- [ ] **Step 5: Commit final fixes**

  ```bash
  git add .
  git commit -m "test: verify content pack editor phase 2 refactor"
  ```

## Deferred Unless Tests Force It

- Full replacement of the current card editor store. This plan only moves new validation/serialization/import-export side effects out of the store authority path.
- Shared metadata model for card/equipment drafts.
- Public card schema as the editor default export format.
- Equipment diagnostic stage string migration from `authoringPreprocess` to `sourceAdaptation`. The domain term is **Source Adaptation**, but the current equipment import pipeline still serializes the legacy `authoringPreprocess` stage for existing tests and diagnostic compatibility. Do not add new behavior under the old name; migrate the string in a dedicated compatibility change if needed.
- Field-level live validation. Old `validateField()` should be deleted; any future field-level UX must be based on the new validation model.
- Pixel-level redesign of the validation dialog.

## Self-Review

- Spec coverage: Tasks map to all phase 2 decisions: repair, serialization, validation semantics, dry-run boundary, validation UI, diagnostics/source-map foundation, editor-only fields, image lifecycle, metadata copy preservation, and side-effect boundaries.
- Placeholder scan: no task relies on vague future-work wording as an implementation step; deferred items are explicitly outside this phase.
- Type consistency: shared validation types are introduced before card/equipment projection and before UI integration.
