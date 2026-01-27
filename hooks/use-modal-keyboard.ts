"use client"

import { useEffect } from 'react'

export function useModalKeyboard(
  isOpen: boolean,
  onClose: () => void,
  enabled: boolean = true
) {
  useEffect(() => {
    if (!isOpen || !enabled) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, enabled])
}
