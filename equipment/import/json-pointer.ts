export function escapeJsonPointerSegment(segment: string): string {
  return segment.replace(/~/g, "~0").replace(/\//g, "~1")
}

export function toJsonPointer(segments: Array<string | number>): string {
  if (segments.length === 0) {
    return ""
  }

  return `/${segments.map((segment) => escapeJsonPointerSegment(String(segment))).join("/")}`
}

export function appendJsonPointer(basePath: string, segment: string | number): string {
  const escaped = escapeJsonPointerSegment(String(segment))
  return basePath ? `${basePath}/${escaped}` : `/${escaped}`
}

export function getJsonPointerValue(value: unknown, path: string): unknown {
  if (path === "") {
    return value
  }

  return path
    .split("/")
    .slice(1)
    .map((segment) => segment.replace(/~1/g, "/").replace(/~0/g, "~"))
    .reduce<unknown>((current, segment) => {
      if (current === undefined || current === null) {
        return undefined
      }

      if (Array.isArray(current)) {
        return current[Number(segment)]
      }

      if (typeof current === "object") {
        return (current as Record<string, unknown>)[segment]
      }

      return undefined
    }, value)
}
