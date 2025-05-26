# Step 4: 类型收敛与彻底类型安全计划

## 目标
- 将所有 handler 的 field/attribute 参数类型由 string 收敛为 keyof FormData，消除动态 key 访问和类型断言。
- renderBoxes 等函数参数类型收敛为 keyof FormData，消除 any。
- 对 setFormData 的动态 key 赋值进行类型收敛，必要时通过类型守卫或重载实现类型安全。
- 优化 props、工具函数等类型声明，确保全链路类型安全。
- 梳理 FormData 类型与实际引用字段，移除未被引用的“僵尸字段”。
- 更新 refactor/fields-mapping.md、fields-usage-report.md 等文档，保持字段清单同步。
- 在 refactor/ 目录下记录本阶段计划与结果。

## 步骤
1. 修改 handleCheckboxChange、handleBooleanChange、handleAttributeValueChange、handleMaxChange、renderBoxes 等函数的参数类型为 keyof FormData。
2. 消除 any 和类型断言，提升类型安全。
3. 梳理和清理未用字段，更新文档。
4. 记录阶段性成果。

## 负责人
AI Copilot

## 日期
2025-05-27
