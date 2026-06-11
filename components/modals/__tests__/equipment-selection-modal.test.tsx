import "@testing-library/jest-dom/vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { WeaponSelectionModal } from "../weapon-selection-modal"
import { ArmorSelectionModal } from "../armor-selection-modal"
import type { RuntimeEquipmentTemplateWithSource } from "@/equipment/ui/types"

const weapon: RuntimeEquipmentTemplateWithSource & { kind: "weapon" } = {
  kind: "weapon",
  id: "builtin.weapon.test",
  name: "测试长剑",
  tier: "T1",
  weaponType: "primary",
  trait: "strength",
  damageType: "physical",
  range: "melee",
  burden: "oneHanded",
  damage: "d8",
  featureName: "可靠",
  description: "稳定可靠。",
  modifierContributions: [],
  sourceId: "builtin",
  sourceLabel: "内置",
}

const weaponWithModifier: RuntimeEquipmentTemplateWithSource & { kind: "weapon" } = {
  ...weapon,
  id: "builtin.weapon.tower-shield",
  name: "测试塔盾",
  weaponType: "secondary",
  burden: "offHand",
  damage: "d6",
  featureName: "壁垒",
  description: "+2 护甲值，-1 闪避值",
  modifierContributions: [
    {
      id: "armor",
      definition: { target: "armorMax", kind: "modifier" },
      editable: { label: "壁垒", value: 2 },
    },
    {
      id: "evasion",
      definition: { target: "evasion", kind: "modifier" },
      editable: { label: "壁垒", value: -1 },
    },
  ],
}

const customWeapon: RuntimeEquipmentTemplateWithSource & { kind: "weapon" } = {
  ...weapon,
  id: "custom.weapon.test",
  name: "导入短剑",
  tier: "T2",
  sourceId: "pack_custom",
  sourceLabel: "导入装备包",
}

const armor: RuntimeEquipmentTemplateWithSource & { kind: "armor" } = {
  kind: "armor",
  id: "builtin.armor.test",
  name: "测试链甲",
  tier: "T1",
  baseThresholds: { minor: 5, major: 10 },
  baseArmorMax: 3,
  featureName: "坚固",
  description: "稳定可靠。",
  modifierContributions: [],
  sourceId: "builtin",
  sourceLabel: "内置",
}

const armorWithModifier: RuntimeEquipmentTemplateWithSource & { kind: "armor" } = {
  ...armor,
  id: "builtin.armor.guardian",
  name: "测试守护甲",
  baseThresholds: { minor: 7, major: 14 },
  baseArmorMax: 4,
  featureName: "守护",
  description: "+1 护甲值，-1 闪避值",
  modifierContributions: [
    {
      id: "armor",
      definition: { target: "armorMax", kind: "modifier" },
      editable: { label: "守护", value: 1 },
    },
    {
      id: "evasion",
      definition: { target: "evasion", kind: "modifier" },
      editable: { label: "守护", value: -1 },
    },
  ],
}

const customArmor: RuntimeEquipmentTemplateWithSource & { kind: "armor" } = {
  ...armor,
  id: "custom.armor.test",
  name: "导入护甲",
  tier: "T2",
  sourceId: "pack_custom",
  sourceLabel: "导入装备包",
}

const storeState = {
  initialized: true,
  initializing: false,
  initializationError: null as null | { severity: "error"; code: string; path: string; message: string },
  ensureInitialized: vi.fn(async () => undefined),
  refreshFromStorage: vi.fn(async () => undefined),
  querySelectableTemplates: vi.fn(
    (criteria?: {
      kind?: "weapon" | "armor"
      sourceIds?: string[]
      tiers?: string[]
      weaponTypes?: string[]
      traits?: string[]
      damageTypes?: string[]
      ranges?: string[]
      burdens?: string[]
    }) => {
      const base =
        criteria?.kind === "armor" ? [armor, armorWithModifier, customArmor] : [weapon, weaponWithModifier, customWeapon]
      return base.filter((template) => {
        if (criteria?.sourceIds?.length && !criteria.sourceIds.includes(template.sourceId)) return false
        if (criteria?.tiers?.length && !criteria.tiers.includes(template.tier)) return false
        return true
      })
    },
  ),
}

