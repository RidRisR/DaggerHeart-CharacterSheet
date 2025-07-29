# Iknis Armor Template Data Binding Implementation Plan

## Overview

Implement data binding for `components/character-sheet-page-armor-template.tsx` to integrate with Zustand state management and SheetData structure. This component contains various configuration options for the weapon system and requires careful data structure design to avoid duplication while maintaining type safety.

## Phase 1: Data Structure Design

### 1.1 Define ArmorTemplateData Interface

Add new interface in `lib/sheet-data.ts`:

```typescript
export interface ArmorTemplateData {
  // Basic information
  weaponName?: string
  description?: string
  
  // Iknis configuration
  weaponAttribute?: 'agility' | 'strength' | 'finesse' | 'presence' | 'instinct' | 'knowledge'
  attackRange?: 'melee' | 'near' | 'close' | 'far' | 'very-far'
  customRangeAndDamage?: string
  damageType?: 'physical' | 'tech'
  
  // Upgrade slots (5 slots)
  upgradeSlots?: Array<{
    checked: boolean
    text: string
  }>
  
  // Upgrade system - grouped by tier, using efficient data structure
  upgrades?: {
    basic: Record<string, boolean | boolean[]>  // Basic upgrades, support multiple checkboxes
    tier2: Record<string, boolean | boolean[]>  // Pre-compiled tier 2
    tier3: Record<string, boolean | boolean[]>  // Pre-compiled tier 3
    tier4: Record<string, boolean | boolean[]>  // Pre-compiled tier 4
  }
  
  // Scrap collection system - grouped by dice type
  scrapMaterials?: {
    fragments: number[]   // Fragments (d6) - 6 items: gear, coil, wire, trigger, lens, crystal
    metals: number[]      // Metals (d8) - 6 items: aluminum, copper, cobalt, silver, platinum, gold
    components: number[]  // Components (d10) - 6 items: fuse, circuit, disc, relay, capacitor, battery
    relics: string[]      // Relics - 5 custom text inputs
  }
  
  // Electronic coins
  electronicCoins?: number
}
```

### 1.2 Integrate into Main SheetData

Add to `SheetData` interface:

```typescript
// Add to SheetData interface
armorTemplate?: ArmorTemplateData
```

## Phase 2: Default Data and Migration

### 2.1 Update Default Data

Add default values in `lib/default-sheet-data.ts`:

```typescript
armorTemplate: {
  weaponName: '',
  description: '',
  upgradeSlots: Array(5).fill(0).map(() => ({ checked: false, text: '' })),
  upgrades: {
    basic: {},
    tier2: {},
    tier3: {},
    tier4: {}
  },
  scrapMaterials: {
    fragments: Array(6).fill(0), // gear, coil, wire, trigger, lens, crystal
    metals: Array(6).fill(0),    // aluminum, copper, cobalt, silver, platinum, gold
    components: Array(6).fill(0), // fuse, circuit, disc, relay, capacitor, battery
    relics: Array(5).fill('')
  },
  electronicCoins: 0
}
```

### 2.2 Add Migration Logic

Add to `lib/sheet-data-migration.ts`:

```typescript
/**
 * Armor template field migration
 * Add default structure for old data missing armor template field
 */
function migrateArmorTemplate(data: SheetData): SheetData {
  if (data.armorTemplate) {
    return data
  }

  const migrated = { ...data }
  migrated.armorTemplate = {
    weaponName: '',
    description: '',
    upgradeSlots: Array(5).fill(0).map(() => ({ checked: false, text: '' })),
    upgrades: {
      basic: {},
      tier2: {},
      tier3: {},
      tier4: {}
    },
    scrapMaterials: {
      fragments: Array(6).fill(0),
      metals: Array(6).fill(0),
      components: Array(6).fill(0),
      relics: Array(5).fill('')
    },
    electronicCoins: 0
  }
  
  console.log('[Migration] Added armorTemplate field')
  return migrated
}
```

And integrate in main migration function:

```typescript
// Add to migrateSheetData function
migrated = migrateArmorTemplate(migrated)
```

## Phase 3: Zustand Store Integration

### 3.1 Add Store Actions

Add armor template related actions in `lib/sheet-store.ts`:

