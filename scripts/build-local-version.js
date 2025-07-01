#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * 构建本地友好版本的脚本
 * 将构建输出重新组织为用户友好的目录结构
 */

const outDir = path.join(__dirname, '..', 'out');
const localDir = path.join(__dirname, '..', 'local-build');

function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function copyFile(src, dest) {
    const destDir = path.dirname(dest);
    ensureDir(destDir);
    fs.copyFileSync(src, dest);
}

function copyDirectory(src, dest) {
    ensureDir(dest);
    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            copyDirectory(srcPath, destPath);
        } else {
            copyFile(srcPath, destPath);
        }
    }
}

function updateJavaScriptPaths(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            updateJavaScriptPaths(fullPath);
        } else if (entry.name.endsWith('.js')) {
            try {
                let content = fs.readFileSync(fullPath, 'utf8');

                // 替换JavaScript中的路径引用
                const originalContent = content;
                content = content
                    .replace(/\/DaggerHeart-CharacterSheet\/card-manager/g, './card-manager.html')
                    .replace(/"\/DaggerHeart-CharacterSheet\/card-manager"/g, '"./card-manager.html"')
                    .replace(/'\/DaggerHeart-CharacterSheet\/card-manager'/g, "'./card-manager.html'")
                    .replace(/`\/DaggerHeart-CharacterSheet\/card-manager`/g, '`./card-manager.html`');

                // 只有内容真的改变了才写入文件
                if (content !== originalContent) {
                    fs.writeFileSync(fullPath, content, 'utf8');
                    console.log(`已更新 JavaScript 文件: ${entry.name}`);
                }
            } catch (error) {
                // 忽略读取错误，可能是二进制文件或其他格式
                console.warn(`跳过文件 ${entry.name}: ${error.message}`);
            }
        }
    }
}

