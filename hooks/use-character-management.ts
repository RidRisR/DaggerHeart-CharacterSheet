import { useState, useEffect, useCallback } from 'react'
import { useSheetStore } from '@/lib/sheet-store'
import {
  migrateToMultiCharacterStorage,
  loadCharacterList,
  loadCharacterById,
  saveCharacterById,
  setActiveCharacterId,
  getActiveCharacterId,
  createNewCharacter,
  addCharacterToMetadataList,
  removeCharacterFromMetadataList,
  updateCharacterInMetadataList,
  MAX_CHARACTERS
} from '@/lib/multi-character-storage'
import { CharacterMetadata } from '@/lib/sheet-data'
import { defaultSheetData } from '@/lib/default-sheet-data'

interface UseCharacterManagementProps {
  isClient: boolean
  setCurrentTabValue: (value: string) => void
}

export function useCharacterManagement({ isClient, setCurrentTabValue }: UseCharacterManagementProps) {
  const { replaceSheetData } = useSheetStore()
  const [currentCharacterId, setCurrentCharacterId] = useState<string | null>(null)
  const [characterList, setCharacterList] = useState<CharacterMetadata[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isMigrationCompleted, setIsMigrationCompleted] = useState(false)

  // 数据迁移处理 - 只在客户端执行
  useEffect(() => {
    if (!isClient) return

    const performMigration = async () => {
      try {
        console.log('[CharacterManagement] Starting data migration check...')
        migrateToMultiCharacterStorage()
        setIsMigrationCompleted(true)
        console.log('[CharacterManagement] Migration completed successfully')
      } catch (error) {
        console.error('[CharacterManagement] Migration failed:', error)
        setIsMigrationCompleted(true)
      }
    }

    performMigration()
  }, [isClient])

  // 加载角色列表和当前角色
  useEffect(() => {
    if (!isClient || !isMigrationCompleted) return

    const loadCharacters = () => {
      try {
        console.log('[CharacterManagement] Loading character list...')
        const listData = loadCharacterList()
        const list = listData.characters
        console.log(`[CharacterManagement] Found ${list.length} characters`)
        setCharacterList(list)

        if (list.length === 0) {
          console.log('[CharacterManagement] No characters found, creating first character')
          createFirstCharacter()
        } else {
          const activeId = getActiveCharacterId() || list[0].id
          console.log(`[CharacterManagement] Loading active character: ${activeId}`)
          switchToCharacter(activeId)
        }
      } catch (error) {
        console.error('[CharacterManagement] Failed to load characters:', error)
        createFirstCharacter()
      } finally {
        setIsLoading(false)
      }
    }

    loadCharacters()
  }, [isClient, isMigrationCompleted])

  // 创建第一个角色
  const createFirstCharacter = useCallback(() => {
    try {
      console.log('[CharacterManagement] Creating first character...')
      const metadata = addCharacterToMetadataList("存档 1")
      
      if (metadata) {
        const newCharacterData = { ...defaultSheetData }
        saveCharacterById(metadata.id, newCharacterData)
        setCharacterList([metadata])
        setCurrentCharacterId(metadata.id)
        setActiveCharacterId(metadata.id)
        replaceSheetData(newCharacterData)
        console.log(`[CharacterManagement] First character created: ${metadata.id}`)
      } else {
        console.error('[CharacterManagement] Failed to create first character metadata')
      }
    } catch (error) {
      console.error('[CharacterManagement] Error creating first character:', error)
    }
  }, [replaceSheetData])

  // 切换角色
  const switchToCharacter = useCallback((characterId: string) => {
    try {
      console.log(`[CharacterManagement] Switching to character: ${characterId}`)
      const characterData = loadCharacterById(characterId)

      if (characterData) {
        setCurrentCharacterId(characterId)
        setActiveCharacterId(characterId)
        replaceSheetData(characterData)
        console.log(`[CharacterManagement] Successfully switched to character: ${characterId}`)
      } else {
        console.error(`[CharacterManagement] Character data not found: ${characterId}`)
        alert('角色数据加载失败')
      }
    } catch (error) {
      console.error(`[CharacterManagement] Error switching to character ${characterId}:`, error)
      alert('切换角色失败')
    }
  }, [replaceSheetData])

  // 创建新角色
  const createNewCharacterHandler = useCallback((saveName: string) => {
    try {
      if (characterList.length >= MAX_CHARACTERS) {
        alert(`最多只能创建${MAX_CHARACTERS}个角色`)
        return false
      }

      console.log(`[CharacterManagement] Creating new save: ${saveName}`)
      const newCharacterData = createNewCharacter("") // 空白角色名，用户后续填写
      const metadata = addCharacterToMetadataList(saveName) // 使用存档名

      if (metadata) {
        saveCharacterById(metadata.id, newCharacterData)
        setCharacterList(prev => [...prev, metadata])
        switchToCharacter(metadata.id)
        console.log(`[CharacterManagement] Successfully created new save: ${metadata.id}`)
        return true
      } else {
        console.error('[CharacterManagement] Failed to create character metadata')
        alert('创建存档失败')
        return false
      }
    } catch (error) {
      console.error(`[CharacterManagement] Error creating new save:`, error)
      alert('创建存档失败')
      return false
    }
  }, [characterList.length, switchToCharacter])

  // 删除角色
  const deleteCharacterHandler = useCallback((characterId: string) => {
    try {
      if (characterList.length <= 1) {
        alert('至少需要保留一个角色')
        return false
      }

      const characterToDelete = characterList.find(c => c.id === characterId)
      if (!characterToDelete) {
        console.error(`[CharacterManagement] Character not found: ${characterId}`)
        return false
      }

      if (!confirm(`确定要删除存档"${characterToDelete.saveName}"吗？此操作不可恢复。`)) {
        return false
      }

      console.log(`[CharacterManagement] Deleting character: ${characterId}`)
      removeCharacterFromMetadataList(characterId)

      const remainingCharacters = characterList.filter(c => c.id !== characterId)
      setCharacterList(remainingCharacters)

      if (currentCharacterId === characterId && remainingCharacters.length > 0) {
        switchToCharacter(remainingCharacters[0].id)
      }

      console.log(`[CharacterManagement] Successfully deleted character: ${characterId}`)
      return true
    } catch (error) {
      console.error(`[CharacterManagement] Error deleting character:`, error)
      alert('删除角色失败')
      return false
    }
  }, [characterList, currentCharacterId, switchToCharacter])

  // 复制角色
  const duplicateCharacterHandler = useCallback((characterId: string, newSaveName: string) => {
    try {
      if (characterList.length >= MAX_CHARACTERS) {
        alert(`最多只能创建${MAX_CHARACTERS}个角色`)
        return false
      }

      console.log(`[CharacterManagement] Duplicating character: ${characterId}`)
      const sourceData = loadCharacterById(characterId)
      
      if (!sourceData) {
        console.error(`[CharacterManagement] Source character not found: ${characterId}`)
        alert('源角色数据不存在')
        return false
      }

      const metadata = addCharacterToMetadataList(newSaveName)
      
      if (metadata) {
        saveCharacterById(metadata.id, sourceData)
        setCharacterList(prev => [...prev, metadata])
        switchToCharacter(metadata.id)
        console.log(`[CharacterManagement] Successfully duplicated character: ${metadata.id}`)
        return true
      } else {
        console.error('[CharacterManagement] Failed to create duplicate character metadata')
        alert('复制角色失败')
        return false
      }
    } catch (error) {
      console.error(`[CharacterManagement] Error duplicating character:`, error)
      alert('复制角色失败')
      return false
    }
  }, [characterList.length, switchToCharacter])

  // 重命名角色
  const renameCharacterHandler = useCallback((characterId: string, newSaveName: string) => {
    try {
      console.log(`[CharacterManagement] Renaming character ${characterId} to: ${newSaveName}`)
      
      // updateCharacterInMetadataList 返回 void，所以我们不检查返回值
      updateCharacterInMetadataList(characterId, { saveName: newSaveName })
      
      // 更新本地状态
      setCharacterList(prev => 
        prev.map(c => c.id === characterId ? { ...c, saveName: newSaveName } : c)
      )
      
      console.log(`[CharacterManagement] Successfully renamed character: ${characterId}`)
      return true
    } catch (error) {
      console.error(`[CharacterManagement] Error renaming character:`, error)
      alert('重命名失败')
      return false
    }
  }, [])

  // 快速创建存档
  const handleQuickCreateArchive = useCallback(() => {
    const nextNumber = characterList.length + 1
    const defaultName = `存档 ${nextNumber}`
    
    const saveName = prompt('请输入存档名称:', defaultName)
    
    if (saveName && saveName.trim()) {
      const success = createNewCharacterHandler(saveName.trim())
      if (success) {
        setCurrentTabValue("page1")
        alert(`已创建新存档: ${saveName.trim()}`)
      }
    }
    // 如果用户取消或输入空名称，则不创建存档
  }, [characterList.length, createNewCharacterHandler, setCurrentTabValue])

  return {
    // 状态
    currentCharacterId,
    characterList,
    isLoading,
    
    // 方法
    switchToCharacter,
    createNewCharacterHandler,
    deleteCharacterHandler,
    duplicateCharacterHandler,
    renameCharacterHandler,
    handleQuickCreateArchive,
  }
}