// ==UserScript==
// @name         Daggerheart二元骰
// @author       RidRisR
// @version      2.1.0
// @description  Daggerheart风格的二元骰系统，支持复杂修饰符语法和完整角色管理
// @timestamp    1735802400
// @diceRequireVer 1.2.0
// @license      MIT
// @homepageURL  https://github.com/RidRisR/DaggerHeart-CharacterSheet/blob/main/public/配套骰子（适用于海豹骰子）/daggerheart.js
// ==/UserScript==

/*
 * 此插件采用单文件复杂逻辑组织规范
 * 代码结构和规范请参考: CLAUDE.md > Single-File Code Organization Standards
 * 语法文档请参考: examples/doc/daggerheart-syntax.md
 * 角色管理文档请参考: examples/doc/daggerheart-player-data.md
 * 如需修改或扩展功能，请严格遵守文档中的组织原则
 */

// ==========================================
// 配置常量区 - All configurable items centrally managed
// ==========================================
const CONFIG = {
  // 文案支持动态占位符，可自定义是否显示数值：
  // - 希望值文案：{currentHope} {maxHope}
  // - 压力值文案：{currentStress} {maxStress}
  // - GM恐惧值文案：{currentFear} {maxFear}
  // 示例：'希望+1' 或 '希望+1 ({currentHope}/{maxHope})' 或 '希望增加至{currentHope}点'
  messages: {
    // 二元骰结果文案（系统会随机选择一条）
    criticalSuccess: [
      '关键成功！希望之光闪耀，内心的重负得以释放！',
      '奇迹时刻！命运的眷顾让你重燃希望，卸下心头重担！'
    ],
    hopeWins: [
      '希望战胜了恐惧！光明指引着前路。',
      '勇气驱散了阴霾，希望之光照亮道路！',
      '内心的光芒战胜了黑暗，前进的道路清晰可见！'
    ],
    fearWins: [
      '恐惧笼罩了希望...阴霾降临。',
      '黑暗的阴影遮蔽了光明，困难重重...',
      '努力的尝试只带了恐惧...前路变得模糊不清...'
    ],
    //希望结果时的希望变化文案(系统会随机选择一条）
    hopeNetIncrease: [
      '你的内心涌现出更多的希望与勇气！',
      '这使你充满了决心！',
    ],
    hopeNetDecrease: [
      '为了争取希望，你付出了更多...',
      '希望的光芒有所消退了...',
    ],
    hopeNetUnchanged: [
      '希望的获取与消耗达到了微妙的平衡。',
      '在得失之间，心境保持着稳定。',
      '希望与代价相抵，恰如平常。'
    ],
    // 恐惧结果时的希望变化文案(系统会随机选择一条）
    hopeNetIncreaseForFear: [
      '即便在恐惧中，希望的种子仍在生长...',
      '再深的恐惧也无法熄灭希望的光芒。'
    ],
    hopeNetDecreaseForFear: [
      '恐惧的阴霾让内心的光芒更加黯淡...',
      '在黑暗面前，勇气暂时退缩了。',
      '恐惧吞噬了你的希望。'
    ],
    hopeNetUnchangedForFear: [
      '恐惧与希望在拉锯中保持着平衡。',
      '即使面对恐惧，内心依然坚守着底线。',
      '恐惧与希望在心中相互抗衡。'
    ],
    // 检定标题文案
    rollTitle: '{userName}进行二元骰检定',
    rollTitleWithReason: '{userName}为「{reason}」进行二元骰检定',
    // 希望/恐惧变化数值文案
    hopeChangeDetails: '希望值: {finalValue} ({currentHope}/{maxHope}) = {calculation}',
    fearChangeDetails: '恐惧值: {finalValue} ({currentFear}/{maxFear}) = {calculation}',
    // 压力变化文案(用于大成功)
    stressDecreased: '压力-1 ({currentStress}/{maxStress})',
    stressAtZero: '压力已为0 ({currentStress}/{maxStress})',
    // 希望变化文案（用于大成功）
    criticalSuccessHopeDetails: '希望值: {finalValue} ({currentHope}/{maxHope}) = {calculation}',
    // GM管理文案
    gmSet: '已设置为此群GM',
    gmRemoved: '已卸任GM职位',
    noGMToRemove: '当前群组未设置GM，无需卸任',
    noGM: '当前群组未设置GM',
    // 系统消息文案
    error: '操作失败，请稍后重试',
    unknownResult: '未知结果',
    testDice: '测试投掷d{sides}: {result}'
  },

  // 语法解析规则
  syntax: {
    // 修饰符关键词映射
    advantageKeywords: ['优势', 'adv', 'advantage'],
    disadvantageKeywords: ['劣势', 'dis', 'disadvantage'],

    // 数值限制
    limits: {
      diceCount: { min: 1, max: 10 },
      diceSides: { min: 2, max: 100 },
      constant: { min: -999, max: 999 },
      advantage: { min: -10, max: 10 }
    }
  },

  // 游戏规则常量
  rules: {
    baseDiceSides: 12,
    advantageDiceSides: 6
  },

  // 希望值更新配置
  hopeSystem: {
    enabled: true, // 是否启用希望值自动更新
    hopeWinBonus: 1 // 希望结果时的奖励值
  },

  // 插件配置
  plugin: {
    name: 'daggerheart',
    author: 'SealDice社区',
    version: '2.1.0'
  }
};

// Daggerheart规则模板配置
const DAGGERHEART_TEMPLATE = {
  name: 'daggerheart',
  fullName: 'Daggerheart二元骰规则',
  authors: ['SealDice社区'],
  version: '2.0.0',
  updatedTime: '20250801',
  templateVer: '1.0',

  // .set 相关配置
  setConfig: {
    diceSides: 20,
    enableTip: '已切换至20面骰（供GM使用，玩家请使用.dd命令），并自动开启Daggerheart扩展',
    keys: ['daggerheart', 'dh', '匕首心', '匕首之心'],
    relatedExt: ['daggerheart', 'coc7'] // 必须包含coc7才能使用st指令
  },

  // 名片模板配置 - 使用 .sn dh 设置
  nameTemplate: {
    dh: {
      template: '{$t玩家_RAW} 希望{希望}/{希望上限} HP{生命}/{生命上限} 压力{压力}/{压力上限} 护甲{护甲}/{护甲上限}',
      helpText: 'Daggerheart角色名片'
    },
    gm: {
      template: '{$t玩家_RAW} 恐惧{恐惧}/{恐惧上限}',
      helpText: 'GM恐惧值名片'
    }
  },

  // 属性显示配置 - 支持 st 指令
  attrConfig: {
    // st show 时置顶显示的属性
    top: ['敏捷', '力量', '本能', '知识', '风度', '灵巧', '生命', '压力', '希望', '护甲', '恐惧', '闪避', '阈值'],
    sortBy: 'name',
    // st show 时隐藏的属性
    ignores: ['生命上限', '压力上限', '希望上限', '护甲上限', '恐惧上限', '严重阈值'],
    // st show 时的特殊显示格式
    showAs: {
      生命: '{生命}/{生命上限}',
      压力: '{压力}/{压力上限}',
      希望: '{希望}/{希望上限}',
      护甲: '{护甲}/{护甲上限}',
      恐惧: '{恐惧}/{恐惧上限}',
      阈值: '{阈值}/{严重阈值}'
    }
  },

  // 默认值 - 角色创建时的初始值（全部为0，玩家自行设置）
  defaults: {
    敏捷: 0,
    力量: 0,
    本能: 0,
    知识: 0,
    风度: 0,
    灵巧: 0,
    生命: 0,
    生命上限: 6,
    压力: 0,
    压力上限: 6,
    希望: 0,
    希望上限: 6,
    护甲: 0,
    护甲上限: 0,
    恐惧: 0,
    恐惧上限: 12,
    闪避: 0,
    阈值: 0,
    严重阈值: 0
  },

  // 属性别名 - 支持 st 指令的多种输入方式
  alias: {
    敏捷: ['agility', 'agi', '敏', 'mj'],  // mj = 敏捷
    力量: ['strength', 'str', '力', 'll'],  // ll = 力量
    本能: ['instinct', 'ins', '本', 'bn'],  // bn = 本能
    知识: ['knowledge', 'knw', '智', '知', 'zs'],  // zs = 知识
    风度: ['presence', 'pre', '魅', '风', 'fd'],  // fd = 风度
    灵巧: ['finesse', 'fin', '巧', '灵', 'lq'],  // lq = 灵巧
    生命: ['生命值', '血量', 'health', '血', '命', 'hp', 'sm'],  // sm = 生命
    生命上限: ['生命值上限', 'hpmax', '血量上限', 'maxhp', 'smsx'],  // smsx = 生命上限
    压力: ['stress', '压力值', 's', 'yl'],  // yl = 压力
    压力上限: ['stressmax', '压力上限值', 'maxstress', 'maxs', 'ylsx'],  // ylsx = 压力上限
    希望: ['hope', '希望值', 'h', 'xw'],  // xw = 希望
    希望上限: ['hopemax', '希望上限值', 'maxhope', 'maxh', 'xwsx'],  // xwsx = 希望上限
    护甲: ['armor', '防御', 'armour', 'a', 'hj'],  // hj = 护甲
    护甲上限: ['armormax', '防御上限', 'maxarmor', 'maxa', 'hjsx'],  // hjsx = 护甲上限
    恐惧: ['fear', '恐惧值', 'f', 'kj'],  // kj = 恐惧
    恐惧上限: ['fearmax', '恐惧上限值', 'maxfear', 'maxf', 'kjsx'],  // kjsx = 恐惧上限
    闪避: ['evasion', '回避', '闪', '避', 'e', 'sb'],  // sb = 闪避
    阈值: ['major', 'majorthreshold', '重伤阈值', '重伤', '阈值一', 'mjr', 'zsyz'],  // zsyz = 重伤阈值
    严重阈值: ['severe', 'severethreshold', '严重阈值', '严重', '阈值二', 'svr', 'yzyz']  // yzyz = 严重阈值
  }
};

