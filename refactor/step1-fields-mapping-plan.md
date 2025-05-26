# 步骤1：字段引用与定义梳理

## 目标
- 全局统计所有 formData 字段的实际引用。
- 标记未被引用的字段，准备移除。
- 标记被引用但未定义的字段，准备补充定义。
- 生成字段引用与定义的对应关系表。

## 计划
1. 通过正则和静态分析，统计 components 目录下所有 formData 字段的实际引用。
2. 对比 lib/form-data.ts 的 FormData 接口，列出未被引用的字段。
3. 列出所有被引用但未在 FormData 定义的字段。
4. 生成详细的字段引用与定义对应表，输出到 refactor/fields-mapping.md。
5. 结果用于指导后续字段精简和类型补充。

## 执行
- 统计和比对已在 fields-usage-report.md 初步完成，下一步将生成详细对应关系表。
- 结果将记录在 refactor/fields-mapping.md。
