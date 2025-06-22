### 重构计划：引入 Zustand 实现状态管理现代化

#### 1. 背景与目标

当前项目使用一个庞大的自定义 Hook (`use-cards.ts`) 来管理整个角色卡应用的状态。这种方式导致了两个主要问题：

1.  **状态逻辑分散**：业务逻辑（如升级、属性计算）散布在 Hook 和多个组件中，难以维护和追踪。
2.  **组件高度耦合与 Prop Drilling**：数据通过多层组件以 props 的形式传递，导致组件接口臃肿，重构困难，且存在不必要的渲染。

**本次重构的核心目标是**：引入一个轻量级的状态管理库 **Zustand**，以解决上述问题。我们将建立一个中心化的、可预测的状态管理系统，解耦组件，分离业务逻辑与 UI 渲染，从而大幅提升项目的可维护性、可扩展性和开发体验。

#### 2. 为什么选择 Zustand？

*   **轻量级**: 体积非常小，对项目负担极小。
*   **API 简洁**: 基于 Hooks 设计，心智模型与 React 开发者习惯一致，学习成本低。
*   **避免 Boilerplate**: 无需像 Redux 那样编写大量的模板代码。
*   **高性能**: 只会重渲染订阅了状态变化的组件，避免了不必要的渲染。

#### 3. 重构策略：增量迁移，逐个击破

我们将采用**增量迁移**的策略，而不是一次性重构整个应用。这可以最大程度地降低风险，保证在重构过程中应用始终处于可运行状态。

我们将按照功能域（Feature Domain）逐个进行迁移，顺序如下：
1.  角色基础信息 (Character Description)
2.  经验值 (Experience)
3.  核心卡牌 (Card Deck)
4.  衍生属性 (HP, Armor, etc.)
5.  物品栏 (Inventory)

最终，我们将完全移除 `hooks/use-cards.ts`。

---

### 4. 详细执行计划

#### **步骤 0: 环境准备**

1.  **安装依赖**:
    ```bash
    pnpm add zustand
    ```
2.  **创建目录**:
    在项目根目录下创建 `store` 目录，用于存放所有的 Zustand store。

    ```
    /
    ├── app/
    ├── components/
    ├── store/         <-- 新建目录
    └── ...
    ```

#### **步骤 1: 创建角色卡状态库 (Character Sheet Store)**

这是我们的第一步，也是最核心的一步。我们将从最简单的“角色基础信息”开始。

1.  **创建 Store 文件**:\
    在 `store/` 目录下新建 `character-sheet-store.ts`。

2.  **定义 Store**:\
    将 `use-cards.ts` 中关于角色名、代词和描述的状态及逻辑迁移过来。

    ```typescript
    // store/character-sheet-store.ts
    import { create } from 'zustand';
    import { devtools } from 'zustand/middleware';

    // 定义 State 和 Action 的类型
    interface CharacterInfoState {
      characterName: string;
      pronouns: string;
      description: string;
      setCharacterName: (name: string) => void;
      setPronouns: (pronouns: string) => void;
      setDescription: (description: string) => void;
    }

    // 创建 Store
    export const useCharacterSheetStore = create<CharacterInfoState>()(
      devtools(
        (set) => ({
          // 初始状态
          characterName: '',
          pronouns: '',
          description: '',

          // Actions
          setCharacterName: (name) => set({ characterName: name }),
          setPronouns: (pronouns) => set({ pronouns: pronouns }),
          setDescription: (description) => set({ description: description }),
        }),
        { name: 'CharacterSheetStore' } // Redux DevTools 中显示的名称
      )
    );
    ```
    *注意：这里我们暂时不处理从 Local Storage 加载数据的逻辑，后续步骤会统一处理。*

#### **步骤 2: 重构角色描述组件 (Container/Presentational 模式)**

1.  **分离展示组件**:\
    *   将 `components/character-sheet-page-two-sections/character-description-section.tsx` **重命名**为 `character-description-view.tsx`。
    *   修改 `character-description-view.tsx`，使其成为一个纯粹的“展示组件”。它只接收 props，不包含任何 hooks 或状态逻辑。

    ```tsx
    // components/character-sheet-page-two-sections/character-description-view.tsx
    // ... (props 定义)
    export function CharacterDescriptionView({ name, pronouns, description, onNameChange, ... }) {
      // ... 只包含 JSX 和从 props 接收的回调
    }
    ```