```typescript
// Armor template related actions
updateArmorTemplateField: (field: keyof ArmorTemplateData, value: any) => {
  set((state) => ({
    sheetData: {
      ...state.sheetData,
      armorTemplate: {
        ...state.sheetData.armorTemplate,
        [field]: value
      }
    }
  }))
},

updateUpgradeSlot: (index: number, checked: boolean, text: string) => {
  set((state) => {
    const slots = [...(state.sheetData.armorTemplate?.upgradeSlots || [])]
    slots[index] = { checked, text }
    return {
      sheetData: {
        ...state.sheetData,
        armorTemplate: {
          ...state.sheetData.armorTemplate,
          upgradeSlots: slots
        }
      }
    }
  })
},

updateUpgrade: (tier: string, upgradeName: string, value: boolean | boolean[]) => {
  set((state) => ({
    sheetData: {
      ...state.sheetData,
      armorTemplate: {
        ...state.sheetData.armorTemplate,
        upgrades: {
          ...state.sheetData.armorTemplate?.upgrades,
          [tier]: {
            ...state.sheetData.armorTemplate?.upgrades?.[tier],
            [upgradeName]: value
          }
        }
      }
    }
  }))
},

updateScrapMaterial: (category: string, index: number, value: number | string) => {
  set((state) => {
    const materials = { ...state.sheetData.armorTemplate?.scrapMaterials }
    if (materials[category]) {
      materials[category][index] = value
    }
    return {
      sheetData: {
        ...state.sheetData,
        armorTemplate: {
          ...state.sheetData.armorTemplate,
          scrapMaterials: materials
        }
      }
    }
  })
}
```

## Phase 4: Component Data Binding

### 4.1 Remove Local State

Replace all `useState` in component with Zustand store connections:

```typescript
// Remove these local states
// const [slots, setSlots] = useState(...)
// const [checked, setChecked] = useState(...)

// Replace with store connection
const { sheetData, updateArmorTemplateField, updateUpgradeSlot, updateUpgrade, updateScrapMaterial } = useSheetStore()
const armorTemplate = sheetData.armorTemplate || {}
```

### 4.2 Bind Basic Fields

```typescript
// Weapon name
<Input 
  type="text" 
  placeholder="武装名称" 
  value={armorTemplate.weaponName || ''} 
  onChange={(e) => updateArmorTemplateField('weaponName', e.target.value)}
  className="h-8 w-full" 
/>

// Weapon description
<textarea
  placeholder="描述你的武装的外观、特性和背景故事..."
  value={armorTemplate.description || ''}
  onChange={(e) => updateArmorTemplateField('description', e.target.value)}
  className="flex-1 w-full min-h-[3rem] p-1.5 text-xs border border-gray-300 rounded bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"
/>
```

### 4.3 Bind Iknis Configuration

```typescript
// Weapon attributes
<ToggleGroup 
  type="single" 
  value={armorTemplate.weaponAttribute || ''} 
  onValueChange={(value) => updateArmorTemplateField('weaponAttribute', value)}
  className="grid grid-cols-3 gap-x-1.5 gap-y-0.5"
>
  <ToggleGroupItem value="agility">敏捷</ToggleGroupItem>
  {/* Other attributes... */}
</ToggleGroup>

// Attack range
<ToggleGroup 
  type="single" 
  value={armorTemplate.attackRange || ''} 
  onValueChange={(value) => updateArmorTemplateField('attackRange', value)}
  className="contents"
>
  <ToggleGroupItem value="melee">近战-d12+1</ToggleGroupItem>
  {/* Other ranges... */}
</ToggleGroup>

// Damage type
<ToggleGroup 
  type="single" 
  value={armorTemplate.damageType || ''} 
  onValueChange={(value) => updateArmorTemplateField('damageType', value)}
  className="flex gap-2"
>
  <ToggleGroupItem value="physical">物理</ToggleGroupItem>
  <ToggleGroupItem value="tech">科技</ToggleGroupItem>
</ToggleGroup>
```

### 4.4 Bind Upgrade Slots

```typescript
// In UpgradeSlots component
const UpgradeSlots = () => {
  const { sheetData, updateUpgradeSlot } = useSheetStore()
  const slots = sheetData.armorTemplate?.upgradeSlots || []

  return (
    <div className="space-y-1 px-3">
      {slots.map((slot, i) => (
        <div key={i} className="flex items-center gap-3">
          <div
            className={`w-4 h-4 border-2 mt-1 border-black rounded-full cursor-pointer transition-colors ${slot.checked ? 'bg-gray-800' : 'bg-white'}`}
            onClick={() => updateUpgradeSlot(i, !slot.checked, slot.text)}
          />
          <input
            type="text"
            value={slot.text}
            onChange={(e) => updateUpgradeSlot(i, slot.checked, e.target.value)}
            className="flex-grow border-b border-gray-400 bg-transparent focus:outline-none focus:border-blue-500 transition-all duration-150 h-4 text-sm mt-1"
            placeholder="强化件名称"
          />
        </div>
      ))}
    </div>
  )
}
```

