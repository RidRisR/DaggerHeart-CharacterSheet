"use client"

import type React from "react"

interface HitPointsSectionProps {
  formData: any
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  handleMaxChange: (field: string, value: string) => void
  renderBoxes: (field: string, max: number, total: number) => React.ReactNode
}

export function HitPointsSection({ formData, handleInputChange, handleMaxChange, renderBoxes }: HitPointsSectionProps) {
  return (
    <div className="py-1 mb-2">
      <h3 className="text-xs font-bold text-center mb-1">HIT POINTS & STRESS</h3>

      <div className="grid grid-cols-3 mb-1 text-[9px]">
        <div className="text-center">伤害阈值</div>
        <div className="flex items-center">
          <span>Major: </span>
          <input
            type="text"
            name="minorThreshold"
            value={formData.minorThreshold}
            onChange={handleInputChange}
            className="w-6 text-center border border-gray-400 rounded mx-1 print-empty-hide"
          />
        </div>
        <div className="flex items-center justify-start">
          <span className="mr-1">Severe: </span>
          <input
            type="text"
            name="majorThreshold"
            value={formData.majorThreshold}
            onChange={handleInputChange}
            className="w-6 text-center border border-gray-400 rounded print-empty-hide"
          />
        </div>
      </div>

      <div className="flex justify-between mb-1 gap-1">
        <div className="bg-gray-800 text-white text-[9px] p-1 text-center rounded-md flex-1">
          <div>MINOR DAMAGE</div>
          <div className="text-[8px] mt-0.5 text-gray-300">Mark 1 HP</div>
        </div>
        <div className="bg-gray-800 text-white text-[9px] p-1 text-center rounded-md flex-1">
          <div>MAJOR DAMAGE</div>
          <div className="text-[8px] mt-0.5 text-gray-300">Mark 2 HP</div>
        </div>
        <div className="bg-gray-800 text-white text-[9px] p-1 text-center rounded-md flex-1">
          <div>SEVERE DAMAGE</div>
          <div className="text-[8px] mt-0.5 text-gray-300">Mark 3 HP</div>
        </div>
      </div>

      <div className="mb-1">
        <div className="flex items-center justify-between">
          <span className="font-bold mr-2 text-xs">HP</span>
          <div className="flex items-center">
            <span className="text-[9px] mr-1">Max:</span>
            <input
              type="number"
              min="1"
              max="18"
              value={formData.hpMax}
              onChange={(e) => handleMaxChange("hpMax", e.target.value)}
              className="w-8 text-center border border-gray-400 rounded text-xs print-empty-hide print-empty-text"
            />
          </div>
        </div>
        {renderBoxes("hp", formData.hpMax, 18)}

        <div className="flex items-center justify-between mt-1">
          <span className="font-bold mr-2 text-xs">STRESS</span>
          <div className="flex items-center">
            <span className="text-[9px] mr-1">Max:</span>
            <input
              type="number"
              min="1"
              max="12"
              value={formData.stressMax}
              onChange={(e) => handleMaxChange("stressMax", e.target.value)}
              className="w-8 text-center border border-gray-400 rounded text-xs print-empty-hide print-empty-text"
            />
          </div>
        </div>
        {renderBoxes("stress", formData.stressMax, 18)}
      </div>
    </div>
  )
}
