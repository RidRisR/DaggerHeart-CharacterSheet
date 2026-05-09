import { describe, expect, it } from "vitest"
import { canProceedToNextStep, guideSteps } from "@/components/guide/guide-content"

describe("guide content validation", () => {
  const step8 = guideSteps.find((step) => step.id === "step8")

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
})