// GM恐惧值管理配置
const GM_FEAR_CONFIG = {
  maxFear: 12,
  defaultFear: 0,
  storageKeys: {
    gmUser: (groupId) => `gm:${groupId}`
  }
};

// ==========================================
// 工具函数区 - Pure utility functions with no side effects
// ==========================================

/**
 * 从消息数组中随机选择一条消息
 * @param {string[]} messageArray - 消息数组
 * @returns {string} 随机选择的消息
 */
function getRandomMessage(messageArray) {
  if (!Array.isArray(messageArray) || messageArray.length === 0) {
    return CONFIG.messages.unknownResult;
  }
  const randomIndex = Math.floor(Math.random() * messageArray.length);
  return messageArray[randomIndex];
}

/**
 * 限制数值在指定范围内
 * @param {number} value - 输入值
 * @param {number} min - 最小值
 * @param {number} max - 最大值
 * @returns {number} 限制后的值
 */
function clampValue(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * 构建属性名映射表（包含所有别名）
 * @returns {Map<string, string>} 属性别名到标准属性名的映射
 */
function buildAttributeMap() {
  const attrMap = new Map();

  // 基础属性（排除非检定属性）
  const checkableAttributes = ['敏捷', '力量', '本能', '知识', '风度', '灵巧', '闪避'];

  for (const attr of checkableAttributes) {
    // 添加标准名称（小写）
    attrMap.set(attr.toLowerCase(), attr);

    // 添加所有别名（小写）
    if (DAGGERHEART_TEMPLATE.alias[attr]) {
      for (const alias of DAGGERHEART_TEMPLATE.alias[attr]) {
        attrMap.set(alias.toLowerCase(), attr);
      }
    }
  }

  return attrMap;
}

// 创建全局属性映射表
const ATTRIBUTE_MAP = buildAttributeMap();

/**
 * 检查是否为有效的属性名
 * @param {string} name - 待检查的名称
 * @returns {string|null} 标准属性名，如果不是属性则返回null
 */
function getAttributeName(name) {
  return ATTRIBUTE_MAP.get(name.toLowerCase()) || null;
}

/**
 * 设置属性并更新名片 - 模拟 .st 命令的行为
 * @param {Object} ctx - SealDice上下文
 * @param {string} attrName - 属性名
 * @param {number} value - 属性值
 */
function setAttributeAndUpdateCard(ctx, attrName, value) {
  // 设置属性值
  seal.vars.intSet(ctx, attrName, value);

  // 检查是否在群组中
  if (!ctx.group || !ctx.group.groupId) {
    return;
  }

  // 检查是否为 GM
  const groupId = ctx.group.groupId;
  const gmUserId = GMManager.getGMUser(groupId);
  const isGM = gmUserId === ctx.player.userId;

  // 应用对应的名片模板
  const template = isGM
    ? DAGGERHEART_TEMPLATE.nameTemplate.gm.template
    : DAGGERHEART_TEMPLATE.nameTemplate.dh.template;

  seal.applyPlayerGroupCardByTemplate(ctx, template);
}

/**
 * 检查是否为有效的修饰符格式
 * @param {string} token - 待检查的参数
 * @returns {boolean} 是否为有效修饰符
 */
function isValidModifier(token, ctx) {
  // 处理带符号的参数
  if (token.startsWith('+') || token.startsWith('-')) {
    const content = token.slice(1).toLowerCase();
    return isValidModifierContent(content, ctx);
  }

  // 处理不带符号的参数
  return isValidModifierContent(token.toLowerCase(), ctx);
}

/**
 * 检查内容是否为有效的修饰符
 * @param {string} content - 不带符号的内容
 * @param {Object} ctx - SealDice上下文
 * @returns {boolean} 是否为有效修饰符
 */
function isValidModifierContent(content, ctx) {
  // 检查是否为属性名
  if (getAttributeName(content)) {
    return true;
  }

  // 检查是否为经历（自定义属性）
  // 尝试直接读取属性值，如果能读到就认为是经历
  if (ctx) {
    const [value, exists] = seal.vars.intGet(ctx, content);
    if (exists) {
      return true;
    }
  }

  // 检查优势格式（优势、优势2、2优势、adv、adv2、2adv等）
  for (const keyword of CONFIG.syntax.advantageKeywords) {
    if (content === keyword) {
      return true; // 单独的优势关键词
    }
    if (content.startsWith(keyword)) {
      const numPart = content.slice(keyword.length).trim();
      if (/^\d*$/.test(numPart)) return true;
    }
    if (content.endsWith(keyword)) {
      const numPart = content.slice(0, -keyword.length).trim();
      if (/^\d+$/.test(numPart)) return true;
    }
  }

  // 检查劣势格式（劣势、劣势2、2劣势、dis、dis2、2dis等）
  for (const keyword of CONFIG.syntax.disadvantageKeywords) {
    if (content === keyword) {
      return true; // 单独的劣势关键词
    }
    if (content.startsWith(keyword)) {
      const numPart = content.slice(keyword.length).trim();
      if (/^\d*$/.test(numPart)) return true;
    }
    if (content.endsWith(keyword)) {
      const numPart = content.slice(0, -keyword.length).trim();
      if (/^\d+$/.test(numPart)) return true;
    }
  }

  // 检查骰子格式 (如 3d6 或 d6)
  if (/^\d*d\d+$/.test(content)) {
    return true;
  }

  // 检查纯数字格式
  if (/^\d+$/.test(content)) {
    return true;
  }

  return false;
}

/**
 * 解析单个修饰符
 * @param {string} token - 修饰符字符串
 * @returns {Object|null} 解析结果或null
 */
function parseModifier(token, ctx) {
  let sign = 1; // 默认为正向
  let content = token.toLowerCase().trim();

  // 如果有显式符号，提取符号和内容
  if (token.startsWith('+') || token.startsWith('-')) {
    sign = token.startsWith('+') ? 1 : -1;
    content = token.slice(1).toLowerCase().trim();
  }

  // 首先检查是否为预设属性名
  const attrName = getAttributeName(content);
  if (attrName) {
    return {
      type: 'attribute',
      name: attrName,
      sign: sign
    };
  }

  // 检查是否为经历（自定义属性）
  // 尝试直接读取属性值，如果能读到就认为是经历
  if (ctx) {
    const [experienceValue, exists] = seal.vars.intGet(ctx, content);
    if (exists) {
      return {
        type: 'experience',
        name: content,  // 使用小写版本
        sign: sign
      };
    }
  }

  // 解析优势
  for (const keyword of CONFIG.syntax.advantageKeywords) {
    if (content === keyword) {
      // 单独的优势关键词
      return {
        type: 'advantage',
        count: sign
      };
    }
    if (content.startsWith(keyword)) {
      // 优势2、adv3 等格式
      const numStr = content.slice(keyword.length).trim();
      const count = numStr === '' ? 1 : parseInt(numStr);
      if (!isNaN(count)) {
        return {
          type: 'advantage',
          count: clampValue(count * sign, -CONFIG.syntax.limits.advantage.max, CONFIG.syntax.limits.advantage.max)
        };
      }
    }
    if (content.endsWith(keyword)) {
      // 2优势、3adv 等格式
      const numStr = content.slice(0, -keyword.length).trim();
      const count = parseInt(numStr);
      if (!isNaN(count)) {
        return {
          type: 'advantage',
          count: clampValue(count * sign, -CONFIG.syntax.limits.advantage.max, CONFIG.syntax.limits.advantage.max)
        };
      }
    }
  }

  // 解析劣势
  for (const keyword of CONFIG.syntax.disadvantageKeywords) {
    if (content === keyword) {
      // 单独的劣势关键词
      return {
        type: 'disadvantage',
        count: sign
      };
    }
    if (content.startsWith(keyword)) {
      // 劣势2、dis3 等格式
      const numStr = content.slice(keyword.length).trim();
      const count = numStr === '' ? 1 : parseInt(numStr);
      if (!isNaN(count)) {
        return {
          type: 'disadvantage',
          count: clampValue(count * sign, -CONFIG.syntax.limits.advantage.max, CONFIG.syntax.limits.advantage.max)
        };
      }
    }
    if (content.endsWith(keyword)) {
      // 2劣势、3dis 等格式
      const numStr = content.slice(0, -keyword.length).trim();
      const count = parseInt(numStr);
      if (!isNaN(count)) {
        return {
          type: 'disadvantage',
          count: clampValue(count * sign, -CONFIG.syntax.limits.advantage.max, CONFIG.syntax.limits.advantage.max)
        };
      }
    }
  }

  // 解析额外骰子
  const diceMatch = content.match(/^(\d*)d(\d+)$/);
  if (diceMatch) {
    const count = diceMatch[1] === '' ? 1 : parseInt(diceMatch[1]); // 默认为1
    return {
      type: 'extraDice',
      count: clampValue(count, CONFIG.syntax.limits.diceCount.min, CONFIG.syntax.limits.diceCount.max),
      sides: clampValue(parseInt(diceMatch[2]), CONFIG.syntax.limits.diceSides.min, CONFIG.syntax.limits.diceSides.max),
      sign: sign
    };
  }

  // 解析常量
  const constMatch = content.match(/^(\d+)$/);
  if (constMatch) {
    const value = parseInt(constMatch[1]) * sign;
    return {
      type: 'constant',
      value: clampValue(value, CONFIG.syntax.limits.constant.min, CONFIG.syntax.limits.constant.max)
    };
  }

  return null;
}

/**
 * 拆分复合修饰符字符串为独立的修饰符
 * @param {string} compoundModifier - 复合修饰符字符串（如 "+5+4d6-adv"）
 * @returns {string[]} 独立的修饰符数组（如 ["+5", "+4d6", "-adv"]）
 */
function splitCompoundModifier(compoundModifier) {
  const modifiers = [];
  let currentModifier = '';

  for (let i = 0; i < compoundModifier.length; i++) {
    const char = compoundModifier[i];

    // 遇到新的符号（+/-），且不是第一个字符
    if ((char === '+' || char === '-') && i > 0) {
      // 保存当前修饰符
      if (currentModifier) {
        modifiers.push(currentModifier);
      }
      // 开始新的修饰符
      currentModifier = char;
    } else {
      currentModifier += char;
    }
  }

  // 添加最后一个修饰符
  if (currentModifier) {
    modifiers.push(currentModifier);
  }

  return modifiers;
}

/**
 * 主命令解析函数
 * @param {string[]} args - 命令参数数组
 * @returns {Object} 解析结果 {modifiers, reason}
 */
function parseCommandArgs(args, ctx) {
  const modifiers = [];
  let reasonStartIndex = args.length;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    // 处理带符号的参数（可能是复合修饰符）
    if (arg.startsWith('+') || arg.startsWith('-')) {
      // 处理可能的复合修饰符
      const splitModifiers = splitCompoundModifier(arg);
      let allValid = true;
      const parsedModifiers = [];

      // 验证并解析所有拆分出的修饰符
      for (const mod of splitModifiers) {
        if (isValidModifier(mod, ctx)) {
          const parsed = parseModifier(mod, ctx);
          if (parsed) {
            parsedModifiers.push(parsed);
          } else {
            allValid = false;
            break;
          }
        } else {
          allValid = false;
          break;
        }
      }

      if (allValid && parsedModifiers.length > 0) {
        // 所有修饰符都有效，添加到结果中
        modifiers.push(...parsedModifiers);
      } else {
        // 无效修饰符，从这里开始都是原因
        reasonStartIndex = i;
        break;
      }
    } else {
      // 不带符号的参数，尝试解析为修饰符
      if (isValidModifier(arg, ctx)) {
        const parsed = parseModifier(arg, ctx);
        if (parsed) {
          modifiers.push(parsed);
        } else {
          // 无法解析，作为原因的开始
          reasonStartIndex = i;
          break;
        }
      } else {
        // 不是有效修饰符，作为原因的开始
        reasonStartIndex = i;
        break;
      }
    }
  }

  const reason = args.slice(reasonStartIndex).join(' ');
  return { modifiers, reason };
}

