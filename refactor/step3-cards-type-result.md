# 步骤3-2：safeFormData.cards 类型收敛与修正结果

## 主要修正
- defaultFormData.cards 只初始化为 StandardCard[]。
- safeFormData.cards 只允许 StandardCard[]，不再混用函数。
- 仍有部分类型报错：
  - 动态 key 访问（如 safeFormData[field]）缺少索引签名。
  - armorValue 参与 < 运算时类型为 string，需转 number。

## 下一步建议
- 对 renderBoxes 等动态 key 访问加类型断言或类型守卫。
- 对 armorValue 参与运算前加 Number() 转换。
- 继续收敛所有类型不安全用法。

---

本文件为 safeFormData.cards 类型收敛与修正阶段的结果记录。
