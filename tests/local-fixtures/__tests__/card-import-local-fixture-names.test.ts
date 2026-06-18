import { describe, expect, it } from "vitest"
import { createLocalCardPackFixtureNames } from "../card-import-local-fixture-names"

describe("local card pack fixture names", () => {
  it("creates distinct storage snapshot names for Chinese-only fixture names", () => {
    const first = createLocalCardPackFixtureNames("丹成一品扩展包.dhcb")
    const second = createLocalCardPackFixtureNames("四圣兽卡牌包（作者：周一）.dhcb")

    expect(first.snapshotFileName).not.toBe(second.snapshotFileName)
    expect(first.snapshotFileName).toMatch(/^丹成一品扩展包-[a-f0-9]{8}\.storage\.json$/)
    expect(second.snapshotFileName).toMatch(/^四圣兽卡牌包-作者-周一-[a-f0-9]{8}\.storage\.json$/)
  })

  it("creates deterministic ascii pack ids from the full relative path", () => {
    const fixture = createLocalCardPackFixtureNames("nested/匕首世界 - rrr与srd车卡器版.json")

    expect(fixture.packId).toMatch(/^test-pack-[a-f0-9]{12}$/)
    expect(fixture.snapshotFileName).toMatch(/^匕首世界-rrr与srd车卡器版-[a-f0-9]{8}\.storage\.json$/)
    expect(fixture).toEqual(createLocalCardPackFixtureNames("nested/匕首世界 - rrr与srd车卡器版.json"))
  })
})