/**
 * 计算净优势数
 * @param {Object[]} modifiers - 修饰符数组
 * @returns {number} 净优势数（正数为优势，负数为劣势）
 */
function calculateNetAdvantage(modifiers) {
  let totalAdvantage = 0;
  let totalDisadvantage = 0;

  for (const modifier of modifiers) {
    if (modifier.type === 'advantage') {
      totalAdvantage += modifier.count;
    } else if (modifier.type === 'disadvantage') {
      totalDisadvantage += modifier.count;
    }
  }

  return totalAdvantage - totalDisadvantage;
}

/**
 * 执行优势骰
 * @param {number} count - 优势数量
 * @returns {Object} {value: number, details: string}
 */
function rollAdvantage(count) {
  if (count <= 0) return { value: 0, details: '' };

  const rolls = [];
  for (let i = 0; i < count; i++) {
    rolls.push(Math.floor(Math.random() * CONFIG.rules.advantageDiceSides) + 1);
  }

  const maxRoll = Math.max(...rolls);
  return {
    value: maxRoll,
    details: `优势${count}d6[${rolls.join(',')}]=${maxRoll}`
  };
}

/**
 * 执行劣势骰
 * @param {number} count - 劣势数量
 * @returns {Object} {value: number, details: string}
 */
function rollDisadvantage(count) {
  if (count <= 0) return { value: 0, details: '' };

  const rolls = [];
  for (let i = 0; i < count; i++) {
    rolls.push(Math.floor(Math.random() * CONFIG.rules.advantageDiceSides) + 1);
  }

  const minRoll = Math.min(...rolls);
  return {
    value: -minRoll,
    details: `劣势${count}d6[${rolls.join(',')}]=${-minRoll}`
  };
}



/**
 * 格式化回复标题
 * @param {string} userName - 用户名
 * @param {string} reason - 检定原因
 * @returns {string} 格式化的标题
 */
function formatTitle(userName, reason) {
  return reason
    ? CONFIG.messages.rollTitleWithReason.replace('{userName}', userName).replace('{reason}', reason)
    : CONFIG.messages.rollTitle.replace('{userName}', userName);
}

/**
 * 希望值变化详情管理工具类
 * 职责: 记录、计算和格式化希望值的所有变化组成部分
 */
class HopeChangeTracker {
  /**
   * 构造函数
   * @param {number} originalValue - 初始希望值
   * @param {number} maxHope - 希望上限
   */
  constructor(originalValue, maxHope) {
    this.originalValue = Math.max(0, originalValue || 0);
    // 确保maxHope是有效的正数，如果无效则使用默认值6
    this.maxHope = maxHope > 0 ? maxHope : 6;
    this.components = []; // {type: 'gain'|'consume', amount: number, reason: string}
    this.finalValue = this.originalValue;
  }

  /**
   * 添加希望值变化组件
   * @param {string} type - 变化类型 'gain'|'consume'
   * @param {number} amount - 变化数值(正数)
   * @param {string} reason - 变化原因
   */
  addComponent(type, amount, reason) {
    if (amount <= 0) return;
    this.components.push({
      type: type,
      amount: amount,
      reason: reason
    });
  }

  /**
   * 计算最终希望值
   * @returns {number} 最终希望值
   */
  calculateFinalValue() {
    let netChange = 0;
    for (const component of this.components) {
      if (component.type === 'gain') {
        netChange += component.amount;
      } else if (component.type === 'consume') {
        netChange -= component.amount;
      }
    }

    const newValue = this.originalValue + netChange;
    // 确保使用有效的希望上限，如果maxHope无效则使用默认值6
    const effectiveMaxHope = this.maxHope > 0 ? this.maxHope : 6;
    this.finalValue = Math.max(0, Math.min(newValue, effectiveMaxHope));
    return this.finalValue;
  }

  /**
   * 生成计算过程字符串
   * @returns {string} 如 "3+1(成功)-1(经历)"
   */
  getCalculationString() {
    if (this.components.length === 0) {
      return this.originalValue.toString();
    }

    let calculation = this.originalValue.toString();

    for (const component of this.components) {
      const sign = component.type === 'gain' ? '+' : '-';
      calculation += `${sign}${component.amount}(${component.reason})`;
    }

    return calculation;
  }

  /**
   * 生成完整的展示消息
   * @returns {string} 完整的希望值变化消息
   */
  getDisplayMessage() {
    if (!this.hasActualChange()) {
      return '';
    }

    const calculation = this.getCalculationString();
    return CONFIG.messages.hopeChangeDetails
      .replace('{calculation}', calculation)
      .replace('{finalValue}', this.finalValue.toString())
      .replace('{currentHope}', this.finalValue.toString())
      .replace('{maxHope}', this.maxHope.toString());
  }

