"use client"

import React, { useState, useRef, useEffect } from "react"
import ReactCrop, { centerCrop, makeAspectCrop, type Crop } from "react-image-crop"
import "react-image-crop/dist/ReactCrop.css"

interface ImageUploadCropProps {
    /** 当前图片的 base64 字符串 */
    currentImage?: string
    /** 图片改变时的回调 */
    onImageChange: (imageBase64: string) => void
    /** 图片删除时的回调 */
    onImageDelete?: () => void
    /** 容器的宽度 */
    width?: string | number
    /** 容器的高度 */
    height?: string | number
    /** 占位符文本 */
    placeholder?: {
        title: string
        subtitle: string
    }
    /** 最大图片尺寸（像素） */
    maxImageSize?: number
    /** JPEG 压缩质量 (0-1) */
    jpegQuality?: number
    /** 是否显示删除按钮 */
    showDeleteButton?: boolean
    /** 自定义样式类名 */
    className?: string
    /** 输入框的 ID */
    inputId?: string
}

export const ImageUploadCrop: React.FC<ImageUploadCropProps> = ({
    currentImage,
    onImageChange,
    onImageDelete,
    width = "6rem",
    height = "6rem",
    placeholder = { title: "图像", subtitle: "点击上传" },
    maxImageSize = 500,
    jpegQuality = 0.9,
    showDeleteButton = true,
    className = "",
    inputId,
}) => {
    const [sourceImage, setSourceImage] = useState<string | null>(null)
    const [isCropModalOpen, setIsCropModalOpen] = useState(false)
    const [crop, setCrop] = useState<Crop>()
    const [completedCrop, setCompletedCrop] = useState<Crop | null>(null)
    const imgRef = useRef<HTMLImageElement>(null)

    // 生成唯一的输入框 ID
    const uniqueInputId = inputId || `image-upload-${Math.random().toString(36).substr(2, 9)}`

    // 处理ESC键关闭模态框
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setIsCropModalOpen(false)
            }
        }

        if (isCropModalOpen) {
            document.addEventListener("keydown", handleKeyDown)
        }

        return () => {
            document.removeEventListener("keydown", handleKeyDown)
        }
    }, [isCropModalOpen])

    const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
        if (imgRef.current) {
            const { width, height } = e.currentTarget
            const newCrop = centerCrop(
                makeAspectCrop(
                    {
                        unit: "%",
                        width: 90,
                    },
                    1,
                    width,
                    height,
                ),
                width,
                height,
            )
            setCrop(newCrop)
        }
    }

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0]
            if (file.size > 20 * 1024 * 1024) {
                alert("图片文件过大，请选择小于20MB的图片。")
                return
            }

            // 立即显示模态框，提供即时反馈
            setIsCropModalOpen(true)
            setSourceImage(null) // 先清空图片，显示加载状态
            setCrop(undefined) // 重置裁剪状态

            // 在后台异步加载图片
            const reader = new FileReader()
            reader.addEventListener("load", () => {
                setSourceImage(reader.result as string)
            })
            reader.readAsDataURL(file)
            e.target.value = "" // 重置输入框
        }
    }

    const getCroppedImg = (
        image: HTMLImageElement,
        crop: Crop,
        maxSize: number = maxImageSize,
    ): Promise<string> => {
        const canvas = document.createElement("canvas")
        const scaleX = image.naturalWidth / image.width
        const scaleY = image.naturalHeight / image.height

        // 原始裁剪区域的尺寸
        const cropWidth = crop.width * scaleX
        const cropHeight = crop.height * scaleY

        // 计算缩放比例
        let targetWidth = cropWidth
        let targetHeight = cropHeight
        if (targetWidth > maxSize || targetHeight > maxSize) {
            if (targetWidth > targetHeight) {
                targetHeight = (maxSize / targetWidth) * targetHeight
                targetWidth = maxSize
            } else {
                targetWidth = (maxSize / targetHeight) * targetWidth
                targetHeight = maxSize
            }
        }

        canvas.width = targetWidth
        canvas.height = targetHeight
        const ctx = canvas.getContext("2d")

        if (!ctx) {
            return Promise.reject("Could not get canvas context")
        }

        ctx.imageSmoothingQuality = "high"

        ctx.drawImage(
            image,
            crop.x * scaleX,
            crop.y * scaleY,
            cropWidth,
            cropHeight,
            0,
            0,
            targetWidth,
            targetHeight,
        )

        return new Promise((resolve) => {
            resolve(canvas.toDataURL("image/jpeg", jpegQuality))
        })
    }

    const onCropComplete = async (crop: Crop) => {
        if (imgRef.current && crop.width && crop.height) {
            const croppedImageUrl = await getCroppedImg(imgRef.current, crop)
            onImageChange(croppedImageUrl)
            setIsCropModalOpen(false)
            setSourceImage(null)
        }
    }

    const handleDeleteImage = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation() // 阻止事件冒泡，防止触发文件上传
        if (onImageDelete) {
            onImageDelete()
        } else {
            onImageChange("")
        }
        // 清空文件输入框的值
        const input = document.getElementById(uniqueInputId) as HTMLInputElement
        if (input) {
            input.value = ""
        }
    }

    return (
        <>
            <div
                className={`border-2 border-gray-800 flex flex-col items-center justify-center relative group ${className}`}
                style={{ width, height }}
            >
                <label
                    htmlFor={uniqueInputId}
                    className="w-full h-full flex flex-col items-center justify-center cursor-pointer"
                >
                    {currentImage ? (
                        <img
                            src={currentImage}
                            alt="Uploaded"
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="text-center">
                            <div className="text-[10px] font-bold mb-1 print:hidden">{placeholder.title}</div>
                            <div className="text-[8px] print:hidden">{placeholder.subtitle}</div>
                        </div>
                    )}
                </label>
                <input
                    id={uniqueInputId}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                />
                {currentImage && showDeleteButton && (
                    <button
                        onClick={handleDeleteImage}
                        className="absolute top-0 right-0 w-6 h-6 bg-black bg-opacity-50 text-white flex items-center justify-center rounded-bl-lg hover:bg-opacity-75 print:hidden invisible group-hover:visible z-20"
                        aria-label="Remove image"
                    >
                        &#x2715;
                    </button>
                )}
            </div>

            {/* 图片裁剪模态框 */}
            {isCropModalOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50"
                    onClick={() => setIsCropModalOpen(false)} // 点击蒙版关闭
                >
                    <div className="bg-white p-4 rounded-lg max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
                        <h2 className="text-lg font-bold mb-4">裁剪图片</h2>
                        {sourceImage ? (
                            <ReactCrop
                                crop={crop}
                                onChange={(c) => setCrop(c)}
                                onComplete={(c) => setCompletedCrop(c)}
                                aspect={1}
                            >
                                <img
                                    ref={imgRef}
                                    src={sourceImage}
                                    alt="Source"
                                    style={{ maxHeight: "70vh" }}
                                    onLoad={onImageLoad}
                                />
                            </ReactCrop>
                        ) : (
                            // 显示加载状态
                            <div className="flex justify-center items-center h-64">
                                <div className="text-gray-500">正在加载图片...</div>
                            </div>
                        )}
                        <div className="flex justify-end gap-2 mt-4">
                            <button onClick={() => setIsCropModalOpen(false)} className="px-4 py-2 rounded bg-gray-300">
                                取消
                            </button>
                            <button
                                onClick={() => onCropComplete(completedCrop!)}
                                disabled={!completedCrop?.width || !completedCrop?.height}
                                className="px-4 py-2 rounded bg-blue-500 text-white disabled:bg-gray-400"
                            >
                                确定
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
