# Card Import Business Equivalence Tests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace real-card-pack raw storage byte comparison with business-equivalence regression tests, while preserving raw diff reports for manual architecture review.

**Architecture:** Keep the real import path unchanged: fixtures still import through the current `CardPackApplicationService` commit path into in-memory storage and image backends. Tests compare old baseline snapshots and current actual snapshots through explicit projection functions: Layer 1 checks storage business facts, Layer 2 checks store/runtime read-model facts. Raw storage shape drift is reported but is not a failure unless it changes business-facing facts.

**Tech Stack:** Vitest, TypeScript, Node `fs/promises`, existing card-pack storage/image adapters, `useUnifiedCardStore`, existing `.local-fixtures/card-packs/{inputs,expected,actual}` convention.

---

## File Structure

- Create `tests/local-fixtures/card-import-equivalence.ts`
  - Owns business snapshot projection, equivalence comparison, raw diff reporting, and runtime/store snapshot helpers.
  - This file is test infrastructure only. It must not be imported by production code.
- Create `tests/local-fixtures/__tests__/card-import-equivalence.test.ts`
  - Unit-tests the comparator itself so future changes do not silently weaken the regression gate.
- Modify `tests/local-fixtures/card-import-local-fixtures.test.ts`
  - Keep the existing fixture discovery and current import path.
  - Replace `expected.trimEnd() === actual.trimEnd()` with Layer 1 and Layer 2 business-equivalence assertions.
  - Continue writing raw actual snapshots.
  - Write non-blocking raw diff reports under `.local-fixtures/card-packs/actual/*.diff.json`.
- Modify `package.json`
  - Keep `test:card-import:local-fixtures` pointing at the local fixture runner.
  - Add the comparator unit test to `test:card-import`.
- Optional modify `docs/superpowers/specs/2026-06-18-card-import-business-equivalence-test-scope.md`
  - Only if implementation discovers a sharper boundary worth recording.

## Ground Rules

- Do not change production import behavior in this plan.
- Do not update expected snapshots while implementing this plan.
- Do not make raw storage byte-level equality a gate.
- Do fail when business-facing facts differ.
- Do fail if `variantTypes` key sets differ. `variantTypes.description` remains report-only for now.
- Do fail if current runtime/helper outputs derived from `variantTypes.subclasses` or `variantTypes.levelRange` differ.
- Do fail if runtime indexes differ after loading expected and actual snapshots through the same store boundary.
- Do not attempt to rehydrate old expected image blobs in Layer 2. Expected snapshots store image hashes, not original blobs. Image content equivalence is proven in Layer 1 by comparing `cardId -> { sha256, byteLength }`; expected-vs-actual legacy MIME drift is report-only, while every actual image MIME must be non-empty and start with `image/`.
- Do not fold the Dexie-backed UI image URL path into this plan. This plan proves pack-scoped image backend readability; `getCardImageUrlAsync()` belongs in a later IndexedDB/UI smoke because it uses store imageService rather than the in-memory fixture backend.

## Business Facts To Gate

Layer 1, storage commit equivalence, must fail on:

- pack id set mismatch;
- disabled state mismatch;
- card id order mismatch;
- card count mismatch;
- card type distribution mismatch;
- per-card canonical payload mismatch:
  - compare the full stored card object;
  - ignore only approved compatibility noise: card-level `batchName` when the missing/extra value can be derived from the owning batch name, and empty string fields under `cardSelectDisplay`;
  - keep business/display/runtime fields such as `hint`, `imageUrl`, `headerDisplay`, `cardSelectDisplay` non-empty values, `professionSpecial`, `subclassSpecial`, `domainSpecial`, `variantSpecial`, and any other stored card fields;
- `variantTypes` key set mismatch;
- stored `metadata.imageCardIds` / `metadata.imageCount` mismatch when either side has real images; no-image forms `undefined`, `[]`, and `0` normalize to equivalent;
- stored `metadata.imageCardIds` / `metadata.imageCount` inconsistent with the image backend snapshot, using set equality for image card ids plus image count;
- image content mismatch by `cardId -> { sha256, byteLength }`;
- actual image `mimeType` missing or not starting with `image/`.

Layer 1 must report but not fail on:

- `index.size`;
- `index.batches[packId].version`;
- `index.batches[packId].author`;
- `batch.metadata.description`;
- `batch.metadata.totalImageSize`;
- raw card `batchName` only when missing/extra value can be derived from the owning batch name;
- image card id order;
- expected-vs-actual legacy image `mimeType` drift when image content and actual MIME validity are intact;
- empty display-only strings such as `cardSelectDisplay.item4: ""`;
- raw `customFieldDefinitions.variants`, but runtime `getVariantTypes()` and selector/helper outputs remain gated;
- raw `variantTypes.description`, but runtime `getVariantTypes()` remains gated;
- raw `variantTypes.levelRange`, but runtime `getVariantTypes()` and `getVariantLevelOptions()` remain gated;
- raw `variantTypes.subclasses`, but runtime `getVariantTypes()`, `getVariantSubclasses()`, and `getVariantSubclassOptions()` remain gated.

`variantTypes.levelRange` and `variantTypes.subclasses` are report-only only at raw storage level. Their runtime/helper effects are gates in Layer 2 through `getVariantLevelOptions()`, `getVariantSubclassOptions()`, and related helper outputs.

Layer 2, runtime read-model equivalence, must fail on:

- runtime card id order mismatch;
- `cardsByType` mismatch;
- `aggregatedVariantTypes` key set mismatch;
- public façade output mismatch:
  - `getStandardCardsByType(type)` id order;
  - `getStandardCardById(id)` visibility;
  - `getCustomCards()` id order;
  - `getCustomCardsByType(type)` id order;
  - `getCardsByBatchId(packId)` id order;
  - `getCustomCardBatches()` business fields and pack order;
  - `getAllBatches()` business fields and pack order;
  - runtime card `batchName` derived by public card APIs;
- variant helper output mismatch:
  - `getVariantTypeNames()`;
  - `getAvailableVariantTypes()`;
  - `getVariantSubclassOptions(type)`;
  - `getVariantSubclasses(type)`;
- standard card class helper output mismatch:
  - `getCardClassOptionsForType(type)`;
  - `getProfessionCardNames()`;
  - `getAncestryCardNames()`;
  - `getCommunityCardNames()`;
  - `getSubClassCardNames()`;
  - `getDomainCardNames()`;
- `subclassCardIndex` set mismatch;
- `levelCardIndex` set mismatch;
- `batchKeywordIndex` set mismatch;
- `batchLevelIndex` set mismatch;
- disabled pack visibility mismatch: when a pack is disabled, runtime card APIs, aggregations, and indexes must hide its cards;
- variant card runtime facts mismatch:
  - `id`
  - `level`
  - `variantSpecial.realType`
  - `variantSpecial.subCategory`
  - `hasLocalImage`.

Layer 2 must not require legacy expected snapshots and current actual snapshots to have byte-identical derived definition metadata. The legacy baseline preserved several old fallback behaviors that the current import pipeline intentionally replaces with facts derived from actual cards:

- `aggregatedCustomFields` is checked by derived consistency, not exact equality with the legacy baseline:
  - actual definitions must cover every runtime-visible profession/domain/subclass/ancestry/community class exposed by `subclassCardIndex`;
  - public predefined helper output must also cover those runtime-visible classes;
  - extra actual definitions are allowed when they are derived from real cards.
- `variantOptions.fullTypes` and `getVariantLevelOptions(type)` are checked by derived consistency, not exact equality with legacy fallback `levelRange`:
  - actual variant type keys, `getVariantTypeNames()`, and `getAvailableVariantTypes()` must cover every runtime-visible variant type;
  - actual `getVariantSubclasses(type)` and `getVariantSubclassOptions(type)` must cover every runtime-visible variant subclass;
  - actual `levelCardIndex` must cover every runtime-visible variant card with a valid level;
  - if `getVariantLevelOptions(type)` is non-empty, it must include every runtime-visible level for that variant type;
  - if a variant type has no valid runtime-visible card levels, empty level options are allowed.

## Task 1: Comparator Unit Tests

