# DaggerHeart 多角色卡系统实施计划

## 🎯 目标
实现同时储存多张角色卡（最多20张），并且可以互相切换的功能。

## 📋 约束条件
- **纯静态项目** - 基于localStorage，无服务器依赖
- **最多20张角色卡** - 严格限制，简化复杂度
- **单角色导入导出** - 无批量导入导出，但保持单张角色卡的导入导出功能。
- **快速失败原则** - 数据迁移兼容旧数据，但过程不设回滚。若迁移失败，则快速失败并清晰提示，不尝试恢复旧状态。
- **默认空白角色卡** - 当删除所有角色卡后，系统应自动提供一个空白角色卡。占据1号存储。

## 🔍 现状分析

### 当前存储系统
- `"charactersheet_data"` - 单角色数据 (将被迁移)
- `"focused_card_ids"` - 旧版全局聚焦卡牌ID（将被迁移到各角色数据内）
- 每个角色最多20张卡牌，前5个为特殊卡位

### 存储空间评估
- 角色数据（含聚焦卡牌ID）：~50KB/角色 × 20 = 1MB
- 角色列表元数据：~5KB
- **总计**：~1.005MB（远低于5MB限制）

## 🏗️ 新架构设计

### 存储结构
```typescript
// Storage Keys
const CHARACTER_LIST_KEY = "dh_character_list"       // 角色元数据列表
const CHARACTER_DATA_PREFIX = "dh_character_"        // 单个角色数据前缀 (e.g., dh_character_uuid)
const ACTIVE_CHARACTER_ID_KEY = "dh_active_character_id" // 当前活动角色ID

// 主要数据结构
interface CharacterMetadata {
  id: string;          // 唯一ID
  name: string;        // 角色名
  customName: string    //用户给角色卡的命名
  lastModified: string; // ISO 日期字符串
  createdAt: string;   // ISO 日期字符串
  order: number;       // 用于排序
}

interface CharacterList {
  characters: CharacterMetadata[];  // 最多20个
  activeCharacterId: string | null; // 当前活动角色ID
  lastUpdated: string;            // ISO 日期字符串
}

// SheetData 接口 (lib/sheet-data.ts) 将包含 focused_card_ids
// interface SheetData {
//   ... // existing fields
//   focused_card_ids?: string[]; // 每个角色独立存储其聚焦卡牌ID
//   ...
// }
```

### 核心函数设计 (`lib/storage.ts`)
```typescript
// --- 角色列表管理 ---
const MAX_CHARACTERS = 20;
function loadCharacterList(): CharacterList;
function saveCharacterList(list: CharacterList): void;
function addCharacterToMetadataList(characterData: SheetData): CharacterMetadata | null; // 创建并添加元数据
function updateCharacterInMetadataList(characterId: string, updatedName?: string /* other relevant metadata */): void;
function removeCharacterFromMetadataList(characterId: string): void;

// --- 单个角色数据管理 ---
function generateCharacterId(): string; // 生成唯一ID
function saveCharacterById(id: string, data: SheetData): void; // 保存完整角色数据 (含 focused_card_ids)
function loadCharacterById(id: string): SheetData | null;    // 加载完整角色数据
function deleteCharacterById(id: string): boolean;          // 删除角色数据文件

// --- 活动角色管理 ---
function setActiveCharacterId(id: string | null): void;
function getActiveCharacterId(): string | null;

// --- 角色操作 ---
function createNewCharacter(name: string, order?: number): SheetData; // 创建新的空角色数据对象
function duplicateCharacter(originalId: string, newName: string): SheetData | null; // 复制角色

// --- 数据迁移 (核心：兼容旧数据，快速失败) ---
function migrateToMultiCharacterStorage(): void; // 整合旧数据到新结构

// --- 导入/导出 (单角色) ---
// exportCharacterData(data: SheetData) -> 保持，但调用时传入的是单个角色的SheetData
// importCharacterData(file: File): Promise<SheetData> -> 保持，返回SheetData，由调用方处理保存
```