  /**
   * 判断是否有实际变化
   * @returns {boolean} 是否有变化
   */
  hasActualChange() {
    return this.components.length > 0;
  }

  /**
   * 获取净变化量
   * @returns {number} 净变化量（正数表示增加，负数表示减少）
   */
  getNetChange() {
    return this.finalValue - this.originalValue;
  }
}

// ==========================================
// 核心类定义区 - Business logic encapsulation
// ==========================================

/**
 * GM管理器 - 处理GM信息和恐惧值管理
 */
class GMManager {
  /**
   * 设置群组的GM
   * @param {string} groupId - 群组ID
   * @param {string} userId - 用户ID
   */
  static setGM(groupId, userId) {
    const key = GM_FEAR_CONFIG.storageKeys.gmUser(groupId);
    daggerheartExt.storageSet(key, userId);
  }

  /**
   * 获取群组的GM用户ID
   * @param {string} groupId - 群组ID
   * @returns {string|null} GM的用户ID，未设置时返回null
   */
  static getGMUser(groupId) {
    const key = GM_FEAR_CONFIG.storageKeys.gmUser(groupId);
    return daggerheartExt.storageGet(key) || null;
  }

  /**
   * 通过代骰功能获取GM的恐惧值
   * @param {Object} ctx - SealDice上下文
   * @param {string} gmUserId - GM用户ID
   * @returns {number} 恐惧值，获取失败时返回默认值
   */
  static getGMFear(ctx, gmUserId) {
    try {
      // 构造cmdArgs来获取GM的上下文
      const gmCmdArgs = {
        command: 'getgmfear',
        args: [],
        kwargs: [],
        at: [{ userId: gmUserId }],
        rawArgs: ''
      };

      const mctx = seal.getCtxProxyFirst(ctx, gmCmdArgs);
      const [fearValue, hasFear] = seal.vars.intGet(mctx, '恐惧');
      return hasFear ? fearValue : GM_FEAR_CONFIG.defaultFear;
    } catch (error) {
      console.log(`获取GM恐惧值失败：${error.message}`);
      return GM_FEAR_CONFIG.defaultFear;
    }
  }

  /**
   * 增加GM恐惧值
   * @param {Object} ctx - SealDice上下文  
   * @param {string} groupId - 群组ID
   * @returns {Object|null} 恐惧值更新信息，包含gmUserId、currentFear、maxFear、updated等
   */
  static increaseGMFear(ctx, groupId) {
    const gmUserId = this.getGMUser(groupId);
    if (!gmUserId) {
      return null;
    }

    try {
      let mctx;

      // 判断当前用户是否就是GM
      if (ctx.player.userId === gmUserId) {
        // 投掷者就是GM，直接使用当前上下文
        mctx = ctx;
      } else {
        // 投掷者不是GM，使用代骰功能
        const gmCmdArgs = {
          command: 'increasegmfear',
          args: [],
          kwargs: [],
          at: [{ userId: gmUserId }],
          rawArgs: ''
        };

        mctx = seal.getCtxProxyFirst(ctx, gmCmdArgs);

        // 检查是否成功获取到代理上下文
        if (ctx.player.userId === mctx.player.userId) {
          // 获取失败（GM不在线或无法@）
          console.log('无法获取GM上下文，GM可能不在线');
          return null;
        }
      }

      // 正常操作恐惧值（就像操作希望值一样）
      const [currentFear, hasFear] = seal.vars.intGet(mctx, '恐惧');
      const actualCurrentFear = hasFear ? currentFear : GM_FEAR_CONFIG.defaultFear;
      const newFear = Math.min(actualCurrentFear + 1, GM_FEAR_CONFIG.maxFear);
      const updated = newFear > actualCurrentFear;

      if (updated) {
        // 设置恐惧值并更新名片
        setAttributeAndUpdateCard(mctx, '恐惧', newFear);
      }

      return {
        gmUserId,
        currentFear: newFear,
        maxFear: GM_FEAR_CONFIG.maxFear,
        updated
      };
    } catch (error) {
      console.log(`增加GM恐惧值失败：${error.message}`);
      return null;
    }
  }

  /**
   * 卸任群组的GM
   * @param {string} groupId - 群组ID
   * @returns {string|null} 被卸任的GM用户ID，未设置GM时返回null
   */
  static removeGM(groupId) {
    const gmUserId = this.getGMUser(groupId);
    if (!gmUserId) {
      return null;
    }

    // 清除GM用户记录
    const key = GM_FEAR_CONFIG.storageKeys.gmUser(groupId);
    daggerheartExt.storageSet(key, '');

    return gmUserId;
  }
}

/**
 * 二元骰游戏逻辑处理类
 */
class DualityDiceLogic {
  /**
   * 处理基础二元骰结果判定，包括希望值更新
   * @param {Object} ctx - SealDice上下文
   * @param {Object} msg - 消息对象
   * @param {number} hopeRoll - 希望骰结果
   * @param {number} fearRoll - 恐惧骰结果
   * @param {boolean} updateAttributes - 是否更新属性值，默认为true
   * @param {HopeChangeTracker} hopeTracker - 希望值变化追踪器，默认为null
   * @returns {Object} 结果类型、消息和希望值更新信息 {message: string, resultType: string, hopeUpdate: Object}
   */
  static processRoll(ctx, msg, hopeRoll, fearRoll, updateAttributes = true, hopeTracker = null) {
    const resultType = hopeRoll === fearRoll ? 'critical' :
      hopeRoll > fearRoll ? 'hope' : 'fear';

    let message;
    if (resultType === 'critical') {
      message = getRandomMessage(CONFIG.messages.criticalSuccess);
    } else if (resultType === 'hope') {
      message = getRandomMessage(CONFIG.messages.hopeWins);
    } else {
      message = getRandomMessage(CONFIG.messages.fearWins);
    }

    // 处理属性更新
    let hopeUpdate = {
      updated: false,
      currentHope: 0,
      maxHope: 0,
      tracker: null,
      hasChange: false
    };
    let stressUpdate = { updated: false, currentStress: 0, maxStress: 0 };

    // 处理希望值变化 - dr模式和dd模式都需要处理
    if (hopeTracker) {
      // dd模式：添加希望获得
      if (updateAttributes && (resultType === 'hope' || resultType === 'critical')) {
        const reason = resultType === 'critical' ? '关键成功' : '希望结果';
        hopeTracker.addComponent('gain', 1, reason);
      }

      // 计算最终希望值
      const finalHope = hopeTracker.calculateFinalValue();
      const [currentHope] = seal.vars.intGet(ctx, '希望');

      // dd模式和dr模式都要更新希望值（包括经历消耗）
      if (finalHope !== currentHope || hopeTracker.hasActualChange()) {
        setAttributeAndUpdateCard(ctx, '希望', finalHope);
      }

      hopeUpdate = {
        updated: finalHope !== currentHope,
        currentHope: finalHope,
        maxHope: hopeTracker.maxHope,
        tracker: hopeTracker,
        hasChange: hopeTracker.hasActualChange()
      };
    } else if (updateAttributes) {
      // 兜底逻辑：如果理论上需要更新属性但没有hopeTracker，创建一个
      const [currentHope] = seal.vars.intGet(ctx, '希望');
      const [maxHope, hasMaxHope] = seal.vars.intGet(ctx, '希望上限');
      hopeTracker = new HopeChangeTracker(currentHope, hasMaxHope ? maxHope : 6);

      if (resultType === 'hope' || resultType === 'critical') {
        const reason = resultType === 'critical' ? '关键成功' : '希望结果';
        hopeTracker.addComponent('gain', 1, reason);
      }

      const finalHope = hopeTracker.calculateFinalValue();
      if (finalHope !== currentHope) {
        setAttributeAndUpdateCard(ctx, '希望', finalHope);
      }

      hopeUpdate = {
        updated: finalHope !== currentHope,
        currentHope: finalHope,
        maxHope: hopeTracker.maxHope,
        tracker: hopeTracker,
        hasChange: hopeTracker.hasActualChange()
      };
    }

    // 关键成功时额外处理压力-1
    if (updateAttributes && resultType === 'critical') {
      const [currentStress] = seal.vars.intGet(ctx, '压力');
      const [maxStress, hasMaxStress] = seal.vars.intGet(ctx, '压力上限');

      // 压力-1，但不能为负数
      if (currentStress > 0) {
        const newStress = currentStress - 1;
        setAttributeAndUpdateCard(ctx, '压力', newStress);
        stressUpdate = { updated: true, currentStress: newStress, maxStress: hasMaxStress ? maxStress : 0 };
      } else {
        stressUpdate = { updated: false, currentStress, maxStress: hasMaxStress ? maxStress : 0 };
      }
    }

    // 恐惧结果时处理GM恐惧值
    let gmFearUpdate = null;
    if (updateAttributes && resultType === 'fear' && ctx.group && ctx.group.groupId) {
      gmFearUpdate = GMManager.increaseGMFear(ctx, ctx.group.groupId);

      // 如果GM恐惧值增加成功，触发GM名片更新
      if (gmFearUpdate && gmFearUpdate.updated && gmFearUpdate.gmUserId) {
        this.triggerGMFearUpdate(ctx, msg, gmFearUpdate.gmUserId);
      }
    }

    return { message, resultType, hopeUpdate, stressUpdate, gmFearUpdate };
  }

