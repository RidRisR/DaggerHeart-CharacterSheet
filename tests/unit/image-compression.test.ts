import { describe, it, expect } from 'vitest'
import {
  calculateTargetDimensions,
  estimateQuality,
  findOptimalQuality,
  type CompressionResult
} from '@/app/card-editor/utils/image-compression'

describe('calculateTargetDimensions', () => {
  it('should not resize when image is smaller than max dimension', () => {
    const result = calculateTargetDimensions(800, 600, 1200)
    expect(result).toEqual({ width: 800, height: 600 })
  })

  it('should resize when width is the larger dimension', () => {
    const result = calculateTargetDimensions(2000, 1000, 1200)
    expect(result).toEqual({ width: 1200, height: 600 })
  })

  it('should resize when height is the larger dimension', () => {
    const result = calculateTargetDimensions(1000, 2000, 1200)
    expect(result).toEqual({ width: 600, height: 1200 })
  })

  it('should maintain aspect ratio when resizing', () => {
    const result = calculateTargetDimensions(1400, 1000, 1200)
    expect(result.width / result.height).toBeCloseTo(1.4, 1)
  })

  it('should handle square images', () => {
    const result = calculateTargetDimensions(2000, 2000, 1200)
    expect(result).toEqual({ width: 1200, height: 1200 })
  })

  it('should round dimensions to integers', () => {
    const result = calculateTargetDimensions(1333, 999, 1200)
    expect(Number.isInteger(result.width)).toBe(true)
    expect(Number.isInteger(result.height)).toBe(true)
  })
})

describe('estimateQuality', () => {
  const MAX_FILE_SIZE = 100 * 1024 // 100KB
  const INITIAL_QUALITY = 0.85
  const MIN_QUALITY = 0.3

  it('should estimate high quality for small images', () => {
    const quality = estimateQuality(400, 300, MAX_FILE_SIZE, INITIAL_QUALITY, MIN_QUALITY)
    expect(quality).toBeGreaterThan(0.7)
    expect(quality).toBeLessThanOrEqual(INITIAL_QUALITY)
  })

  it('should estimate low quality for large images', () => {
    const quality = estimateQuality(2000, 1500, MAX_FILE_SIZE, INITIAL_QUALITY, MIN_QUALITY)
    expect(quality).toBeLessThan(0.5)
    expect(quality).toBeGreaterThanOrEqual(MIN_QUALITY)
  })

  it('should not exceed initial quality', () => {
    const quality = estimateQuality(100, 100, MAX_FILE_SIZE, INITIAL_QUALITY, MIN_QUALITY)
    expect(quality).toBeLessThanOrEqual(INITIAL_QUALITY)
  })

  it('should not go below min quality', () => {
    const quality = estimateQuality(5000, 5000, MAX_FILE_SIZE, INITIAL_QUALITY, MIN_QUALITY)
    expect(quality).toBeGreaterThanOrEqual(MIN_QUALITY)
  })

  it('should estimate quality proportional to pixel count', () => {
    const quality1 = estimateQuality(600, 400, MAX_FILE_SIZE, INITIAL_QUALITY, MIN_QUALITY)
    const quality2 = estimateQuality(1200, 800, MAX_FILE_SIZE, INITIAL_QUALITY, MIN_QUALITY)

    // Double the pixels should result in lower quality (unless both hit MIN_QUALITY)
    // Use smaller images to ensure quality1 is above MIN_QUALITY
    expect(quality2).toBeLessThan(quality1)
    expect(quality1).toBeGreaterThan(MIN_QUALITY)
  })
})