### 4.5 Bind Upgrade System

```typescript
// Modify UpgradeItem component to support data binding
const UpgradeItem = ({
  title,
  cost,
  tier,
  checkboxes = 1,
  upgradeName,
  tierName
}: {
  title: string
  cost: string  
  tier?: string
  checkboxes?: number
  upgradeName: string
  tierName: string
}) => {
  const { sheetData, updateUpgrade } = useSheetStore()
  const upgradeValue = sheetData.armorTemplate?.upgrades?.[tierName]?.[upgradeName]
  
  // Handle single or multiple checkbox states
  const checked = Array.isArray(upgradeValue) 
    ? upgradeValue 
    : Array(checkboxes).fill(upgradeValue || false)

  const handleCheck = (index: number) => {
    if (checkboxes === 1) {
      updateUpgrade(tierName, upgradeName, !checked[0])
    } else {
      const newChecked = [...checked]
      newChecked[index] = !newChecked[index]
      updateUpgrade(tierName, upgradeName, newChecked)
    }
  }

  // Render logic remains the same, but use handleCheck and checked state
}
```

### 4.6 Bind Scrap Collection System

```typescript
// Modify ScrapItem component
const ScrapItem = ({ 
  num, 
  name, 
  category, 
  index 
}: { 
  num: string
  name: string
  category: string
  index: number 
}) => {
  const { sheetData, updateScrapMaterial } = useSheetStore()
  const value = sheetData.armorTemplate?.scrapMaterials?.[category]?.[index] || 0

  return (
    <div className="flex items-center">
      <span className="text-xs text-gray-600 w-6">{num}.</span>
      <span className="text-xs w-12">{name}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => updateScrapMaterial(category, index, parseInt(e.target.value) || 0)}
        className="w-12 text-center border-b border-gray-400 bg-transparent focus:outline-none focus:border-blue-500 transition-all duration-150 h-4 text-xs"
        placeholder="0"
      />
    </div>
  )
}
```

### 4.7 Bind Electronic Coins

```typescript
// Electronic coins input
<input
  type="text"
  value={armorTemplate.electronicCoins || 0}
  onChange={(e) => updateArmorTemplateField('electronicCoins', parseInt(e.target.value) || 0)}
  className="w-14 text-center bg-transparent focus:outline-none text-lg font-bold"
  placeholder="0"
/>
```

## Phase 5: Testing and Validation

### 5.1 Functional Testing

- [ ] All input fields correctly bound to store
- [ ] Data persistence works properly
- [ ] Data persists after page refresh
- [ ] Export/import functionality includes armor template data

### 5.2 Type Safety Check

- [ ] All TypeScript types are correct
- [ ] No type warnings or errors
- [ ] IDE autocompletion works properly

### 5.3 Migration Testing

- [ ] Old data automatically adds armor template field
- [ ] Migration logs display correctly
- [ ] Compatibility with different data versions

## Phase 6: Optimization and Cleanup

### 6.1 Performance Optimization

- Use React.memo to optimize child component re-renders
- Consider performance impact with large data volumes
- Optimize Zustand selectors to avoid unnecessary re-renders

### 6.2 Code Cleanup

- Remove all unused local states
- Unify naming conventions
- Add necessary comments and documentation

## Implementation Order

1. **Step 1**: Implement data structure and default values (Phase 1 & 2)
2. **Step 2**: Add Zustand actions (Phase 3)
3. **Step 3**: Gradually bind component fields (Phase 4)
4. **Step 4**: Test and validate (Phase 5)
5. **Step 5**: Optimize and cleanup (Phase 6)

## Important Notes

1. **Backward Compatibility**: Ensure all new fields are optional
2. **Type Safety**: Strictly use TypeScript types, avoid any
3. **Data Consistency**: Ensure data structure matches component requirements exactly
4. **Performance Consideration**: Avoid over-rendering, use selectors reasonably
5. **Test Coverage**: Each feature needs thorough testing

This plan ensures complete integration of the armor template component with the existing system while maintaining code quality and maintainability.