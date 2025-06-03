# Phase 3: UI Adaptation Plan for Variant Card System

## 📋 Available Variant System Interfaces

### 🔧 Core Conversion & Data Access
```typescript
// 1. Core Converter
variantCardConverter.toStandard(rawCard: RawVariantCard): StandardCard
variantCardConverter.fromStandard(standardCard: StandardCard): RawVariantCard

// 2. Storage Access
CustomCardStorage.getAggregatedVariantTypes(): VariantTypesForBatch
CustomCardStorage.getAggregatedVariantTypesWithTemp(tempBatchId?, tempDefinitions?): VariantTypesForBatch

// 3. Validation
validateVariantCard(card: any, index: number, variantTypes?: Record<string, any>): TypeValidationResult
validateVariantTypeDefinitions(variantTypes: Record<string, any>): ValidationError[]
```

### 🛠️ Helper Functions (card-predefined-field.ts)
```typescript
// 4. Variant Type Management
getVariantTypes(tempBatchId?, tempDefinitions?): Record<string, any>
getVariantTypeNames(tempBatchId?, tempDefinitions?): string[]
getVariantTypeName(variantType: string, tempBatchId?, tempDefinitions?): string
hasVariantType(variantType: string, tempBatchId?, tempDefinitions?): boolean

// 5. Subclass Management  
getVariantSubclasses(variantType: string, tempBatchId?, tempDefinitions?): string[]

// 6. Level Range Support
// Available through VariantTypeDefinition.levelRange: [number, number] | undefined
```

### 🎯 Type System
```typescript
// 7. Enums & Types
CardType.Variant = "variant"
CardCategory.Standard = "standard"
CardCategory.Extended = "extended"

// 8. Data Structures
interface VariantTypeDefinition {
  name: string;
  subclasses: string[];
  defaultLevel?: number;
  levelRange?: [number, number];
  description?: string;
}

interface RawVariantCard {
  id: string;
  名称: string;
  类型: string;          // Maps to variant type
  子类别?: string;       // Maps to subclass from type definition
  等级?: number;         // Must be within levelRange if defined
  效果: string;
  imageUrl?: string;
  简略信息: { item1?: string; item2?: string; item3?: string };
}
```

## 🎨 UI Adaptation Requirements

### Requirement 1: UI Recognition
**Target**: Interface should identify variant's real type and display correctly

**Current Challenge**: 
- Variant cards have `type: "variant"` but need to display their actual variant type (`类型` field)
- Real types are dynamic and come from imported variant type definitions

**Implementation Plan**:
1. **Modify Card Display Components**: Update card display logic to show `card.class` (which contains the real variant type after conversion) instead of generic "variant"
2. **Update Card UI Config**: Extend `getCardTypeName()` to handle variant cards specially
3. **Add Variant Type Name Resolution**: Use `getVariantTypeName()` for proper display names

### Requirement 2: Filtering Enhancement  
**Target**: Filter interface should show corresponding classes based on real type and filter accordingly, with level restrictions within variant's defined range

**Current Challenge**:
- `CARD_CLASS_OPTIONS_BY_TYPE` doesn't include variant types
- Level options need to be dynamically generated based on variant type definitions
- Filtering logic needs to understand variant subtypes

**Implementation Plan**:
1. **Extend UI Config for Variants**: Add variant-specific class and level options
2. **Dynamic Options Generation**: Create functions to generate class/level options based on available variant types
3. **Enhanced Filtering Logic**: Update filter logic to handle variant type/subclass combinations
4. **Level Range Restrictions**: Implement level filtering based on variant type definitions

### Requirement 3: Tab Adaptation
**Target**: 
- Default view should show standard cards with variant types collapsed
- When variant tab opened, standard card types should be collapsed

**Current Challenge**:
- No concept of card category grouping in current tab system
- Need to implement tab collapsing/expanding behavior
- Need to separate standard vs extended card display

**Implementation Plan**:
1. **Tab Grouping System**: Implement category-based tab grouping (Standard vs Extended)
2. **Collapsible Tab Groups**: Add expand/collapse functionality for tab categories
3. **Default View Logic**: Implement logic to show standard tabs expanded, variant collapsed by default
4. **State Management**: Add state management for tab group visibility

## 🔧 Detailed Implementation Strategy

