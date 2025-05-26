# 步骤2-补充：动态key与类型分支问题专项修正计划

## 新发现问题
- 组件中存在大量动态key访问（如 formData[attr.key]、formData[`companionExperience${i}`]），因 FormData 无索引签名导致类型报错。
- 某些字段（如 gold、experience）允许 number 或数组两种类型，导致类型分支和类型不一致问题。

## 修正计划
1. 为 FormData 增加合适的索引签名（如 [key: string]: any），但仅用于兼容动态key访问，后续逐步收敛到类型安全方案。
2. 对于动态伙伴经验等，建议统一为数组结构（如 companionExperience: string[]，companionExperienceValue: string[]），并在组件中同步重构。
3. gold、experience、hope、hp、stress、armorBoxes 等字段统一为数组类型，移除 number 类型分支。
4. 组件内所有动态key访问，优先改为类型安全的数组或对象访问。
5. 记录所有修正点和兼容性处理。

## 执行
- 先为 FormData 增加索引签名，临时消除类型报错。
- 逐步将动态key相关字段重构为数组结构，并同步修改组件。
- 统一所有分支类型为数组。
- 记录修正结果。

---

本文件为动态key与类型分支问题专项修正计划。
