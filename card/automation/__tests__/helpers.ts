import type { SheetData } from "@/lib/sheet-data";
import { defaultSheetData } from "@/lib/default-sheet-data";

export function makeSheet(overrides: Partial<SheetData> = {}): SheetData {
  return {
    ...defaultSheetData,
    schemaVersion: 3,
    name: "",
    cards: [],
    inventory_cards: [],
    experience: ["Smith", "", "", "", ""],
    experienceValues: ["0", "", "", "", ""],
    proficiency: 2,
    level: "1",
    agility: { value: "3", checked: false },
    strength: { value: "2", checked: false },
    finesse: { value: "0", checked: false },
    instinct: { value: "0", checked: false },
    presence: { value: "0", checked: false },
    knowledge: { value: "0", checked: false },
    evasion: "10",
    armorMax: "0",
    minorThreshold: "4",
    majorThreshold: "8",
    hpMax: 6,
    stressMax: 6,
    equipment: defaultSheetData.equipment,
    modifierState: { targetStates: {}, entryStates: {} },
    userModifierContributions: [],
    ...overrides,
  } as SheetData;
}
