import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { CardPackTab } from "../card-pack-tab"

const systemBatch = {
  id: "SYSTEM_BUILTIN_CARDS",
  name: "系统内置卡牌包",
  author: "System Author",
  version: "1.0.0",
  fileName: "builtin-base.json",
  importTime: "2026-06-06T00:09:58.000Z",
  cardCount: 321,
  cardTypes: ["profession", "ancestry", "community", "subclass", "domain", "variant"],
  disabled: false,
  isSystemBatch: true,
}

const customEnabledBatch = {
  ...systemBatch,
  id: "pack_enabled",
  name: "启用测试包",
  fileName: "enabled.json",
  disabled: false,
  isSystemBatch: false,
}

const customDisabledBatch = {
  ...systemBatch,
  id: "pack_disabled",
  name: "禁用测试包",
  fileName: "disabled.json",
  disabled: true,
  isSystemBatch: false,
}

describe("CardPackTab", () => {
  it("renders card batches in unified desktop table and mobile cards without id, author, or version", () => {
    render(
      <CardPackTab
        batches={[systemBatch]}
        totalCards={321}
        onViewCards={vi.fn()}
        onToggleBatchDisabled={vi.fn()}
        onRemoveBatch={vi.fn()}
      />,
    )

    expect(screen.getByTestId("card-pack-desktop-table")).toBeTruthy()
    expect(screen.getByTestId("card-pack-mobile-list")).toBeTruthy()

    const table = screen.getByTestId("card-pack-desktop-table")
    expect(within(table).getByText("系统内置卡牌包")).toBeTruthy()
    expect(within(table).getByText("321 卡牌")).toBeTruthy()
    expect(within(table).getByText("系统内置")).toBeTruthy()
    expect(within(table).getByText("已启用")).toBeTruthy()
    expect(within(table).getByRole("button", { name: "6 类别" }).getAttribute("title")).toBe(
      "profession / ancestry / community / subclass / domain / variant",
    )

    expect(table.textContent).not.toContain("SYSTEM_BUILTIN_CARDS")
    expect(table.textContent).not.toContain("System Author")
    expect(table.textContent).not.toContain("1.0.0")
  })

  it("keeps icon actions accessible", async () => {
    const onViewCards = vi.fn()
    const onToggleBatchDisabled = vi.fn()
    const onRemoveBatch = vi.fn()

    render(
      <CardPackTab
        batches={[{ ...systemBatch, id: "custom-pack", isSystemBatch: false }]}
        totalCards={321}
        onViewCards={onViewCards}
        onToggleBatchDisabled={onToggleBatchDisabled}
        onRemoveBatch={onRemoveBatch}
      />,
    )

    await userEvent.click(screen.getAllByRole("button", { name: "查看卡牌包" })[0])
    expect(onViewCards).toHaveBeenCalledWith("custom-pack")

    await userEvent.click(screen.getAllByRole("button", { name: "禁用卡牌包" })[0])
    expect(onToggleBatchDisabled).toHaveBeenCalledWith("custom-pack")

    await userEvent.click(screen.getAllByRole("button", { name: "删除卡牌包" })[0])
    expect(onRemoveBatch).toHaveBeenCalledWith("custom-pack")
  })

  it("keeps the system batch delete action visible but disabled", () => {
    const onRemoveBatch = vi.fn()

    render(
      <CardPackTab
        batches={[systemBatch]}
        totalCards={321}
        onViewCards={vi.fn()}
        onToggleBatchDisabled={vi.fn()}
        onRemoveBatch={onRemoveBatch}
      />,
    )

    const deleteButtons = screen.getAllByRole("button", { name: "系统内置卡牌包不能删除" }) as HTMLButtonElement[]
    expect(deleteButtons).toHaveLength(2)
    deleteButtons.forEach((button) => expect(button.disabled).toBe(true))
    expect(onRemoveBatch).not.toHaveBeenCalled()
  })

  it("disables per-pack view actions for disabled batches in mobile and desktop layouts", async () => {
    const onViewCards = vi.fn()

    render(
      <CardPackTab
        batches={[{ ...systemBatch, id: "disabled-pack", disabled: true, isSystemBatch: false }]}
        totalCards={0}
        onViewCards={onViewCards}
        onToggleBatchDisabled={vi.fn()}
        onRemoveBatch={vi.fn()}
      />,
    )

    const viewButtons = screen.getAllByRole("button", { name: "已禁用卡牌包不能查看" }) as HTMLButtonElement[]
    expect(viewButtons).toHaveLength(2)
    viewButtons.forEach((button) => expect(button.disabled).toBe(true))

    await userEvent.click(viewButtons[0])
    expect(onViewCards).not.toHaveBeenCalled()
  })

  it("filters card packs by package name", async () => {
    render(
      <CardPackTab
        batches={[customEnabledBatch, customDisabledBatch]}
        totalCards={321}
        onViewCards={vi.fn()}
        onToggleBatchDisabled={vi.fn()}
        onRemoveBatch={vi.fn()}
      />,
    )

    await userEvent.type(screen.getByPlaceholderText("搜索包名或来源"), "禁用")

    const table = screen.getByTestId("card-pack-desktop-table")
    expect(within(table).getByText("禁用测试包")).toBeTruthy()
    expect(within(table).queryByText("启用测试包")).toBeNull()
  })

  it("filters card packs by imported file name and system source label", async () => {
    render(
      <CardPackTab
        batches={[systemBatch, customEnabledBatch]}
        totalCards={642}
        onViewCards={vi.fn()}
        onToggleBatchDisabled={vi.fn()}
        onRemoveBatch={vi.fn()}
      />,
    )

    const searchInput = screen.getByPlaceholderText("搜索包名或来源")

    await userEvent.type(searchInput, "enabled.json")
    let table = screen.getByTestId("card-pack-desktop-table")
    expect(within(table).getByText("启用测试包")).toBeTruthy()
    expect(within(table).getByText("导入文件：enabled.json")).toBeTruthy()
    expect(within(table).queryByText("系统内置卡牌包")).toBeNull()

    await userEvent.clear(searchInput)
    await userEvent.type(searchInput, "系统内置")
    table = screen.getByTestId("card-pack-desktop-table")
    expect(within(table).getByText("系统内置卡牌包")).toBeTruthy()
    expect(within(table).getByText("系统内置")).toBeTruthy()
    expect(within(table).queryByText("启用测试包")).toBeNull()
  })

  it("filters card packs by enabled and disabled status", async () => {
    render(
      <CardPackTab
        batches={[customEnabledBatch, customDisabledBatch]}
        totalCards={321}
        onViewCards={vi.fn()}
        onToggleBatchDisabled={vi.fn()}
        onRemoveBatch={vi.fn()}
      />,
    )

    await userEvent.selectOptions(screen.getByDisplayValue("全部状态"), "disabled")
    let table = screen.getByTestId("card-pack-desktop-table")
    expect(within(table).getByText("禁用测试包")).toBeTruthy()
    expect(within(table).getByText("已禁用")).toBeTruthy()
    expect(within(table).queryByText("启用测试包")).toBeNull()

    await userEvent.selectOptions(screen.getByDisplayValue("已禁用"), "enabled")
    table = screen.getByTestId("card-pack-desktop-table")
    expect(within(table).getByText("启用测试包")).toBeTruthy()
    expect(within(table).getByText("已启用")).toBeTruthy()
    expect(within(table).queryByText("禁用测试包")).toBeNull()
  })

  it("shows an empty state when filters match no card packs", async () => {
    render(
      <CardPackTab
        batches={[customEnabledBatch, customDisabledBatch]}
        totalCards={321}
        onViewCards={vi.fn()}
        onToggleBatchDisabled={vi.fn()}
        onRemoveBatch={vi.fn()}
      />,
    )

    await userEvent.type(screen.getByPlaceholderText("搜索包名或来源"), "不存在的包")

    expect(screen.getByText("没有符合条件的卡牌包。")).toBeTruthy()
    expect(screen.queryByTestId("card-pack-desktop-table")).toBeNull()
    expect(screen.queryByTestId("card-pack-mobile-list")).toBeNull()
  })
})
