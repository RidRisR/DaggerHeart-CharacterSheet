import "@testing-library/jest-dom/vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { GlobalImportPanel } from "../global-import-panel"

describe("GlobalImportPanel", () => {
  it("shows one prominent file picker and user-oriented idle hints", () => {
    render(<GlobalImportPanel onImportFiles={vi.fn()} importing={false} results={[]} />)

    expect(screen.getByRole("button", { name: "选择文件" })).toBeInTheDocument()
    expect(screen.getByText(/支持 JSON 装备包/)).toBeInTheDocument()
    expect(screen.queryByText(/path/)).not.toBeInTheDocument()
  })

  it("renders grouped multi-file results", () => {
    render(
      <GlobalImportPanel
        importing={false}
        onImportFiles={vi.fn()}
        results={[
          { fileName: "weapons.json", kind: "equipment", success: true, summary: "导入 2 个装备模板", diagnostics: [] },
          {
            fileName: "bad.json",
            kind: "unknown",
            success: false,
            summary: "无法识别内容包类型",
            diagnostics: [{ severity: "error", code: "UNKNOWN_CONTENT_PACK", path: "", message: "无法识别内容包类型" }],
          },
        ]}
      />,
    )

    expect(screen.getByText("weapons.json")).toBeInTheDocument()
    expect(screen.getByText("bad.json")).toBeInTheDocument()
    expect(screen.getByText("无法识别内容包类型")).toBeInTheDocument()
  })

  it("folds diagnostics, shows values, and offers show-all for long diagnostic lists", async () => {
    const diagnostics = Array.from({ length: 25 }, (_, index) => ({
      severity: "error" as const,
      code: `ERROR_${index}`,
      path: `/items/${index}`,
      message: `错误 ${index}`,
      value: { index },
    }))

    render(
      <GlobalImportPanel
        importing={false}
        onImportFiles={vi.fn()}
        results={[{ fileName: "bad.json", kind: "unknown", success: false, summary: "导入失败", diagnostics }]}
      />,
    )

    await userEvent.click(screen.getByText(/查看详细信息/))
    expect(screen.getByText("ERROR_0")).toBeInTheDocument()
    expect(screen.queryByText("ERROR_24")).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "显示全部" }))
    expect(screen.getByText("ERROR_24")).toBeInTheDocument()
    expect(screen.getByText(/"index":24/)).toBeInTheDocument()
  })

  it("rejects file select and drop while importing", async () => {
    const onImportFiles = vi.fn()
    const { container } = render(<GlobalImportPanel onImportFiles={onImportFiles} importing={true} results={[]} />)
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    const dropTarget = screen.getByText("导入内容包").parentElement as HTMLElement
    const file = new File(["{}"], "pack.json", { type: "application/json" })

    await userEvent.upload(input, file)
    fireEvent.drop(dropTarget, { dataTransfer: { files: [file] } })

    expect(onImportFiles).not.toHaveBeenCalled()
  })

  it("keeps diagnostics expansion isolated for files with the same name", async () => {
    render(
      <GlobalImportPanel
        importing={false}
        onImportFiles={vi.fn()}
        results={[
          {
            fileName: "pack.json",
            kind: "unknown",
            success: false,
            summary: "第一个失败",
            diagnostics: [{ severity: "error", code: "FIRST_ERROR", path: "/first", message: "first" }],
          },
          {
            fileName: "pack.json",
            kind: "unknown",
            success: false,
            summary: "第二个失败",
            diagnostics: [{ severity: "error", code: "SECOND_ERROR", path: "/second", message: "second" }],
          },
        ]}
      />,
    )

    await userEvent.click(screen.getAllByText(/查看详细信息/)[0])

    expect(screen.getByText("FIRST_ERROR")).toBeInTheDocument()
    expect(screen.queryByText("SECOND_ERROR")).not.toBeInTheDocument()
  })
})