### Step 1: Extend Card UI Configuration
**File**: `data/card/card-ui-config.ts`

```typescript
// Add variant type support
export const CARD_CLASS_OPTIONS_BY_TYPE = {
  // ...existing types...
  [CardType.Variant]: () => {
    const variantTypes = getVariantTypes();
    return Object.entries(variantTypes).map(([typeId, typeDef]) => ({
      value: typeId,
      label: typeDef.name || typeId
    }));
  }
};

// Add variant level options
export function getVariantLevelOptions(variantType: string): { value: string; label: string }[] {
  const variantTypes = getVariantTypes();
  const typeDef = variantTypes[variantType];
  
  if (!typeDef?.levelRange) return [];
  
  const [min, max] = typeDef.levelRange;
  return Array.from({ length: max - min + 1 }, (_, i) => ({
    value: (min + i).toString(),
    label: `等级 ${min + i}`
  }));
}

// Enhanced card type name function
export function getCardTypeName(typeId: CardType, variantType?: string): string {
  if (typeId === CardType.Variant && variantType) {
    return getVariantTypeName(variantType);
  }
  return ALL_CARD_TYPES.get(typeId) || "未知类型";
}
```

### Step 2: Update Card Selection Modal
**File**: `components/modals/card-selection-modal.tsx`

**Changes Required**:
1. **Add Category Grouping Logic**:
   ```typescript
   const cardTypesByCategory = useMemo(() => {
     const standard = getCardTypesByCategory(CardCategory.Standard);
     const extended = getCardTypesByCategory(CardCategory.Extended);
     return { standard, extended };
   }, []);
   ```

2. **Implement Tab Group State**:
   ```typescript
   const [expandedCategories, setExpandedCategories] = useState(new Set(['standard']));
   ```

3. **Dynamic Options for Variants**:
   ```typescript
   const classOptions = useMemo(() => {
     if (!activeTab) return [];
     if (activeTab === CardType.Variant) {
       return CARD_CLASS_OPTIONS_BY_TYPE[CardType.Variant]();
     }
     return CARD_CLASS_OPTIONS_BY_TYPE[activeTab as keyof typeof CARD_CLASS_OPTIONS_BY_TYPE] || [];
   }, [activeTab]);
   
   const levelOptions = useMemo(() => {
     if (activeTab === CardType.Variant && selectedClasses.length === 1) {
       return getVariantLevelOptions(selectedClasses[0]);
     }
     return getLevelOptions(activeTab as CardType);
   }, [activeTab, selectedClasses]);
   ```

4. **Enhanced Filtering for Variants**:
   ```typescript
   const fullyFilteredCards = useMemo(() => {
     // ...existing filtering...
     
     if (activeTab === CardType.Variant) {
       // Special filtering logic for variant cards
       if (selectedClasses.length > 0) {
         filtered = filtered.filter(card => 
           selectedClasses.includes(card.class) // class contains variant type
         );
       }
       
       if (selectedLevels.length > 0 && card.level !== undefined) {
         filtered = filtered.filter(card => 
           selectedLevels.includes(card.level.toString())
         );
       }
     }
     
     return filtered;
   }, [cardsForActiveTab, debouncedSearchTerm, selectedClasses, selectedLevels, activeTab]);
   ```

### Step 3: Implement Tab Category System
**File**: `components/modals/card-selection-modal.tsx`

