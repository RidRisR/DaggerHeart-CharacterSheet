"use client";

import { create } from "zustand";
import { defaultSheetData } from "./default-sheet-data";
import type { SheetData } from "./sheet-data";

interface SheetState {
    sheetData: SheetData;
    setSheetData: (data: Partial<SheetData> | ((prevState: SheetData) => Partial<SheetData>)) => void;
    replaceSheetData: (data: SheetData) => void;
}

export const useSheetStore = create<SheetState>((set) => ({
    sheetData: defaultSheetData,
    setSheetData: (updater) => {
        set((state) => {
            const updatedData = typeof updater === 'function' ? updater(state.sheetData) : updater;
            return { sheetData: { ...state.sheetData, ...updatedData } };
        });
    },
    replaceSheetData: (newData) => set({ sheetData: newData }),
}));
