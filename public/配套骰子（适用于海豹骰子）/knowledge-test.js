// ==UserScript==
// @name         知识属性问题深入测试
// @author       测试脚本
// @version      1.0.0
// @desc         深入测试知识属性的存储问题
// @timestamp    1695619260
// @license      MIT
// @homepageURL  https://github.com/
// ==/UserScript==

// 测试脚本 - 深入研究知识属性问题
const testExt = seal.ext.find('知识属性深入测试');
if (!testExt) {
  const ext = seal.ext.new('知识属性深入测试', '测试', '1.0.0');

  // 初始化测试
  const cmdInit = seal.ext.newCmdItemInfo();
  cmdInit.name = 'knowtest';
  cmdInit.help = '知识属性测试工具\n.knowtest init - 初始化测试\n.knowtest check - 检查当前值\n.knowtest deep - 深入测试';

  cmdInit.solve = (ctx, msg, cmdArgs) => {
    const subCommand = cmdArgs.args && cmdArgs.args[0];

    if (!subCommand || subCommand === 'help') {
      seal.replyToSender(ctx, msg, cmdInit.help);
      return seal.ext.newCmdExecuteResult(true);
    }

    switch (subCommand.toLowerCase()) {
      case 'init':
        return initTest(ctx, msg);
      case 'check':
        return checkValues(ctx, msg);
      case 'deep':
        return deepTest(ctx, msg);
      case 'st':
        return stSimulation(ctx, msg, cmdArgs);
      default:
        seal.replyToSender(ctx, msg, '未知子命令。使用 .knowtest help 查看帮助');
        return seal.ext.newCmdExecuteResult(false);
    }
  };

  // 初始化测试
  function initTest(ctx, msg) {
    let response = '【知识属性初始化测试】\n\n';

    response += '=== 步骤1: 使用 intSet 设置属性 ===\n';

    // 设置测试属性
    seal.vars.intSet(ctx, '知识', 10);
    seal.vars.intSet(ctx, '力量', 10);
    seal.vars.intSet(ctx, '智慧', 10);  // 另一个可能的问题属性

    response += '已设置：\n';
    response += '• 知识 = 10\n';
    response += '• 力量 = 10（对照组）\n';
    response += '• 智慧 = 10（测试组）\n\n';

    response += '=== 步骤2: 立即读取验证 ===\n';

    // 读取并验证
    const [知识Val, 知识Exists] = seal.vars.intGet(ctx, '知识');
    const [力量Val, 力量Exists] = seal.vars.intGet(ctx, '力量');
    const [智慧Val, 智慧Exists] = seal.vars.intGet(ctx, '智慧');

    const 知识Format = seal.format(ctx, '{知识}');
    const 力量Format = seal.format(ctx, '{力量}');
    const 智慧Format = seal.format(ctx, '{智慧}');

    response += 'intGet 结果:\n';
    response += `• 知识: ${知识Val} (exists=${知识Exists}) ${知识Val === 10 ? '✓' : '✗'}\n`;
    response += `• 力量: ${力量Val} (exists=${力量Exists}) ${力量Val === 10 ? '✓' : '✗'}\n`;
    response += `• 智慧: ${智慧Val} (exists=${智慧Exists}) ${智慧Val === 10 ? '✓' : '✗'}\n\n`;

    response += 'format 结果:\n';
    response += `• 知识: "${知识Format}" ${知识Format === '10' ? '✓' : '✗'}\n`;
    response += `• 力量: "${力量Format}" ${力量Format === '10' ? '✓' : '✗'}\n`;
    response += `• 智慧: "${智慧Format}" ${智慧Format === '10' ? '✓' : '✗'}\n\n`;

    response += '=== 下一步 ===\n';
    response += '1. 手动执行: .st 知识5\n';
    response += '2. 然后执行: .knowtest check\n';
    response += '3. 观察知识属性的值变化\n';

    seal.replyToSender(ctx, msg, response);
    return seal.ext.newCmdExecuteResult(true);
  }

  // 检查当前值
  function checkValues(ctx, msg) {
    let response = '【当前属性值检查】\n\n';

    const attributes = ['知识', '力量', '智慧'];

    for (const attr of attributes) {
      response += `=== ${attr} ===\n`;

      // intGet
      const [intVal, intExists] = seal.vars.intGet(ctx, attr);
      response += `intGet: ${intVal} (exists=${intExists})\n`;

      // format
      const formatVal = seal.format(ctx, `{${attr}}`);
      response += `format: "${formatVal}"\n`;

      // 判断是否一致
      const parsed = parseInt(formatVal);
      if (!isNaN(parsed) && parsed !== intVal) {
        response += `⚠️ 不一致！intGet=${intVal}, format=${parsed}\n`;
      } else if (intExists && formatVal === attr) {
        response += `⚠️ format无法读取，但intGet有值\n`;
      }

      response += '\n';
    }

    // 额外测试：尝试其他可能的键名
    response += '=== 其他可能的键名测试 ===\n';
    const variants = ['知识值', '_知识', '$m知识', 'knowledge'];
    for (const variant of variants) {
      const [val, exists] = seal.vars.intGet(ctx, variant);
      if (exists) {
        response += `✓ "${variant}": ${val}\n`;
      }
    }

    seal.replyToSender(ctx, msg, response);
    return seal.ext.newCmdExecuteResult(true);
  }

  // 深入测试
  function deepTest(ctx, msg) {
    let response = '【深入测试】\n\n';

    response += '=== 测试1: 覆盖写入 ===\n';
    response += '将知识设置为不同的值，观察哪个生效\n';

    // 先用intSet设置
    seal.vars.intSet(ctx, '知识', 100);
    const [afterIntSet, ] = seal.vars.intGet(ctx, '知识');
    const afterIntSetFormat = seal.format(ctx, '{知识}');

    response += `intSet设置100后:\n`;
    response += `• intGet: ${afterIntSet}\n`;
    response += `• format: "${afterIntSetFormat}"\n\n`;

    response += '=== 测试2: 清除测试 ===\n';
    response += '尝试清除知识属性\n';

    // 尝试删除
    seal.vars.intSet(ctx, '知识', 0);
    const [afterClear, clearExists] = seal.vars.intGet(ctx, '知识');
    const afterClearFormat = seal.format(ctx, '{知识}');

    response += `设置为0后:\n`;
    response += `• intGet: ${afterClear} (exists=${clearExists})\n`;
    response += `• format: "${afterClearFormat}"\n\n`;

    response += '=== 测试3: 特殊字符测试 ===\n';
    const specialTests = [
      '知识',
      '知识值',
      '知識',  // 繁体
      'Knowledge',
      'knowledge',
      'KNOWLEDGE'
    ];

    for (const testKey of specialTests) {
      seal.vars.intSet(ctx, testKey, 99);
      const [val, exists] = seal.vars.intGet(ctx, testKey);
      const formatVal = seal.format(ctx, `{${testKey}}`);

      if (exists || (formatVal !== testKey && formatVal !== `{${testKey}}`)) {
        response += `"${testKey}": intGet=${val}/${exists}, format="${formatVal}"\n`;
      }
    }

    response += '\n=== 测试4: COC相关属性测试 ===\n';
    response += '测试其他可能被COC系统特殊处理的属性名\n';

    const cocAttributes = [
      '教育',
      '灵感',
      '知识',
      '理智',
      '意志',
      '幸运',
      '智力',
      '体质',
      '体型',
      '外貌',
      '魔法'
    ];

    for (const attr of cocAttributes) {
      // 设置值
      seal.vars.intSet(ctx, attr, 50);
      const [intVal, intExists] = seal.vars.intGet(ctx, attr);
      const formatVal = seal.format(ctx, `{${attr}}`);

      // 检查是否有不一致
      const parsed = parseInt(formatVal);
      if (intExists && !isNaN(parsed) && parsed !== intVal) {
        response += `⚠️ "${attr}": intGet=${intVal}, format=${parsed} - 可能是问题属性！\n`;
      }
    }

    seal.replyToSender(ctx, msg, response);
    return seal.ext.newCmdExecuteResult(true);
  }

  // 模拟ST命令的效果
  function stSimulation(ctx, msg, cmdArgs) {
    if (!cmdArgs.args || cmdArgs.args.length < 3) {
      seal.replyToSender(ctx, msg, '用法: .knowtest st <属性名> <值>');
      return seal.ext.newCmdExecuteResult(false);
    }

    const attrName = cmdArgs.args[1];
    const value = parseInt(cmdArgs.args[2]);

    if (isNaN(value)) {
      seal.replyToSender(ctx, msg, '值必须是数字');
      return seal.ext.newCmdExecuteResult(false);
    }

    let response = `【模拟ST命令测试】\n\n`;

    response += `=== 设置前 ===\n`;
    const [beforeInt] = seal.vars.intGet(ctx, attrName);
    const beforeFormat = seal.format(ctx, `{${attrName}}`);
    response += `intGet: ${beforeInt}\n`;
    response += `format: "${beforeFormat}"\n\n`;

    response += `=== 执行 intSet(${attrName}, ${value}) ===\n`;
    seal.vars.intSet(ctx, attrName, value);

    response += `=== 设置后 ===\n`;
    const [afterInt, exists] = seal.vars.intGet(ctx, attrName);
    const afterFormat = seal.format(ctx, `{${attrName}}`);
    response += `intGet: ${afterInt} (exists=${exists})\n`;
    response += `format: "${afterFormat}"\n\n`;

    response += '现在请手动执行 .st 命令设置相同的属性，然后用 .knowtest check 查看差异\n';

    seal.replyToSender(ctx, msg, response);
    return seal.ext.newCmdExecuteResult(true);
  }

  // 注册命令
  ext.cmdMap['knowtest'] = cmdInit;

  // 注册扩展
  seal.ext.register(ext);
}