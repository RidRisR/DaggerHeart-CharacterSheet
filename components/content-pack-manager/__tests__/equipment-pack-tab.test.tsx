import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { EquipmentPackTab } from "../equipment-pack-tab"

describe("EquipmentPackTab", () => {
  it("shows unified row content and exposes icon actions", async () => {
    const onView = vi.fn()
    const onToggleDisabled = vi.fn()
    const onRemove = vi.fn()

    render(
      <EquipmentPackTab
        packs={[{
          packId: "dh-equipment-pack-test",
          name: "测试装备包",
          author: "Tester",
          contentVersion: "1.0.0",
          importedAt: "2026-06-06T00:00:00.000Z",
          disabled: false,
          sourceLabel: "test.json",
          weaponCount: 2,
          armorCount: 1,
          categoryBadges: ["主武器", "副手", "护甲"],
          canDisable: true,
          canRemove: true,
        }]}
        initializationError={null}
        onRetryInitialize={vi.fn()}
        onView={onView}
        onToggleDisabled={onToggleDisabled}
        onRemove={onRemove}
      />,
    )

    expect(screen.getAllByText("测试装备包")[0]).toBeTruthy()
    expect(screen.getAllByText("2 武器 / 1 护甲")[0]).toBeTruthy()
    expect(screen.getAllByText("导入文件：test.json")[0]).toBeTruthy()
    expect(screen.getAllByRole("button", { name: "3 类别" })[0].getAttribute("title")).toBe("主武器 / 副手 / 护甲")

    await userEvent.click(screen.getAllByRole("button", { name: "查看装备包" })[0])
    expect(onView).toHaveBeenCalledWith("dh-equipment-pack-test")

    await userEvent.click(screen.getAllByRole("button", { name: "禁用装备包" })[0])
    expect(onToggleDisabled).toHaveBeenCalledWith("dh-equipment-pack-test", true)

    await userEvent.click(screen.getAllByRole("button", { name: "删除装备包" })[0])
    expect(onRemove).toHaveBeenCalledWith("dh-equipment-pack-test")
  })

  it("renders compact mobile cards separately from the desktop table", () => {
    render(
      <EquipmentPackTab
        packs={[{
          packId: "dh-equipment-pack-test",
          name: "测试装备包",
          author: "Tester",
          contentVersion: "1.0.0",
          importedAt: "2026-06-06T00:00:00.000Z",
          disabled: false,
          sourceLabel: "test.json",
          weaponCount: 2,
          armorCount: 1,
          categoryBadges: ["主武器", "副手", "护甲"],
          canDisable: true,
          canRemove: true,
        }]}
        initializationError={null}
        onRetryInitialize={vi.fn()}
        onView={vi.fn()}
        onToggleDisabled={vi.fn()}
        onRemove={vi.fn()}
      />,
    )

    expect(screen.getByTestId("equipment-pack-mobile-list")).toBeTruthy()
    expect(screen.getByTestId("equipment-pack-desktop-table")).toBeTruthy()
  })

  it("allows builtin equipment toggle but keeps delete disabled in mobile and desktop layouts", async () => {
    const onToggleDisabled = vi.fn()
    const onRemove = vi.fn()

    render(
      <EquipmentPackTab
        packs={[{
          packId: "builtin",
          name: "系统内置装备",
          author: "DaggerHeart",
          importedAt: "系统内置",
          disabled: false,
          sourceLabel: "系统内置",
          weaponCount: 2,
          armorCount: 1,
          categoryBadges: ["主武器", "副手", "护甲"],
          canDisable: true,
          canRemove: false,
          isSystemPack: true,
        }]}
        initializationError={null}
        onRetryInitialize={vi.fn()}
        onView={vi.fn()}
        onToggleDisabled={onToggleDisabled}
        onRemove={onRemove}
      />,
    )

    const toggleButtons = screen.getAllByRole("button", { name: "禁用装备包" }) as HTMLButtonElement[]
    const removeButtons = screen.getAllByRole("button", { name: "系统内置装备包不能删除" }) as HTMLButtonElement[]

    expect(toggleButtons).toHaveLength(2)
    expect(removeButtons).toHaveLength(2)
    toggleButtons.forEach((button) => expect(button.disabled).toBe(false))
    removeButtons.forEach((button) => expect(button.disabled).toBe(true))

    await userEvent.click(toggleButtons[0])
    await userEvent.click(removeButtons[0])
    expect(onToggleDisabled).toHaveBeenCalledWith("builtin", true)
    expect(onRemove).not.toHaveBeenCalled()
  })

  it("filters equipment packs by name, author, and status", async () => {
    render(
      <EquipmentPackTab
        packs={[
          {
            packId: "enabled-pack",
            name: "启用装备包",
            author: "Alice",
            contentVersion: "1.0.0",
            importedAt: "2026-06-06T00:00:00.000Z",
            disabled: false,
            sourceLabel: "enabled.json",
            weaponCount: 1,
            armorCount: 0,
            categoryBadges: ["主武器"],
            canDisable: true,
            canRemove: true,
          },
          {
            packId: "disabled-pack",
            name: "禁用装备包",
            author: "Bob",
            contentVersion: "1.0.0",
            importedAt: "2026-06-06T00:00:00.000Z",
            disabled: true,
            sourceLabel: "disabled.json",
            weaponCount: 0,
            armorCount: 1,
            categoryBadges: ["护甲"],
            canDisable: true,
            canRemove: true,
          },
        ]}
        initializationError={null}
        onRetryInitialize={vi.fn()}
        onView={vi.fn()}
        onToggleDisabled={vi.fn()}
        onRemove={vi.fn()}
      />,
    )

    await userEvent.type(screen.getByLabelText("搜索装备包"), "alice")
    expect(screen.getAllByText("启用装备包").length).toBeGreaterThan(0)
    expect(screen.queryByText("禁用装备包")).toBeNull()

    await userEvent.clear(screen.getByLabelText("搜索装备包"))
    await userEvent.selectOptions(screen.getByLabelText("装备包状态筛选"), "disabled")
    expect(screen.queryByText("启用装备包")).toBeNull()
    expect(screen.getAllByText("禁用装备包").length).toBeGreaterThan(0)
  })

  it("always includes the fixed initialization failure message", () => {
    render(
      <EquipmentPackTab
        packs={[]}
        initializationError={{
          severity: "error",
          code: "RUNTIME_CACHE_BUILD_FAILED",
          path: "",
          message: "runtime failed",
        }}
        onRetryInitialize={vi.fn()}
        onView={vi.fn()}
        onToggleDisabled={vi.fn()}
        onRemove={vi.fn()}
      />,
    )

    expect(screen.getByText("装备包运行时视图初始化失败，部分装备可能无法在选择窗口显示。")).toBeTruthy()
    expect(screen.getByText("runtime failed")).toBeTruthy()
  })
})
