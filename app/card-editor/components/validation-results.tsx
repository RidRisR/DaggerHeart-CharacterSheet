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
            <div key={index} className="ml-4 md:ml-8 p-3 bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h4 className="font-medium text-gray-900 text-sm md:text-base">{error.title}</h4>
                    {error.field && (
                      <Badge variant="outline" className="text-xs">
                        字段: {error.field}
                      </Badge>
                    )}
                    <Badge variant={error.severity === 'error' ? 'destructive' : 'secondary'} className="text-xs">
                      {error.severity === 'error' ? '错误' : '警告'}
                    </Badge>
                  </div>
                  <p className="text-gray-600 text-sm mb-2">{error.description}</p>
                  <div className="flex items-start gap-2 bg-blue-50 p-2 rounded">
                    <Lightbulb className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <p className="text-blue-700 text-sm">{error.suggestion}</p>
                  </div>
                </div>
                {error.cardType !== 'general' && error.cardIndex !== undefined && onJumpToCard && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onJumpToCard(error.cardType as CardType, error.cardIndex!)}
                    className="self-start md:ml-3 md:flex-shrink-0 hover:bg-blue-50 w-full md:w-auto"
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
  const { critical, warnings, byCardType, bySpecificCard } = groupFriendlyErrors(friendlyErrors)
  const fixSummary = generateFixSummary(friendlyErrors)

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
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
          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            {/* 快速概览 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 p-3 md:p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border">
              <div className="text-center">
                <div className="text-xl md:text-2xl font-bold text-red-600">{fixSummary.criticalIssues}</div>
                <div className="text-xs md:text-sm text-gray-600">关键错误</div>
                <div className="text-xs text-red-500 mt-1 hidden md:block">必须修复</div>
              </div>
              <div className="text-center">
                <div className="text-xl md:text-2xl font-bold text-amber-600">{fixSummary.warningIssues}</div>
                <div className="text-xs md:text-sm text-gray-600">警告</div>
                <div className="text-xs text-amber-500 mt-1 hidden md:block">建议修复</div>
              </div>
              <div className="text-center">
                <div className="text-xl md:text-2xl font-bold text-blue-600">{fixSummary.affectedCardTypes.length}</div>
                <div className="text-xs md:text-sm text-gray-600">问题类型</div>
                <div className="text-xs text-blue-500 mt-1 hidden md:block">{fixSummary.affectedCardTypes.join('、')}</div>
              </div>
              <div className="text-center">
                <div className="text-xl md:text-2xl font-bold text-green-600">{validationResult.totalCards}</div>
                <div className="text-xs md:text-sm text-gray-600">检查总数</div>
                <div className="text-xs text-green-500 mt-1 hidden md:block">已验证</div>
              </div>
            </div>

            <Tabs defaultValue="specificcard" className="w-full flex-1 flex flex-col overflow-hidden">
              <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
                <TabsTrigger value="priority" className="text-xs md:text-sm">按优先级</TabsTrigger>
                <TabsTrigger value="specificcard" className="text-xs md:text-sm">按卡片</TabsTrigger>
                <TabsTrigger value="cardtype" className="text-xs md:text-sm">按类型</TabsTrigger>
                <TabsTrigger value="all" className="text-xs md:text-sm">全部</TabsTrigger>
              </TabsList>

              <TabsContent value="priority" className="flex-1 overflow-hidden">
                <ScrollArea className="h-[60vh]">
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

              <TabsContent value="specificcard" className="flex-1 overflow-hidden">
                <ScrollArea className="h-[60vh]">
                  <div className="space-y-4 pr-4">
                    {Object.entries(bySpecificCard).map(([cardName, errors]) => (
                      <ErrorGroup
                        key={cardName}
                        title={cardName}
                        errors={errors}
                        severity={errors.some(e => e.severity === 'error') ? 'error' : 'warning'}
                        onJumpToCard={onJumpToCard}
                      />
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="cardtype" className="flex-1 overflow-hidden">
                <ScrollArea className="h-[60vh]">
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

              <TabsContent value="all" className="flex-1 overflow-hidden">
                <ScrollArea className="h-[60vh]">
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
          <div className="text-center py-12 bg-gradient-to-b from-green-50 to-green-100 rounded-lg border border-green-200">
            <div className="bg-green-500 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-white" />
            </div>
            <h3 className="text-2xl font-semibold text-green-800 mb-3">🎉 验证完成！</h3>
            <p className="text-green-700 text-lg mb-4">
              您的卡包包含 <span className="font-semibold">{validationResult.totalCards}</span> 张卡牌，所有内容都符合规范
            </p>
            <div className="bg-white rounded-lg p-4 inline-block shadow-sm border border-green-200">
              <p className="text-green-600 font-medium">✨ 卡包质量优秀，可以放心导出和使用</p>
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-6 border-t">
          <div className="text-xs md:text-sm text-gray-500 text-center md:text-left">
            {!isValid && (
              <>修复问题后，点击工具栏的"验证卡包"按钮重新检查</>
            )}
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <Button variant="outline" onClick={onClose} className="flex-1 md:flex-none">
              关闭
            </Button>
            {isValid && (
              <Button onClick={onClose} className="bg-green-600 hover:bg-green-700 flex-1 md:flex-none">
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