// ==UserScript==
// @name         知识属性冲突测试
// @author       Bug Test
// @version      1.0.0
// @desc         通过自定义规则测试"知识"属性是否有系统级冲突
// ==/UserScript==

// 创建一个测试规则，包含"知识"属性
const TEST_TEMPLATE = {
  setConfig: {
    diceSides: 20,
    enableTip: '已切换至知识测试规则',
    keys: ['test', '测试']
  },

  // 名片模板配置
  nameTemplate: {
    knowtest: {
      template: '{$t玩家_RAW} 力量{力量} 知识{知识} 智慧{智慧}',
      helpText: '知识测试规则名片'
    }
  },

  // 测试属性配置
  attrConfig: {
    top: ['力量', '知识', '智慧'],
    sortBy: 'name',
    ignores: [],
    showAs: {}
  },

  // 默认属性
  defaults: {
    力量: 0,
    知识: 0,    // 关键：这里定义了知识属性
    智慧: 0
  },

  // 属性别名
  alias: {
    力量: ['strength', 'str'],
    知识: ['knowledge', 'knw'],
    智慧: ['wisdom', 'wis']
  }
};

// 注册测试扩展
const testExt = seal.ext.find('知识冲突测试') || seal.ext.new('知识冲突测试', 'Test', '1.0.0');

// 注册测试规则
try {
  seal.gameSystem.newTemplate(JSON.stringify(TEST_TEMPLATE));
  console.log('测试规则注册成功');
} catch (e) {
  console.log('测试规则注册失败:', e);
}

// 测试命令
const cmd = seal.ext.newCmdItemInfo();
cmd.name = 'testknow';
cmd.help = '测试知识属性冲突\n.testknow - 运行测试';

cmd.solve = (ctx, msg, cmdArgs) => {
  let response = '【知识属性系统级冲突测试】\n\n';

  response += '=== 当前状态 ===\n';
  const testAttrs = ['力量', '知识', '智慧'];

  for (const attr of testAttrs) {
    const [intVal, intExists] = seal.vars.intGet(ctx, attr);
    const formatVal = seal.format(ctx, `{${attr}}`);
    response += `${attr}: intGet=${intVal}/${intExists}, format="${formatVal}"\n`;
  }

  response += '\n=== 测试步骤 ===\n';
  response += '1. .set knowtest (切换到知识测试规则)\n';
  response += '3. .st 知识5 (设置知识属性，注意是.st不是.set)\n';
  response += '4. .st 力量5 (设置力量属性，作为对照)\n';
  response += '5. .testknow (再次检查结果)\n\n';

  response += '=== 预期结果 ===\n';
  response += '如果是系统级问题，即使在自定义规则下，\n';
  response += '知识属性仍然会出现 intGet/format 不一致的问题。\n';
  response += '如果只是daggerheart模板问题，则应该正常。';

  seal.replyToSender(ctx, msg, response);
  return seal.ext.newCmdExecuteResult(true);
};

testExt.cmdMap['testknow'] = cmd;
seal.ext.register(testExt);