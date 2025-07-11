#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * 批量替换卡牌包中的中文路径名称
 * 
 * 替换规则：
 * - 内置卡牌包 → builtin-cards
 * - 职业卡 → profession
 * - 血统卡 → ancestry
 * - 领域卡 → domain
 * - 子职业卡 → subclass
 */

const CARD_FILE_PATH = path.join(__dirname, '../data/cards/builtin-base.json');

// 路径替换映射
const PATH_REPLACEMENTS = {
  '/内置卡牌包/': '/builtin-cards/',
  '/职业卡/': '/profession/',
  '/血统卡/': '/ancestry/',
  '/领域卡/': '/domain/',
  '/子职业卡/': '/subclass/'
};

// 修复领域卡路径格式（去掉中间的分类目录）
function fixDomainCardPath(imagePath) {
  // 匹配格式: /builtin-cards/domain/<category>/<cardId>.webp
  const domainPathPattern = /^\/builtin-cards\/domain\/([^\/]+)\/([^\/]+\.webp)$/;
  const match = imagePath.match(domainPathPattern);
  
  if (match) {
    const [, category, filename] = match;
    // 去掉中间的分类目录，直接使用文件名
    return `/builtin-cards/domain/${filename}`;
  }
  
  return imagePath;
}

function replaceCardPaths() {
  try {
    console.log('开始批量替换卡牌路径中的中文名称...');
    
    // 读取原始文件
    const originalContent = fs.readFileSync(CARD_FILE_PATH, 'utf8');
    console.log(`读取文件: ${CARD_FILE_PATH}`);
    
    let updatedContent = originalContent;
    let totalReplacements = 0;
    
    // 应用路径替换
    Object.entries(PATH_REPLACEMENTS).forEach(([chinesePath, englishPath]) => {
      const regex = new RegExp(chinesePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      const matches = updatedContent.match(regex);
      const count = matches ? matches.length : 0;
      
      if (count > 0) {
        updatedContent = updatedContent.replace(regex, englishPath);
        console.log(`替换 "${chinesePath}" → "${englishPath}": ${count} 处`);
        totalReplacements += count;
      }
    });
    
    // 修复领域卡路径格式
    console.log('\n修复领域卡路径格式...');
    const imageUrlPattern = /"imageUrl":\s*"([^"]+)"/g;
    let domainFixCount = 0;
    
    updatedContent = updatedContent.replace(imageUrlPattern, (match, imagePath) => {
      const fixedPath = fixDomainCardPath(imagePath);
      if (fixedPath !== imagePath) {
        console.log(`修复路径: ${imagePath} → ${fixedPath}`);
        domainFixCount++;
        return `"imageUrl": "${fixedPath}"`;
      }
      return match;
    });
    
    // 创建备份文件
    const backupPath = CARD_FILE_PATH + '.backup.' + Date.now();
    fs.writeFileSync(backupPath, originalContent);
    console.log(`\n创建备份文件: ${backupPath}`);
    
    // 写入更新后的内容
    fs.writeFileSync(CARD_FILE_PATH, updatedContent);
    
    console.log('\n批量替换完成!');
    console.log(`总共替换路径: ${totalReplacements} 处`);
    console.log(`修复领域卡路径: ${domainFixCount} 处`);
    console.log(`更新文件: ${CARD_FILE_PATH}`);
    
    // 验证JSON格式
    try {
      JSON.parse(updatedContent);
      console.log('✅ JSON 格式验证通过');
    } catch (parseError) {
      console.error('❌ JSON 格式验证失败:', parseError.message);
      // 如果JSON格式有问题，恢复备份
      fs.writeFileSync(CARD_FILE_PATH, originalContent);
      console.log('已恢复原始文件');
    }
    
  } catch (error) {
    console.error('脚本执行失败:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  replaceCardPaths();
}

module.exports = { replaceCardPaths };