  /**
   * 触发GM恐惧值更新 - 动态构造cmdArgs调用代骰功能
   * @param {Object} ctx - SealDice上下文
   * @param {Object} msg - 消息对象
   * @param {string} gmUserId - GM用户ID
   */
  static triggerGMFearUpdate(ctx, msg, gmUserId) {
    try {
      // 动态构造cmdArgs，将GM添加到at数组中
      const gmCmdArgs = {
        command: 'gmfearupdate',
        args: [],
        kwargs: [],
        at: [{ userId: gmUserId }], // 关键：指定目标GM
        rawArgs: ''
      };

      // 调用GM恐惧值更新命令
      commandHandlers.gmFearUpdate(ctx, msg, gmCmdArgs);
    } catch (error) {
      console.log(`触发GM恐惧值更新失败：${error.message}`);
    }
  }

  /**
   * 处理复杂修饰符的二元骰检定
   * @param {Object} ctx - SealDice上下文
   * @param {Object} msg - 消息对象
   * @param {Object} parsedCommand - 解析后的命令
   * @param {Object|null} presetRolls - 预设的骰子点数 {hope: number, fear: number}，为null时随机投掷
   * @param {boolean} updateAttributes - 是否更新属性值，默认为true
   * @returns {Object} 完整的检定结果
   */
  static processComplexRoll(ctx, msg, parsedCommand, presetRolls = null, updateAttributes = true) {
    // 基础骰子 - 如果有预设点数就使用，否则随机投掷
    const hopeRoll = presetRolls ? presetRolls.hope : parseInt(seal.format(ctx, `{d${CONFIG.rules.baseDiceSides}}`));
    const fearRoll = presetRolls ? presetRolls.fear : parseInt(seal.format(ctx, `{d${CONFIG.rules.baseDiceSides}}`));
    const baseTotal = hopeRoll + fearRoll;

    // 创建希望值变化追踪器 - dr模式下也需要创建来处理经历的希望消耗
    const [currentHope] = seal.vars.intGet(ctx, '希望');
    const [maxHope, hasMaxHope] = seal.vars.intGet(ctx, '希望上限');
    // 如果没有设置希望上限，使用默认值6
    const hopeTracker = new HopeChangeTracker(currentHope, hasMaxHope ? maxHope : 6);

    // 计算修饰符
    const netAdvantage = calculateNetAdvantage(parsedCommand.modifiers);
    let modifierTotal = 0;
    const modifierDetails = [];
    const calculationParts = []; // 用于总点数计算显示

    // 处理优势/劣势
    if (netAdvantage > 0) {
      const advantageResult = rollAdvantage(netAdvantage);
      modifierTotal += advantageResult.value;
      if (advantageResult.details) {
        modifierDetails.push(advantageResult.details);
        calculationParts.push(`+${advantageResult.value}`);
      }
    } else if (netAdvantage < 0) {
      const disadvantageResult = rollDisadvantage(-netAdvantage);
      modifierTotal += disadvantageResult.value;
      if (disadvantageResult.details) {
        modifierDetails.push(disadvantageResult.details);
        calculationParts.push(`${disadvantageResult.value}`); // 已经是负数
      }
    }

    // 处理额外骰子
    const extraDice = parsedCommand.modifiers.filter(m => m.type === 'extraDice');
    for (const dice of extraDice) {
      const rolls = [];
      for (let i = 0; i < dice.count; i++) {
        rolls.push(Math.floor(Math.random() * dice.sides) + 1);
      }

      const sum = rolls.reduce((a, b) => a + b, 0);
      const value = sum * dice.sign;
      modifierTotal += value;

      const sign = dice.sign > 0 ? '+' : '-';
      const detailText = `${sign}${dice.count}d${dice.sides}[${rolls.join(',')}]=${value >= 0 ? '+' : ''}${value}`;
      modifierDetails.push(detailText);
      calculationParts.push(`${value >= 0 ? '+' : ''}${value}`);
    }

    // 处理经历修饰符（需要消耗希望）
    const experiences = parsedCommand.modifiers.filter(m => m.type === 'experience');

    for (const exp of experiences) {
      const [expValue, hasExp] = seal.vars.intGet(ctx, exp.name);
      const actualValue = hasExp ? expValue : 0;

      // 检查是否还有希望值可用（考虑已记录的消耗）
      const alreadyConsumed = hopeTracker ? hopeTracker.components.filter(c => c.type === 'consume').length : 0;
      const [currentHope] = seal.vars.intGet(ctx, '希望');

      if (currentHope - alreadyConsumed > 0) {
        // 有希望值，使用经历
        if (hopeTracker) {
          hopeTracker.addComponent('consume', 1, exp.name);
        }

        const value = actualValue * exp.sign;
        modifierTotal += value;

        const sign = exp.sign > 0 ? '+' : '-';
        const detailText = `${sign}${exp.name}[${Math.abs(actualValue)}]`;
        modifierDetails.push(detailText);
        calculationParts.push(`${value >= 0 ? '+' : ''}${value}`);
      } else {
        // 希望不足，标记为忽略
        modifierDetails.push(`~${exp.name}[希望不足]`);
        // 不加入计算
      }
    }

    // 处理属性修饰符
    const attributes = parsedCommand.modifiers.filter(m => m.type === 'attribute');
    for (const attr of attributes) {
      const [attrValue, hasAttr] = seal.vars.intGet(ctx, attr.name);
      const actualValue = hasAttr ? attrValue : 0;
      const value = actualValue * attr.sign;
      modifierTotal += value;

      const sign = attr.sign > 0 ? '+' : '-';
      // 简化显示格式：直接显示 +属性名[值]，负数值自带负号
      const detailText = `${sign}${attr.name}[${actualValue}]`;
      modifierDetails.push(detailText);
      calculationParts.push(`${value >= 0 ? '+' : ''}${value}`);
    }

    // 处理常量
    const constants = parsedCommand.modifiers.filter(m => m.type === 'constant');
    for (const constant of constants) {
      modifierTotal += constant.value;
      const detailText = `${constant.value >= 0 ? '+' : ''}${constant.value}`;
      modifierDetails.push(detailText);
      calculationParts.push(`${constant.value >= 0 ? '+' : ''}${constant.value}`);
    }

    // 最终结果
    const finalTotal = baseTotal + modifierTotal;

    // 获取结果类型、消息和希望值更新（一体化处理）
    const rollResult = this.processRoll(ctx, msg, hopeRoll, fearRoll, updateAttributes, hopeTracker);

    return {
      hopeRoll,
      fearRoll,
      baseTotal,
      modifierTotal,
      finalTotal,
      modifierDetails,
      calculationParts,
      outcomeText: rollResult.message,
      resultType: rollResult.resultType,
      hopeUpdate: rollResult.hopeUpdate, // 希望值更新信息
      stressUpdate: rollResult.stressUpdate, // 压力值更新信息
      gmFearUpdate: rollResult.gmFearUpdate, // GM恐惧值更新信息
      hopeTracker: hopeTracker // 希望值变化追踪器
    };
  }

  /**
   * 设置上下文变量供模板系统使用
   * @param {Object} ctx - SealDice上下文
   * @param {string} userName - 用户名
   * @param {Object} rollResult - 检定结果
   * @param {string} reason - 检定原因
   */
  static setContextVariables(ctx, userName, rollResult, reason) {
    seal.vars.strSet(ctx, '$t玩家名', userName);
    seal.vars.intSet(ctx, '$t希望骰', rollResult.hopeRoll);
    seal.vars.intSet(ctx, '$t恐惧骰', rollResult.fearRoll);
    seal.vars.intSet(ctx, '$t基础点数', rollResult.baseTotal);
    seal.vars.intSet(ctx, '$t修饰符', rollResult.modifierTotal);
    seal.vars.intSet(ctx, '$t总点数', rollResult.finalTotal);
    seal.vars.strSet(ctx, '$t检定原因', reason);
  }
}

/**
 * 命令参数解析器
 */
class CommandParser {
  /**
   * 解析二元骰命令参数
   * @param {Object} cmdArgs - 命令参数对象
   * @param {Object} ctx - SealDice上下文，用于检查经历
   * @returns {Object} 解析结果
   */
  static parseDualityArgs(cmdArgs, ctx) {
    return parseCommandArgs(cmdArgs.args, ctx);
  }
}

/**
 * 响应格式化器
 */
