# AI文本转换工具 - UI设计方案

> 基于现有基础设施的复用设计

## 一、设计原则

### 1.1 复用现有组件

**现有可复用组件：**
- ✅ `Dialog` - Radix UI对话框（已用于ValidationResults、DefinitionsManager）
- ✅ `Button`, `Input`, `Textarea` - 基础表单组件
- ✅ `Tabs`, `TabsList`, `TabsContent` - 标签页切换
- ✅ `Badge`, `ScrollArea` - 状态标签和滚动区域
- ✅ `Collapsible` - 折叠面板
- ✅ `Progress` - 进度条（需确认是否已安装）
- ✅ `Alert` - 警告提示组件

**设计模式参考：**
- ValidationResults的错误分组展示
- DefinitionsManager的输入/标签管理模式
- Toolbar的按钮布局

### 1.2 功能范围（Phase 1 - MVP）

**包含：**
- ✅ AI配置管理（独立按钮）
- ✅ 文本输入（粘贴 + 上传.txt/.md）
- ✅ 流式处理进度显示
- ✅ 预览与确认（可折叠详情）
- ✅ 完全替换现有卡包（新建模式）

**不包含（后续Phase）：**
- ❌ 增量导入模式
- ❌ 逐个编辑卡牌
- ❌ 处理历史记录
- ❌ 模板库

---

## 二、工具栏集成

### 2.1 新增按钮位置

**文件：** `app/card-editor/components/toolbar.tsx`

```tsx
// 在"导入卡包"按钮后添加
<Button
  variant="outline"
  size="sm"
  onClick={onOpenAIConverter}
  className="flex items-center gap-2"
>
  <Sparkles className="h-4 w-4" />  {/* lucide-react图标 */}
  AI文本转换
</Button>
```

**按钮顺序：**
```
[新建卡包] [导入卡包] [AI文本转换] [导出卡包] [验证卡包] [查看关键字列表]
```

### 2.2 Store集成

**修改：** `app/card-editor/store/card-editor-store.ts`

```typescript
interface CardEditorStore {
  // 新增AI对话框状态
  aiConverterDialog: boolean
  setAIConverterDialog: (open: boolean) => void

  // 新增AI配置状态
  aiConfigDialog: boolean
  setAIConfigDialog: (open: boolean) => void
}

// 在store中添加
aiConverterDialog: false,
setAIConverterDialog: (open) => set({ aiConverterDialog: open }),

aiConfigDialog: false,
setAIConfigDialog: (open) => set({ aiConfigDialog: open }),
```

---

## 三、AI配置界面

### 3.1 配置对话框

**文件：** `app/card-editor/components/ai-config-dialog.tsx`

