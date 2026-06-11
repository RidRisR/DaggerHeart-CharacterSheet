import type {
  EquipmentBurden,
  EquipmentDamageType,
  EquipmentRange,
  EquipmentTier,
  EquipmentTrait,
  NormalizedEquipmentModifierContributionTemplate,
} from "@/equipment/import/types";
import {
  generateStandardEquipmentId,
  rewriteEquipmentIdsForMetadataChange,
} from "./equipment-id";

export type EquipmentEditorDraft = {
  format: "daggerheart.equipment-pack.v1";
  name: string;
  version: string;
  author: string;
  description: string;
  equipment: {
    weapons: WeaponEditorDraft[];
    armor: ArmorEditorDraft[];
  };
};

export type WeaponEditorDraft = {
  id: string;
  name: string;
  tier: EquipmentTier | "";
  weaponType: "primary" | "secondary";
  trait: EquipmentTrait | "";
  damageType: EquipmentDamageType | "";
  range: EquipmentRange | "";
  burden: EquipmentBurden | "";
  damage: string;
  featureName: string;
  description: string;
  modifierContributions: NormalizedEquipmentModifierContributionTemplate[];
};

export type ArmorEditorDraft = {
  id: string;
  name: string;
  tier: EquipmentTier | "";
  baseArmorMax: number | null;
  baseThresholds: { minor: number | null; major: number | null };
  featureName: string;
  description: string;
  modifierContributions: NormalizedEquipmentModifierContributionTemplate[];
};

type IdOptions = { now?: () => number; random?: () => number };

export function createDefaultEquipmentDraft(): EquipmentEditorDraft {
  return {
    format: "daggerheart.equipment-pack.v1",
    name: "未命名装备包",
    version: "1.0.0",
    author: "",
    description: "",
    equipment: { weapons: [], armor: [] },
  };
}

function newWeapon(
  draft: EquipmentEditorDraft,
  options: IdOptions = {},
): WeaponEditorDraft {
  return {
    id: generateStandardEquipmentId({
      packName: draft.name,
      author: draft.author,
      kind: "weapon",
      ...options,
    }),
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
  };
}

function newArmor(
  draft: EquipmentEditorDraft,
  options: IdOptions = {},
): ArmorEditorDraft {
  return {
    id: generateStandardEquipmentId({
      packName: draft.name,
      author: draft.author,
      kind: "armor",
      ...options,
    }),
    name: "",
    tier: "",
    baseArmorMax: null,
    baseThresholds: { minor: null, major: null },
    featureName: "",
    description: "",
    modifierContributions: [],
  };
}

export function addEquipmentWeapon(
  draft: EquipmentEditorDraft,
  options: IdOptions = {},
): EquipmentEditorDraft {
  return {
    ...draft,
    equipment: {
      ...draft.equipment,
      weapons: [...draft.equipment.weapons, newWeapon(draft, options)],
    },
  };
}

export function addEquipmentArmor(
  draft: EquipmentEditorDraft,
  options: IdOptions = {},
): EquipmentEditorDraft {
  return {
    ...draft,
    equipment: {
      ...draft.equipment,
      armor: [...draft.equipment.armor, newArmor(draft, options)],
    },
  };
}

export function duplicateEquipmentWeapon(
  draft: EquipmentEditorDraft,
  index: number,
  options: IdOptions = {},
): EquipmentEditorDraft {
  const source = draft.equipment.weapons[index];

  if (!source) return draft;

  return {
    ...draft,
    equipment: {
      ...draft.equipment,
      weapons: [
        ...draft.equipment.weapons,
        {
          ...source,
          id: generateStandardEquipmentId({
            packName: draft.name,
            author: draft.author,
            kind: "weapon",
            ...options,
          }),
          modifierContributions: source.modifierContributions.map(
            (contribution) => ({
              ...contribution,
              definition: { ...contribution.definition },
              editable: { ...contribution.editable },
            }),
          ),
        },
      ],
    },
  };
}

export function duplicateEquipmentArmor(
  draft: EquipmentEditorDraft,
  index: number,
  options: IdOptions = {},
): EquipmentEditorDraft {
  const source = draft.equipment.armor[index];

  if (!source) return draft;

  return {
    ...draft,
    equipment: {
      ...draft.equipment,
      armor: [
        ...draft.equipment.armor,
        {
          ...source,
          id: generateStandardEquipmentId({
            packName: draft.name,
            author: draft.author,
            kind: "armor",
            ...options,
          }),
          baseThresholds: { ...source.baseThresholds },
          modifierContributions: source.modifierContributions.map(
            (contribution) => ({
              ...contribution,
              definition: { ...contribution.definition },
              editable: { ...contribution.editable },
            }),
          ),
        },
      ],
    },
  };
}

export function deleteEquipmentWeapon(
  draft: EquipmentEditorDraft,
  index: number,
): EquipmentEditorDraft {
  if (!draft.equipment.weapons[index]) return draft;

  return {
    ...draft,
    equipment: {
      ...draft.equipment,
      weapons: draft.equipment.weapons.filter(
        (_, itemIndex) => itemIndex !== index,
      ),
    },
  };
}

export function deleteEquipmentArmor(
  draft: EquipmentEditorDraft,
  index: number,
): EquipmentEditorDraft {
  if (!draft.equipment.armor[index]) return draft;

  return {
    ...draft,
    equipment: {
      ...draft.equipment,
      armor: draft.equipment.armor.filter(
        (_, itemIndex) => itemIndex !== index,
      ),
    },
  };
}

export function updateEquipmentWeapon(
  draft: EquipmentEditorDraft,
  index: number,
  patch: Partial<WeaponEditorDraft>,
): EquipmentEditorDraft {
  if (!draft.equipment.weapons[index]) return draft;

  return {
    ...draft,
    equipment: {
      ...draft.equipment,
      weapons: draft.equipment.weapons.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    },
  };
}

export function updateEquipmentArmor(
  draft: EquipmentEditorDraft,
  index: number,
  patch: Partial<ArmorEditorDraft>,
): EquipmentEditorDraft {
  if (!draft.equipment.armor[index]) return draft;

  return {
    ...draft,
    equipment: {
      ...draft.equipment,
      armor: draft.equipment.armor.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    },
  };
}

export function updateEquipmentMetadata<
  K extends "name" | "version" | "author" | "description",
>(
  draft: EquipmentEditorDraft,
  field: K,
  value: EquipmentEditorDraft[K],
): EquipmentEditorDraft {
  const previous = { name: draft.name, author: draft.author };
  const nextDraft = { ...draft, [field]: value };

  if (field !== "name" && field !== "author") return nextDraft;

  const rewritten = rewriteEquipmentIdsForMetadataChange({
    previous,
    next: { name: nextDraft.name, author: nextDraft.author },
    weapons: nextDraft.equipment.weapons,
    armor: nextDraft.equipment.armor,
  });

  return {
    ...nextDraft,
    equipment: { weapons: rewritten.weapons, armor: rewritten.armor },
  };
}

export function hasEquipmentItems(draft: EquipmentEditorDraft): boolean {
  return draft.equipment.weapons.length + draft.equipment.armor.length > 0;
}

export function findDuplicateEquipmentIds(
  draft: EquipmentEditorDraft,
): string[] {
  const ids = [...draft.equipment.weapons, ...draft.equipment.armor]
    .map((item) => item.id)
    .filter(Boolean);
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const id of ids) {
    if (seen.has(id)) duplicates.add(id);
    seen.add(id);
  }

  return Array.from(duplicates);
}
