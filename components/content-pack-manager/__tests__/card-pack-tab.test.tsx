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
})
