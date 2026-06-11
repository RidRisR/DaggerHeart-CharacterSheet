import { describe, expect, it, vi } from "vitest";
import {
  buildStandardEquipmentId,
  generateStandardEquipmentId,
  parseStandardEquipmentId,
  rewriteEquipmentIdsForMetadataChange,
} from "../equipment-id";

describe("equipment editor ids", () => {
  it("generates ids from pack name, author, type, and a random suffix", () => {
    const random = vi.fn(() => 0.123456789);
    const now = vi.fn(() => 1710000000000);

    expect(
      generateStandardEquipmentId({
        packName: "星剑军械库",
        author: "虹色青空",
        kind: "weapon",
        random,
        now,
      }),
    ).toMatch(/^星剑军械-虹色青空-weap-/);
  });

  it("rewrites only ids matching the previous standard prefix", () => {
    const rewritten = rewriteEquipmentIdsForMetadataChange({
      previous: { name: "旧包", author: "旧作者" },
      next: { name: "新包", author: "新作者" },
      weapons: [
        { id: buildStandardEquipmentId("旧包", "旧作者", "weapon", "abc") },
        { id: "custom-weapon-id" },
      ],
      armor: [
        { id: buildStandardEquipmentId("旧包", "旧作者", "armor", "def") },
      ],
    });

    expect(rewritten.weapons.map((item) => item.id)).toEqual([
      buildStandardEquipmentId("新包", "新作者", "weapon", "abc"),
      "custom-weapon-id",
    ]);
    expect(rewritten.armor.map((item) => item.id)).toEqual([
      buildStandardEquipmentId("新包", "新作者", "armor", "def"),
    ]);
  });

  it("treats non-standard ids as custom ids", () => {
    expect(
      parseStandardEquipmentId("hand-written", "包", "作者", "weapon")
        .isStandard,
    ).toBe(false);
  });

  it("keeps the suffix when rewriting a standard id", () => {
    const id = buildStandardEquipmentId("旧包", "旧作者", "armor", "abc-123");

    const parsed = parseStandardEquipmentId(id, "旧包", "旧作者", "armor");

    expect(parsed).toEqual({
      isStandard: true,
      prefix: "旧包-旧作者-armo-",
      suffix: "abc-123",
    });
    expect(
      buildStandardEquipmentId("新包", "新作者", "armor", parsed.suffix),
    ).toBe("新包-新作者-armo-abc-123");
  });
});
