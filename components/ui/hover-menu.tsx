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

// 获取菜单定位的CSS类
function getMenuPositionClasses(side: "top" | "bottom" | "left" | "right", align: "start" | "center" | "end"): string {
    let positionClasses = ""
    
    // 设置side定位
    switch (side) {
        case "top":
            positionClasses += "bottom-full mb-2 "
            break
        case "bottom":
            positionClasses += "top-full mt-2 "
            break
        case "left":
            positionClasses += "right-full mr-2 "
            break
        case "right":
            positionClasses += "left-full ml-2 "
            break
    }
    
    // 设置align对齐
    if (side === "top" || side === "bottom") {
        switch (align) {
            case "start":
                positionClasses += "left-0"
                break
            case "center":
                positionClasses += "left-1/2 transform -translate-x-1/2"
                break
            case "end":
                positionClasses += "right-0"
                break
        }
    } else { // left or right
        switch (align) {
            case "start":
                positionClasses += "top-0"
                break
            case "center":
                positionClasses += "top-1/2 transform -translate-y-1/2"
                break
            case "end":
                positionClasses += "bottom-0"
                break
        }
    }
    
    return positionClasses
}

interface HoverMenuProps {
    trigger: ReactNode
    children: ReactNode
    className?: string
    menuClassName?: string
    side?: "top" | "bottom" | "left" | "right"
    align?: "start" | "center" | "end"
}

export function HoverMenu({ trigger, children, className = "", menuClassName = "", side = "left", align = "start" }: HoverMenuProps) {
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

                {/* 悬浮菜单 */}
                {showMenu && (
                    <div
                        className={`absolute bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg py-1 min-w-[120px] z-50 ${getMenuPositionClasses(side, align)} ${menuClassName}`}
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