**Files:**
- Create: `tests/local-fixtures/__tests__/card-import-equivalence.test.ts`
- Create: `tests/local-fixtures/card-import-equivalence.ts`

- [ ] **Step 1: Write failing comparator tests**

Create `tests/local-fixtures/__tests__/card-import-equivalence.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import type { CardImportStorageSnapshot } from "../../helpers/card-import-storage-snapshot"
import {
  buildRawStorageDiffReport,
  compareStorageBusinessSnapshots,
  projectStorageBusinessSnapshot,
} from "../card-import-equivalence"

function snapshot(overrides: Partial<CardImportStorageSnapshot> = {}): CardImportStorageSnapshot {
  const base: CardImportStorageSnapshot = {
    index: {
      batches: {
        pack_a: {
          id: "pack_a",
          name: "Pack A",
          fileName: "pack.json",
          importTime: "2026-06-18T00:00:00.000Z",
          cardCount: 2,
          cardTypes: ["domain", "variant"],
          size: 123,
          disabled: false,
        },
      },
      totalCards: 2,
      totalBatches: 1,
      lastUpdate: "2026-06-18T00:00:00.000Z",
    },
    batches: {
      pack_a: {
        metadata: {
          id: "pack_a",
          name: "Pack A",
          fileName: "pack.json",
          importTime: "2026-06-18T00:00:00.000Z",
        },
        cards: [
          {
            id: "domain-card",
            name: "Domain Card",
            type: "domain",
            description: "Rules text",
            class: "Blade",
            level: 1,
            hint: "Spend a Hope.",
            headerDisplay: {
              item1: "Blade",
            },
            professionSpecial: {
              evasion: 10,
              hitPoints: 6,
              items: ["Rope"],
              hopeFeature: "Use courage.",
            },
            hasLocalImage: false,
            batchId: "pack_a",
            source: "custom",
          },
          {
            id: "variant-card",
            name: "Variant Card",
            type: "variant",
            description: "Variant rules",
            class: "ignored by variants",
            level: 2,
            hasLocalImage: true,
            batchId: "pack_a",
            source: "custom",
            variantSpecial: {
              realType: "Weapon",
              subCategory: "Sword",
            },
            cardSelectDisplay: {
              item1: "Weapon",
              item4: "",
            },
          },
        ],
        customFieldDefinitions: {
          domains: ["Blade"],
        },
        variantTypes: {
          Weapon: {
            description: "Old description",
            subclasses: ["Sword"],
            levelRange: [1, 4],
          },
        },
      },
    },
    images: {
      pack_a: {
        cardIds: ["variant-card"],
        items: [
          {
            cardId: "variant-card",
            mimeType: "image/png",
            byteLength: 10,
            sha256: "a".repeat(64),
          },
        ],
      },
    },
  }

  return {
    ...base,
    ...overrides,
    index: overrides.index ?? base.index,
    batches: overrides.batches ?? base.batches,
    images: overrides.images ?? base.images,
  }
}

describe("card import business equivalence", () => {
  it("treats known raw metadata drift as report-only", () => {
    const expected = snapshot()
    const actual = snapshot({
      index: {
        batches: {
          pack_a: {
            id: "pack_a",
            name: "Pack A",
            fileName: "pack.json",
            importTime: "2026-06-18T00:00:00.000Z",
            cardCount: 2,
            cardTypes: ["domain", "variant"],
            size: 999,
            version: "1.0.0",
            author: "Author",
            disabled: false,
          },
        },
        totalCards: 2,
        totalBatches: 1,
        lastUpdate: "2026-06-18T00:00:00.000Z",
      },
      batches: {
        pack_a: {
          ...snapshot().batches.pack_a,
          metadata: {
            id: "pack_a",
            name: "Pack A",
            fileName: "pack.json",
            importTime: "2026-06-18T00:00:00.000Z",
            description: "New metadata",
            totalImageSize: 0,
          },
          cards: [
            snapshot().batches.pack_a.cards[0],
            {
              ...(snapshot().batches.pack_a.cards[1] as Record<string, unknown>),
              batchName: "Pack A",
              cardSelectDisplay: {
                item1: "Weapon",
                item4: "",
              },
            },
          ],
          customFieldDefinitions: {
            domains: ["Blade"],
            variants: ["Weapon"],
          },
          variantTypes: {
            Weapon: {
              description: "New description",
              subclasses: ["Blade"],
              levelRange: [1, 10],
            },
          },
        },
      },
    })

    expect(compareStorageBusinessSnapshots(expected, actual)).toEqual([])
    expect(buildRawStorageDiffReport(expected, actual).differences.length).toBeGreaterThan(0)
  })

  it("fails when card business facts differ", () => {
    const expected = snapshot()
    const actual = snapshot({
      batches: {
        pack_a: {
          ...snapshot().batches.pack_a,
          cards: [
            snapshot().batches.pack_a.cards[0],
            {
              ...(snapshot().batches.pack_a.cards[1] as Record<string, unknown>),
              variantSpecial: {
                realType: "Armor",
                subCategory: "Shield",
              },
            },
          ],
        },
      },
    })

    expect(compareStorageBusinessSnapshots(expected, actual)).toContain(
      "pack_a/card/variant-card: variantSpecial mismatch",
    )
  })

  it("fails when variant type key sets differ", () => {
    const expected = snapshot()
    const actual = snapshot({
      batches: {
        pack_a: {
          ...snapshot().batches.pack_a,
          variantTypes: {
            Armor: {
              description: "Different type",
            },
          },
        },
      },
    })

    expect(compareStorageBusinessSnapshots(expected, actual)).toContain(
      "pack_a: variantTypes key set mismatch",
    )
  })

  it("fails when card order differs", () => {
    const expected = snapshot()
    const actual = snapshot({
      batches: {
        pack_a: {
          ...snapshot().batches.pack_a,
          cards: [...snapshot().batches.pack_a.cards].reverse(),
        },
      },
    })

    expect(compareStorageBusinessSnapshots(expected, actual)).toContain("pack_a: card id order mismatch")
  })

  it("fails when image content hash differs", () => {
    const expected = snapshot()
    const actual = snapshot({
      images: {
        pack_a: {
          cardIds: ["variant-card"],
          items: [
            {
              cardId: "variant-card",
              mimeType: "image/png",
              byteLength: 10,
              sha256: "b".repeat(64),
            },
          ],
        },
      },
    })

    expect(compareStorageBusinessSnapshots(expected, actual)).toContain("pack_a: images mismatch")
  })

  it("keeps non-empty cardSelectDisplay values as business facts", () => {
    const expected = snapshot()
    const actual = snapshot({
      batches: {
        pack_a: {
          ...snapshot().batches.pack_a,
          cards: [
            snapshot().batches.pack_a.cards[0],
            {
              ...(snapshot().batches.pack_a.cards[1] as Record<string, unknown>),
              cardSelectDisplay: {
                item1: "Weapon",
                item4: "Visible Badge",
              },
            },
          ],
        },
      },
    })

    expect(compareStorageBusinessSnapshots(expected, actual)).toContain("pack_a/card/variant-card: card mismatch")
  })

  it("fails when image metadata claims images not present in the image snapshot", () => {
    const expected = snapshot()
    const actual = snapshot({
      batches: {
        pack_a: {
          ...snapshot().batches.pack_a,
          metadata: {
            id: "pack_a",
            name: "Pack A",
            fileName: "pack.json",
            importTime: "2026-06-18T00:00:00.000Z",
            imageCardIds: ["missing-card"],
            imageCount: 1,
          },
        },
      },
    })

    expect(compareStorageBusinessSnapshots(expected, actual)).toContain(
      "pack_a: metadata imageCardIds match image backend mismatch",
    )
  })

  it("projects a stable storage business snapshot", () => {
    expect(projectStorageBusinessSnapshot(snapshot())).toEqual({
      packs: [
        {
          id: "pack_a",
          disabled: false,
          indexCardCount: 2,
          actualCardCount: 2,
          cardIds: ["domain-card", "variant-card"],
          imageMetadata: {
            imageCardIds: [],
            imageCount: null,
          },
          cardTypes: {
            domain: 1,
            variant: 1,
          },
          cards: [
            {
              id: "domain-card",
              name: "Domain Card",
              type: "domain",
              description: "Rules text",
              class: "Blade",
              level: 1,
              hint: "Spend a Hope.",
              headerDisplay: {
                item1: "Blade",
              },
              professionSpecial: {
                evasion: 10,
                hitPoints: 6,
                items: ["Rope"],
                hopeFeature: "Use courage.",
              },
              hasLocalImage: false,
              batchId: "pack_a",
              source: "custom",
            },
            {
              id: "variant-card",
              name: "Variant Card",
              type: "variant",
              description: "Variant rules",
              class: "ignored by variants",
              level: 2,
              hasLocalImage: true,
              batchId: "pack_a",
              source: "custom",
              variantSpecial: {
                realType: "Weapon",
                subCategory: "Sword",
              },
            },
          ],
          variantTypeKeys: ["Weapon"],
          imageCardIds: ["variant-card"],
          images: [
            {
              cardId: "variant-card",
              mimeType: "image/png",
              byteLength: 10,
              sha256: "a".repeat(64),
            },
          ],
        },
      ],
    })
  })
})
```

