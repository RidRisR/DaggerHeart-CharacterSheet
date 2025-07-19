import React from 'react'
import { render as rtlRender } from '@testing-library/react'
import { ThemeProvider } from 'next-themes'

// 自定义 render 函数，包含所有必要的 providers
function render(ui: React.ReactElement, options = {}) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        {children}
      </ThemeProvider>
    )
  }
  
  return rtlRender(ui, { wrapper: Wrapper, ...options })
}

// 重新导出所有内容
export * from '@testing-library/react'
export { render }