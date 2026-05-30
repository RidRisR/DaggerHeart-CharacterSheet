import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ComponentProps } from 'react'
import { CURRENT_SCHEMA_VERSION } from '@/lib/sheet-schema-version'
import { defaultSheetData } from '@/lib/default-sheet-data'
import type { SheetData } from '@/lib/sheet-data'
import { CharacterManagementModal } from '@/components/modals/character-management-modal'
import { importCharacterFromHTMLFile } from '@/lib/html-importer'
import { validateJSONCharacterData } from '@/lib/character-data-validator'

vi.mock('@/lib/html-importer', () => ({
  importCharacterFromHTMLFile: vi.fn(),
}))

vi.mock('@/lib/character-data-validator', () => ({
  validateJSONCharacterData: vi.fn(),
}))

function currentSheet(name: string): SheetData {
  const sheet = {
    ...structuredClone(defaultSheetData),
    schemaVersion: CURRENT_SCHEMA_VERSION,
    name,
  }
  delete (sheet as any).includePageThreeInExport
  return sheet
}

function renderModal(overrides: Partial<ComponentProps<typeof CharacterManagementModal>> = {}) {
  const props: ComponentProps<typeof CharacterManagementModal> = {
    isOpen: true,
    onClose: vi.fn(),
    characterList: [],
    currentCharacterId: null,
    onSwitchCharacter: vi.fn(),
    onCreateCharacter: vi.fn(() => true),
    onCreateImportedCharacter: vi.fn(() => true),
    onDeleteCharacter: vi.fn(() => true),
    onDuplicateCharacter: vi.fn(() => true),
    onRenameCharacter: vi.fn(() => true),
    ...overrides,
  }
  render(<CharacterManagementModal {...props} />)
  return props
}

function installFileInputClick(file: File) {
  const originalCreateElement = document.createElement.bind(document)
  const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tagName: any, options?: any) => {
    const element = originalCreateElement(tagName, options)
    if (String(tagName).toLowerCase() === 'input') {
      Object.defineProperty(element, 'files', {
        configurable: true,
        value: [file],
      })
      vi.spyOn(element, 'click').mockImplementation(() => {
        element.onchange?.({ target: element } as any)
      })
    }
    return element
  })
  return createElementSpy
}

class ImmediateFileReader {
  onload: ((event: ProgressEvent<FileReader>) => void) | null = null
  readAsText() {
    this.onload?.({ target: { result: '{"name":"Json Hero"}' } } as ProgressEvent<FileReader>)
  }
}

describe('CharacterManagementModal import routing', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(window, 'alert').mockImplementation(() => {})
    vi.spyOn(window, 'prompt').mockReturnValue('Imported Save')
  })

  it('routes HTML import through onCreateImportedCharacter', async () => {
    const htmlSheet = currentSheet('Html Hero')
    vi.mocked(importCharacterFromHTMLFile).mockResolvedValue({
      success: true,
      data: htmlSheet,
      warnings: [],
    })
    const fileInputSpy = installFileInputClick(new File(['<html></html>'], 'hero.html', { type: 'text/html' }))
    const props = renderModal()

    fireEvent.click(screen.getByRole('button', { name: /从HTML创建新存档/ }))

    await waitFor(() => {
      expect(props.onCreateImportedCharacter).toHaveBeenCalledWith('Imported Save', htmlSheet)
    })
    expect(props.onCreateCharacter).not.toHaveBeenCalled()
    fileInputSpy.mockRestore()
  })

  it('routes JSON import through onCreateImportedCharacter', async () => {
    const jsonSheet = currentSheet('Json Hero')
    vi.mocked(validateJSONCharacterData).mockReturnValue({
      valid: true,
      data: jsonSheet,
      warnings: [],
    })
    vi.stubGlobal('FileReader', ImmediateFileReader)
    const fileInputSpy = installFileInputClick(new File(['{}'], 'hero.json', { type: 'application/json' }))
    const props = renderModal()

    fireEvent.click(screen.getByRole('button', { name: /从JSON创建新存档/ }))

    await waitFor(() => {
      expect(props.onCreateImportedCharacter).toHaveBeenCalledWith('Imported Save', jsonSheet)
    })
    expect(props.onCreateCharacter).not.toHaveBeenCalled()
    fileInputSpy.mockRestore()
    vi.unstubAllGlobals()
  })
})