```tsx
interface AIConfig {
  provider: 'openai' | 'claude' | 'custom'
  apiKey: string
  baseURL: string
  model: string
}

export function AIConfigDialog({ open, onOpenChange }: Props) {
  const [config, setConfig] = useState<AIConfig>({
    provider: 'openai',
    apiKey: '',
    baseURL: 'https://api.openai.com/v1',
    model: 'gpt-4o'
  })

  // 预设配置
  const PROVIDERS = {
    openai: {
      name: 'OpenAI',
      baseURL: 'https://api.openai.com/v1',
      models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo']
    },
    claude: {
      name: 'Claude (OpenAI兼容)',
      baseURL: 'https://api.anthropic.com/v1',
      models: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022']
    },
    custom: {
      name: '自定义',
      baseURL: '',
      models: []
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>AI服务配置</DialogTitle>
          <DialogDescription>
            配置AI服务用于文本转换功能。支持OpenAI、Claude及其他兼容服务。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 提供商选择 */}
          <div>
            <Label>选择提供商</Label>
            <Select value={config.provider} onValueChange={handleProviderChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="claude">Claude (OpenAI兼容)</SelectItem>
                <SelectItem value="custom">自定义</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* API Key */}
          <div>
            <Label>API Key</Label>
            <Input
              type="password"
              placeholder="sk-..."
              value={config.apiKey}
              onChange={(e) => setConfig(prev => ({ ...prev, apiKey: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground mt-1">
              您的API Key将被加密存储在本地，不会上传到服务器
            </p>
          </div>

          {/* Base URL（自定义时可编辑） */}
          <div>
            <Label>Base URL</Label>
            <Input
              value={config.baseURL}
              onChange={(e) => setConfig(prev => ({ ...prev, baseURL: e.target.value }))}
              disabled={config.provider !== 'custom'}
              placeholder="https://api.example.com/v1"
            />
          </div>

          {/* 模型选择 */}
          <div>
            <Label>模型</Label>
            {config.provider !== 'custom' ? (
              <Select value={config.model} onValueChange={handleModelChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDERS[config.provider].models.map(model => (
                    <SelectItem key={model} value={model}>{model}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                value={config.model}
                onChange={(e) => setConfig(prev => ({ ...prev, model: e.target.value }))}
                placeholder="模型名称"
              />
            )}
          </div>

          {/* 费用提示 */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>费用说明：</strong>使用AI转换会消耗您的API配额。
              约20,000字符的文本转换预计消耗18,500 tokens（GPT-4o约$0.03 USD）。
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSave} disabled={!config.apiKey.trim()}>
            保存配置
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

### 3.2 配置存储

使用之前设计的 `APIKeyManager`：

```typescript
import { APIKeyManager } from '../services/api-key-manager'

const apiKeyManager = new APIKeyManager()

// 保存配置
await apiKeyManager.saveConfig(config)

// 读取配置
const config = await apiKeyManager.loadConfig()
```

---

## 四、AI转换主对话框

### 4.1 整体结构

**文件：** `app/card-editor/components/ai-converter-dialog.tsx`

```tsx
type Step = 'upload' | 'processing' | 'preview'