## 📅 实施计划 (7天)

### Phase 1: 基础存储重构 (2天)

#### Day 1: 存储层核心实现 (`lib/storage.ts`)
**目标**: 实现新的多角色存储机制和数据迁移逻辑。

**具体步骤**:
1.  **定义新数据结构**: 在 `lib/sheet-data.ts` 或相关类型文件中明确 `CharacterMetadata`, `CharacterList`。确认 `SheetData` 包含 `focused_card_ids` 字段。
2.  **实现ID生成器**: `generateCharacterId()` (e.g., UUID v4).
3.  **角色列表管理函数**:
    *   `loadCharacterList()`: 从 `localStorage` 读取 `CHARACTER_LIST_KEY`。若不存在或无效，返回包含空角色列表和 `null` activeCharacterId 的默认结构。
    *   `saveCharacterList()`: 将 `CharacterList` 对象保存到 `localStorage`。
    *   `addCharacterToMetadataList`, `updateCharacterInMetadataList`, `removeCharacterFromMetadataList`: 操作 `CharacterList`中的 `characters` 数组并保存。
4.  **单个角色数据管理函数**:
    *   `saveCharacterById()`: 将 `SheetData` 对象（确保包含 `focused_card_ids`）保存到 `localStorage`，键为 `CHARACTER_DATA_PREFIX + id`。
    *   `loadCharacterById()`: 根据ID从 `localStorage` 加载 `SheetData`。
    *   `deleteCharacterById()`: 从 `localStorage` 删除指定ID的角色数据。
5.  **活动角色管理函数**:
    *   `setActiveCharacterId()`, `getActiveCharacterId()`: 读写 `ACTIVE_CHARACTER_ID_KEY`。
6.  **数据迁移逻辑 (`migrateToMultiCharacterStorage`)**:
    *   **检查是否已迁移**: 查看 `CHARACTER_LIST_KEY` 是否存在。若存在，则假定已迁移，直接返回。
    *   **加载旧数据**:
        *   尝试加载旧的 `charactersheet_data`。
        *   尝试加载旧的全局 `focused_card_ids`。
    *   **数据转换**:
        *   如果旧 `charactersheet_data` 存在：
            *   创建一个新的 `SheetData` 对象。
            *   将旧数据复制到新 `SheetData`。
            *   将旧的全局 `focused_card_ids` (如果存在) 赋值给新 `SheetData.focused_card_ids`。
            *   生成一个新角色ID。
            *   创建一个 `CharacterMetadata` 条目。
            *   将此角色设为活动角色。
        *   如果旧数据不存在，则创建一个默认的空白角色。
    *   **创建角色列表**: 初始化 `CharacterList`，添加迁移过来的角色（或空白角色）的元数据。
    *   **保存新结构**:
        *   调用 `saveCharacterById()` 保存迁移的角色数据。
        *   调用 `saveCharacterList()` 保存新的角色列表。
        *   调用 `setActiveCharacterId()`。
    *   **清理旧数据 (关键！)**:
        *   `localStorage.removeItem("charactersheet_data")`
        *   `localStorage.removeItem("focused_card_ids")` (旧的全局键)
        *   `localStorage.removeItem("persistentFormData")` (按要求清理)
    *   **快速失败**: 迁移过程中若发生严重错误 (如JSON解析失败)，在控制台清晰报错，不尝试回滚或复杂的恢复，让用户知晓问题。

#### Day 2: 聚焦卡牌兼容与单角色导入/导出调整
**目标**: 确保聚焦卡牌功能与新存储结构兼容，并调整现有导入导出功能。

**具体步骤**:
1.  **聚焦卡牌逻辑调整**:
    *   回顾所有使用 `focused_card_ids` 的地方 (主要在 `CharacterSheetPageThree` 和相关 hooks/context)。
    *   修改逻辑，使其从当前活动角色的 `SheetData.focused_card_ids` 读取和写入。
    *   当切换角色时 (`switchCharacter` 逻辑将在Phase 2实现)，确保 `formData` 中的 `focused_card_ids` 正确反映了新加载角色的状态。
