"use client"

import { useEffect, useState } from "react"

interface PageHeaderProps {
  variant?: 'full' | 'text-only'
}

export function PageHeader({ variant = 'full' }: PageHeaderProps) {
  const [openDate, setOpenDate] = useState("")

  useEffect(() => {
    // 获取当前日期并格式化为 YYYYMMDD 格式
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    setOpenDate(`${year}${month}${day}`)
  }, [])

  return (
    <div className="bg-gray-800 text-white p-1.5 flex items-center rounded-t-md mb-2">
      <div className="flex flex-col">
        <div className="text-[9px]">DAGGERHEART P{openDate}</div>
      </div>
    </div>
  )
}