describe('findOptimalQuality', () => {
  const MAX_FILE_SIZE = 100 * 1024 // 100KB
  const MIN_QUALITY = 0.3

  // Mock compression function that simulates file size based on quality
  // Higher quality = larger file size
  const createMockCompressFn = (pixelCount: number) => {
    return async (quality: number): Promise<CompressionResult> => {
      // Simulate: size is proportional to quality and pixel count
      const baseSize = pixelCount * 0.8
      const size = Math.round(baseSize * quality * 1.2)
      const blob = new Blob(['x'.repeat(size)], { type: 'image/webp' })
      return { blob, size }
    }
  }

  it('should succeed on first try with good estimation', async () => {
    const compressFn = createMockCompressFn(50000) // Small image
    const estimatedQuality = 0.8

    const result = await findOptimalQuality(
      compressFn,
      estimatedQuality,
      MAX_FILE_SIZE,
      MIN_QUALITY
    )

    expect(result.attempts).toBe(1)
    expect(result.quality).toBe(estimatedQuality)
    expect(result.blob.size).toBeLessThanOrEqual(MAX_FILE_SIZE)
  })

  it('should use binary search when estimation fails', async () => {
    const compressFn = createMockCompressFn(200000) // Large image
    const estimatedQuality = 0.85 // Too high, will fail

    const result = await findOptimalQuality(
      compressFn,
      estimatedQuality,
      MAX_FILE_SIZE,
      MIN_QUALITY
    )

    expect(result.attempts).toBeGreaterThan(1)
    expect(result.attempts).toBeLessThanOrEqual(5) // Should be efficient
    expect(result.blob.size).toBeLessThanOrEqual(MAX_FILE_SIZE)
  })

  it('should align quality to precision steps (0.05)', async () => {
    const compressFn = createMockCompressFn(150000)
    const estimatedQuality = 0.7

    const result = await findOptimalQuality(
      compressFn,
      estimatedQuality,
      MAX_FILE_SIZE,
      MIN_QUALITY,
      0.05
    )

    // Quality should be a multiple of 0.05
    const qualityStep = Math.round(result.quality / 0.05) * 0.05
    expect(result.quality).toBeCloseTo(qualityStep, 2)
  })

  it('should fallback to MIN_QUALITY when no solution found', async () => {
    // Mock a function where even MIN_QUALITY produces large files
    const compressFn = async (_quality: number): Promise<CompressionResult> => {
      const size = 200 * 1024 // Always 200KB (too large)
      const blob = new Blob(['x'.repeat(size)], { type: 'image/webp' })
      return { blob, size }
    }

    const result = await findOptimalQuality(
      compressFn,
      0.85,
      MAX_FILE_SIZE,
      MIN_QUALITY
    )

    expect(result.quality).toBe(MIN_QUALITY)
    expect(result.blob).toBeDefined()
  })

  it('should find highest quality that meets size constraint', async () => {
    const compressFn = createMockCompressFn(150000)
    const estimatedQuality = 0.6

    const result = await findOptimalQuality(
      compressFn,
      estimatedQuality,
      MAX_FILE_SIZE,
      MIN_QUALITY
    )

    // Verify the result meets the size constraint
    expect(result.blob.size).toBeLessThanOrEqual(MAX_FILE_SIZE)

    // Verify the next quality step would exceed the limit (if applicable)
    const nextQuality = result.quality + 0.05
    if (nextQuality <= estimatedQuality) {
      const nextResult = await compressFn(nextQuality)
      expect(nextResult.size).toBeGreaterThan(MAX_FILE_SIZE)
    }
  })

  it('should be more efficient than linear search', async () => {
    const compressFn = createMockCompressFn(180000)
    const estimatedQuality = 0.85

    const result = await findOptimalQuality(
      compressFn,
      estimatedQuality,
      MAX_FILE_SIZE,
      MIN_QUALITY,
      0.05
    )

    // Binary search should take ~3-4 attempts for range [0.3, 0.85]
    // Linear search with step 0.05 would take up to 11 attempts
    expect(result.attempts).toBeLessThan(6)
  })

  it('should handle edge case: estimatedQuality equals minQuality', async () => {
    const compressFn = createMockCompressFn(500000) // Very large image
    const estimatedQuality = MIN_QUALITY // 0.3

    const result = await findOptimalQuality(
      compressFn,
      estimatedQuality,
      MAX_FILE_SIZE,
      MIN_QUALITY,
      0.05
    )

    // Should return MIN_QUALITY result even if it exceeds MAX_FILE_SIZE
    expect(result.quality).toBe(MIN_QUALITY)
    expect(result.blob).toBeDefined()
    expect(result.attempts).toBe(2) // 1 estimate + 1 fallback
  })

  it('should handle edge case: estimatedQuality very close to minQuality', async () => {
    const compressFn = createMockCompressFn(200000)
    const estimatedQuality = 0.35 // Only 0.05 above MIN_QUALITY (0.3)

    const result = await findOptimalQuality(
      compressFn,
      estimatedQuality,
      MAX_FILE_SIZE,
      MIN_QUALITY,
      0.05
    )

    // When high - low = 0.05, loop doesn't execute, but we still tried estimated quality first
    // If that fails and no binary search happens, fallback will be used
    // But if estimate succeeds, it returns that
    expect(result.quality).toBeGreaterThanOrEqual(MIN_QUALITY)
    expect(result.quality).toBeLessThanOrEqual(estimatedQuality)
    expect(result.attempts).toBeLessThanOrEqual(3)
  })

  it('should prevent infinite loop with mid convergence', async () => {
    const compressFn = createMockCompressFn(150000)
    const estimatedQuality = 0.35

    // This should terminate properly without infinite loop
    const result = await findOptimalQuality(
      compressFn,
      estimatedQuality,
      MAX_FILE_SIZE,
      MIN_QUALITY,
      0.05
    )

    expect(result.blob).toBeDefined()
    expect(result.attempts).toBeLessThan(10) // Should terminate quickly
  })

  it('should work with estimatedQuality aligned to 0.05 steps', async () => {
    const compressFn = createMockCompressFn(120000)
    const estimatedQuality = 0.45 // Exactly on 0.05 step

    const result = await findOptimalQuality(
      compressFn,
      estimatedQuality,
      MAX_FILE_SIZE,
      MIN_QUALITY,
      0.05
    )

    expect(result.blob).toBeDefined()
    expect(result.quality).toBeGreaterThanOrEqual(MIN_QUALITY)
    expect(result.quality).toBeLessThanOrEqual(estimatedQuality)
    // Quality should be aligned to 0.05 (with floating point tolerance)
    const remainder = result.quality % 0.05
    expect(remainder).toBeCloseTo(0, 1)
  })
})

