import type { StandardCard } from "@/card/card-types";
import { readTargetValue } from "@/automation/core/target-accessors";
import type { ModifierTargetId } from "@/automation/core/types";
import type { SheetData } from "@/lib/sheet-data";
import type {
  CardAutomationIR,
  CardAutomationSourceSnapshot,
  CardInstanceAutomationState,
  CardTier,
  CardZone,
} from "./ir-types";
import {
  toCardAutomationCardFact,
  type CardAutomationCardFact,
} from "./card-getters";

const FIXED_TARGETS = [
  "evasion",
  "armorMax",
  "minorThreshold",
  "majorThreshold",
  "hpMax",
  "stressMax",
  "proficiency",
  "agility.value",
  "strength.value",
  "finesse.value",
  "instinct.value",
  "presence.value",
  "knowledge.value",
] as const satisfies readonly ModifierTargetId[];

export interface CardAutomationSnapshotCard extends CardAutomationCardFact {
  instanceId?: string;
  templateId: string;
  name: string;
  zone: CardZone;
  automation?: CardAutomationIR;
  automationState?: CardInstanceAutomationState;
  automationSource?: CardAutomationSourceSnapshot;
  template?: StandardCard;
  templateLookupAttempted: boolean;
}

export interface CardAutomationSnapshot {
  level?: number;
  tier?: CardTier;
  proficiency?: number;
  targetValues: Partial<Record<ModifierTargetId, number>>;
  selectableTargets: {
    attributes: ModifierTargetId[];
    experiences: ModifierTargetId[];
  };
  resolvableTargets: {
    attributes: ModifierTargetId[];
    experiences: ModifierTargetId[];
  };
  equipmentSlots: {
    armor: { empty: boolean };
    primaryWeapon: { empty: boolean };
    secondaryWeapon: { empty: boolean };
  };
  cards: CardAutomationSnapshotCard[];
}

export interface BuildCardAutomationSnapshotOptions {
  findTemplateById?: (templateId: string) => StandardCard | undefined;
}

function parseFiniteNumber(value: unknown): number | undefined {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value !== "string") return undefined;
  if (value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function tierFromLevel(level: number): CardTier {
  if (level >= 1 && level <= 4) return "1";
  if (level >= 5 && level <= 7) return "2";
  if (level >= 8 && level <= 10) return "3";
  return "4";
}

function isNonEmptyCard(card: StandardCard | undefined | null): card is StandardCard {
  if (!card?.name?.trim()) return false;
  return card.type !== "unknown" && card.id !== "";
}

function equipmentSlotEmpty(slot?: { name?: string }): boolean {
  return !slot?.name?.trim();
}

function buildCard(
  card: StandardCard,
  zone: CardZone,
  options: BuildCardAutomationSnapshotOptions,
): CardAutomationSnapshotCard {
  const templateId = card.automationSource?.templateId || card.id;
  const templateLookupAttempted = Boolean(options.findTemplateById);
  return {
    ...toCardAutomationCardFact(card),
    instanceId: card.instanceId,
    templateId,
    name: card.name,
    zone,
    automation: card.automation,
    automationState: card.automationState,
    automationSource: card.automationSource,
    template: options.findTemplateById?.(templateId),
    templateLookupAttempted,
  };
}

function readNumericTargetValues(
  sheetData: SheetData,
): Partial<Record<ModifierTargetId, number>> {
  const targetValues: Partial<Record<ModifierTargetId, number>> = {};
  const targets: ModifierTargetId[] = [
    ...FIXED_TARGETS,
    ...experienceSlotTargets(sheetData),
  ];

  targets.forEach((target) => {
    const parsed = parseFiniteNumber(readTargetValue(sheetData, target));
    if (parsed !== undefined) targetValues[target] = parsed;
  });
  return targetValues;
}

function experienceSlotTargets(sheetData: SheetData): ModifierTargetId[] {
  const count = Math.max(
    5,
    sheetData.experience?.length ?? 0,
    sheetData.experienceValues?.length ?? 0,
  );
  return Array.from(
    { length: count },
    (_, index) => `experienceValues.${index}` as ModifierTargetId,
  );
}

function readProficiency(sheetData: SheetData): number | undefined {
  const value = readTargetValue(sheetData, "proficiency");
  return parseFiniteNumber(value);
}

export function buildCardAutomationSnapshot(
  sheetData: SheetData,
  options: BuildCardAutomationSnapshotOptions = {},
): CardAutomationSnapshot {
  const level = parseFiniteNumber(sheetData.level);
  const targetValues = readNumericTargetValues(sheetData);
  const experienceTargets: ModifierTargetId[] = [];
  sheetData.experience?.forEach((name, index) => {
    if (name.trim()) experienceTargets.push(`experienceValues.${index}`);
  });
  const attributeTargets: ModifierTargetId[] = [
    "agility.value",
    "strength.value",
    "finesse.value",
    "instinct.value",
    "presence.value",
    "knowledge.value",
  ];

  return {
    level,
    tier: level === undefined ? undefined : tierFromLevel(level),
    proficiency: readProficiency(sheetData),
    targetValues,
    selectableTargets: {
      attributes: attributeTargets,
      experiences: experienceTargets,
    },
    resolvableTargets: {
      attributes: attributeTargets,
      experiences: experienceSlotTargets(sheetData),
    },
    equipmentSlots: {
      armor: { empty: equipmentSlotEmpty(sheetData.equipment?.armorSlot) },
      primaryWeapon: {
        empty: equipmentSlotEmpty(sheetData.equipment?.weaponSlots.primary),
      },
      secondaryWeapon: {
        empty: equipmentSlotEmpty(sheetData.equipment?.weaponSlots.secondary),
      },
    },
    cards: [
      ...(sheetData.cards ?? [])
        .filter(isNonEmptyCard)
        .map((card) => buildCard(card, "loadout", options)),
      ...(sheetData.inventory_cards ?? [])
        .filter(isNonEmptyCard)
        .map((card) => buildCard(card, "vault", options)),
    ],
  };
}