class ResponseFormatter {
  /**
   * 构建完整的回复消息
   * @param {string} title - 标题
   * @param {Object} rollResult - 检定结果
   * @param {boolean} updateAttributes - 是否为真实检定（会更新属性）
   * @returns {string} 完整的回复消息
   */
  static buildComplexResponse(title, rollResult, updateAttributes = true) {
    let response = `${title}\n`;

    // 先显示希望骰和恐惧骰的详细信息
    response += `希望骰: ${rollResult.hopeRoll}  恐惧骰: ${rollResult.fearRoll}`;

    if (rollResult.modifierDetails.length > 0) {
      response += `\n调整值: ${rollResult.modifierDetails.join(', ')}`;
    }

    // 最后显示总点数结果
    if (rollResult.resultType === 'critical') {
      response += `\n总点数: *关键成功*`;
    } else if (rollResult.resultType === 'hope') {
      response += `\n总点数: *希望${rollResult.finalTotal}*`;
    } else if (rollResult.resultType === 'fear') {
      response += `\n总点数: *恐惧${rollResult.finalTotal}*`;
    }
    response += `\n--------------------`;

    // 在分隔线前显示恐惧值变化
    if (rollResult.gmFearUpdate) {
      let fearMessage;
      if (rollResult.gmFearUpdate.updated) {
        // 恐惧值成功增加
        fearMessage = CONFIG.messages.fearChangeDetails
          .replace('{calculation}', `${rollResult.gmFearUpdate.currentFear - 1}+1(恐惧结果)`)
          .replace('{finalValue}', rollResult.gmFearUpdate.currentFear)
          .replace('{currentFear}', rollResult.gmFearUpdate.currentFear)
          .replace('{maxFear}', rollResult.gmFearUpdate.maxFear);
      } else {
        // 恐惧值已满，无法增加
        fearMessage = CONFIG.messages.fearChangeDetails
          .replace('{calculation}', `${rollResult.gmFearUpdate.currentFear}+0(已达上限)`)
          .replace('{finalValue}', rollResult.gmFearUpdate.currentFear)
          .replace('{currentFear}', rollResult.gmFearUpdate.currentFear)
          .replace('{maxFear}', rollResult.gmFearUpdate.maxFear);
      }
      response += `\n${fearMessage}`;
    }

    // 显示希望值状态（在分隔线上方的数值区）
    if (rollResult.hopeUpdate && rollResult.hopeUpdate.tracker) {
      // 如果有变化，显示希望值变化详情
      if (rollResult.hopeUpdate.hasChange) {
        let hopeMessage;
        if (rollResult.resultType === 'critical') {
          // 关键成功时使用特殊的详情文案
          const tracker = rollResult.hopeUpdate.tracker;
          hopeMessage = CONFIG.messages.criticalSuccessHopeDetails
            .replace('{calculation}', tracker.getCalculationString())
            .replace('{finalValue}', rollResult.hopeUpdate.currentHope)
            .replace('{currentHope}', rollResult.hopeUpdate.currentHope)
            .replace('{maxHope}', rollResult.hopeUpdate.maxHope);
        } else {
          hopeMessage = rollResult.hopeUpdate.tracker.getDisplayMessage();
        }
        if (hopeMessage) {
          response += `\n${hopeMessage}`;
        }
      } else {
        // 没有变化时，显示当前希望值状态
        const currentHope = rollResult.hopeUpdate.currentHope;
        const maxHope = rollResult.hopeUpdate.maxHope;
        response += `\n希望值: ${currentHope} (${currentHope}/${maxHope})`;
      }
    }


    response += `\n--------------------`;
    response += `\n${rollResult.outcomeText}`;

    // 添加希望自定义文案（在分隔线下方的自定义文案区）
    if (rollResult.hopeUpdate && rollResult.hopeUpdate.tracker) {
      const netChange = rollResult.hopeUpdate.tracker.getNetChange();
      let hopeCustomText = '';

      // 根据结果类型选择不同的希望变化文案
      if (rollResult.resultType === 'fear') {
        // 恐惧结果时使用专门的文案
        if (netChange > 0) {
          hopeCustomText = getRandomMessage(CONFIG.messages.hopeNetIncreaseForFear);
        } else if (netChange < 0) {
          hopeCustomText = getRandomMessage(CONFIG.messages.hopeNetDecreaseForFear);
        } else {
          hopeCustomText = getRandomMessage(CONFIG.messages.hopeNetUnchangedForFear);
        }
      } else if (rollResult.resultType === 'critical') {
        // 关键成功时不显示额外的自定义文案，因为已经在详情中包含了
        hopeCustomText = null;
      } else {
        // 希望结果时使用原有文案
        if (netChange > 0) {
          hopeCustomText = getRandomMessage(CONFIG.messages.hopeNetIncrease);
        } else if (netChange < 0) {
          hopeCustomText = getRandomMessage(CONFIG.messages.hopeNetDecrease);
        } else {
          hopeCustomText = getRandomMessage(CONFIG.messages.hopeNetUnchanged);
        }
      }

      if (hopeCustomText) {
        response += `\n${hopeCustomText}`;
      }
    }

    // 显示属性变化
    const attributeChanges = [];

    // 希望值变化已经在分隔线前显示，这里不重复显示

    // 压力值变化（仅关键成功且为真实检定）
    if (rollResult.stressUpdate && rollResult.resultType === 'critical' && updateAttributes) {
      if (rollResult.stressUpdate.updated) {
        if (rollResult.stressUpdate.maxStress > 0) {
          attributeChanges.push(CONFIG.messages.stressDecreased
            .replace('{currentStress}', rollResult.stressUpdate.currentStress)
            .replace('{maxStress}', rollResult.stressUpdate.maxStress));
        } else {
          // 没有设置压力上限时，只显示当前压力值
          attributeChanges.push(`压力-1 (${rollResult.stressUpdate.currentStress})`);
        }
      } else if (rollResult.stressUpdate.currentStress === 0) {
        if (rollResult.stressUpdate.maxStress > 0) {
          attributeChanges.push(CONFIG.messages.stressAtZero
            .replace('{currentStress}', rollResult.stressUpdate.currentStress)
            .replace('{maxStress}', rollResult.stressUpdate.maxStress));
        } else {
          // 没有设置压力上限时，只显示当前压力值
          attributeChanges.push(`压力已为0 (${rollResult.stressUpdate.currentStress})`);
        }
      }
    }

    // 关键成功时显示所有属性变化
    if (rollResult.resultType === 'critical' && attributeChanges.length > 0) {
      response += `\n${attributeChanges.join('\n')}`;
    }

    // GM恐惧值变化已移至分隔线上方展示，自定义文案已在分隔线下方展示

    return response;
  }
}

// ==========================================
// 错误处理区 - Centralized error handling
// ==========================================
const ErrorHandler = {
  handle: (error, ctx, msg, showHelp = false) => {
    console.log(`Daggerheart Plugin Error: ${error.message}`);
    seal.replyToSender(ctx, msg, CONFIG.messages.error);
    const result = seal.ext.newCmdExecuteResult(false);
    result.showHelp = showHelp;
    return result;
  }
};

// ==========================================
// 扩展注册区 - SealDice API integration
// ==========================================

// 注册游戏规则模板
try {
  seal.gameSystem.newTemplate(JSON.stringify(DAGGERHEART_TEMPLATE));
  console.log('Daggerheart游戏系统模板加载成功');
} catch (e) {
  // 如果扩展已存在，或加载失败，那么会走到这里
  console.log('Daggerheart模板注册失败:', e);
}

// 创建和注册扩展
let daggerheartExt = seal.ext.find(CONFIG.plugin.name);
if (!daggerheartExt) {
  daggerheartExt = seal.ext.new(
    CONFIG.plugin.name,
    CONFIG.plugin.author,
    CONFIG.plugin.version
  );
  seal.ext.register(daggerheartExt);
}

// ==========================================
// 命令处理区 - Command solve functions
// ==========================================

