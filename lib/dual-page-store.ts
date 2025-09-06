import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface DualPageStore {
  isDualPageMode: boolean
  leftPageId: string
  rightPageId: string
  leftTabValue: string
  rightTabValue: string
  toggleDualPageMode: () => void
  setLeftPage: (pageId: string) => void
  setRightPage: (pageId: string) => void
  setLeftTab: (tabValue: string) => void
  setRightTab: (tabValue: string) => void
  setDualPageMode: (enabled: boolean) => void
}

export const useDualPageStore = create<DualPageStore>()(
  persist(
    (set) => ({
      isDualPageMode: false,
      leftPageId: 'page1',    // 默认左页显示第一页
      rightPageId: 'page2',   // 默认右页显示第二页
      leftTabValue: 'page1',  // 默认左页tab选中第一页
      rightTabValue: 'page2', // 默认右页tab选中第二页
      
      toggleDualPageMode: () => set((state) => ({ 
        isDualPageMode: !state.isDualPageMode 
      })),
      
      setLeftPage: (pageId: string) => set({ 
        leftPageId: pageId 
      }),
      
      setRightPage: (pageId: string) => set({ 
        rightPageId: pageId 
      }),
      
      setLeftTab: (tabValue: string) => set({ 
        leftTabValue: tabValue,
        leftPageId: tabValue  // 同步更新leftPageId
      }),
      
      setRightTab: (tabValue: string) => set({ 
        rightTabValue: tabValue,
        rightPageId: tabValue  // 同步更新rightPageId
      }),
      
      setDualPageMode: (enabled: boolean) => set({ 
        isDualPageMode: enabled 
      }),
    }),
    {
      name: 'dual-page-storage',
    }
  )
)