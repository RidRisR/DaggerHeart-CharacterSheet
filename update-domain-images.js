const fs = require('fs');
const path = require('path');

// 读取JSON文件
const filePath = path.join(__dirname, 'data/cards/builtin-base.json');
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

// 检查是否有domain数组
if (!data.domain || !Array.isArray(data.domain)) {
    console.log('Error: No domain array found in the JSON file');
    process.exit(1);
}

let modifiedCount = 0;

// 处理 domain 卡
if (Array.isArray(data.domain)) {
    data.domain.forEach(card => {
        if (card.id && card.领域) {
            const domain = String(card.领域).toLowerCase();
            const id = String(card.id).toLowerCase();
            card.imageUrl = `/内置卡牌包/领域卡/${domain}/${id}.webp`;
            modifiedCount++;
            console.log(`Modified domain: ${card.名称} (${id}) in ${domain}: ${card.imageUrl}`);
        }
    });
}

// 处理职业卡 profession
if (Array.isArray(data.profession)) {
    data.profession.forEach(card => {
        if (card.id) {
            const id = String(card.id).toLowerCase();
            card.imageUrl = `/内置卡牌包/职业卡/${id}.webp`;
            modifiedCount++;
            console.log(`Modified profession: ${card.名称 || card.name} (${id}): ${card.imageUrl}`);
        }
    });
}

// 处理子职业卡 subclass
if (Array.isArray(data.subclass)) {
    data.subclass.forEach(card => {
        if (card.id) {
            const id = String(card.id).toLowerCase();
            card.imageUrl = `/内置卡牌包/子职业卡/${id}.webp`;
            modifiedCount++;
            console.log(`Modified subclass: ${card.名称 || card.name} (${id}): ${card.imageUrl}`);
        }
    });
}

// 处理社群卡 community
if (Array.isArray(data.community)) {
    data.community.forEach(card => {
        if (card.id) {
            const id = String(card.id).toLowerCase();
            card.imageUrl = `/内置卡牌包/社群卡/${id}.webp`;
            modifiedCount++;
            console.log(`Modified community: ${card.名称 || card.name} (${id}): ${card.imageUrl}`);
        }
    });
}

// 处理血统卡 ancestry
if (Array.isArray(data.ancestry)) {
    data.ancestry.forEach(card => {
        if (card.id) {
            const id = String(card.id).toLowerCase();
            card.imageUrl = `/内置卡牌包/血统卡/${id}.webp`;
            modifiedCount++;
            console.log(`Modified ancestry: ${card.名称 || card.name} (${id}): ${card.imageUrl}`);
        }
    });
}

// 写回文件
fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');

console.log(`\nUpdate completed! Modified ${modifiedCount} cards.`);
console.log('All supported card types now have imageUrl in format: /内置卡牌包/<类型>/<id>.jpg');
