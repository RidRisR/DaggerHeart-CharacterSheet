// tests/unit/memory-monitor.test.ts
import { describe, it, expect } from 'vitest'
import { memoryMonitor, RingBuffer } from '@/lib/memory-monitor'

describe('RingBuffer', () => {
  it('stores items up to capacity', () => {
    const buf = new RingBuffer<number>(3)
    buf.push(1)
    buf.push(2)
    buf.push(3)
    expect(buf.getAll()).toEqual([1, 2, 3])
  })

  it('overwrites oldest when full', () => {
    const buf = new RingBuffer<number>(3)
    buf.push(1)
    buf.push(2)
    buf.push(3)
    buf.push(4)
    expect(buf.getAll()).toEqual([2, 3, 4])
  })

  it('returns items in insertion order after wrap', () => {
    const buf = new RingBuffer<number>(2)
    buf.push(1)
    buf.push(2)
    buf.push(3)
    buf.push(4)
    buf.push(5)
    expect(buf.getAll()).toEqual([4, 5])
  })

  it('handles empty buffer', () => {
    const buf = new RingBuffer<number>(5)
    expect(buf.getAll()).toEqual([])
  })
})

describe('memoryMonitor character storage diagnostics', () => {
  it('omits character storage diagnostics when localStorage access throws', () => {
    const descriptor = Object.getOwnPropertyDescriptor(window, 'localStorage')
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('storage blocked')
      },
    })

    try {
      const report = memoryMonitor.getReport()
      expect(report.characterStorage).toBeUndefined()
    } finally {
      if (descriptor) {
        Object.defineProperty(window, 'localStorage', descriptor)
      }
    }
  })

  it('reports character save image payload violations without exposing content', () => {
    localStorage.clear()
    localStorage.setItem('dh_character_list', JSON.stringify({ characters: [], activeCharacterId: null }))
    localStorage.setItem('dh_character_bad', JSON.stringify({
      name: 'Secret Name',
      characterImage: 'data:image/png;base64,SECRET',
    }))

    const report = memoryMonitor.getReport()

    expect(report.characterStorage?.violations).toEqual([
      expect.objectContaining({
        key: 'dh_character_bad',
        containsEmbeddedImage: true,
      }),
    ])
    expect(JSON.stringify(report)).not.toContain('SECRET')
  })
})