- [ ] **Step 2: Run comparator tests and confirm they fail**

Run:

```bash
npx vitest run tests/local-fixtures/__tests__/card-import-equivalence.test.ts
```

Expected: fail because `tests/local-fixtures/card-import-equivalence.ts` does not exist.

- [ ] **Step 3: Commit failing tests**

```bash
git add tests/local-fixtures/__tests__/card-import-equivalence.test.ts
git commit -m "test: specify card import business equivalence"
```

## Task 2: Storage Business Equivalence Helper

**Files:**
- Create: `tests/local-fixtures/card-import-equivalence.ts`
- Test: `tests/local-fixtures/__tests__/card-import-equivalence.test.ts`

- [ ] **Step 1: Implement storage projection and raw diff report**

Create `tests/local-fixtures/card-import-equivalence.ts`:

```ts
import type { CardPackImageBackend } from "@/card/packs/image-backend"
import type { CardImportStorageSnapshot } from "../helpers/card-import-storage-snapshot"

type JsonRecord = Record<string, unknown>

export interface StorageBusinessSnapshot {
  packs: Array<{
    id: string
    disabled: boolean
    indexCardCount: number | null
    actualCardCount: number
    cardIds: string[]
    imageMetadata: {
      imageCardIds: string[]
      imageCount: number | null
    }
    cardTypes: Record<string, number>
    cards: StorageBusinessCard[]
    variantTypeKeys: string[]
    imageCardIds: string[]
    images: Array<{
      cardId: string
      mimeType: string
      byteLength: number
      sha256: string
    }>
  }>
}

export type StorageBusinessCard = Record<string, unknown>

export interface RawStorageDiffReport {
  differences: Array<{
    path: string
    expected: unknown
    actual: unknown
  }>
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function readRecord(value: unknown): JsonRecord {
  return isRecord(value) ? value : {}
}

function readArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function sortedKeys(value: unknown): string[] {
  return Object.keys(readRecord(value)).sort()
}

function readIndexBatches(snapshot: CardImportStorageSnapshot): Record<string, JsonRecord> {
  const index = readRecord(snapshot.index)
  const batches = readRecord(index.batches)
  return Object.fromEntries(Object.entries(batches).map(([id, value]) => [id, readRecord(value)]))
}

function countTypes(cards: StorageBusinessCard[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const card of cards) {
    const type = String(card.type ?? "")
    counts[type] = (counts[type] ?? 0) + 1
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)))
}

function normalizeCardValue(value: unknown, path: string[] = []): unknown {
  if (Array.isArray(value)) return value.map((item, index) => normalizeCardValue(item, [...path, String(index)]))
  if (!isRecord(value)) return value

  const result: JsonRecord = {}
  for (const [key, child] of Object.entries(value).sort(([left], [right]) => left.localeCompare(right))) {
    if (path.length === 0 && key === "batchName") continue
    if (path.join(".") === "cardSelectDisplay" && child === "") continue
    result[key] = normalizeCardValue(child, [...path, key])
  }
  return result
}

function projectCard(value: unknown): StorageBusinessCard {
  return normalizeCardValue(readRecord(value)) as StorageBusinessCard
}

function readMetadataImageInfo(metadata: unknown): { imageCardIds: string[]; imageCount: number | null } {
  const record = readRecord(metadata)
  const imageCardIds = readArray(record.imageCardIds).map(String)
  const imageCount = typeof record.imageCount === "number" ? record.imageCount : null
  return {
    imageCardIds,
    imageCount: imageCount === 0 && imageCardIds.length === 0 ? null : imageCount,
  }
}

export function projectStorageBusinessSnapshot(snapshot: CardImportStorageSnapshot): StorageBusinessSnapshot {
  const indexBatches = readIndexBatches(snapshot)

  return {
    packs: sortedKeys(indexBatches).map((packId) => {
      const indexBatch = indexBatches[packId] ?? {}
      const batch = snapshot.batches[packId]
      const imageMetadata = readMetadataImageInfo(batch?.metadata)
      const cards = readArray(batch?.cards).map(projectCard)
      const variantTypeKeys = sortedKeys(batch?.variantTypes)
      const images = snapshot.images[packId]?.items ?? []

      return {
        id: packId,
        disabled: indexBatch.disabled === true,
        indexCardCount: typeof indexBatch.cardCount === "number" ? indexBatch.cardCount : null,
        actualCardCount: cards.length,
        cardIds: cards.map((card) => String(card.id ?? "")),
        imageMetadata,
        cardTypes: countTypes(cards),
        cards,
        variantTypeKeys,
        imageCardIds: snapshot.images[packId]?.cardIds ?? [],
        images,
      }
    }),
  }
}

function stable(value: unknown): string {
  return JSON.stringify(value)
}

function compareValue(path: string, expected: unknown, actual: unknown, failures: string[]) {
  if (stable(expected) !== stable(actual)) failures.push(`${path} mismatch`)
}

function compareImageMetadataConsistency(
  packId: string,
  pack: StorageBusinessSnapshot["packs"][number],
  failures: string[],
) {
  if (pack.imageMetadata.imageCardIds.length > 0) {
    compareValue(`${packId}: metadata imageCardIds match image backend`, pack.imageCardIds, pack.imageMetadata.imageCardIds, failures)
  }
  if (pack.imageMetadata.imageCount !== null && pack.imageMetadata.imageCount !== pack.imageCardIds.length) {
    failures.push(`${packId}: metadata imageCount mismatch`)
  }
}

export function compareStorageBusinessSnapshots(
  expected: CardImportStorageSnapshot,
  actual: CardImportStorageSnapshot,
): string[] {
  const expectedProjection = projectStorageBusinessSnapshot(expected)
  const actualProjection = projectStorageBusinessSnapshot(actual)
  const failures: string[] = []

  compareValue("packs", expectedProjection.packs.map((pack) => pack.id), actualProjection.packs.map((pack) => pack.id), failures)

  for (const expectedPack of expectedProjection.packs) {
    const actualPack = actualProjection.packs.find((pack) => pack.id === expectedPack.id)
    if (!actualPack) continue

    compareValue(`${expectedPack.id}: disabled`, expectedPack.disabled, actualPack.disabled, failures)
    compareValue(`${expectedPack.id}: index cardCount`, expectedPack.indexCardCount, actualPack.indexCardCount, failures)
    compareValue(`${expectedPack.id}: actual card count`, expectedPack.actualCardCount, actualPack.actualCardCount, failures)
    compareValue(`${expectedPack.id}: card id order`, expectedPack.cardIds, actualPack.cardIds, failures)
    compareValue(`${expectedPack.id}: image metadata`, expectedPack.imageMetadata, actualPack.imageMetadata, failures)
    compareImageMetadataConsistency(expectedPack.id, expectedPack, failures)
    compareImageMetadataConsistency(expectedPack.id, actualPack, failures)
    compareValue(`${expectedPack.id}: card type distribution`, expectedPack.cardTypes, actualPack.cardTypes, failures)
    compareValue(`${expectedPack.id}: variantTypes key set`, expectedPack.variantTypeKeys, actualPack.variantTypeKeys, failures)
    compareValue(`${expectedPack.id}: image card id order`, expectedPack.imageCardIds, actualPack.imageCardIds, failures)
    compareValue(`${expectedPack.id}: images`, expectedPack.images, actualPack.images, failures)

    for (const expectedCard of expectedPack.cards) {
      const expectedCardId = String(expectedCard.id ?? "")
      const actualCard = actualPack.cards.find((card) => String(card.id ?? "") === expectedCardId)
      if (!actualCard) {
        failures.push(`${expectedPack.id}/card/${expectedCardId}: missing card`)
        continue
      }
      compareValue(`${expectedPack.id}/card/${expectedCardId}: card`, expectedCard, actualCard, failures)
      compareValue(
        `${expectedPack.id}/card/${expectedCardId}: variantSpecial`,
        expectedCard.variantSpecial,
        actualCard.variantSpecial,
        failures,
      )
    }
  }

  return failures
}

function collectRawKeyDiff(path: string, expected: unknown, actual: unknown, differences: RawStorageDiffReport["differences"]) {
  const expectedRecord = readRecord(expected)
  const actualRecord = readRecord(actual)
  const allKeys = [...new Set([...Object.keys(expectedRecord), ...Object.keys(actualRecord)])].sort()
  for (const key of allKeys) {
    if (stable(expectedRecord[key]) !== stable(actualRecord[key])) {
      differences.push({ path: `${path}.${key}`, expected: expectedRecord[key], actual: actualRecord[key] })
    }
  }
}

export function buildRawStorageDiffReport(
  expected: CardImportStorageSnapshot,
  actual: CardImportStorageSnapshot,
): RawStorageDiffReport {
  const differences: RawStorageDiffReport["differences"] = []
  collectRawKeyDiff("index", expected.index, actual.index, differences)

  const packIds = [...new Set([...Object.keys(expected.batches), ...Object.keys(actual.batches)])].sort()
  for (const packId of packIds) {
    const expectedBatch = expected.batches[packId]
    const actualBatch = actual.batches[packId]
    collectRawKeyDiff(`batches.${packId}.metadata`, expectedBatch?.metadata, actualBatch?.metadata, differences)
    collectRawKeyDiff(`batches.${packId}.customFieldDefinitions`, expectedBatch?.customFieldDefinitions, actualBatch?.customFieldDefinitions, differences)
    collectRawKeyDiff(`batches.${packId}.variantTypes`, expectedBatch?.variantTypes, actualBatch?.variantTypes, differences)

    const expectedCards = readArray(expectedBatch?.cards)
    const actualCards = readArray(actualBatch?.cards)
    if (expectedCards.length !== actualCards.length) {
      differences.push({ path: `batches.${packId}.cards.length`, expected: expectedCards.length, actual: actualCards.length })
    }
    const cardCount = Math.min(expectedCards.length, actualCards.length)
    for (let index = 0; index < cardCount; index += 1) {
      collectRawKeyDiff(`batches.${packId}.cards.${index}`, expectedCards[index], actualCards[index], differences)
    }
  }

  return { differences }
}

export async function verifyActualImageBackendReadable(
  snapshot: CardImportStorageSnapshot,
  images: CardPackImageBackend,
): Promise<string[]> {
  const failures: string[] = []
  for (const [packId, imageSnapshot] of Object.entries(snapshot.images)) {
    for (const expectedImage of imageSnapshot.items) {
      const actualImage = await images.getImage(expectedImage.cardId, packId)
      if (!actualImage) {
        failures.push(`${packId}/${expectedImage.cardId}: image is not readable from image backend`)
        continue
      }
      if (actualImage.mimeType !== expectedImage.mimeType) {
        failures.push(`${packId}/${expectedImage.cardId}: image MIME mismatch`)
      }
      if (actualImage.blob.size !== expectedImage.byteLength) {
        failures.push(`${packId}/${expectedImage.cardId}: image byteLength mismatch`)
      }
    }
  }
  return failures
}
```

