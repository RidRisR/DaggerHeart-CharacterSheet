"use client"

import React, { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Upload, X, Image as ImageIcon } from 'lucide-react'
import { toast } from 'sonner'

interface ImageUploadProps {
  cardId: string
  currentImageUrl?: string | null
  onUpload: (cardId: string, file: File) => Promise<void>
  onDelete?: (cardId: string) => Promise<void>
  disabled?: boolean
}

/**
 * Image Upload Component
 * Allows users to upload images for cards with preview
 */
export function ImageUpload({
  cardId,
  currentImageUrl,
  onUpload,
  onDelete,
  disabled = false
}: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('请选择图片文件')
      return
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      toast.error('图片文件不能超过 5MB')
      return
    }

    setUploading(true)

    try {
      // Upload to IndexedDB
      await onUpload(cardId, file)

      // Update preview
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)

      toast.success('图片上传成功')
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('图片上传失败')
    } finally {
      setUploading(false)
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleDelete = async () => {
    if (!onDelete) return

    try {
      await onDelete(cardId)

      // Revoke preview URL
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
        setPreviewUrl(null)
      }

      toast.success('图片已删除')
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('删除失败')
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled || uploading}
        />

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading}
        >
          <Upload className="mr-2 h-4 w-4" />
          {uploading ? '上传中...' : previewUrl ? '更换图片' : '上传图片'}
        </Button>

        {previewUrl && onDelete && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDelete}
            disabled={disabled || uploading}
          >
            <X className="mr-2 h-4 w-4" />
            删除图片
          </Button>
        )}
      </div>

      {previewUrl && (
        <div className="relative w-full h-40 border rounded-md overflow-hidden bg-gray-50">
          <img
            src={previewUrl}
            alt="Preview"
            className="w-full h-full object-contain"
          />
        </div>
      )}

      {!previewUrl && (
        <div className="flex items-center justify-center w-full h-40 border border-dashed rounded-md bg-gray-50">
          <div className="text-center text-gray-400">
            <ImageIcon className="mx-auto h-8 w-8 mb-2" />
            <p className="text-sm">未上传图片</p>
          </div>
        </div>
      )}
    </div>
  )
}
