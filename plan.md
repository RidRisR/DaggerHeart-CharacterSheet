Okay, let's formulate a comprehensive plan and execute it step by step.

**Overall Goal:** Refactor `FormData` access to be centralized through form-data.ts and a custom hook, then implement card ID validation.

**Phase 1: Centralize `FormData` Access Logic**

**Step 1.1: Define `CharacterData` and `getDefaultFormData` (if not already perfect)**

*   Ensure form-data.ts has a robust `getDefaultFormData()` function that returns a complete and valid initial `FormData` object.
*   I'll also need to understand the `CharacterData` type if it's a wrapper around `FormData` as hinted in previous discussions. The semantic search didn't explicitly return its definition, so I'll proceed assuming `FormData` is the primary state object managed directly for now.

**Step 1.2: Create Selector and Mutator Functions in form-data.ts**

*   I will start by adding a few basic selector and mutator functions to form-data.ts for commonly accessed fields like `name`, `level`, `ancestry1`, `profession`, and `cards`.
*   Selectors will take `formData: FormData` and return the specific field's value.
*   Mutators will take `formData: FormData` and the new value, returning a *new* `FormData` object.

**Step 1.3: Create the `useCharacterSheet` Hook**

*   Create a new file: `/Users/ris/Desktop/DaggerHeart-CharacterSheet/hooks/useCharacterSheet.ts`.
*   This hook will:
    *   Initialize its state using `loadCharacterData()` from storage.ts (or `getDefaultFormData()` if loading fails).
    *   Provide selected data points (e.g., `characterName`) using the selector functions from form-data.ts.
    *   Provide updater functions (e.g., `setCharacterName`) that use the mutator functions from form-data.ts and then call `setFormData` (from `useState`) and `saveCharacterData` (from storage.ts).

**Step 1.4: Refactor a Pilot Component (e.g., `HeaderSection`)**

*   Identify a component that uses `formData` and `setFormData` directly, for example, header-section.tsx.
*   Modify this component to:
    *   Use the `useCharacterSheet` hook.
    *   Access data via the properties exposed by the hook (e.g., `hook.characterName`).
    *   Update data using the functions exposed by the hook (e.g., `hook.setCharacterName('new name')`).
    *   Remove direct `formData` prop drilling if possible (this might be a later step if `HeaderSection` is deeply nested).

**Step 1.5: Iteratively Refactor Other Components**

*   Gradually apply Step 1.4 to other components that interact with `FormData`.
*   As new data fields or update patterns are encountered, add corresponding selector/mutator functions to form-data.ts and expose them through the `useCharacterSheet` hook.
*   Key components to target early would be those in character-sheet-sections and the main page components like character-sheet.tsx and page.tsx.

**Phase 2: Implement Card ID Validation**

**Step 2.1: Create `extractAllCardIds` Function**

*   In form-data.ts, implement `extractAllCardIds(formData: FormData): string[]` as discussed previously, ensuring it covers all fields that store card IDs (e.g., `ancestry1`, `profession`, `cards`, etc.). I will use the provided form-data.ts structure as a reference.
    *   The `cards: StandardCard[]` field in `FormData` will require iterating through the array and extracting `card.id` from each `StandardCard` object.

**Step 2.2: Integrate Validation into `useCharacterSheet` Hook or Loading Process**

*   **Fetch Valid IDs:** Inside the `useCharacterSheet` hook (or a dedicated validation function called by it), use `getAllCards()` from card-manager.ts (or index.ts) to get all valid `StandardCard` objects and create a `Set` of their IDs.
*   **Perform Validation:** After `formData` is loaded (or on specific updates):
    1.  Call `extractAllCardIds` on the current `formData`.
    2.  Compare these IDs against the set of valid card IDs.
    3.  Collect any invalid IDs.
*   **Notification:**
    *   If invalid IDs are found, use the `toast` system (use-toast.ts) to notify the user. The `useCharacterSheet` hook is a suitable place to invoke `useToast`.
*   **Sanitization (Optional - to be decided based on strictness):**
    *   Decide on the sanitization strategy (e.g., remove invalid IDs, nullify fields). This logic would also reside in form-data.ts as new mutator functions or be part of the validation flow within the hook. For now, the focus will be on detection and notification.

**Execution Plan - Starting with Phase 1:**

Let's begin with **Step 1.2** and **Step 1.3**. I'll create the initial helper functions in form-data.ts and the basic structure for `hooks/useCharacterSheet.ts`.

**Step 1.2: Add initial selectors and mutators to form-data.ts**
I will add functions for `name`, `level`, `ancestry1`, `profession`, and `cards`.
```typescript
// File: /Users/ris/Desktop/DaggerHeart-CharacterSheet/lib/form-data.ts

// ...existing code...
import { StandardCard } from "@/data/card/card-types"; // Ensure this is imported

// ... existing interfaces (CheckedUpgrades, AttributeValue, FormData) ...

// --- Selector Functions ---
export const getCharacterName = (formData: FormData): string => formData.name;
export const getCharacterLevel = (formData: FormData): number => formData.level;
export const getAncestry1Id = (formData: FormData): string | undefined => formData.ancestry1;
export const getProfessionId = (formData: FormData): string => formData.profession;
export const getAllCardsFromData = (formData: FormData): StandardCard[] => formData.cards || [];

// --- Mutator Functions ---
// Note: These return new FormData objects for immutability

export const updateCharacterName = (formData: FormData, newName: string): FormData => ({
  ...formData,
  name: newName,
});

export const updateCharacterLevel = (formData: FormData, newLevel: number): FormData => ({
  ...formData,
  level: newLevel,
});

export const updateAncestry1Id = (formData: FormData, newAncestry1Id?: string): FormData => ({
  ...formData,
  ancestry1: newAncestry1Id,
});

export const updateProfessionId = (formData: FormData, newProfessionId: string): FormData => ({
  ...formData,
  profession: newProfessionId,
});

export const setCardsInData = (formData: FormData, newCards: StandardCard[]): FormData => ({
  ...formData,
  cards: newCards,
});

export const addCardToData = (formData: FormData, newCard: StandardCard): FormData => ({
  ...formData,
  cards: [...(formData.cards || []), newCard],
});

// It's good practice to also have a getDefaultFormData function if not already present or perfect.
// export const getDefaultFormData = (): FormData => { ... };
```