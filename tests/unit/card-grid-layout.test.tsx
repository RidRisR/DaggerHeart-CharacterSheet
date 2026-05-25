import { describe, expect, it, vi } from "vitest"
import { render } from "@testing-library/react"
import { CardType, type StandardCard } from "@/card/card-types"
import { CardGrid } from "@/components/modals/display/CardGrid"

vi.mock("@/card", () => ({
  getBatchName: vi.fn(() => undefined),
  getStandardCardById: vi.fn(() => undefined),
}))

const cards: StandardCard[] = [
  {
    standarized: true,
    id: "test-card",
    name: "测试卡牌",
    type: CardType.Domain,
    class: "测试",
    description: "测试描述",
    level: 1,
    cardSelectDisplay: {
      item1: "测试领域",
      item2: "LV.1",
      item3: "",
    },
  },
]

describe("CardGrid layout", () => {
  it("text mode uses card-width based columns instead of viewport breakpoints", () => {
    const { container } = render(<CardGrid cards={cards} isTextMode onCardClick={() => {}} />)

    const grid = container.firstElementChild
    expect(grid).not.toBeNull()
    expect(grid?.className).toContain("grid-cols-[repeat(auto-fit,minmax(min(18rem,100%),18rem))]")
    expect(grid?.className).not.toContain("md:grid-cols-3")
  })
})