function updateHtmlPaths(filePath, basePath = './资产') {
    if (!fs.existsSync(filePath)) {
        console.warn(`文件不存在: ${filePath}`);
        return;
    }

    let content = fs.readFileSync(filePath, 'utf8');

    // 检查是否是资产目录内的文件
    const isInsideAssets = basePath === './' || basePath === '.';
    
    if (isInsideAssets) {
        // 对于资产目录内的文件，资源路径应该是相对于当前目录
        content = content
            // 修复 _next 路径 - 将所有形式的 _next 路径都改为 ./_next/
            .replace(/\/_next\//g, './_next/')
            .replace(/\.\.\/_next\//g, './_next/')
            .replace(/href="\.\.\/_next\//g, 'href="./_next/')
            .replace(/src="\.\.\/_next\//g, 'src="./_next/')
            // 修复其他资源路径
            .replace(/href="\/DaggerHeart-CharacterSheet\//g, 'href="./')
            .replace(/src="\/DaggerHeart-CharacterSheet\//g, 'src="./')
            // 修复跳转链接
            .replace(/window\.location\.href\s*=\s*[`"']\/DaggerHeart-CharacterSheet\/card-manager[`"']/g,
                'window.location.href = "./card-manager.html"')
            // 修复其他内部链接
            .replace(/href="\/DaggerHeart-CharacterSheet\/([^"]+)"/g, 'href="./$1.html"')
            // 修复内联JavaScript中的静态资源路径引用
            .replace(/"static\/chunks\//g, '"./_next/static/chunks/')
            .replace(/'static\/chunks\//g, "'./_next/static/chunks/")
            .replace(/`static\/chunks\//g, '`./_next/static/chunks/')
            .replace(/"static\/css\//g, '"./_next/static/css/')
            .replace(/'static\/css\//g, "'./_next/static/css/")
            .replace(/`static\/css\//g, '`./_next/static/css/');
    } else {
        // 对于外部文件（如主入口），使用原有逻辑
        content = content
            // 更新 _next 路径
            .replace(/\/_next\//g, `${basePath}/_next/`)
            // 更新相对路径的资源
            .replace(/href="\.\//g, `href="${basePath}/`)
            .replace(/src="\.\//g, `src="${basePath}/`)
            // 更新绝对路径的资源
            .replace(/href="\/DaggerHeart-CharacterSheet\//g, `href="${basePath}/`)
            .replace(/src="\/DaggerHeart-CharacterSheet\//g, `src="${basePath}/`)
            // 更新页面跳转链接
            .replace(/window\.location\.href\s*=\s*[`"']\/DaggerHeart-CharacterSheet\/card-manager[`"']/g,
                `window.location.href = "${basePath}/card-manager.html"`)
            // 更新其他可能的内部链接
            .replace(/href="\/DaggerHeart-CharacterSheet\/([^"]+)"/g, `href="${basePath}/$1.html"`)
            // 确保 JavaScript 中动态生成的链接也能正确处理
            .replace(/\$\{basePath\}\/card-manager/g, `${basePath}/card-manager.html`)
            // 修复主入口文件中的内联JavaScript静态资源路径引用
            .replace(/"static\/chunks\//g, `"${basePath}/_next/static/chunks/`)
            .replace(/'static\/chunks\//g, `'${basePath}/_next/static/chunks/`)
            .replace(/`static\/chunks\//g, `\`${basePath}/_next/static/chunks/`)
            .replace(/"static\/css\//g, `"${basePath}/_next/static/css/`)
            .replace(/'static\/css\//g, `'${basePath}/_next/static/css/`)
            .replace(/`static\/css\//g, `\`${basePath}/_next/static/css/`);
    }

    // 通用的路径修复
    content = content
        // 修复 favicon 等资源路径
        .replace(/href="\/favicon\./g, `href="${isInsideAssets ? './' : basePath + '/'}favicon.`)
        .replace(/href="\/icon/g, `href="${isInsideAssets ? './' : basePath + '/'}icon`)
        .replace(/href="\/apple-icon/g, `href="${isInsideAssets ? './' : basePath + '/'}apple-icon`)
        // 修复构建后错误的路径前缀
        .replace(/\.\.\/资产\//g, isInsideAssets ? './' : './资产/')
        // 处理编译后的JavaScript中的路径（Next.js压缩后的代码）
        .replace(/\/DaggerHeart-CharacterSheet\/card-manager/g, isInsideAssets ? './card-manager.html' : `${basePath}/card-manager.html`);

    fs.writeFileSync(filePath, content, 'utf8');
}

/**
 * 将CSS样式内联到HTML文件中
 * @param {string} htmlFilePath HTML文件的路径
 */
function inlineCss(htmlFilePath) {
    if (!fs.existsSync(htmlFilePath)) {
        console.warn(`HTML file not found for CSS inlining: ${htmlFilePath}`);
        return;
    }

    console.log(`  Inlining CSS for: ${path.basename(htmlFilePath)}`);
    let content = fs.readFileSync(htmlFilePath, 'utf8');
    const htmlDir = path.dirname(htmlFilePath);

    // 正则表达式，用于查找所有<link rel="stylesheet">标签
    const linkTagRegex = /<link[^>]*?rel="stylesheet"[^>]*?>/g;
    const hrefRegex = /href="([^"]+)"/;
    const linkTags = content.match(linkTagRegex);

    if (linkTags) {
        for (const linkTag of linkTags) {
            const hrefMatch = linkTag.match(hrefRegex);
            if (hrefMatch && hrefMatch[1]) {
                const cssRelativePath = hrefMatch[1];
                // 解析CSS文件的绝对路径
                const cssFullPath = path.resolve(htmlDir, cssRelativePath);

                if (fs.existsSync(cssFullPath)) {
                    try {
                        const cssContent = fs.readFileSync(cssFullPath, 'utf8');
                        // 创建<style>标签并替换<link>标签
                        const styleTag = `<style>
/* Inlined from ${cssRelativePath.split('/').pop()} */
${cssContent}
</style>`;
                        content = content.replace(linkTag, styleTag);
                        console.log(`    - Inlined: ${path.basename(cssRelativePath)}`);
                    } catch (error) {
                        console.error(`    - Error reading CSS file ${cssFullPath}:`, error);
                    }
                } else {
                    console.warn(`    - CSS file not found, skipping: ${cssFullPath}`);
                }
            }
        }
        fs.writeFileSync(htmlFilePath, content, 'utf8');
    } else {
        console.log(`    - No external CSS links found.`);
    }
}

function main() {
    console.log('开始构建本地友好版本...');

    // 检查 out 目录是否存在
    if (!fs.existsSync(outDir)) {
        console.error('请先运行 npm run build 生成构建文件');
        process.exit(1);
    }

    // 清理并创建本地构建目录
    if (fs.existsSync(localDir)) {
        fs.rmSync(localDir, { recursive: true, force: true });
    }
    ensureDir(localDir);

    // 创建资产目录
    const assetsDir = path.join(localDir, '资产');
    ensureDir(assetsDir);

    console.log('复制构建文件到资产目录...');

    // 复制所有构建文件到资产目录
    const outFiles = fs.readdirSync(outDir, { withFileTypes: true });
    for (const entry of outFiles) {
        const srcPath = path.join(outDir, entry.name);
        const destPath = path.join(assetsDir, entry.name);

        if (entry.isDirectory()) {
            copyDirectory(srcPath, destPath);
        } else if (entry.name !== 'index.html') {
            // 除了 index.html 之外的所有文件都复制到资产目录
            copyFile(srcPath, destPath);
        }
    }

    console.log('创建入口文件...');

    // 复制 index.html 为入口文件
    const indexPath = path.join(outDir, 'index.html');
    const entryPath = path.join(localDir, '车卡器入口.html');

    if (fs.existsSync(indexPath)) {
        copyFile(indexPath, entryPath);
        console.log('更新入口文件中的路径...');
        updateHtmlPaths(entryPath);
    } else {
        console.error('找不到 index.html 文件');
        process.exit(1);
    }

    // 更新资产目录中其他 HTML 文件的路径
    console.log('更新资产目录中的文件路径...');
    const htmlFiles = ['card-manager.html']; // 可以根据需要添加更多文件

    for (const htmlFile of htmlFiles) {
        const filePath = path.join(assetsDir, htmlFile);
        if (fs.existsSync(filePath)) {
            // 对于资产目录中的HTML文件，basePath应该是 './' 
            updateHtmlPaths(filePath, './');
        }
    }

    // 更新所有JavaScript文件中的路径引用
    console.log('更新JavaScript文件中的路径...');
    const nextDir = path.join(assetsDir, '_next');
    if (fs.existsSync(nextDir)) {
        updateJavaScriptPaths(nextDir);
    }

    // 新增：将CSS内联到HTML文件中
    console.log('\n内联CSS样式...');
    inlineCss(entryPath);
    for (const htmlFile of htmlFiles) {
        const filePath = path.join(assetsDir, htmlFile);
        if (fs.existsSync(filePath)) {
            inlineCss(filePath);
        }
    }

    // 创建说明文件
    const readmePath = path.join(localDir, 'README.txt');
    const readmeContent = `Daggerheart 角色卡 - 本地版本

使用说明：
1. 双击打开 "车卡器入口.html" 即可开始使用
2. "资产" 文件夹包含所有网站文件，请不要删除或移动
3. 本版本完全在本地运行，无需网络连接

文件说明：
- 车卡器入口.html: 主入口文件，角色卡制作器
- 资产/: 包含所有网站资源和页面
- 资产/自定义卡牌包示例/: 自定义卡牌包示例和说明

注意事项：
- 请保持文件夹结构完整
- 如果移动整个文件夹，请确保相对位置不变
- 建议使用现代浏览器（Chrome、Firefox、Edge等）

版本信息：
构建时间: ${new Date().toLocaleString('zh-CN')}
`;

    fs.writeFileSync(readmePath, readmeContent, 'utf8');

    console.log('\n构建完成！');
    console.log(`本地版本已生成在: ${localDir}`);
    console.log('用户只需双击 "车卡器入口.html" 即可使用');
    console.log('\n目录结构:');
    console.log('├── 车卡器入口.html (主入口)');
    console.log('├── 资产/ (所有网站文件)');
    console.log('└── README.txt (使用说明)');
}

if (require.main === module) {
    main();
}

module.exports = { main };
