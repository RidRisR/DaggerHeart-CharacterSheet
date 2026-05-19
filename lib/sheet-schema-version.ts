export const CURRENT_SCHEMA_VERSION = 2

export function detectSchemaVersion(data: unknown): number {
  if (!data || typeof data !== 'object') {
    return 0
  }

  const version = (data as { schemaVersion?: unknown }).schemaVersion
  if (!Number.isInteger(version)) {
    return 0
  }

  return version as number
}

export function assertSupportedSchemaVersion(version: number): void {
  if (version > CURRENT_SCHEMA_VERSION) {
    throw new Error(`Cannot load save from newer schema version ${version}; current schema version is ${CURRENT_SCHEMA_VERSION}.`)
  }
}