const expectLastWeaponQuery = (criteria: Record<string, unknown>) => {
  expect(storeState.querySelectableTemplates).toHaveBeenCalledWith(expect.objectContaining({ kind: "weapon", ...criteria }))
}

vi.mock("@/equipment/ui/equipment-ui-store", () => ({
  getEquipmentUiStore: () => ((selector: (state: typeof storeState) => unknown) => selector(storeState)),
}))

describe("equipment selection modals", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    storeState.initialized = true
    storeState.initializing = false
    storeState.initializationError = null
  })

  it("renders weapon source filter and selects a runtime weapon template", async () => {
    const onSelect = vi.fn()
    render(
      <WeaponSelectionModal
        isOpen
        onClose={vi.fn()}
        onSelect={onSelect}
        title="选择主武器"
        weaponSlotType="primary"
      />,
    )

    expect(storeState.ensureInitialized).toHaveBeenCalledTimes(1)
    expect(screen.getByRole("button", { name: "来源筛选" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "+ 自定义武器" })).toBeInTheDocument()

    await userEvent.click(screen.getByText("测试长剑"))
    expect(onSelect).toHaveBeenCalledWith({ type: "template", template: weapon })
  })

  it("selects a runtime weapon template from the keyboard", async () => {
    const onSelect = vi.fn()
    render(
      <WeaponSelectionModal
        isOpen
        onClose={vi.fn()}
        onSelect={onSelect}
        title="选择主武器"
        weaponSlotType="primary"
      />,
    )

    const row = screen.getByRole("button", { name: /测试长剑/ })
    row.focus()
    await userEvent.keyboard("{Enter}")

    expect(onSelect).toHaveBeenCalledWith({ type: "template", template: weapon })
  })

  it("fills a custom weapon draft from a clicked template instead of selecting immediately", async () => {
    const onSelect = vi.fn()
    render(
      <WeaponSelectionModal
        isOpen
        onClose={vi.fn()}
        onSelect={onSelect}
        title="选择备用武器"
        weaponSlotType="inventory"
      />,
    )

    await userEvent.click(screen.getByRole("button", { name: "+ 自定义武器" }))
    expect(screen.getAllByText(/自定义模式/).length).toBeGreaterThan(0)

    await userEvent.click(screen.getByText("测试塔盾"))

    expect(onSelect).not.toHaveBeenCalled()
    expect(screen.getByDisplayValue("测试塔盾")).toBeInTheDocument()
    expect(screen.getByDisplayValue("+2 护甲值，-1 闪避值")).toBeInTheDocument()
    expect(screen.getByDisplayValue("2")).toBeInTheDocument()
    expect(screen.getByDisplayValue("-1")).toBeInTheDocument()
  })

  it("fills a custom weapon draft from the keyboard instead of selecting immediately", async () => {
    const onSelect = vi.fn()
    render(
      <WeaponSelectionModal
        isOpen
        onClose={vi.fn()}
        onSelect={onSelect}
        title="选择备用武器"
        weaponSlotType="inventory"
      />,
    )

    await userEvent.click(screen.getByRole("button", { name: "+ 自定义武器" }))
    const row = screen.getByRole("button", { name: /测试塔盾/ })
    row.focus()
    await userEvent.keyboard("{Enter}")

    expect(onSelect).not.toHaveBeenCalled()
    expect(screen.getByDisplayValue("测试塔盾")).toBeInTheDocument()
  })

  it("saves a custom weapon draft with modifier rows", async () => {
    const onSelect = vi.fn()
    render(
      <WeaponSelectionModal
        isOpen
        onClose={vi.fn()}
        onSelect={onSelect}
        title="选择备用武器"
        weaponSlotType="inventory"
      />,
    )

    await userEvent.click(screen.getByRole("button", { name: "+ 自定义武器" }))
    await userEvent.click(screen.getByText("测试塔盾"))
    await userEvent.clear(screen.getByLabelText("名称"))
    await userEvent.type(screen.getByLabelText("名称"), "改造塔盾")
    await userEvent.click(screen.getByRole("button", { name: "保存并选择" }))

    expect(onSelect).toHaveBeenCalledWith({
      type: "custom",
      draft: expect.objectContaining({
        name: "改造塔盾",
        weaponType: "secondary",
        modifierContributions: [
          expect.objectContaining({
            definition: { target: "armorMax", kind: "modifier" },
            editable: { label: "壁垒", value: 2 },
          }),
          expect.objectContaining({
            definition: { target: "evasion", kind: "modifier" },
            editable: { label: "壁垒", value: -1 },
          }),
        ],
      }),
    })
  })

  it("confirms before closing a dirty custom weapon draft", async () => {
    const onClose = vi.fn()
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false)
    render(
      <WeaponSelectionModal
        isOpen
        onClose={onClose}
        onSelect={vi.fn()}
        title="选择备用武器"
        weaponSlotType="inventory"
      />,
    )

    await userEvent.click(screen.getByRole("button", { name: "+ 自定义武器" }))
    await userEvent.type(screen.getByLabelText("名称"), "改造塔盾")
    await userEvent.click(screen.getByRole("button", { name: "关闭" }))

    expect(confirmSpy).toHaveBeenCalledWith("退出会丢弃当前自定义草稿。")
    expect(onClose).not.toHaveBeenCalled()
    confirmSpy.mockRestore()
  })

  it("confirms before clearing a dirty custom weapon draft", async () => {
    const onSelect = vi.fn()
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false)
    render(
      <WeaponSelectionModal
        isOpen
        onClose={vi.fn()}
        onSelect={onSelect}
        title="选择备用武器"
        weaponSlotType="inventory"
      />,
    )

    await userEvent.click(screen.getByRole("button", { name: "+ 自定义武器" }))
    await userEvent.type(screen.getByLabelText("名称"), "改造塔盾")
    await userEvent.click(screen.getByRole("button", { name: "清除选择" }))

    expect(confirmSpy).toHaveBeenCalledWith("退出会丢弃当前自定义草稿。")
    expect(onSelect).not.toHaveBeenCalled()
    confirmSpy.mockRestore()
  })

  it("uses canonical weapon filter values when querying runtime templates", async () => {
    render(
      <WeaponSelectionModal
        isOpen
        onClose={vi.fn()}
        onSelect={vi.fn()}
        title="选择备用武器"
        weaponSlotType="inventory"
      />,
    )

    await userEvent.click(screen.getByRole("button", { name: "属性筛选" }))
    await userEvent.click(screen.getByRole("menuitemcheckbox", { name: /力量/ }))
    await userEvent.keyboard("{Escape}")
    await userEvent.click(screen.getByRole("button", { name: "伤害类型筛选" }))
    await userEvent.click(screen.getByRole("menuitemcheckbox", { name: /物理/ }))
    await userEvent.keyboard("{Escape}")
    await userEvent.click(screen.getByRole("button", { name: "负荷筛选" }))
    await userEvent.click(screen.getByRole("menuitemcheckbox", { name: /单手/ }))
    await userEvent.keyboard("{Escape}")
    await userEvent.click(screen.getByRole("button", { name: "来源筛选" }))
    await userEvent.click(screen.getByRole("menuitemcheckbox", { name: "内置" }))

    expectLastWeaponQuery({
      traits: ["strength"],
      damageTypes: ["physical"],
      burdens: ["oneHanded"],
      sourceIds: ["builtin"],
    })
  })

  it("filters weapons by multiple runtime sources without closing the menu", async () => {
    render(
      <WeaponSelectionModal
        isOpen
        onClose={vi.fn()}
        onSelect={vi.fn()}
        title="选择备用武器"
        weaponSlotType="inventory"
      />,
    )

    await userEvent.click(screen.getByRole("button", { name: "来源筛选" }))
    await userEvent.click(screen.getByRole("menuitemcheckbox", { name: "内置" }))
    await userEvent.click(screen.getByRole("menuitemcheckbox", { name: "导入装备包" }))

    expect(screen.getByText("来源：内置、导入装备包")).toBeInTheDocument()
    expectLastWeaponQuery({ sourceIds: ["builtin", "pack_custom"] })
  })

  it("filters weapons by multiple tiers", async () => {
    render(
      <WeaponSelectionModal
        isOpen
        onClose={vi.fn()}
        onSelect={vi.fn()}
        title="选择备用武器"
        weaponSlotType="inventory"
      />,
    )

    await userEvent.click(screen.getByRole("button", { name: "等级筛选" }))
    await userEvent.click(screen.getByRole("menuitemcheckbox", { name: "T1" }))
    await userEvent.click(screen.getByRole("menuitemcheckbox", { name: "T2" }))

    expect(screen.getByText("等级：T1、T2")).toBeInTheDocument()
    expectLastWeaponQuery({ tiers: ["T1", "T2"] })
  })

  it("renders armor source filter and clears with structured none input", async () => {
    const onSelect = vi.fn()
    render(<ArmorSelectionModal isOpen onClose={vi.fn()} onSelect={onSelect} title="选择护甲" />)

    expect(screen.getByRole("button", { name: "来源筛选" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "+ 自定义护甲" })).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "来源筛选" }))
    expect(screen.getByRole("menuitemcheckbox", { name: "内置" })).toBeInTheDocument()
    expect(screen.getByRole("menuitemcheckbox", { name: "导入装备包" })).toBeInTheDocument()
    await userEvent.keyboard("{Escape}")

    await userEvent.click(screen.getByRole("button", { name: "清除选择" }))
    expect(onSelect).toHaveBeenCalledWith({ type: "none" })
  })

  it("filters armor by multiple runtime sources and tiers", async () => {
    render(<ArmorSelectionModal isOpen onClose={vi.fn()} onSelect={vi.fn()} title="选择护甲" />)

    await userEvent.click(screen.getByRole("button", { name: "来源筛选" }))
    await userEvent.click(screen.getByRole("menuitemcheckbox", { name: "内置" }))
    await userEvent.click(screen.getByRole("menuitemcheckbox", { name: "导入装备包" }))
    await userEvent.keyboard("{Escape}")

    await userEvent.click(screen.getByRole("button", { name: "等级筛选" }))
    await userEvent.click(screen.getByRole("menuitemcheckbox", { name: "T1" }))
    await userEvent.click(screen.getByRole("menuitemcheckbox", { name: "T2" }))

    expect(screen.getByText("来源：内置、导入装备包")).toBeInTheDocument()
    expect(screen.getByText("等级：T1、T2")).toBeInTheDocument()
    expect(storeState.querySelectableTemplates).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "armor",
        sourceIds: ["builtin", "pack_custom"],
        tiers: ["T1", "T2"],
      }),
    )
  })

  it("filters armor by multiple tiers", async () => {
    render(<ArmorSelectionModal isOpen onClose={vi.fn()} onSelect={vi.fn()} title="选择护甲" />)

    await userEvent.click(screen.getByRole("button", { name: "等级筛选" }))
    await userEvent.click(screen.getByRole("menuitemcheckbox", { name: "T1" }))
    await userEvent.click(screen.getByRole("menuitemcheckbox", { name: "T2" }))

    expect(screen.getByText("等级：T1、T2")).toBeInTheDocument()
    expect(storeState.querySelectableTemplates).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "armor",
        tiers: ["T1", "T2"],
      }),
    )
  })

  it("fills a custom armor draft from a clicked template instead of selecting immediately", async () => {
    const onSelect = vi.fn()
    render(<ArmorSelectionModal isOpen onClose={vi.fn()} onSelect={onSelect} title="选择护甲" />)

    await userEvent.click(screen.getByRole("button", { name: "+ 自定义护甲" }))
    expect(screen.getAllByText(/自定义模式/).length).toBeGreaterThan(0)
    expect(screen.getByText("点击下方装备只填入草稿，不立即写入角色表。")).toBeInTheDocument()

    await userEvent.click(screen.getByText("测试守护甲"))

    expect(onSelect).not.toHaveBeenCalled()
    expect(screen.getByDisplayValue("测试守护甲")).toBeInTheDocument()
    expect(screen.getByDisplayValue("4")).toBeInTheDocument()
    expect(screen.getByDisplayValue("7")).toBeInTheDocument()
    expect(screen.getByDisplayValue("14")).toBeInTheDocument()
    expect(screen.getByDisplayValue("+1 护甲值，-1 闪避值")).toBeInTheDocument()
    expect(screen.getByDisplayValue("1")).toBeInTheDocument()
    expect(screen.getByDisplayValue("-1")).toBeInTheDocument()
  })

  it("fills a custom armor draft from the keyboard instead of selecting immediately", async () => {
    const onSelect = vi.fn()
    render(<ArmorSelectionModal isOpen onClose={vi.fn()} onSelect={onSelect} title="选择护甲" />)

    await userEvent.click(screen.getByRole("button", { name: "+ 自定义护甲" }))
    const row = screen.getByRole("button", { name: /测试守护甲/ })
    row.focus()
    await userEvent.keyboard("{Enter}")

    expect(onSelect).not.toHaveBeenCalled()
    expect(screen.getByDisplayValue("测试守护甲")).toBeInTheDocument()
  })

  it("saves a custom armor draft with thresholds and modifier rows", async () => {
    const onSelect = vi.fn()
    render(<ArmorSelectionModal isOpen onClose={vi.fn()} onSelect={onSelect} title="选择护甲" />)

    await userEvent.click(screen.getByRole("button", { name: "+ 自定义护甲" }))
    await userEvent.click(screen.getByText("测试守护甲"))
    await userEvent.clear(screen.getByLabelText("名称"))
    await userEvent.type(screen.getByLabelText("名称"), "改造守护甲")
    await userEvent.click(screen.getByRole("button", { name: "保存并选择" }))

    expect(onSelect).toHaveBeenCalledWith({
      type: "custom",
      draft: expect.objectContaining({
        name: "改造守护甲",
        baseArmorMax: 4,
        baseThresholds: { minor: 7, major: 14 },
        modifierContributions: [
          expect.objectContaining({
            definition: { target: "armorMax", kind: "modifier" },
            editable: { label: "守护", value: 1 },
          }),
          expect.objectContaining({
            definition: { target: "evasion", kind: "modifier" },
            editable: { label: "守护", value: -1 },
          }),
        ],
      }),
    })
  })

  it("confirms before clearing a dirty custom armor draft", async () => {
    const onSelect = vi.fn()
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false)
    render(<ArmorSelectionModal isOpen onClose={vi.fn()} onSelect={onSelect} title="选择护甲" />)

    await userEvent.click(screen.getByRole("button", { name: "+ 自定义护甲" }))
    await userEvent.type(screen.getByLabelText("名称"), "改造守护甲")
    await userEvent.click(screen.getByRole("button", { name: "清除选择" }))

    expect(confirmSpy).toHaveBeenCalledWith("退出会丢弃当前自定义草稿。")
    expect(onSelect).not.toHaveBeenCalled()
    confirmSpy.mockRestore()
  })

  it("shows initialization failure, no equipment rows, and retries initialization", async () => {
    storeState.initialized = false
    storeState.initializationError = {
      severity: "error",
      code: "RUNTIME_CACHE_BUILD_FAILED",
      path: "",
      message: "runtime failed",
    }

    render(<ArmorSelectionModal isOpen onClose={vi.fn()} onSelect={vi.fn()} title="选择护甲" />)

    expect(screen.getByText(/装备数据初始化失败/)).toBeInTheDocument()
    expect(screen.queryByText("测试链甲")).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "重试" }))
    expect(storeState.refreshFromStorage).toHaveBeenCalledTimes(1)
    expect(storeState.ensureInitialized).toHaveBeenCalledTimes(1)
  })
})
