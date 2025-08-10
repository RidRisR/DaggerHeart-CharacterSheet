"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { exportToSealDice, validateSealDiceFormat } from "@/lib/seal-dice-exporter"
import { SheetData } from "@/lib/sheet-data"

interface SealDiceExportModalProps {
  isOpen: boolean
  onClose: () => void
  sheetData: SheetData
}

export function SealDiceExportModal({ isOpen, onClose, sheetData }: SealDiceExportModalProps) {
  const [copySuccess, setCopySuccess] = useState(false)

  // 生成导出字符串
  const exportString = exportToSealDice(sheetData)
  const isValidFormat = validateSealDiceFormat(exportString)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(exportString)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (error) {
      console.error('复制失败:', error)
      // 降级处理：选择文本
      const textarea = document.getElementById('qq-dice-export-textarea') as HTMLTextAreaElement
      if (textarea) {
        textarea.select()
        document.execCommand('copy')
        setCopySuccess(true)
        setTimeout(() => setCopySuccess(false), 2000)
      }
    }
  }

  const handleTextareaClick = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    const textarea = e.target as HTMLTextAreaElement
    textarea.select()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            🎲 导出到骰子
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-sm text-gray-600">
            <p>以下是适用于自动骰子的 .st 命令，复制并在群聊中发送即可导入角色属性：</p>
          </div>

          <div className="space-y-2">
            <Textarea
              id="qq-dice-export-textarea"
              value={exportString}
              readOnly
              onClick={handleTextareaClick}
              className="font-mono text-sm min-h-[200px] resize-none cursor-pointer hover:bg-gray-50 transition-colors"
              placeholder="生成的导出内容将显示在这里..."
            />

            {/* 复制按钮 */}
            <div className="flex justify-center">
              <Button
                onClick={handleCopy}
                className="px-6 py-2"
                variant={copySuccess ? "default" : "outline"}
              >
                {copySuccess ? "✓ 已复制到剪贴板" : "📋 复制命令"}
              </Button>
            </div>
          </div>

          {/* 状态指示 */}
          <div className="flex items-center gap-2 text-sm">
            <div className={`w-2 h-2 rounded-full ${isValidFormat ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className={isValidFormat ? 'text-green-600' : 'text-red-600'}>
              {isValidFormat ? '格式验证通过' : '格式验证失败'}
            </span>
          </div>

          {/* 使用说明 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
            <h4 className="font-medium text-blue-900 mb-2">使用说明：</h4>
            <ol className="list-decimal list-inside space-y-1 text-blue-800">
              <li>复制上方的完整命令</li>
              <li>在安装了骰子脚本的群聊中发送,骰子会自动设置你的角色属性（你可以试用 卢娜：3572397642）</li>
              <li>可以使用 <code className="bg-blue-100 px-1 rounded">.set dh</code> 开启dh规则模式</li>
              <li>使用 <code className="bg-blue-100 px-1 rounded">.sn dh</code> 应用Daggerheart名片模板（可能需要管理权限）</li>
              <li>如果你是GM，使用 <code className="bg-blue-100 px-1 rounded">.gm</code> 设置为GM身份</li>
              <li>随时使用 <code className="bg-blue-100 px-1 rounded">.dh</code> 来查看骰子的完整功能</li>
              <li>使用 <code className="bg-blue-100 px-1 rounded">.help [命令名称]</code> 来查看具体命令的帮助，如 <code className="bg-blue-100 px-1 rounded">.help dd</code></li>
            </ol>
          </div>

          {/* 属性说明 */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm">
            <h4 className="font-medium text-gray-900 mb-2">导出的属性包括：</h4>
            <div className="grid grid-cols-2 gap-2 text-gray-700">
              <div>
                <strong>基础属性：</strong>敏捷、力量、本能、知识、风度、灵巧
              </div>
              <div>
                <strong>状态值：</strong>生命、压力、希望、护甲、恐惧、闪避
              </div>
              <div>
                <strong>阈值：</strong>重伤阈值、严重阈值
              </div>
              <div>
                <strong>经历：</strong>所有填写的经历及其数值
              </div>
            </div>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  )
}