"use client"

import React, { useState, useRef, useCallback } from 'react'
import ReactCrop, { centerCrop, makeAspectCrop, type Crop, type PixelCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

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
const QUALITY_STEP = 0.1 // Quality reduction step (larger = faster)

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

      // Smart resize: if crop is too large, scale down to MAX_DIMENSION while maintaining aspect ratio
      let targetWidth = cropWidth
      let targetHeight = cropHeight

      const maxDimension = Math.max(cropWidth, cropHeight)
      if (maxDimension > MAX_DIMENSION) {
        const scale = MAX_DIMENSION / maxDimension
        targetWidth = Math.round(cropWidth * scale)
        targetHeight = Math.round(cropHeight * scale)
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

      // Try to compress to under MAX_FILE_SIZE with optimized loop
      let quality = INITIAL_QUALITY
      let blob: Blob | null = null
      let attempts = 0

      while (quality >= MIN_QUALITY) {
        attempts++
        blob = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob(
            (b) => resolve(b),
            'image/webp',
            quality
          )
        })

        if (!blob) {
          throw new Error('Failed to create blob')
        }

        // Check if size is acceptable
        if (blob.size <= MAX_FILE_SIZE) {
          console.log(`[ImageCrop] Output: ${targetWidth}×${targetHeight}, ${(blob.size / 1024).toFixed(1)}KB, quality: ${quality.toFixed(2)}, attempts: ${attempts}`)
          return blob
        }

        // Reduce quality with larger step for faster convergence
        quality -= QUALITY_STEP
      }

      // If we can't get under MAX_FILE_SIZE, return the smallest we got
      console.warn(`[ImageCrop] Could not compress below ${MAX_FILE_SIZE / 1024}KB. Final size: ${(blob!.size / 1024).toFixed(1)}KB after ${attempts} attempts`)
      return blob!
    },
    []
  )

  const handleCropComplete = async () => {
    if (!imgRef.current || !completedCrop) return

    setProcessing(true)
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
            >
              {processing ? '处理中...' : '确定'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
