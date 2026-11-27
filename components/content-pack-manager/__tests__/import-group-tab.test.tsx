import "@testing-library/jest-dom/vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { buildImportGroupViews, ImportGroupTab, type ImportGroupView } from "../import-group-tab"

const sampleGroup: ImportGroupView = {
  groupId: "group_1",
  name: "神州战役整合包",
  sourceFileName: "神州战役整合包.zip",
  importedAt: "2026-11-28T00:00:00.000Z",
  status: "partial",
  cardPackCount: 1,
  equipmentPackCount: 1,
  totalCardCount: 12,
  totalWeaponCount: 4,
  totalArmorCount: 2,
  members: [
    {
      kind: "card",
      packId: "batch_1",
      name: "神州职业包",
      disabled: false,
      summary: "12 张卡牌",
      sourceLabel: "导入文件：cards/职业.json",
      canView: true,
      canDisable: true,
      canRemove: true,
    },
    {
      kind: "equipment",
      packId: "equip_1",
      name: "神州兵器谱",
      disabled: true,
      summary: "4 武器 / 2 护甲",
      sourceLabel: "equipment/weapons.json",
      canView: true,
      canDisable: true,
      canRemove: true,
    },
  ],
}

describe("ImportGroupTab", () => {
  it("builds group views with accurate aggregate status and skips stale pack references", () => {
    const views = buildImportGroupViews({
      groups: [
        {
          groupId: "group_1",
          name: "测试分组",
          sourceFileName: "test.zip",
          importedAt: "2026-11-28T00:00:00.000Z",
          members: [
            { kind: "card", packId: "batch_1" },
            { kind: "card", packId: "missing_batch" },
            { kind: "equipment", packId: "equip_1" },
          ],
        },
      ],
      cardPacks: [
        {
          sourceId: "batch_1",
          name: "卡包一",
          author: "",
          version: "",
          fileName: "c.json",
          importTime: "2026-11-28T00:00:00.000Z",
          cardCount: 5,
          cardTypes: ["domain"],
          disabled: false,
          sourceLabel: "导入文件：c.json",
          canDisable: true,
          canRemove: true,
          canViewCards: true,
        },
      ],
      equipmentPacks: [
        {
          packId: "equip_1",
          name: "装备一",
          author: "Tester",
          importedAt: "2026-11-28T00:00:00.000Z",
          disabled: true,
          sourceLabel: "e.json",
          weaponCount: 2,
          armorCount: 1,
          categoryBadges: ["主武器", "护甲"],
          canDisable: true,
          canRemove: true,
        },
      ],
    })

    expect(views).toHaveLength(1)
    expect(views[0].status).toBe("partial")
    expect(views[0].members).toHaveLength(2)
    expect(views[0].totalCardCount).toBe(5)
    expect(views[0].totalWeaponCount).toBe(2)
  })

  it("renders group batch actions, inline rename, and individual member actions", async () => {
    const onRenameGroup = vi.fn()
    const onSetGroupDisabled = vi.fn()
    const onRemoveGroup = vi.fn()
    const onViewCardPack = vi.fn()
    const onToggleCardPack = vi.fn()
    const onRemoveCardPack = vi.fn()
    const onViewEquipmentPack = vi.fn()
    const onToggleEquipmentPack = vi.fn()
    const onRemoveEquipmentPack = vi.fn()

    render(
      <ImportGroupTab
        groups={[sampleGroup]}
        onRenameGroup={onRenameGroup}
        onSetGroupDisabled={onSetGroupDisabled}
        onRemoveGroup={onRemoveGroup}
        onViewCardPack={onViewCardPack}
        onToggleCardPack={onToggleCardPack}
        onRemoveCardPack={onRemoveCardPack}
        onViewEquipmentPack={onViewEquipmentPack}
        onToggleEquipmentPack={onToggleEquipmentPack}
        onRemoveEquipmentPack={onRemoveEquipmentPack}
      />,
    )

    expect(screen.getByText("神州战役整合包")).toBeInTheDocument()
    expect(screen.getByText("神州职业包")).toBeInTheDocument()
    expect(screen.getByText("神州兵器谱")).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "全部启用" }))
    expect(onSetGroupDisabled).toHaveBeenCalledWith("group_1", false)

    await userEvent.click(screen.getByRole("button", { name: "全部禁用" }))
    expect(onSetGroupDisabled).toHaveBeenCalledWith("group_1", true)

    await userEvent.click(screen.getByRole("button", { name: "删除整组" }))
    expect(onRemoveGroup).toHaveBeenCalledWith("group_1")

    await userEvent.click(screen.getByRole("button", { name: "重命名整合包 神州战役整合包" }))
    const renameInput = screen.getByLabelText("编辑整合包名称")
    await userEvent.clear(renameInput)
    await userEvent.type(renameInput, "第一季整合包")
    await userEvent.click(screen.getByRole("button", { name: "保存整合包名称" }))
    expect(onRenameGroup).toHaveBeenCalledWith("group_1", "第一季整合包")

    await userEvent.click(screen.getByRole("button", { name: "查看卡牌包 神州职业包" }))
    expect(onViewCardPack).toHaveBeenCalledWith("batch_1")

    await userEvent.click(screen.getByRole("button", { name: "启用装备包 神州兵器谱" }))
    expect(onToggleEquipmentPack).toHaveBeenCalledWith("equip_1", false)

    await userEvent.click(screen.getByRole("button", { name: "删除装备包 神州兵器谱" }))
    expect(onRemoveEquipmentPack).toHaveBeenCalledWith("equip_1")
  })

  it("filters groups by search query and status", async () => {
    render(
      <ImportGroupTab
        groups={[
          sampleGroup,
          {
            ...sampleGroup,
            groupId: "group_2",
            name: "暗黑战役",
            sourceFileName: "dark.zip",
            status: "enabled",
            members: [
              {
                ...sampleGroup.members[0],
                packId: "batch_2",
                name: "暗黑职业",
              },
            ],
          },
        ]}
        onRenameGroup={vi.fn()}
        onSetGroupDisabled={vi.fn()}
        onRemoveGroup={vi.fn()}
        onViewCardPack={vi.fn()}
        onToggleCardPack={vi.fn()}
        onRemoveCardPack={vi.fn()}
        onViewEquipmentPack={vi.fn()}
        onToggleEquipmentPack={vi.fn()}
        onRemoveEquipmentPack={vi.fn()}
      />,
    )

    await userEvent.type(screen.getByPlaceholderText("搜索整合包名、压缩包名或包内内容"), "兵器谱")
    expect(screen.getByText("神州战役整合包")).toBeInTheDocument()
    expect(screen.queryByText("暗黑战役")).not.toBeInTheDocument()
  })

  it("renders storage error banner instead of empty state when group index fails to load", () => {
    render(
      <ImportGroupTab
        groups={[]}
        storageError="Content pack group index contains invalid JSON."
        onRetryLoad={vi.fn()}
        onRenameGroup={vi.fn()}
        onSetGroupDisabled={vi.fn()}
        onRemoveGroup={vi.fn()}
        onViewCardPack={vi.fn()}
        onToggleCardPack={vi.fn()}
        onRemoveCardPack={vi.fn()}
        onViewEquipmentPack={vi.fn()}
        onToggleEquipmentPack={vi.fn()}
        onRemoveEquipmentPack={vi.fn()}
      />,
    )

    expect(screen.getByRole("alert")).toHaveTextContent("Content pack group index contains invalid JSON.")
    expect(screen.queryByText(/暂无整合包/)).not.toBeInTheDocument()
  })
})