- [ ] **Step 2: Run comparator tests**

Run:

```bash
npx vitest run tests/local-fixtures/__tests__/card-import-equivalence.test.ts
```

Expected: pass.

- [ ] **Step 3: Commit helper implementation**

```bash
git add tests/local-fixtures/card-import-equivalence.ts tests/local-fixtures/__tests__/card-import-equivalence.test.ts
git commit -m "test: add card import business equivalence helpers"
```

## Task 3: Convert Local Fixture Test To Layer 1 Storage Business Gate

**Files:**
- Modify: `tests/local-fixtures/card-import-local-fixtures.test.ts`

- [ ] **Step 1: Replace raw string comparison with business comparison**

Modify imports in `tests/local-fixtures/card-import-local-fixtures.test.ts`:

```ts
import {
  buildRawStorageDiffReport,
  compareStorageBusinessSnapshots,
  verifyActualImageBackendReadable,
} from "./card-import-equivalence"
```

Also add `rm` to the existing Node `fs/promises` import:

```ts
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises"
```

After building and writing `serialized`, parse both snapshots and compare business facts:

```ts
      const actualSnapshot = snapshot
      const expectedSnapshot = JSON.parse(expected) as typeof actualSnapshot
      const businessFailures = compareStorageBusinessSnapshots(expectedSnapshot, actualSnapshot)
      const diffReport = buildRawStorageDiffReport(expectedSnapshot, actualSnapshot)

      if (diffReport.differences.length > 0) {
        await writeFile(
          path.join(ACTUAL, names.snapshotFileName.replace(/\.storage\.json$/, ".diff.json")),
          `${JSON.stringify(diffReport, null, 2)}\n`,
          "utf8",
        )
      } else {
        await rm(path.join(ACTUAL, names.snapshotFileName.replace(/\.storage\.json$/, ".diff.json")), { force: true })
      }

      if (businessFailures.length > 0) {
        failures.push(`${fixtureName}: business storage mismatch:\n${businessFailures.join("\n")}`)
      }

      const imageReadFailures = await verifyActualImageBackendReadable(actualSnapshot, images)
      if (imageReadFailures.length > 0) {
        failures.push(`${fixtureName}: actual image backend read mismatch:\n${imageReadFailures.join("\n")}`)
      }
```

Remove the old block:

```ts
      if (expected.trimEnd() !== serialized.trimEnd()) {
        failures.push(`${fixtureName}: storage snapshot differs; wrote ${actualPath}`)
      }
```

- [ ] **Step 2: Run local fixture test**

Run:

```bash
npm run test:card-import:local-fixtures
```

Expected:

- With local fixtures present and expected snapshots present, the test imports every fixture and passes if business facts are equivalent.
- `.local-fixtures/card-packs/actual/*.storage.json` is written.
- `.local-fixtures/card-packs/actual/*.diff.json` is written for raw storage drift.
- stale `.local-fixtures/card-packs/actual/*.diff.json` is removed when a fixture no longer has raw storage drift.
- every actual imported image can be read back from the pack-scoped image backend.
- The test does not fail only because `index.size`, `version`, `author`, metadata description, `totalImageSize`, `batchName`, `item4`, `customFieldDefinitions.variants`, or `variantTypes` metadata differ.

- [ ] **Step 3: If the test fails, classify the failure before editing production code**

Use this rule:

```text
If failure is a gated business fact mismatch, stop and produce a report.
If failure is a known metadata-only drift, fix the comparator/report classification.
Do not patch production import code from this task.
```

- [ ] **Step 4: Commit Layer 1 conversion**

```bash
git add tests/local-fixtures/card-import-local-fixtures.test.ts tests/local-fixtures/card-import-equivalence.ts
git commit -m "test: compare real card packs by storage business facts"
```

## Task 4: Runtime Read-Model Projection Helper

**Files:**
- Modify: `tests/local-fixtures/card-import-equivalence.ts`
- Create: `tests/local-fixtures/__tests__/card-import-runtime-equivalence.test.ts`

- [ ] **Step 1: Write failing runtime helper test**

