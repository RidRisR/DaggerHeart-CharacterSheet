import { render, screen } from "@testing-library/react"
import "@testing-library/jest-dom/vitest"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { ExperienceSection } from "@/components/character-sheet-sections/experience-section"
import { HitPointsSection } from "@/components/character-sheet-sections/hit-points-section"
import { HPMaxEditor } from "@/components/upgrade-popover/hp-max-editor"
import { NewExperienceEditor } from "@/components/upgrade-popover/new-experience-editor"
import { ProficiencyEditor } from "@/components/upgrade-popover/proficiency-editor"
import { StressMaxEditor } from "@/components/upgrade-popover/stress-max-editor"
import { createManualFinalAdjustment } from "@/automation/core/other-adjustments"
import { createManualBaseContribution, getUnattributedDeltaId } from "@/automation/core/special-contributions"
import { countChecked, resetSheetStore, sheet, store } from "../automation/test-helpers"

describe("final target editors", () => {
  it("reconciles experience value blur through final target commit", async () => {
    resetSheetStore({
      experience: ["Warrior", "", "", "", ""],
      experienceValues: ["2", "", "", "", ""],
      userModifierContributions: [
        {
          id: "user:experience-base",
          definition: { target: "experienceValues.0", kind: "base" },
          editable: { label: "Base", value: 2 },
        },
      ],
      modifierState: {
        targetStates: {
          "experienceValues.0": {
            activeBaseId: "user:experience-base",
            autoCalculation: true,
          },
        },
        entryStates: {},
      },
    })

    render(<ExperienceSection />)
    const input = screen.getByDisplayValue("2")
    await userEvent.click(input)
    await userEvent.clear(input)
    await userEvent.type(input, "5")

    expect(input).toHaveValue("5")
    expect(sheet().experienceValues?.[0]).toBe("2")

    await userEvent.tab()

    expect(sheet().experienceValues?.[0]).toBe("5")
    expect(sheet().otherAdjustments).toContainEqual(
      createManualFinalAdjustment("experienceValues.0", 3),
    )
    expect(sheet().userModifierContributions).not.toContainEqual(
      expect.objectContaining({ id: getUnattributedDeltaId("experienceValues.0") }),
    )
  })

  it("shows one title-level experience source panel with indexed target tabs", async () => {
    resetSheetStore({
      experience: ["铁匠", "贵族礼仪", "", "", ""],
      experienceValues: ["2", "3", "", "", ""],
      userModifierContributions: [
        {
          id: "user:experience-one-base",
          definition: { target: "experienceValues.0", kind: "base" },
          editable: { label: "铁匠基础", value: 2 },
        },
        {
          id: "user:experience-two-base",
          definition: { target: "experienceValues.1", kind: "base" },
          editable: { label: "礼仪基础", value: 3 },
        },
      ],
      modifierState: {
        targetStates: {
          "experienceValues.0": {
            activeBaseId: "user:experience-one-base",
            autoCalculation: true,
          },
          "experienceValues.1": {
            activeBaseId: "user:experience-two-base",
            autoCalculation: true,
          },
        },
        entryStates: {},
      },
    })

    render(<ExperienceSection />)

    expect(screen.getByRole("button", { name: "查看经历来源" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "查看经历一来源" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "查看经历二来源" })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "查看经历来源" }))

    expect(screen.getByRole("dialog", { name: "经历来源" })).toBeInTheDocument()
    expect(screen.getByRole("tablist", { name: "经历加值" })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "经历 1" })).toHaveAttribute("aria-selected", "true")
    expect(screen.getByRole("textbox", { name: "编辑铁匠基础名称" })).toHaveValue("铁匠基础")

    await userEvent.click(screen.getByRole("tab", { name: "经历 2" }))

    expect(screen.getByRole("tab", { name: "经历 2" })).toHaveAttribute("aria-selected", "true")
    expect(screen.getByRole("textbox", { name: "编辑礼仪基础名称" })).toHaveValue("礼仪基础")
    expect(screen.queryByRole("textbox", { name: "编辑铁匠基础名称" })).not.toBeInTheDocument()
  })

  it("reconciles proficiency clicks through final target commit", () => {
    resetSheetStore({
      proficiency: [true, false, false, false, false, false],
      userModifierContributions: [
        {
          id: "user:proficiency-base",
          definition: { target: "proficiency", kind: "base" },
          editable: { label: "Base", value: 1 },
        },
      ],
      modifierState: {
        targetStates: {
          proficiency: {
            activeBaseId: "user:proficiency-base",
            autoCalculation: true,
          },
        },
        entryStates: {},
      },
    })

    store().updateProficiency(2)

    expect(countChecked(sheet().proficiency)).toBe(3)
    expect(sheet().otherAdjustments).toContainEqual(
      createManualFinalAdjustment("proficiency", 2),
    )
    expect(sheet().userModifierContributions).not.toContainEqual(
      expect.objectContaining({ id: getUnattributedDeltaId("proficiency") }),
    )
  })

  it("reconciles HP max editor increment through final target commit", async () => {
    resetSheetStore({
      hpMax: 6,
      userModifierContributions: [
        {
          id: "user:hp-base",
          definition: { target: "hpMax", kind: "base" },
          editable: { label: "Base", value: 6 },
        },
      ],
      modifierState: {
        targetStates: {
          hpMax: {
            activeBaseId: "user:hp-base",
            autoCalculation: true,
          },
        },
        entryStates: {},
      },
    })

    render(<HPMaxEditor />)
    await userEvent.click(screen.getByRole("button", { name: "增加生命值上限 (+1)" }))

    expect(sheet().hpMax).toBe(7)
    expect(sheet().otherAdjustments).toContainEqual(
      createManualFinalAdjustment("hpMax", 1),
    )
    expect(sheet().userModifierContributions).not.toContainEqual(
      expect.objectContaining({ id: getUnattributedDeltaId("hpMax") }),
    )
  })

  it("reconciles stress max editor blur through final target commit", async () => {
    resetSheetStore({
      stressMax: 6,
      userModifierContributions: [
        {
          id: "user:stress-base",
          definition: { target: "stressMax", kind: "base" },
          editable: { label: "Base", value: 6 },
        },
      ],
      modifierState: {
        targetStates: {
          stressMax: {
            activeBaseId: "user:stress-base",
            autoCalculation: true,
          },
        },
        entryStates: {},
      },
    })

    render(<StressMaxEditor />)
    const input = screen.getByDisplayValue("6")
    await userEvent.clear(input)
    await userEvent.type(input, "8")
    await userEvent.tab()

    expect(sheet().stressMax).toBe(8)
    expect(sheet().otherAdjustments).toContainEqual(
      createManualFinalAdjustment("stressMax", 2),
    )
    expect(sheet().userModifierContributions).not.toContainEqual(
      expect.objectContaining({ id: getUnattributedDeltaId("stressMax") }),
    )
  })

  it("does not render hidden default six boxes when hp and stress max are blank", () => {
    resetSheetStore({
      hpMax: "",
      stressMax: "",
      hp: Array(18).fill(false),
      stress: Array(18).fill(false),
    })

    render(<HitPointsSection />)

    expect(screen.getAllByDisplayValue("").length).toBeGreaterThanOrEqual(2)
    expect(screen.getByTitle("减少HP上限")).toBeDisabled()
    expect(screen.getByTitle("减少压力上限")).toBeDisabled()
  })

  it("renders proficiency editor against the real final target", () => {
    resetSheetStore()

    render(<ProficiencyEditor />)

    expect(screen.getByText("熟练度 (1/6)")).toBeInTheDocument()
  })

  it("reconciles threshold blur through final target commit", async () => {
    resetSheetStore({
      minorThreshold: "7",
      userModifierContributions: [
        {
          id: "user:minor-threshold-base",
          definition: { target: "minorThreshold", kind: "base" },
          editable: { label: "Base", value: 7 },
        },
      ],
      modifierState: {
        targetStates: {
          minorThreshold: {
            activeBaseId: "user:minor-threshold-base",
            autoCalculation: true,
          },
        },
        entryStates: {},
      },
    })

    render(<HitPointsSection />)
    const input = screen.getByDisplayValue("7")
    await userEvent.clear(input)
    await userEvent.type(input, "9")

    expect(input).toHaveValue("9")
    expect(sheet().minorThreshold).toBe("7")

    await userEvent.tab()

    expect(sheet().minorThreshold).toBe("9")
    expect(sheet().otherAdjustments).toContainEqual(
      createManualFinalAdjustment("minorThreshold", 1),
    )
    expect(sheet().userModifierContributions).not.toContainEqual(
      expect.objectContaining({ id: getUnattributedDeltaId("minorThreshold") }),
    )
  })

  it("clamps checked HP boxes when HP max is committed below the current checked count", async () => {
    resetSheetStore({
      hp: Array(18).fill(false).map((_, index) => index < 6),
      hpMax: 6,
    })

    render(<HitPointsSection />)
    const input = screen.getAllByDisplayValue("6")[0]
    await userEvent.clear(input)
    await userEvent.type(input, "3")
    await userEvent.tab()

    expect(sheet().hpMax).toBe(3)
    expect(sheet().hp?.slice(0, 6)).toEqual([true, true, true, false, false, false])
    expect(countChecked(sheet().hp)).toBe(3)
  })

  it("rejects blank HP max commits without clearing the previous final value", async () => {
    resetSheetStore({
      hpMax: 6,
      userModifierContributions: [
        {
          id: "user:hp-base",
          definition: { target: "hpMax", kind: "base" },
          editable: { label: "Base", value: 6 },
        },
      ],
      modifierState: {
        targetStates: {
          hpMax: {
            activeBaseId: "user:hp-base",
            autoCalculation: true,
          },
        },
        entryStates: {},
      },
    })

    render(<HitPointsSection />)
    const input = screen.getAllByDisplayValue("6")[0]
    await userEvent.clear(input)
    await userEvent.tab()

    expect(sheet().hpMax).toBe(6)
    expect(sheet().userModifierContributions).not.toContainEqual(
      expect.objectContaining({ id: getUnattributedDeltaId("hpMax") }),
    )
  })

  it("rejects HP max input with a numeric prefix without keeping the prefix", async () => {
    resetSheetStore({ hpMax: 6 })

    render(<HitPointsSection />)
    const input = screen.getAllByDisplayValue("6")[0]
    await userEvent.clear(input)
    await userEvent.type(input, "7a")
    await userEvent.tab()

    expect(sheet().hpMax).toBe(6)
  })

  it("rejects HP max commits above the rendered box limit", async () => {
    resetSheetStore({ hpMax: 6 })

    render(<HitPointsSection />)
    const input = screen.getAllByDisplayValue("6")[0]
    await userEvent.clear(input)
    await userEvent.type(input, "19")
    await userEvent.tab()

    expect(sheet().hpMax).toBe(6)
  })

  it("rejects HP max commits below the rendered box range", async () => {
    resetSheetStore({ hpMax: 6 })

    render(<HitPointsSection />)
    const input = screen.getAllByDisplayValue("6")[0]
    await userEvent.clear(input)
    await userEvent.type(input, "0")
    await userEvent.tab()

    expect(sheet().hpMax).toBe(6)
  })

  it("clamps checked stress boxes when stress max is decremented below the current checked count", async () => {
    resetSheetStore({
      stress: Array(18).fill(false).map((_, index) => index < 6),
      stressMax: 4,
    })

    render(<HitPointsSection />)
    await userEvent.click(screen.getAllByRole("button", { name: "−" })[1])

    expect(sheet().stressMax).toBe(3)
    expect(sheet().stress?.slice(0, 6)).toEqual([true, true, true, false, false, false])
    expect(countChecked(sheet().stress)).toBe(3)
  })

  it("rejects blank stress max commits without clearing the previous final value", async () => {
    resetSheetStore({
      hpMax: 7,
      stressMax: 6,
      userModifierContributions: [
        {
          id: "user:stress-base",
          definition: { target: "stressMax", kind: "base" },
          editable: { label: "Base", value: 6 },
        },
      ],
      modifierState: {
        targetStates: {
          stressMax: {
            activeBaseId: "user:stress-base",
            autoCalculation: true,
          },
        },
        entryStates: {},
      },
    })

    render(<HitPointsSection />)
    const input = screen.getByDisplayValue("6")
    await userEvent.clear(input)
    await userEvent.tab()

    expect(sheet().stressMax).toBe(6)
    expect(sheet().userModifierContributions).not.toContainEqual(
      expect.objectContaining({ id: getUnattributedDeltaId("stressMax") }),
    )
  })

  it("rejects stress max input with a numeric prefix without keeping the prefix", async () => {
    resetSheetStore({
      hpMax: 7,
      stressMax: 6,
    })

    render(<HitPointsSection />)
    const input = screen.getByDisplayValue("6")
    await userEvent.clear(input)
    await userEvent.type(input, "7a")
    await userEvent.tab()

    expect(sheet().stressMax).toBe(6)
  })

  it("rejects stress max commits below the rendered box range", async () => {
    resetSheetStore({
      hpMax: 7,
      stressMax: 6,
    })

    render(<HitPointsSection />)
    const input = screen.getByDisplayValue("6")
    await userEvent.clear(input)
    await userEvent.type(input, "0")
    await userEvent.tab()

    expect(sheet().stressMax).toBe(6)
  })

  it("adds a new experience value through final target submission", async () => {
    resetSheetStore({
      experience: ["", "", "", "", ""],
      experienceValues: ["", "", "", "", ""],
      userModifierContributions: [
        {
          id: "user:experience-penalty",
          definition: { target: "experienceValues.0", kind: "modifier" },
          editable: { label: "Penalty", value: -1 },
        },
      ],
      modifierState: { targetStates: {}, entryStates: {} },
    })

    render(<NewExperienceEditor />)
    await userEvent.type(screen.getByPlaceholderText("输入新的经历..."), "铁匠")
    await userEvent.click(screen.getByRole("button", { name: "添加经历" }))

    expect(sheet().experience?.[0]).toBe("铁匠")
    expect(sheet().experienceValues?.[0]).toBe("1")
    expect(sheet().userModifierContributions).toContainEqual(
      createManualBaseContribution("experienceValues.0", 2),
    )
  })
})