2.  **`SheetData` 更新**: 确保 `defaultSheetData` (在 `lib/default-sheet-data.ts`) 初始化时包含 `focused_card_ids: []`。
3.  **导入功能调整 (`ImportExportModal` 和 `app/page.tsx`)**:
    *   `importCharacterData(file: File)` 函数本身逻辑（读取文件并解析为 `SheetData`）基本不变。
    *   调用端 (`app/page.tsx`):
        *   导入成功后，获得 `SheetData` 对象。
        *   生成新角色ID。
        *   调用 `saveCharacterById()` 保存这个新的角色数据。
        *   调用 `addCharacterToMetadataList()` 将新角色元数据添加到列表。
        *   （可选）询问用户是否切换到这个新导入的角色。
4.  **导出功能调整 (`ImportExportModal` 和 `app/page.tsx`)**:
    *   `exportCharacterData(data: SheetData)` 函数本身逻辑（将 `SheetData` 转为JSON并下载）不变。
    *   调用端 (`app/page.tsx`): 确保传递给 `exportCharacterData` 的是当前活动角色的 `SheetData` (即 `formData`)。

### Phase 2: 核心功能实现 (2天)

#### Day 3: 主应用逻辑更新 (`app/page.tsx`)
**目标**: 实现角色切换、创建、删除等核心交互逻辑。

**新增状态**:
```typescript
const [characterList, setCharacterList] = useState<CharacterList | null>(null); // 存储角色元数据列表
const [activeCharacterId, setActiveCharacterIdInternal] = useState<string | null>(null); // 存储当前活动角色ID
// formData, setFormData 保持不变，代表当前活动角色的数据
```

**核心功能实现**:
1.  **初始化加载**:
    *   `useEffect` (on mount):
        *   调用 `migrateToMultiCharacterStorage()` (只会实际执行一次)。
        *   调用 `loadCharacterList()` 获取角色列表，存入 `characterList` state。
        *   调用 `getActiveCharacterId()` 获取活动角色ID。
        *   如果活动角色ID存在且有效，调用 `loadCharacterById()` 加载该角色数据到 `formData`。
        *   如果没有活动角色ID，或列表为空，则创建一个新的空白角色：
            *   调用 `createNewCharacter("新角色")` 获取空白 `SheetData`。
            *   生成ID，调用 `saveCharacterById()`。
            *   调用 `addCharacterToMetadataList()`。
            *   将此新角色设为活动角色 (`setActiveCharacterId` 和 `setActiveCharacterIdInternal`)。
            *   将空白 `SheetData` 设置到 `formData`。
        *   更新 `activeCharacterId` state。
2.  **角色切换 (`switchCharacter`)**:
    *   参数: `newCharacterId: string`。
    *   **保存当前角色 (如果需要)**: `saveCharacterById(activeCharacterId, formData)`。
    *   加载目标角色: `const newCharacterData = loadCharacterById(newCharacterId)`。
    *   更新状态:
        *   `setFormData(newCharacterData || defaultSheetData)` (如果加载失败则用默认数据)。
        *   `setActiveCharacterId(newCharacterId)` (保存到localStorage)。
        *   `setActiveCharacterIdInternal(newCharacterId)` (更新React state)。
        *   `setCharacterList` 更新元数据中的 `activeCharacterId`。
3.  **角色创建 (`handleCreateCharacter`)**:
    *   检查角色数量是否已达上限 (`MAX_CHARACTERS`)。
    *   调用 `createNewCharacter("新角色 ${characterList.characters.length + 1}")` 获取空白 `SheetData`。
    *   生成新ID。
    *   调用 `saveCharacterById()` 保存新角色。
    *   调用 `addCharacterToMetadataList()` 更新元数据列表并保存。
    *   自动切换到新创建的角色 (调用 `switchCharacter`)。