Create `tests/local-fixtures/__tests__/card-import-runtime-equivalence.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest"
import type { CardImportStorageSnapshot } from "../../helpers/card-import-storage-snapshot"
import { CardType } from "@/card/card-types"
import { useUnifiedCardStore } from "@/card/stores/unified-card-store"
import {
  compareRuntimeBusinessSnapshots,
  projectRuntimeBusinessSnapshotFromStorage,
} from "../card-import-equivalence"

function storageSnapshot(): CardImportStorageSnapshot {
  return {
    index: {
      batches: {
        pack_a: {
          id: "pack_a",
          name: "Pack A",
          fileName: "pack.json",
          importTime: "2026-06-18T00:00:00.000Z",
          cardCount: 2,
          cardTypes: ["domain", "variant"],
          size: 123,
          disabled: false,
        },
      },
      totalCards: 2,
      totalBatches: 1,
      lastUpdate: "2026-06-18T00:00:00.000Z",
    },
    batches: {
      pack_a: {
        metadata: {
          id: "pack_a",
          name: "Pack A",
          fileName: "pack.json",
          importTime: "2026-06-18T00:00:00.000Z",
        },
        cards: [
          {
            standarized: true,
            id: "domain-card",
            name: "Domain Card",
            type: "domain",
            class: "Blade",
            level: 1,
            description: "",
            batchId: "pack_a",
            source: "custom",
          },
          {
            standarized: true,
            id: "variant-card",
            name: "Variant Card",
            type: "variant",
            level: 2,
            description: "",
            hasLocalImage: true,
            batchId: "pack_a",
            source: "custom",
            variantSpecial: {
              realType: "Weapon",
              subCategory: "Sword",
            },
          },
        ],
        customFieldDefinitions: {
          domains: ["Blade"],
        },
        variantTypes: {
          Weapon: {
            description: "Weapon variants",
            subclasses: ["Sword"],
            levelRange: [1, 4],
          },
        },
      },
    },
    images: {
      pack_a: {
        cardIds: ["variant-card"],
        items: [
          {
            cardId: "variant-card",
            mimeType: "image/png",
            byteLength: 10,
            sha256: "a".repeat(64),
          },
        ],
      },
    },
  }
}

describe("card import runtime equivalence", () => {
  beforeEach(() => {
    localStorage.clear()
    useUnifiedCardStore.setState({
      batches: new Map(),
      cards: new Map(),
      cardsByType: new Map(),
      aggregatedCustomFields: null,
      aggregatedVariantTypes: null,
      subclassCardIndex: null,
      levelCardIndex: null,
      batchKeywordIndex: null,
      batchLevelIndex: null,
      stats: null,
      cacheValid: false,
      initialized: true,
    })
  })

  it("projects runtime facts through the existing store load boundary", async () => {
    await expect(projectRuntimeBusinessSnapshotFromStorage(storageSnapshot())).resolves.toEqual({
      cardIds: ["domain-card", "variant-card"],
      cardsByType: {
        domain: ["domain-card"],
        variant: ["variant-card"],
      },
      aggregatedCustomFields: {
        domains: ["Blade"],
      },
      aggregatedVariantTypeKeys: ["Weapon"],
      publicApi: {
        standardByType: {
          domain: ["domain-card"],
          variant: ["variant-card"],
        },
        standardById: {
          "domain-card": "domain-card",
          "variant-card": "variant-card",
        },
        customCardIds: ["domain-card", "variant-card"],
        customByType: {
          domain: ["domain-card"],
          variant: ["variant-card"],
        },
        cardsByBatch: {
          pack_a: ["domain-card", "variant-card"],
        },
        customBatches: [
          {
            id: "pack_a",
            name: "Pack A",
            fileName: "pack.json",
            cardCount: 2,
            cardTypes: ["domain", "variant"],
            disabled: false,
          },
        ],
        allBatches: [
          {
            id: "pack_a",
            name: "Pack A",
            fileName: "pack.json",
            cardCount: 2,
            cardTypes: ["domain", "variant"],
            disabled: false,
          },
        ],
        cardBatchNames: {
          "domain-card": "Pack A",
          "variant-card": "Pack A",
        },
      },
      standardClassOptions: {
        [CardType.Domain]: [{ value: "Blade", label: "Blade" }],
      },
      predefinedNames: {
        professions: [],
        ancestries: [],
        communities: [],
        subclasses: [],
        domains: ["Blade"],
      },
      variantOptions: {
        fullTypes: {
          Weapon: {
            description: "Weapon variants",
            subclasses: ["Sword"],
            levelRange: [1, 4],
          },
        },
        typeNames: ["Weapon"],
        availableTypes: [{ value: "Weapon", label: "Weapon" }],
        byType: {
          Weapon: {
            rawSubclasses: ["Sword"],
            subclassOptions: [{ value: "Sword", label: "Sword" }],
            levelOptions: [
              { value: "1", label: "等级 1" },
              { value: "2", label: "等级 2" },
              { value: "3", label: "等级 3" },
              { value: "4", label: "等级 4" },
            ],
          },
        },
      },
      subclassCardIndex: {
        Weapon: {
          Sword: ["variant-card"],
        },
        domain: {
          Blade: ["domain-card"],
        },
      },
      levelCardIndex: {
        Weapon: {
          "2": ["variant-card"],
        },
        domain: {
          "1": ["domain-card"],
        },
      },
      batchKeywordIndex: {
        pack_a: {
          Weapon: ["Sword"],
          domain: ["Blade"],
        },
      },
      batchLevelIndex: {
        pack_a: {
          Weapon: ["2"],
          domain: ["1"],
        },
      },
      variantCards: [
        {
          id: "variant-card",
          level: 2,
          hasLocalImage: true,
          realType: "Weapon",
          subCategory: "Sword",
        },
      ],
    })
  })

  it("detects runtime index mismatches", async () => {
    const expected = await projectRuntimeBusinessSnapshotFromStorage(storageSnapshot())
    const actualSource = storageSnapshot()
    actualSource.batches.pack_a.cards = [
      actualSource.batches.pack_a.cards[0],
      {
        ...(actualSource.batches.pack_a.cards[1] as Record<string, unknown>),
        variantSpecial: {
          realType: "Armor",
          subCategory: "Shield",
        },
      },
    ]
    const actual = await projectRuntimeBusinessSnapshotFromStorage(actualSource)

    expect(compareRuntimeBusinessSnapshots(expected, actual)).toContain("subclassCardIndex mismatch")
  })

  it("hides disabled packs from runtime-visible APIs and indexes", async () => {
    const source = storageSnapshot()
    ;(source.index as any).batches.pack_a.disabled = true

    await expect(projectRuntimeBusinessSnapshotFromStorage(source)).resolves.toMatchObject({
      cardIds: [],
      cardsByType: {},
      aggregatedCustomFields: {},
      aggregatedVariantTypeKeys: [],
      publicApi: {
        standardByType: {},
        standardById: {},
        customCardIds: [],
        customByType: {},
        cardsByBatch: {
          pack_a: [],
        },
        customBatches: [
          {
            id: "pack_a",
            name: "Pack A",
            fileName: "pack.json",
            cardCount: 2,
            cardTypes: ["domain", "variant"],
            disabled: true,
          },
        ],
        allBatches: [
          {
            id: "pack_a",
            name: "Pack A",
            fileName: "pack.json",
            cardCount: 2,
            cardTypes: ["domain", "variant"],
            disabled: true,
          },
        ],
        cardBatchNames: {
          "domain-card": null,
          "variant-card": null,
        },
      },
      subclassCardIndex: {},
      levelCardIndex: {},
      batchKeywordIndex: {},
      batchLevelIndex: {},
    })
  })
})
```

- [ ] **Step 2: Run runtime helper test and confirm it fails**

Run:

```bash
npx vitest run tests/local-fixtures/__tests__/card-import-runtime-equivalence.test.ts
```

Expected: fail because runtime helper functions do not exist.

- [ ] **Step 3: Implement runtime projection helpers**

Modify the top import block in `tests/local-fixtures/card-import-equivalence.ts` so it contains these imports:

