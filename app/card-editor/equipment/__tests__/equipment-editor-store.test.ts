import type { EquipmentPackApplicationImportResult } from "@/equipment/packs/application-service";
import { describe, expect, it } from "vitest";
import { createEquipmentEditorStore } from "../equipment-editor-store";

describe("equipment editor store", () => {
  it("starts with a default equipment draft and metadata tab", () => {
    const store = createEquipmentEditorStore();

    expect(store.getState().draft.name).toBe("未命名装备包");
    expect(store.getState().selectedTab).toBe("metadata");
    expect(store.getState().selectedWeaponIndex).toBe(0);
    expect(store.getState().selectedArmorIndex).toBe(0);
  });

  it("adds weapons and selects the new weapon tab entry", () => {
    const store = createEquipmentEditorStore();

    store.getState().addWeapon();
    store.getState().addWeapon();

    expect(store.getState().draft.equipment.weapons).toHaveLength(2);
    expect(store.getState().selectedTab).toBe("weapons");
    expect(store.getState().selectedWeaponIndex).toBe(1);
  });

  it("adds armor and selects the new armor tab entry", () => {
    const store = createEquipmentEditorStore();

    store.getState().addArmor();
    store.getState().addArmor();

    expect(store.getState().draft.equipment.armor).toHaveLength(2);
    expect(store.getState().selectedTab).toBe("armor");
    expect(store.getState().selectedArmorIndex).toBe(1);
  });

  it("keeps selected indices in range after deleting items", () => {
    const store = createEquipmentEditorStore();

    store.getState().addWeapon();
    store.getState().addWeapon();
    store.getState().addWeapon();
    store.getState().setSelectedWeaponIndex(2);
    store.getState().deleteWeapon(2);

    expect(store.getState().draft.equipment.weapons).toHaveLength(2);
    expect(store.getState().selectedWeaponIndex).toBe(1);

    store.getState().addArmor();
    store.getState().setSelectedArmorIndex(0);
    store.getState().deleteArmor(0);

    expect(store.getState().draft.equipment.armor).toHaveLength(0);
    expect(store.getState().selectedArmorIndex).toBe(0);
  });

  it("keeps selection on the same logical item when deleting earlier items", () => {
    const store = createEquipmentEditorStore();

    store.getState().addWeapon();
    store.getState().addWeapon();
    store.getState().addWeapon();
    store.getState().updateWeapon(0, { name: "A" });
    store.getState().updateWeapon(1, { name: "B" });
    store.getState().updateWeapon(2, { name: "C" });
    store.getState().setSelectedWeaponIndex(1);

    store.getState().deleteWeapon(0);

    expect(store.getState().selectedWeaponIndex).toBe(0);
    expect(store.getState().draft.equipment.weapons[0].name).toBe("B");
  });

  it("imports recovered equipment by replacement instead of merging", () => {
    const store = createEquipmentEditorStore();
    store.getState().addWeapon();
    store.getState().addArmor();
    store.getState().setSelectedTab("armor");
    store.getState().setSelectedWeaponIndex(1);
    store.getState().setSelectedArmorIndex(1);

    const result = store.getState().replaceDraftFromUnknown({
      format: "daggerheart.equipment-pack.v1",
      name: "导入装备",
      equipment: { weapons: [{ id: "weapon", name: "剑" }] },
    });

    expect(result.ok).toBe(true);
    expect(store.getState().draft.name).toBe("导入装备");
    expect(store.getState().draft.equipment.weapons).toHaveLength(1);
    expect(store.getState().draft.equipment.armor).toHaveLength(0);
    expect(store.getState().selectedTab).toBe("metadata");
    expect(store.getState().selectedWeaponIndex).toBe(0);
    expect(store.getState().selectedArmorIndex).toBe(0);
  });

  it("leaves the current draft untouched when replacement recovery fails", () => {
    const store = createEquipmentEditorStore();
    store.getState().addWeapon();

    const result = store.getState().replaceDraftFromUnknown({
      format: "daggerheart.card-pack.v1",
    });

    expect(result.ok).toBe(false);
    expect(store.getState().draft.equipment.weapons).toHaveLength(1);
  });

  it("reports whether the draft has equipment items", () => {
    const store = createEquipmentEditorStore();

    expect(store.getState().hasItems()).toBe(false);

    store.getState().addArmor();

    expect(store.getState().hasItems()).toBe(true);
  });

  it("stores and clears equipment application validation results", () => {
    const store = createEquipmentEditorStore();
    const result: EquipmentPackApplicationImportResult = {
      success: false,
      stage: "structuralValidation",
      mode: "dryRun",
      storageCommitted: false,
      diagnostics: [],
      summary: {
        packId: undefined,
        name: "装备",
        version: "1.0.0",
        author: "",
        weaponCount: 0,
        armorCount: 0,
        warningCount: 0,
        errorCount: 1,
      },
    };

    store.getState().setValidationResult(result);
    store.getState().setIsValidating(true);

    expect(store.getState().validationResult).toBe(result);
    expect(store.getState().isValidating).toBe(true);

    store.getState().setValidationResult(null);
    store.getState().setIsValidating(false);

    expect(store.getState().validationResult).toBeNull();
    expect(store.getState().isValidating).toBe(false);
  });

  it("resets draft content, selection, validation result, and validation progress", () => {
    const store = createEquipmentEditorStore();
    const result: EquipmentPackApplicationImportResult = {
      success: false,
      stage: "structuralValidation",
      mode: "dryRun",
      storageCommitted: false,
      diagnostics: [],
      summary: {
        packId: undefined,
        name: "装备",
        version: "1.0.0",
        author: "",
        weaponCount: 1,
        armorCount: 1,
        warningCount: 0,
        errorCount: 1,
      },
    };

    store.getState().addWeapon();
    store.getState().addArmor();
    store.getState().setSelectedTab("armor");
    store.getState().setSelectedWeaponIndex(1);
    store.getState().setSelectedArmorIndex(1);
    store.getState().setValidationResult(result);
    store.getState().setIsValidating(true);

    store.getState().resetDraft();

    expect(store.getState().draft.name).toBe("未命名装备包");
    expect(store.getState().draft.equipment.weapons).toEqual([]);
    expect(store.getState().draft.equipment.armor).toEqual([]);
    expect(store.getState().selectedTab).toBe("metadata");
    expect(store.getState().selectedWeaponIndex).toBe(0);
    expect(store.getState().selectedArmorIndex).toBe(0);
    expect(store.getState().validationResult).toBeNull();
    expect(store.getState().isValidating).toBe(false);
  });

  it("clears stale validation results when the draft changes", () => {
    const store = createEquipmentEditorStore();
    const result: EquipmentPackApplicationImportResult = {
      success: false,
      stage: "structuralValidation",
      mode: "dryRun",
      storageCommitted: false,
      diagnostics: [],
      summary: {
        packId: undefined,
        name: "装备",
        version: "1.0.0",
        author: "",
        weaponCount: 0,
        armorCount: 0,
        warningCount: 0,
        errorCount: 1,
      },
    };

    store.getState().setValidationResult(result);
    store.getState().addWeapon();

    expect(store.getState().validationResult).toBeNull();
  });
});
