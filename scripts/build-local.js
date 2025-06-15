const fs = require('fs');
const path = require('path');

console.log('🚀 开始处理本地构建文件...');

// 构建输出目录
const outDir = path.join(__dirname, '../out');

// 1. 重命名 index.html 为 车卡器入口.html
const indexPath = path.join(outDir, 'index.html');
const newIndexPath = path.join(outDir, '车卡器入口.html');

if (fs.existsSync(indexPath)) {
    fs.renameSync(indexPath, newIndexPath);
    console.log('✅ index.html 已重命名为 车卡器入口.html');
} else {
    console.log('❌ 未找到 index.html 文件');
}

// 2. 修复所有HTML文件的资源路径
function fixHtmlPaths(htmlPath, isSubDir = false) {
    if (!fs.existsSync(htmlPath)) return false;

    let content = fs.readFileSync(htmlPath, 'utf8');

    if (isSubDir) {
        // 子目录页面：修复指向上级目录的路径
        content = content.replace(/\/_next\//g, '../_next/');
        content = content.replace(/src="\//g, 'src="../');
        content = content.replace(/href="\//g, 'href="../');
        // 修复返回主页的链接
        content = content.replace(/href="\/"/g, 'href="../车卡器入口.html"');
    } else {
        // 主页面：确保相对路径正确
        content = content.replace(/\/_next\//g, './_next/');
        content = content.replace(/src="\//g, 'src="./');
        content = content.replace(/href="\//g, 'href="./');
        // 修复卡牌管理链接
        content = content.replace(/href="\.\/card-manager\/"/g, 'href="./card-manager/"');
    }

    fs.writeFileSync(htmlPath, content);
    return true;
}

// 修复主页面
if (fixHtmlPaths(newIndexPath, false)) {
    console.log('✅ 主页面路径已修复');
}

// 修复卡牌管理页面
const cardManagerIndexPath = path.join(outDir, 'card-manager', 'index.html');
if (fixHtmlPaths(cardManagerIndexPath, true)) {
    console.log('✅ 卡牌管理页面路径已修复');
} else {
    console.log('❌ 未找到卡牌管理页面');
}

// 3. 创建使用说明文件
const readmePath = path.join(outDir, '使用说明.txt');
const readmeContent = `DaggerHeart 角色卡 - 本地版本使用说明

📖 使用方法：
1. 双击 "车卡器入口.html" 开始使用角色卡系统
2. 点击右下角的"卡牌管理"按钮可以管理自定义卡牌
3. 所有角色数据自动保存在浏览器的本地存储中

📁 文件说明：
- 车卡器入口.html - 角色卡主页面
- card-manager/ - 卡牌管理功能页面
- _next/ - 系统资源文件（请勿删除）
- 自定义卡牌包示例/ - 卡牌包导入示例

💾 数据保存：
- 角色数据保存在浏览器本地存储中
- 关闭浏览器后数据不会丢失
- 可通过"存档与重置"功能导出/导入角色数据

⚠️ 注意事项：
- 请在同一个浏览器中使用以保持数据一致性
- 如需在其他电脑使用，请先导出数据再导入

🎯 推荐使用：Chrome、Firefox、Edge 等现代浏览器
`;

fs.writeFileSync(readmePath, readmeContent);
console.log('✅ 使用说明已创建');

console.log('🎉 本地构建处理完成！');
console.log('📂 输出目录:', outDir);
console.log('🚀 双击 "车卡器入口.html" 即可开始使用');
