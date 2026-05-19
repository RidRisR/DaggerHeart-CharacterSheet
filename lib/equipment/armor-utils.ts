import { tryParseNumber, tryParseNumberExpression } from "@/lib/number-utils"

export function parseArmorThresholdSide(value: unknown): number | null {
  const parsed = tryParseNumber(value) ?? tryParseNumberExpression(value)
  return parsed === undefined ? null : parsed
}

export function parseArmorMax(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null
  }

  const parsed = tryParseNumber(value) ?? tryParseNumberExpression(value)
  return parsed === undefined ? null : parsed
}

export function parseArmorThreshold(value: unknown): { minor: number | null; major: number | null } {
  if (value !== null && typeof value === "object") {
    const thresholds = value as { minor?: unknown; major?: unknown }

    return {
      minor: parseArmorThresholdSide(thresholds.minor),
      major: parseArmorThresholdSide(thresholds.major),
    }
  }

  const text = String(value ?? "").replace(/[()]/g, "").trim()
  const parts = text.split("/")

  if (parts.length === 1) {
    return {
      minor: parseArmorThresholdSide(parts[0]),
      major: null,
    }
  }

  if (parts.length !== 2) {
    return { minor: null, major: null }
  }

  const [minorRaw, majorRaw] = parts

  return {
    minor: parseArmorThresholdSide(minorRaw),
    major: parseArmorThresholdSide(majorRaw),
  }
}

export function formatArmorThreshold(thresholds: { minor: number | null; major: number | null }): string {
  const { minor, major } = thresholds
  return minor === null || major === null ? "" : `${minor}/${major}`
}
