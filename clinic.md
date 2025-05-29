# Refactoring Plan for `card-selection-modal.tsx` Performance Improvement

**Goal:** Significantly improve the modal's responsiveness, especially when filtering and displaying cards.

**General Principles:**
*   **Measure First:** Before and after each significant change, ideally use the React DevTools Profiler to quantify the impact.
*   **Incremental Changes:** Apply one optimization at a time to isolate its effect and simplify debugging.
*   **Test Thoroughly:** Ensure functionality remains correct after each step.

---

**Phase 1: Reducing Computational Load & Re-renders**

*   **Step 1.1: Optimize Card Filtering Logic (`useEffect` for `filteredCards`)**
    *   **Analysis:** The current `useEffect` filters `ALL_STANDARD_CARDS` on every change to `activeTab`, `searchTerm`, `selectedClasses.values`, `selectedLevels.values`, or `isOpen`. If `ALL_STANDARD_CARDS` is large, this is a major bottleneck.
    *   **Action:**
        1.  **Pre-filter by `activeTab`:** Create a memoized list of cards that only belong to the `activeTab`. This initial filtering should happen only when `activeTab` changes. Subsequent filters (search, class, level) will operate on this smaller, pre-filtered list.
            ```typescript
            // Example:
            const cardsForActiveTab = useMemo(() => {
              if (!activeTab) return [];
              return ALL_STANDARD_CARDS.filter(card => {
                const cardTypeProcessed = (card.type || "unknown").replace(/卡$/, "");
                const activeTabProcessed = activeTab.replace(/卡$/, "");
                return cardTypeProcessed === activeTabProcessed;
              });
            }, [activeTab]);

            // Then, in the main filtering useEffect:
            // let filtered = cardsForActiveTab;
            // ... apply searchTerm, selectedClasses, selectedLevels filters to 'filtered'
            ```
    *   **Potential Side Effects:**
        *   Incorrect `useMemo` dependencies for `cardsForActiveTab` could lead to stale data. Ensure `activeTab` is the sole dependency if `ALL_STANDARD_CARDS` is constant.

*   **Step 1.2: Debounce Search Term Input**
    *   **Analysis:** Rapid typing in the search input can trigger many re-filters.
    *   **Action:** Implement debouncing for the `searchTerm` state. The filtering `useEffect` should then depend on the debounced search term instead of the direct `searchTerm`.
        *   Create a custom hook like `useDebounce` or use a library utility.
    *   **Potential Side Effects:**
        *   A slight delay (e.g., 300-500ms) between typing and the filter updating. This is usually acceptable and often improves perceived performance.

*   **Step 1.3: Review and Optimize `useMemo` Dependencies**
    *   **Analysis:** Ensure all `useMemo` hooks (`classOptions`, `levelOptions`, and the new `cardsForActiveTab`) have the minimal correct dependencies.
    *   **Action:** Verify that dependencies accurately reflect when the memoized value needs to be recalculated.
    *   **Potential Side Effects:**
        *   Overly aggressive memoization (missing dependencies) can lead to stale UI. Too loose (unnecessary dependencies) reduces memoization benefits.

---

**Phase 2: Optimizing Rendering**

*   **Step 2.1: Virtualize the Card List**
    *   **Analysis:** If a large number of `filteredCards` are rendered directly into the DOM, it can be very slow.
    *   **Action:** If, after Step 1, rendering many cards is still an issue, implement list virtualization for the `filteredCards` display. Libraries like `react-window` or `react-virtualized` can be used to render only the visible items.
    *   **Potential Side Effects:**
        *   Adds complexity to the component.
        *   May require fixed item heights or more complex dynamic height calculations.
        *   Accessibility considerations need to be managed carefully with virtualized lists.

*   **Step 2.2: Memoize Individual Card Items (`SelectableCard`)**
    *   **Analysis:** The `SelectableCard` component is already wrapped in `React.memo` in `card-deck-section.tsx`. Ensure it's also effectively memoized if used directly within `card-selection-modal.tsx`'s loop, and that its props are stable or primitive where possible.
    *   **Action:** Confirm that props passed to `SelectableCard` (or any repeating child component in the list) are not causing unnecessary re-renders. For example, pass primitive values if possible, and ensure callback functions are memoized with `useCallback` if they are props.
    *   **Potential Side Effects:**
        *   Incorrect `useCallback` dependencies can lead to stale closures in event handlers.

---

**Phase 3: Advanced State Management & Structure (If Needed)**

*   **Step 3.1: Profile with React DevTools**
    *   **Analysis:** If performance issues persist, a deep dive with the React DevTools Profiler is essential.
    *   **Action:** Use the profiler to identify:
        *   Which components are re-rendering most often.
        *   What caused those re-renders (props changed, state changed, context changed).
        *   How much time is spent in the render phase of each component.
    *   **Potential Side Effects:** None directly, but the findings will guide further, more targeted optimizations.

*   **Step 3.2: Consider `useReducer` for Complex State Logic**
    *   **Analysis:** If state update logic for filters becomes very complex and leads to many `useState` calls or intricate `useEffect` interactions, `useReducer` might simplify this and make updates more predictable.
    *   **Action:** Evaluate if the filter state management (`selectedClasses`, `selectedLevels`, `searchTerm`, `activeTab`) could benefit from being managed by a single reducer.
    *   **Potential Side Effects:**
        *   Requires refactoring state update logic. Can be a significant change but often leads to cleaner code for complex state.

*   **Step 3.3: Further Componentization**
    *   **Analysis:** The `CardSelectionModal` is a large component. Breaking it into smaller, focused child components can help isolate re-renders, especially if combined with `React.memo`.
    *   **Action:** Identify sections of the modal (e.g., filter controls, card list display) that could be extracted into their own components.
    *   **Potential Side Effects:**
        *   Increases the number of files/components.
        *   Requires careful prop drilling or consideration of a state management solution if prop drilling becomes too deep.

---

**Implementation Strategy:**

1.  Start with **Phase 1**, as these changes are likely to yield the most significant improvements with relatively moderate effort.
2.  Focus on **Step 1.1 (Pre-filter by `activeTab`)** first, then **Step 1.2 (Debounce Search Term)**.
3.  After each step in Phase 1, test thoroughly and, if possible, profile.
4.  If performance is still not satisfactory, proceed to **Phase 2**, likely starting with **Step 2.1 (Virtualization)** if many cards are displayed.
5.  **Phase 3** should be considered if the previous steps don't resolve the issues or if the code complexity around state and rendering remains high.
