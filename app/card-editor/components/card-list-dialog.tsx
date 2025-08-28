import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FileText, Eye, Trash2 } from 'lucide-react'
import type { CardPackageState, CardListDialogState, CurrentCardIndex } from '../types'

interface CardListDialogProps {
  dialog: CardListDialogState
  onDialogChange: (dialog: CardListDialogState) => void
  currentPackage: CardPackageState
  currentCardIndex: CurrentCardIndex
  onSetCurrentCardIndex: (updater: (prev: CurrentCardIndex) => CurrentCardIndex) => void
  onSetSelectedTab: (tab: string) => void
  onPreviewCard: (card: unknown, type: string) => void
  onDeleteCard: (type: string, index: number) => void
}

export function CardListDialog({
  dialog,
  onDialogChange,
  currentPackage,
  currentCardIndex,
  onSetCurrentCardIndex,
  onSetSelectedTab,
  onPreviewCard,
  onDeleteCard
}: CardListDialogProps) {
  
  const getDialogTitle = () => {
    switch (dialog.type) {
      case 'profession': return '所有职业卡牌'
      case 'ancestry': return '所有血统卡牌'
      case 'variant': return '所有变体卡牌'
      default: return '所有卡牌'
    }
  }

  const cards = (currentPackage[dialog.type as keyof typeof currentPackage] as any[]) || []

  return (
    <Dialog open={dialog.open} onOpenChange={(open) => onDialogChange({ ...dialog, open })}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{getDialogTitle()}</DialogTitle>
          <DialogDescription>
            共 {cards.length} 张卡牌
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
            {cards.map((card, index) => (
              <div 
                key={index} 
                className="border rounded-lg p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => {
                  onSetCurrentCardIndex(prev => ({
                    ...prev,
                    [dialog.type]: index
                  }))
                  onDialogChange({ open: false, type: '' })
                  onSetSelectedTab(dialog.type)
                }}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-medium">
                      {index + 1}. {card.名称 || '未命名'}
                    </h4>
                    {dialog.type === 'profession' && (
                      <p className="text-sm text-muted-foreground mt-1">
                        领域: {card.领域1} / {card.领域2}
                      </p>
                    )}
                    {dialog.type === 'ancestry' && (
                      <p className="text-sm text-muted-foreground mt-1">
                        种族: {card.种族} | 类别: {card.类别}
                      </p>
                    )}
                    {dialog.type === 'variant' && (
                      <p className="text-sm text-muted-foreground mt-1">
                        类型: {card.类型} {card.子类别 && `| ${card.子类别}`}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        onPreviewCard(card, dialog.type)
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDeleteCard(dialog.type, index)
                        if (currentCardIndex[dialog.type] >= index) {
                          onSetCurrentCardIndex(prev => ({
                            ...prev,
                            [dialog.type]: Math.max(0, prev[dialog.type] - 1)
                          }))
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {cards.length === 0 && (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                还没有创建任何卡牌
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}