# `sheet-data` to Zustand Migration Plan

This document outlines the phased migration of the character sheet's state (`sheet-data`) from React's `useState` to a global Zustand store. The primary goals are to eliminate prop-drilling, improve performance, and centralize state logic.

---

## Phase 1: Store Creation and Root Integration (The Foundation) ✅

**Objective:** Set up the store and integrate it at the highest level without breaking the existing prop-based architecture.

*   [x] **1. Create `sheet-store.ts`:**
    *   Create a new file at `lib/sheet-store.ts`.
    *   Define a Zustand store that holds the `sheetData` object and a generic `setSheetData` action.
    *   The initial state should be loaded from `defaultSheetData`.

*   [x] **2. Integrate Store in `CharacterSheet` Component:**
    *   In `components/character-sheet.tsx`, replace the `useState<SheetData>(...)` hook with the new `useSheetStore` hook.
    *   The component will now source `sheetData` and `setSheetData` from the global store.
    *   **Crucially, continue passing `sheetData` and `setSheetData` as props to all direct child components.** This is the key to this phase's safety, as the rest of the application remains unaware of the change.

*   **Verification for Phase 1:** The application should look and function exactly as it did before. No functionality change is expected.

---

## Phase 2: Incremental Component Refactoring (Top-Down Removal of Prop-Drilling)

**Objective:** Systematically work down the component tree, connecting components to the store directly and removing the now-redundant props.

*   [x] **3. Refactor Page-Level Components:**
    *   **Target:** `character-sheet-page-two.tsx`, `character-sheet-page-three.tsx`, `character-sheet-page-four.tsx`, `character-sheet-page-five.tsx`.
    *   For each page component:
        *   Import and use the `useSheetStore` hook to get `sheetData` and `setSheetData`.
        *   Remove `sheetData` and `setSheetData` from its props interface.
        *   Update `app/page.tsx` to no longer pass these props to the refactored page components.

*   [x] **4. Refactor Section-Level Components:**
    *   **Target:** All section components (e.g., `header-section.tsx`, `attributes-section.tsx`, `armor-section.tsx`, `card-deck-section.tsx`, etc.).
    *   **Completed:** `gold-section.tsx`, `hope-section.tsx`, `experience-section.tsx`, `hit-points-section.tsx`, `attributes-section.tsx`, `inventory-section.tsx`, `header-section.tsx`, `armor-section.tsx`, `inventory-weapon-section.tsx`, `weapon-section.tsx`
    *   **Status:** ✅ All section components have been successfully migrated to Zustand!
    *   For each section component:
        *   Connect it directly to the `useSheetStore` hook.
        *   Remove the `sheetData`/`setSheetData` props.
        *   Update its parent page component to stop passing the props.

*   [ ] **5. Refactor Modal Components:**
    *   **Target:** All modals that read or modify `sheetData` (e.g., `armor-selection-modal.tsx`, `weapon-selection-modal.tsx`, `character-management-modal.tsx`).
    *   Apply the same refactoring pattern: use the store, remove the props, and update the component that invokes the modal.

*   **Verification for Phase 2:** After each step, perform a quick functional test of the refactored component to ensure it still reads and updates data correctly.

---

## Phase 3: Optimization and Cleanup (Unlocking Performance)

**Objective:** Transition from a generic `setSheetData` to granular actions and selectors to prevent unnecessary re-renders and centralize business logic.

*   [ ] **6. Implement Granular Selectors:**
    *   In components that only need a small part of `sheetData` (e.g., `GoldSection` only needs `gold`), modify the `useSheetStore` call to use a selector function (e.g., `useSheetStore(state => state.sheetData.gold)`).
    *   This is a critical performance optimization.

*   [ ] **7. Implement Granular Actions:**
    *   Create specific, named actions in the store for common updates (e.g., `updateAttribute(attr, value)`, `addInventoryItem(item)`, `setHope(newHope)`).
    *   Refactor components to call these specific actions instead of the generic `setSheetData`. This makes the intent of the update clearer and centralizes the modification logic.

*   [ ] **8. Final Review and Thorough Testing:**
    *   Perform a full code review of all changed files for consistency and correctness.
    *   Conduct comprehensive end-to-end testing of all character sheet functionality:
        *   Editing every field.
        *   Updating attributes, HP, stress, hope, and experience.
        *   Managing inventory, gold, and armor.
        *   Selecting and changing all card types.
        *   Verifying data persistence (saving and loading).
