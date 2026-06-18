import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import CardManagerPage from "../page"

type MockBatch = {
  id: string
  name: string
  author: string
  version: string
  fileName: string
  importTime: string
  cardCount: number
  cardTypes: string[]
  disabled: boolean
  isSystemBatch: boolean
}

const mocks = vi.hoisted(() => ({
  batches: [] as MockBatch[],
  removeCustomCardBatch: vi.fn(),
  toggleBatchDisabled: vi.fn(),
  importCustomCards: vi.fn(),
  getCardsByBatchId: vi.fn(() => []),
  initializeSystem: vi.fn(async () => ({ initialized: true })),
  loadAllCards: vi.fn(() => []),
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

vi.mock("@/card/index", () => ({
  getAllBatches: () => mocks.batches,
  getCardsByBatchId: (...args: unknown[]) => mocks.getCardsByBatchId(...args),
  getCustomCardStats: () => ({
    totalCards: mocks.batches.reduce((total, batch) => total + batch.cardCount, 0),
    totalBatches: mocks.batches.filter((batch) => !batch.isSystemBatch).length,
    cardsByType: {},
    cardsByBatch: {},
    storageUsed: 0,
  }),
  importCustomCards: (...args: unknown[]) => mocks.importCustomCards(...args),
  removeCustomCardBatch: (...args: unknown[]) => mocks.removeCustomCardBatch(...args),
  toggleBatchDisabled: (...args: unknown[]) => mocks.toggleBatchDisabled(...args),
}))

vi.mock("@/card/stores/unified-card-store", () => ({
  useUnifiedCardStore: {
    getState: () => ({
      initialized: true,
      initializeSystem: mocks.initializeSystem,
      loadAllCards: mocks.loadAllCards,
    }),
  },
}))

vi.mock("@/card/utils/dhcb-importer", () => ({
  importDhcbCardPackage: vi.fn(),
}))

vi.mock("@/components/content-pack-manager/import-content-pack", () => ({
  importContentPackFiles: vi.fn(),
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

function packA(overrides: Partial<MockBatch> = {}): MockBatch {
  return {
    id: "pack_a",
    name: "Pack A",
    author: "Tester",
    version: "1.0.0",
    fileName: "pack-a.json",
    importTime: "2026-06-19T00:00:00.000Z",
    cardCount: 1,
    cardTypes: ["profession"],
    disabled: false,
    isSystemBatch: false,
    ...overrides,
  }
}

function expectStatValue(label: string, value: string) {
  const matchingLabel = screen
    .getAllByText(label)
    .find((element) => element.parentElement?.textContent?.includes(value))

  expect(matchingLabel?.parentElement?.textContent).toContain(value)
}

describe("CardManagerPage card lifecycle", () => {
  beforeEach(() => {
    mocks.batches = [packA()]
    mocks.removeCustomCardBatch.mockReset()
    mocks.toggleBatchDisabled.mockReset()
    mocks.importCustomCards.mockReset()
    mocks.getCardsByBatchId.mockReset()
    mocks.getCardsByBatchId.mockReturnValue([])
    mocks.initializeSystem.mockClear()
    mocks.loadAllCards.mockReset()
    mocks.loadAllCards.mockReturnValue([])
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
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("successful delete calls removeCustomCardBatch, refreshes list so Pack A disappears, and updates visible stats", async () => {
    mocks.removeCustomCardBatch.mockImplementation(async () => {
      mocks.batches = []
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
      mocks.batches = mocks.batches.map((batch) => (batch.id === "pack_a" ? { ...batch, disabled: true } : batch))
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
})
