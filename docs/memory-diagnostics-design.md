# 内存诊断监控系统设计

## 背景

用户反馈页面内存占用会到几个 GB，但自动化测试未能复现泄漏。需要在用户环境中收集诊断数据，以定位实际泄漏场景。

## 目标

- 在不影响用户体验的前提下，持续监控内存使用
- 内存异常时提示用户导出诊断报告（JSON 文件）
- 通过操作日志关联内存变化与用户行为，定位泄漏触发条件

## 架构

```
┌──────────────────────────────────────────────────┐
│  MemoryMonitor (lib/memory-monitor.ts)           │
│  - 单例，应用启动时初始化                           │
│  - 每 30s 采样 performance.memory                 │
│  - 环形缓冲区存储最近 100 条采样（~50 分钟）         │
│  - 自动化事件捕获（零手动埋点）                      │
│  - 检测异常模式 → 通知 UI 层                       │
│                                                  │
│  事件捕获层：                                      │
│  ├── Zustand subscribe → store 状态变化            │
│  ├── document click 委托 → 按钮/链接点击            │
│  └── pathname 变化 → 路由跳转                      │
└──────────────┬───────────────────────────────────┘
               │ 事件回调
┌──────────────▼───────────────────────────────────┐
│  MemoryAlert (components/memory-alert.tsx)        │
│  - < 500MB: 完全不可见                             │
│  - 500MB~1GB: 黄色提示条（可关闭）                  │
│  - > 1GB: 红色警告条 + 导出按钮 + 刷新按钮          │
│  - "导出诊断报告"按钮 → 下载 JSON 文件              │
└──────────────────────────────────────────────────┘
```

## 核心模块

### 1. MemoryMonitor (`lib/memory-monitor.ts`)

单例类，负责数据采集和异常检测。

#### 数据结构

```typescript
interface MemorySample {
  timestamp: number        // Date.now()
  heapUsedMB: number       // performance.memory.usedJSHeapSize / 1MB
  heapTotalMB: number      // performance.memory.totalJSHeapSize / 1MB
  domNodes: number         // document.querySelectorAll('*').length
  blobUrls: number         // document.querySelectorAll('img[src^="blob:"]').length
}

interface UserAction {
  timestamp: number
  type: 'click' | 'store' | 'route'
  target: string           // 按钮文本 / store action 名称 / 路由路径
  detail?: string          // 可选补充信息
}

interface MemoryAlert {
  timestamp: number
  heapUsedMB: number
  level: 'warning' | 'critical'
}
```

#### 环形缓冲区

```typescript
class RingBuffer<T> {
  private buffer: T[]
  private index: number = 0
  private size: number

  constructor(maxSize: number) // maxSize = 100
  push(item: T): void
  getAll(): T[]  // 按时间顺序返回
}
```

- `memorySamples`: RingBuffer<MemorySample>(100) — 最近 100 条采样
- `userActions`: RingBuffer<UserAction>(200) — 最近 200 条操作
- `alerts`: MemoryAlert[] — 所有告警（不限数量，通常很少）

#### 采样逻辑

```typescript
class MemoryMonitor {
  private intervalId: number | null = null
  private onAlertCallbacks: Set<(level: 'warning' | 'critical') => void>

  start(): void
    // 检查 performance.memory 是否可用，不可用则静默返回
    // setInterval(this.sample, 30_000)

  stop(): void
    // clearInterval

  private sample(): void
    // 1. 读取 performance.memory
    // 2. 读取 DOM 节点数、Blob URL 数
    // 3. 存入 memorySamples 环形缓冲区
    // 4. 检测异常：
    //    - heapUsedMB > 500 → warning
    //    - heapUsedMB > 1024 → critical
    //    - 连续 5 次采样单调递增且增量 > 50MB → warning
    // 5. 异常时通知回调

  logAction(action: UserAction): void
    // 存入 userActions 环形缓冲区

  onAlert(callback): () => void  // 返回取消订阅函数

  exportReport(): DiagnosticReport
    // 组装完整诊断报告
}
```

#### 异常检测规则

| 条件 | 级别 | 说明 |
|------|------|------|
| heapUsedMB > 500 | warning | 单次采样超 500MB |
| heapUsedMB > 1024 | critical | 单次采样超 1GB |
| 连续 5 次采样单调递增 且 总增量 > 50MB | warning | 持续增长模式 |

### 2. 自动化事件捕获

#### Zustand Store 订阅

在应用初始化时，订阅主要 store 的变化：

