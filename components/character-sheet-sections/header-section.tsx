"use client"

import type React from "react"
import { ALL_STANDARD_CARDS } from "@/data/card"

interface HeaderSectionProps {
  formData: any
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  openProfessionModal: () => void
  openAncestryModal: (field: string) => void
  openCommunityModal: () => void
}

export function HeaderSection({
  formData,
  handleInputChange,
  openProfessionModal,
  openAncestryModal,
  openCommunityModal,
}: HeaderSectionProps) {
  return (
    <div className="bg-gray-800 text-white p-2 flex justify-between items-center rounded-t-md">
      <div className="flex flex-col">
        <label className="text-[9px] text-gray-300">职业</label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openProfessionModal}
            className="header-selection-button w-56 bg-white border-gray-400 text-gray-800 text-xl font-bold print:bg-white print:text-black rounded p-1 h-7 text-xs text-left px-2"
          >
            {formData.profession
              ? ALL_STANDARD_CARDS.find(
                  (card) =>
                    (card.id === formData.profession ||
                      (card?.name && card.name.toLowerCase().replace(/\s+/g, "-") === formData.profession)) &&
                    (card.type === "profession" || card.cardClass === "profession"),
                )?.name || "选择职业"
              : "选择职业"}
          </button>
        </div>
        {/* 删除了subtitle显示 */}
        <div className="text-[9px] mt-1">DAGGERHEART OPEN BETA V1.5</div>
      </div>
      <div className="flex flex-col items-center gap-1">
        <div className="flex gap-2">
          <div className="flex flex-col">
            <label className="text-[9px] text-gray-300">NAME</label>
            <input
              type="text"
              name="characterName"
              value={formData.characterName}
              onChange={handleInputChange}
              className="bg-white text-gray-800 border border-gray-400 rounded p-1 focus:outline-none w-40 text-sm print-empty-hide"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-[9px] text-gray-300">COMMUNITY</label>
            <button
              type="button"
              onClick={openCommunityModal}
              className="header-selection-button w-40 bg-white text-gray-800 border-gray-400 rounded p-1 h-7 text-xs print:bg-white print:text-black text-left px-2"
            >
              {formData.community
                ? ALL_STANDARD_CARDS.find(
                    (card) =>
                      (card.id === formData.community ||
                        (card?.name && card.name.toLowerCase().replace(/\s+/g, "-") === formData.community)) &&
                      (card.type === "community" || card.cardClass === "community"),
                  )?.name || "选择社区"
                : "选择社区"}
            </button>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex flex-col">
            <label className="text-[9px] text-gray-300">ANCESTRY</label>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => openAncestryModal("ancestry1")}
                className="header-selection-button w-20 bg-white text-gray-800 border-gray-400 rounded p-1 h-7 text-xs print:bg-white print:text-black text-left px-2"
              >
                {formData.ancestry1
                  ? ALL_STANDARD_CARDS.find(
                      (card) =>
                        (card.id === formData.ancestry1 ||
                          (card?.name && card.name.toLowerCase().replace(/\s+/g, "-") === formData.ancestry1)) &&
                        (card.type === "ancestry" || card.cardClass === "ancestry"),
                    )?.name || "选择血统"
                  : "选择血统"}
              </button>
              <span className="flex items-center text-white text-xs">+</span>
              <button
                type="button"
                onClick={() => openAncestryModal("ancestry2")}
                className="header-selection-button w-20 bg-white text-gray-800 border-gray-400 rounded p-1 h-7 text-xs print:bg-white print:text-black text-left px-2"
              >
                {formData.ancestry2
                  ? ALL_STANDARD_CARDS.find(
                      (card) =>
                        (card.id === formData.ancestry2 ||
                          (card?.name && card.name.toLowerCase().replace(/\s+/g, "-") === formData.ancestry2)) &&
                        (card.type === "ancestry" || card.cardClass === "ancestry"),
                    )?.name || "选择血统"
                  : "选择血统"}
              </button>
            </div>
          </div>
          <div className="flex flex-col">
            <label className="text-[9px] text-gray-300">SUBCLASS</label>
            <input
              type="text"
              name="subclass"
              value={formData.subclass}
              onChange={handleInputChange}
              className="bg-white text-gray-800 border border-gray-400 rounded p-1 focus:outline-none w-40 text-sm print-empty-hide"
            />
          </div>
        </div>
      </div>
      <div className="flex flex-col items-center">
        <div className="w-16 h-16 bg-white text-gray-800 rounded-md border-4 border-gray-600 flex items-center justify-center">
          <div className="text-center">
            <div className="text-xs font-bold">LEVEL</div>
            <input
              type="text"
              name="level"
              value={formData.level}
              onChange={handleInputChange}
              className="w-8 text-center border-b border-gray-400 focus:outline-none text-xl font-bold print-empty-hide"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
