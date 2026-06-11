export interface CreateEquipmentPackIdInput {
  now: Date
  random: () => number
  exists: (candidate: string) => boolean
}

function formatTimestamp(date: Date): string {
  return String(date.getTime())
}

function random6(random: () => number): string {
  return random().toString(36).substring(2, 8).padEnd(6, "0")
}

export function createEquipmentPackId(input: CreateEquipmentPackIdInput): string | null {
  const timestamp = formatTimestamp(input.now)

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const candidate = `pack_${timestamp}_${random6(input.random)}`
    if (!input.exists(candidate)) {
      return candidate
    }
  }

  return null
}
