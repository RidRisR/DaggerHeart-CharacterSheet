"use client"

import React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useModalKeyboard } from "@/hooks/use-modal-keyboard"
import { cn } from "@/lib/utils"

const sizeClasses = {
  md: 'max-w-4xl max-h-[85vh]',
  lg: 'max-w-6xl max-h-[90vh]',
  xl: 'max-w-7xl max-h-[95vh]',
  full: 'max-w-[95vw] max-h-[95vh]',
}

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
} as const

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 10 },
  visible: {
    opacity: 1, scale: 1, y: 0,
    transition: { type: "spring" as const, damping: 25, stiffness: 300 }
  },
  exit: { opacity: 0, scale: 0.95, y: 10, transition: { duration: 0.15 } }
} as const

interface BaseCardModalProps {
  isOpen: boolean
  onClose: () => void
  size?: 'md' | 'lg' | 'xl' | 'full'
  header: React.ReactNode
  sidebar?: React.ReactNode
  sidebarWidth?: string
  children: React.ReactNode
  closeOnOverlayClick?: boolean
  closeOnEscape?: boolean
  className?: string
  overlayClassName?: string
}

export function BaseCardModal({
  isOpen, onClose, size = 'lg', header, sidebar,
  sidebarWidth = 'w-48', children,
  closeOnOverlayClick = true, closeOnEscape = true,
  className, overlayClassName,
}: BaseCardModalProps) {
  useModalKeyboard(isOpen, onClose, closeOnEscape)

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={cn("fixed inset-0 z-50 flex items-center justify-center", overlayClassName)}
          variants={overlayVariants}
          initial="hidden" animate="visible" exit="hidden"
        >
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={closeOnOverlayClick ? onClose : undefined}
          />
          <motion.div
            className={cn(
              "relative bg-white rounded-lg shadow-lg w-full overflow-hidden flex flex-col",
              sizeClasses[size], className
            )}
            variants={modalVariants}
            initial="hidden" animate="visible" exit="exit"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-gray-200">{header}</div>
            <div className="flex-1 flex overflow-hidden">
              {sidebar && (
                <div className={cn("border-r border-gray-200 overflow-y-auto", sidebarWidth)}>
                  {sidebar}
                </div>
              )}
              <div className="flex-1 overflow-hidden flex flex-col">{children}</div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
