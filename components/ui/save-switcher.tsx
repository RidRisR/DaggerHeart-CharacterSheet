"use client"

import { CharacterMetadata } from "@/lib/sheet-data"
import { useTranslation } from "@/lib/i18n"

interface SaveSwitcherProps {
  characterList: CharacterMetadata[]
  currentCharacterId: string | null
  onRenameCharacter: (characterId: string, newSaveName: string) => boolean
}

export function SaveSwitcher({
  characterList,
  currentCharacterId,
  onRenameCharacter,
}: SaveSwitcherProps) {
  const t = useTranslation()
  const currentSave = characterList.find(char => char.id === currentCharacterId)
  const displayName = currentSave?.saveName || t("archive.loading")

  const handleClick = () => {
    if (!currentCharacterId || !currentSave) return
    
    const newSaveName = prompt(t("archive.renamePrompt"), currentSave.saveName)
    if (newSaveName && newSaveName.trim() !== currentSave.saveName) {
      onRenameCharacter(currentCharacterId, newSaveName.trim())
    }
  }

  return (
    <h1 
      className="text-xl font-medium text-gray-900 cursor-pointer hover:text-gray-700 transition-colors duration-200"
      onClick={handleClick}
      title={t("archive.clickToRename")}
    >
      {displayName}
    </h1>
  )
}