const commandHandlers = {
  /**
   * 主要的二元骰命令处理器
   * @param {Object} ctx - SealDice上下文
   * @param {Object} msg - 消息对象
   * @param {Object} cmdArgs - 命令参数
   * @returns {Object} 命令执行结果
   */
  dualityDice: (ctx, msg, cmdArgs) => {
    try {
      const userName = seal.format(ctx, '{$t玩家}');
      const parsedCommand = CommandParser.parseDualityArgs(cmdArgs, ctx);

      // 处理复杂检定
      const rollResult = DualityDiceLogic.processComplexRoll(ctx, msg, parsedCommand);

      // 设置上下文变量
      DualityDiceLogic.setContextVariables(ctx, userName, rollResult, parsedCommand.reason);

      // 构建回复
      const titleText = formatTitle(userName, parsedCommand.reason);
      const response = ResponseFormatter.buildComplexResponse(titleText, rollResult, true);

      seal.replyToSender(ctx, msg, response);
      return seal.ext.newCmdExecuteResult(true);

    } catch (error) {
      return ErrorHandler.handle(error, ctx, msg);
    }
  },

  /**
   * 纯检定二元骰命令处理器 - 不更新任何属性值
   * @param {Object} ctx - SealDice上下文
   * @param {Object} msg - 消息对象
   * @param {Object} cmdArgs - 命令参数
   * @returns {Object} 命令执行结果
   */
  dualityDiceRollOnly: (ctx, msg, cmdArgs) => {
    try {
      const userName = seal.format(ctx, '{$t玩家}');
      const parsedCommand = CommandParser.parseDualityArgs(cmdArgs, ctx);

      // 使用不更新属性的 processComplexRoll
      const rollResult = DualityDiceLogic.processComplexRoll(ctx, msg, parsedCommand, null, false);

      // 设置上下文变量
      DualityDiceLogic.setContextVariables(ctx, userName, rollResult, parsedCommand.reason);

      // 构建回复
      const titleText = formatTitle(userName, parsedCommand.reason);
      const response = ResponseFormatter.buildComplexResponse(titleText, rollResult, false);

      seal.replyToSender(ctx, msg, response);
      return seal.ext.newCmdExecuteResult(true);

    } catch (error) {
      return ErrorHandler.handle(error, ctx, msg);
    }
  },

  /**
   * 测试命令处理器 - 支持指定骰子点数进行二元骰测试
   * @param {Object} ctx - SealDice上下文
   * @param {Object} msg - 消息对象
   * @param {Object} cmdArgs - 命令参数
   * @returns {Object} 命令执行结果
   */
  testDice: (ctx, msg, cmdArgs) => {
    try {
      const userName = seal.format(ctx, '{$t玩家}');

      // 如果没有参数，执行原来的简单测试
      if (!cmdArgs.args || cmdArgs.args.length === 0) {
        const roll = seal.format(ctx, `{d${CONFIG.rules.baseDiceSides}}`);
        seal.replyToSender(ctx, msg, CONFIG.messages.testDice.replace('{sides}', CONFIG.rules.baseDiceSides).replace('{result}', roll));
        return seal.ext.newCmdExecuteResult(true);
      }

      // 解析参数
      const args = cmdArgs.args;

      // 检查是否是 ddr 模式
      const isDdrMode = args[0] === '-r';
      let hopeRoll, fearRoll;

      if (isDdrMode) {
        // ddr 模式: .test -r 希望骰点数 恐惧骰点数
        if (args.length !== 3) {
          seal.replyToSender(ctx, msg, '参数错误！用法：.test -r 希望骰点数 恐惧骰点数\n例如：.test -r 10 5 (测试反应掷骰，不获得希望)');
          return seal.ext.newCmdExecuteResult(false);
        }
        hopeRoll = parseInt(args[1]);
        fearRoll = parseInt(args[2]);
      } else {
        // dd 模式: .test 希望骰点数 恐惧骰点数
        if (args.length !== 2) {
          seal.replyToSender(ctx, msg, '参数错误！用法：\n.test 希望骰点数 恐惧骰点数 - 测试dd命令(更新属性)\n.test -r 希望骰点数 恐惧骰点数 - 测试ddr命令(不更新属性)\n例如：.test 12 12 (关键成功)');
          return seal.ext.newCmdExecuteResult(false);
        }
        hopeRoll = parseInt(args[0]);
        fearRoll = parseInt(args[1]);
      }

      // 验证参数范围
      const maxSides = CONFIG.rules.baseDiceSides;
      if (isNaN(hopeRoll) || isNaN(fearRoll) ||
        hopeRoll < 1 || hopeRoll > maxSides ||
        fearRoll < 1 || fearRoll > maxSides) {
        seal.replyToSender(ctx, msg, `参数错误！骰子点数必须在1-${maxSides}之间`);
        return seal.ext.newCmdExecuteResult(false);
      }

      // 构造一个空的解析命令（无修饰符，无原因）
      const parsedCommand = { modifiers: [], reason: '' };

      // 根据模式决定是否更新属性
      const updateAttributes = !isDdrMode;

      // 使用相同的 processComplexRoll，但传入预设的骰子点数和更新标志
      const rollResult = DualityDiceLogic.processComplexRoll(ctx, msg, parsedCommand, {
        hope: hopeRoll,
        fear: fearRoll
      }, updateAttributes);

      // 设置相同的上下文变量
      const testReason = isDdrMode ? '测试(反应掷骰)' : '测试';
      DualityDiceLogic.setContextVariables(ctx, userName, rollResult, testReason);

      // 使用相同的响应格式化器
      const titleText = formatTitle(userName, testReason);
      const response = ResponseFormatter.buildComplexResponse(titleText, rollResult, updateAttributes);

      seal.replyToSender(ctx, msg, response);
      return seal.ext.newCmdExecuteResult(true);

    } catch (error) {
      return ErrorHandler.handle(error, ctx, msg);
    }
  },

  /**
   * GM设置命令处理器 - 设置当前用户为GM或卸任GM
   * @param {Object} ctx - SealDice上下文
   * @param {Object} msg - 消息对象
   * @param {Object} cmdArgs - 命令参数
   * @returns {Object} 命令执行结果
   */
  gmSet: (ctx, msg, cmdArgs) => {
    try {
      // 检查是否为帮助请求
      if (cmdArgs.args && cmdArgs.args.length > 0 && cmdArgs.args[0].toLowerCase() === 'help') {
        const result = seal.ext.newCmdExecuteResult(true);
        result.showHelp = true;
        return result;
      }

      // 检查是否在群聊中
      if (ctx.isPrivate) {
        seal.replyToSender(ctx, msg, '请在群聊中使用此命令');
        return seal.ext.newCmdExecuteResult(false);
      }

      // 检查是否为卸任操作
      if (cmdArgs.args && cmdArgs.args.length > 0 && cmdArgs.args[0].toLowerCase() === 'clear') {
        // 卸任GM
        const removedGMId = GMManager.removeGM(ctx.group.groupId);
        if (removedGMId) {
          seal.replyToSender(ctx, msg, `<@${removedGMId}> ${CONFIG.messages.gmRemoved}`);
        } else {
          seal.replyToSender(ctx, msg, CONFIG.messages.noGMToRemove);
        }
        return seal.ext.newCmdExecuteResult(true);
      }

      // 设置当前用户为GM
      GMManager.setGM(ctx.group.groupId, ctx.player.userId);

      // 设置GM名片变量（只设置上限，保留现有恐惧值）
      setAttributeAndUpdateCard(ctx, '恐惧上限', GM_FEAR_CONFIG.maxFear);

      // 回复设置成功消息
      seal.replyToSender(ctx, msg, CONFIG.messages.gmSet);
      return seal.ext.newCmdExecuteResult(true);

    } catch (error) {
      return ErrorHandler.handle(error, ctx, msg);
    }
  },

  /**
   * GM恐惧值更新命令处理器 - 使用代骰功能更新GM名片显示
   * @param {Object} ctx - SealDice上下文
   * @param {Object} cmdArgs - 命令参数（包含动态构造的at数组）
   * @returns {Object} 命令执行结果
   */
  gmFearUpdate: (ctx, cmdArgs) => {
    try {
      // 使用代骰功能获取GM的上下文
      const mctx = seal.getCtxProxyFirst(ctx, cmdArgs);

      // 检查是否成功获取到GM上下文
      if (ctx.player.userId === mctx.player.userId) {
        // 未能获取到GM上下文，可能是cmdArgs构造错误
        console.log('GM恐惧值更新失败：未能获取到GM上下文');
        return seal.ext.newCmdExecuteResult(false);
      }

      // 确保恐惧上限已设置并更新名片
      setAttributeAndUpdateCard(mctx, '恐惧上限', GM_FEAR_CONFIG.maxFear);

      const [currentFear] = seal.vars.intGet(mctx, '恐惧');
      console.log(`GM名片更新成功：${currentFear}/${GM_FEAR_CONFIG.maxFear}`);
      return seal.ext.newCmdExecuteResult(true);

    } catch (error) {
      console.log(`GM名片更新出错：${error.message}`);
      return seal.ext.newCmdExecuteResult(false);
    }
  },

  /**
   * 别名查询命令处理器 - 显示关键词的所有别名
   * @param {Object} ctx - SealDice上下文
   * @param {Object} msg - 消息对象
   * @param {Object} cmdArgs - 命令参数
   * @returns {Object} 命令执行结果
   */
  aliasQuery: (ctx, msg, cmdArgs) => {
    try {
      // 如果没有参数，显示所有关键词
      if (!cmdArgs.args || cmdArgs.args.length === 0) {
        let helpText = '【Daggerheart关键词别名查询】\n\n';
        helpText += '使用方法: .dhalias [关键词或别名]\n';
        helpText += '例如: .dhalias 敏捷 或 .dhalias agi\n\n';
        helpText += '可查询的关键词:\n';

        // 显示所有可查询的关键词（来自alias配置）
        const allAttributes = Object.keys(DAGGERHEART_TEMPLATE.alias);
        for (const attr of allAttributes) {
          helpText += `• ${attr}\n`;
        }

        seal.replyToSender(ctx, msg, helpText);
        return seal.ext.newCmdExecuteResult(true);
      }

      // 获取查询参数
      const query = cmdArgs.args[0].toLowerCase();

      // 查找匹配的关键词
      let foundAttr = null;
      let foundAliases = [];

      // 遍历所有关键词
      for (const [attrName, aliases] of Object.entries(DAGGERHEART_TEMPLATE.alias)) {
        // 检查是否匹配主关键词名
        if (attrName.toLowerCase() === query) {
          foundAttr = attrName;
          foundAliases = aliases;
          break;
        }

        // 检查是否匹配别名
        for (const alias of aliases) {
          if (alias.toLowerCase() === query) {
            foundAttr = attrName;
            foundAliases = aliases;
            break;
          }
        }

        if (foundAttr) break;
      }

      // 如果找到了关键词
      if (foundAttr) {
        let response = `【${foundAttr}】的所有有效输入:\n\n`;
        response += `主名称: ${foundAttr}\n`;
        response += `别名: ${foundAliases.join(', ')}\n\n`;

        // 显示示例
        response += '使用示例:\n';
        response += `• .dd ${foundAttr} 检定\n`;
        response += `• .dd +${foundAliases[0]} 检定\n`;
        if (foundAliases.length > 1) {
          response += `• .dd ${foundAliases[foundAliases.length - 1]} 检定`;
        }

        seal.replyToSender(ctx, msg, response);
      } else {
        // 未找到关键词
        let response = `未找到关键词或别名: ${query}\n\n`;
        response += '请输入 .dhalias 查看所有可查询的关键词';
        seal.replyToSender(ctx, msg, response);
      }

      return seal.ext.newCmdExecuteResult(true);

    } catch (error) {
      return ErrorHandler.handle(error, ctx, msg);
    }
  }
};

