import React, { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { CheckCircle2, AlertTriangle, XCircle, ChevronDown, ChevronRight, Lightbulb, AlertCircle } from 'lucide-react'
import type { ValidationResult } from '../services/validation-service'
import type { CardType } from '../types'
import { mapValidationErrorsToFriendly, groupFriendlyErrors, generateFixSummary, type FriendlyError } from '../services/error-message-mapper'

interface ValidationResultsProps {
  validationResult: ValidationResult | null
  open: boolean
  onClose: () => void
  onJumpToCard?: (cardType: CardType, cardIndex: number) => void
}

interface ErrorGroupProps {
  title: string
  errors: FriendlyError[]
  severity: 'error' | 'warning'
  onJumpToCard?: (cardType: CardType, cardIndex: number) => void
}

function ErrorGroup({ title, errors, severity, onJumpToCard }: ErrorGroupProps) {
  const [isOpen, setIsOpen] = useState(true)
  
  if (errors.length === 0) return null
  
  const icon = severity === 'error' ? XCircle : AlertCircle
  const IconComponent = icon
  const colorClasses = severity === 'error' 
    ? 'text-red-500 bg-red-50 border-red-200' 
    : 'text-amber-500 bg-amber-50 border-amber-200'
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className={`w-full flex items-center justify-between p-3 rounded-lg border ${colorClasses} hover:bg-opacity-80 transition-colors`}>
        <div className="flex items-center gap-3">
          <IconComponent className="h-5 w-5" />
          <span className="font-medium">{title}</span>
          <Badge variant={severity === 'error' ? 'destructive' : 'secondary'}>
            {errors.length}
          </Badge>
        </div>
        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </CollapsibleTrigger>
      
      <CollapsibleContent className="mt-2">
        <div className="space-y-3">
          {errors.map((error, index) => (
            <div key={index} className="ml-8 p-3 bg-white border rounded-lg shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 mb-1">{error.title}</h4>
                  <p className="text-gray-600 text-sm mb-2">{error.description}</p>
                  <div className="flex items-start gap-2">
                    <Lightbulb className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <p className="text-blue-700 text-sm">{error.suggestion}</p>
                  </div>
                </div>
                {error.cardType !== 'general' && error.cardIndex !== undefined && onJumpToCard && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onJumpToCard(error.cardType as CardType, error.cardIndex!)}
                    className="ml-3 flex-shrink-0"
                  >
                    定位卡片
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

export function ValidationResults({ validationResult, open, onClose, onJumpToCard }: ValidationResultsProps) {
  if (!validationResult) return null

  const { isValid, errors } = validationResult
  
  // 转换为用户友好的错误信息
  const friendlyErrors = mapValidationErrorsToFriendly(errors)
  const { critical, warnings, byCardType } = groupFriendlyErrors(friendlyErrors)
  const fixSummary = generateFixSummary(friendlyErrors)

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[85vh]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {isValid ? (
              <CheckCircle2 className="h-6 w-6 text-green-500" />
            ) : (
              <AlertTriangle className="h-6 w-6 text-red-500" />
            )}
            <div>
              <DialogTitle className="text-xl">
                {isValid ? '🎉 验证通过！' : '需要修复一些问题'}
              </DialogTitle>
              <DialogDescription className="mt-1">
                {isValid 
                  ? `您的卡包包含 ${validationResult.totalCards} 张卡牌，所有内容都符合规范，可以正常导出使用。`
                  : `检测到 ${fixSummary.criticalIssues} 个关键问题和 ${fixSummary.warningIssues} 个警告，影响 ${fixSummary.affectedCardTypes.join('、')} 卡片。`
                }
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {!isValid && (
          <div className="space-y-4">
            {/* 快速概览 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{fixSummary.criticalIssues}</div>
                <div className="text-sm text-gray-600">必须修复的问题</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-600">{fixSummary.warningIssues}</div>
                <div className="text-sm text-gray-600">建议修复的问题</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{fixSummary.affectedCardTypes.length}</div>
                <div className="text-sm text-gray-600">受影响的卡片类型</div>
              </div>
            </div>

            <Tabs defaultValue="priority" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="priority">按优先级</TabsTrigger>
                <TabsTrigger value="cardtype">按卡片类型</TabsTrigger>
                <TabsTrigger value="all">全部问题</TabsTrigger>
              </TabsList>

              <TabsContent value="priority">
                <ScrollArea className="max-h-[50vh] w-full">
                  <div className="space-y-4 pr-4">
                    {critical.length > 0 && (
                      <ErrorGroup
                        title="🚨 必须修复（阻止导出）"
                        errors={critical}
                        severity="error"
                        onJumpToCard={onJumpToCard}
                      />
                    )}
                    {warnings.length > 0 && (
                      <ErrorGroup
                        title="⚠️ 建议修复（提升质量）"
                        errors={warnings}
                        severity="warning"
                        onJumpToCard={onJumpToCard}
                      />
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="cardtype">
                <ScrollArea className="max-h-[50vh] w-full">
                  <div className="space-y-4 pr-4">
                    {Object.entries(byCardType).map(([cardTypeName, errors]) => (
                      <ErrorGroup
                        key={cardTypeName}
                        title={`${cardTypeName}卡片问题`}
                        errors={errors}
                        severity={errors.some(e => e.severity === 'error') ? 'error' : 'warning'}
                        onJumpToCard={onJumpToCard}
                      />
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="all">
                <ScrollArea className="max-h-[50vh] w-full">
                  <div className="space-y-4 pr-4">
                    <ErrorGroup
                      title="所有问题"
                      errors={friendlyErrors}
                      severity={critical.length > 0 ? 'error' : 'warning'}
                      onJumpToCard={onJumpToCard}
                    />
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {isValid && (
          <div className="text-center py-12">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-6" />
            <h3 className="text-2xl font-semibold text-green-800 mb-3">所有检查通过！</h3>
            <p className="text-green-700 text-lg">
              您的卡包质量优秀，可以放心导出和使用
            </p>
          </div>
        )}

        <div className="flex justify-between items-center pt-6 border-t">
          <div className="text-sm text-gray-500">
            {!isValid && (
              <>修复问题后，点击工具栏的"验证卡包"按钮重新检查</>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>
              关闭
            </Button>
            {isValid && (
              <Button onClick={onClose} className="bg-green-600 hover:bg-green-700">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                开始导出
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}