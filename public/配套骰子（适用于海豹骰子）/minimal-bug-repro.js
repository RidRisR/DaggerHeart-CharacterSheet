// 最小Bug复现脚本
const ext = seal.ext.find('知识属性Bug') || seal.ext.new('知识属性Bug', 'Bug Report', '1.0.0');

const cmd = seal.ext.newCmdItemInfo();
cmd.name = 'bugtest';
cmd.help = 'Bug复现测试\n.bugtest - 演示知识属性问题';

cmd.solve = (ctx, msg, cmdArgs) => {
  let response = '【SealDice "知识"属性Bug复现】\n\n';

  // 测试对比：知识 vs 力量
  const testAttrs = ['知识', '力量'];

  response += '=== 当前属性状态 ===\n';
  for (const attr of testAttrs) {
    const [intVal, intExists] = seal.vars.intGet(ctx, attr);
    const formatVal = seal.format(ctx, `{${attr}}`);
    response += `${attr}: intGet=${intVal}/${intExists}, format="${formatVal}"\n`;
  }

  response += '\n=== 复现步骤（请按顺序执行）===\n';
  response += '1. .st 知识3\n';
  response += '2. .st 力量3\n';
  response += '3. .bugtest（再次运行本命令查看结果）\n\n';

  response += '=== 预期问题 ===\n';
  response += '执行.st后应该看到：\n';
  response += '• 力量：intGet=3/true, format="3" ✓正常\n';
  response += '• 知识：intGet=0/false, format="3" ✗异常\n\n';

  response += '这表明.st命令对"知识"属性有特殊处理，\n';
  response += '只写入format系统，不写入intGet系统。';

  seal.replyToSender(ctx, msg, response);
  return seal.ext.newCmdExecuteResult(true);
};

ext.cmdMap['bugtest'] = cmd;
seal.ext.register(ext);