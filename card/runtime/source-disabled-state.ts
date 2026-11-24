import {
  getCardDisabledSourceIds,
  setCardSourceDisabled,
  type AppPreferencesStorage,
} from "@/lib/app-preferences"
import type { BuiltinCardSourceId, CardRuntimeSourceStateResult } from "./source-types"

export function setBuiltinCardRuntimeSourceDisabled(
  sourceId: BuiltinCardSourceId,
  disabled: boolean,
  storage?: AppPreferencesStorage,
): CardRuntimeSourceStateResult {
  const ok = setCardSourceDisabled(sourceId, disabled, storage)
  return ok
    ? { ok: true, sourceId, disabled }
    : {
        ok: false,
        sourceId,
        disabled,
        message: "Failed to write card source preferences",
      }
}

export function getBuiltinCardRuntimeSourceDisabled(sourceId: BuiltinCardSourceId, storage?: AppPreferencesStorage): boolean {
  return getCardDisabledSourceIds(storage).includes(sourceId)
}
