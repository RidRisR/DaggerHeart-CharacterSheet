"use client"

import { useDualPageStore } from '@/lib/dual-page-store'

// 双页模式图标
const DualPageIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
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
    width="20"
    height="20"
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
    <div
      className="bg-gray-200 dark:bg-gray-700 rounded-full p-0.5 shadow-md cursor-pointer transition-all duration-200 hover:shadow-lg scale-90"
      onClick={toggleDualPageMode}
    >
      <div className="flex items-center">
        <div
          className={`
            px-2 py-1 rounded-full flex items-center gap-1 transition-all duration-300 text-xs
            ${!isDualPageMode
              ? 'bg-white dark:bg-gray-900 shadow-sm'
              : 'text-gray-500 dark:text-gray-400'
            }
          `}
        >
          <SinglePageIcon />
          <span className="font-medium">单页</span>
        </div>
        <div
          className={`
            px-2 py-1 rounded-full flex items-center gap-1 transition-all duration-300 text-xs
            ${isDualPageMode
              ? 'bg-white dark:bg-gray-900 shadow-sm'
              : 'text-gray-500 dark:text-gray-400'
            }
          `}
        >
          <DualPageIcon />
          <span className="font-medium">双页</span>
        </div>
      </div>
    </div>
  )
}