#!/usr/bin/env node

/**
 * 强化版卡牌数据转换脚本
 * 使用更精确和稳定的解析方法
 */

const fs = require('fs');
const path = require('path');

// 数据源文件路径
const DATA_SOURCES = {
    profession: 'data/card/profession-card/cards.ts',
    ancestry: 'data/card/ancestry-card/cards.ts',
    community: 'data/card/community-card/cards.ts',
    domain: 'data/card/domain-card/cards.ts',
    subclass: 'data/card/subclass-card/cards.ts'
};

// 输出目录
const OUTPUT_DIR = 'public/card-data';

/**
 * 解析对象字面量为JavaScript对象
 * 使用安全的Function构造器代替eval
 */
function parseObjectLiteral(objectStr) {
    try {
        // 创建一个安全的执行环境
        const safeEval = new Function('return ' + objectStr);
        return safeEval();
    } catch (error) {
        // 如果直接执行失败，尝试修复常见问题
        let fixedStr = objectStr;

        // 移除TypeScript类型注解
        fixedStr = fixedStr.replace(/:\s*[A-Z][a-zA-Z0-9<>[\]|&,\s]*(?=\s*[=,}])/g, '');

        try {
            const safeEval = new Function('return ' + fixedStr);
            return safeEval();
        } catch (secondError) {
            console.warn(`对象解析失败: ${secondError.message}`);
            return null;
        }
    }
}

/**
 * 从TypeScript文件中提取数组数据
 */
function extractArrayFromTypeScript(filePath) {
    try {
        console.log(`处理文件: ${filePath}`);
        const content = fs.readFileSync(filePath, 'utf8');

        // 移除import语句和注释
        let cleanContent = content
            .replace(/import\s+.*?from\s+.*?;?\s*\n?/g, '')
            .replace(/\/\/.*$/gm, '')
            .replace(/\/\*[\s\S]*?\*\//g, '');

        // 查找export const数组声明
        const exportPattern = /export\s+const\s+(\w+Cards?)(?::\s*\w+\[\])?\s*=\s*(\[[\s\S]*?\]);?\s*$/m;
        const match = cleanContent.match(exportPattern);

        if (!match) {
            console.warn(`无法找到导出数组: ${filePath}`);
            return [];
        }

        const arrayName = match[1];
        let arrayContent = match[2];

        console.log(`找到数组 ${arrayName}，开始解析...`);

        // 使用JavaScript解析器直接解析数组
        try {
            const parsedArray = parseObjectLiteral(arrayContent);
            if (Array.isArray(parsedArray)) {
                console.log(`成功解析 ${parsedArray.length} 个对象`);
                return parsedArray;
            } else {
                console.warn('解析结果不是数组');
                return [];
            }
        } catch (parseError) {
            console.error(`数组解析失败: ${parseError.message}`);

            // 尝试逐个对象解析
            return tryObjectByObjectParsing(arrayContent);
        }

    } catch (error) {
        console.error(`读取文件失败: ${error.message}`);
        return [];
    }
}

/**
 * 逐个对象解析数组内容
 */
function tryObjectByObjectParsing(arrayContent) {
    try {
        console.log('尝试逐个对象解析...');

        // 移除数组括号
        let content = arrayContent.trim();
        if (content.startsWith('[')) content = content.slice(1);
        if (content.endsWith(']')) content = content.slice(0, -1);

        const objects = [];
        let depth = 0;
        let currentObject = '';
        let inString = false;
        let stringChar = '';
        let escaped = false;

        for (let i = 0; i < content.length; i++) {
            const char = content[i];

            if (escaped) {
                escaped = false;
                currentObject += char;
                continue;
            }

            if (char === '\\') {
                escaped = true;
                currentObject += char;
                continue;
            }

            if (!inString && (char === '"' || char === "'")) {
                inString = true;
                stringChar = char;
            } else if (inString && char === stringChar) {
                inString = false;
                stringChar = '';
            }

            if (!inString) {
                if (char === '{') {
                    depth++;
                } else if (char === '}') {
                    depth--;
                }
            }

            currentObject += char;

            // 当深度回到0且遇到逗号或到达结尾时，说明一个对象结束了
            if (depth === 0 && (char === ',' || i === content.length - 1)) {
                let objectStr = currentObject.trim();
                if (objectStr.endsWith(',')) {
                    objectStr = objectStr.slice(0, -1).trim();
                }

                if (objectStr.startsWith('{') && objectStr.endsWith('}')) {
                    try {
                        const obj = parseObjectLiteral(objectStr);
                        if (obj) {
                            objects.push(obj);
                        }
                    } catch (e) {
                        console.warn(`跳过有问题的对象: ${e.message}`);
                    }
                }

                currentObject = '';
            }
        }

        console.log(`逐个解析完成，获得 ${objects.length} 个对象`);
        return objects;

    } catch (error) {
        console.error(`逐个解析失败: ${error.message}`);
        return [];
    }
}

/**
 * 创建元数据文件
 */
function createMetadata(cardCounts) {
    return {
        version: "1.0.0",
        lastUpdated: new Date().toISOString(),
        generatedBy: "convert-cards-to-json-v2.js",
        totalCards: Object.values(cardCounts).reduce((sum, count) => sum + count, 0),
        typeDistribution: cardCounts,
        description: "DaggerHeart角色卡牌数据集合"
    };
}

/**
 * 主转换函数
 */
function convertCardsToJSON() {
    console.log('开始转换卡牌数据（强化版）...');

    // 确保输出目录存在
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        console.log(`创建输出目录: ${OUTPUT_DIR}`);
    }

    const cardCounts = {};

    // 转换每种类型的卡牌数据
    for (const [type, sourcePath] of Object.entries(DATA_SOURCES)) {
        console.log(`\n转换 ${type} 类型卡牌...`);

        const fullPath = path.join(process.cwd(), sourcePath);

        // 检查文件是否存在
        if (!fs.existsSync(fullPath)) {
            console.warn(`文件不存在: ${fullPath}`);
            cardCounts[type] = 0;
            continue;
        }

        const cardData = extractArrayFromTypeScript(fullPath);

        if (cardData.length > 0) {
            const outputData = {
                type: type,
                version: "1.0.0",
                lastUpdated: new Date().toISOString(),
                count: cardData.length,
                cards: cardData
            };

            const outputPath = path.join(OUTPUT_DIR, `${type}-cards.json`);
            fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2), 'utf8');

            cardCounts[type] = cardData.length;
            console.log(`✓ ${type} 类型卡牌转换完成，共 ${cardData.length} 张卡牌`);
        } else {
            console.warn(`✗ ${type} 类型卡牌转换失败`);
            cardCounts[type] = 0;
        }
    }

    // 创建元数据文件
    const metadata = createMetadata(cardCounts);
    const metadataPath = path.join(OUTPUT_DIR, 'metadata.json');
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');

    console.log('\n转换完成！');
    console.log('生成的文件:');
    for (const type of Object.keys(DATA_SOURCES)) {
        console.log(`  - ${type}-cards.json (${cardCounts[type]} 张卡牌)`);
    }
    console.log(`  - metadata.json`);
    console.log(`\n总计: ${metadata.totalCards} 张卡牌`);
}

// 运行转换
if (require.main === module) {
    convertCardsToJSON();
}

module.exports = { convertCardsToJSON };
