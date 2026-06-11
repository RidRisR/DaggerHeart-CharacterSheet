import type { EquipmentPackApplicationImportResult } from "@/equipment/packs/application-service";
import { create, type StoreApi, type UseBoundStore } from "zustand";
import {
  addEquipmentArmor,
  addEquipmentWeapon,
  createDefaultEquipmentDraft,
  deleteEquipmentArmor,
  deleteEquipmentWeapon,
  duplicateEquipmentArmor,
  duplicateEquipmentWeapon,
  hasEquipmentItems,
  updateEquipmentArmor,
  updateEquipmentMetadata,
  updateEquipmentWeapon,
  type ArmorEditorDraft,
  type EquipmentEditorDraft,
  type WeaponEditorDraft,
} from "./equipment-draft";
import { recoverEquipmentEditorDraft } from "./equipment-import-export";

export type EquipmentEditorTab = "metadata" | "weapons" | "armor";

export interface EquipmentEditorStoreState {
  draft: EquipmentEditorDraft;
  selectedTab: EquipmentEditorTab;
  selectedWeaponIndex: number;
  selectedArmorIndex: number;
  validationResult: EquipmentPackApplicationImportResult | null;
  isValidating: boolean;
  setSelectedTab(tab: EquipmentEditorTab): void;
  setSelectedWeaponIndex(index: number): void;
  setSelectedArmorIndex(index: number): void;
  updateMetadata(
    field: "name" | "version" | "author" | "description",
    value: string,
  ): void;
  resetDraft(): void;
  hasItems(): boolean;
  addWeapon(): void;
  addArmor(): void;
  updateWeapon(index: number, patch: Partial<WeaponEditorDraft>): void;
  updateArmor(index: number, patch: Partial<ArmorEditorDraft>): void;
  duplicateWeapon(index: number): void;
  duplicateArmor(index: number): void;
  deleteWeapon(index: number): void;
  deleteArmor(index: number): void;
  replaceDraftFromUnknown(
    value: unknown,
  ): ReturnType<typeof recoverEquipmentEditorDraft>;
  setValidationResult(
    validationResult: EquipmentPackApplicationImportResult | null,
  ): void;
  setIsValidating(isValidating: boolean): void;
}

function clampSelectedIndex(index: number, length: number) {
  if (length <= 0) return 0;
  return Math.max(0, Math.min(index, length - 1));
}

function selectedIndexAfterDelete(
  selectedIndex: number,
  deletedIndex: number,
  previousLength: number,
) {
  if (deletedIndex < 0 || deletedIndex >= previousLength) {
    return clampSelectedIndex(selectedIndex, previousLength);
  }

  const nextLength = previousLength - 1;
  if (nextLength <= 0) return 0;
  if (deletedIndex < selectedIndex) return selectedIndex - 1;
  if (deletedIndex === selectedIndex) {
    return clampSelectedIndex(selectedIndex, nextLength);
  }
  return clampSelectedIndex(selectedIndex, nextLength);
}

export function createEquipmentEditorStore(): UseBoundStore<
  StoreApi<EquipmentEditorStoreState>
> {
  return create<EquipmentEditorStoreState>((set, get) => ({
    draft: createDefaultEquipmentDraft(),
    selectedTab: "metadata",
    selectedWeaponIndex: 0,
    selectedArmorIndex: 0,
    validationResult: null,
    isValidating: false,
    setSelectedTab: (selectedTab) => set({ selectedTab }),
    setSelectedWeaponIndex: (selectedWeaponIndex) =>
      set((state) => ({
        selectedWeaponIndex: clampSelectedIndex(
          selectedWeaponIndex,
          state.draft.equipment.weapons.length,
        ),
      })),
    setSelectedArmorIndex: (selectedArmorIndex) =>
      set((state) => ({
        selectedArmorIndex: clampSelectedIndex(
          selectedArmorIndex,
          state.draft.equipment.armor.length,
        ),
      })),
    updateMetadata: (field, value) =>
      set((state) => ({
        draft: updateEquipmentMetadata(state.draft, field, value),
        validationResult: null,
      })),
    resetDraft: () =>
      set({
        draft: createDefaultEquipmentDraft(),
        selectedTab: "metadata",
        selectedWeaponIndex: 0,
        selectedArmorIndex: 0,
        validationResult: null,
        isValidating: false,
      }),
    hasItems: () => hasEquipmentItems(get().draft),
    addWeapon: () =>
      set((state) => ({
        draft: addEquipmentWeapon(state.draft),
        selectedTab: "weapons",
        selectedWeaponIndex: state.draft.equipment.weapons.length,
        validationResult: null,
      })),
    addArmor: () =>
      set((state) => ({
        draft: addEquipmentArmor(state.draft),
        selectedTab: "armor",
        selectedArmorIndex: state.draft.equipment.armor.length,
        validationResult: null,
      })),
    updateWeapon: (index, patch) =>
      set((state) => ({
        draft: updateEquipmentWeapon(state.draft, index, patch),
        validationResult: null,
      })),
    updateArmor: (index, patch) =>
      set((state) => ({
        draft: updateEquipmentArmor(state.draft, index, patch),
        validationResult: null,
      })),
    duplicateWeapon: (index) =>
      set((state) => {
        const draft = duplicateEquipmentWeapon(state.draft, index);

        return {
          draft,
          selectedTab: "weapons",
          selectedWeaponIndex:
            draft === state.draft
              ? state.selectedWeaponIndex
              : draft.equipment.weapons.length - 1,
          validationResult:
            draft === state.draft ? state.validationResult : null,
        };
      }),
    duplicateArmor: (index) =>
      set((state) => {
        const draft = duplicateEquipmentArmor(state.draft, index);

        return {
          draft,
          selectedTab: "armor",
          selectedArmorIndex:
            draft === state.draft
              ? state.selectedArmorIndex
              : draft.equipment.armor.length - 1,
          validationResult:
            draft === state.draft ? state.validationResult : null,
        };
      }),
    deleteWeapon: (index) =>
      set((state) => {
        const draft = deleteEquipmentWeapon(state.draft, index);
        if (draft === state.draft) {
          return {
            draft,
            selectedWeaponIndex: state.selectedWeaponIndex,
          };
        }

        return {
          draft,
          selectedWeaponIndex: selectedIndexAfterDelete(
            state.selectedWeaponIndex,
            index,
            state.draft.equipment.weapons.length,
          ),
          validationResult: null,
        };
      }),
    deleteArmor: (index) =>
      set((state) => {
        const draft = deleteEquipmentArmor(state.draft, index);
        if (draft === state.draft) {
          return {
            draft,
            selectedArmorIndex: state.selectedArmorIndex,
          };
        }

        return {
          draft,
          selectedArmorIndex: selectedIndexAfterDelete(
            state.selectedArmorIndex,
            index,
            state.draft.equipment.armor.length,
          ),
          validationResult: null,
        };
      }),
    replaceDraftFromUnknown: (value) => {
      const result = recoverEquipmentEditorDraft(value);

      if (result.ok) {
        set({
          draft: result.draft,
          selectedTab: "metadata",
          selectedWeaponIndex: 0,
          selectedArmorIndex: 0,
          validationResult: null,
          isValidating: false,
        });
      }

      return result;
    },
    setValidationResult: (validationResult) => set({ validationResult }),
    setIsValidating: (isValidating) => set({ isValidating }),
  }));
}

export const useEquipmentEditorStore = createEquipmentEditorStore();
