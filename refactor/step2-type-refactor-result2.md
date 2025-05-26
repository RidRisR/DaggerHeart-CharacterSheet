# 步骤2 类型系统强化与字段精简（阶段性结果）

## 2.3 主要变更
- components 目录下所有 formData: any、setFormData: (data: any) => void、onFormDataChange: (data: any) => void、React.Dispatch<React.SetStateAction<any>> 等已全部替换为类型安全写法。
- 所有相关 props、state、context、工具函数均已强制使用 FormData 类型。

## 2.4 编译器报错与后续修正建议
- 动态 key 访问（如 formData[attr.key]、formData[`companionExperience${i}`]）因缺少索引签名，需用类型断言或类型守卫处理。
- 某些字段（如 gold、experience）原本允许 number 类型，建议统一为数组类型，减少类型分支。
- setFormData 的函数式写法需调整为类型安全的方式。
- 具体报错与修正建议详见 VSCode/TS 报错信息，建议逐一修正。

## 2.5 下一步
- 处理所有类型报错，优化动态 key 访问和数据结构。
- 统一字段类型，进一步精简未被引用字段。

---

本文件为类型系统强化与字段精简阶段的阶段性结果与后续建议。