```ts
import { CardType } from "@/card/card-types"
import type { CardPackImageBackend } from "@/card/packs/image-backend"
import {
  getAvailableVariantTypes,
  getCardClassOptionsForType,
  getVariantLevelOptions,
  getVariantSubclassOptions,
} from "@/card/card-ui-config"
import {
  getAncestryCardNames,
  getCommunityCardNames,
  getDomainCardNames,
  getProfessionCardNames,
  getSubClassCardNames,
  getVariantSubclasses,
  getVariantTypes,
  getVariantTypeNames,
} from "@/card/card-predefined-field"
import {
  getAllBatches,
  getCardsByBatchId,
  getCustomCardBatches,
  getCustomCards,
  getCustomCardsByType,
  getStandardCardById,
  getStandardCardsByType,
} from "@/card/index-unified"
import { STORAGE_KEYS } from "@/card/stores/store-types"
import { useUnifiedCardStore } from "@/card/stores/unified-card-store"
import type { CardImportStorageSnapshot } from "../helpers/card-import-storage-snapshot"
```

Then append these runtime helpers to `tests/local-fixtures/card-import-equivalence.ts`:

```ts
export interface RuntimeBusinessSnapshot {
  cardIds: string[]
  cardsByType: Record<string, string[]>
  aggregatedCustomFields: Record<string, string[]>
  aggregatedVariantTypeKeys: string[]
  publicApi: {
    standardByType: Record<string, string[]>
    standardById: Record<string, string | null>
    customCardIds: string[]
    customByType: Record<string, string[]>
    cardsByBatch: Record<string, string[]>
    customBatches: RuntimeBatchSummary[]
    allBatches: RuntimeBatchSummary[]
    cardBatchNames: Record<string, string | null>
  }
  standardClassOptions: Record<string, Array<{ value: string; label: string }>>
  predefinedNames: {
    professions: string[]
    ancestries: string[]
    communities: string[]
    subclasses: string[]
    domains: string[]
  }
  variantOptions: {
    fullTypes: Record<string, unknown>
    typeNames: string[]
    availableTypes: Array<{ value: string; label: string }>
    byType: Record<
      string,
      {
        rawSubclasses: string[]
        subclassOptions: Array<{ value: string; label: string }>
        levelOptions: Array<{ value: string; label: string }>
      }
    >
  }
  subclassCardIndex: Record<string, Record<string, string[]>>
  levelCardIndex: Record<string, Record<string, string[]>>
  batchKeywordIndex: Record<string, Record<string, string[]>>
  batchLevelIndex: Record<string, Record<string, string[]>>
  variantCards: Array<{
    id: string
    level?: unknown
    hasLocalImage?: unknown
    realType?: unknown
    subCategory?: unknown
  }>
}

interface RuntimeBatchSummary {
  id: string
  name: string
  fileName: string
  author?: string
  version?: string
  cardCount: number
  cardTypes: string[]
  disabled: boolean
}

function normalizeNestedIndexAsSets(index: unknown): Record<string, Record<string, string[]>> {
  const result: Record<string, Record<string, string[]>> = {}
  for (const [outerKey, outerValue] of Object.entries(readRecord(index)).sort(([left], [right]) => left.localeCompare(right))) {
    result[outerKey] = {}
    for (const [innerKey, innerValue] of Object.entries(readRecord(outerValue)).sort(([left], [right]) => left.localeCompare(right))) {
      result[outerKey][innerKey] = [...new Set(readArray(innerValue).map(String))].sort()
    }
  }
  return result
}

function preserveStringArraysByKey(value: unknown): Record<string, string[]> {
  const result: Record<string, string[]> = {}
  for (const [key, arrayValue] of Object.entries(readRecord(value)).sort(([left], [right]) => left.localeCompare(right))) {
    if (key === "variants") continue
    result[key] = readArray(arrayValue).map(String)
  }
  return result
}

function installStorageSnapshotIntoLocalStorage(snapshot: CardImportStorageSnapshot) {
  localStorage.removeItem(STORAGE_KEYS.INDEX)
  for (let index = localStorage.length - 1; index >= 0; index -= 1) {
    const key = localStorage.key(index)
    if (key?.startsWith(STORAGE_KEYS.BATCH_PREFIX)) localStorage.removeItem(key)
  }
  localStorage.setItem(STORAGE_KEYS.INDEX, JSON.stringify(snapshot.index))
  for (const [packId, batch] of Object.entries(snapshot.batches)) {
    localStorage.setItem(`${STORAGE_KEYS.BATCH_PREFIX}${packId}`, JSON.stringify(batch))
  }
}

function resetStoreForRuntimeProjection() {
  useUnifiedCardStore.setState({
    batches: new Map(),
    cards: new Map(),
    cardsByType: new Map(),
    index: {
      batches: {},
      totalCards: 0,
      totalBatches: 0,
      lastUpdate: "2026-06-18T00:00:00.000Z",
    },
    aggregatedCustomFields: null,
    aggregatedVariantTypes: null,
    subclassCardIndex: null,
    levelCardIndex: null,
    batchKeywordIndex: null,
    batchLevelIndex: null,
    stats: null,
    cacheValid: false,
    initialized: true,
  })
}

function collectCardsByType() {
  const store = useUnifiedCardStore.getState()
  const result: Record<string, string[]> = {}
  for (const type of Object.values(CardType)) {
    const cardIds = store.loadCardsByType(type).map((card) => card.id)
    if (cardIds.length > 0) result[type] = cardIds
  }
  return result
}

function normalizeBatchSummaries(batches: any[]): RuntimeBatchSummary[] {
  return batches.map((batch) => ({
    id: String(batch.id ?? ""),
    name: String(batch.name ?? ""),
    fileName: String(batch.fileName ?? ""),
    ...(batch.author !== undefined ? { author: String(batch.author) } : {}),
    ...(batch.version !== undefined ? { version: String(batch.version) } : {}),
    cardCount: Number(batch.cardCount ?? 0),
    cardTypes: readArray(batch.cardTypes).map(String),
    disabled: batch.disabled === true,
  }))
}

function collectPublicApiSnapshot(allSnapshotCardIds: string[], packIds: string[]): RuntimeBusinessSnapshot["publicApi"] {
  const standardByType: Record<string, string[]> = {}
  const customByType: Record<string, string[]> = {}
  const standardById: Record<string, string | null> = {}
  const cardBatchNames: Record<string, string | null> = {}
  for (const type of Object.values(CardType)) {
    const standardIds = getStandardCardsByType(type).map((card) => card.id)
    const customIds = getCustomCardsByType(type).map((card) => card.id)
    if (standardIds.length > 0) standardByType[type] = standardIds
    if (customIds.length > 0) customByType[type] = customIds
  }
  for (const id of allSnapshotCardIds) {
    const card = getStandardCardById(id)
    standardById[id] = card?.id ?? null
    cardBatchNames[id] = (card as any)?.batchName ?? null
  }

  return {
    standardByType,
    standardById,
    customCardIds: getCustomCards().map((card) => card.id),
    customByType,
    cardsByBatch: Object.fromEntries(packIds.map((packId) => [packId, getCardsByBatchId(packId).map((card) => card.id)])),
    customBatches: normalizeBatchSummaries(getCustomCardBatches()),
    allBatches: normalizeBatchSummaries(getAllBatches()),
    cardBatchNames,
  }
}

function collectStandardClassOptions() {
  const result: Record<string, Array<{ value: string; label: string }>> = {}
  for (const type of Object.values(CardType)) {
    const options = getCardClassOptionsForType(type)
    if (options.length > 0) result[type] = options
  }
  return result
}

function collectVariantOptions() {
  const typeNames = getVariantTypeNames()
  const rawFullTypes = getVariantTypes()
  const fullTypes = Object.fromEntries(
    Object.entries(rawFullTypes).sort(([left], [right]) => left.localeCompare(right)),
  )
  const byType: RuntimeBusinessSnapshot["variantOptions"]["byType"] = {}
  for (const typeName of Object.keys(fullTypes).sort()) {
    byType[typeName] = {
      rawSubclasses: getVariantSubclasses(typeName),
      subclassOptions: getVariantSubclassOptions(typeName),
      levelOptions: getVariantLevelOptions(typeName),
    }
  }
  return {
    fullTypes,
    typeNames,
    availableTypes: getAvailableVariantTypes(),
    byType,
  }
}

export async function projectRuntimeBusinessSnapshotFromStorage(snapshot: CardImportStorageSnapshot): Promise<RuntimeBusinessSnapshot> {
  installStorageSnapshotIntoLocalStorage(snapshot)
  resetStoreForRuntimeProjection()

  const store = useUnifiedCardStore.getState()
  await store.reloadCustomRuntimeFromStorage()

  const state = useUnifiedCardStore.getState()
  const visibleCards = state.loadAllCards()
  const visibleCardIds = visibleCards.map((card) => card.id)
  const allSnapshotCardIds = Object.values(snapshot.batches).flatMap((batch) =>
    readArray(batch.cards).map((card) => String(readRecord(card).id ?? "")),
  )
  const packIds = Object.keys(readRecord(readRecord(snapshot.index).batches)).sort()

  return {
    cardIds: visibleCardIds,
    cardsByType: collectCardsByType(),
    aggregatedCustomFields: preserveStringArraysByKey(state.aggregatedCustomFields ?? {}),
    aggregatedVariantTypeKeys: Object.keys(state.aggregatedVariantTypes ?? {}).sort(),
    publicApi: collectPublicApiSnapshot(allSnapshotCardIds, packIds),
    standardClassOptions: collectStandardClassOptions(),
    predefinedNames: {
      professions: getProfessionCardNames(),
      ancestries: getAncestryCardNames(),
      communities: getCommunityCardNames(),
      subclasses: getSubClassCardNames(),
      domains: getDomainCardNames(),
    },
    variantOptions: collectVariantOptions(),
    subclassCardIndex: normalizeNestedIndexAsSets(state.subclassCardIndex ?? {}),
    levelCardIndex: normalizeNestedIndexAsSets(state.levelCardIndex ?? {}),
    batchKeywordIndex: normalizeNestedIndexAsSets(state.batchKeywordIndex ?? {}),
    batchLevelIndex: normalizeNestedIndexAsSets(state.batchLevelIndex ?? {}),
    variantCards: visibleCards
      .filter((card) => readRecord(card).type === "variant")
      .map((card) => {
        const record = readRecord(card)
        const variantSpecial = readRecord(record.variantSpecial)
        return {
          id: String(record.id ?? ""),
          ...(record.level !== undefined ? { level: record.level } : {}),
          ...(record.hasLocalImage !== undefined ? { hasLocalImage: record.hasLocalImage } : {}),
          ...(variantSpecial.realType !== undefined ? { realType: variantSpecial.realType } : {}),
          ...(variantSpecial.subCategory !== undefined ? { subCategory: variantSpecial.subCategory } : {}),
        }
      })
      .sort((left, right) => left.id.localeCompare(right.id)),
  }
}

export function compareRuntimeBusinessSnapshots(
  expected: RuntimeBusinessSnapshot,
  actual: RuntimeBusinessSnapshot,
): string[] {
  const failures: string[] = []
  compareValue("runtime cardIds", expected.cardIds, actual.cardIds, failures)
  compareValue("cardsByType", expected.cardsByType, actual.cardsByType, failures)
  compareValue("aggregatedCustomFields", expected.aggregatedCustomFields, actual.aggregatedCustomFields, failures)
  compareValue("aggregatedVariantTypeKeys", expected.aggregatedVariantTypeKeys, actual.aggregatedVariantTypeKeys, failures)
  compareValue("publicApi", expected.publicApi, actual.publicApi, failures)
  compareValue("standardClassOptions", expected.standardClassOptions, actual.standardClassOptions, failures)
  compareValue("predefinedNames", expected.predefinedNames, actual.predefinedNames, failures)
  compareValue("variantOptions", expected.variantOptions, actual.variantOptions, failures)
  compareValue("subclassCardIndex", expected.subclassCardIndex, actual.subclassCardIndex, failures)
  compareValue("levelCardIndex", expected.levelCardIndex, actual.levelCardIndex, failures)
  compareValue("batchKeywordIndex", expected.batchKeywordIndex, actual.batchKeywordIndex, failures)
  compareValue("batchLevelIndex", expected.batchLevelIndex, actual.batchLevelIndex, failures)
  compareValue("variantCards", expected.variantCards, actual.variantCards, failures)
  return failures
}
```

