#!/usr/bin/env node

/**
 * 将内置卡牌数据从 TypeScript 格式转换为 JSON 格式
 * 这个脚本会读取现有的 TS 文件并生成标准的 JSON 卡牌包
 */

const fs = require('fs');
const path = require('path');

// 导入卡牌数据 (需要编译后的 JS 文件)
async function convertBuiltinCards() {
  try {
    console.log('开始转换内置卡牌数据...');
    
    // 读取内置卡牌数据 - 需要先编译 TypeScript
    const dataDir = path.join(__dirname, '../data/card');
    
    // 动态导入编译后的模块
    const professionModule = await import('../data/card/profession-card/cards.js');
    const ancestryModule = await import('../data/card/ancestry-card/cards.js');
    const communityModule = await import('../data/card/community-card/cards.js');
    const subclassModule = await import('../data/card/subclass-card/cards.js');
    const domainModule = await import('../data/card/domain-card/cards.js');
    
    // 构建标准 JSON 格式
    const builtinCardPack = {
      name: "系统内置卡牌包",
      version: "V20250603", // 更新版本号以触发重新加载
      description: "系统内置卡牌包，数据来自SRD。",
      author: "RidRisR",
      profession: professionModule.professionCards || [],
      ancestry: ancestryModule.ancestryCards || [],
      community: communityModule.communityCards || [],
      subclass: subclassModule.subclassCards || [],
      domain: domainModule.domainCards || []
    };
    
    // 创建输出目录
    const outputDir = path.join(__dirname, '../public/card-packs');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // 写入 JSON 文件
    const outputPath = path.join(outputDir, 'builtin-base.json');
    fs.writeFileSync(outputPath, JSON.stringify(builtinCardPack, null, 2));
    
    console.log(`转换完成！JSON 文件已保存到: ${outputPath}`);
    console.log(`卡牌统计:`);
    console.log(`- 职业卡牌: ${builtinCardPack.profession.length}`);
    console.log(`- 血统卡牌: ${builtinCardPack.ancestry.length}`);
    console.log(`- 社群卡牌: ${builtinCardPack.community.length}`);
    console.log(`- 子职业卡牌: ${builtinCardPack.subclass.length}`);
    console.log(`- 领域卡牌: ${builtinCardPack.domain.length}`);
    console.log(`总计: ${Object.values(builtinCardPack).filter(Array.isArray).reduce((sum, arr) => sum + arr.length, 0)} 张卡牌`);
    
  } catch (error) {
    console.error('转换失败:', error);
    console.error('请确保已经编译了 TypeScript 文件');
    console.error('运行: npm run build 或 pnpm build');
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  convertBuiltinCards();
}

module.exports = { convertBuiltinCards };
