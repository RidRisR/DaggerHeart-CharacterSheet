import { toast } from "sonner";
import { sanitizeEquipmentModifierContributions } from "@/automation/equipment/contribution-utils";
import {
  createDefaultEquipmentDraft,
  type ArmorEditorDraft,
  type EquipmentEditorDraft,
  type WeaponEditorDraft,
} from "./equipment-draft";

type RecoveryResult =
  | { ok: true; draft: EquipmentEditorDraft }
  | { ok: false; message: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringOrEmpty(value: unknown) {
  return typeof value === "string" ? value : "";
}

function numberOrNull(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function arrayOrEmpty(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function recoverWeapon(value: Record<string, unknown>): WeaponEditorDraft {
  return {
    id: stringOrEmpty(value.id),
    name: stringOrEmpty(value.name),
    tier: (typeof value.tier === "string"
      ? value.tier
      : "") as WeaponEditorDraft["tier"],
    weaponType: value.weaponType === "secondary" ? "secondary" : "primary",
    trait: (typeof value.trait === "string"
      ? value.trait
      : "") as WeaponEditorDraft["trait"],
    damageType: (typeof value.damageType === "string"
      ? value.damageType
      : "") as WeaponEditorDraft["damageType"],
    range: (typeof value.range === "string"
      ? value.range
      : "") as WeaponEditorDraft["range"],
    burden: (typeof value.burden === "string"
      ? value.burden
      : "") as WeaponEditorDraft["burden"],
    damage: stringOrEmpty(value.damage),
    featureName: stringOrEmpty(value.featureName),
    description: stringOrEmpty(value.description),
    modifierContributions: sanitizeEquipmentModifierContributions(
      value.modifierContributions,
    ),
  };
}

function recoverArmor(value: Record<string, unknown>): ArmorEditorDraft {
  const thresholds = isRecord(value.baseThresholds) ? value.baseThresholds : {};

  return {
    id: stringOrEmpty(value.id),
    name: stringOrEmpty(value.name),
    tier: (typeof value.tier === "string"
      ? value.tier
      : "") as ArmorEditorDraft["tier"],
    baseArmorMax: numberOrNull(value.baseArmorMax),
    baseThresholds: {
      minor: numberOrNull(thresholds.minor),
      major: numberOrNull(thresholds.major),
    },
    featureName: stringOrEmpty(value.featureName),
    description: stringOrEmpty(value.description),
    modifierContributions: sanitizeEquipmentModifierContributions(
      value.modifierContributions,
    ),
  };
}

export function recoverEquipmentEditorDraft(value: unknown): RecoveryResult {
  if (!isRecord(value)) {
    return { ok: false, message: "装备 JSON 顶层必须是对象" };
  }

  if (
    value.format !== undefined &&
    value.format !== "daggerheart.equipment-pack.v1"
  ) {
    return { ok: false, message: "不是有效的装备包格式" };
  }

  const equipment = value.equipment === undefined ? {} : value.equipment;
  if (!isRecord(equipment)) {
    return { ok: false, message: "equipment 必须是对象" };
  }

  if (equipment.weapons !== undefined && !Array.isArray(equipment.weapons)) {
    return { ok: false, message: "equipment.weapons 必须是数组" };
  }

  if (equipment.armor !== undefined && !Array.isArray(equipment.armor)) {
    return { ok: false, message: "equipment.armor 必须是数组" };
  }

  const weapons = arrayOrEmpty(equipment.weapons);
  const armor = arrayOrEmpty(equipment.armor);

  if (!weapons.every(isRecord) || !armor.every(isRecord)) {
    return {
      ok: false,
      message: "weapons 和 armor 里的每个条目都必须是对象",
    };
  }

  return {
    ok: true,
    draft: {
      ...createDefaultEquipmentDraft(),
      name: stringOrEmpty(value.name),
      version: stringOrEmpty(value.version),
      author: stringOrEmpty(value.author),
      description: stringOrEmpty(value.description),
      equipment: {
        weapons: weapons.map(recoverWeapon),
        armor: armor.map(recoverArmor),
      },
    },
  };
}

export function toEquipmentExportJson(draft: EquipmentEditorDraft) {
  return {
    format: draft.format,
    name: draft.name,
    version: draft.version,
    author: draft.author,
    description: draft.description,
    equipment: draft.equipment,
  };
}

export async function importEquipmentDraftFromFile(
  file: File,
): Promise<RecoveryResult> {
  try {
    return recoverEquipmentEditorDraft(JSON.parse(await file.text()));
  } catch {
    return { ok: false, message: "装备 JSON 解析失败" };
  }
}

export function downloadEquipmentDraftJson(draft: EquipmentEditorDraft) {
  const blob = new Blob([JSON.stringify(toEquipmentExportJson(draft), null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  try {
    anchor.href = url;
    anchor.download = `${draft.name || "装备包"}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    toast.success("装备包已导出");
  } finally {
    URL.revokeObjectURL(url);
  }
}