4.  **角色删除 (`handleDeleteCharacter`)**:
    *   参数: `characterIdToDelete: string`。
    *   调用 `deleteCharacterById(characterIdToDelete)`。
    *   调用 `removeCharacterFromMetadataList(characterIdToDelete)` 更新元数据列表并保存。
    *   **处理活动角色**:
        *   如果被删除的是当前活动角色:
            *   从更新后的 `characterList` 中选择新的活动角色 (e.g., 第一个角色，或 `null` 如果列表为空)。
            *   如果列表为空，则创建一个新的默认空白角色 (如初始化逻辑)。
            *   调用 `switchCharacter` 切换到新的活动角色 (或新创建的空白角色)。
        *   如果列表为空，确保 `loadCharacterList()` 在下次加载时能正确处理并创建默认空白角色。
5.  **角色重命名 (`handleRenameCharacter`)**:
    *   参数: `characterIdToRename: string`, `newName: string`。
    *   如果重命名的是当前活动角色，更新 `formData.name`。
    *   调用 `saveCharacterById()` 保存更改。
    *   调用 `updateCharacterInMetadataList()` 更新元数据列表并保存。

#### Day 4: 错误处理和数据一致性强化
**目标**: 提升应用的健壮性，确保数据操作的可靠性。

**具体步骤**:
1.  **数据验证 (`lib/storage.ts` 和 `app/page.tsx`)**:
    *   `loadCharacterList()`: 验证从localStorage读取的列表结构是否符合 `CharacterList` 接口。若不符合，记录错误并返回默认空列表。
    *   `loadCharacterById()`: 验证读取的角色数据结构。若不符合 `SheetData`，记录错误并返回 `null`。
    *   `app/page.tsx`: 在设置 `formData` 之前，可以进行一次浅层校验，确保关键字段存在。
2.  **损坏数据处理 (Fast Fail Principle)**:
    *   **Storage Layer**: 如果 `JSON.parse` 失败，函数应捕获错误，`console.error`，然后返回 `null` 或默认值，而不是抛出导致应用崩溃。
    *   **App Layer (`app/page.tsx`)**:
        *   如果 `loadCharacterById` 返回 `null` (表示数据损坏或未找到)，`switchCharacter` 应将 `formData` 设置为 `defaultSheetData`，并向用户显示温和提示 (e.g., "角色数据加载失败，已重置为默认角色卡")。
        *   如果 `loadCharacterList` 返回的是默认空列表，初始化逻辑应能平稳过渡到创建第一个空白角色。
3.  **边界条件处理**:
    *   **20角色限制**: 在 `handleCreateCharacter` 中严格执行。UI上应有提示。
    *   **空列表处理**: 确保删除最后一个角色后，系统能自动创建并切换到一个新的空白角色。`CharacterList.characters` 数组理论上不应为空，除非是首次迁移前的状态。
    *   **ID冲突**: `generateCharacterId` 应确保高度唯一性 (UUID)。
4.  **状态同步**:
    *   确保所有修改 `CharacterList` 或 `SheetData` 的操作后，都正确调用了对应的 `saveCharacterList` 和 `saveCharacterById`。
    *   React state (`characterList`, `activeCharacterId`, `formData`) 必须与localStorage中的状态保持一致。使用 `useEffect` 监听依赖变化来触发保存或加载。
5.  **用户反馈**:
    *   对于保存、加载、删除等操作，提供即时反馈 (e.g., Toast通知 "角色已保存", "角色已删除")。
    *   错误发生时，提供用户可理解的错误信息。

### Phase 3: UI实现 (2天)

#### Day 5: 角色选择器组件 (`components/character-selector.tsx` 或直接集成到 `TabsList`)
**目标**: 实现UI方案中描述的集成到Tab栏的角色切换器。

**具体步骤**:
1.  **组件创建/修改**:
    *   创建 `CharacterSwitcher` 组件。
    *   Props: `characterList: CharacterMetadata[]`, `activeCharacterId: string | null`, `onSwitchCharacter: (id: string) => void`, `onCreateCharacter: () => void`, `onManageCharacters: () => void` (打开管理模态框)。