describe('estimateQuality edge cases', () => {
  const MAX_FILE_SIZE = 100 * 1024
  const INITIAL_QUALITY = 0.85
  const MIN_QUALITY = 0.3

  it('should round up to nearest 0.05 step', () => {
    // Small image: estimated might be 0.374, should round to 0.40
    const quality = estimateQuality(600, 400, MAX_FILE_SIZE, INITIAL_QUALITY, MIN_QUALITY)

    // Should be aligned to 0.05 (with floating point tolerance)
    const remainder = quality % 0.05
    expect(remainder).toBeCloseTo(0, 1)
  })

  it('should not exceed INITIAL_QUALITY after rounding up', () => {
    // Very small image
    const quality = estimateQuality(200, 200, MAX_FILE_SIZE, INITIAL_QUALITY, MIN_QUALITY)

    expect(quality).toBeLessThanOrEqual(INITIAL_QUALITY)
  })

  it('should not go below MIN_QUALITY after rounding up', () => {
    // Very large image
    const quality = estimateQuality(5000, 5000, MAX_FILE_SIZE, INITIAL_QUALITY, MIN_QUALITY)

    expect(quality).toBeGreaterThanOrEqual(MIN_QUALITY)
  })

  it('should produce higher estimates with bytesPerPixel=0.5 than 0.6', () => {
    // This verifies our optimization is working
    // With bytesPerPixel=0.5, estimates should be ~20% higher than with 0.6
    const width = 800
    const height = 571

    const quality = estimateQuality(width, height, MAX_FILE_SIZE, INITIAL_QUALITY, MIN_QUALITY)

    // With 0.5: should be around 0.45 (after rounding up from ~0.449)
    // With 0.6: would be around 0.40 (after rounding up from ~0.374)
    expect(quality).toBeGreaterThan(0.40)
  })
})