export function AIConverterDialog({ open, onOpenChange }: Props) {
  const [step, setStep] = useState<Step>('upload')
  const [processState, setProcessState] = useState<ProcessState | null>(null)
  const [result, setResult] = useState<ParseResult | null>(null)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        {step === 'upload' && <UploadStep onSubmit={handleSubmit} />}
        {step === 'processing' && <ProcessingStep state={processState} />}
        {step === 'preview' && <PreviewStep result={result} onConfirm={handleConfirm} />}
      </DialogContent>
    </Dialog>
  )
}
```

---

## 五、步骤1：上传界面

### 5.1 UI布局

**复用模式：** 参考 DefinitionsManager 的输入布局

```tsx
function UploadStep({ onSubmit }: Props) {
  const [inputMode, setInputMode] = useState<'paste' | 'file'>('paste')
  const [text, setText] = useState('')

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          文本格式转换工具
        </DialogTitle>
        <DialogDescription>
          将已准备好的文本内容转换为卡包JSON格式
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        {/* 引导信息 */}
        <Alert>
          <InfoIcon className="h-4 w-4" />
          <AlertTitle>使用说明</AlertTitle>
          <AlertDescription>
            <ul className="text-sm space-y-1 mt-2">
              <li>✅ 适用：已在Word/记事本中写好完整卡牌内容</li>
              <li>✅ 适用：有现成的设定文档需要导入</li>
              <li>❌ 不适用：让AI帮你创作卡牌内容</li>
              <li>❌ 不适用：只有简单想法未完整撰写</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* 输入模式切换 */}
        <Tabs value={inputMode} onValueChange={setInputMode}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="paste">粘贴文本</TabsTrigger>
            <TabsTrigger value="file">上传文件</TabsTrigger>
          </TabsList>

          <TabsContent value="paste" className="space-y-2">
            <Textarea
              placeholder="粘贴您的文本内容..."
              className="min-h-[300px] font-mono text-sm"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{text.length} 字符</span>
              {text.length > 20000 && (
                <span className="text-amber-600">
                  ⚠️ 文本较长，处理时间可能超过3分钟
                </span>
              )}
            </div>
          </TabsContent>

          <TabsContent value="file">
            <FileUploadZone
              accept=".txt,.md"
              onFileLoaded={(content) => {
                setText(content)
                setInputMode('paste')  // 加载后切回粘贴模式显示内容
              }}
            />
          </TabsContent>
        </Tabs>

        {/* 格式参考（可折叠） */}
        <Collapsible>
          <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ChevronRight className="h-4 w-4" />
            查看推荐格式示例
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ScrollArea className="h-[200px] mt-2">
              <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto">
{`## 职业卡：剑客
- 简介：以剑术为生的战士
- 领域1：武技
- 领域2：防御
- 起始生命：14
- 起始闪避：8
...

## 种族卡：江湖侠士（类别1）
- 种族：江湖侠士
- 简介：行走江湖的游侠
- 效果：敏捷检定获得优势
...`}
              </pre>
            </ScrollArea>
          </CollapsibleContent>
        </Collapsible>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          取消
        </Button>
        <Button
          onClick={() => onSubmit(text)}
          disabled={!text.trim()}
        >
          开始转换
        </Button>
      </DialogFooter>
    </>
  )
}
```

### 5.2 文件上传组件

```tsx
function FileUploadZone({ accept, onFileLoaded }: Props) {
  const [isDragging, setIsDragging] = useState(false)

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file) {
      const text = await file.text()
      onFileLoaded(text)
    }
  }

  return (
    <div
      className={cn(
        "border-2 border-dashed rounded-lg p-12 text-center transition-colors",
        isDragging ? "border-primary bg-primary/5" : "border-muted"
      )}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
      <p className="text-lg mb-2">拖拽文件到此处</p>
      <p className="text-sm text-muted-foreground mb-4">
        或点击下方按钮选择文件
      </p>
      <Button variant="outline" onClick={() => inputRef.current?.click()}>
        选择文件
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) {
            file.text().then(onFileLoaded)
          }
        }}
      />
      <p className="text-xs text-muted-foreground mt-4">
        支持格式：.txt, .md
      </p>
    </div>
  )
}
```

---

## 六、步骤2：处理进度界面

### 6.1 进度显示

**复用模式：** 参考 Toolbar 的 Loader2 + ValidationResults 的统计展示

```tsx
function ProcessingStep({ state }: { state: ProcessState }) {
  return (
    <>
      <DialogHeader>
        <DialogTitle>正在处理文本...</DialogTitle>
        <DialogDescription>
          AI正在分析和转换您的文本，请稍候
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-6 py-8">
        {/* 主进度指示 */}
        <div className="text-center">
          <Loader2 className="h-16 w-16 animate-spin mx-auto mb-4 text-primary" />
          <h3 className="text-lg font-semibold mb-2">
            {state.phase === 'parsing' && 'AI正在解析文本...'}
            {state.phase === 'validating' && '正在验证数据...'}
          </h3>
          <p className="text-sm text-muted-foreground">
            这可能需要几分钟，请不要关闭此窗口
          </p>
        </div>

        {/* 进度条 */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span>总进度</span>
            <span>{Math.round(state.progress)}%</span>
          </div>
          <Progress value={state.progress} className="w-full h-2" />
          {state.currentPosition !== undefined && (
            <p className="text-xs text-muted-foreground mt-2">
              已处理：{state.currentPosition} / {state.totalLength} 字符
            </p>
          )}
        </div>

        {/* 实时统计（参考ValidationResults的统计卡片） */}
        {state.stats && (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted/50 p-4 rounded-lg text-center">
              <div className="text-3xl font-bold text-primary">
                {state.stats.processedCards}
              </div>
              <div className="text-sm text-muted-foreground">已识别卡牌</div>
            </div>

            {state.stats.totalChunks && (
              <div className="bg-muted/50 p-4 rounded-lg text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {state.stats.processedChunks} / {state.stats.totalChunks}
                </div>
                <div className="text-sm text-muted-foreground">处理块数</div>
              </div>
            )}
          </div>
        )}

        {/* 卡牌类型统计（可折叠） */}
        {state.stats?.cardsByType && Object.keys(state.stats.cardsByType).length > 0 && (
          <Collapsible defaultOpen>
            <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium w-full">
              <ChevronDown className="h-4 w-4" />
              已识别的卡牌类型
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 space-y-2">
                {Object.entries(state.stats.cardsByType).map(([type, count]) =>
                  count > 0 && (
                    <div key={type} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{typeNames[type]}</span>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  )
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* 警告预览 */}
        {state.warnings && state.warnings.length > 0 && (
          <Alert variant="warning">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              已检测到 {state.warnings.length} 个需要注意的问题，处理完成后请检查
            </AlertDescription>
          </Alert>
        )}
      </div>
    </>
  )
}
```

---

## 七、步骤3：预览确认界面

### 7.1 整体布局

**复用模式：** 大量复用 ValidationResults 的布局和交互

```tsx
function PreviewStep({ result, onConfirm }: Props) {
  const [selectedCards, setSelectedCards] = useState<SelectedCards>({
    profession: result.data.profession?.map((_, i) => i) || [],
    ancestry: result.data.ancestry?.map((_, i) => i) || [],
    // ... 其他类型，默认全选
  })

  const totalSelected = Object.values(selectedCards).reduce(
    (sum, indices) => sum + indices.length, 0
  )

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          {result.errors.length === 0 ? (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-amber-500" />
          )}
          转换结果预览
        </DialogTitle>
        <DialogDescription>
          共识别到 {result.stats.totalCards} 张卡牌，请检查后确认导入
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4 flex-1 overflow-hidden flex flex-col">
        {/* 警告/错误汇总（复用ValidationResults风格） */}
        {result.warnings.length > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>AI标注了 {result.warnings.length} 个不确定项</AlertTitle>
            <AlertDescription>
              <ScrollArea className="h-[100px] mt-2">
                <ul className="list-disc pl-4 space-y-1 text-sm">
                  {result.warnings.map((w, i) => (
                    <li key={i}>{w.message}</li>
                  ))}
                </ul>
              </ScrollArea>
            </AlertDescription>
          </Alert>
        )}

        {result.errors.length > 0 && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>发现 {result.errors.length} 个验证错误</AlertTitle>
            <AlertDescription>
              <p className="text-sm mb-2">
                这些错误不会阻止导入，但建议在导入后修正：
              </p>
              <ScrollArea className="h-[100px]">
                <ul className="list-disc pl-4 space-y-1 text-sm">
                  {result.errors.slice(0, 10).map((e, i) => (
                    <li key={i}>
                      <span className="font-mono text-xs">{e.path}</span>: {e.message}
                    </li>
                  ))}
                  {result.errors.length > 10 && (
                    <li className="text-muted-foreground">
                      ... 还有 {result.errors.length - 10} 个错误
                    </li>
                  )}
                </ul>
              </ScrollArea>
            </AlertDescription>
          </Alert>
        )}

        {/* 分卡牌类型预览（复用ValidationResults的Tabs布局） */}
        <Tabs defaultValue="profession" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-6">
            {(['profession', 'ancestry', 'community', 'subclass', 'domain', 'variant'] as const).map(type => {
              const count = result.data[type]?.length || 0
              return count > 0 && (
                <TabsTrigger key={type} value={type} className="text-xs">
                  {typeNames[type]} ({count})
                </TabsTrigger>
              )
            })}
          </TabsList>

          {/* 职业卡预览 */}
          <TabsContent value="profession" className="flex-1 overflow-hidden">
            <CardTypePreview
              cards={result.data.profession || []}
              type="profession"
              selectedIndices={selectedCards.profession}
              onSelectionChange={(indices) =>
                setSelectedCards(prev => ({ ...prev, profession: indices }))
              }
            />
          </TabsContent>

          {/* 其他类型... */}
        </Tabs>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          取消
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={toggleSelectAll}
          >
            {allSelected ? '取消全选' : '全选'}
          </Button>
          <Button
            onClick={() => onConfirm(selectedCards)}
            disabled={totalSelected === 0}
          >
            导入选中的卡牌 ({totalSelected})
          </Button>
        </div>
      </DialogFooter>
    </>
  )
}
```

### 7.2 卡牌预览组件（可折叠详情）

```tsx
function CardTypePreview({ cards, type, selectedIndices, onSelectionChange }: Props) {
  return (
    <ScrollArea className="h-[400px]">
      <div className="space-y-2 pr-4">
        {cards.map((card, index) => {
          const isSelected = selectedIndices.includes(index)

          return (
            <Collapsible key={index}>
              <div
                className={cn(
                  "border rounded-lg p-3",
                  isSelected ? "border-primary bg-primary/5" : "border-muted"
                )}
              >
                {/* 简洁视图 */}
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        onSelectionChange([...selectedIndices, index])
                      } else {
                        onSelectionChange(selectedIndices.filter(i => i !== index))
                      }
                    }}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-semibold truncate">
                        {card.名称 || '未命名'}
                      </h4>
                      <div className="flex items-center gap-1 ml-2">
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </CollapsibleTrigger>
                      </div>
                    </div>

                    {/* 关键信息预览 */}
                    <div className="flex flex-wrap gap-2 text-xs">
                      {type === 'profession' && (
                        <>
                          <Badge variant="outline">
                            {card.领域1} / {card.领域2}
                          </Badge>
                          <Badge variant="secondary">
                            生命{card.起始生命} 闪避{card.起始闪避}
                          </Badge>
                        </>
                      )}
                      {type === 'ancestry' && (
                        <>
                          <Badge variant="outline">{card.种族}</Badge>
                          <Badge variant="secondary">类别{card.类别}</Badge>
                        </>
                      )}
                      {/* 其他类型的关键信息... */}
                    </div>
                  </div>
                </div>

                {/* 详细视图（可折叠） */}
                <CollapsibleContent className="mt-3 pt-3 border-t">
                  <div className="space-y-2 text-sm">
                    {Object.entries(card).map(([key, value]) => (
                      <div key={key} className="grid grid-cols-4 gap-2">
                        <span className="text-muted-foreground font-medium">
                          {key}:
                        </span>
                        <span className="col-span-3 break-words">
                          {typeof value === 'string'
                            ? value
                            : JSON.stringify(value)
                          }
                        </span>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          )
        })}
      </div>
    </ScrollArea>
  )
}
```

---

## 八、集成到主页面

### 8.1 page.tsx修改

**文件：** `app/card-editor/page.tsx`

```tsx
import { AIConverterDialog } from './components/ai-converter-dialog'
import { AIConfigDialog } from './components/ai-config-dialog'

export default function CardEditorPage() {
  const {
    aiConverterDialog,
    setAIConverterDialog,
    aiConfigDialog,
    setAIConfigDialog,
    // ... 其他store状态
  } = useCardEditorStore()

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* 现有内容... */}

      {/* AI转换对话框 */}
      <AIConverterDialog
        open={aiConverterDialog}
        onOpenChange={setAIConverterDialog}
      />

      {/* AI配置对话框 */}
      <AIConfigDialog
        open={aiConfigDialog}
        onOpenChange={setAIConfigDialog}
      />
    </div>
  )
}
```

---

## 九、错误处理策略（复用现有模式）

### 9.1 宽松模式（推荐）

**参考：** ValidationResults允许查看错误但不阻止操作

```typescript
// 处理结果有错误时
if (result.errors.length > 0) {
  // 显示警告，但仍允许导入
  toast.warning(`发现 ${result.errors.length} 个验证错误，建议导入后修正`)
}

