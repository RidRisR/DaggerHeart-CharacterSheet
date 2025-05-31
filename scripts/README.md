# 卡牌数据转换脚本使用说明

此目录包含用于将 TypeScript 卡牌数据转换为 JSON 格式的脚本。

## 脚本文件

- `convert-cards-to-json-v2.js` - 主要的转换脚本（推荐使用）
- `convert-cards-to-json-v3.js` - 备用版本脚本

## 使用方法

### 命令行运行

```bash
# 运行v2版本（推荐）
node scripts/convert-cards-to-json-v2.js

## 数据源

脚本会自动处理以下TypeScript文件：

- `data/card/profession-card/cards.ts` - 职业卡牌
- `data/card/ancestry-card/cards.ts` - 血统卡牌  
- `data/card/community-card/cards.ts` - 社群卡牌
- `data/card/domain-card/cards.ts` - 领域卡牌
- `data/card/subclass-card/cards.ts` - 子职业卡牌

## 输出

转换后的JSON文件会保存在 `public/card-data/` 目录：

- `profession-cards.json` - 职业卡牌数据
- `ancestry-cards.json` - 血统卡牌数据
- `community-cards.json` - 社群卡牌数据
- `domain-cards.json` - 领域卡牌数据
- `subclass-cards.json` - 子职业卡牌数据
- `metadata.json` - 元数据信息

## 特性

- 自动处理中文属性名
- 正确转义特殊字符（换行符、引号等）
- 支持复杂的嵌套对象结构
- 容错处理：即使部分数据有问题也会尽量转换其他数据
- 生成详细的元数据信息

## 故障排除

如果转换失败：

1. 检查源文件是否存在
2. 确保TypeScript文件语法正确
3. 查看控制台输出的错误信息
4. 尝试运行备用版本脚本

## 更新日志

- v2: 使用安全的Function构造器替代JSON解析，支持更复杂的数据结构
- v3: 备用版本，提供额外的容错机制
