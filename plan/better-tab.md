# Tab Navigation Improvement Plan

## Overview
Current tab system needs improvement to support more pages flexibly. Currently, pages 1-2 are mandatory, page 3 is optional (controlled by eye icon), and page 4 (armor template) is always shown. We need a scalable solution for future pages, including future support for duplicatable pages.

## Current Implementation Analysis

### Current Structure
```
- Page 1 (page1): CharacterSheet - Always visible
- Page 2 (page2): CharacterSheetPageTwo - Always visible  
- Page 3 (page3): CharacterSheetPageThree - Optional (eye icon toggle)
- Page 4 (page4): ArmorTemplatePage - Always visible
```

### Additional Pages (Print Mode Only)
- CharacterSheetPageFour: Focused cards deck (shown when cards exist)
- CharacterSheetPageFive: Inventory cards deck (shown when inventory cards exist)

### Current Issues
1. Inflexible design for adding new pages
2. Eye icon only controls page 3
3. No scalable pattern for future optional pages
4. Mobile responsiveness concerns with more tabs
5. No support for multiple instances of the same page type

## Proposed Solution

### 1. UI/UX Design Changes

#### Desktop Experience
- Keep pages 1-2 as mandatory tabs
- Replace the eye icon with a "+" (plus) button at the rightmost position
- Clicking "+" opens a dropdown menu showing:
  - Available page types to add
  - Option to duplicate certain pages (e.g., adventure notes)
  - Checkboxes for simple toggle pages
- Selected pages appear as tabs between page 2 and the "+" button
- Tab order: [Page 1] [Page 2] [Optional Pages...] [+]

#### Mobile Experience
- Use horizontal scrolling for tabs when they exceed screen width
- Consider using icons or abbreviated names for tabs on small screens
- The "+" button remains fixed at the right edge
- Implement touch-friendly gestures for tab navigation

### 2. Data Structure Updates

```typescript
// In SheetData interface (lib/sheet-data.ts)
export interface SheetData {
  // ... existing fields
  
  // Replace includePageThreeInExport with:
  pageVisibility?: {
    page3: boolean;         // Character notes page
    armorTemplate: boolean; // Armor template page
    // Future single-instance pages
  }
  
  // Support for duplicatable pages
  adventureNotes?: AdventureNotePage[];  // Array for multiple instances
}

// New interface for adventure notes
export interface AdventureNotePage {
  id: string;           // Unique identifier
  title: string;        // Custom tab title
  content: string;      // Markdown or rich text content
  createdAt: string;    // ISO date string
  lastModified: string; // ISO date string
}
```

### 3. Migration Requirements

#### Character Creation/Import Points
Need to update all places where characters are created or imported:

1. **Direct Character Creation**:
   - `createNewCharacter()` in `lib/multi-character-storage.ts`
   - `defaultSheetData` in `lib/default-sheet-data.ts`
   
2. **Character Import**:
   - HTML import: `importCharacterFromHTMLFile()` in `lib/html-importer.ts`
   - JSON import: `importCharacterData()` in `lib/storage.ts`
   - Data migration: `migrateToMultiCharacterStorage()` in `lib/multi-character-storage.ts`

3. **Character Duplication**:
   - `duplicateCharacter()` in `lib/multi-character-storage.ts`

#### Migration Strategy
```typescript
// Helper function to ensure page fields exist
function ensurePageFields(data: SheetData): SheetData {
  return {
    ...data,
    // Migrate old field
    pageVisibility: data.pageVisibility || {
      page3: data.includePageThreeInExport ?? true,
      armorTemplate: true
    },
    // Initialize adventure notes if missing
    adventureNotes: data.adventureNotes || [],
    // Remove deprecated field
    includePageThreeInExport: undefined
  };
}
```

### 4. Implementation Steps

#### Step 1: Update Data Model
1. Add `pageVisibility` and `adventureNotes` fields to `SheetData` interface
2. Create migration logic in all character creation/import points
3. Update `default-sheet-data.ts` with default visibility settings

#### Step 2: Create Page Management Components
1. Create `PageVisibilityDropdown` component:
   ```typescript
   // components/ui/page-visibility-dropdown.tsx
   interface PageOption {
     id: string;
     label: string;
     type: 'toggle' | 'duplicatable';
     visible?: boolean;  // For toggle pages
     instances?: any[];  // For duplicatable pages
   }
   ```

2. Create `AdventureNotesPage` component:
   ```typescript
   // components/character-sheet-adventure-notes.tsx
   - Markdown editor for content
   - Auto-save functionality
   - Print-friendly layout
   ```

#### Step 3: Update Main Page Component
1. Modify tab rendering logic in `app/page.tsx`:
   - Generate dynamic tab list based on pageVisibility and adventureNotes
   - Handle dynamic tab creation/deletion
   - Support custom tab titles for duplicatable pages

2. Update keyboard shortcuts:
   - Keep 1, 2 for mandatory pages
   - Dynamically assign 3+ to visible optional pages
   - Consider Alt+N for new adventure note

#### Step 5: Update Print/Export Logic

##### 5.1 Update Print Preview
```typescript
// File: app/page.tsx
// Update print preview section (~line 898)
// Replace the conditional rendering with:
{formData.pageVisibility?.page3 && (
  <div className={`page-three flex justify-center items-start min-h-screen pb-20 ${lastPageClass === 'page-three' ? 'last-printed-page' : ''}`}>
    <CharacterSheetPageThree />
  </div>
)}

// Add armor template to print preview (after page three):
{formData.pageVisibility?.armorTemplate && (
  <div className="page-armor flex justify-center items-start min-h-screen">
    <ArmorTemplatePage />
  </div>
)}
```

