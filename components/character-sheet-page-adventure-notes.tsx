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

  const LabeledInput = ({
    label,
    placeholder,
    value,
    onChange,
    className,
    maxLength = 500
  }: {
    label: string
    placeholder?: string
    value?: string
    onChange: (value: string) => void
    className?: string
    maxLength?: number
  }) => (
    <div className={className}>
      <label className="block text-xs font-medium text-gray-600 mb-0.5">{label}</label>
      <input
        type="text"
        className="w-full border-b border-gray-400 bg-transparent focus:outline-none focus:border-blue-500 transition-all duration-150 text-sm print-empty-hide"
        placeholder={placeholder}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength}
      />
    </div>
  )

  const LabeledTextarea = ({
    label,
    placeholder,
    value,
    onChange,
    rows = 2,
    maxLength = 500
  }: {
    label: string
    placeholder?: string
    value?: string
    onChange: (value: string) => void
    rows?: number
    maxLength?: number
  }) => (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <textarea
        rows={rows}
        className="w-full text-xs border border-gray-300 rounded px-2 py-1 bg-white 
                 print:bg-white print:shadow-none focus:outline-none focus:ring-2 focus:ring-blue-200 
                 resize-none print-empty-hide"
        placeholder={placeholder}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength}
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

          {/* 角色名称与角色简介标题 */}
          <div className="flex justify-between items-end mb-3 border-b-2 border-gray-800 pb-2">
            <input
              type="text"
              className="w-2/3 bg-transparent focus:outline-none text-4xl font-bold text-gray-800 print-empty-hide"
              placeholder="角色姓名"
              value={safeFormData.name || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              maxLength={500}
            />
            <h1 className="text-xl font-bold text-gray-600 tracking-wider">冒险笔记</h1>
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

              {/* 角色简介区块 */}
              <div className={sectionContainerClass} style={{ width: "12rem" }}>
                <h4 className={sectionBannerClass}>角色简介</h4>
                <div className={`${sectionContentClass} space-y-3`}>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                    <LabeledInput
                      label="种族"
                      placeholder="种族"
                      value={safeFormData.adventureNotes?.characterProfile?.race}
                      onChange={(value) => setFormData(prev => ({
                        ...prev,
                        adventureNotes: {
                          ...prev.adventureNotes,
                          characterProfile: {
                            ...prev.adventureNotes?.characterProfile,
                            race: value
                          }
                        }
                      }))}
                    />
                    <LabeledInput
                      label="年龄"
                      placeholder="25"
                      value={safeFormData.adventureNotes?.characterProfile?.age}
                      onChange={(value) => setFormData(prev => ({
                        ...prev,
                        adventureNotes: {
                          ...prev.adventureNotes,
                          characterProfile: {
                            ...prev.adventureNotes?.characterProfile,
                            age: value
                          }
                        }
                      }))}
                    />
                    <LabeledInput
                      label="性别"
                      placeholder="男/女"
                      value={safeFormData.adventureNotes?.characterProfile?.gender}
                      onChange={(value) => setFormData(prev => ({
                        ...prev,
                        adventureNotes: {
                          ...prev.adventureNotes,
                          characterProfile: {
                            ...prev.adventureNotes?.characterProfile,
                            gender: value
                          }
                        }
                      }))}
                    />
                    <LabeledInput
                      label="身高"
                      placeholder="175cm"
                      value={safeFormData.adventureNotes?.characterProfile?.height}
                      onChange={(value) => setFormData(prev => ({
                        ...prev,
                        adventureNotes: {
                          ...prev.adventureNotes,
                          characterProfile: {
                            ...prev.adventureNotes?.characterProfile,
                            height: value
                          }
                        }
                      }))}
                    />
                    <LabeledInput
                      label="体重"
                      placeholder="70kg"
                      value={safeFormData.adventureNotes?.characterProfile?.weight}
                      onChange={(value) => setFormData(prev => ({
                        ...prev,
                        adventureNotes: {
                          ...prev.adventureNotes,
                          characterProfile: {
                            ...prev.adventureNotes?.characterProfile,
                            weight: value
                          }
                        }
                      }))}
                    />
                    <LabeledInput
                      label="肤色"
                      placeholder="白皙"
                      value={safeFormData.adventureNotes?.characterProfile?.skinColor}
                      onChange={(value) => setFormData(prev => ({
                        ...prev,
                        adventureNotes: {
                          ...prev.adventureNotes,
                          characterProfile: {
                            ...prev.adventureNotes?.characterProfile,
                            skinColor: value
                          }
                        }
                      }))}
                    />
                    <LabeledInput
                      label="瞳色"
                      placeholder="蓝色"
                      value={safeFormData.adventureNotes?.characterProfile?.eyeColor}
                      onChange={(value) => setFormData(prev => ({
                        ...prev,
                        adventureNotes: {
                          ...prev.adventureNotes,
                          characterProfile: {
                            ...prev.adventureNotes?.characterProfile,
                            eyeColor: value
                          }
                        }
                      }))}
                    />
                    <LabeledInput
                      label="发色"
                      placeholder="棕色"
                      value={safeFormData.adventureNotes?.characterProfile?.hairColor}
                      onChange={(value) => setFormData(prev => ({
                        ...prev,
                        adventureNotes: {
                          ...prev.adventureNotes,
                          characterProfile: {
                            ...prev.adventureNotes?.characterProfile,
                            hairColor: value
                          }
                        }
                      }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <LabeledInput
                      label="出生地"
                      placeholder="翡翠海岸"
                      value={safeFormData.adventureNotes?.characterProfile?.birthplace}
                      onChange={(value) => setFormData(prev => ({
                        ...prev,
                        adventureNotes: {
                          ...prev.adventureNotes,
                          characterProfile: {
                            ...prev.adventureNotes?.characterProfile,
                            birthplace: value
                          }
                        }
                      }))}
                    />
                    <LabeledInput
                      label="信仰/理念"
                      placeholder="保护弱者"
                      value={safeFormData.adventureNotes?.characterProfile?.faith}
                      onChange={(value) => setFormData(prev => ({
                        ...prev,
                        adventureNotes: {
                          ...prev.adventureNotes,
                          characterProfile: {
                            ...prev.adventureNotes?.characterProfile,
                            faith: value
                          }
                        }
                      }))}
                    />
                    <LabeledTextarea
                      label="其他信息"
                      placeholder="特殊背景、家族关系等..."
                      rows={3}
                      value={safeFormData.adventureNotes?.characterProfile?.otherInfo}
                      onChange={(value) => setFormData(prev => ({
                        ...prev,
                        adventureNotes: {
                          ...prev.adventureNotes,
                          characterProfile: {
                            ...prev.adventureNotes?.characterProfile,
                            otherInfo: value
                          }
                        }
                      }))}
                    />
                  </div>
                </div>
              </div>

              {/* 玩家信息 */}
              <div className={sectionContainerClass} style={{ width: "12rem" }}>
                <h4 className={sectionBannerClass}>玩家信息</h4>
                <div className={`${sectionContentClass} space-y-3`}>
                  <LabeledInput
                    label="昵称"
                    placeholder="输入你的昵称"
                    value={safeFormData.adventureNotes?.playerInfo?.nickname}
                    onChange={(value) => setFormData(prev => ({
                      ...prev,
                      adventureNotes: {
                        ...prev.adventureNotes,
                        playerInfo: {
                          ...prev.adventureNotes?.playerInfo,
                          nickname: value
                        }
                      }
                    }))}
                  />
                  <LabeledInput
                    label="偏好"
                    placeholder="文字团/语音团/面团"
                    value={safeFormData.adventureNotes?.playerInfo?.preference}
                    onChange={(value) => setFormData(prev => ({
                      ...prev,
                      adventureNotes: {
                        ...prev.adventureNotes,
                        playerInfo: {
                          ...prev.adventureNotes?.playerInfo,
                          preference: value
                        }
                      }
                    }))}
                  />
                  <LabeledTextarea
                    label="活动时间"
                    placeholder="周末下午、工作日晚上..."
                    rows={3}
                    value={safeFormData.adventureNotes?.playerInfo?.activeTime}
                    onChange={(value) => setFormData(prev => ({
                      ...prev,
                      adventureNotes: {
                        ...prev.adventureNotes,
                        playerInfo: {
                          ...prev.adventureNotes?.playerInfo,
                          activeTime: value
                        }
                      }
                    }))}
                  />
                  <LabeledTextarea
                    label="游戏风格"
                    placeholder="轻度角色扮演、擅长数值构建、解密苦手..."
                    rows={6}
                    value={safeFormData.adventureNotes?.playerInfo?.playStyle}
                    onChange={(value) => setFormData(prev => ({
                      ...prev,
                      adventureNotes: {
                        ...prev.adventureNotes,
                        playerInfo: {
                          ...prev.adventureNotes?.playerInfo,
                          playStyle: value
                        }
                      }
                    }))}
                  />
                </div>
              </div>
            </div>

            {/* 右栏 */}
            <div className="flex flex-col h-full">

              {/* 背景故事 - 占用所有可用空间 */}
              <div className={`${sectionContainerClass} flex-1 mb-4`}>
                <h4 className={sectionBannerClass}>人物小传</h4>
                <div className={sectionContentClass} style={{ height: "calc(100% - 2rem)" }}>
                  <textarea
                    className="w-full h-full text-xs border border-gray-300 rounded px-2 py-1 bg-white 
                             print:bg-white print:shadow-none focus:outline-none focus:ring-2 focus:ring-blue-200 
                             resize-none print-empty-hide"
                    placeholder="在这里记录你角色的详细背景故事...&#10;&#10;• 出生地和家庭背景&#10;• 成长经历和重要事件&#10;• 性格形成的关键因素&#10;• 目标和动机..."
                    value={safeFormData.adventureNotes?.backstory || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      adventureNotes: {
                        ...prev.adventureNotes,
                        backstory: e.target.value
                      }
                    }))}
                    maxLength={5000}
                  />
                </div>
              </div>

              {/* 大事记 */}
              <div className={`${sectionContainerClass} mb-4`}>
                <h4 className={sectionBannerClass}>大事记</h4>
                <div className={sectionContentClass}>
                  <textarea
                    className="w-full h-40 text-xs border border-gray-300 rounded px-2 py-1 bg-white 
                             print:bg-white print:shadow-none focus:outline-none focus:ring-2 focus:ring-blue-200 
                             resize-none print-empty-hide"
                    placeholder="记录角色生涯中的重要事件和转折点...&#10;&#10;• 重要的人生决定&#10;• 关键的转折时刻&#10;• 获得的荣誉或声望&#10;• 失去的重要事物..."
                    value={safeFormData.adventureNotes?.milestones || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      adventureNotes: {
                        ...prev.adventureNotes,
                        milestones: e.target.value
                      }
                    }))}
                    maxLength={2000}
                  />
                </div>
              </div>

              {/* 冒险履历 */}
              <div className={sectionContainerClass}>
                <h4 className={sectionBannerClass}>冒险履历</h4>
                <div className={sectionContentClass}>
                  {/* 表头 */}
                  <div className="grid grid-cols-4 gap-1.5 mb-2 text-xs font-medium text-gray-600">
                    <div>冒险名称</div>
                    <div>等级跨度</div>
                    <div>创伤</div>
                    <div>时间</div>
                  </div>

                  {/* 履历条目 */}
                  <div className="space-y-1">
                    {Array(8).fill(null).map((_, index) => {
                      const logEntry = safeFormData.adventureNotes?.adventureLog?.[index]
                      const placeholders = index === 0
                        ? ["檀木林的信使", "1-5级", "失去希望", "2025年5月20日"]
                        : ["", "", "", ""]

                      const handleLogChange = (field: 'name' | 'levelRange' | 'trauma' | 'date', value: string) => {
                        setFormData(prev => {
                          const currentLog = prev.adventureNotes?.adventureLog || []
                          const newLog = [...currentLog]

                          // 确保数组有足够的元素
                          while (newLog.length <= index) {
                            newLog.push({ name: '', levelRange: '', trauma: '', date: '' })
                          }

                          newLog[index] = {
                            ...newLog[index],
                            [field]: value
                          }

                          return {
                            ...prev,
                            adventureNotes: {
                              ...prev.adventureNotes,
                              adventureLog: newLog
                            }
                          }
                        })
                      }

                      return (
                        <div key={index} className="grid grid-cols-4 gap-1.5">
                          <input
                            type="text"
                            className="w-full border-b border-gray-400 bg-transparent focus:outline-none focus:border-blue-500 transition-all duration-150 text-sm print-empty-hide"
                            placeholder={placeholders[0]}
                            value={logEntry?.name || ''}
                            onChange={(e) => handleLogChange('name', e.target.value)}
                            maxLength={500}
                          />
                          <input
                            type="text"
                            className="w-full border-b border-gray-400 bg-transparent focus:outline-none focus:border-blue-500 transition-all duration-150 text-sm print-empty-hide"
                            placeholder={placeholders[1]}
                            value={logEntry?.levelRange || ''}
                            onChange={(e) => handleLogChange('levelRange', e.target.value)}
                            maxLength={500}
                          />
                          <input
                            type="text"
                            className="w-full border-b border-gray-400 bg-transparent focus:outline-none focus:border-blue-500 transition-all duration-150 text-sm print-empty-hide"
                            placeholder={placeholders[2]}
                            value={logEntry?.trauma || ''}
                            onChange={(e) => handleLogChange('trauma', e.target.value)}
                            maxLength={500}
                          />
                          <input
                            type="text"
                            className="w-full border-b border-gray-400 bg-transparent focus:outline-none focus:border-blue-500 transition-all duration-150 text-sm print-empty-hide"
                            placeholder={placeholders[3]}
                            value={logEntry?.date || ''}
                            onChange={(e) => handleLogChange('date', e.target.value)}
                            maxLength={500}
                          />
                        </div>
                      )
                    })}
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