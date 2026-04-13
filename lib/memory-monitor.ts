// lib/memory-monitor.ts

// ============= Types =============

export interface MemorySample {
  timestamp: number
  heapUsedMB: number
  heapTotalMB: number
  domNodes: number
  blobUrls: number
}

export interface UserAction {
  timestamp: number
  type: 'click' | 'store' | 'route'
  target: string
  detail?: string
}

interface MemoryAlertEvent {
  timestamp: number
  heapUsedMB: number
  level: 'warning' | 'critical'
}

export interface DiagnosticReport {
  version: '1.0'
  exportedAt: string
  environment: {
    userAgent: string
    platform: string
    screenSize: string
    language: string
    url: string
    localStorageSizeKB: number
  }
  memorySamples: MemorySample[]
  userActions: UserAction[]
  alerts: MemoryAlertEvent[]
  summary: {
    peakHeapMB: number
    currentHeapMB: number
    sessionDurationMinutes: number
    totalActions: number
    growthPattern: 'stable' | 'gradual_increase' | 'spike'
  }
}

// ============= RingBuffer =============

export class RingBuffer<T> {
  private buffer: (T | undefined)[]
  private head = 0
  private count = 0
  private capacity: number

  constructor(capacity: number) {
    this.capacity = capacity
    this.buffer = new Array(capacity)
  }

  push(item: T): void {
    this.buffer[this.head] = item
    this.head = (this.head + 1) % this.capacity
    if (this.count < this.capacity) this.count++
  }

  getAll(): T[] {
    if (this.count === 0) return []
    const result: T[] = []
    const start = this.count < this.capacity ? 0 : this.head
    for (let i = 0; i < this.count; i++) {
      result.push(this.buffer[(start + i) % this.capacity] as T)
    }
    return result
  }
}

// ============= MemoryMonitor =============

type AlertCallback = (level: 'warning' | 'critical', heapMB: number) => void

const WARNING_THRESHOLD_MB = 500
const CRITICAL_THRESHOLD_MB = 1024
const SAMPLE_INTERVAL_MS = 30_000
const GROWTH_CHECK_COUNT = 5
const GROWTH_THRESHOLD_MB = 50

class MemoryMonitor {
  private samples = new RingBuffer<MemorySample>(100)
  private actions = new RingBuffer<UserAction>(200)
  private alertEvents: MemoryAlertEvent[] = []
  private alertCallbacks = new Set<AlertCallback>()
  private intervalId: ReturnType<typeof setInterval> | null = null
  private startTime = Date.now()
  private clickHandler: ((e: Event) => void) | null = null
  private lastAlertLevel: 'warning' | 'critical' | null = null

  get isSupported(): boolean {
    return typeof performance !== 'undefined' &&
      'memory' in performance &&
      !!(performance as any).memory
  }

  start(): void {
    if (!this.isSupported) return
    if (this.intervalId) return

    this.startTime = Date.now()
    this.sample()

    this.intervalId = setInterval(() => this.sample(), SAMPLE_INTERVAL_MS)

    this.clickHandler = (e: Event) => {
      const target = e.target as HTMLElement
      const button = target.closest('button, [role="menuitem"], a, [role="tab"]')
      if (!button) return

      const label =
        (button as HTMLElement).getAttribute('aria-label') ||
        (button as HTMLElement).textContent?.trim().slice(0, 50) ||
        'unknown'

      this.logAction({ timestamp: Date.now(), type: 'click', target: label })
    }
    document.addEventListener('click', this.clickHandler, { capture: true, passive: true })
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    if (this.clickHandler) {
      document.removeEventListener('click', this.clickHandler, { capture: true } as EventListenerOptions)
      this.clickHandler = null
    }
  }

  private sample(): void {
    const mem = (performance as any).memory
    const sample: MemorySample = {
      timestamp: Date.now(),
      heapUsedMB: Math.round(mem.usedJSHeapSize / 1024 / 1024),
      heapTotalMB: Math.round(mem.totalJSHeapSize / 1024 / 1024),
      domNodes: document.querySelectorAll('*').length,
      blobUrls: document.querySelectorAll('img[src^="blob:"]').length,
    }
    this.samples.push(sample)
    this.checkAlerts(sample)
  }

  private checkAlerts(sample: MemorySample): void {
    let level: 'warning' | 'critical' | null = null

    if (sample.heapUsedMB > CRITICAL_THRESHOLD_MB) {
      level = 'critical'
    } else if (sample.heapUsedMB > WARNING_THRESHOLD_MB) {
      level = 'warning'
    } else {
      const allSamples = this.samples.getAll()
      if (allSamples.length >= GROWTH_CHECK_COUNT) {
        const recent = allSamples.slice(-GROWTH_CHECK_COUNT)
        const isMonotonicallyIncreasing = recent.every((s, i) =>
          i === 0 || s.heapUsedMB > recent[i - 1].heapUsedMB
        )
        const totalGrowth = recent[recent.length - 1].heapUsedMB - recent[0].heapUsedMB
        if (isMonotonicallyIncreasing && totalGrowth > GROWTH_THRESHOLD_MB) {
          level = 'warning'
        }
      }
    }

    if (level && level !== this.lastAlertLevel) {
      this.lastAlertLevel = level
      const alert: MemoryAlertEvent = {
        timestamp: Date.now(),
        heapUsedMB: sample.heapUsedMB,
        level,
      }
      this.alertEvents.push(alert)
      this.alertCallbacks.forEach(cb => cb(level!, sample.heapUsedMB))
    }

    if (!level && this.lastAlertLevel) {
      this.lastAlertLevel = null
    }
  }

  logAction(action: UserAction): void {
    this.actions.push(action)
  }

  onAlert(callback: AlertCallback): () => void {
    this.alertCallbacks.add(callback)
    return () => { this.alertCallbacks.delete(callback) }
  }

  exportReport(): DiagnosticReport {
    const allSamples = this.samples.getAll()
    const peakHeapMB = allSamples.length > 0
      ? Math.max(...allSamples.map(s => s.heapUsedMB))
      : 0
    const currentHeapMB = allSamples.length > 0
      ? allSamples[allSamples.length - 1].heapUsedMB
      : 0

    let growthPattern: 'stable' | 'gradual_increase' | 'spike' = 'stable'
    if (allSamples.length >= 3) {
      const first = allSamples[0].heapUsedMB
      const last = allSamples[allSamples.length - 1].heapUsedMB
      if (last > first * 2) {
        growthPattern = 'spike'
      } else if (last > first * 1.3) {
        growthPattern = 'gradual_increase'
      }
    }

    let localStorageSizeKB = 0
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key) {
          localStorageSizeKB += (localStorage.getItem(key)?.length || 0) * 2
        }
      }
      localStorageSizeKB = Math.round(localStorageSizeKB / 1024)
    } catch { /* ignore */ }

    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      environment: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        screenSize: `${screen.width}x${screen.height}`,
        language: navigator.language,
        url: location.href,
        localStorageSizeKB,
      },
      memorySamples: allSamples,
      userActions: this.actions.getAll(),
      alerts: this.alertEvents,
      summary: {
        peakHeapMB,
        currentHeapMB,
        sessionDurationMinutes: Math.round((Date.now() - this.startTime) / 60_000),
        totalActions: this.actions.getAll().length,
        growthPattern,
      },
    }
  }
}

export const memoryMonitor = new MemoryMonitor()

if (typeof window !== 'undefined') {
  (window as any).__memoryMonitor = memoryMonitor
}
