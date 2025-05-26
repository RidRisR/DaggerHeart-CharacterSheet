# Step 6: 字段清理与文档同步计划

## 目标
- 对照 fields-usage-report.md，彻底移除 lib/form-data.ts 中未被引用的“僵尸字段”。
- 更新 fields-mapping.md、fields-usage-report.md，确保字段定义、用途、结构与代码一致。
- 记录阶段性成果。

## 步骤
1. 梳理 fields-usage-report.md，标记所有未被引用的字段。
2. 清理 lib/form-data.ts 中未用字段。
3. 同步更新字段文档。
4. 记录阶段性成果。

## 后续计划
- 检查其它入口、工具函数、文档等是否有遗留类型不一致或未用字段，统一收敛。
- 定期同步 FormData 字段清单，保持类型安全，防止历史遗留字段复现。
- 持续推进所有表单/卡牌/伙伴/训练相关字段的类型安全，确保所有 props、handler、工具函数等全链路类型安全。
- 记录每一阶段成果与变更点，便于回溯和维护。

## 负责人
AI Copilot

## 日期
2025-05-27
