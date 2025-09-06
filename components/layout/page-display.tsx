"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageSelector } from "@/components/ui/page-selector"
import { PageVisibilityDropdown } from "@/components/ui/page-visibility-dropdown"
import { getTabPages } from "@/lib/page-registry"
import type { SheetData } from "@/lib/sheet-data"

interface PageDisplayProps {
  isDualPageMode: boolean
  isMobile: boolean
  leftPageId: string
  rightPageId: string
  currentTabValue: string
  formData: SheetData
  onSetLeftPage: (id: string) => void
  onSetRightPage: (id: string) => void
  onSetCurrentTab: (id: string) => void
  onSwitchToPrevPage: () => void
  onSwitchToNextPage: () => void
}

export function PageDisplay({
  isDualPageMode,
  isMobile,
  leftPageId,
  rightPageId,
  currentTabValue,
  formData,
  onSetLeftPage,
  onSetRightPage,
  onSetCurrentTab,
  onSwitchToPrevPage,
  onSwitchToNextPage,
}: PageDisplayProps) {
  
  // 生成可见的tab配置
  const getVisibleTabs = () => {
    if (!formData) {
      return []
    }
    return getTabPages(formData)
  }

  return (
    <div className={`relative w-full transition-all duration-300 ${isDualPageMode && !isMobile ? 'md:max-w-[425mm]' : 'md:max-w-[210mm]'}`}>
      
      {/* 双页模式布局 */}
      {isDualPageMode && !isMobile ? (
        <div className="grid grid-cols-2 gap-1 w-[425mm]">
          {/* 左页 */}
          <div className="w-[210mm]">
            <div className="print:hidden mb-3 text-center">
              <PageSelector
                value={leftPageId}
                onValueChange={onSetLeftPage}
                label="左页"
                className="justify-center"
              />
            </div>
            {(() => {
              const leftPage = getTabPages(formData).find(p => p.id === leftPageId)
              if (leftPage) {
                const Component = leftPage.component
                return <Component />
              }
              return <div className="h-full flex items-center justify-center text-gray-400">请选择页面</div>
            })()}
          </div>
          
          {/* 右页 */}
          <div className="w-[210mm]">
            <div className="print:hidden mb-3 text-center">
              <PageSelector
                value={rightPageId}
                onValueChange={onSetRightPage}
                label="右页"
                className="justify-center"
              />
            </div>
            {(() => {
              const rightPage = getTabPages(formData).find(p => p.id === rightPageId)
              if (rightPage) {
                const Component = rightPage.component
                return <Component />
              }
              return <div className="h-full flex items-center justify-center text-gray-400">请选择页面</div>
            })()}
          </div>
        </div>
      ) : (
        /* 单页模式布局（原有布局） */
        <Tabs value={currentTabValue} onValueChange={onSetCurrentTab} className="w-[210mm]">
          {/* 支持移动端滚动的Tab容器 */}
          <div className="w-full overflow-x-auto tabs-container">
            <TabsList className={`grid w-full transition-all duration-300 ease-in-out ${isMobile ? 'h-12' : 'h-10'}`}
              style={{
                gridTemplateColumns: `repeat(${getVisibleTabs().length}, 1fr) auto`
              }}>
              {/* 动态渲染可见的tabs - 填满可用空间 */}
              {getVisibleTabs().map((tab, index) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className={`transition-all duration-200 ease-in-out animate-in slide-in-from-right-2 ${isMobile ? 'py-2.5 text-sm' : 'py-1.5 text-sm'}`}
                  style={{
                    animationDelay: `${index * 50}ms`
                  }}
                >
                  {tab.label}
                </TabsTrigger>
              ))}

              {/* 页面管理下拉菜单 - 固定宽度 */}
              <div className="flex items-center justify-center min-w-[44px]">
                <PageVisibilityDropdown />
              </div>
            </TabsList>
          </div>

          {/* 动态渲染Tab内容 */}
          {getVisibleTabs().map((tab) => {
            const Component = tab.component
            return (
              <TabsContent key={tab.id} value={tab.tabValue || tab.id}>
                <Component />
              </TabsContent>
            )
          })}
        </Tabs>
      )}

      {/* 左侧切换区域 - 仅桌面端单页模式显示 */}
      {!isDualPageMode && (
        <div
          className="print:hidden hidden md:block absolute -left-20 w-16 flex items-center justify-center cursor-pointer group z-20"
          style={{ top: '48px', bottom: 0 }}
          onClick={onSwitchToPrevPage}
          title="上一页 (←) - 循环切换"
        >
          {/* 悬停时显示的背景 */}
          <div className="absolute inset-0 bg-gray-100 opacity-0 group-hover:opacity-50 transition-opacity duration-200 rounded-l-lg"></div>
          {/* 箭头图标 */}
          <div className="relative bg-white shadow-md group-hover:shadow-lg p-2 rounded-full opacity-60 group-hover:opacity-100 transition-all duration-200 group-hover:scale-110 group-active:scale-90">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </div>
        </div>
      )}

      {/* 右侧切换区域 - 仅桌面端单页模式显示 */}
      {!isDualPageMode && (
        <div
          className="print:hidden hidden md:block absolute -right-20 w-16 flex items-center justify-center cursor-pointer group z-20"
          style={{ top: '48px', bottom: 0 }}
          onClick={onSwitchToNextPage}
          title="下一页 (→) - 循环切换"
        >
          {/* 悬停时显示的背景 */}
          <div className="absolute inset-0 bg-gray-100 opacity-0 group-hover:opacity-50 transition-opacity duration-200 rounded-r-lg"></div>
          {/* 箭头图标 */}
          <div className="relative bg-white shadow-md group-hover:shadow-lg p-2 rounded-full opacity-60 group-hover:opacity-100 transition-all duration-200 group-hover:scale-110 group-active:scale-90">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      )}

    </div>
  )
}