2.  **UI集成 (`app/page.tsx`)**:
    *   修改 `TabsList` 的 `className`: 从 `grid grid-cols-3` 改为 `flex items-center`。
    *   在 `TabsTrigger` 之后添加 `<CharacterSwitcher />`。
    *   `CharacterSwitcher` 内部使用 `DropdownMenu` (from `components/ui/dropdown-menu.tsx`):
        *   Trigger: 一个 `Button` 组件，`variant="ghost"` 或类似，只显示用户图标 (e.g., `<UserIcon />` from `lucide-react`)。
        *   Content:
            *   `DropdownMenuGroup` for character list: `characterList.map(char => <DropdownMenuItem onClick={() => onSwitchCharacter(char.id)}>{char.name} {char.id === activeCharacterId && "(Active)"}</DropdownMenuItem>)`
            *   `DropdownMenuSeparator`
            *   `<DropdownMenuItem onClick={onCreateCharacter}>新建角色</DropdownMenuItem>`
            *   `<DropdownMenuItem onClick={onManageCharacters}>管理角色</DropdownMenuItem>` (此项会打开Day 6的角色管理界面/模态框)
3.  **样式调整**: 确保切换器按钮和下拉菜单与Tab栏风格统一。

#### Day 6: 角色管理界面 (`components/character-manager.tsx` - 建议为模态框)
**目标**: 提供一个集中的界面来管理所有角色。

**具体步骤**:
1.  **组件创建 (`CharacterManagerModal.tsx`)**:
    *   使用 `Dialog` 组件 (from `components/ui/dialog.tsx`).
    *   Props: `isOpen`, `onClose`, `characterList`, `onRenameCharacter`, `onDeleteCharacter`, `onDuplicateCharacter`, `onCreateCharacter`.
2.  **功能实现**:
    *   **列表显示**: 使用 `Table` 或自定义列表展示 `characterList` (id, name, level, profession, lastModified)。
    *   **创建新角色**: 按钮触发 `onCreateCharacter` (由 `app/page.tsx` 传递，最终调用 `handleCreateCharacter`)。
    *   **重命名**: 每行角色旁提供编辑按钮。点击后，允许用户输入新名称，确认后调用 `onRenameCharacter`。
    *   **删除**: 每行角色旁提供删除按钮。点击后，显示确认对话框，确认后调用 `onDeleteCharacter`。
    *   **复制**: 每行角色旁提供复制按钮。点击后，提示输入新角色名，确认后调用 `onDuplicateCharacter` (在 `app/page.tsx` 中实现，调用 `storage.duplicateCharacter` 然后 `addCharacterToMetadataList` 和 `saveCharacterById`)。
    *   **(可选) 拖拽排序**: 如果需要，可以集成拖拽库来调整 `CharacterMetadata.order`，然后更新 `characterList` 并保存。
3.  **UI设计**:
    *   清晰展示角色信息。
    *   操作按钮明确。
    *   考虑在 `app/page.tsx` 中添加一个按钮（例如在 `CharacterSwitcher` 下拉菜单中）来打开此管理模态框。

### Phase 4: 测试优化 (1天)

#### Day 7: 完整测试和优化
**测试项目**:
-   [x] **数据迁移**:
    -   [ ] 从无数据状态启动，检查是否创建默认空白角色。
    -   [ ] 从旧单角色数据 (`charactersheet_data`, `focused_card_ids`) 启动，检查是否正确迁移到新结构，旧键是否被删除，`persistentFormData` 是否被删除。
    -   [ ] 迁移后，聚焦卡牌ID是否正确合并到角色数据中。
-   [x] **角色CRUD操作**:
    -   [ ] 创建新角色 (达到上限20个时应有提示)。
    -   [ ] 切换角色 (数据、聚焦卡牌状态是否正确加载)。
    -   [ ] 重命名角色 (元数据和活动角色数据是否更新)。
    -   [ ] 删除角色 (包括删除活动角色，删除最后一个角色后是否生成新空白角色)。
    -   [ ] 复制角色。
