"use client"

import React, { createContext, useContext, useState } from 'react'

interface PrintContextValue {
    isPrinting: boolean
    isPrintingAll: boolean
    setPrintingAll: (printing: boolean) => void
    setPrinting: (printing: boolean) => void
}

const PrintContext = createContext<PrintContextValue | undefined>(undefined)

export function PrintProvider({ children }: { children: React.ReactNode }) {
    const [isPrinting, setPrinting] = useState(false)
    const [isPrintingAll, setPrintingAll] = useState(false)

    return (
        <PrintContext.Provider value={{
            isPrinting,
            isPrintingAll,
            setPrintingAll,
            setPrinting
        }}>
            {children}
        </PrintContext.Provider>
    )
}

export function usePrint() {
    const context = useContext(PrintContext)
    if (context === undefined) {
        throw new Error('usePrint must be used within a PrintProvider')
    }
    return context
}

// 简化的hook，只关心是否在打印状态
export function useIsPrinting() {
    const { isPrinting, isPrintingAll } = usePrint()
    return isPrinting || isPrintingAll
}
