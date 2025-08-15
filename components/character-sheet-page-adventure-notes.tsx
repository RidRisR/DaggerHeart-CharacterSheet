"use client"

import type React from "react"
import { useSheetStore, useSafeSheetData } from "@/lib/sheet-store"
import { PageHeader } from "@/components/page-header"
import { ImageUploadCrop } from "@/components/ui/image-upload-crop"

export default function CharacterSheetPageAdventureNotes() {
  const { setSheetData: setFormData } = useSheetStore()
  const safeFormData = useSafeSheetData()

  const sectionBannerClass = "bg-gray-700 text-white font-bold py-1 px-3 text-center text-sm tracking-wider uppercase rounded-t-md -mx-px -mt-px"
  const sectionContainerClass = "border-2 border-gray-800 rounded-md"
  const sectionContentClass = "p-2"

  const LabeledInput = ({ label, placeholder, className }: { label: string, placeholder?: string, className?: string }) => (
    <div className={className}>
      <label className="block text-xs font-medium text-gray-600 mb-0.5">{label}</label>
      <input
        type="text"
        className="w-full border-b border-gray-400 bg-transparent focus:outline-none focus:border-blue-500 transition-all duration-150 text-sm print-empty-hide"
        placeholder={placeholder}
      />
    </div>
  )

  const LabeledTextarea = ({ label, placeholder, rows = 2 }: { label: string, placeholder?: string, rows?: number }) => (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <textarea
        rows={rows}
        className="w-full text-xs border border-gray-300 rounded px-2 py-1 bg-gray-50 
                 print:bg-white print:shadow-none focus:outline-none focus:ring-2 focus:ring-blue-200 
                 resize-none shadow-inner print-empty-hide"
        placeholder={placeholder}
      />
    </div>
  )

  return (
    <>
      <div className="w-full max-w-[210mm] mx-auto">
        <div
          className="a4-page p-2 bg-white text-gray-800 shadow-lg print:shadow-none rounded-md"
          style={{ width: "210mm" }}
        >
          <PageHeader />

          {/* 角色名称与角色信息标题 */}
          <div className="flex justify-between items-end mb-3 border-b-2 border-gray-800 pb-2">
            <input
              type="text"
              className="w-2/3 bg-transparent focus:outline-none text-4xl font-bold text-gray-800 print-empty-hide"
              placeholder="角色姓名"
            />
            <h1 className="text-xl font-bold text-gray-600 tracking-wider">角色冒险笔记</h1>
          </div>

          {/* 主要内容区域 - 左侧栏由内容决定宽度 */}
          <div className="grid grid-cols-[auto_1fr] gap-x-4 mb-3">

            {/* 左栏 */}
            <div className="space-y-4">

              {/* 角色形象 - 无外框 */}
              <ImageUploadCrop
                currentImage={safeFormData.characterImage}
                onImageChange={(imageBase64) =>
                  setFormData((prev) => ({ ...prev, characterImage: imageBase64 }))
                }
                width="12rem"
                height="12rem"
                placeholder={{ title: "角色立绘", subtitle: "与首页同步" }}
                inputId="adventure-character-image-upload"
              />

              {/* 角色信息区块 */}
              <div className={sectionContainerClass} style={{ width: "12rem" }}>
                <h4 className={sectionBannerClass}>角色信息</h4>
                <div className={`${sectionContentClass} space-y-3`}>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                    <LabeledInput label="种族" placeholder="种族" />
                    <LabeledInput label="年龄" placeholder="25" />
                    <LabeledInput label="性别" placeholder="男/女" />
                    <LabeledInput label="身高" placeholder="175cm" />
                    <LabeledInput label="体重" placeholder="70kg" />
                    <LabeledInput label="肤色" placeholder="白皙" />
                    <LabeledInput label="瞳色" placeholder="蓝色" />
                    <LabeledInput label="发色" placeholder="棕色" />
                  </div>
                  <div className="space-y-2">
                    <LabeledInput label="出生地" placeholder="翡翠海岸" />
                    <LabeledInput label="信仰/理念" placeholder="保护弱者" />
                  </div>
                </div>
              </div>

              {/* 玩家信息 */}
              <div className={sectionContainerClass} style={{ width: "12rem" }}>
                <h4 className={sectionBannerClass}>玩家信息</h4>
                <div className={`${sectionContentClass} space-y-3`}>
                  <LabeledInput label="玩家昵称" placeholder="输入你的昵称" />
                  <LabeledInput label="跑团偏好" placeholder="文字团/语音团/面团" />
                  <LabeledTextarea label="活动时间" placeholder="周末下午、工作日晚上..." rows={2} />
                  <LabeledTextarea label="游戏风格" placeholder="喜欢角色扮演、重视战术配合..." rows={6} />
                </div>
              </div>
            </div>

            {/* 右栏 */}
            <div className="flex flex-col h-full">

              {/* 角色传记 - 占用所有可用空间 */}
              <div className={`${sectionContainerClass} flex-1 mb-4`}>
                <h4 className={sectionBannerClass}>角色传记</h4>
                <div className={sectionContentClass} style={{ height: "calc(100% - 2rem)" }}>
                  <textarea
                    className="w-full h-full text-xs border border-gray-300 rounded px-2 py-1 bg-gray-50 
                             print:bg-white print:shadow-none focus:outline-none focus:ring-2 focus:ring-blue-200 
                             resize-none shadow-inner print-empty-hide"
                    placeholder="在这里记录你角色的详细背景故事...&#10;&#10;• 出生地和家庭背景&#10;• 成长经历和重要事件&#10;• 性格形成的关键因素&#10;• 目标和动机..."
                  />
                </div>
              </div>

              {/* 冒险履历 */}
              <div className={sectionContainerClass}>
                <h4 className={sectionBannerClass}>冒险履历</h4>
                <div className={sectionContentClass}>
                  {/* 履历条目1 */}
                  <div className="border border-gray-200 rounded p-2 mb-2 bg-gray-50">
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      <LabeledInput label="模组名称" placeholder="失落的矿坑" />
                      <LabeledInput label="等级跨度" placeholder="1-5级" />
                      <LabeledInput label="时间" placeholder="2024年3月" />
                    </div>
                    <LabeledInput label="重要事件" placeholder="击败了巨龙、获得传奇武器..." />
                  </div>

                  {/* 履历条目2 */}
                  <div className="border border-gray-200 rounded p-2 mb-2 bg-gray-50">
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      <LabeledInput label="模组名称" placeholder="模组名称" />
                      <LabeledInput label="等级跨度" placeholder="等级范围" />
                      <LabeledInput label="时间" placeholder="时间" />
                    </div>
                    <LabeledInput label="重要事件" placeholder="记录重要事件..." />
                  </div>

                  {/* 履历条目3 */}
                  <div className="border border-gray-200 rounded p-2 mb-2 bg-gray-50">
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      <LabeledInput label="模组名称" placeholder="模组名称" />
                      <LabeledInput label="等级跨度" placeholder="等级范围" />
                      <LabeledInput label="时间" placeholder="时间" />
                    </div>
                    <LabeledInput label="重要事件" placeholder="记录重要事件..." />
                  </div>

                  {/* 履历条目4 */}
                  <div className="border border-gray-200 rounded p-2 bg-gray-50">
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      <LabeledInput label="模组名称" placeholder="模组名称" />
                      <LabeledInput label="等级跨度" placeholder="等级范围" />
                      <LabeledInput label="时间" placeholder="时间" />
                    </div>
                    <LabeledInput label="重要事件" placeholder="记录重要事件..." />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}