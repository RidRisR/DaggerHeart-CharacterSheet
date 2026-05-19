import { describe, expect, it } from "vitest"
import { canProceedToNextStep, guideSteps } from "@/components/guide/guide-content"

describe("guide content validation", () => {
  const step8 = guideSteps.find((step) => step.id === "step8")
  const step9 = guideSteps.find((step) => step.id === "step9")

  it("validates the initial weapon step from the primary equipment slot", () => {
    expect(step8).toBeTruthy()

    expect(
      canProceedToNextStep(step8!, {
        equipment: {
          weaponSlots: {
            primary: {
              name: "阔剑",
            },
          },
        },
      }),
    ).toBe(true)

    expect(
      canProceedToNextStep(step8!, {
        primaryWeaponName: "Legacy Weapon",
      }),
    ).toBe(false)
  })

  it("validates the initial armor step from the equipment armor slot", () => {
    expect(step9).toBeTruthy()

    const finalTargets = {
      armorMax: "4",
      minorThreshold: "8",
      majorThreshold: "16",
    }

    expect(
      canProceedToNextStep(step9!, {
        ...finalTargets,
        equipment: {
          armorSlot: {
            name: "链甲",
            baseArmorMax: 4,
            baseThresholds: { minor: 7, major: 15 },
          },
        },
      }),
    ).toBe(true)

    const content = step9!.content as (formData: any, allCardsList: any[]) => string
    expect(
      content(
        {
          ...finalTargets,
          level: "1",
          equipment: {
            armorSlot: {
              name: "链甲",
              baseArmorMax: 4,
              baseThresholds: { minor: 7, major: 15 },
            },
          },
        },
        [],
      ),
    ).toContain("您的护甲值是 4")
    expect(
      content(
        {
          ...finalTargets,
          level: "1",
          equipment: {
            armorSlot: {
              name: "链甲",
              baseArmorMax: 4,
              baseThresholds: { minor: 7, major: 15 },
            },
          },
        },
        [],
      ),
    ).toContain("您的护甲伤害阈值是 (8, 16)")

    expect(
      canProceedToNextStep(step9!, {
        ...finalTargets,
        armorName: "Legacy Armor",
        armorBaseScore: "4",
        armorThreshold: "7/15",
        armorValue: "4",
      }),
    ).toBe(false)
  })
})
