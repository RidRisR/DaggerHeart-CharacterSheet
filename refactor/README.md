# FormData 重构计划

## 步骤 1：字段引用梳理与清理

### 1.1 现有问题分析
- 组件中大量使用 `any` 类型的 formData，类型系统失效。
- 字段随意扩展，部分字段未在 form-data.ts 明确定义。
- 存在未被引用的历史遗留字段。
- 字段用途、结构混乱，难以追踪和维护。

### 1.2 字段引用统计（初步）
- 主要在 components/character-sheet-*.tsx 及其子 section、modal 组件中被引用。
- 典型用法：
  - 直接访问 formData 字段（如 formData.cards、formData.armorName 等）
  - 通过 setFormData 动态扩展字段（如 setFormData(prev => ({ ...prev, 新字段: 值 }))）
- 发现部分字段如 companionExperience1、companionImage、companionDescription、companionRange 等未在 form-data.ts 定义。

### 1.3 下一步
- 统计所有实际被引用的字段，标记未被引用或未定义的字段。
- 生成详细的字段引用报告。

---

本文件为重构计划与分析记录，所有重构相关文档、脚本、结果均放于 refactor 文件夹下。
