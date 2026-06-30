"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { CharacterMetadata, SheetData } from "@/lib/sheet-data"
import { loadCharacterById, MAX_CHARACTERS } from "@/lib/multi-character-storage"
import { importCharacterFromHTMLFile } from "@/lib/html-importer"
import { validateJSONCharacterData } from "@/lib/character-data-validator"

type MaybePromiseBoolean = boolean | Promise<boolean>

interface CharacterManagementModalProps {
    isOpen: boolean
    onClose: () => void
    characterList: CharacterMetadata[]
    currentCharacterId: string | null
    onSwitchCharacter: (characterId: string) => void | Promise<boolean>
    onCreateCharacter: (saveName: string) => MaybePromiseBoolean
    onCreateImportedCharacter: (saveName: string, importedData: SheetData) => MaybePromiseBoolean
    onDeleteCharacter: (characterId: string) => MaybePromiseBoolean
    onDuplicateCharacter: (characterId: string, newSaveName: string) => MaybePromiseBoolean
    onRenameCharacter: (characterId: string, newSaveName: string) => boolean
}

export function CharacterManagementModal({
    isOpen,
    onClose,
    characterList,
    currentCharacterId,
    onSwitchCharacter,
    onCreateCharacter,
    onCreateImportedCharacter,
    onDeleteCharacter,
    onDuplicateCharacter,
    onRenameCharacter,
}: CharacterManagementModalProps) {
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
                            const success = await onCreateImportedCharacter(saveName, result.data)
                            if (success) {
                                if (result.warnings && result.warnings.length > 0) {
                                    alert(`HTML导入成功并创建新存档"${saveName}"，但有以下警告：\n${result.warnings.join('\n')}`)
                                } else {
                                    alert(`HTML导入成功并创建新存档"${saveName}"`)
                                }
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
                className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-semibold">存档管理</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        ✕
                    </button>
                </div>

                {/* 存档列表 */}
                <div className="flex-1 flex flex-col min-h-0 mb-6">
                    <div className="flex items-center justify-between mb-3 flex-shrink-0">
                        <h3 className="font-medium">所有存档 ({characterList.length}/{MAX_CHARACTERS})</h3>
                        <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            💡 快捷键：Ctrl + 数字键快速切换存档
                        </div>
                    </div>

                    {/* 新建存档按钮 - 固定在列表上方 */}
                    <div
                        className="flex items-center justify-center p-4 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-gray-400 transition-colors cursor-pointer mb-2 flex-shrink-0"
                        onClick={() => {
                            const saveName = prompt('请输入新存档的名称:', '我的存档')
                            if (saveName) {
                                void onCreateCharacter(saveName)
                            }
                        }}
                        style={{ opacity: characterList.length >= MAX_CHARACTERS ? 0.5 : 1, cursor: characterList.length >= MAX_CHARACTERS ? 'not-allowed' : 'pointer' }}
                    >
                        <svg className="w-5 h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span className="font-medium text-gray-700">
                            新建空白存档 ({characterList.length}/{MAX_CHARACTERS})
                        </span>
                    </div>

                    {/* 现有存档列表 - 可滚动区域 */}
                    <div className="space-y-2 overflow-y-auto flex-1 min-h-0">
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
                                                onClick={() => void onSwitchCharacter(character.id)}
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
                                                    void onDuplicateCharacter(character.id, newSaveName)
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
                                            onClick={() => void onDeleteCharacter(character.id)}
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

                {/* 导入操作 */}
                <div className="border-t pt-4 flex-shrink-0">
                    <div className="grid grid-cols-2 gap-3">
                        <Button
                            onClick={() => {
                                const input = document.createElement('input')
                                input.type = 'file'
                                input.accept = '.json'
                                input.onchange = async (e: Event) => {
                                    const file = (e.target as HTMLInputElement).files?.[0]
                                    if (file) {
                                        try {
                                            const reader = new FileReader()
                                            reader.onload = async (e: ProgressEvent<FileReader>) => {
                                                try {
                                                    const jsonString = e.target?.result as string
                                                    const validation = validateJSONCharacterData(jsonString)

                                                    if (validation.valid && validation.data) {
                                                        // 从导入的数据中提取角色名称作为默认存档名
                                                        const characterName = validation.data.name || "未命名角色"
                                                        const defaultSaveName = `${characterName} (导入)`

                                                        // 提示用户输入存档名称
                                                        const saveName = prompt('请输入新存档的名称:', defaultSaveName)
                                                        if (saveName) {
                                                            const success = await onCreateImportedCharacter(saveName, validation.data)
                                                            if (success) {
                                                                if (validation.warnings && validation.warnings.length > 0) {
                                                                    alert(`JSON导入成功并创建新存档"${saveName}"，但有以下警告：\n${validation.warnings.join('\n')}`)
                                                                } else {
                                                                    alert(`JSON导入成功并创建新存档"${saveName}"`)
                                                                }
                                                            }
                                                        }
                                                    } else {
                                                        alert(`导入失败：${validation.error}`)
                                                    }
                                                } catch (error) {
                                                    console.error('JSON Import failed:', error)
                                                    alert('JSON导入失败：文件处理出错')
                                                }
                                            }
                                            reader.readAsText(file)
                                        } catch (error) {
                                            console.error('File reading failed:', error)
                                            alert('文件读取失败')
                                        }
                                    }
                                }
                                input.click()
                            }}
                            disabled={characterList.length >= MAX_CHARACTERS}
                            variant="outline"
                            className="w-full border-green-600 text-green-600 hover:bg-green-50"
                        >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                            </svg>
                            从JSON创建新存档
                        </Button>
                        <Button
                            onClick={handleHTMLImportAndCreate}
                            disabled={characterList.length >= MAX_CHARACTERS}
                            variant="outline"
                            className="w-full border-blue-600 text-blue-600 hover:bg-blue-50"
                        >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                            </svg>
                            从HTML创建新存档
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
