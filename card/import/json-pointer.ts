export function escapeJsonPointerSegment(segment: string) {
  return segment.replace(/~/g, "~0").replace(/\//g, "~1")
}

export function unescapeJsonPointerSegment(segment: string) {
  return segment.replace(/~1/g, "/").replace(/~0/g, "~")
}

export function joinJsonPointer(segments: Array<string | number>) {
  if (segments.length === 0) return ""
  return `/${segments.map((segment) => escapeJsonPointerSegment(String(segment))).join("/")}`
}

export function appendJsonPointer(base: string, segment: string | number) {
  return base ? `${base}/${escapeJsonPointerSegment(String(segment))}` : `/${escapeJsonPointerSegment(String(segment))}`
}

function getArrayIndex(segment: string) {
  if (segment !== "0" && !/^[1-9]\d*$/.test(segment)) return undefined
  return Number(segment)
}

export function getJsonPointerValue(value: unknown, path: string): unknown {
  if (path === "") return value
  if (!path.startsWith("/")) return undefined

  return path
    .slice(1)
    .split("/")
    .map(unescapeJsonPointerSegment)
    .reduce<unknown>((current, segment) => {
      if (current === undefined || current === null) return undefined
      if (Array.isArray(current)) {
        const index = getArrayIndex(segment)
        return index === undefined ? undefined : current[index]
      }
      if (typeof current === "object") return (current as Record<string, unknown>)[segment]
      return undefined
    }, value)
}
