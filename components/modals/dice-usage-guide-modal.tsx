"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"

interface DiceUsageGuideModalProps {
  isOpen: boolean
  onClose: () => void
}

export function DiceUsageGuideModal({ isOpen, onClose }: DiceUsageGuideModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            📖 Daggerheart 骰子使用指南
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[calc(90vh-8rem)] pr-4">
          <div className="space-y-8">
            {/* 快速入门 */}
            <section id="quick-start">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                🚀 快速入门
              </h2>
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">1</div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-blue-900 mb-1">开启规则模式</h3>
                      <p className="text-blue-800 text-sm">发送 <code className="bg-blue-100 px-1 rounded">.set dh</code> 切换到 Daggerheart 规则模式。</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">2</div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-blue-900 mb-1">导入角色属性</h3>
                      <p className="text-blue-800 text-sm">在"导出到骰子"弹窗中复制生成的 <code className="bg-blue-100 px-1 rounded">.st</code> 命令，在安装了骰子的群聊中发送，骰子会自动设置你的角色属性。</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">3</div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-blue-900 mb-1">应用名片模板</h3>
                      <p className="text-blue-800 text-sm">发送 <code className="bg-blue-100 px-1 rounded">.sn dh</code> 应用玩家名片模板（显示属性值）。如果你是 GM，使用 <code className="bg-blue-100 px-1 rounded">.gm</code> 命令设置 GM 身份。</p>
                      <p className="text-red-700 text-sm mt-2"><strong>⚠️ 重要：</strong>骰子机器人必须有群管理员权限才能应用名片模板</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">4</div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-blue-900 mb-1">开始游戏！</h3>
                      <p className="text-blue-800 text-sm">使用 <code className="bg-blue-100 px-1 rounded">.dd +敏捷 攀爬</code> 进行第一次检定，使用 <code className="bg-blue-100 px-1 rounded">.dh</code> 查看所有可用命令。</p>
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-blue-200">
                  <div className="space-y-2">
                    <p className="text-sm text-blue-700">💡 <strong>试用骰子：</strong>将卢娜（<code className="bg-blue-100 px-1 rounded">3572397642</code>）拉进你的群聊体验完整功能</p>
                    <p className="text-sm text-blue-700">📝 <strong>设置别名：</strong>使用 <code className="bg-blue-100 px-1 rounded">.nn 角色名</code> 来设置自己的别名，比如 <code className="bg-blue-100 px-1 rounded">.nn 张三</code> 会将名片上你的名称会变成"张三"</p>
                  </div>
                </div>
              </div>
            </section>

            {/* 核心命令详解 */}
            <section id="commands">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                🎲 核心命令详解
              </h2>

              {/* .dh 命令 */}
              <div className="mb-6 border border-gray-200 rounded-lg p-5 bg-white shadow-sm">
                <h3 className="text-lg font-semibold mb-3 text-gray-800">.dh - 查看命令列表</h3>
                <div className="space-y-2 text-sm text-gray-700">
                  <p><strong>用途：</strong>显示所有可用命令的列表和简要说明</p>
                  <div className="bg-gray-50 p-3 rounded border border-gray-200">
                    <code className="text-xs">.dh</code>
                  </div>
                  <p className="text-gray-600">显示命令列表、规则设置说明，以及如何查看详细帮助</p>
                </div>
              </div>

              {/* .dd 命令 */}
              <div className="mb-6 border border-gray-200 rounded-lg p-5 bg-white shadow-sm">
                <h3 className="text-lg font-semibold mb-3 text-gray-800">.dd - 二元骰检定</h3>

                <div className="space-y-3 text-sm">
                  <div>
                    <h4 className="font-medium text-gray-700 mb-1">命令格式</h4>
                    <div className="bg-gray-50 p-3 rounded border border-gray-200">
                      <code className="text-xs">.dd [骰子面数] [修饰符...] [检定原因]</code>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">骰子面数（可选）</h4>
                    <p className="text-gray-600 text-xs mb-2">默认为 12/12（希望骰12面/恐惧骰12面），可使用 n/m 格式自定义</p>
                    <div className="bg-gray-50 border border-gray-200 rounded p-3">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <code className="bg-white px-2 py-1 rounded border border-gray-300">12/20</code>
                          <span className="text-gray-600 ml-2">→ 希望12面，恐惧20面</span>
                        </div>
                        <div>
                          <code className="bg-white px-2 py-1 rounded border border-gray-300">20/</code>
                          <span className="text-gray-600 ml-2">→ 希望20面，恐惧默认12面</span>
                        </div>
                        <div>
                          <code className="bg-white px-2 py-1 rounded border border-gray-300">/20</code>
                          <span className="text-gray-600 ml-2">→ 希望默认12面，恐惧20面</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">修饰符类型</h4>
                    <div className="space-y-2">
                      <div className="bg-green-50 border border-green-200 rounded p-3">
                        <p className="font-medium text-green-800 mb-1">1️⃣ 属性修饰符</p>
                        <p className="text-green-700 text-xs mb-2">+敏捷、+力量、+本能、+知识、+风度、+灵巧</p>
                        <p className="text-green-600 text-xs">支持别名：+agi、+str、+ins、+knw、+pre、+fin</p>
                      </div>

                      <div className="bg-purple-50 border border-purple-200 rounded p-3">
                        <p className="font-medium text-purple-800 mb-1">2️⃣ 经历修饰符（消耗1希望）</p>
                        <p className="text-purple-700 text-xs mb-1">具名经历：+锻造、+魔法学</p>
                        <p className="text-purple-600 text-xs">匿名经历：+经历、+经历3、+exp5（默认+2）</p>
                      </div>

                      <div className="bg-blue-50 border border-blue-200 rounded p-3">
                        <p className="font-medium text-blue-800 mb-1">3️⃣ 优势/劣势骰</p>
                        <p className="text-blue-700 text-xs mb-1">优势：+优势、+2优势、+adv（N个d6取最高）</p>
                        <p className="text-blue-600 text-xs">劣势：-劣势、-2劣势、-dis（N个d6取最低）</p>
                      </div>

                      <div className="bg-orange-50 border border-orange-200 rounded p-3">
                        <p className="font-medium text-orange-800 mb-1">4️⃣ 额外骰子</p>
                        <p className="text-orange-600 text-xs">+2d6、+d8、-3d4（额外投掷骰子）</p>
                      </div>

                      <div className="bg-gray-50 border border-gray-200 rounded p-3">
                        <p className="font-medium text-gray-800 mb-1">5️⃣ 常量修饰符</p>
                        <p className="text-gray-600 text-xs">+3、-2（固定加减值）</p>
                      </div>

                      <div className="bg-pink-50 border border-pink-200 rounded p-3">
                        <p className="font-medium text-pink-800 mb-1">6️⃣ 帮助系统</p>
                        <p className="text-pink-600 text-xs">@Alice、@Bob（请求帮助，消耗对方1希望，获得1优势）</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">完整示例</h4>
                    <div className="space-y-2">
                      <div className="bg-gray-50 p-2 rounded border border-gray-200">
                        <code className="text-xs text-blue-600">.dd +敏捷 攀爬检定</code>
                        <p className="text-xs text-gray-600 mt-1">→ 使用敏捷属性进行攀爬检定</p>
                      </div>
                      <div className="bg-gray-50 p-2 rounded border border-gray-200">
                        <code className="text-xs text-blue-600">.dd @Alice @Bob +力量 推门</code>
                        <p className="text-xs text-gray-600 mt-1">→ Alice和Bob各消耗1希望提供帮助，获得2个优势骰</p>
                      </div>
                      <div className="bg-gray-50 p-2 rounded border border-gray-200">
                        <code className="text-xs text-blue-600">.dd 12/20 +力量+优势 破门</code>
                        <p className="text-xs text-gray-600 mt-1">→ 自定义骰子面数，使用力量+优势</p>
                      </div>
                      <div className="bg-gray-50 p-2 rounded border border-gray-200">
                        <code className="text-xs text-blue-600">.dd +本能+经历3+劣势 复杂行动</code>
                        <p className="text-xs text-gray-600 mt-1">→ 使用本能，消耗1希望获得+3经历，但有劣势</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">检定原因（可选但推荐）</h4>
                    <p className="text-gray-600 text-xs mb-2">在命令最后可以添加任意文本作为检定原因，帮助描述这次检定的目的</p>
                    <div className="bg-gray-50 border border-gray-200 rounded p-3">
                      <div className="space-y-1 text-xs">
                        <div>
                          <code className="bg-white px-2 py-1 rounded border border-gray-300">.dd +敏捷 攀爬峭壁</code>
                          <span className="text-gray-600 ml-2">→ "攀爬峭壁" 是检定原因</span>
                        </div>
                        <div>
                          <code className="bg-white px-2 py-1 rounded border border-gray-300">.dd +风度 说服守卫放行</code>
                          <span className="text-gray-600 ml-2">→ "说服守卫放行" 是检定原因</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-gray-500 text-xs mt-2">💡 检定原因会显示在骰子结果中，让其他玩家清楚你在做什么</p>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">检定结果</h4>
                    <ul className="list-disc list-inside space-y-1 text-gray-600 ml-2 text-xs">
                      <li><strong className="text-yellow-600">关键成功：</strong>希望=恐惧 → 希望+1，压力-1</li>
                      <li><strong className="text-green-600">希望结果：</strong>希望&gt;恐惧 → 希望+1</li>
                      <li><strong className="text-red-600">恐惧结果：</strong>希望&lt;恐惧 → GM恐惧+1</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* .ddr 命令 */}
              <div className="mb-6 border border-gray-200 rounded-lg p-5 bg-white shadow-sm">
                <h3 className="text-lg font-semibold mb-3 text-gray-800">.ddr - 反应检定</h3>
                <div className="space-y-2 text-sm text-gray-700">
                  <p><strong>用途：</strong>反应二元骰，仅消耗希望不获得希望（用于反应性检定）</p>
                  <p className="text-gray-600">语法与 .dd 完全相同，但结果不会更新希望、压力、恐惧等属性</p>
                  <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mt-2">
                    <p className="text-xs text-yellow-800"><strong>⚠️ 与 .dd 的区别：</strong></p>
                    <ul className="list-disc list-inside text-xs text-yellow-700 mt-1 ml-2">
                      <li>.dd：会根据结果更新希望/压力/恐惧</li>
                      <li>.ddr：仅消耗希望（使用经历时），不获得希望</li>
                    </ul>
                  </div>
                  <div className="bg-gray-50 p-3 rounded border border-gray-200 mt-2">
                    <code className="text-xs">.ddr +敏捷 闪避攻击</code>
                  </div>
                </div>
              </div>

              {/* .gm 命令 */}
              <div className="mb-6 border border-gray-200 rounded-lg p-5 bg-white shadow-sm">
                <h3 className="text-lg font-semibold mb-3 text-gray-800">.gm - GM管理</h3>
                <div className="space-y-2 text-sm text-gray-700">
                  <div>
                    <h4 className="font-medium text-gray-700 mb-1">设置GM身份</h4>
                    <div className="bg-gray-50 p-3 rounded border border-gray-200">
                      <code className="text-xs">.gm</code>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">设置当前用户为此群的GM，并应用GM恐惧值名片</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-700 mb-1">卸任GM</h4>
                    <div className="bg-gray-50 p-3 rounded border border-gray-200">
                      <code className="text-xs">.gm clear</code>
                    </div>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded p-3 mt-2">
                    <p className="text-xs text-red-800"><strong>❗ 重要提示：</strong></p>
                    <ul className="list-disc list-inside text-xs text-red-700 mt-1 ml-2">
                      <li>必须使用 .gm 命令设置GM，不要使用 .sn gm</li>
                      <li>GM恐惧值初始为0/12</li>
                      <li>当有人投出恐惧结果时，GM恐惧值自动+1并更新名片</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* .cook 命令 */}
              <div className="mb-6 border border-gray-200 rounded-lg p-5 bg-white shadow-sm">
                <h3 className="text-lg font-semibold mb-3 text-gray-800">.cook - 烹饪小游戏</h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <h4 className="font-medium text-gray-700 mb-1">游戏规则</h4>
                    <ul className="list-disc list-inside space-y-1 text-gray-600 ml-2 text-xs">
                      <li>投掷所有骰子，相同点数的骰子可以两两配对</li>
                      <li>配对成功得分 = 骰子点数（如两个5配对得5分）</li>
                      <li>未配对的骰子可以移除一个，剩余骰子重新投掷</li>
                      <li>剩余≤2个骰子时游戏结束</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">命令格式</h4>
                    <div className="space-y-2">
                      <div className="bg-gray-50 p-2 rounded border border-gray-200">
                        <code className="text-xs text-blue-600">.cook 3d6+6d2</code>
                        <p className="text-xs text-gray-600 mt-1">→ 投3个d6和6个d2开始游戏</p>
                      </div>
                      <div className="bg-gray-50 p-2 rounded border border-gray-200">
                        <code className="text-xs text-blue-600">.cook 6</code>
                        <p className="text-xs text-gray-600 mt-1">→ 移除一个d6并重新投掷剩余骰子（推荐）</p>
                      </div>
                      <div className="bg-gray-50 p-2 rounded border border-gray-200">
                        <code className="text-xs text-blue-600">.cook rm 6</code>
                        <p className="text-xs text-gray-600 mt-1">→ 效果同上（兼容旧语法）</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* .dhalias 命令 */}
              <div className="mb-6 border border-gray-200 rounded-lg p-5 bg-white shadow-sm">
                <h3 className="text-lg font-semibold mb-3 text-gray-800">.dhalias - 查询别名</h3>
                <div className="space-y-2 text-sm text-gray-700">
                  <p><strong>用途：</strong>查询属性关键词的所有有效别名</p>
                  <div className="bg-gray-50 p-3 rounded border border-gray-200">
                    <code className="text-xs">.dhalias 敏捷</code>
                    <p className="text-xs text-gray-600 mt-1">→ 显示"敏捷"的所有别名：agility, agi, 敏, mj</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded border border-gray-200">
                    <code className="text-xs">.dhalias</code>
                    <p className="text-xs text-gray-600 mt-1">→ 显示所有可查询的关键词</p>
                  </div>
                </div>
              </div>

              {/* .test 命令 */}
              <div className="mb-6 border border-gray-200 rounded-lg p-5 bg-white shadow-sm">
                <h3 className="text-lg font-semibold mb-3 text-gray-800">.test - 测试命令</h3>
                <div className="space-y-2 text-sm text-gray-700">
                  <p><strong>用途：</strong>指定骰子点数进行测试，验证不同结果的效果</p>
                  <div className="space-y-2">
                    <div className="bg-gray-50 p-2 rounded border border-gray-200">
                      <code className="text-xs text-blue-600">.test 12 12</code>
                      <p className="text-xs text-gray-600 mt-1">→ 测试关键成功（希望+1，压力-1）</p>
                    </div>
                    <div className="bg-gray-50 p-2 rounded border border-gray-200">
                      <code className="text-xs text-blue-600">.test -r 10 5</code>
                      <p className="text-xs text-gray-600 mt-1">→ 测试反应掷骰（不获得希望）</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* 高级技巧 */}
            <section id="advanced">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                🔧 高级技巧
              </h2>

              <div className="space-y-4">
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-5">
                  <h3 className="font-semibold text-purple-900 mb-3">复合修饰符</h3>
                  <p className="text-purple-800 text-sm mb-2">可以用+号连接多个修饰符，创建复杂的检定：</p>
                  <div className="bg-white/50 p-3 rounded border border-purple-200">
                    <code className="text-xs text-purple-600">.dd +敏捷+优势+2 跳跃</code>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-green-50 to-teal-50 border border-green-200 rounded-lg p-5">
                  <h3 className="font-semibold text-green-900 mb-3">属性别名速查</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-green-100/50 border-b-2 border-green-300">
                          <th className="text-left py-2 px-3 font-semibold text-green-900">属性名</th>
                          <th className="text-left py-2 px-3 font-semibold text-green-900">英文别名</th>
                          <th className="text-left py-2 px-3 font-semibold text-green-900">拼音缩写</th>
                          <th className="text-left py-2 px-3 font-semibold text-green-900">中文简写</th>
                        </tr>
                      </thead>
                      <tbody className="text-green-800">
                        <tr className="border-b border-green-200">
                          <td className="py-2 px-3 font-medium">敏捷</td>
                          <td className="py-2 px-3"><code className="bg-green-100 px-1 rounded text-xs">agility</code>, <code className="bg-green-100 px-1 rounded text-xs">agi</code></td>
                          <td className="py-2 px-3"><code className="bg-green-100 px-1 rounded text-xs">mj</code></td>
                          <td className="py-2 px-3"><code className="bg-green-100 px-1 rounded text-xs">敏</code></td>
                        </tr>
                        <tr className="border-b border-green-200">
                          <td className="py-2 px-3 font-medium">力量</td>
                          <td className="py-2 px-3"><code className="bg-green-100 px-1 rounded text-xs">strength</code>, <code className="bg-green-100 px-1 rounded text-xs">str</code></td>
                          <td className="py-2 px-3"><code className="bg-green-100 px-1 rounded text-xs">ll</code></td>
                          <td className="py-2 px-3"><code className="bg-green-100 px-1 rounded text-xs">力</code></td>
                        </tr>
                        <tr className="border-b border-green-200">
                          <td className="py-2 px-3 font-medium">本能</td>
                          <td className="py-2 px-3"><code className="bg-green-100 px-1 rounded text-xs">instinct</code>, <code className="bg-green-100 px-1 rounded text-xs">ins</code></td>
                          <td className="py-2 px-3"><code className="bg-green-100 px-1 rounded text-xs">bn</code></td>
                          <td className="py-2 px-3"><code className="bg-green-100 px-1 rounded text-xs">本</code></td>
                        </tr>
                        <tr className="border-b border-green-200">
                          <td className="py-2 px-3 font-medium">知识</td>
                          <td className="py-2 px-3"><code className="bg-green-100 px-1 rounded text-xs">knowledge</code>, <code className="bg-green-100 px-1 rounded text-xs">knw</code></td>
                          <td className="py-2 px-3"><code className="bg-green-100 px-1 rounded text-xs">zs</code></td>
                          <td className="py-2 px-3"><code className="bg-green-100 px-1 rounded text-xs">智</code>, <code className="bg-green-100 px-1 rounded text-xs">知</code></td>
                        </tr>
                        <tr className="border-b border-green-200">
                          <td className="py-2 px-3 font-medium">风度</td>
                          <td className="py-2 px-3"><code className="bg-green-100 px-1 rounded text-xs">presence</code>, <code className="bg-green-100 px-1 rounded text-xs">pre</code></td>
                          <td className="py-2 px-3"><code className="bg-green-100 px-1 rounded text-xs">fd</code></td>
                          <td className="py-2 px-3"><code className="bg-green-100 px-1 rounded text-xs">魅</code>, <code className="bg-green-100 px-1 rounded text-xs">风</code></td>
                        </tr>
                        <tr className="border-b border-green-200">
                          <td className="py-2 px-3 font-medium">灵巧</td>
                          <td className="py-2 px-3"><code className="bg-green-100 px-1 rounded text-xs">finesse</code>, <code className="bg-green-100 px-1 rounded text-xs">fin</code></td>
                          <td className="py-2 px-3"><code className="bg-green-100 px-1 rounded text-xs">lq</code></td>
                          <td className="py-2 px-3"><code className="bg-green-100 px-1 rounded text-xs">巧</code>, <code className="bg-green-100 px-1 rounded text-xs">灵</code></td>
                        </tr>
                        <tr className="border-b border-green-200">
                          <td className="py-2 px-3 font-medium">生命</td>
                          <td className="py-2 px-3"><code className="bg-green-100 px-1 rounded text-xs">health</code>, <code className="bg-green-100 px-1 rounded text-xs">hp</code></td>
                          <td className="py-2 px-3"><code className="bg-green-100 px-1 rounded text-xs">sm</code></td>
                          <td className="py-2 px-3"><code className="bg-green-100 px-1 rounded text-xs">生命值</code>, <code className="bg-green-100 px-1 rounded text-xs">血量</code>, <code className="bg-green-100 px-1 rounded text-xs">血</code>, <code className="bg-green-100 px-1 rounded text-xs">命</code></td>
                        </tr>
                        <tr className="border-b border-green-200">
                          <td className="py-2 px-3 font-medium">生命上限</td>
                          <td className="py-2 px-3"><code className="bg-green-100 px-1 rounded text-xs">hpmax</code>, <code className="bg-green-100 px-1 rounded text-xs">maxhp</code></td>
                          <td className="py-2 px-3"><code className="bg-green-100 px-1 rounded text-xs">smsx</code></td>
                          <td className="py-2 px-3"><code className="bg-green-100 px-1 rounded text-xs">生命值上限</code>, <code className="bg-green-100 px-1 rounded text-xs">血量上限</code></td>
                        </tr>
                        <tr className="border-b border-green-200">
                          <td className="py-2 px-3 font-medium">压力</td>
                          <td className="py-2 px-3"><code className="bg-green-100 px-1 rounded text-xs">stress</code>, <code className="bg-green-100 px-1 rounded text-xs">s</code></td>
                          <td className="py-2 px-3"><code className="bg-green-100 px-1 rounded text-xs">yl</code></td>
                          <td className="py-2 px-3"><code className="bg-green-100 px-1 rounded text-xs">压力值</code></td>
                        </tr>
                        <tr className="border-b border-green-200">
                          <td className="py-2 px-3 font-medium">压力上限</td>
                          <td className="py-2 px-3"><code className="bg-green-100 px-1 rounded text-xs">stressmax</code>, <code className="bg-green-100 px-1 rounded text-xs">maxstress</code>, <code className="bg-green-100 px-1 rounded text-xs">maxs</code></td>
                          <td className="py-2 px-3"><code className="bg-green-100 px-1 rounded text-xs">ylsx</code></td>
                          <td className="py-2 px-3"><code className="bg-green-100 px-1 rounded text-xs">压力上限值</code></td>
                        </tr>
                        <tr className="border-b border-green-200">
                          <td className="py-2 px-3 font-medium">希望</td>
                          <td className="py-2 px-3"><code className="bg-green-100 px-1 rounded text-xs">hope</code>, <code className="bg-green-100 px-1 rounded text-xs">h</code></td>
                          <td className="py-2 px-3"><code className="bg-green-100 px-1 rounded text-xs">xw</code></td>
                          <td className="py-2 px-3"><code className="bg-green-100 px-1 rounded text-xs">希望值</code></td>
                        </tr>
                        <tr className="border-b border-green-200">
                          <td className="py-2 px-3 font-medium">希望上限</td>
                          <td className="py-2 px-3"><code className="bg-green-100 px-1 rounded text-xs">hopemax</code>, <code className="bg-green-100 px-1 rounded text-xs">maxhope</code>, <code className="bg-green-100 px-1 rounded text-xs">maxh</code></td>
                          <td className="py-2 px-3"><code className="bg-green-100 px-1 rounded text-xs">xwsx</code></td>
                          <td className="py-2 px-3"><code className="bg-green-100 px-1 rounded text-xs">希望上限值</code></td>
                        </tr>
                        <tr className="border-b border-green-200">
                          <td className="py-2 px-3 font-medium">护甲</td>
                          <td className="py-2 px-3"><code className="bg-green-100 px-1 rounded text-xs">armor</code>, <code className="bg-green-100 px-1 rounded text-xs">armour</code>, <code className="bg-green-100 px-1 rounded text-xs">a</code></td>
                          <td className="py-2 px-3"><code className="bg-green-100 px-1 rounded text-xs">hj</code></td>
                          <td className="py-2 px-3"><code className="bg-green-100 px-1 rounded text-xs">防御</code></td>
                        </tr>
                        <tr className="border-b border-green-200">
                          <td className="py-2 px-3 font-medium">护甲上限</td>
                          <td className="py-2 px-3"><code className="bg-green-100 px-1 rounded text-xs">armormax</code>, <code className="bg-green-100 px-1 rounded text-xs">maxarmor</code>, <code className="bg-green-100 px-1 rounded text-xs">maxa</code></td>
                          <td className="py-2 px-3"><code className="bg-green-100 px-1 rounded text-xs">hjsx</code></td>
                          <td className="py-2 px-3"><code className="bg-green-100 px-1 rounded text-xs">防御上限</code></td>
                        </tr>
                        <tr className="border-b border-green-200">
                          <td className="py-2 px-3 font-medium">恐惧</td>
                          <td className="py-2 px-3"><code className="bg-green-100 px-1 rounded text-xs">fear</code>, <code className="bg-green-100 px-1 rounded text-xs">f</code></td>
                          <td className="py-2 px-3"><code className="bg-green-100 px-1 rounded text-xs">kj</code></td>
                          <td className="py-2 px-3"><code className="bg-green-100 px-1 rounded text-xs">恐惧值</code></td>
                        </tr>
                        <tr className="border-b border-green-200">
                          <td className="py-2 px-3 font-medium">恐惧上限</td>
                          <td className="py-2 px-3"><code className="bg-green-100 px-1 rounded text-xs">fearmax</code>, <code className="bg-green-100 px-1 rounded text-xs">maxfear</code>, <code className="bg-green-100 px-1 rounded text-xs">maxf</code></td>
                          <td className="py-2 px-3"><code className="bg-green-100 px-1 rounded text-xs">kjsx</code></td>
                          <td className="py-2 px-3"><code className="bg-green-100 px-1 rounded text-xs">恐惧上限值</code></td>
                        </tr>
                        <tr className="border-b border-green-200">
                          <td className="py-2 px-3 font-medium">闪避</td>
                          <td className="py-2 px-3"><code className="bg-green-100 px-1 rounded text-xs">evasion</code>, <code className="bg-green-100 px-1 rounded text-xs">e</code></td>
                          <td className="py-2 px-3"><code className="bg-green-100 px-1 rounded text-xs">sb</code></td>
                          <td className="py-2 px-3"><code className="bg-green-100 px-1 rounded text-xs">回避</code>, <code className="bg-green-100 px-1 rounded text-xs">闪</code>, <code className="bg-green-100 px-1 rounded text-xs">避</code></td>
                        </tr>
                        <tr className="border-b border-green-200">
                          <td className="py-2 px-3 font-medium">阈值</td>
                          <td className="py-2 px-3"><code className="bg-green-100 px-1 rounded text-xs">major</code>, <code className="bg-green-100 px-1 rounded text-xs">majorthreshold</code>, <code className="bg-green-100 px-1 rounded text-xs">mjr</code></td>
                          <td className="py-2 px-3"><code className="bg-green-100 px-1 rounded text-xs">zsyz</code></td>
                          <td className="py-2 px-3"><code className="bg-green-100 px-1 rounded text-xs">重伤阈值</code>, <code className="bg-green-100 px-1 rounded text-xs">重伤</code>, <code className="bg-green-100 px-1 rounded text-xs">阈值一</code></td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-medium">严重阈值</td>
                          <td className="py-2 px-3"><code className="bg-green-100 px-1 rounded text-xs">severe</code>, <code className="bg-green-100 px-1 rounded text-xs">severethreshold</code>, <code className="bg-green-100 px-1 rounded text-xs">svr</code></td>
                          <td className="py-2 px-3"><code className="bg-green-100 px-1 rounded text-xs">yzyz</code></td>
                          <td className="py-2 px-3"><code className="bg-green-100 px-1 rounded text-xs">严重阈值</code>, <code className="bg-green-100 px-1 rounded text-xs">严重</code>, <code className="bg-green-100 px-1 rounded text-xs">阈值二</code></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p className="text-green-700 text-xs mt-3">使用 <code className="bg-green-100 px-1 rounded">.dhalias [属性名]</code> 查询所有别名</p>
                </div>

                <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-lg p-5">
                  <h3 className="font-semibold text-orange-900 mb-3">团队协作检定</h3>
                  <p className="text-orange-800 text-sm mb-2">多人协助时，每个帮助者提供1个优势骰：</p>
                  <div className="bg-white/50 p-3 rounded border border-orange-200">
                    <code className="text-xs text-orange-600">.dd @战士 @法师 +风度 说服守卫</code>
                    <p className="text-xs text-orange-700 mt-1">→ 两位队友协助，获得2个优势骰，各消耗1希望</p>
                  </div>
                </div>
              </div>
            </section>

            {/* 常见示例 */}
            <section id="examples">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                💡 常见示例
              </h2>

              <div className="space-y-4">
                <div className="border border-gray-200 rounded-lg p-4 bg-white">
                  <h3 className="font-semibold text-gray-800 mb-2">⚔️ 战斗场景</h3>
                  <div className="space-y-2 text-sm">
                    <div className="bg-gray-50 p-2 rounded">
                      <code className="text-xs text-blue-600">.dd +敏捷 闪避攻击</code>
                      <p className="text-xs text-gray-600 mt-1">基础闪避检定</p>
                    </div>
                    <div className="bg-gray-50 p-2 rounded">
                      <code className="text-xs text-blue-600">.dd +力量+优势 猛力攻击</code>
                      <p className="text-xs text-gray-600 mt-1">使用优势的力量攻击</p>
                    </div>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg p-4 bg-white">
                  <h3 className="font-semibold text-gray-800 mb-2">🗣️ 社交场景</h3>
                  <div className="space-y-2 text-sm">
                    <div className="bg-gray-50 p-2 rounded">
                      <code className="text-xs text-blue-600">.dd +风度+经历 说服贵族</code>
                      <p className="text-xs text-gray-600 mt-1">使用风度和社交经历</p>
                    </div>
                    <div className="bg-gray-50 p-2 rounded">
                      <code className="text-xs text-blue-600">.dd @盗贼 +风度 欺骗守卫</code>
                      <p className="text-xs text-gray-600 mt-1">队友协助的欺骗检定</p>
                    </div>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg p-4 bg-white">
                  <h3 className="font-semibold text-gray-800 mb-2">🔍 探索场景</h3>
                  <div className="space-y-2 text-sm">
                    <div className="bg-gray-50 p-2 rounded">
                      <code className="text-xs text-blue-600">.dd +知识 辨识魔法</code>
                      <p className="text-xs text-gray-600 mt-1">使用知识识别魔法物品</p>
                    </div>
                    <div className="bg-gray-50 p-2 rounded">
                      <code className="text-xs text-blue-600">.dd +本能+优势 察觉陷阱</code>
                      <p className="text-xs text-gray-600 mt-1">谨慎察觉，带优势</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* 常见问题 */}
            <section id="faq">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                ❓ 常见问题
              </h2>

              <div className="space-y-3">
                <div className="border border-gray-200 rounded-lg p-4 bg-white">
                  <h3 className="font-semibold text-gray-800 mb-2 text-sm">Q: 属性导入后显示不正确？</h3>
                  <p className="text-sm text-gray-600">A: 使用 <code className="bg-gray-100 px-1 rounded text-xs">.st show</code> 查看当前属性，使用 <code className="bg-gray-100 px-1 rounded text-xs">.sn dh</code> 重新应用名片模板。</p>
                </div>

                <div className="border border-gray-200 rounded-lg p-4 bg-white">
                  <h3 className="font-semibold text-gray-800 mb-2 text-sm">Q: 名片模板无法应用怎么办？</h3>
                  <p className="text-sm text-gray-600">A: <code className="bg-gray-100 px-1 rounded text-xs">.sn dh</code> 和 <code className="bg-gray-100 px-1 rounded text-xs">.gm</code> 命令需要<strong>骰子机器人有群管理员权限</strong>才能应用名片模板。请确保已将骰子机器人设置为群管理员。</p>
                </div>

                <div className="border border-gray-200 rounded-lg p-4 bg-white">
                  <h3 className="font-semibold text-gray-800 mb-2 text-sm">Q: GM恐惧值如何工作？</h3>
                  <p className="text-sm text-gray-600">A: 使用 <code className="bg-gray-100 px-1 rounded text-xs">.gm</code> 设置GM身份后，当玩家投出恐惧结果（恐惧骰高于希望骰）时，GM的恐惧值会自动+1并更新名片显示。</p>
                </div>

                <div className="border border-gray-200 rounded-lg p-4 bg-white">
                  <h3 className="font-semibold text-gray-800 mb-2 text-sm">Q: 如何取消帮助请求？</h3>
                  <p className="text-sm text-gray-600">A: 帮助请求（@玩家名）发出后立即生效并消耗希望值，无法取消，请在使用前确认。</p>
                </div>

                <div className="border border-gray-200 rounded-lg p-4 bg-white">
                  <h3 className="font-semibold text-gray-800 mb-2 text-sm">Q: 经历值消耗了但忘记用怎么办？</h3>
                  <p className="text-sm text-gray-600">A: 经历修饰符会自动消耗1点希望，建议在使用经历前先确认希望值是否足够。如果误用，可以手动使用 <code className="bg-gray-100 px-1 rounded text-xs">.st 希望 [值]</code> 调整。</p>
                </div>

                <div className="border border-gray-200 rounded-lg p-4 bg-white">
                  <h3 className="font-semibold text-gray-800 mb-2 text-sm">Q: .dd 和 .ddr 有什么区别？</h3>
                  <p className="text-sm text-gray-600">A: <strong>.dd</strong> 是标准检定，会根据结果更新希望/压力/恐惧；<strong>.ddr</strong> 是反应检定，只在使用经历时消耗希望，不会获得希望或更新其他属性。</p>
                </div>

                <div className="border border-gray-200 rounded-lg p-4 bg-white">
                  <h3 className="font-semibold text-gray-800 mb-2 text-sm">Q: 如何查看详细的命令帮助？</h3>
                  <p className="text-sm text-gray-600">A: 使用 <code className="bg-gray-100 px-1 rounded text-xs">.help [命令名]</code> 查看具体命令的详细帮助，例如 <code className="bg-gray-100 px-1 rounded text-xs">.help dd</code> 查看 dd 命令的完整说明。</p>
                </div>
              </div>
            </section>

            {/* 版本信息 */}
            <section className="border-t pt-6 mt-8">
              <div className="text-center text-sm text-gray-500">
                <p>📦 骰子插件版本：v2.3.0</p>
              </div>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
