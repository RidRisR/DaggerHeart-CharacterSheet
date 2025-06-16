"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { CharacterMetadata } from "@/lib/sheet-data"
import { loadCharacterById, MAX_CHARACTERS } from "@/lib/multi-character-storage"
import { exportCharacterData } from "@/lib/storage"
import { defaultSheetData } from "@/lib/default-sheet-data"

interface CharacterManagementModalProps {
    isOpen: boolean
    onClose: () => void
    characterList: CharacterMetadata[]
    currentCharacterId: string | null
    formData: any
    onSwitchCharacter: (characterId: string) => void
    onCreateCharacter: (saveName: string) => boolean
    onDeleteCharacter: (characterId: string) => boolean
    onDuplicateCharacter: (characterId: string, newSaveName: string) => boolean
    onRenameCharacter: (characterId: string, newSaveName: string) => boolean
    onImportData: (data: any) => void
    onResetData: () => void
}

export function CharacterManagementModal({
    isOpen,
    onClose,
    characterList,
    currentCharacterId,
    formData,
    onSwitchCharacter,
    onCreateCharacter,
    onDeleteCharacter,
    onDuplicateCharacter,
    onRenameCharacter,
    onImportData
}: CharacterManagementModalProps) {
    if (!isOpen) return null

    // 监听ESC键关闭模态框
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose()
            }
        }

        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown)
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown)
        }
    }, [isOpen, onClose])

    const handleExport = async () => {
        try {
            await exportCharacterData(formData)
        } catch (error) {
            console.error('Export failed:', error)
            alert('导出失败')
        }
    }

    const handleImport = () => {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = '.json'
        input.onchange = (e: Event) => {
            const file = (e.target as HTMLInputElement).files?.[0]
            if (file) {
                const reader = new FileReader()
                reader.onload = (e: ProgressEvent<FileReader>) => {
                    try {
                        const data = JSON.parse(e.target?.result as string)
                        const mergedData = { ...defaultSheetData, ...data, focused_card_ids: data.focused_card_ids || [] }
                        onImportData(mergedData)
                        alert('导入成功')
                    } catch (error) {
                        console.error('Import failed:', error)
                        alert('导入失败：文件格式不正确')
                    }
                }
                reader.readAsText(file)
            }
        }
        input.click()
    }

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={onClose}
        >
            <div 
                className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-semibold">存档管理</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* 当前存档信息 */}
                <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                    <h3 className="font-medium text-blue-900 mb-2">当前存档</h3>
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                            <span className="text-lg font-semibold text-blue-800">
                                {characterList.find(c => c.id === currentCharacterId)?.saveName || "未命名存档"}
                            </span>
                            <span className="text-sm text-blue-700 mt-1">
                                角色名称: {formData.name || "未填写"}
                            </span>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                onClick={handleExport}
                                className="bg-green-600 hover:bg-green-700"
                            >
                                导出
                            </Button>
                            <Button
                                size="sm"
                                onClick={handleImport}
                                variant="outline"
                                className="border-green-600 text-green-600 hover:bg-green-50"
                            >
                                导入
                            </Button>
                        </div>
                    </div>
                </div>

                {/* 存档列表 */}
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium">所有存档 ({characterList.length}/{MAX_CHARACTERS})</h3>
                        <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            💡 快捷键：Ctrl + 数字键快速切换存档
                        </div>
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                        {characterList.map((character, index) => {
                            const characterData = loadCharacterById(character.id);
                            return (
                                <div
                                    key={character.id}
                                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${currentCharacterId === character.id
                                        ? 'bg-blue-100 border-blue-300'
                                        : 'bg-gray-50 hover:bg-gray-100 border-gray-200'
                                        }`}
                                >
                                    <div className="flex items-center flex-1">
                                        <div className="flex-shrink-0 w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm font-medium text-gray-600 mr-3">
                                            {index + 1}
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-medium">{character.saveName}</div>
                                            <div className="text-sm text-gray-500">
                                                角色: {characterData?.name || "未填写"} |
                                                创建：{new Date(character.createdAt).toLocaleDateString()}
                                                {character.lastModified && (
                                                    <span className="ml-2">
                                                        修改：{new Date(character.lastModified).toLocaleDateString()}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        {currentCharacterId !== character.id && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => onSwitchCharacter(character.id)}
                                            >
                                                切换
                                            </Button>
                                        )}
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                                const newSaveName = prompt('请输入新的存档名称:', character.saveName)
                                                if (newSaveName && newSaveName !== character.saveName) {
                                                    onRenameCharacter(character.id, newSaveName)
                                                }
                                            }}
                                        >
                                            重命名
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                                const newSaveName = prompt('请输入复制存档的名称:', `${character.saveName} (副本)`)
                                                if (newSaveName) {
                                                    onDuplicateCharacter(character.id, newSaveName)
                                                }
                                            }}
                                            disabled={characterList.length >= MAX_CHARACTERS}
                                        >
                                            复制
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="text-red-600 hover:text-red-700"
                                            onClick={() => onDeleteCharacter(character.id)}
                                            disabled={characterList.length <= 1}
                                        >
                                            删除
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* 新建存档 */}
                <div className="border-t pt-4">
                    <Button
                        onClick={() => {
                            const saveName = prompt('请输入新存档的名称:', '我的存档')
                            if (saveName) {
                                onCreateCharacter(saveName)
                            }
                        }}
                        disabled={characterList.length >= MAX_CHARACTERS}
                        className="w-full"
                    >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        新建存档 ({characterList.length}/{MAX_CHARACTERS})
                    </Button>
                </div>
            </div>
        </div>
    )
}
