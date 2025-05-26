# 步骤2 类型系统强化与字段精简 变更记录

## 2.1 FormData 类型补充
- 在 lib/form-data.ts 的 FormData 接口中补充了以下字段：
  - companionExperience1 ~ companionExperience5
  - companionExperienceValue1 ~ companionExperienceValue5
  - companionImage
  - companionDescription
  - companionRange
  - companionStress
  - companionEvasion
  - companionStressMax
  - characterName
  - evasion
  - subclass

## 2.2 说明
- 以上字段均为组件实际引用但原未定义，现已全部纳入类型系统。
- 下一步将全局替换 any 为 FormData 类型，并标记未被引用字段。

---

本文件为类型系统强化与字段精简的变更记录。
