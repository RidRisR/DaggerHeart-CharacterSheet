import { describe, expect, it } from "vitest"
import { CardType } from "@/card/card-types"
import type { CardPackDryRunValidationModel } from "@/card/import/types"
import { projectCardPackModelToRuntimeTemplates } from "../runtime-card-projection"

describe("projectCardPackModelToRuntimeTemplates", () => {
  it("projects compiled dry-run cards without source-owned metadata", () => {
    const model = {
      cards: [
        {
          group: "communities",
          id: "community-test",
          name: "Test Community",
          description: "Body",
          feature: "Feature",
          summary: "Summary",
          imageUrl: "/images/test.webp",
          hasLocalImage: false,
          automation: {
            format: "daggerheart.card-automation.ir.v1",
            revision: "test",
            abilities: [],
          },
        },
      ],
    } as unknown as CardPackDryRunValidationModel

    expect(projectCardPackModelToRuntimeTemplates(model)).toEqual([
      expect.objectContaining({
        id: "community-test",
        type: CardType.Community,
        automation: expect.objectContaining({ revision: "test" }),
      }),
    ])
    expect(projectCardPackModelToRuntimeTemplates(model)[0]).not.toHaveProperty("batchId")
    expect(projectCardPackModelToRuntimeTemplates(model)[0]).not.toHaveProperty("batchName")
    expect(projectCardPackModelToRuntimeTemplates(model)[0]).not.toHaveProperty("source")
  })
})