- [ ] **Step 4: Run runtime helper test**

Run:

```bash
npx vitest run tests/local-fixtures/__tests__/card-import-runtime-equivalence.test.ts
```

Expected: pass.

- [ ] **Step 5: Run comparator test again**

Run:

```bash
npx vitest run tests/local-fixtures/__tests__/card-import-equivalence.test.ts
```

Expected: pass.

- [ ] **Step 6: Commit runtime helper**

```bash
git add tests/local-fixtures/card-import-equivalence.ts tests/local-fixtures/__tests__/card-import-runtime-equivalence.test.ts
git commit -m "test: add card import runtime equivalence projection"
```

## Task 5: Add Layer 2 Runtime Gate To Real Fixture Runner

**Files:**
- Modify: `tests/local-fixtures/card-import-local-fixtures.test.ts`

- [ ] **Step 1: Import runtime comparison helpers**

Modify imports:

```ts
import {
  buildRawStorageDiffReport,
  compareRuntimeBusinessSnapshots,
  compareStorageBusinessSnapshots,
  projectRuntimeBusinessSnapshotFromStorage,
  verifyActualImageBackendReadable,
} from "./card-import-equivalence"
```

Also add these imports for the actual-only runtime refresh smoke:

```ts
import { createBrowserCardPackStorageAdapter } from "@/card/packs/local-storage-adapter"
import { createZustandCardRuntimeRefreshAdapter } from "@/card/packs/runtime-refresh-adapter"
import { useUnifiedCardStore } from "@/card/stores/unified-card-store"
```

- [ ] **Step 2: Add runtime comparison after storage comparison**

After `businessFailures` is computed, add:

```ts
      const expectedRuntime = await projectRuntimeBusinessSnapshotFromStorage(expectedSnapshot)
      const actualRuntime = await projectRuntimeBusinessSnapshotFromStorage(actualSnapshot)
      const runtimeFailures = compareRuntimeBusinessSnapshots(expectedRuntime, actualRuntime)

      if (runtimeFailures.length > 0) {
        failures.push(`${fixtureName}: runtime read-model mismatch:\n${runtimeFailures.join("\n")}`)
      }
```

- [ ] **Step 3: Add actual-only service runtime refresh smoke**

Add this local helper in `tests/local-fixtures/card-import-local-fixtures.test.ts`:

```ts
function clearBrowserCardPackStorage() {
  localStorage.removeItem("daggerheart_custom_cards_index")
  for (let index = localStorage.length - 1; index >= 0; index -= 1) {
    const key = localStorage.key(index)
    if (key?.startsWith("daggerheart_custom_cards_batch_")) localStorage.removeItem(key)
  }
}

function resetRuntimeStoreForFixture() {
  useUnifiedCardStore.setState({
    batches: new Map(),
    cards: new Map(),
    cardsByType: new Map(),
    index: {
      batches: {},
      totalCards: 0,
      totalBatches: 0,
      lastUpdate: FIXED_NOW.toISOString(),
    },
    aggregatedCustomFields: null,
    aggregatedVariantTypes: null,
    subclassCardIndex: null,
    levelCardIndex: null,
    batchKeywordIndex: null,
    batchLevelIndex: null,
    stats: null,
    cacheValid: false,
    initialized: true,
  })
}

async function verifyActualRuntimeRefreshSmoke(filePath: string, packId: string, expectedCardCount: number): Promise<string[]> {
  clearBrowserCardPackStorage()
  resetRuntimeStoreForFixture()

  const service = createCardPackApplicationService({
    repository: createLocalStorageCardPackRepository({
      storage: createBrowserCardPackStorageAdapter(localStorage),
      images: createInMemoryCardPackImageBackend(),
      now: () => FIXED_NOW,
    }),
    runtimeRefresh: createZustandCardRuntimeRefreshAdapter(useUnifiedCardStore.getState()),
    builtinTemplateIds: new Set(),
    createPackId: () => packId,
    now: () => FIXED_NOW,
    random: () => 0,
  })

  const result = await service.importFromSource(await sourceForFile(filePath), { mode: "commit" })
  if (!result.success) {
    return [`actual runtime refresh smoke failed at ${result.stage}: ${result.diagnostics.map((diagnostic) => diagnostic.message).join("; ")}`]
  }

  const store = useUnifiedCardStore.getState()
  const batch = store.getAllBatches().find((entry) => entry.id === packId)
  const cards = store.loadAllCards().filter((card) => card.batchId === packId)
  const failures: string[] = []

  if (!batch) failures.push(`${packId}: runtime refresh did not expose batch`)
  if (cards.length !== expectedCardCount) {
    failures.push(`${packId}: runtime refresh exposed ${cards.length} cards, expected ${expectedCardCount}`)
  }

  clearBrowserCardPackStorage()
  resetRuntimeStoreForFixture()
  return failures
}
```

