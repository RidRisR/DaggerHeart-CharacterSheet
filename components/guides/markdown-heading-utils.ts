import type React from "react"

export interface MarkdownHeading {
  level: number
  text: string
  id: string
}

export const applyHeadingIdPrefix = (id: string, prefix?: string): string =>
  prefix ? `${prefix}-${id}` : id

export const plainTextFromReactNode = (children: React.ReactNode): string => {
  if (typeof children === "string" || typeof children === "number") {
    return String(children)
  }

  if (Array.isArray(children)) {
    return children.map(plainTextFromReactNode).join("")
  }

  if (
    children &&
    typeof children === "object" &&
    "props" in children &&
    children.props &&
    typeof children.props === "object" &&
    "children" in children.props
  ) {
    return plainTextFromReactNode(children.props.children as React.ReactNode)
  }

  return ""
}

export const stripMarkdownHeadingText = (text: string): string =>
  text
    .replace(/^#+\s+/, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`(.*?)`/g, "$1")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .trim()

export const generateHeadingId = (text: string): string =>
  stripMarkdownHeadingText(text)
    .toLowerCase()
    .replace(/[：——]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^\w\u4e00-\u9fff-]/g, "")
    .replace(/^-+|-+$/g, "")

export const extractMarkdownHeadings = (
  content: string,
  maxLevel = 3,
  idPrefix?: string,
): MarkdownHeading[] => {
  const headingRegex = /^(#{1,6})\s+(.+)$/gm
  const headings: MarkdownHeading[] = []
  let match: RegExpExecArray | null

  while ((match = headingRegex.exec(content)) !== null) {
    const level = match[1].length
    if (level > maxLevel) continue

    const text = stripMarkdownHeadingText(match[2])
    headings.push({
      level,
      text,
      id: applyHeadingIdPrefix(generateHeadingId(text), idPrefix),
    })
  }

  return headings
}
