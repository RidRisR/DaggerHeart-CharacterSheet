import { describe, expect, it } from "vitest";
import {
  addEquipmentArmor,
  addEquipmentWeapon,
  createDefaultEquipmentDraft,
  deleteEquipmentArmor,
  deleteEquipmentWeapon,
  duplicateEquipmentArmor,
  duplicateEquipmentWeapon,
  findDuplicateEquipmentIds,
  hasEquipmentItems,
  updateEquipmentArmor,
  updateEquipmentMetadata,
  updateEquipmentWeapon,
} from "../equipment-draft";

describe("equipment editor draft", () => {
  it("creates the default equipment draft", () => {
    expect(createDefaultEquipmentDraft()).toEqual({
      format: "daggerheart.equipment-pack.v1",
      name: "未命名装备包",
      version: "1.0.0",
      author: "",
      description: "",
      equipment: { weapons: [], armor: [] },
    });
  });

  it("adds a weapon with generated id and empty editor-safe values", () => {
    const draft = addEquipmentWeapon(createDefaultEquipmentDraft(), {
      now: () => 1710000000000,
      random: () => 0.1,
    });

    expect(draft.equipment.weapons).toHaveLength(1);
    expect(draft.equipment.weapons[0]).toMatchObject({
      name: "",
      tier: "",
      weaponType: "primary",
      trait: "",
      damageType: "",
      range: "",
      burden: "",
      damage: "",
      featureName: "",
      description: "",
      modifierContributions: [],
    });
    expect(draft.equipment.weapons[0].id).toContain("未命名装备-作者-weap-");
  });

  it("adds armor with null numeric placeholders", () => {
    const draft = addEquipmentArmor(createDefaultEquipmentDraft(), {
      now: () => 1710000000000,
      random: () => 0.1,
    });

    expect(draft.equipment.armor[0]).toMatchObject({
      baseArmorMax: null,
      baseThresholds: { minor: null, major: null },
    });
  });

  it("rewrites standard ids when metadata name or author changes", () => {
    let draft = createDefaultEquipmentDraft();
    draft = addEquipmentWeapon(draft, {
      now: () => 1710000000000,
      random: () => 0.1,
    });
    const oldId = draft.equipment.weapons[0].id;

    draft = updateEquipmentMetadata(draft, "name", "新装备包");

    expect(draft.equipment.weapons[0].id).not.toBe(oldId);
    expect(draft.equipment.weapons[0].id).toContain("新装备包-作者-weap-");
  });

  it("does not rewrite custom ids when metadata changes", () => {
    const draft = {
      ...createDefaultEquipmentDraft(),
      equipment: {
        weapons: [
          {
            ...addEquipmentWeapon(createDefaultEquipmentDraft()).equipment
              .weapons[0],
            id: "custom-id",
          },
        ],
        armor: [],
      },
    };

    expect(
      updateEquipmentMetadata(draft, "author", "新作者").equipment.weapons[0]
        .id,
    ).toBe("custom-id");
  });

  it("duplicates weapons and armor with fresh generated ids", () => {
    let draft = addEquipmentWeapon(createDefaultEquipmentDraft(), {
      now: () => 1710000000000,
      random: () => 0.1,
    });
    draft = addEquipmentArmor(draft, {
      now: () => 1710000000000,
      random: () => 0.1,
    });
    const originalWeaponId = draft.equipment.weapons[0].id;
    const originalArmorId = draft.equipment.armor[0].id;

    draft = duplicateEquipmentWeapon(draft, 0, {
      now: () => 1710000000001,
      random: () => 0.2,
    });
    draft = duplicateEquipmentArmor(draft, 0, {
      now: () => 1710000000002,
      random: () => 0.3,
    });

    expect(draft.equipment.weapons).toHaveLength(2);
    expect(draft.equipment.weapons[1].id).not.toBe(originalWeaponId);
    expect(draft.equipment.armor).toHaveLength(2);
    expect(draft.equipment.armor[1].id).not.toBe(originalArmorId);
  });

  it("duplicates nested equipment fields without sharing references", () => {
    let draft = addEquipmentWeapon(createDefaultEquipmentDraft());
    draft = addEquipmentArmor(draft);
    draft = updateEquipmentWeapon(draft, 0, {
      modifierContributions: [
        {
          id: "mod-1",
          definition: { kind: "modifier", target: "evasion" },
          editable: { label: "闪避", value: 1 },
        },
      ],
    });
    draft = updateEquipmentArmor(draft, 0, {
      baseThresholds: { minor: 5, major: 10 },
      modifierContributions: [
        {
          id: "mod-2",
          definition: { kind: "modifier", target: "armorMax" },
          editable: { label: "护甲", value: 2 },
        },
      ],
    });

    draft = duplicateEquipmentWeapon(draft, 0);
    draft = duplicateEquipmentArmor(draft, 0);

    expect(draft.equipment.weapons[1].modifierContributions).not.toBe(
      draft.equipment.weapons[0].modifierContributions,
    );
    expect(draft.equipment.weapons[1].modifierContributions[0].editable).not.toBe(
      draft.equipment.weapons[0].modifierContributions[0].editable,
    );
    expect(draft.equipment.armor[1].baseThresholds).not.toBe(
      draft.equipment.armor[0].baseThresholds,
    );
    expect(draft.equipment.armor[1].modifierContributions).not.toBe(
      draft.equipment.armor[0].modifierContributions,
    );
  });

  it("keeps delete out-of-range as a no-op", () => {
    const draft = addEquipmentWeapon(addEquipmentArmor(createDefaultEquipmentDraft()));

    expect(deleteEquipmentWeapon(draft, 99)).toBe(draft);
    expect(deleteEquipmentArmor(draft, 99)).toBe(draft);
  });

  it("updates and deletes items immutably", () => {
    let draft = addEquipmentWeapon(
      addEquipmentArmor(createDefaultEquipmentDraft()),
    );
    const updatedWeapon = updateEquipmentWeapon(draft, 0, { name: "长剑" });
    const updatedArmor = updateEquipmentArmor(updatedWeapon, 0, {
      baseArmorMax: 5,
      baseThresholds: { minor: 7, major: 14 },
    });

    expect(updatedArmor.equipment.weapons[0].name).toBe("长剑");
    expect(updatedArmor.equipment.armor[0].baseArmorMax).toBe(5);
    expect(draft.equipment.weapons[0].name).toBe("");
    expect(draft.equipment.armor[0].baseArmorMax).toBeNull();

    draft = deleteEquipmentArmor(deleteEquipmentWeapon(updatedArmor, 0), 0);

    expect(draft.equipment).toEqual({ weapons: [], armor: [] });
  });

  it("finds duplicate ids across weapons and armor", () => {
    const draft = {
      ...createDefaultEquipmentDraft(),
      equipment: {
        weapons: [
          {
            ...addEquipmentWeapon(createDefaultEquipmentDraft()).equipment
              .weapons[0],
            id: "same-id",
          },
        ],
        armor: [
          {
            ...addEquipmentArmor(createDefaultEquipmentDraft()).equipment
              .armor[0],
            id: "same-id",
          },
        ],
      },
    };

    expect(findDuplicateEquipmentIds(draft)).toEqual(["same-id"]);
  });

  it("has equipment items only when weapons or armor contain entries", () => {
    expect(hasEquipmentItems(createDefaultEquipmentDraft())).toBe(false);
    expect(
      hasEquipmentItems(addEquipmentWeapon(createDefaultEquipmentDraft())),
    ).toBe(true);
    expect(
      hasEquipmentItems(addEquipmentArmor(createDefaultEquipmentDraft())),
    ).toBe(true);
  });

  it("does not rewrite ids when only version changes", () => {
    let draft = addEquipmentWeapon(createDefaultEquipmentDraft(), {
      now: () => 1710000000000,
      random: () => 0.1,
    });
    const oldId = draft.equipment.weapons[0].id;

    draft = updateEquipmentMetadata(draft, "version", "1.0.1");

    expect(draft.equipment.weapons[0].id).toBe(oldId);
  });
});