**New Tab Structure**:
```tsx
<div className="w-48 border-r border-gray-200 bg-gray-50 overflow-y-auto">
  <div className="flex flex-col p-2">
    {/* Standard Card Types */}
    <div className="mb-2">
      <button
        onClick={() => toggleCategoryExpansion('standard')}
        className="w-full text-left px-2 py-1 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded flex items-center justify-between"
      >
        标准卡牌
        <span>{expandedCategories.has('standard') ? '▼' : '▶'}</span>
      </button>
      {expandedCategories.has('standard') && (
        <div className="ml-2 mt-1 space-y-1">
          {cardTypesByCategory.standard.map((type) => (
            <button
              key={type}
              onClick={() => handleTabChange(type)}
              className={`w-full text-left px-3 py-2 text-sm rounded ${
                activeTab === type ? "bg-blue-200" : "hover:bg-gray-100"
              }`}
            >
              {ALL_CARD_TYPES.get(type)}
            </button>
          ))}
        </div>
      )}
    </div>
    
    {/* Extended Card Types (Variants) */}
    <div>
      <button
        onClick={() => toggleCategoryExpansion('extended')}
        className="w-full text-left px-2 py-1 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded flex items-center justify-between"
      >
        扩展卡牌
        <span>{expandedCategories.has('extended') ? '▼' : '▶'}</span>
      </button>
      {expandedCategories.has('extended') && (
        <div className="ml-2 mt-1 space-y-1">
          {cardTypesByCategory.extended.map((type) => (
            <button
              key={type}
              onClick={() => handleTabChange(type)}
              className={`w-full text-left px-3 py-2 text-sm rounded ${
                activeTab === type ? "bg-green-200" : "hover:bg-gray-100"
              }`}
            >
              {ALL_CARD_TYPES.get(type)}
            </button>
          ))}
        </div>
      )}
    </div>
  </div>
</div>
```

### Step 4: Update Card Display Components
**Files**: Various card display components

**Changes Required**:
1. **Enhanced Type Display**: Show variant type name instead of generic "variant"
2. **Subclass Display**: Show variant subclass information appropriately
3. **Level Display**: Handle variant-specific level display logic

### Step 5: Add Category Helper Functions
**File**: `data/card/card-types.ts`

```typescript
// Implementation for getCardTypesByCategory
export function getCardTypesByCategory(category: CardCategory): CardType[] {
  switch (category) {
    case CardCategory.Standard:
      return [
        CardType.Profession,
        CardType.Ancestry, 
        CardType.Community,
        CardType.Subclass,
        CardType.Domain
      ];
    case CardCategory.Extended:
      return [CardType.Variant];
    default:
      return [];
  }
}
```

## 🔄 Implementation Sequence

### Phase 3A: Basic Variant Recognition (Days 1-2)
1. ✅ Extend card UI configuration for variant types
2. ✅ Update card display to show real variant type names
3. ✅ Add dynamic variant type options generation

### Phase 3B: Enhanced Filtering (Days 3-4)  
1. ✅ Implement variant-specific class options
2. ✅ Add level range filtering based on variant type definitions
3. ✅ Update filtering logic to handle variant cards

### Phase 3C: Tab Category System (Days 5-6)
1. ✅ Implement tab category grouping (Standard vs Extended)
2. ✅ Add expand/collapse functionality for tab groups
3. ✅ Set default view preferences (standard expanded, variant collapsed)

### Phase 3D: UI Polish & Testing (Days 7-8)
1. ✅ Polish UI interactions and transitions
2. ✅ Add loading states for dynamic variant data
3. ✅ Comprehensive testing of all variant UI features
4. ✅ Performance optimization for large variant datasets

## 📝 Testing Plan

### UI Recognition Tests
- [ ] Variant cards display correct type names
- [ ] Variant cards show proper subclass information
- [ ] Level information displays correctly for variants

### Filtering Tests  
- [ ] Variant type filtering works correctly
- [ ] Subclass filtering functions properly
- [ ] Level filtering respects variant type ranges
- [ ] Filter combinations work as expected

### Tab System Tests
- [ ] Default view shows standard tabs expanded, variant collapsed
- [ ] Tab expansion/collapse works smoothly
- [ ] Category switching preserves filter states
- [ ] Tab state persists during modal reopens

### Integration Tests
- [ ] Variant import → UI display flow works end-to-end
- [ ] Performance with large numbers of variant types
- [ ] Error handling for missing variant type definitions
- [ ] Backwards compatibility with existing card selection

## 🎯 Success Criteria

1. **✅ UI Recognition**: Users can easily identify and distinguish variant cards by their real types
2. **✅ Enhanced Filtering**: Filtering works intuitively with variant types, subclasses, and level ranges
3. **✅ Intuitive Navigation**: Tab system provides clear separation between standard and extended cards
4. **✅ Performance**: UI remains responsive with large numbers of variant types and cards
5. **✅ Backwards Compatibility**: Existing card selection functionality remains unchanged

## 🚀 Next Steps

The system is now ready for Phase 3 implementation. All required interfaces are available and the architecture supports the needed UI adaptations. The implementation should follow the detailed plan above, focusing on incremental delivery and thorough testing at each step.
