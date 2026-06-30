import { act, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from "vitest"
import type { ExtendedStandardCard } from "@/card/card-types"
import type { BatchInfo, UnifiedCardState } from "@/card/stores/store-types"
import CardManagerPage from "../page"

type RuntimeSlice = Pick<UnifiedCardState, "initialized" | "batches" | "cards"> & {
  initializeSystem: Mock<() => Promise<{ initialized: boolean }>>
  resetSystem: Mock<() => Promise<void>>
  loadAllCards: Mock<() => ExtendedStandardCard[]>
  getCardById: Mock<(cardId: string) => ExtendedStandardCard | null>
}

const runtimeListeners = vi.hoisted(() => new Set<() => void>())

const mocks = vi.hoisted(() => ({
  runtime: {
    initialized: true,
    batches: new Map([
      [
        "pack_a",
        {
          id: "pack_a",
          name: "Pack A",
          author: "Tester",
          version: "1.0.0",
          fileName: "pack-a.json",
          importTime: "2026-06-19T00:00:00.000Z",
          cardCount: 1,
          cardTypes: ["profession"],
          size: 100,
          disabled: false,
          cardIds: ["card_a"],
        },
      ],
    ]),
    cards: new Map([
      [
        "card_a",
        {
          id: "card_a",
          name: "Card A",
          type: "profession",
          class: "Profession",
          standarized: true,
          cardSelectDisplay: {},
          batchId: "pack_a",
        } as ExtendedStandardCard,
      ],
    ]),
    initializeSystem: vi.fn(async () => ({ initialized: true })),
    resetSystem: vi.fn(async () => undefined),
    loadAllCards: vi.fn((): ExtendedStandardCard[] => []),
    getCardById: vi.fn((_cardId: string): ExtendedStandardCard | null => null),
  } as RuntimeSlice,
  clearAllCharacterImages: vi.fn(async () => undefined),
  removeCustomCardBatch: vi.fn(async (_batchId: string) => false),
  toggleBatchDisabled: vi.fn(async (_batchId: string, _disabled?: boolean) => false),
  importCustomCards: vi.fn(),
  getCardsByBatchId: vi.fn((_batchId: string): ExtendedStandardCard[] => []),
  equipmentState: {
    initialized: true,
    storageSnapshot: null,
    lastResult: null,
    initializationError: null,
    ensureInitialized: vi.fn(async () => undefined),
    getPackSummaries: vi.fn(() => []),
    getPackDetail: vi.fn(() => undefined),
    refreshFromStorage: vi.fn(async () => undefined),
    removePack: vi.fn(),
    setPackDisabled: vi.fn(),
    importPackFromFile: vi.fn(),
  },
}))

function emitRuntime(next: Partial<RuntimeSlice>) {
  Object.assign(mocks.runtime, next)
  act(() => {
    runtimeListeners.forEach((listener) => listener())
  })
}

function makeRuntimeBatch(overrides: Partial<BatchInfo> = {}): BatchInfo {
  return {
    id: "pack_a",
    name: "Pack A",
    author: "Tester",
    version: "1.0.0",
    fileName: "pack-a.json",
    importTime: "2026-06-19T00:00:00.000Z",
    cardCount: 1,
    cardTypes: ["profession"],
    size: 100,
    disabled: false,
    cardIds: ["card_a"],
    ...overrides,
  }
}

function makeRuntimeCard(overrides: Partial<ExtendedStandardCard> = {}): ExtendedStandardCard {
  return {
    id: "card_a",
    name: "Card A",
    type: "profession",
    class: "Profession",
    standarized: true,
    cardSelectDisplay: {},
    batchId: "pack_a",
    ...overrides,
  } as ExtendedStandardCard
}

vi.mock("@/card/index", () => ({
  getAllBatches: () => Array.from(mocks.runtime.batches.values()),
  getCardsByBatchId: (batchId: string) => mocks.getCardsByBatchId(batchId),
  getStandardCardById: (cardId: string) => mocks.runtime.cards.get(cardId) ?? null,
  getCustomCardStats: () => ({
    totalCards: Array.from(mocks.runtime.batches.values()).reduce((total, batch) => total + batch.cardCount, 0),
    totalBatches: Array.from(mocks.runtime.batches.values()).filter((batch) => !batch.isSystemBatch).length,
    cardsByType: {},
    cardsByBatch: {},
    storageUsed: 0,
  }),
  importCustomCards: (...args: unknown[]) => mocks.importCustomCards(...args),
  removeCustomCardBatch: (batchId: string) => mocks.removeCustomCardBatch(batchId),
  toggleBatchDisabled: (batchId: string) => mocks.toggleBatchDisabled(batchId),
}))

vi.mock("@/character/storage/character-image-repository", () => ({
  clearAllCharacterImages: () => mocks.clearAllCharacterImages(),
}))

vi.mock("@/card/stores/unified-card-store", async () => {
  const React = await vi.importActual<typeof import("react")>("react")

  const useUnifiedCardStore = Object.assign(
    (selector?: (state: RuntimeSlice) => unknown) => {
      const [, setVersion] = React.useState(0)

      React.useEffect(() => {
        const listener = () => setVersion((version) => version + 1)
        runtimeListeners.add(listener)
        return () => {
          runtimeListeners.delete(listener)
        }
      }, [])

      return selector ? selector(mocks.runtime) : mocks.runtime
    },
    {
      getState: () => mocks.runtime,
    },
  )

  return { useUnifiedCardStore }
})

vi.mock("@/card/utils/dhcb-importer", () => ({
  importDhcbCardPackage: vi.fn(),
}))

vi.mock("@/components/content-pack-manager/import-content-pack", () => ({
  importContentPackFiles: vi.fn(),
}))

vi.mock("@/components/modals/view-cards-modal", () => ({
  ViewCardsModal: ({
    cards,
    isOpen,
    title,
  }: {
    cards: ExtendedStandardCard[]
    isOpen: boolean
    title: string
  }) =>
    isOpen ? (
      <div role="dialog" aria-label={title}>
        {cards.map((card) => (
          <div key={card.id}>{card.name}</div>
        ))}
      </div>
    ) : null,
}))

vi.mock("@/equipment/ui/equipment-ui-store", () => ({
  getEquipmentUiStore: () =>
    Object.assign(
      vi.fn((selector: (state: typeof mocks.equipmentState) => unknown) => selector(mocks.equipmentState)),
      {
        getState: () => mocks.equipmentState,
        subscribe: vi.fn(() => vi.fn()),
      },
    ),
}))

function expectStatValue(label: string, value: string) {
  const matchingLabel = screen
    .getAllByText(label)
    .find((element) => element.parentElement?.textContent?.includes(value))

  expect(matchingLabel?.parentElement?.textContent).toContain(value)
}

describe("CardManagerPage card lifecycle", () => {
  beforeEach(() => {
    runtimeListeners.clear()
    mocks.runtime.initialized = true
    mocks.runtime.batches = new Map([["pack_a", makeRuntimeBatch()]])
    mocks.runtime.cards = new Map([["card_a", makeRuntimeCard()]])
    mocks.runtime.initializeSystem.mockClear()
    mocks.runtime.resetSystem.mockClear()
    mocks.runtime.loadAllCards.mockReset()
    mocks.runtime.loadAllCards.mockImplementation(() => Array.from(mocks.runtime.cards.values()))
    mocks.runtime.getCardById.mockReset()
    mocks.runtime.getCardById.mockImplementation((cardId: string) => mocks.runtime.cards.get(cardId) ?? null)
    mocks.removeCustomCardBatch.mockReset()
    mocks.toggleBatchDisabled.mockReset()
    mocks.importCustomCards.mockReset()
    mocks.clearAllCharacterImages.mockReset()
    mocks.clearAllCharacterImages.mockResolvedValue(undefined)
    mocks.getCardsByBatchId.mockReset()
    mocks.getCardsByBatchId.mockImplementation((batchId: string) => {
      const batch = mocks.runtime.batches.get(batchId)
      if (!batch || batch.disabled) return []
      return batch.cardIds
        .map((cardId) => mocks.runtime.cards.get(cardId))
        .filter((card): card is ExtendedStandardCard => Boolean(card))
    })
    mocks.equipmentState.ensureInitialized.mockClear()
    mocks.equipmentState.getPackSummaries.mockReset()
    mocks.equipmentState.getPackSummaries.mockReturnValue([])
    mocks.equipmentState.getPackDetail.mockReset()
    mocks.equipmentState.getPackDetail.mockReturnValue(undefined)
    mocks.equipmentState.refreshFromStorage.mockClear()
    mocks.equipmentState.removePack.mockReset()
    mocks.equipmentState.setPackDisabled.mockReset()
    mocks.equipmentState.importPackFromFile.mockReset()
    vi.spyOn(window, "confirm").mockReturnValue(true)
    vi.spyOn(window, "alert").mockImplementation(() => undefined)
    vi.spyOn(console, "error").mockImplementation(() => undefined)
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("successful delete calls removeCustomCardBatch, refreshes list so Pack A disappears, and updates visible stats", async () => {
    mocks.removeCustomCardBatch.mockImplementation(async () => {
      emitRuntime({
        batches: new Map(),
        cards: new Map(),
      })
      return true
    })

    render(<CardManagerPage />)

    await screen.findAllByText("Pack A")
    await userEvent.click(screen.getAllByRole("button", { name: "删除卡牌包" })[0])

    expect(window.confirm).toHaveBeenCalledWith("确定要删除这个卡牌包吗？这将删除卡牌包中的所有卡牌。")
    expect(mocks.removeCustomCardBatch).toHaveBeenCalledWith("pack_a")
    await waitFor(() => expect(screen.queryAllByText("Pack A")).toHaveLength(0))
    expect(window.alert).toHaveBeenCalledWith("卡牌包删除成功")
    expectStatValue("卡牌包", "0/0")
    expectStatValue("卡牌", "0")
  })

  it("failed delete keeps Pack A visible and alerts failure", async () => {
    mocks.removeCustomCardBatch.mockResolvedValue(false)

    render(<CardManagerPage />)

    await screen.findAllByText("Pack A")
    await userEvent.click(screen.getAllByRole("button", { name: "删除卡牌包" })[0])

    expect(mocks.removeCustomCardBatch).toHaveBeenCalledWith("pack_a")
    expect(window.alert).toHaveBeenCalledWith("卡牌包删除失败")
    const table = await screen.findByTestId("card-pack-desktop-table")
    expect(within(table).getByText("Pack A")).toBeTruthy()
    expectStatValue("卡牌包", "1/1")
    expectStatValue("卡牌", "1")
  })

  it("successful toggle calls toggleBatchDisabled, refreshes visible disabled status, and updates visible stats", async () => {
    mocks.toggleBatchDisabled.mockImplementation(async () => {
      emitRuntime({
        batches: new Map([["pack_a", makeRuntimeBatch({ disabled: true })]]),
      })
      return true
    })

    render(<CardManagerPage />)

    await screen.findAllByText("Pack A")
    await userEvent.click(screen.getAllByRole("button", { name: "禁用卡牌包" })[0])

    expect(mocks.toggleBatchDisabled).toHaveBeenCalledWith("pack_a")
    const table = await screen.findByTestId("card-pack-desktop-table")
    await waitFor(() => expect(within(table).getByText("已禁用")).toBeTruthy())
    expectStatValue("卡牌包", "0/1")
    expectStatValue("卡牌", "1")
    expect(screen.getByRole("button", { name: /查看所有卡牌\s+0/ })).toBeTruthy()
  })

  it("updates an open card view when runtime cards for the source change", async () => {
    render(<CardManagerPage />)

    await screen.findAllByText("Pack A")
    await userEvent.click(screen.getAllByRole("button", { name: "查看卡牌包" })[0])
    expect(await screen.findByText("Card A")).toBeTruthy()

    emitRuntime({
      batches: new Map([["pack_a", makeRuntimeBatch({ cardIds: ["card_b"] })]]),
      cards: new Map([["card_b", makeRuntimeCard({ id: "card_b", name: "Card B" })]]),
    })

    await waitFor(() => expect(screen.getByText("Card B")).toBeTruthy())
    expect(screen.queryByText("Card A")).toBeNull()
  })

  it("continues full reset when character image cleanup fails", async () => {
    mocks.clearAllCharacterImages.mockRejectedValue(new Error("idb cleanup failed"))
    localStorage.setItem("dh_character_bad", "{}")

    render(<CardManagerPage />)

    await userEvent.click(screen.getByRole("button", { name: "强制初始化所有数据" }))

    await waitFor(() => expect(mocks.runtime.resetSystem).toHaveBeenCalledTimes(1))
    expect(mocks.clearAllCharacterImages).toHaveBeenCalledTimes(1)
    expect(localStorage.getItem("dh_character_bad")).toBeNull()
    expect(mocks.runtime.initializeSystem).toHaveBeenCalled()
    expect(mocks.equipmentState.refreshFromStorage).toHaveBeenCalled()
    expect(window.alert).toHaveBeenCalledWith("所有本地数据已清空。页面将自动刷新。")
    expect(console.error).toHaveBeenCalledWith(
      "清空角色图片缓存失败，将继续清空其他本地数据:",
      expect.any(Error),
    )
  })
})
