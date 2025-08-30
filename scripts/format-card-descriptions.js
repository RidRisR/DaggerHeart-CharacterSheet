const fs = require('fs');
const path = require('path');

/**
 * 处理卡牌描述的格式化函数
 * 基于 processCardDescription 的规则
 */
function processCardDescription(description) {
  if (!description) return description;

  // 1. 先找到所有特性标题的位置
  const featurePattern = /\*__.*?__\*/g;
  const matches = Array.from(description.matchAll(featurePattern));

  if (matches.length === 0) {
    // 如果没有特性标题，处理列表项后的段落分隔
    return processListItemParagraphs(description);
  }

  // 2. 分段处理文本
  let processed = '';
  let lastIndex = 0;

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const matchStart = match.index;
    const matchEnd = matchStart + match[0].length;

    // 处理特性标题之前的文本
    let beforeText = description.substring(lastIndex, matchStart);

    // 检查特性标题是否在列表项中（包括可能的换行符）
    const isInListItem = beforeText.match(/- \s*\n?$/);

    if (isInListItem) {
      // 如果在列表项中，移除特性标题前的换行符，保持紧凑格式
      beforeText = beforeText.replace(/- \s*\n?$/, '- ');
    } else {
      // 如果不在列表项中，按原逻辑处理
      beforeText = beforeText.replace(/\n+/g, '\n');

      // 如果不是第一个特性，在特性标题前添加段落分隔
      if (i > 0) {
        // 确保前面有两个换行符来分隔段落
        if (beforeText.endsWith('\n')) {
          beforeText = beforeText.slice(0, -1) + '\n\n';
        } else {
          beforeText += '\n\n';
        }
      }
    }

    processed += beforeText + match[0];
    lastIndex = matchEnd;
  }

  // 处理最后一个特性标题之后的文本
  let afterText = description.substring(lastIndex);
  afterText = afterText.replace(/\n+/g, '\n');
  processed += afterText;

  // 最后处理列表项后的段落分隔
  return processListItemParagraphs(processed.trim());
}

/**
 * 处理列表项后的段落分隔
 * 确保列表项结束后的新段落有适当的分隔
 */
function processListItemParagraphs(text) {
  if (!text) return text;

  // 匹配列表项结束后直接跟着的文本段落
  // 列表项模式：以 "- " 开始的行，结束后换行跟着非列表项文本
  const listItemEndPattern = /(-\s[^\n]+)\n([^\n-][^\n]*)/g;

  return text.replace(listItemEndPattern, '$1\n\n$2');
}

/**
 * 递归处理对象中的所有字符串字段
 */
function processAllStrings(obj) {
  if (typeof obj === 'string') {
    return processCardDescription(obj);
  } else if (Array.isArray(obj)) {
    return obj.map(item => processAllStrings(item));
  } else if (obj && typeof obj === 'object') {
    const processed = {};
    for (const key in obj) {
      processed[key] = processAllStrings(obj[key]);
    }
    return processed;
  }
  return obj;
}

// 主函数
function main() {
  const inputPath = path.join(__dirname, '../data/cards/builtin-base.json');
  const outputPath = path.join(__dirname, '../data/cards/builtin-base.json');
  
  console.log('读取文件:', inputPath);
  
  // 读取 JSON 文件
  const rawData = fs.readFileSync(inputPath, 'utf8');
  const data = JSON.parse(rawData);
  
  console.log('开始格式化卡牌描述...');
  
  // 处理所有卡牌描述
  const processedData = processAllStrings(data);
  
  // 写回文件
  fs.writeFileSync(outputPath, JSON.stringify(processedData, null, 2), 'utf8');
  
  console.log('格式化完成!文件已保存至:', outputPath);
  
  // 统计处理的卡牌数量
  let cardCount = 0;
  const cardTypes = ['profession', 'ancestry', 'community', 'subclass', 'domain', 'variant'];
  
  cardTypes.forEach(type => {
    if (data[type] && Array.isArray(data[type])) {
      cardCount += data[type].length;
      console.log(`  - ${type}: ${data[type].length} 张卡牌`);
    }
  });
  
  console.log(`总计处理: ${cardCount} 张卡牌`);
}

// 执行主函数
main();