```typescript
// 订阅 sheet-store
useSheetStore.subscribe((state, prevState) => {
  // 检测关键状态变化
  if (state.currentCharacterId !== prevState.currentCharacterId) {
    monitor.logAction({ type: 'store', target: 'switchCharacter', detail: state.currentCharacterId })
  }
  // ... 其他关键状态
})
```

只订阅关键状态变化，避免高频触发：
- `currentCharacterId` 变化 → 角色切换
- 卡牌数据变化（cards 数量）→ 卡牌操作

#### 全局 Click 委托

```typescript
document.addEventListener('click', (e) => {
  const target = e.target as HTMLElement
  const button = target.closest('button, [role="menuitem"], a')
  if (!button) return

  const label =
    button.getAttribute('aria-label') ||
    button.textContent?.trim().slice(0, 50) ||
    'unknown'

  monitor.logAction({ type: 'click', target: label })
}, { capture: true, passive: true })
```

- 使用 `capture: true` 确保捕获所有点击
- 使用 `passive: true` 不影响性能
- 只记录按钮/菜单项/链接的点击
- 文本截断到 50 字符避免过大

#### 路由变化

在 `app/page.tsx` 或顶层组件中：

```typescript
const pathname = usePathname()
useEffect(() => {
  monitor.logAction({ type: 'route', target: pathname })
}, [pathname])
```

### 3. MemoryAlert UI (`components/memory-alert.tsx`)

#### 用户感知

| 内存状态 | 显示 | 行为 |
|---------|------|------|
| < 500 MB | 不可见 | 无 |
| 500MB ~ 1GB | 底部黄色半透明条 | 文案："检测到内存偏高。如遇卡顿，可[导出诊断报告]" + [×] 关闭 |
| > 1GB | 底部红色条 | 文案："内存异常（{heapMB}MB）。建议[导出诊断报告]后[刷新页面]" + [×] 关闭 |

#### 组件结构

```typescript
export function MemoryAlert() {
  const [alertLevel, setAlertLevel] = useState<null | 'warning' | 'critical'>(null)
  const [dismissed, setDismissed] = useState(false)
  const [heapMB, setHeapMB] = useState(0)

  useEffect(() => {
    const unsubscribe = memoryMonitor.onAlert((level) => {
      setAlertLevel(level)
      setDismissed(false)
      // 更新 heapMB
    })
    return unsubscribe
  }, [])

  if (!alertLevel || dismissed) return null

  // 渲染警告条
}
```

#### 导出功能

点击"导出诊断报告"时：
1. 调用 `memoryMonitor.exportReport()` 获取数据
2. 生成 JSON 文件
3. 触发浏览器下载：`memory-diagnostic-{timestamp}.json`

### 4. 诊断报告格式

```typescript
interface DiagnosticReport {
  version: '1.0'
  exportedAt: string                    // ISO 时间戳
  environment: {
    userAgent: string
    platform: string
    screenSize: string
    language: string
    url: string
    characterCount: number              // 角色存档数量
    localStorageSizeKB: number
  }
  memorySamples: MemorySample[]         // 最近 100 条采样
  userActions: UserAction[]             // 最近 200 条操作
  alerts: MemoryAlert[]                 // 所有告警
  summary: {
    peakHeapMB: number                  // 峰值内存
    currentHeapMB: number               // 当前内存
    sessionDurationMinutes: number      // 会话时长
    totalActions: number                // 总操作次数
    growthPattern: string               // 'stable' | 'gradual_increase' | 'spike'
  }
}
```

## 涉及文件

| 文件 | 操作 | 说明 |
|------|------|------|
| `lib/memory-monitor.ts` | 新建 | 核心监控逻辑（MemoryMonitor 单例 + RingBuffer） |
| `components/memory-alert.tsx` | 新建 | 警告条 UI + 导出按钮 |
| `app/page.tsx` | 修改 | 挂载 MemoryAlert + 路由监听 |
| `lib/sheet-store.ts` | 修改 | 添加 Zustand subscribe（store 文件外部，在初始化时添加） |

## 性能影响

- 采样频率：每 30 秒一次，每次采样 < 1ms
- 内存开销：环形缓冲区 ~50KB（100 采样 + 200 操作记录）
- 全局 click listener：1 个，passive 模式，无性能影响
- 浏览器兼容：仅 Chrome 系浏览器支持 `performance.memory`，其他浏览器静默降级

## 测试验证

1. 启动应用，确认无 UI 变化（内存 < 500MB 时）
2. 在 Console 中手动调用 `window.__memoryMonitor.exportReport()` 检查报告格式
3. 模拟高内存场景（Console 中修改阈值为 50MB）验证警告条显示
4. 点击导出按钮，确认 JSON 文件正确下载
5. 确认 Firefox/Safari 下功能静默降级，无报错
