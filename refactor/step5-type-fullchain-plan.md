# Step 5: 全链路类型收敛与彻底类型安全计划

## 目标
- 梳理所有表单相关组件、工具函数、页面组件的 handler/props 类型声明，统一收敛为 keyof FormData，彻底消除 string 类型和类型断言。
- 修正所有 handler 的调用链路，包括 handleMaxChange、renderBoxes、handleBooleanChange、handleCheckboxChange 等，确保类型一致。
- 完善类型守卫，消除 spread/属性访问等类型报错。
- 梳理并移除 FormData 中未被引用的字段，防止“僵尸字段”再现。
- 同步更新字段文档（如 fields-mapping.md、fields-usage-report.md），确保文档与代码一致。
- 在 refactor/ 目录下记录本阶段计划与结果。

## 步骤
1. 全面排查所有表单相关组件、工具函数、页面组件的 handler/props 类型声明，统一收敛。
2. 修正所有类型不兼容报错。
3. 梳理并清理未用字段，更新文档。
4. 记录阶段性成果。

## 负责人
AI Copilot

## 日期
2025-05-27
