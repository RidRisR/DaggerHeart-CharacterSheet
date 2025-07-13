"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { CharacterMetadata } from "@/lib/sheet-data"
import { loadCharacterById, MAX_CHARACTERS } from "@/lib/multi-character-storage"
import { importCharacterFromHTMLFile } from "@/lib/html-importer"
import { validateJSONCharacterData } from "@/lib/character-data-validator"
import { useSheetStore } from "@/lib/sheet-store"
import { defaultSheetData } from "@/lib/default-sheet-data"

interface CharacterManagementModalProps {
    isOpen: boolean
    onClose: () => void
    characterList: CharacterMetadata[]
    currentCharacterId: string | null
    onSwitchCharacter: (characterId: string) => void
    onCreateCharacter: (saveName: string) => boolean
    onDeleteCharacter: (characterId: string) => boolean
    onDuplicateCharacter: (characterId: string, newSaveName: string) => boolean
    onRenameCharacter: (characterId: string, newSaveName: string) => boolean
}

export function CharacterManagementModal({
    isOpen,
    onClose,
    characterList,
    currentCharacterId,
    onSwitchCharacter,
    onCreateCharacter,
    onDeleteCharacter,
    onDuplicateCharacter,
    onRenameCharacter,
}: CharacterManagementModalProps) {
    const { sheetData: formData, replaceSheetData } = useSheetStore()
    
    const onImportData = (data: any) => {
        // 数据迁移：为旧存档添加缺失字段
        const mergedData = {
            ...defaultSheetData,
            ...data,
            inventory_cards: data.inventory_cards || Array(20).fill({ id: '', name: '', type: 'unknown', description: '' }),
            includePageThreeInExport: data.includePageThreeInExport ?? true // 确保第三页导出字段存在
        }
        replaceSheetData(mergedData)
    }
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

    // 如果模态框没有打开，不渲染任何内容
    if (!isOpen) return null

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
                        const jsonString = e.target?.result as string
                        const validation = validateJSONCharacterData(jsonString)
                        
                        if (validation.valid && validation.data) {
                            onImportData(validation.data)
                            if (validation.warnings && validation.warnings.length > 0) {
                                alert(`导入成功，但有以下警告：\n${validation.warnings.join('\n')}`)
                            } else {
                                alert('导入成功')
                            }
                        } else {
                            alert(`导入失败：${validation.error}`)
                        }
                    } catch (error) {
                        console.error('Import failed:', error)
                        alert('导入失败：文件处理出错')
                    }
                }
                reader.readAsText(file)
            }
        }
        input.click()
    }

    const handleHTMLImport = () => {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = '.html'
        input.onchange = async (e: Event) => {
            const file = (e.target as HTMLInputElement).files?.[0]
            if (file) {
                try {
                    const result = await importCharacterFromHTMLFile(file)
                    if (result.success && result.data) {
                        onImportData(result.data)
                        if (result.warnings && result.warnings.length > 0) {
                            alert(`HTML导入成功，但有以下警告：\n${result.warnings.join('\n')}`)
                        } else {
                            alert('HTML导入成功')
                        }
                    } else {
                        alert(`HTML导入失败：${result.error}`)
                    }
                } catch (error) {
                    console.error('HTML Import failed:', error)
                    alert('HTML导入失败：文件处理出错')
                }
            }
        }
        input.click()
    }

    const handleHTMLImportAndCreate = () => {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = '.html'
        input.onchange = async (e: Event) => {
            const file = (e.target as HTMLInputElement).files?.[0]
            if (file) {
                try {
                    const result = await importCharacterFromHTMLFile(file)
                    if (result.success && result.data) {
                        // 从导入的数据中提取角色名称作为默认存档名
                        const characterName = result.data.name || "未命名角色"
                        const defaultSaveName = `${characterName} (导入)`
                        
                        // 提示用户输入存档名称
                        const saveName = prompt('请输入新存档的名称:', defaultSaveName)
                        if (saveName) {
                            // 先创建新存档
                            const success = onCreateCharacter(saveName)
                            if (success) {
                                // 创建成功后导入数据
                                onImportData(result.data)
                                if (result.warnings && result.warnings.length > 0) {
                                    alert(`HTML导入成功并创建新存档"${saveName}"，但有以下警告：\n${result.warnings.join('\n')}`)
                                } else {
                                    alert(`HTML导入成功并创建新存档"${saveName}"`)
                                }
                            } else {
                                alert('创建新存档失败，可能已达到存档数量上限')
                            }
                        }
                    } else {
                        alert(`HTML导入失败：${result.error}`)
                    }
                } catch (error) {
                    console.error('HTML Import and Create failed:', error)
                    alert('HTML导入失败：文件处理出错')
                }
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
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        ✕
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
                                onClick={handleImport}
                                variant="outline"
                                className="border-green-600 text-green-600 hover:bg-green-50"
                            >
                                从JSON导入
                            </Button>
                            <Button
                                size="sm"
                                onClick={handleHTMLImport}
                                variant="outline"
                                className="border-blue-600 text-blue-600 hover:bg-blue-50"
                            >
                                从HTML导入
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
                    <div className="grid grid-cols-2 gap-3">
                        <Button
                            onClick={() => {
                                const saveName = prompt('请输入新存档的名称:', '我的存档')
                                if (saveName) {
                                    onCreateCharacter(saveName)
                                }
                            }}
                            disabled={characterList.length >= MAX_CHARACTERS}
                            variant="outline"
                            className="w-full text-gray-600 hover:bg-gray-50"
                        >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            新建存档 ({characterList.length}/{MAX_CHARACTERS})
                        </Button>
                        <Button
                            onClick={handleHTMLImportAndCreate}
                            disabled={characterList.length >= MAX_CHARACTERS}
                            variant="outline"
                            className="w-full text-blue-600 hover:bg-blue-50"
                        >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                            </svg>
                            从HTML新建存档 ({characterList.length}/{MAX_CHARACTERS})
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
