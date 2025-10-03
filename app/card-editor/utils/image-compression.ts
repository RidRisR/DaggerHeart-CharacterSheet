/**
 * Image Compression Utilities
 * Pure functions for image dimension calculation and quality optimization
 */

/**
 * Calculate target dimensions with max dimension constraint
 * @param cropWidth - Original crop width
 * @param cropHeight - Original crop height
 * @param maxDimension - Maximum allowed dimension
 * @returns Target dimensions { width, height }
 */
export function calculateTargetDimensions(
  cropWidth: number,
  cropHeight: number,
  maxDimension: number
): { width: number; height: number } {
  const maxDim = Math.max(cropWidth, cropHeight)
  if (maxDim > maxDimension) {
    const scale = maxDimension / maxDim
    return {
      width: Math.round(cropWidth * scale),
      height: Math.round(cropHeight * scale)
    }
  }
  return { width: cropWidth, height: cropHeight }
}

/**
 * Estimate optimal quality based on image dimensions and target file size
 * @param width - Image width in pixels
 * @param height - Image height in pixels
 * @param maxFileSize - Maximum file size in bytes
 * @param initialQuality - Maximum quality (0-1)
 * @param minQuality - Minimum quality (0-1)
 * @returns Estimated quality value (0-1)
 */
export function estimateQuality(
  width: number,
  height: number,
  maxFileSize: number,
  initialQuality: number,
  minQuality: number
): number {
  const pixelCount = width * height
  // WebP compression: approximately 0.8 bytes per pixel at quality=0.8
  const bytesPerPixel = 0.8
  const estimated = (maxFileSize / (pixelCount * bytesPerPixel)) * 0.85
  return Math.min(initialQuality, Math.max(minQuality, estimated))
}

/**
 * Compression result
 */
export interface CompressionResult {
  blob: Blob
  size: number
}

/**
 * Find optimal quality using binary search
 * @param compressFn - Function to compress at given quality, returns { blob, size }
 * @param estimatedQuality - Initial estimated quality
 * @param maxFileSize - Maximum file size in bytes
 * @param minQuality - Minimum quality (0-1)
 * @param precision - Quality search precision (default: 0.05)
 * @returns Promise<{ blob, quality, attempts }>
 */
export async function findOptimalQuality(
  compressFn: (quality: number) => Promise<CompressionResult>,
  estimatedQuality: number,
  maxFileSize: number,
  minQuality: number,
  precision: number = 0.05
): Promise<{ blob: Blob; quality: number; attempts: number }> {
  // Try estimated quality first
  let result = await compressFn(estimatedQuality)
  let attempts = 1

  if (result.size <= maxFileSize) {
    return { blob: result.blob, quality: estimatedQuality, attempts }
  }

  // Binary search for optimal quality
  let low = minQuality
  let high = estimatedQuality
  let bestBlob: Blob | null = null
  let bestQuality = minQuality

  while (high - low > precision) {
    const mid = Math.round((low + high) / 2 / precision) * precision

    // Prevent infinite loop: if mid equals low or high, break
    if (mid <= low || mid >= high) {
      break
    }

    attempts++
    result = await compressFn(mid)

    if (result.size <= maxFileSize) {
      bestBlob = result.blob
      bestQuality = mid
      low = mid // Try higher quality
    } else {
      high = mid // Need lower quality
    }
  }

  // Fallback: if no suitable quality found, try MIN_QUALITY as last resort
  if (!bestBlob) {
    attempts++
    result = await compressFn(minQuality)
    bestBlob = result.blob
    bestQuality = minQuality
  }

  return { blob: bestBlob, quality: bestQuality, attempts }
}
