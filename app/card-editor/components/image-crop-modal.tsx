"use client"

import React, { useState, useRef, useCallback } from 'react'
import ReactCrop, { centerCrop, makeAspectCrop, type Crop, type PixelCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  calculateTargetDimensions,
  estimateQuality,
  findOptimalQuality,
  type CompressionResult
} from '@/app/card-editor/utils/image-compression'

interface ImageCropModalProps {
  open: boolean
  onClose: () => void
  onCropComplete: (blob: Blob) => Promise<void>
  sourceFile: File | null
}

const ASPECT_RATIO = 1.4 // Card aspect ratio (width / height = 1.4)
const MAX_FILE_SIZE = 100 * 1024 // Maximum file size: 100KB
const MAX_DIMENSION = 1200 // Maximum width or height in pixels
const INITIAL_QUALITY = 0.85 // Initial WebP compression quality
const MIN_QUALITY = 0.3 // Minimum acceptable quality

/**
 * Image Crop Modal for Card Images
 * Crops images to 10:14 aspect ratio and outputs WebP Blob
 */
export function ImageCropModal({
  open,
  onClose,
  onCropComplete,
  sourceFile
}: ImageCropModalProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null)
  const [processing, setProcessing] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  // Load image when sourceFile changes
  React.useEffect(() => {
    if (sourceFile && open) {
      const reader = new FileReader()
      reader.onload = () => {
        setImageSrc(reader.result as string)
      }
      reader.readAsDataURL(sourceFile)
    } else {
      setImageSrc(null)
      setCrop(undefined)
      setCompletedCrop(null)
    }
  }, [sourceFile, open])

  // Initialize crop when image loads
  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget
    const crop = centerCrop(
      makeAspectCrop(
        {
          unit: '%',
          width: 90,
        },
        ASPECT_RATIO,
        width,
        height
      ),
      width,
      height
    )
    setCrop(crop)
  }, [])

  // Convert cropped area to WebP Blob with size limit
  const getCroppedBlob = useCallback(
    async (
      image: HTMLImageElement,
      crop: PixelCrop
    ): Promise<Blob> => {
      const canvas = document.createElement('canvas')
      const scaleX = image.naturalWidth / image.width
      const scaleY = image.naturalHeight / image.height

      // Calculate crop dimensions at original resolution
      const cropWidth = crop.width * scaleX
      const cropHeight = crop.height * scaleY

      // Calculate target dimensions using pure function
      const { width: targetWidth, height: targetHeight } = calculateTargetDimensions(
        cropWidth,
        cropHeight,
        MAX_DIMENSION
      )

      if (targetWidth !== cropWidth || targetHeight !== cropHeight) {
        console.log(`[ImageCrop] Resizing from ${Math.round(cropWidth)}×${Math.round(cropHeight)} to ${targetWidth}×${targetHeight}`)
      }

      canvas.width = targetWidth
      canvas.height = targetHeight

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        throw new Error('Failed to get canvas context')
      }

      ctx.imageSmoothingQuality = 'high'

      // Draw cropped image with optional scaling
      ctx.drawImage(
        image,
        crop.x * scaleX,
        crop.y * scaleY,
        cropWidth,
        cropHeight,
        0,
        0,
        targetWidth,
        targetHeight
      )

      // Estimate optimal quality using pure function
      const estimated = estimateQuality(
        targetWidth,
        targetHeight,
        MAX_FILE_SIZE,
        INITIAL_QUALITY,
        MIN_QUALITY
      )

      console.log(`[ImageCrop] Estimated quality: ${estimated.toFixed(2)} for ${targetWidth}×${targetHeight}`)

      // Helper function to compress canvas at specific quality
      const compressCanvasToBlob = async (quality: number): Promise<CompressionResult> => {
        return new Promise<CompressionResult>((resolve, reject) => {
          canvas.toBlob(
            (b) => {
              if (b) {
                resolve({ blob: b, size: b.size })
              } else {
                reject(new Error('Failed to create blob'))
              }
            },
            'image/webp',
            quality
          )
        })
      }

      // Find optimal quality using pure function with binary search
      const { blob, quality, attempts } = await findOptimalQuality(
        compressCanvasToBlob,
        estimated,
        MAX_FILE_SIZE,
        MIN_QUALITY
      )

      console.log(`[ImageCrop] Output: ${targetWidth}×${targetHeight}, ${(blob.size / 1024).toFixed(1)}KB, quality: ${quality.toFixed(2)}, attempts: ${attempts}`)
      return blob
    },
    []
  )

  const handleCropComplete = async () => {
    if (!imgRef.current || !completedCrop) return

    setProcessing(true)

    // Yield to browser to update UI before heavy computation
    await new Promise(resolve => setTimeout(resolve, 0))

    try {
      const blob = await getCroppedBlob(imgRef.current, completedCrop)
      await onCropComplete(blob)
      onClose()
    } catch (error) {
      console.error('[ImageCropModal] Failed to crop image:', error)
      alert('图片裁剪失败，请重试')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(open) => !processing && !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto" aria-describedby="crop-dialog-description">
        <DialogHeader>
          <DialogTitle>裁剪卡牌图片</DialogTitle>
        </DialogHeader>

        <div id="crop-dialog-description" className="sr-only">
          裁剪图片以适应卡牌尺寸比例 1.4:1
        </div>

        <div className="space-y-4">
          {imageSrc ? (
            <div className="flex justify-center">
              {!processing ? (
                <ReactCrop
                  crop={crop}
                  onChange={(c) => setCrop(c)}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={ASPECT_RATIO}
                  className="max-h-[60vh]"
                >
                  <img
                    ref={imgRef}
                    src={imageSrc}
                    alt="裁剪源图片"
                    onLoad={onImageLoad}
                    className="max-w-full"
                  />
                </ReactCrop>
              ) : (
                <div className="relative max-h-[60vh]">
                  <img
                    ref={imgRef}
                    src={imageSrc}
                    alt="裁剪源图片"
                    className="max-w-full opacity-50"
                  />
                  <div className="absolute inset-0 flex items-center justify-center text-white text-lg font-semibold">
                    压缩中...
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              加载图片中...
            </div>
          )}

          <div className="text-xs text-muted-foreground text-center">
            拖动边角调整裁剪区域 • 比例: 1.4:1 • 格式: WebP • 目标大小: &lt;100KB
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={processing}
            >
              取消
            </Button>
            <Button
              onClick={handleCropComplete}
              disabled={!completedCrop || processing}
              className="min-w-[80px]"
            >
              {processing ? '压缩中...' : '确定'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
