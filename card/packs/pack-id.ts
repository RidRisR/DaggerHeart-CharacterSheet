interface CreateCardPackIdInput {
  now: Date
  random: () => number
  exists: (candidate: string) => boolean
  maxAttempts?: number
}

export function createCardPackId(input: CreateCardPackIdInput): string | null {
  const maxAttempts = input.maxAttempts ?? 20
  const timestamp = input.now.getTime()

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const suffix = Math.floor(input.random() * 36 ** 6)
      .toString(36)
      .padStart(6, "0")
      .slice(0, 6)
    const candidate = `batch_${timestamp}_${suffix}`
    if (!input.exists(candidate)) return candidate
  }

  return null
}
