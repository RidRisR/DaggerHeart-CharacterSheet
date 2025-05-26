# 步骤3-补充：类型收敛与安全推进计划

## 目标
- 彻底收敛 setFormData 类型为 React.Dispatch<React.SetStateAction<FormData>>，所有 setFormData 用法统一为 (prev: FormData) => FormData。
- 明确 safeFormData.cards 只允许 StandardCard[]，彻底移除函数混用。
- 按页面/功能模块分批推进类型收敛，每次只处理一类问题，修改后立即编译、测试。
- 对于类型不确定的地方，临时加类型断言或运行时校验，防止数据污染。
- 每完成一批，记录变更点和测试结果，保持细致 commit，便于回滚。
- 兼容旧数据格式，必要时加数据迁移逻辑。
- 组件 props、context、工具函数等全部同步适配。

## 执行顺序
1. 统一 setFormData 类型与用法。
2. 明确 safeFormData.cards 类型。
3. 按页面/功能模块分批推进类型收敛。
4. 记录每一步变更与测试结果。

---

本文件为类型收敛与安全推进的详细计划。
