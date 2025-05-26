# 步骤1 字段引用与定义梳理结果

## 主要结论
- 已完成所有 formData 字段的全局引用统计与定义比对。
- 发现部分字段（如 companionExperience1、companionImage、companionDescription、companionRange、companionStress、companionEvasion、companionStressMax、characterName、evasion、subclass）被组件实际引用但未在 FormData 明确定义。
- 发现部分 FormData 字段未被任何组件引用，建议后续移除。
- 已生成详细的字段引用与定义对应表（见 fields-mapping.md）。

## 下一步
- 在 FormData 中补充所有被引用但未定义的字段。
- 标记未被引用的字段，准备移除。
- 进入类型系统强化与字段精简阶段。

---

本文件为步骤1的最终结果记录。
