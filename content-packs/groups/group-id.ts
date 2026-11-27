const GROUP_ID_PREFIX = "group_"
const MAX_GENERATION_ATTEMPTS = 32

export interface CreateContentPackGroupIdInput {
  now?: Date
  random?: () => number
  exists?: (candidate: string) => boolean
}

export function createContentPackGroupId(input: CreateContentPackGroupIdInput = {}): string | null {
  const now = input.now ?? new Date()
  const random = input.random ?? Math.random
  const exists = input.exists ?? (() => false)
  const timestamp = now.getTime()

  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt += 1) {
    const suffix = Math.floor(random() * 0xffffffff)
      .toString(36)
      .padStart(6, "0")
      .slice(0, 6)
    const candidate = `${GROUP_ID_PREFIX}${timestamp}_${suffix}`
    if (!exists(candidate)) {
      return candidate
    }
  }

  return null
}

export function defaultGroupNameFromFileName(fileName: string): string {
  const baseName = fileName.split(/[\\/]/).pop()?.trim() ?? ""
  const withoutExtension = baseName.replace(/\.zip$/i, "").trim()
  return withoutExtension.length > 0 ? withoutExtension : "整合包"
}
