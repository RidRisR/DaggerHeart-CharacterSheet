# 步骤2：类型系统强化与字段精简计划

## 目标
- 将所有 formData 相关的 any 替换为 FormData 类型。
- 对 setFormData、onFormDataChange 等相关函数参数类型进行严格约束。
- 对 props、state、context 等涉及 formData 的地方全部类型化。
- 在 FormData 中补充所有被引用但未定义的字段。
- 标记未被引用的字段，准备移除。

## 计划
1. 在 lib/form-data.ts 的 FormData 接口中补充所有被引用但未定义的字段（如 companion*、characterName、evasion、subclass 等）。
2. 标记未被任何组件引用的字段，准备后续移除。
3. 全局替换 components 目录下所有 formData: any、setFormData: (data: any) => void 等为类型安全的写法。
4. 对所有 props、state、context、工具函数涉及 formData 的地方，强制使用 FormData 类型。
5. 记录所有类型替换和字段补充的变更点。

## 执行
- 先补充 FormData 类型定义。
- 再全局类型替换。
- 结果与变更点记录在 step2-type-refactor-result.md。

---

本文件为类型系统强化与字段精简的详细计划。
