# Step 6: 页面级全链路类型安全推进计划

## 目标
- 所有页面组件（character-sheet-page-*.tsx）及其下属 section/props/handler，彻底消除 any、string 类型的动态 key 访问，全部收敛为类型安全（如 keyof FormData、StandardCard 等）。
- 所有卡牌相关操作（如 handleCardChange、onCardChange、CardDeckSection 等）类型安全，禁止 any。
- 所有 props、工具函数、事件回调，类型声明与主表单一致，禁止类型断言。
- 所有页面组件的 safeFormData 结构与主表单一致，字段类型安全。
- 所有页面组件、section、工具函数、props、state、context，涉及 formData 的地方全部类型化。

## 步骤
1. 排查所有页面组件（character-sheet-page-*.tsx）及其 section/子组件，将所有 handler/props 的 field/card 参数类型收敛为类型安全（如 keyof FormData、StandardCard）。
2. 修正所有卡牌相关操作，如 handleCardChange、onCardChange、CardDeckSection 的 props 类型，禁止 any。
3. 修正 safeFormData 结构，与主表单保持一致，所有字段类型安全。
4. 同步修正所有调用链路，消除类型断言和类型不兼容。
5. 如有必要，修正/补充 section 组件的 props 类型声明。
6. 记录本阶段计划与结果。

## 负责人
AI Copilot

## 日期
2025-05-27
