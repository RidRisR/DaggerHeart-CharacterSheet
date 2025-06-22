#!/bin/bash

# 设置颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}正在构建本地友好版本...${NC}"
echo

# 检查 Node.js 是否安装
if ! command -v node &> /dev/null; then
    echo -e "${RED}错误：未检测到 Node.js，请先安装 Node.js${NC}"
    echo "下载地址：https://nodejs.org/"
    exit 1
fi

# 检查是否已安装依赖
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}正在安装依赖...${NC}"
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}依赖安装失败${NC}"
        exit 1
    fi
fi

# 构建本地版本
echo -e "${YELLOW}开始构建...${NC}"
npm run build:local

if [ $? -eq 0 ]; then
    echo
    echo -e "${GREEN}========================================"
    echo "构建成功！"
    echo
    echo "本地版本已生成在 \"local-build\" 目录中"
    echo "双击 \"车卡器入口.html\" 即可使用"
    echo
    echo "目录结构："
    echo "├── 车卡器入口.html (主入口)"
    echo "├── 资产/ (所有网站文件)"
    echo "└── README.txt (使用说明)"
    echo "========================================${NC}"
    echo
    
    # 询问是否打开构建目录
    read -p "是否打开构建目录？(y/n): " choice
    case "$choice" in 
        y|Y ) 
            if command -v open &> /dev/null; then
                open "local-build"  # macOS
            elif command -v xdg-open &> /dev/null; then
                xdg-open "local-build"  # Linux
            else
                echo "请手动打开 local-build 目录"
            fi
            ;;
        * ) 
            echo "构建完成"
            ;;
    esac
else
    echo -e "${RED}构建失败，请检查错误信息${NC}"
    exit 1
fi
