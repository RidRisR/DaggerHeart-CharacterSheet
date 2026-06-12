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

  it("renders each announcement as a distinct card with date metadata", () => {
    render(
      <AnnouncementsModal
        isOpen
        onClose={() => {}}
        announcements={[
          { id: "old", date: "2026-01-01", title: "Old update", content: "Old body" },
          { id: "new", date: "2026-06-12", title: "New update", content: "New body" },
        ]}
      />,
    )

    const announcementCards = screen.getAllByRole("article")
    expect(announcementCards).toHaveLength(2)
    announcementCards.forEach((card) => {
      expect(card.className).toContain("rounded-lg")
      expect(card.className).toContain("border")
      expect(card.className).toContain("bg-white")
      expect(card.className).toContain("p-4")
      expect(card.className).toContain("shadow-sm")
      expect(card.className).not.toContain("border-l-4")
      expect(card.className).not.toContain("border-l-blue")
    })

    const latestDate = screen.getByText("2026-06-12")
    expect(latestDate.className).toContain("rounded-full")
    expect(latestDate.className).toContain("bg-slate-100")
    expect(latestDate.className).toContain("px-2")
  })

  it("constrains long announcement content to an internal scroll region", () => {
    render(
      <AnnouncementsModal
        isOpen
        onClose={() => {}}
        announcements={[
          {
            id: "long",
            date: "2026-06-12",
            title: "Long update",
            content: Array.from({ length: 30 }, (_, index) => `- 更新项目 ${index + 1}`).join("\n"),
          },
        ]}
      />,
    )

    const dialog = screen.getByRole("dialog")
    expect(dialog.className).toContain("flex")
    expect(dialog.className).toContain("flex-col")

    const scrollRegion = screen.getByTestId("announcements-scroll-region")
    expect(scrollRegion.className).toContain("min-h-0")
    expect(scrollRegion.className).toContain("flex-1")
    expect(scrollRegion.className).toContain("overflow-y-auto")
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
