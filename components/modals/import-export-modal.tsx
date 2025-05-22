"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"

interface ImportExportModalProps {
  isOpen: boolean
  onClose: () => void
  onExport: () => void
  onImport: (data: any) => void
  onReset: () => void
}

export function ImportExportModal({ isOpen, onClose, onExport, onImport, onReset }: ImportExportModalProps) {
  const [importError, setImportError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null)

    if (!e.target.files || e.target.files.length === 0) {
      return
    }

    const file = e.target.files[0]

    try {
      // 读取文件内容
      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          if (!event.target?.result) {
            throw new Error("读取文件失败")
          }

          const data = JSON.parse(event.target.result as string)
          onImport(data)
        } catch (error) {
          console.error("导入角色数据失败:", error)
          setImportError("导入失败：文件格式不正确")
        }
      }

      reader.onerror = () => {
        setImportError("导入失败：无法读取文件")
      }

      reader.readAsText(file)
    } catch (error) {
      console.error("导入角色数据失败:", error)
      setImportError("导入失败：处理文件时出错")
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
      <div className="relative bg-white rounded-lg shadow-lg w-full max-w-md p-6">
        <h2 className="text-xl font-bold mb-4">角色数据管理</h2>

        <div className="space-y-4">
          <div>
            <h3 className="font-medium mb-2">导出角色数据</h3>
            <p className="text-sm text-gray-600 mb-2">将当前角色数据导出为JSON文件，以便备份或分享。</p>
            <Button onClick={onExport} className="w-full">
              导出为JSON文件
            </Button>
          </div>

          <div>
            <h3 className="font-medium mb-2">导入角色数据</h3>
            <p className="text-sm text-gray-600 mb-2">从JSON文件导入角色数据，将覆盖当前数据。</p>
            <input type="file" accept=".json" ref={fileInputRef} onChange={handleImport} className="hidden" />
            <Button onClick={() => fileInputRef.current?.click()} className="w-full" variant="outline">
              选择JSON文件
            </Button>
            {importError && <p className="text-sm text-red-500 mt-1">{importError}</p>}
          </div>

          <div>
            <h3 className="font-medium mb-2">重置角色数据</h3>
            <p className="text-sm text-gray-600 mb-2">清除所有角色数据并恢复默认值。此操作不可撤销。</p>
            <Button onClick={onReset} className="w-full" variant="destructive">
              重置所有数据
            </Button>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={onClose} variant="ghost">
            关闭
          </Button>
        </div>
      </div>
    </div>
  )
}
