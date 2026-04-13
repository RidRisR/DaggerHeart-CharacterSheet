// tests/unit/memory-monitor.test.ts
import { describe, it, expect } from 'vitest'
import { RingBuffer } from '@/lib/memory-monitor'

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
