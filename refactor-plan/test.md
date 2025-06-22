# 测试覆盖计划：为重构保驾护航

### 1. 核心目标与理念

本次测试计划的核心目标不是追求 100% 的代码覆盖率，而是**为即将到来的 Zustand 重构建立一个坚实的“安全网”**。我们将通过测试来精确地“记录”和“锁定”当前应用的核心功能行为。

**核心理念**：在重构之前，如果一段代码没有被测试覆盖，那么我们就假设它是坏的。一个可靠的测试套件是成功重构的唯一保证。

### 2. 测试工具链

*   **测试框架**: **Vitest**。它现代、快速，API 与 Jest 类似，且与 Vite/Next.js 生态集成良好。
*   **辅助库**: **React Testing Library**。它提供了测试 Hooks 和组件的实用工具。

**执行步骤：**

1.  **安装依赖**:
    ```bash
    pnpm add -D vitest @vitest/ui @testing-library/react
    ```

2.  **创建配置文件**: 在项目根目录创建 `vitest.config.ts`。
    ```typescript
    // vitest.config.ts
    import { defineConfig } from 'vitest/config';
    import react from '@vitejs/plugin-react';

    export default defineConfig({
      plugins: [react()],
      test: {
        globals: true,
        environment: 'jsdom', // 模拟浏览器环境
        setupFiles: './test/setup.ts', // 可选的测试配置文件
      },
    });
    ```
    *(你可能需要创建一个空的 `test/setup.ts` 文件)*

3.  **在 `package.json` 中添加脚本**:
    ```json
    "scripts": {
      // ...
      "test": "vitest",
      "test:ui": "vitest --ui"
    }
    ```

---

### 3. 测试执行计划：由内而外

我们将按照逻辑层次，从最核心的纯函数开始，逐步向外扩展到业务逻辑。

#### **阶段一：核心数据逻辑单元测试 (The Foundation)**

这是最高优先级。`card/` 目录下的逻辑是整个应用的基石。

**目标**: `card/validation-utils.ts`, `card/type-validators.ts`, 以及所有 `card/**/convert.ts` 文件。

**步骤 1.1: 测试工具函数 (Utils & Validators)**

*   在 `card/` 目录下创建 `validation-utils.test.ts`。
*   为里面的每一个纯函数编写测试用例，覆盖正常、边界和异常情况。

**示例 (`validation-utils.test.ts`):**
```typescript
import { describe, it, expect } from 'vitest';
import { isIdValid } from './validation-utils'; // 假设有这个函数

describe('isIdValid', () => {
  it('should return true for a valid ID format', () => {
    expect(isIdValid('ancestry-001')).toBe(true);
  });

  it('should return false for an ID without a prefix', () => {
    expect(isIdValid('001')).toBe(false);
  });

  it('should return false for an empty string', () => {
    expect(isIdValid('')).toBe(false);
  });

  it('should return false for null or undefined', () => {
    expect(isIdValid(null)).toBe(false);
    expect(isIdValid(undefined)).toBe(false);
  });
});
```

**步骤 1.2: 测试卡牌转换器 (Card Converters)**

*   为每种卡牌的 `convert.ts` 文件创建一个对应的 `convert.test.ts`。
*   **方法**: 准备一个模拟的输入 JSON 对象（可以从 `data/cards` 中复制一个真实的例子），调用 `convert` 函数，然后断言输出的卡牌对象结构和数值是否符合预期。

**示例 (`card/ancestry-card/convert.test.ts`):**
```typescript
import { describe, it, expect } from 'vitest';
import { convertAncestryCard } from './convert';
import mockAncestryJson from '../../data/cards/ancestry/some-ancestry-card.json'; // 引入一个真实的json作为mock

describe('convertAncestryCard', () => {
  it('should correctly convert a valid ancestry card JSON', () => {
    const convertedCard = convertAncestryCard(mockAncestryJson);

    // 断言关键字段
    expect(convertedCard.id).toBe(mockAncestryJson.id);
    expect(convertedCard.name).toBe('一些始祖');
    expect(convertedCard.type).toBe('ancestry');

    // 断言特定于ancestry card的字段
    expect(convertedCard.features).toHaveLength(2);
    expect(convertedCard.features[0].title).toBe('特性一');

    // 断言文本是否被正确处理
    expect(convertedCard.description).toContain('<p>');
  });

  it('should throw an error if required fields are missing', () => {
    const invalidJson = { ...mockAncestryJson, name: undefined };
    expect(() => convertAncestryCard(invalidJson)).toThrow();
  });
});
```
*完成这个阶段后，你就拥有了一个强大的安全网，可以保证所有从文件加载的数据都是正确和可靠的。*

#### **阶段二：业务逻辑测试 (Capturing the Behavior)**

**目标**: `hooks/use-cards.ts`

在替换它之前，我们必须用测试记录下它当前的行为。

**步骤 2.1: 测试 Hook 的核心业务逻辑**

*   在 `hooks/` 目录下创建 `use-cards.test.ts`。
*   使用 `@testing-library/react` 的 `renderHook` 和 `act` 工具来测试。

**示例 (`hooks/use-cards.test.ts`):**
```typescript
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCards } from './use-cards';

describe('useCards hook', () => {
  it('should correctly add experience points', () => {
    const { result } = renderHook(() => useCards());

    // 使用 act 来包裹任何会引起状态更新的操作
    act(() => {
      result.current.callbacks.addExperience(10);
    });

    // 断言状态是否按预期更新
    expect(result.current.characterData.experiencePoints).toBe(10);
  });

  it('should correctly spend experience points', () => {
    const { result } = renderHook(() => useCards());

    act(() => {
      result.current.callbacks.addExperience(10);
    });
    act(() => {
      result.current.callbacks.spendExperience(5);
    });

    expect(result.current.characterData.experiencePoints).toBe(5);
    expect(result.current.characterData.spentExperience).toBe(5);
  });

  // TODO: 为其他业务逻辑添加测试
  // - spendExperience should not go below zero
  // - updating a card should recalculate derived stats (HP, Armor)
  // - ...
});
```
*这个阶段的目标不是测试 `use-cards.ts` 的所有代码，而是测试那些**核心的、将在 Zustand store 中重新实现的业务规则**。*

### 4. 测试驱动重构工作流

现在，你已经准备好安全地进行重构了。

**针对每一块逻辑（如经验值、HP、卡牌选择），遵循以下循环：**

1.  **确认测试存在**: 确保 `use-cards.test.ts` 中已经有覆盖该逻辑的测试，并且它是通过的。
2.  **开始重构**: 在 Zustand store 中实现新的逻辑。
3.  **修改测试目标**: 将旧的测试（之前测试 `use-cards` 的）复制并修改，使其指向新的 Zustand store。
4.  **运行测试**: 此时测试应该是失败的（因为你还没完全实现或连线）。
5.  **修复直到通过**: 不断完善你的 Zustand store 实现，直到测试再次变为绿色。
6.  **重复**: 对下一块逻辑重复此过程。

通过这个流程，你可以确保你的新 Zustand store 完美地复刻并改进了旧的业务逻辑，而不会引入回归错误。