// 用户确认后执行导入
const confirmImport = () => {
  // 使用现有的newPackage逻辑（完全替换）
  useCardEditorStore.getState().newPackage()

  // 然后设置新数据
  set({ packageData: result.data })

  toast.success(`已导入 ${totalSelected} 张卡牌`)
  setAIConverterDialog(false)
}
```

---

## 十、状态流转图

```
用户点击"AI文本转换"
    ↓
检查API配置
    ├─ 未配置 → 打开AIConfigDialog
    │              ↓
    │          保存配置 → 打开AIConverterDialog
    │
    └─ 已配置 → 直接打开AIConverterDialog
                    ↓
                Step 1: 上传界面
                - 粘贴文本 / 上传文件
                - 点击"开始转换"
                    ↓
                Step 2: 处理进度
                - StreamingBatchProcessor工作
                - 实时更新进度、统计
                - 完成后自动跳转
                    ↓
                Step 3: 预览确认
                - 查看识别的卡牌
                - 勾选需要的卡牌
                - 点击"导入选中的卡牌"
                    ↓
                执行导入
                - 调用newPackage()清空现有
                - 设置新的packageData
                - 关闭对话框
                - 显示成功提示
```

---

## 十一、组件文件清单

```
app/card-editor/
├── components/
│   ├── ai-converter-dialog.tsx           # 主对话框（步骤协调）
│   ├── ai-config-dialog.tsx              # AI配置界面
│   ├── ai-upload-step.tsx                # 步骤1：上传
│   ├── ai-processing-step.tsx            # 步骤2：处理进度
│   ├── ai-preview-step.tsx               # 步骤3：预览确认
│   ├── ai-card-preview.tsx               # 卡牌预览组件
│   └── file-upload-zone.tsx              # 文件上传区域
│
├── services/
│   ├── ai-service.ts                     # AI服务（已设计）
│   ├── json-merger.ts                    # JSON合并（已设计）
│   ├── streaming-batch-processor.ts      # 批量处理器（已设计）
│   ├── api-key-manager.ts                # API Key管理（已设计）
│   └── file-processor.ts                 # 文件处理（已设计）
│
└── store/
    └── card-editor-store.ts              # 添加AI对话框状态
