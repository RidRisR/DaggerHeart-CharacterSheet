'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import type { ProfessionCard } from '@/card/profession-card/convert'
import type { AncestryCard } from '@/card/ancestry-card/convert'
import type { CommunityCard } from '@/card/community-card/convert'
import type { SubClassCard } from '@/card/subclass-card/convert'
import type { DomainCard } from '@/card/domain-card/convert'
import type { RawVariantCard } from '@/card/variant-card/convert'

// 通用卡牌预览属性
interface BaseCardPreviewProps<T> {
  card: T
  className?: string
}

// Markdown渲染组件
function MarkdownContent({ content }: { content: string }) {
  if (!content) return <span className="text-muted-foreground">暂无内容</span>
  
  return (
    <div className="prose prose-sm max-w-none prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-em:text-foreground">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={{
          // 自定义渲染组件以匹配卡牌样式
          strong: ({ children }) => <span className="font-bold text-foreground">{children}</span>,
          em: ({ children }) => <span className="italic text-foreground">{children}</span>,
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          ul: ({ children }) => <ul className="list-disc list-inside mb-2">{children}</ul>,
          li: ({ children }) => <li className="mb-1">{children}</li>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

// 职业卡牌预览
export function ProfessionCardPreview({ card, className }: BaseCardPreviewProps<ProfessionCard>) {
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{card.名称 || '职业名称'}</CardTitle>
          <Badge variant="secondary">职业</Badge>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="text-xs">
            {card.领域1 || '领域1'} | {card.领域2 || '领域2'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="text-sm font-medium mb-1">简介</h4>
          <div className="text-sm">
            <MarkdownContent content={card.简介 || ''} />
          </div>
        </div>
        
        <Separator />
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">起始生命:</span> {card.起始生命 || 0}
          </div>
          <div>
            <span className="font-medium">起始闪避:</span> {card.起始闪避 || 0}
          </div>
        </div>
        
        <div>
          <h4 className="text-sm font-medium mb-1">起始物品</h4>
          <p className="text-sm text-muted-foreground">
            {card.起始物品 || '暂无起始物品'}
          </p>
        </div>
        
        <Separator />
        
        <div>
          <h4 className="text-sm font-medium mb-2">希望特性</h4>
          <div className="text-sm">
            <MarkdownContent content={card.希望特性 || ''} />
          </div>
        </div>
        
        <div>
          <h4 className="text-sm font-medium mb-2">职业特性</h4>
          <div className="text-sm">
            <MarkdownContent content={card.职业特性 || ''} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// 种族卡牌预览
export function AncestryCardPreview({ card, className }: BaseCardPreviewProps<AncestryCard>) {
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{card.名称 || '能力名称'}</CardTitle>
          <div className="flex gap-2">
            <Badge variant="secondary">种族</Badge>
            <Badge variant="outline" className="text-xs">
              类别 {card.类别 || 1}
            </Badge>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          种族: {card.种族 || '种族名'}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="text-sm font-medium mb-1">种族简介</h4>
          <div className="text-sm">
            <MarkdownContent content={card.简介 || ''} />
          </div>
        </div>
        
        <Separator />
        
        <div>
          <h4 className="text-sm font-medium mb-2">能力效果</h4>
          <div className="text-sm">
            <MarkdownContent content={card.效果 || ''} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// 社群卡牌预览
export function CommunityCardPreview({ card, className }: BaseCardPreviewProps<CommunityCard>) {
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{card.名称 || '社群名称'}</CardTitle>
          <Badge variant="secondary">社群</Badge>
        </div>
        <div className="text-sm text-muted-foreground">
          特性: {card.特性 || '社群特性'}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="text-sm font-medium mb-1">简介</h4>
          <div className="text-sm">
            <MarkdownContent content={card.简介 || ''} />
          </div>
        </div>
        
        <Separator />
        
        <div>
          <h4 className="text-sm font-medium mb-2">社群描述</h4>
          <div className="text-sm">
            <MarkdownContent content={card.描述 || ''} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// 子职业卡牌预览
export function SubclassCardPreview({ card, className }: BaseCardPreviewProps<SubClassCard>) {
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{card.名称 || '子职业名称'}</CardTitle>
          <div className="flex gap-2">
            <Badge variant="secondary">子职业</Badge>
            <Badge variant="outline" className="text-xs">
              {card.等级 || '未知'}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2 text-sm text-muted-foreground">
          <span>主职: {card.主职 || '未知'}</span>
          <span>•</span>
          <span>施法: {card.施法 || '未知'}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="text-sm font-medium mb-2">子职业描述</h4>
          <div className="text-sm">
            <MarkdownContent content={card.描述 || ''} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// 领域卡牌预览
export function DomainCardPreview({ card, className }: BaseCardPreviewProps<DomainCard>) {
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{card.名称 || '法术名称'}</CardTitle>
          <div className="flex gap-2">
            <Badge variant="secondary">领域</Badge>
            <Badge variant="outline" className="text-xs">
              等级 {card.等级 || 1}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2 text-sm text-muted-foreground">
          <span>领域: {card.领域 || '未知'}</span>
          <span>•</span>
          <span>回想: {card.回想 || 0}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="text-sm font-medium mb-2">卡牌描述</h4>
          <div className="text-sm">
            <MarkdownContent content={card.描述 || ''} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// 变体卡牌预览
export function VariantCardPreview({ card, className }: BaseCardPreviewProps<RawVariantCard>) {
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{card.名称 || '卡牌名称'}</CardTitle>
          <div className="flex gap-2">
            <Badge variant="secondary">{card.类型 || '变体'}</Badge>
            {card.等级 && (
              <Badge variant="outline" className="text-xs">
                等级 {card.等级}
              </Badge>
            )}
          </div>
        </div>
        {card.子类别 && (
          <div className="text-sm text-muted-foreground">
            子类别: {card.子类别}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="text-sm font-medium mb-2">效果</h4>
          <div className="text-sm">
            <MarkdownContent content={card.效果 || ''} />
          </div>
        </div>
        
        {card.简略信息 && (card.简略信息.item1 || card.简略信息.item2 || card.简略信息.item3) && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-medium mb-2">简略信息</h4>
              <div className="flex flex-wrap gap-1">
                {card.简略信息.item1 && (
                  <Badge variant="outline" className="text-xs">
                    {card.简略信息.item1}
                  </Badge>
                )}
                {card.简略信息.item2 && (
                  <Badge variant="outline" className="text-xs">
                    {card.简略信息.item2}
                  </Badge>
                )}
                {card.简略信息.item3 && (
                  <Badge variant="outline" className="text-xs">
                    {card.简略信息.item3}
                  </Badge>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

// 通用卡牌预览组件，自动识别卡牌类型
export function CardPreview({ card, cardType, className }: {
  card: unknown
  cardType: string
  className?: string
}) {
  switch (cardType) {
    case 'profession':
      return <ProfessionCardPreview card={card as ProfessionCard} className={className} />
    case 'ancestry':
      return <AncestryCardPreview card={card as AncestryCard} className={className} />
    case 'community':
      return <CommunityCardPreview card={card as CommunityCard} className={className} />
    case 'subclass':
      return <SubclassCardPreview card={card as SubClassCard} className={className} />
    case 'domain':
      return <DomainCardPreview card={card as DomainCard} className={className} />
    case 'variant':
      return <VariantCardPreview card={card as RawVariantCard} className={className} />
    default:
      return (
        <Card className={className}>
          <CardContent className="p-6">
            <div className="text-center text-muted-foreground">
              不支持的卡牌类型: {cardType}
            </div>
          </CardContent>
        </Card>
      )
  }
}