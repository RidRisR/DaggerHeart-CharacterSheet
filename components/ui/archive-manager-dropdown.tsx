"use client"

import { useState } from "react"
import { Check, Plus, Edit3 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { CharacterMetadata } from "@/lib/sheet-data"
import { MAX_CHARACTERS } from "@/lib/multi-character-storage"

interface ArchiveManagerDropdownProps {
  characterList: CharacterMetadata[]
  currentCharacterId: string | null
  onSwitchCharacter: (characterId: string) => void
  onRenameCharacter: (characterId: string, newSaveName: string) => boolean
  onCreateCharacter: (saveName: string) => boolean
  children: React.ReactNode
}

export function ArchiveManagerDropdown({
  characterList,
  currentCharacterId,
  onSwitchCharacter,
  onRenameCharacter,
  onCreateCharacter,
  children,
}: ArchiveManagerDropdownProps) {
  const [open, setOpen] = useState(false)

  const currentSave = characterList.find(char => char.id === currentCharacterId)

  const handleRename = () => {
    if (!currentCharacterId || !currentSave) return
    
    const newSaveName = prompt('请输入新的存档名称:', currentSave.saveName)
    if (newSaveName && newSaveName.trim() !== currentSave.saveName) {
      onRenameCharacter(currentCharacterId, newSaveName.trim())
    }
    setOpen(false)
  }

  const handleCreateNew = () => {
    const saveName = prompt('请输入新存档的名称:', '我的存档')
    if (saveName && saveName.trim()) {
      onCreateCharacter(saveName.trim())
    }
    setOpen(false)
  }

  const handleSwitchCharacter = (characterId: string) => {
    if (characterId !== currentCharacterId) {
      onSwitchCharacter(characterId)
    }
    setOpen(false)
  }

  const getKeyboardShortcut = (index: number) => {
    if (index < 9) return `Ctrl+${index + 1}`
    if (index === 9) return 'Ctrl+0'
    return ''
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        {children}
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="center" className="w-80 max-h-96 overflow-hidden">
        <DropdownMenuLabel className="text-sm font-medium text-gray-600 px-3 py-2">
          存档管理 ({characterList.length}/{MAX_CHARACTERS})
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {/* 存档列表 */}
        <div className="max-h-64 overflow-y-auto">
          {characterList.map((character, index) => {
            const isActive = character.id === currentCharacterId
            const keyboardShortcut = getKeyboardShortcut(index)
            
            return (
              <DropdownMenuItem
                key={character.id}
                onClick={() => handleSwitchCharacter(character.id)}
                className="flex items-center gap-3 p-3 cursor-pointer"
              >
                <div className="flex-shrink-0 w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs font-medium text-gray-600">
                  {index + 1}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 truncate">
                      {character.saveName}
                    </span>
                    {isActive && <Check className="w-4 h-4 text-blue-600" />}
                  </div>
                  <div className="text-sm text-gray-500 truncate">
                    {new Date(character.lastModified || character.createdAt).toLocaleDateString()}
                  </div>
                </div>
                
                {keyboardShortcut && (
                  <div className="flex-shrink-0 text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                    {keyboardShortcut}
                  </div>
                )}
              </DropdownMenuItem>
            )
          })}
        </div>
        
        <DropdownMenuSeparator />
        
        {/* 快速操作 */}
        <div className="p-1">
          <DropdownMenuItem
            onClick={handleRename}
            className="flex items-center gap-2 p-2 cursor-pointer"
            disabled={!currentCharacterId}
          >
            <Edit3 className="w-4 h-4" />
            重命名当前存档
          </DropdownMenuItem>
          
          <DropdownMenuItem
            onClick={handleCreateNew}
            className="flex items-center gap-2 p-2 cursor-pointer"
            disabled={characterList.length >= MAX_CHARACTERS}
          >
            <Plus className="w-4 h-4" />
            新建存档
            {characterList.length >= MAX_CHARACTERS && (
              <span className="text-xs text-gray-400 ml-auto">(已达上限)</span>
            )}
          </DropdownMenuItem>
        </div>
        
        <DropdownMenuSeparator />
        
        {/* 提示信息 */}
        <div className="p-2 text-xs text-gray-500 bg-gray-50">
          💡 使用 Ctrl+数字键 快速切换存档
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}