"use client"

import { useEffect, useMemo } from "react"

import { PageVisibilityDropdown } from "@/components/ui/page-visibility-dropdown"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { getTabPages, type PageDefinition } from "@/lib/page-registry"
import type { SheetData } from "@/lib/sheet-data"
import { SheetPageSlotContext } from './sheet-page-slot-context'

interface PageDisplayProps {
  isDualPageMode: boolean
  isMobile: boolean
  leftPageId: string
  rightPageId: string
  leftTabValue: string
  rightTabValue: string
  currentTabValue: string
  formData: SheetData
  onSetLeftTab: (tabValue: string) => void
  onSetRightTab: (tabValue: string) => void
  onSetCurrentTab: (id: string) => void
  onSwitchToPrevPage: () => void
  onSwitchToNextPage: () => void
}

interface PageTabsBarProps {
  ariaLabel: string
  isMobile: boolean
  visibleTabs: PageDefinition[]
}

function PageTabsBar({ ariaLabel, isMobile, visibleTabs }: PageTabsBarProps) {
  return (
    <div className="tabs-container w-full overflow-x-auto print:hidden">
      <TabsList
        aria-label={ariaLabel}
        className={cn(
          "grid w-full rounded-t-lg rounded-b-none border border-b-0 border-border bg-muted/70 p-1 shadow-sm transition-colors duration-200",
          isMobile ? "h-12" : "h-11",
        )}
        style={{
          gridTemplateColumns: `repeat(${visibleTabs.length}, minmax(0, 1fr)) 2.75rem`,
        }}
      >
        {visibleTabs.map((tab) => (
          <TabsTrigger
            key={tab.id}
            value={tab.tabValue || tab.id}
            className="h-full min-w-0 rounded-sm px-2 py-0 text-sm text-muted-foreground transition-colors duration-200 hover:bg-background/60 hover:text-foreground data-[state=active]:text-foreground"
          >
            <span className="truncate">{tab.label}</span>
          </TabsTrigger>
        ))}

        <div className="flex h-full min-w-0 items-center justify-center border-l border-border/70 pl-1">
          <PageVisibilityDropdown />
        </div>
      </TabsList>
    </div>
  )
}

function PageTabContents({ visibleTabs }: Pick<PageTabsBarProps, "visibleTabs">) {
  return (
    <>
      {visibleTabs.map((tab) => {
        const Component = tab.component
        return (
          <TabsContent
            key={tab.id}
            value={tab.tabValue || tab.id}
            className="mt-0 [&_.a4-page]:rounded-t-none"
          >
            <Component />
          </TabsContent>
        )
      })}
    </>
  )
}

export function PageDisplay({
  isDualPageMode,
  isMobile,
  leftTabValue,
  rightTabValue,
  currentTabValue,
  formData,
  onSetLeftTab,
  onSetRightTab,
  onSetCurrentTab,
  onSwitchToPrevPage,
  onSwitchToNextPage,
}: PageDisplayProps) {
  const visibleTabs = useMemo(() => getTabPages(formData), [formData])
  const visibleTabValues = useMemo(
    () => visibleTabs.map((tab) => tab.tabValue || tab.id),
    [visibleTabs],
  )

  useEffect(() => {
    const firstVisibleTab = visibleTabValues[0]
    if (!firstVisibleTab) return

    if (!visibleTabValues.includes(currentTabValue)) {
      onSetCurrentTab(firstVisibleTab)
    }

    const resolvedLeftTab = visibleTabValues.includes(leftTabValue)
      ? leftTabValue
      : firstVisibleTab
    if (resolvedLeftTab !== leftTabValue) {
      onSetLeftTab(resolvedLeftTab)
    }

    if (!visibleTabValues.includes(rightTabValue)) {
      const rightFallback = visibleTabValues.find((tabValue) => tabValue !== resolvedLeftTab)
        || firstVisibleTab
      onSetRightTab(rightFallback)
    }
  }, [
    currentTabValue,
    leftTabValue,
    onSetCurrentTab,
    onSetLeftTab,
    onSetRightTab,
    rightTabValue,
    visibleTabValues,
  ])

  return (
    <div
      className={cn(
        "relative mx-auto w-full transition-all duration-300",
        isDualPageMode && !isMobile ? "md:max-w-[425mm]" : "md:max-w-[210mm]",
      )}
    >
      {isDualPageMode && !isMobile ? (
        <div className="w-full overflow-x-auto">
          <div className="mx-auto grid w-[425mm] min-w-[425mm] grid-cols-2 gap-1 print:block print:w-[210mm] print:min-w-0">
            <div className="w-[210mm]">
              <Tabs value={leftTabValue} onValueChange={onSetLeftTab} className="w-[210mm]">
                <PageTabsBar
                  ariaLabel="左侧角色卡页面"
                  isMobile={false}
                  visibleTabs={visibleTabs}
                />
                <SheetPageSlotContext.Provider value="left"><PageTabContents visibleTabs={visibleTabs} /></SheetPageSlotContext.Provider>
              </Tabs>
            </div>

            <div className={cn('w-[210mm]', leftTabValue === rightTabValue && 'print:hidden')}>
              <Tabs value={rightTabValue} onValueChange={onSetRightTab} className="w-[210mm]">
                <PageTabsBar
                  ariaLabel="右侧角色卡页面"
                  isMobile={false}
                  visibleTabs={visibleTabs}
                />
                <SheetPageSlotContext.Provider value="right"><PageTabContents visibleTabs={visibleTabs} /></SheetPageSlotContext.Provider>
              </Tabs>
            </div>
          </div>
        </div>
      ) : (
        <Tabs value={currentTabValue} onValueChange={onSetCurrentTab} className="w-[210mm]">
          <PageTabsBar
            ariaLabel="角色卡页面"
            isMobile={isMobile}
            visibleTabs={visibleTabs}
          />
          <PageTabContents visibleTabs={visibleTabs} />
        </Tabs>
      )}

      {!isDualPageMode && !isMobile && (
        <div
          className="group absolute -left-20 z-20 hidden w-16 cursor-pointer items-center justify-center print:hidden md:flex"
          style={{ top: "44px", bottom: 0 }}
          onClick={onSwitchToPrevPage}
          title="上一页 (←) - 循环切换"
        >
          <div className="absolute inset-0 rounded-l-lg bg-gray-100 opacity-0 transition-opacity duration-200 group-hover:opacity-50" />
          <div className="relative rounded-full bg-white p-2 opacity-60 shadow-md transition-all duration-200 group-hover:scale-110 group-hover:opacity-100 group-hover:shadow-lg group-active:scale-90">
            <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </div>
        </div>
      )}

      {!isDualPageMode && !isMobile && (
        <div
          className="group absolute -right-20 z-20 hidden w-16 cursor-pointer items-center justify-center print:hidden md:flex"
          style={{ top: "44px", bottom: 0 }}
          onClick={onSwitchToNextPage}
          title="下一页 (→) - 循环切换"
        >
          <div className="absolute inset-0 rounded-r-lg bg-gray-100 opacity-0 transition-opacity duration-200 group-hover:opacity-50" />
          <div className="relative rounded-full bg-white p-2 opacity-60 shadow-md transition-all duration-200 group-hover:scale-110 group-hover:opacity-100 group-hover:shadow-lg group-active:scale-90">
            <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      )}
    </div>
  )
}
