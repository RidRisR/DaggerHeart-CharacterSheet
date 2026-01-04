/**
 * AI提示词构建器
 *
 * 负责构建发送给AI的提示词
 */

import type { CardPackageState } from '@/app/card-editor/store/card-editor-store'
import { promises as fs } from 'fs'
import path from 'path'

/**
 * AI提示词构建器
 */
export class AIPromptBuilder {
  private guideContent: string | null = null

  /**
   * 获取AI创作指南内容
   */
  private async getGuideContent(): Promise<string> {
    if (this.guideContent) {
      return this.guideContent
    }

    try {
      // 尝试读取AI创作指南文件
      const guidePath = path.join(
        process.cwd(),
        'public/自定义卡包指南和示例/AI-卡包创作指南.md'
      )
      this.guideContent = await fs.readFile(guidePath, 'utf-8')
      return this.guideContent
    } catch (error) {
      console.error('[AIPromptBuilder] 无法读取AI创作指南:', error)
      // 返回简化版指南
      return this.getFallbackGuide()
    }
  }

  /**
   * 后备简化指南
   */
  private getFallbackGuide(): string {
    return `
# DaggerHeart 卡包创作指南 (简化版)

## 核心规则

1. **严格字段映射** - 只使用已定义的字段,不添加额外内容
2. **保持原文** - 100%还原用户文本,不进行创作
3. **标记不确定** - 遇到不确定的内容时,在_warnings中标注
4. **返回位置** - 必须在metadata.processedUpTo中标明处理到第几个字符

## 输出格式

\`\`\`json
{
  "cards": [
    {
      "名称": "...",
      "简介": "...",
      // 其他字段
    }
  ],
  "metadata": {
    "processedUpTo": 1234,
    "lastProcessedText": "最后5-10个字",
    "confidence": "complete"
  },
  "_warnings": [
    {
      "severity": "warning",
      "path": "profession[0].领域1",
      "message": "原文未明确指定领域"
    }
  ]
}
\`\`\`

## 字段约束

- 施法属性: 仅限 力量/敏捷/灵巧/风度/本能/知识/不可施法
- 子职业等级: 仅限 基石/专精/大师
- 数值字段必须是Number类型
- ID格式: 包名-作者-类型-标识
`
  }

  /**
   * 构建系统提示词
   */
  async buildSystemPrompt(): Promise<string> {
    const guideContent = await this.getGuideContent()

    return `你是一个DaggerHeart卡包格式转换助手。你的任务是将用户提供的文本内容转换为严格的JSON格式。

${guideContent}

请严格遵守以上指南,将用户文本转换为JSON格式。`
  }

  /**
   * 构建用户提示词
   */
  async buildUserPrompt(
    textWindow: string,
    packageContext: Partial<CardPackageState>,
    isFirstChunk: boolean,
    position: number,
    totalLength: number
  ): Promise<string> {
    if (isFirstChunk) {
      return this.buildFirstChunkPrompt(textWindow, position, totalLength)
    } else {
      return this.buildSubsequentChunkPrompt(
        textWindow,
        packageContext,
        position,
        totalLength
      )
    }
  }

  /**
   * 构建首次块提示词
   */
  private buildFirstChunkPrompt(
    textWindow: string,
    position: number,
    totalLength: number
  ): string {
    return `
【流式处理说明】
这是一个大文本的流式处理任务。你会分多次收到文本片段。

【关键要求】
你必须在输出中标注: 你处理到了原文的第几个字符。

【输出格式】(严格JSON)
\`\`\`json
{
  "cards": [
    // 转换的卡牌数组
  ],
  "metadata": {
    "processedUpTo": <你处理到原文的第几个字符>,
    "lastProcessedText": "<最后处理的5-10个字>",
    "nextShouldStartFrom": <建议下次从第几个字符开始(可选)>,
    "confidence": "complete" | "partial"
  },
  "_warnings": [
    // 如有不确定的地方,在此标注
  ]
}
\`\`\`

【文本内容】(位置 ${position}-${position + textWindow.length} / ${totalLength})
---
${textWindow}
---

请转换这段文本中的完整卡牌。如果遇到明显被截断的卡牌,停止处理并标记processedUpTo。
`
  }

  /**
   * 构建后续块提示词
   */
  private buildSubsequentChunkPrompt(
    textWindow: string,
    packageContext: Partial<CardPackageState>,
    position: number,
    totalLength: number
  ): string {
    // 提取已识别的customFieldDefinitions
    const contextSummary = this.buildContextSummary(packageContext)

    return `
【继续处理】
你已处理部分文本,现在继续转换剩余内容。

${contextSummary}

【文本内容】(位置 ${position}-${position + textWindow.length} / ${totalLength})
---
${textWindow}
---

继续转换,保持与之前相同的格式和规则。输出格式同前。
`
  }

  /**
   * 构建上下文摘要
   */
  private buildContextSummary(context: Partial<CardPackageState>): string {
    const lines: string[] = []

    // 统计已识别的卡牌数
    const cardCounts = {
      profession: context.profession?.length || 0,
      ancestry: context.ancestry?.length || 0,
      community: context.community?.length || 0,
      subclass: context.subclass?.length || 0,
      domain: context.domain?.length || 0,
      variant: context.variant?.length || 0
    }

    lines.push('【已处理统计】')
    Object.entries(cardCounts).forEach(([type, count]) => {
      if (count > 0) {
        lines.push(`- ${type}: ${count}张`)
      }
    })

    // 列出已识别的customFieldDefinitions
    if (context.customFieldDefinitions) {
      lines.push('\n【已识别的自定义字段】')
      Object.entries(context.customFieldDefinitions).forEach(([key, values]) => {
        if (values && values.length > 0) {
          lines.push(`- ${key}: ${values.slice(0, 5).join(', ')}${values.length > 5 ? '...' : ''}`)
        }
      })
    }

    return lines.join('\n')
  }
}