##### 5.2 Update Export Functions
```typescript
// The export functions should already handle the data correctly
// since they export the entire formData object
// Just ensure the migration is applied when importing
```

#### Step 6: Mobile Optimizations

##### 6.1 Make Tabs Scrollable on Mobile
```typescript
// File: app/page.tsx
// Wrap TabsList in a scrollable container:
<div className="w-full overflow-x-auto">
  <TabsList className="grid w-full grid-cols-[1fr_1fr_auto_auto_auto] min-w-fit">
    {/* Tab content */}
  </TabsList>
</div>
```

##### 6.2 Add CSS for Smooth Scrolling
```css
// File: app/globals.css
// Add to the existing styles:
@media (max-width: 768px) {
  .tabs-list-container {
    -webkit-overflow-scrolling: touch;
    scroll-behavior: smooth;
  }
  
  .tabs-list-container::-webkit-scrollbar {
    display: none;
  }
}
```

### 5. Component Dependencies

#### Components to Modify
- `app/page.tsx` - Main tab navigation
- `lib/sheet-data.ts` - Data structure
- `lib/default-sheet-data.ts` - Default values
- `lib/sheet-store.ts` - State management
- `lib/multi-character-storage.ts` - Character operations
- `lib/storage.ts` - Import/export functions
- `lib/html-importer.ts` - HTML import logic
- `lib/html-exporter.ts` - HTML export logic

#### New Components to Create
- `components/ui/page-visibility-dropdown.tsx`
- Future: `components/character-sheet-adventure-notes.tsx` (not in current scope)
- Optional: `components/ui/scrollable-tabs.tsx` (can use CSS instead)

### 6. Testing Considerations

1. **Migration Tests**:
   - Existing characters get default pageVisibility
   - Old includePageThreeInExport migrates correctly
   - Import functions handle missing fields

2. **Functionality Tests**:
   - Add/remove adventure notes pages
   - Tab visibility toggles correctly
   - Data persists across sessions
   - Export includes all pages

3. **Edge Cases**:
   - Maximum number of adventure notes
   - Very long tab titles
   - Rapid page creation/deletion
   - Import with unknown page types

### 7. Future Extensibility

This design supports future page types:
1. **Single-instance pages**: Add to `pageVisibility` object
2. **Multi-instance pages**: Create new array field like `adventureNotes`
3. **Custom page types**: Extend page option interface

Example future additions:
- Campaign tracker (duplicatable)
- NPC roster (single)
- Session notes (duplicatable)
- Quick reference (single)

### 8. Implementation Priority

1. **Phase 1**: Core infrastructure (Current)
   - Data structure updates
   - Migration logic for all character operations
   - Page visibility dropdown component
   - Update tab rendering logic

2. **Phase 2**: Polish & Testing
   - Mobile optimizations
   - Update keyboard shortcuts
   - Test all import/export functions
   - Ensure backward compatibility

3. **Phase 3**: Future Features (Not in current scope)
   - Adventure notes infrastructure
   - Duplicatable page support
   - Additional optional pages

## Technical Considerations

### Performance
- Lazy load page components
- Virtualize tabs if count exceeds threshold
- Debounce auto-save for future duplicatable pages

### Accessibility
- ARIA labels for dynamic tabs
- Keyboard navigation support
- Screen reader announcements for tab changes

### Storage
- Consider localStorage limits with future duplicatable pages
- Implement data compression if needed
- Add warning before data loss operations

## Summary

This enhanced plan provides:
- Flexible tab system supporting toggle pages (with interface prepared for future duplicatable pages)
- Comprehensive migration strategy for all character operations
- Future-proof architecture for new page types
- Mobile-first responsive design
- Maintains backward compatibility

The implementation ensures data integrity across all character creation, import, and duplication operations while providing a smooth user experience. Adventure notes and other duplicatable pages can be easily added in the future using the prepared interfaces.

## Testing Checklist

### Before Implementation
- [ ] Create backup of current codebase
- [ ] Document current behavior for regression testing

### During Implementation
- [ ] Test data migration from `includePageThreeInExport` to `pageVisibility`
- [ ] Verify all character creation points use migration helper
- [ ] Test import functions (HTML, JSON) with old format data
- [ ] Verify dropdown menu appears and functions correctly
- [ ] Test tab visibility toggle for each page
- [ ] Ensure keyboard shortcuts work with dynamic tabs
- [ ] Test mobile scrolling behavior
- [ ] Verify print preview respects page visibility
- [ ] Test all export formats include correct pages

### After Implementation
- [ ] Load existing characters - verify migration works
- [ ] Create new character - verify default page visibility
- [ ] Import old format JSON - verify migration
- [ ] Import HTML - verify page visibility preserved
- [ ] Duplicate character - verify page settings copied
- [ ] Test on mobile devices (iOS Safari, Android Chrome)
- [ ] Test keyboard navigation (1-4 keys, arrow keys)
- [ ] Export and re-import character data
- [ ] Print preview with various page combinations
- [ ] Performance test with all pages visible

### Edge Cases to Test
- [ ] All optional pages hidden
- [ ] Rapid toggling of page visibility
- [ ] Import data with unknown fields
- [ ] Browser refresh maintains state
- [ ] Very small screen sizes
- [ ] Keyboard shortcuts with no optional pages visible