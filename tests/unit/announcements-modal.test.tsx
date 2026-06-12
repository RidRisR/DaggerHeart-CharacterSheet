import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { AnnouncementsModal } from "@/components/modals/announcements-modal"

describe("AnnouncementsModal", () => {
  it("renders announcements newest first", () => {
    render(
      <AnnouncementsModal
        isOpen
        onClose={() => {}}
        announcements={[
          { id: "old", date: "2026-01-01", title: "Old update", content: "## 更新\n\nOld body" },
          { id: "new", date: "2026-06-12", title: "New update", content: "## 修复\n\nNew body" },
        ]}
      />,
    )

    const articleTitles = screen.getAllByRole("heading", { level: 3 })
    expect(articleTitles.map((heading) => heading.textContent)).toEqual(["New update", "Old update"])
    expect(screen.getByText("2026-06-12")).toBeTruthy()
    expect(screen.getByText("2026-01-01")).toBeTruthy()
    expect(screen.getByRole("heading", { level: 2, name: "修复" })).toBeTruthy()
    expect(screen.getByRole("heading", { level: 2, name: "更新" })).toBeTruthy()
    expect(screen.getByText("New body")).toBeTruthy()
    expect(screen.getByText("Old body")).toBeTruthy()
  })

  it("renders an empty state when there are no announcements", () => {
    render(<AnnouncementsModal isOpen onClose={() => {}} announcements={[]} />)

    expect(screen.getByRole("heading", { name: "更新公告" })).toBeTruthy()
    expect(screen.getByText("暂无更新公告")).toBeTruthy()
  })

  it("does not render dialog content while closed", () => {
    render(
      <AnnouncementsModal
        isOpen={false}
        onClose={() => {}}
        announcements={[
          { id: "new", date: "2026-06-12", title: "New update", content: "New body" },
        ]}
      />,
    )

    expect(screen.queryByRole("heading", { name: "更新公告" })).toBeNull()
  })
})
