# DHSheet · 匕首之心车卡器

DHSheet 是由 RidRisR 维护的免费、开源、非官方《匕首之心》（Daggerheart）角色表工具。你可以在浏览器里创建角色、选择卡牌和装备，在跑团时记录生命、压力与希望，也可以把角色表打印出来带到桌上。

[打开在线车卡器](https://dhsheet.site/) · [查看版本发布记录](https://github.com/RidRisR/DaggerHeart-CharacterSheet/releases) · [反馈问题](https://github.com/RidRisR/DaggerHeart-CharacterSheet/issues)

## 保存和打印角色

角色会自动保存在当前浏览器中，可以建立多个存档，在不同角色之间切换。换设备或清理浏览器数据前，在底部「导出」菜单选择「导出JSON」备份角色，之后可以从文件导入。

需要纸质角色表时，在「导出」中打开预览，选择要打印的页面，也可以保存为 PDF。

## 卡包与装备包

在底部「扩展」里，可以分别管理卡包和装备包。启用卡包后，角色可以选用其中的卡牌。启用装备包后，其中的武器和护甲会出现在角色表的装备选择窗口。

要把自己的内容用到团里，可以用内容包编辑器制作，也可以按指南编写 JSON 后导入。[自定义卡包指南](public/自定义卡包指南和示例/用户指南.md) · [自定义装备包指南](public/自定义装备包指南和示例/用户指南.md)

## 本地开发

安装 Node.js 22 和 pnpm 后，运行以下命令，然后在浏览器中打开终端显示的本地地址。

```bash
git clone https://github.com/RidRisR/DaggerHeart-CharacterSheet.git
cd DaggerHeart-CharacterSheet
pnpm install
pnpm dev
```

| 命令 | 用途 |
| --- | --- |
| `pnpm test:run` | 运行测试 |
| `pnpm build` | 构建用于网站部署的静态文件 |
| `pnpm build:local` | 构建离线版。保留整个 `out/` 目录，用浏览器打开其中的 `车卡器入口.html` |

## 致谢

感谢 AlchemiZhou 提供「希望与恐惧扩展」的卡牌、装备资料和武术架势表。[AlchemiZhou 的原项目](https://github.com/AlchemiZhou/dhsheet)

感谢 [末楔](https://github.com/CissyOliviaCat)、[里予](https://github.com/LiyuNodream)、[一得](https://github.com/Milkyomeda) 和 [PolearmMaster](https://github.com/PolearmMaster) 参与中文翻译与校对。

## 许可与版权

车卡器的源代码采用 [GPL-3.0 许可证](LICENSE)。

本工具收录了《匕首之心》系统参考文档（SRD）中的规则，并将相关内容译为中文。SRD 版权所有 © Critical Role, LLC。插画版权归各自权利人所有。[官方 SRD](https://www.daggerheart.com/srd/) · [Darrington Press 社区游戏许可](https://darringtonpress.com/license/)
