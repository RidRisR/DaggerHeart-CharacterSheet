import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { MarkdownGuide } from "@/components/guides/markdown-guide"

describe("MarkdownGuide links", () => {
  it("rewrites same-document heading links to the prefixed rendered heading ids", () => {
    render(
      <MarkdownGuide
        content={"[Go to section](#section-title)\n\n## Section Title"}
        headingIdPrefix="guide"
      />,
    )

    expect(screen.getByRole("heading", { name: "Section Title" }).getAttribute("id")).toBe(
      "guide-section-title",
    )
    expect(screen.getByRole("link", { name: "Go to section" }).getAttribute("href")).toBe(
      "#guide-section-title",
    )
  })

  it("rewrites Chinese table-of-contents links to the matching prefixed heading ids", () => {
    render(
      <MarkdownGuide
        content={[
          "- [快速启程：5分钟创作你的第一个法术](#快速启程5分钟创作你的第一个法术)",
          "  - [第一步：准备你的画布 (卡牌包框架)](#第一步准备你的画布-卡牌包框架)",
          "",
          "## 快速启程：5分钟创作你的第一个法术",
          "",
          "### 第一步：准备你的画布 (卡牌包框架)",
        ].join("\n")}
        headingIdPrefix="user-guide"
      />,
    )

    expect(
      screen.getByRole("heading", {
        name: "快速启程：5分钟创作你的第一个法术",
      }).getAttribute("id"),
    ).toBe("user-guide-快速启程5分钟创作你的第一个法术")
    expect(
      screen.getByRole("heading", {
        name: "第一步：准备你的画布 (卡牌包框架)",
      }).getAttribute("id"),
    ).toBe("user-guide-第一步准备你的画布-卡牌包框架")

    expect(
      screen
        .getByRole("link", { name: "快速启程：5分钟创作你的第一个法术" })
        .getAttribute("href"),
    ).toBe(
      "#user-guide-%E5%BF%AB%E9%80%9F%E5%90%AF%E7%A8%8B5%E5%88%86%E9%92%9F%E5%88%9B%E4%BD%9C%E4%BD%A0%E7%9A%84%E7%AC%AC%E4%B8%80%E4%B8%AA%E6%B3%95%E6%9C%AF",
    )
    expect(
      screen
        .getByRole("link", { name: "第一步：准备你的画布 (卡牌包框架)" })
        .getAttribute("href"),
    ).toBe(
      "#user-guide-%E7%AC%AC%E4%B8%80%E6%AD%A5%E5%87%86%E5%A4%87%E4%BD%A0%E7%9A%84%E7%94%BB%E5%B8%83-%E5%8D%A1%E7%89%8C%E5%8C%85%E6%A1%86%E6%9E%B6",
    )
  })

  it("scrolls to decoded same-document Chinese heading links when clicked", () => {
    render(
      <MarkdownGuide
        content={[
          "[第一步：准备你的画布 (卡牌包框架)](#第一步准备你的画布-卡牌包框架)",
          "",
          "### 第一歩：不同标题",
          "",
          "### 第一步：准备你的画布 (卡牌包框架)",
        ].join("\n")}
        headingIdPrefix="user-guide"
      />,
    )

    const target = screen.getByRole("heading", {
      name: "第一步：准备你的画布 (卡牌包框架)",
    })
    const scrollIntoView = vi.fn()
    Object.defineProperty(target, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    })

    fireEvent.click(screen.getByRole("link", { name: "第一步：准备你的画布 (卡牌包框架)" }))

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" })
  })
})
