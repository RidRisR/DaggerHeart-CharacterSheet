# 步骤3-1：setFormData类型收敛与用法统一结果

## 主要变更
- CharacterSheetProps、CharacterSheetPageTwoProps、ExperienceSectionProps、InventorySectionProps等全部统一 setFormData 类型为 React.Dispatch<React.SetStateAction<FormData>>。
- 所有 setFormData((prev: any) => ...) 用法已替换为 setFormData((prev) => ...)，保证类型安全。

## 下一步建议
- 明确 safeFormData.cards 类型，彻底移除函数混用。
- 按页面/功能模块分批推进类型收敛。

---

本文件为 setFormData 类型收敛与用法统一阶段的结果记录。
