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
  MAX_CHARACTERS,
  cleanupOrphanedCharacterData,
} from '@/lib/multi-character-storage'
import type { CharacterMetadata, SheetData } from '@/lib/sheet-data'
import { defaultSheetData } from '@/lib/default-sheet-data'
import { CURRENT_SCHEMA_VERSION } from '@/lib/sheet-schema-version'

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

  const assertCurrentSchemaImportedSheet = (importedData: SheetData): void => {
    const fail = (field: string): never => {
      throw new Error(`Imported sheet must be current-schema: invalid ${field}`)
    }

    const isRecord = (value: unknown): value is Record<string, unknown> =>
      Boolean(value) && typeof value === 'object' && !Array.isArray(value)

    const assertRecord: (value: unknown, field: string) => asserts value is Record<string, unknown> =
      (value, field) => {
        if (!isRecord(value)) fail(field)
      }

    if (!isRecord(importedData)) fail('root')
    if ('includePageThreeInExport' in importedData) fail('includePageThreeInExport')
    if (importedData.schemaVersion !== CURRENT_SCHEMA_VERSION) fail('schemaVersion')
    if (typeof importedData.name !== 'string') fail('name')
    if (typeof importedData.level !== 'string') fail('level')
    if (
      typeof importedData.proficiency !== 'number' &&
      !Array.isArray(importedData.proficiency)
    ) fail('proficiency')
    if (typeof importedData.profession !== 'string') fail('profession')
    if (typeof importedData.community !== 'string') fail('community')
    if (!Array.isArray(importedData.gold)) fail('gold')
    if (!Array.isArray(importedData.experience)) fail('experience')
    if (typeof importedData.hope !== 'number') fail('hope')
    if (!Array.isArray(importedData.inventory)) fail('inventory')
    if (!Array.isArray(importedData.cards)) fail('cards')
    if (!Array.isArray(importedData.inventory_cards)) fail('inventory_cards')

    const trainingOptions = importedData.trainingOptions
    if (!isRecord(trainingOptions)) fail('trainingOptions')
    if (!Array.isArray(trainingOptions.intelligent)) fail('trainingOptions.intelligent')
    if (!Array.isArray(trainingOptions.radiantInDarkness)) fail('trainingOptions.radiantInDarkness')
    if (!Array.isArray(trainingOptions.creatureComfort)) fail('trainingOptions.creatureComfort')
    if (!Array.isArray(trainingOptions.armored)) fail('trainingOptions.armored')
    if (!Array.isArray(trainingOptions.vicious)) fail('trainingOptions.vicious')
    if (!Array.isArray(trainingOptions.resilient)) fail('trainingOptions.resilient')
    if (!Array.isArray(trainingOptions.bonded)) fail('trainingOptions.bonded')
    if (!Array.isArray(trainingOptions.aware)) fail('trainingOptions.aware')

    const rawPageVisibility = importedData.pageVisibility
    assertRecord(rawPageVisibility, 'pageVisibility')
    const pageVisibility: Record<string, unknown> = rawPageVisibility
    if (typeof pageVisibility.rangerCompanion !== 'boolean') fail('pageVisibility.rangerCompanion')
    if (typeof pageVisibility.armorTemplate !== 'boolean') fail('pageVisibility.armorTemplate')
    if (typeof pageVisibility.adventureNotes !== 'boolean') fail('pageVisibility.adventureNotes')

    const equipment = importedData.equipment
    if (!isRecord(equipment)) fail('equipment')
    if (!isRecord(equipment.weaponSlots)) fail('equipment.weaponSlots')
    if (!isRecord(equipment.armorSlot)) fail('equipment.armorSlot')

    const rawArmorTemplate = importedData.armorTemplate
    assertRecord(rawArmorTemplate, 'armorTemplate')
    const armorTemplate: Record<string, unknown> = rawArmorTemplate
    if (!Array.isArray(armorTemplate.upgradeSlots)) fail('armorTemplate.upgradeSlots')
    if (!isRecord(armorTemplate.upgrades)) fail('armorTemplate.upgrades')

    const rawAdventureNotes = importedData.adventureNotes
    assertRecord(rawAdventureNotes, 'adventureNotes')
    const adventureNotes: Record<string, unknown> = rawAdventureNotes
    if (!Array.isArray(adventureNotes.adventureLog)) fail('adventureNotes.adventureLog')

    const rawNotebook = importedData.notebook
    assertRecord(rawNotebook, 'notebook')
    const notebook: Record<string, unknown> = rawNotebook
    if (!Array.isArray(notebook.pages)) fail('notebook.pages')
    if (typeof notebook.currentPageIndex !== 'number') fail('notebook.currentPageIndex')
    if (typeof notebook.isOpen !== 'boolean') fail('notebook.isOpen')
  }

  const activateCharacterData = useCallback((characterId: string, characterData: SheetData) => {
    setCurrentCharacterId(characterId)
    setActiveCharacterId(characterId)
    replaceSheetData(characterData)
  }, [replaceSheetData])

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

        // 清理僵尸数据（在列表加载后，角色切换前）
        const orphanedCount = cleanupOrphanedCharacterData()
        if (orphanedCount > 0) {
          console.log(`[CharacterManagement] Cleaned up ${orphanedCount} zombie character files`)
        }

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
        activateCharacterData(characterId, characterData)
        console.log(`[CharacterManagement] Successfully switched to character: ${characterId}`)
      } else {
        console.error(`[CharacterManagement] Character data not found: ${characterId}`)
        alert('角色数据加载失败')
      }
    } catch (error) {
      console.error(`[CharacterManagement] Error switching to character ${characterId}:`, error)
      alert('切换角色失败')
    }
  }, [activateCharacterData])

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

  const createImportedCharacterHandler = useCallback((saveName: string, importedData: SheetData) => {
    assertCurrentSchemaImportedSheet(importedData)

    if (characterList.length >= MAX_CHARACTERS) {
      alert(`最多只能创建${MAX_CHARACTERS}个角色`)
      return false
    }

    const previousCharacterId = currentCharacterId
    const previousSheetData = useSheetStore.getState().sheetData
    let metadata: CharacterMetadata | null = null

    try {
      console.log(`[CharacterManagement] Creating imported save: ${saveName}`)
      metadata = addCharacterToMetadataList(saveName)

      if (!metadata) {
        console.error('[CharacterManagement] Failed to create imported character metadata')
        alert('创建存档失败')
        return false
      }

      saveCharacterById(metadata.id, importedData)
      activateCharacterData(metadata.id, importedData)
      setCharacterList(prev => [...prev, metadata as CharacterMetadata])
      console.log(`[CharacterManagement] Successfully created imported save: ${metadata.id}`)
      return true
    } catch (error) {
      console.error(`[CharacterManagement] Error creating imported save:`, error)
      alert('创建存档失败')

      if (metadata) {
        try {
          removeCharacterFromMetadataList(metadata.id)
        } catch (cleanupError) {
          console.error(`[CharacterManagement] Failed to clean up imported save ${metadata.id}:`, cleanupError)
        }
      }

      setCurrentCharacterId(previousCharacterId)

      try {
        setActiveCharacterId(previousCharacterId)
      } catch (cleanupError) {
        console.error('[CharacterManagement] Failed to restore previous active character:', cleanupError)
      }

      try {
        replaceSheetData(previousSheetData)
      } catch (cleanupError) {
        console.error('[CharacterManagement] Failed to restore previous sheet data:', cleanupError)
      }

      return false
    }
  }, [activateCharacterData, characterList.length, currentCharacterId, replaceSheetData])

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
    createImportedCharacterHandler,
    deleteCharacterHandler,
    duplicateCharacterHandler,
    renameCharacterHandler,
    handleQuickCreateArchive,
  }
}