// ==========================================
// 命令注册区 - Command registration
// ==========================================

// 创建并注册主要命令
const cmdDuality = seal.ext.newCmdItemInfo();
cmdDuality.name = 'dd';
cmdDuality.help = `.dd [修饰符...] [原因] // 二元骰检定
修饰符支持:
  ±属性名 - 使用属性值(如+敏捷 +力量 +agi +str)
  ±经历名 - 使用经历值(消耗1点希望，如+锻造 +魔法学)
  ±[N]优势/adv - 优势骰(N个d6取最高,默认1)
  ±[N]劣势/dis - 劣势骰(N个d6取最低,默认1)  
  ±[N]dM - 额外骰子(N个M面骰,默认1)
  ±N - 常量修饰符
示例:
  .dd +敏捷 攀爬检定
  .dd +力量+优势 破门
  .dd +本能+2d6-劣势 复杂检定
  .dd +锻造+优势 制作装备(使用经历)

角色管理: 使用 .set daggerheart 切换规则，然后用 st 指令设置属性，.sn dh 应用名片`;
cmdDuality.solve = commandHandlers.dualityDice;

// 创建并注册纯检定命令
const cmdDualityRollOnly = seal.ext.newCmdItemInfo();
cmdDualityRollOnly.name = 'ddr';
cmdDualityRollOnly.help = `.ddr [修饰符...] [原因] // 反应二元骰，仅消耗希望不获得希望
修饰符支持:
  ±属性名 - 使用属性值(如+敏捷 +力量 +agi +str)
  ±经历名 - 使用经历值(消耗1点希望，如+锻造 +魔法学)
  ±[N]优势/adv - 优势骰(N个d6取最高,默认1)
  ±[N]劣势/dis - 劣势骰(N个d6取最低,默认1)  
  ±[N]dM - 额外骰子(N个M面骰,默认1)
  ±N - 常量修饰符
示例:
  .ddr +敏捷 攀爬检定
  .ddr +力量+优势 破门
  .ddr +锻造 制作检定(使用经历)

注意: .ddr命令仅在使用经历时会消耗希望，不会获得希望或更新其他属性`;
cmdDualityRollOnly.solve = commandHandlers.dualityDiceRollOnly;

// 创建并注册测试命令
const cmdTest = seal.ext.newCmdItemInfo();
cmdTest.name = 'test';
cmdTest.help = `.test [-r] [希望骰点数] [恐惧骰点数] // 二元骰测试命令
无参数: .test - 测试单个12面骰投掷
dd模式: .test 12 8 - 测试希望骰12，恐惧骰8的结果(更新属性)
ddr模式: .test -r 12 8 - 测试希望骰12，恐惧骰8的结果(不获得希望)
测试用例:
  .test 12 12 - 关键成功（希望+1，压力-1）
  .test 10 5 - 希望结果（希望+1）
  .test 3 8 - 恐惧结果（GM恐惧+1）
  .test -r 10 5 - 反应掷骰（仅消耗希望不获得）`;
cmdTest.solve = commandHandlers.testDice;

// 创建并注册GM管理命令
const cmdGM = seal.ext.newCmdItemInfo();
cmdGM.name = 'gm';
cmdGM.help = `.gm [clear] // GM管理命令
无参数: 设置当前用户为此群的GM，并应用GM恐惧值名片
.gm clear: 卸任当前群的GM

重要提示:
- 必须使用 .gm 命令设置GM，不要使用 .sn gm
- GM恐惧值初始为0/12
- 当有人投出恐惧结果时，GM恐惧值自动+1并更新名片`;
cmdGM.solve = commandHandlers.gmSet;

// 创建并注册GM恐惧值更新命令（内部使用，启用代骰功能）
const cmdGMFearUpdate = seal.ext.newCmdItemInfo();
cmdGMFearUpdate.name = 'gmfearupdate';
cmdGMFearUpdate.help = '内部命令，用于自动更新GM恐惧值';
cmdGMFearUpdate.allowDelegate = true; // 关键：启用代骰功能
cmdGMFearUpdate.solve = commandHandlers.gmFearUpdate;

// 创建并注册别名查询命令
const cmdAlias = seal.ext.newCmdItemInfo();
cmdAlias.name = 'dhalias';
cmdAlias.help = `.dhalias [关键词或别名] // 查询Daggerheart关键词的所有别名
无参数: 显示所有可查询的关键词
有参数: 显示指定关键词的所有别名和使用示例
示例:
  .dhalias - 显示所有关键词
  .dhalias 敏捷 - 查询敏捷的所有别名
  .dhalias agi - 查询agi对应的关键词和所有别名
  .dhalias mj - 查询拼音缩写mj对应的关键词`;
cmdAlias.solve = commandHandlers.aliasQuery;

// 创建并注册帮助命令 - 显示所有可用命令
const cmdHelp = seal.ext.newCmdItemInfo();
cmdHelp.name = 'dh';
cmdHelp.help = '显示Daggerheart插件所有可用命令';
cmdHelp.solve = (ctx, msg) => {
  try {
    let helpText = '【Daggerheart插件命令列表】\n\n';

    // 定义要显示的命令顺序和说明
    const commands = [
      { name: 'dh', description: '显示所有命令列表' },
      { name: 'dd', description: '二元骰检定（结果修改属性）' },
      { name: 'ddr', description: '反应二元骰（结果不修改属性，仅经历消耗属性）' },
      { name: 'gm', description: 'GM管理（设置/卸任）' },
      { name: 'dhalias', description: '查询关键词别名' },
      { name: 'test', description: '测试命令（指定骰子点数）' }
    ];

    // 构建帮助文本
    for (const cmd of commands) {
      helpText += `● .${cmd.name} - ${cmd.description}\n`;
    }

    helpText += '\n【规则设置】\n';
    helpText += '● .set dh - 开启Daggerheart规则\n';
    helpText += '● .sn dh - 应用玩家名片模板\n';
    helpText += '● .gm - 设置自己为GM（注意：必须使用.gm命令，不要使用.sn gm）\n';
    helpText += '\n使用 .help [命令] 查看详细帮助\n';
    helpText += '例如：.help dd 查看dd命令详细说明';

    seal.replyToSender(ctx, msg, helpText);
    return seal.ext.newCmdExecuteResult(true);

  } catch (error) {
    return ErrorHandler.handle(error, ctx, msg);
  }
};

// 注册命令到扩展
daggerheartExt.cmdMap['dd'] = cmdDuality;
daggerheartExt.cmdMap['ddr'] = cmdDualityRollOnly;
daggerheartExt.cmdMap['dhalias'] = cmdAlias;
daggerheartExt.cmdMap['test'] = cmdTest;
daggerheartExt.cmdMap['gm'] = cmdGM;
daggerheartExt.cmdMap['gmfearupdate'] = cmdGMFearUpdate;
daggerheartExt.cmdMap['dh'] = cmdHelp;