```

---

## 十二、UI复用总结

| 需求 | 复用组件/模式 | 源文件 |
|------|--------------|--------|
| 对话框基础 | Dialog系列 | ui/dialog.tsx |
| 进度显示 | Loader2 + Progress | Toolbar, 需确认Progress |
| 错误展示 | Alert + ScrollArea | ValidationResults |
| 统计卡片 | 网格布局 + Badge | ValidationResults |
| 可折叠面板 | Collapsible | ValidationResults, DefinitionsManager |
| 标签页 | Tabs系列 | ValidationResults |
| 输入组件 | Input, Textarea | DefinitionsManager |
| 文件上传 | 自定义（简单拖拽） | 新建 |

**总结：** 约80%的UI组件可以直接复用现有基础设施，主要需要新建的是文件上传区域和AI配置表单。

---

## 十三、开发优先级

### Phase 1 - 核心流程（1-2天）

1. ✅ 添加工具栏按钮
2. ✅ API配置对话框
3. ✅ 上传步骤（粘贴文本）
4. ✅ 处理进度步骤（基础版）
5. ✅ 预览步骤（简洁模式，无折叠）
6. ✅ 导入功能（完全替换）

**验收：** 能完成小文本（<5K字符）的转换和导入

### Phase 2 - 体验优化（1天）

1. ✅ 文件上传支持
2. ✅ 预览详情折叠
3. ✅ 选择性导入（勾选框）
4. ✅ 错误/警告详细展示

**验收：** 用户体验流畅，错误信息清晰

### Phase 3 - 大文本优化（后续）

1. 🔄 分块进度详情
2. 🔄 Token消耗估算提示
3. 🔄 处理失败重试

---

**文档版本：** v1.0
**最后更新：** 2025-01-04
**基于：** ai-text-converter-architecture.md v1.0