After the image backend read check, add:

```ts
      const runtimeSmokeFailures = await verifyActualRuntimeRefreshSmoke(filePath, names.packId, actualSnapshot.batches[names.packId].cards.length)
      if (runtimeSmokeFailures.length > 0) {
        failures.push(`${fixtureName}: actual runtime refresh smoke mismatch:\n${runtimeSmokeFailures.join("\n")}`)
      }
```

- [ ] **Step 4: Run local fixture test**

Run:

```bash
npm run test:card-import:local-fixtures
```

Expected:

- test passes if old expected and current actual produce the same runtime read model;
- any `variantTypes` metadata-only drift remains non-blocking;
- `aggregatedVariantTypes` key set drift fails;
- `subclassCardIndex`, `levelCardIndex`, `batchKeywordIndex`, and `batchLevelIndex` drift fails.
- the actual commit path can refresh the real Zustand runtime directly after service commit.

- [ ] **Step 5: If runtime gate fails, produce a classification report instead of fixing production code immediately**

Use this exact triage rule:

```text
If runtime gate fails because key/index/card facts differ, stop and report the exact fixtures and fields.
If runtime gate fails because helper sorting or projection is unstable, fix only the test helper.
Do not change production store/import code in this task.
```

- [ ] **Step 6: Commit runtime gate**

```bash
git add tests/local-fixtures/card-import-local-fixtures.test.ts
git commit -m "test: compare real card packs by runtime read model"
```

## Task 6: Package Script Coverage

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add comparator tests to focused card import script**

Modify `test:card-import` so it includes the local-fixture helper unit tests but does not require private real fixtures:

```json
"test:card-import": "npx vitest run card/import card/packs card/__tests__/legacy-import-facade.test.ts card/stores/__tests__/batch-read-model.test.ts tests/local-fixtures/__tests__ components/content-pack-manager"
```

Keep `test:card-import:local-fixtures` as the opt-in command:

```json
"test:card-import:local-fixtures": "RUN_LOCAL_CARD_PACK_FIXTURES=1 npx vitest run tests/local-fixtures/card-import-local-fixtures.test.ts"
```

- [ ] **Step 2: Run regular card import tests**

Run:

```bash
npm run test:card-import
```

Expected: pass without needing `.local-fixtures`.

- [ ] **Step 3: Run local real-card-pack regression tests**

Run:

```bash
npm run test:card-import:local-fixtures
```

Expected: pass when `.local-fixtures/card-packs/inputs` and `.local-fixtures/card-packs/expected` are present.

- [ ] **Step 4: Commit script update**

```bash
git add package.json
git commit -m "test: include card import equivalence helpers"
```

## Task 7: Documentation Update

**Files:**
- Modify: `docs/superpowers/specs/2026-06-18-card-import-business-equivalence-test-scope.md`
- Optional modify: `docs/superpowers/specs/2026-06-18-card-import-regression-test-architecture.md`

- [ ] **Step 1: Record implemented command set**

Append this section to `docs/superpowers/specs/2026-06-18-card-import-business-equivalence-test-scope.md`:

```md
## Implemented Test Commands

- `npm run test:card-import`
  - Runs normal card import, card pack, store read-model, and equivalence helper tests.
  - Does not require local private fixtures.
- `npm run test:card-import:local-fixtures`
  - Requires `.local-fixtures/card-packs/inputs` and `.local-fixtures/card-packs/expected`.
  - Imports every local real card pack through the current commit path.
  - Writes current raw snapshots and raw diff reports to `.local-fixtures/card-packs/actual`.
  - Fails on storage business fact drift, actual image backend readability drift, runtime read-model drift, or selector/helper output drift.
  - Does not fail on approved metadata-only raw storage drift.

## Known Non-Goals

- The local fixture test does not prove old expected image blobs can be re-read, because expected snapshots intentionally store image metadata and hash, not binary blobs.
- The local fixture test does prove current actual imported images can be read back from the pack-scoped image backend.
- The local fixture test does not make raw storage byte-level equality a compatibility contract.
- The local fixture test does not change production runtime/store consumption boundaries.
```

- [ ] **Step 2: Run markdown/path sanity check**

Run:

```bash
rg -n "test:card-import:local-fixtures|Known Non-Goals|actual imported images|selector/helper output" docs/superpowers/specs/2026-06-18-card-import-business-equivalence-test-scope.md
```

Expected: matching lines exist.

- [ ] **Step 3: Commit docs**

```bash
git add docs/superpowers/specs/2026-06-18-card-import-business-equivalence-test-scope.md
git commit -m "docs: document card import business equivalence tests"
```

## Task 8: Final Verification And Review Handoff

**Files:**
- No code changes expected after this task unless verification finds issues.

- [ ] **Step 1: Run focused suite**

Run:

```bash
npm run test:card-import
```

Expected: pass.

- [ ] **Step 2: Run real fixture regression suite**

Run:

```bash
npm run test:card-import:local-fixtures
```

Expected: pass with local fixtures present.

- [ ] **Step 3: Inspect generated raw diff reports**

Run:

```bash
find .local-fixtures/card-packs/actual -type f -name "*.diff.json" -print
```

Expected: reports may exist. Their existence alone is not a failure.

- [ ] **Step 4: Confirm no private fixtures are staged**

Run:

```bash
git status --short
```

Expected:

- no `.local-fixtures/` entries;
- committed test/docs changes only;
- no production import/store behavior changes.

- [ ] **Step 5: Request implementation review**

Ask reviewers to check:

```text
Review the card import business equivalence tests.

Requirements:
- raw storage byte equality must not be the gate;
- storage business facts must fail on canonical card payload drift, card order drift, image hash drift, image metadata drift, and variant type key drift;
- actual imported images must be readable from the pack-scoped image backend;
- runtime read model must fail on cardsByType, public façade output, batch façade business fields, selector/helper output, full normalized variant type read-model, aggregatedVariantTypes key set, subclassCardIndex set, levelCardIndex set, batchKeywordIndex set, and batchLevelIndex set drift;
- variant `subclasses` / `levelRange` raw metadata can be report-only only when the runtime/helper output remains equivalent;
- disabled packs must be hidden from runtime-visible card APIs and indexes;
- actual commit path must be smoke-tested with a non-noop runtime refresh adapter;
- local private fixtures must stay ignored;
- production import/store behavior must not change.
```

Expected: no Critical or Important review findings before the work is considered ready.

## Self-Review

- Spec coverage:
  - Layer 1 storage business equivalence is covered by Tasks 1-3.
  - Layer 2 runtime read-model equivalence is covered by Tasks 4-5.
  - Raw diff reporting is covered by Tasks 2-3.
  - Command/documentation expectations are covered by Tasks 6-7.
  - Final verification is covered by Task 8.
- Placeholder scan:
  - The plan contains no `TBD`, `TODO`, or intentionally unspecified implementation steps.
- Type consistency:
  - `CardImportStorageSnapshot` is reused from `tests/helpers/card-import-storage-snapshot.ts`.
  - Runtime projection uses existing `STORAGE_KEYS` and `useUnifiedCardStore`.
  - Layer 1 and Layer 2 helpers live together in `tests/local-fixtures/card-import-equivalence.ts`.
