"use client"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import type { MouseEvent, ReactNode } from "react"
import {
  applyHeadingIdPrefix,
  generateHeadingId,
  plainTextFromReactNode,
} from "@/components/guides/markdown-heading-utils"

interface MarkdownGuideProps {
  content: string
  headingIdPrefix?: string
  skipFirstH1?: boolean
}

const slugifyHeading = (children: ReactNode, idPrefix?: string): string =>
  applyHeadingIdPrefix(generateHeadingId(plainTextFromReactNode(children)), idPrefix)

const normalizeMarkdownHref = (href: string | undefined, idPrefix?: string) => {
  if (!href?.startsWith("#")) {
    return href
  }

  const targetId = href.slice(1)
  if (!targetId) {
    return href
  }

  if (idPrefix && targetId.startsWith(`${idPrefix}-`)) {
    return href
  }

  return `#${applyHeadingIdPrefix(targetId, idPrefix)}`
}

const scrollToAnchor = (event: MouseEvent<HTMLAnchorElement>, href: string | undefined) => {
  if (!href?.startsWith("#")) return

  const encodedAnchorId = href.slice(1)
  if (!encodedAnchorId) return

  let anchorId = encodedAnchorId
  try {
    anchorId = decodeURIComponent(encodedAnchorId)
  } catch {
    anchorId = encodedAnchorId
  }

  const targetElement = document.getElementById(anchorId)
  if (!targetElement) return

  event.preventDefault()
  targetElement.scrollIntoView({ behavior: "smooth", block: "start" })
  window.history.pushState(null, "", href)
}

const removeFirstMarkdownH1 = (content: string) => content.replace(/^# .+(?:\r?\n)+/, "")

export function MarkdownGuide({ content, headingIdPrefix, skipFirstH1 = false }: MarkdownGuideProps) {
  const renderedContent = skipFirstH1 ? removeFirstMarkdownH1(content) : content

  return (
    <div className="max-w-none text-base leading-7 text-gray-700">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => {
            return (
              <h1
                id={slugifyHeading(children, headingIdPrefix)}
                className="mb-6 mt-10 scroll-mt-24 border-b pb-4 text-3xl font-bold tracking-normal text-gray-950 first:mt-0"
              >
                {children}
              </h1>
            )
          },
          h2: ({ children }) => (
            <h2
              id={slugifyHeading(children, headingIdPrefix)}
              className="mb-4 mt-10 scroll-mt-24 border-t pt-6 text-2xl font-semibold tracking-normal text-gray-950 first:mt-0 first:border-t-0 first:pt-0"
            >
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3
              id={slugifyHeading(children, headingIdPrefix)}
              className="mb-3 mt-8 scroll-mt-24 text-xl font-semibold tracking-normal text-gray-900"
            >
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4
              id={slugifyHeading(children, headingIdPrefix)}
              className="mb-2 mt-6 scroll-mt-24 text-lg font-semibold tracking-normal text-gray-800"
            >
              {children}
            </h4>
          ),
          h5: ({ children }) => (
            <h5
              id={slugifyHeading(children, headingIdPrefix)}
              className="mb-2 mt-5 scroll-mt-24 text-base font-semibold tracking-normal text-gray-800"
            >
              {children}
            </h5>
          ),
          p: ({ children }) => <p className="mb-4 max-w-3xl leading-7 text-gray-700">{children}</p>,
          pre: ({ children }) => (
            <pre className="mb-5 max-w-full overflow-auto rounded-lg border bg-slate-950 p-4 text-sm leading-6 text-slate-100">
              {children}
            </pre>
          ),
          code: ({ children, className }) => {
            const isBlock = className?.includes("language-")
            if (isBlock) {
              return <code className={className}>{children}</code>
            }
            return <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-sm text-gray-900">{children}</code>
          },
          blockquote: ({ children }) => (
            <blockquote className="my-5 border-l-4 border-blue-400 bg-blue-50 px-4 py-3 text-gray-700">
              {children}
            </blockquote>
          ),
          ul: ({ children }) => <ul className="mb-4 list-disc space-y-1.5 pl-6 text-gray-700">{children}</ul>,
          ol: ({ children }) => <ol className="mb-4 list-decimal space-y-1.5 pl-6 text-gray-700">{children}</ol>,
          li: ({ children }) => <li className="pl-1 leading-7">{children}</li>,
          table: ({ children }) => (
            <div className="mb-5 max-w-full overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full border-collapse text-sm">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border-b border-r border-gray-200 bg-gray-50 px-3 py-2 text-left font-semibold text-gray-900 last:border-r-0">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b border-r border-gray-200 px-3 py-2 align-top text-gray-700 last:border-r-0">
              {children}
            </td>
          ),
          a: ({ href, children }) => {
            const normalizedHref = normalizeMarkdownHref(href, headingIdPrefix)
            const isInternalAnchor = normalizedHref?.startsWith("#")

            return (
              <a
                href={normalizedHref}
                onClick={(event) => scrollToAnchor(event, normalizedHref)}
                target={isInternalAnchor ? undefined : "_blank"}
                rel={isInternalAnchor ? undefined : "noopener noreferrer"}
                className="font-medium text-blue-700 underline underline-offset-2 hover:text-blue-900"
              >
                {children}
              </a>
            )
          },
        }}
      >
        {renderedContent}
      </ReactMarkdown>
    </div>
  )
}
