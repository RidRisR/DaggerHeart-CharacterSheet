"use client"

import { useMemo, useState } from "react"
import { ChevronDown, Download } from "lucide-react"
import type { MarkdownHeading } from "@/components/guides/markdown-heading-utils"
import { MarkdownGuide } from "@/components/guides/markdown-guide"

export type GuideResource = {
  id: string
  label: string
  description: string
  downloadHref: string
  downloadName: string
  kind: "markdown" | "json"
  content: string
  tocItems?: MarkdownHeading[]
}

export type GuideGroup = {
  id: string
  label: string
  description: string
  resources: GuideResource[]
}

interface GuideReaderProps {
  groups: GuideGroup[]
}

function findResource(groups: GuideGroup[], groupId: string, resourceId: string) {
  const group = groups.find((item) => item.id === groupId) ?? groups[0]
  const resource = group?.resources.find((item) => item.id === resourceId) ?? group?.resources[0]

  return { group, resource }
}

function scrollToHeading(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
}

export function GuideReader({ groups }: GuideReaderProps) {
  const firstGroup = groups[0]
  const [activeGroupId, setActiveGroupId] = useState(firstGroup?.id ?? "")
  const [activeResourceId, setActiveResourceId] = useState(firstGroup?.resources[0]?.id ?? "")
  const [isMobileTocOpen, setIsMobileTocOpen] = useState(false)

  const { group: activeGroup, resource: activeResource } = useMemo(
    () => findResource(groups, activeGroupId, activeResourceId),
    [activeGroupId, activeResourceId, groups],
  )

  if (!activeGroup || !activeResource) {
    return null
  }

  const handleGroupChange = (groupId: string) => {
    const nextGroup = groups.find((item) => item.id === groupId)
    setActiveGroupId(groupId)
    setActiveResourceId(nextGroup?.resources[0]?.id ?? "")
    setIsMobileTocOpen(false)
  }

  const handleResourceChange = (resourceId: string) => {
    setActiveResourceId(resourceId)
    setIsMobileTocOpen(false)
  }

  const tocItems = activeResource.tocItems ?? []

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
      <aside className="lg:sticky lg:top-4">
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="mb-4">
            <p className="text-xs font-medium text-gray-500">内容类型</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {groups.map((group) => {
                const isActive = group.id === activeGroup.id
                return (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => handleGroupChange(group.id)}
                    className={`min-h-11 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? "border-gray-900 bg-gray-900 text-white"
                        : "border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300 hover:bg-white"
                    }`}
                    aria-pressed={isActive}
                  >
                    {group.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="mb-4 lg:hidden">
            <label htmlFor="guide-resource-select" className="mb-2 block text-xs font-medium text-gray-500">
              文档
            </label>
            <select
              id="guide-resource-select"
              value={activeResource.id}
              onChange={(event) => handleResourceChange(event.target.value)}
              className="h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900"
            >
              {activeGroup.resources.map((resource) => (
                <option key={resource.id} value={resource.id}>
                  {resource.label}
                </option>
              ))}
            </select>
          </div>

          <div className="hidden lg:block">
            <p className="mb-2 text-xs font-medium text-gray-500">文档</p>
            <div className="space-y-1">
              {activeGroup.resources.map((resource) => {
                const isActive = resource.id === activeResource.id
                return (
                  <button
                    key={resource.id}
                    type="button"
                    onClick={() => handleResourceChange(resource.id)}
                    className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                      isActive
                        ? "bg-blue-50 font-semibold text-blue-700"
                        : "text-gray-700 hover:bg-gray-50 hover:text-gray-950"
                    }`}
                    aria-pressed={isActive}
                  >
                    {resource.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="mt-4 border-t pt-4">
            <a
              href={activeResource.downloadHref}
              download
              className="flex min-h-11 w-full items-center justify-center rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
            >
              <Download className="mr-2 h-4 w-4" aria-hidden="true" />
              下载当前文档
            </a>
          </div>

          {tocItems.length > 0 ? (
            <div className="mt-4 border-t pt-4">
              <button
                type="button"
                className="flex min-h-11 w-full items-center justify-between rounded-md px-2 text-left text-sm font-semibold text-gray-700 hover:bg-gray-50 lg:hidden"
                aria-expanded={isMobileTocOpen}
                onClick={() => setIsMobileTocOpen((value) => !value)}
              >
                当前文档目录
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${isMobileTocOpen ? "rotate-180" : ""}`}
                  aria-hidden="true"
                />
              </button>
              <div className={`${isMobileTocOpen ? "block" : "hidden"} lg:block`}>
                <p className="mb-2 hidden text-xs font-medium text-gray-500 lg:block">当前文档目录</p>
                <div className="max-h-72 overflow-y-auto pr-1">
                  <div className="space-y-1">
                    {tocItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => scrollToHeading(item.id)}
                        data-target-id={item.id}
                        className={`block w-full rounded-md px-2 py-1.5 text-left text-xs text-gray-600 hover:bg-gray-50 hover:text-gray-950 ${
                          item.level === 1
                            ? "font-semibold text-gray-900"
                            : item.level === 2
                              ? "pl-3 font-medium"
                              : "pl-5"
                        }`}
                        title={item.text}
                      >
                        {item.text}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </aside>

      <article className="min-w-0 rounded-lg border bg-white shadow-sm">
        <header className="border-b px-5 py-5 sm:px-8">
          <p className="mb-2 text-sm text-gray-500">
            内容包创作指南 / {activeGroup.label} / {activeResource.label}
          </p>
          <h1 className="text-2xl font-bold tracking-normal text-gray-950 sm:text-3xl">
            {activeResource.label}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
            {activeResource.description}
          </p>
        </header>

        <div className="min-w-0 px-5 py-6 sm:px-8 sm:py-8">
          {activeResource.kind === "markdown" ? (
            <MarkdownGuide content={activeResource.content} headingIdPrefix={activeResource.id} skipFirstH1 />
          ) : (
            <pre className="max-h-[720px] overflow-auto rounded-lg border bg-slate-950 p-4 text-xs leading-5 text-slate-100">
              <code>{activeResource.content}</code>
            </pre>
          )}
        </div>
      </article>
    </div>
  )
}
