@echo off
chcp 65001 >nul
echo 正在构建本地友好版本...
echo.

:: 检查 Node.js 是否安装
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo 错误：未检测到 Node.js，请先安装 Node.js
    echo 下载地址：https://nodejs.org/
    pause
    exit /b 1
)

:: 检查是否已安装依赖
if not exist "node_modules" (
    echo 正在安装依赖...
    npm install
    if %errorlevel% neq 0 (
        echo 依赖安装失败
        pause
        exit /b 1
    )
)

:: 构建本地版本
echo 开始构建...
npm run build:local

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo 构建成功！
    echo.
    echo 本地版本已生成在 "local-build" 目录中
    echo 双击 "车卡器入口.html" 即可使用
    echo.
    echo 目录结构：
    echo ├── 车卡器入口.html ^(主入口^)
    echo ├── 资产/ ^(所有网站文件^)
    echo └── README.txt ^(使用说明^)
    echo ========================================
    echo.
    
    :: 询问是否打开构建目录
    set /p choice="是否打开构建目录？(y/n): "
    if /i "%choice%"=="y" (
        explorer "local-build"
    )
) else (
    echo 构建失败，请检查错误信息
)

pause
