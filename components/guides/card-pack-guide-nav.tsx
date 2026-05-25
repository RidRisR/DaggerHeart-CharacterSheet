"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import type { MarkdownHeading } from "@/components/guides/markdown-heading-utils"

export interface CardPackGuideNavItem {
  id: string
  label: string
  downloadHref: string
  downloadName: string
  tocItems?: MarkdownHeading[]
}

interface CardPackGuideNavProps {
  items: CardPackGuideNavItem[]
}

export function CardPackGuideNav({ items }: CardPackGuideNavProps) {
  const navRef = useRef<HTMLDivElement>(null)
  const [activeId, setActiveId] = useState(items[0]?.id ?? "")
  const [isTocOpen, setIsTocOpen] = useState(true)

  const activeItem = useMemo(
    () => items.find((item) => item.id === activeId) ?? items[0],
    [activeId, items],
  )
  const activeTocItems = activeItem?.tocItems ?? []

  useEffect(() => {
    const sectionElements = items
      .map((item) => document.getElementById(item.id))
      .filter((element): element is HTMLElement => Boolean(element))

    if (sectionElements.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]

        if (visible?.target.id) {
          setActiveId(visible.target.id)
        }
      },
      {
        rootMargin: "-20% 0px -65% 0px",
        threshold: [0.1, 0.25, 0.5],
      },
    )

    sectionElements.forEach((element) => observer.observe(element))

    return () => observer.disconnect()
  }, [items])

  useEffect(() => {
    if (!isTocOpen || activeTocItems.length === 0) return

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Node) || navRef.current?.contains(target)) return

      setIsTocOpen(false)
    }

    document.addEventListener("pointerdown", handlePointerDown)

    return () => document.removeEventListener("pointerdown", handlePointerDown)
  }, [activeTocItems.length, isTocOpen])

  const scrollToSection = (id: string) => {
    setActiveId(id)
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const scrollToHeading = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  return (
    <div ref={navRef} className="sticky top-0 z-30 mb-8 rounded-lg border bg-white/95 p-3 shadow-sm backdrop-blur">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid grid-cols-3 gap-1 rounded-md bg-gray-100 p-1 text-sm">
          {items.map((item) => {
            const isActive = item.id === activeId
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => scrollToSection(item.id)}
                className={`rounded px-3 py-2 text-center font-medium transition-colors ${
                  isActive
                    ? "bg-white text-gray-950 shadow-sm"
                    : "text-gray-600 hover:bg-white/70 hover:text-gray-950"
                }`}
              >
                {item.label}
              </button>
            )
          })}
        </div>

        {activeItem && (
          <a
            href={activeItem.downloadHref}
            download
            className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-center text-sm font-medium text-blue-700 hover:bg-blue-100"
          >
            下载{activeItem.downloadName}
          </a>
        )}
      </div>

      {activeTocItems.length > 0 && (
        <div className="mt-3 border-t pt-3">
          <button
            type="button"
            onClick={() => setIsTocOpen((value) => !value)}
            className="mb-2 flex w-full items-center justify-between rounded px-2 py-1 text-left text-xs font-semibold text-gray-500 hover:bg-gray-50 hover:text-gray-800"
            aria-expanded={isTocOpen}
          >
            <span>当前文档目录</span>
            {isTocOpen ? (
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
          {isTocOpen && (
            <div className="max-h-52 overflow-y-auto rounded-md bg-gray-50 p-2">
              <div className="flex flex-col gap-1">
                {activeTocItems.map((item) => (
                  <button
                    key={`${activeItem?.id}-${item.id}`}
                    type="button"
                    onClick={() => scrollToHeading(item.id)}
                    className={`truncate rounded px-2 py-1 text-left text-xs hover:bg-white hover:text-gray-950 ${
                      item.level === 1
                        ? "font-semibold text-gray-900"
                        : item.level === 2
                          ? "pl-4 font-medium text-gray-700"
                          : "pl-7 text-gray-600"
                    }`}
                    title={item.text}
                  >
                    {item.text}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
