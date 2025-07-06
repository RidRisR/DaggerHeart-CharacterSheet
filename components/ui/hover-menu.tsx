"use client"

import { useState, useEffect, ReactNode, createContext, useContext } from "react"

interface HoverMenuContextType {
    closeMenu: () => void
}

const HoverMenuContext = createContext<HoverMenuContextType | null>(null)

// 全局菜单管理
interface GlobalMenuManagerType {
    registerMenu: (id: string, closeCallback: () => void) => void
    unregisterMenu: (id: string) => void
    closeAllExcept: (exceptId: string) => void
}

class GlobalMenuManager implements GlobalMenuManagerType {
    private menus: Map<string, () => void> = new Map()
    
    registerMenu(id: string, closeCallback: () => void) {
        this.menus.set(id, closeCallback)
    }
    
    unregisterMenu(id: string) {
        this.menus.delete(id)
    }
    
    closeAllExcept(exceptId: string) {
        this.menus.forEach((closeCallback, id) => {
            if (id !== exceptId) {
                closeCallback()
            }
        })
    }
}

const globalMenuManager = new GlobalMenuManager()

interface HoverMenuProps {
    trigger: ReactNode
    children: ReactNode
    className?: string
    menuClassName?: string
}

export function HoverMenu({ trigger, children, className = "", menuClassName = "" }: HoverMenuProps) {
    const [showMenu, setShowMenu] = useState(false)
    const [menuTimeout, setMenuTimeout] = useState<NodeJS.Timeout | null>(null)
    const [menuId] = useState(() => `menu-${Date.now()}-${Math.random()}`)

    const handleMenuEnter = () => {
        if (menuTimeout) {
            clearTimeout(menuTimeout)
            setMenuTimeout(null)
        }
        
        // 关闭其他所有菜单
        globalMenuManager.closeAllExcept(menuId)
        setShowMenu(true)
    }

    const handleMenuLeave = () => {
        const timeout = setTimeout(() => {
            setShowMenu(false)
        }, 150) // 150ms延迟，给用户时间移动到菜单上
        setMenuTimeout(timeout)
    }

    const closeMenu = () => {
        setShowMenu(false)
        if (menuTimeout) {
            clearTimeout(menuTimeout)
            setMenuTimeout(null)
        }
    }

    // 注册和注销菜单
    useEffect(() => {
        globalMenuManager.registerMenu(menuId, closeMenu)
        return () => {
            globalMenuManager.unregisterMenu(menuId)
        }
    }, [menuId])

    // 清理timeout
    useEffect(() => {
        return () => {
            if (menuTimeout) {
                clearTimeout(menuTimeout)
            }
        }
    }, [menuTimeout])

    return (
        <HoverMenuContext.Provider value={{ closeMenu }}>
            <div
                className={`relative ${className}`}
                onMouseEnter={handleMenuEnter}
                onMouseLeave={handleMenuLeave}
            >
                {trigger}

                {/* 悬浮菜单 - 向左弹出 */}
                {showMenu && (
                    <div
                        className={`absolute right-full top-0 mr-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg py-1 min-w-[120px] z-50 ${menuClassName}`}
                        onMouseEnter={handleMenuEnter}
                        onMouseLeave={handleMenuLeave}
                    >
                        {children}
                    </div>
                )}
            </div>
        </HoverMenuContext.Provider>
    )
}

interface HoverMenuItemProps {
    onClick: () => void
    disabled?: boolean
    children: ReactNode
    className?: string
}

export function HoverMenuItem({ onClick, disabled = false, children, className = "" }: HoverMenuItemProps) {
    const context = useContext(HoverMenuContext)

    const handleClick = () => {
        if (!disabled) {
            onClick()
            // 点击后立即关闭菜单
            context?.closeMenu()
        }
    }

    return (
        <button
            onClick={handleClick}
            disabled={disabled}
            className={`w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
        >
            {children}
        </button>
    )
}
