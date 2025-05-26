# 步骤3-2：safeFormData.cards 类型收敛与下一步计划

## 当前状况分析
- safeFormData.cards 目前可能为 StandardCard[] 或 (type?: string) => StandardCard 的数组，导致类型不安全。
- 组件和数据流应保证 cards 始终为 StandardCard[]。
- 仍有部分动态 key 访问、类型断言等问题待收敛。

## 下一步计划
1. 明确 safeFormData.cards 只允许 StandardCard[]，彻底移除 createEmptyCard 函数混用。
2. 检查 defaultFormData.cards 的初始化，确保为 StandardCard[]。
3. 检查所有 setFormData、getUpdatedSpecialCards、syncSpecialCardsWithCharacterChoices 等涉及 cards 的赋值，保证类型安全。
4. 记录所有变更点。

---

本文件为 safeFormData.cards 类型收敛与下一步计划。
