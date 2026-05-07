import { tryParseNumber } from "@/lib/number-utils"

function parseThresholdSide(value: unknown): number | null {
  const parsed = tryParseNumber(value)
  return parsed === undefined ? null : parsed
}

export function parseArmorMax(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null
  }

  const parsed = tryParseNumber(value)
  return parsed === undefined ? null : parsed
}

export function parseArmorThreshold(value: unknown): { minor: number | null; major: number | null } {
  if (value !== null && typeof value === "object") {
    const thresholds = value as { minor?: unknown; major?: unknown }

    return {
      minor: parseThresholdSide(thresholds.minor),
      major: parseThresholdSide(thresholds.major),
    }
  }

  const text = String(value ?? "").replace(/[()]/g, "")
  const parts = text.split("/")

  if (parts.length !== 2) {
    return { minor: null, major: null }
  }

  const [minorRaw, majorRaw] = parts

  return {
    minor: parseThresholdSide(minorRaw),
    major: parseThresholdSide(majorRaw),
  }
}

export function formatArmorThreshold(thresholds: { minor: number | null; major: number | null }): string {
  const { minor, major } = thresholds
  return minor === null || major === null ? "" : `${minor}/${major}`
}