2.  **创建容器组件**:\
    *   **新建** `components/character-sheet-page-two-sections/character-description-section.tsx`。
    *   这个新的文件将作为“容器组件”，负责从 Zustand store 获取数据和 actions，并将其传递给展示组件。

    ```tsx
    // components/character-sheet-page-two-sections/character-description-section.tsx
    import { useCharacterSheetStore } from '@/store/character-sheet-store';
    import { CharacterDescriptionView } from './character-description-view';

    export function CharacterDescriptionSection() {
      const { characterName, pronouns, description, setCharacterName, setPronouns, setDescription } = useCharacterSheetStore();

      return (
        <CharacterDescriptionView
          name={characterName}
          pronouns={pronouns}
          description={description}
          onNameChange={setCharacterName}
          onPronounsChange={setPronouns}
          onDescriptionChange={setDescription}
        />
      );
    }
    ```

3.  **移除 Prop Drilling**:\
    *   打开 `components/character-sheet.tsx` 和 `components/character-sheet-page-two.tsx`。
    *   找到传递给 `CharacterDescriptionSection` 的 props (`characterName`, `onCharacterNameChange` 等)，并**删除它们**。因为新的容器组件会自己从 store 获取数据，不再需要父组件传递。

#### **步骤 3: 整合数据持久化 (Local Storage)**

现在，我们将 `zustand/middleware` 中的 `persist` 中间件集成进来，以替换原有的 `storage.ts` 逻辑。

1.  **更新 Store**:\
    修改 `store/character-sheet-store.ts`，添加 `persist` 中间件。

    ```typescript
    // store/character-sheet-store.ts
    import { create } from 'zustand';
    import { devtools, persist } from 'zustand/middleware';

    // ...
    export const useCharacterSheetStore = create<CharacterInfoState>()(
      devtools(
        persist(
          (set) => ({
            // ... (状态和 actions 不变)
          }),
          {
            name: 'daggerheart-character-sheet', // Local Storage 中的 key
          }
        )
      )
    );
    ```
    *这样，store 中的所有状态都会自动保存到 Local Storage，并在页面加载时恢复。*

#### **步骤 4: 增量迁移其他状态**

按照同样的模式，逐步将 `use-cards.ts` 中的其他状态和逻辑迁移到 `useCharacterSheetStore` 中。

*   **下一个目标：经验值 (Experience)**
    1.  在 `CharacterInfoState` 中添加 `experiencePoints`, `spentExperience`。
    2.  添加 `addExperience` 和 `spendExperience` actions，将业务逻辑内聚在 store 中。
    3.  重构 `experience-section.tsx` 和 `upgrade-section.tsx`，让它们直接从 store 获取数据和调用 actions。
    4.  从 `character-sheet.tsx` 等父组件中移除相关的 props。

*   **后续目标**:
    *   **核心卡牌**: `ancestryCard`, `communityCard` 等。
    *   **衍生属性**: `hp`, `armorSlots`, `loadSlots`。这部分逻辑可以作为 store 中的衍生状态（getter functions）来实现。
    *   **物品栏**: `inventory`, `gold` 等。

#### **步骤 5: 废弃 `use-cards.ts`**

当所有状态和逻辑都成功迁移到 Zustand store 后：

1.  **确认没有组件再导入 `use-cards.ts`**。
2.  **删除 `hooks/use-cards.ts` 文件**。
3.  **删除 `lib/storage.ts`** (如果其功能已完全被 `persist` 中间件替代)。

---

### 5. 预期成果

完成本次重构后，我们将获得一个：

*   **中心化的状态管理**: 所有应用状态和核心业务逻辑都集中在 `store/` 目录中，清晰可控。
*   **高度解耦的组件**: 组件不再通过 props 传递繁杂的数据，而是直接从 store 中按需订阅，变得更加独立和可复用。
*   **清晰的数据流**: 单向数据流变得更加明确，状态变更的来源和影响一目了然。
*   **更佳的开发体验**: 新增功能或修改现有逻辑时，只需关注 store 和直接相关的组件，无需在冗长的组件树中穿梭。

这个计划提供了一个清晰、低风险的路径来现代化你的项目架构，为其未来的发展奠定坚实的基础。