-   [x] **聚焦卡牌兼容性**:
    -   [ ] 在不同角色间切换，检查每个角色的聚焦卡牌状态是否独立且正确保存/加载。
-   [x] **20角色限制验证**:
    -   [ ] 尝试创建第21个角色，验证是否被阻止并有提示。
-   [x] **单角色导入/导出**:
    -   [ ] 导出一个角色，检查文件内容。
    -   [ ] 导入该角色，检查是否作为新角色添加到列表中。
-   [x] **错误恢复机制**:
    -   [ ] 手动篡改localStorage中的角色数据使其JSON无效，检查应用是否能处理并提供默认/空白状态。
    -   [ ] 手动篡改角色列表数据，检查应用行为。
-   [x] **UI集成**:
    -   [ ] Tab栏角色切换器功能是否正常。
    -   [ ] 角色管理模态框功能是否正常。

**优化项目**:
-   [ ] 角色切换性能 (对于localStorage通常很快，但需确认)。
-   [ ] UI反馈 (Toast通知，加载状态等)。
-   [ ] (可选) 切换动画效果。
-   [ ] (可选) 快捷键支持 (e.g.,切换角色)。
-   [ ] 用户体验细节 (e.g., 确认对话框，清晰的按钮文本)。

## 🎨 UI简化需求
(已整合到Phase 3, Day 5)

## 🛠️ 详细实施步骤
(已分解到各Phase和Day中)

## 🚨 风险控制

### 数据安全
-   **迁移前备份**: 强烈建议用户在更新应用版本前手动导出其 `charactersheet_data.json` (如果他们知道如何访问localStorage)。应用本身无法自动备份外部文件。
-   **迁移逻辑测试**: 充分测试 `migrateToMultiCharacterStorage` 在各种场景下的行为。
-   **快速失败**: 迁移失败时，不破坏原有旧数据 (如果迁移逻辑在写新数据前不删除旧数据的话)。但计划是迁移成功后删除旧数据。

### 功能兼容
-   **单角色导入/导出**: 确保此功能在新架构下依然可用。
-   **聚焦卡牌**: 确保此功能在多角色切换时正确工作。

### 性能保障
-   **20角色限制**: 此限制本身有助于控制数据量。
-   **localStorage操作**: 避免在短时间内进行大量读写。角色切换等操作应是用户驱动的，频次不高。

## ✅ 验收标准

### 功能要求
-   [x] 支持最多20张角色卡。
-   [x] 角色间快速切换，包括各自的聚焦卡牌状态。
-   [x] 旧单角色数据能无损迁移到新多角色结构中，旧localStorage键被清理。
-   [x] `persistentFormData` localStorage键被清理。
-   [x] 单角色导入/导出功能保持可用。
-   [x] 删除所有角色后，系统自动提供一个空白角色卡。
-   [x] UI集成角色切换器到Tab栏。
-   [x] 提供角色管理界面（创建、重命名、删除、复制）。

### 性能要求
-   [ ] 角色切换 < 500ms。
-   [ ] 应用启动（包括迁移检查和初始加载）< 3s。
-   [ ] 数据保存（切换角色时或表单自动保存）< 200ms。

### 用户体验要求
-   [ ] 直观的角色选择和管理界面。
-   [ ] 清晰的状态指示（当前活动角色，保存状态）。
-   [ ] （可选）流畅的切换动画。
-   [ ] 友好的错误提示和边界条件处理。

## 🎉 项目里程碑

-   **Day 1-2**: 基础存储架构和数据迁移逻辑完成。
-   **Day 3-4**: 核心多角色交互功能（切换、创建、删除）在应用层可用。
-   **Day 5-6**: UI界面完整，包括Tab栏切换器和角色管理模态框。
-   **Day 7**: 项目完成，经过完整测试和优化，可发布。

---

**预计完成时间**: 7个工作日
**风险等级**: 低 (因有明确约束和静态特性)
**技术可行性**: 极高
**用户价值**: 高