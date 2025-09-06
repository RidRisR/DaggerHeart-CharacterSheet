"use client"

import { Button } from '@/components/ui/button'
import { useDualPageStore } from '@/lib/dual-page-store'

// 双页模式图标
const DualPageIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="4" width="7" height="16" rx="1" ry="1"></rect>
    <rect x="14" y="4" width="7" height="16" rx="1" ry="1"></rect>
  </svg>
)

// 单页模式图标
const SinglePageIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="6" y="2" width="12" height="20" rx="2" ry="2"></rect>
    <line x1="12" y1="18" x2="12.01" y2="18"></line>
  </svg>
)

export function DualPageToggle() {
  const { isDualPageMode, toggleDualPageMode } = useDualPageStore()

  return (
    <Button
      onClick={toggleDualPageMode}
      className="bg-gray-800 hover:bg-gray-700 text-white rounded-full p-0 flex items-center justify-center w-12 h-12 text-base"
      title={isDualPageMode ? "切换到单页模式" : "切换到双页模式"}
    >
      {isDualPageMode ? <SinglePageIcon /> : <DualPageIcon />}
    </Button>
  )
}