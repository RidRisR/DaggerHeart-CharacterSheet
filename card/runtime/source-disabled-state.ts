import {
  getCardDisabledSourceIds,
  setCardSourceDisabled,
  type AppPreferencesStorage,
} from "@/lib/app-preferences"
import { CARD_BUILTIN_SOURCE_ID, type CardRuntimeSourceStateResult } from "./source-types"

export function setBuiltinCardRuntimeSourceDisabled(
  disabled: boolean,
  storage?: AppPreferencesStorage,
): CardRuntimeSourceStateResult {
  const ok = setCardSourceDisabled(CARD_BUILTIN_SOURCE_ID, disabled, storage)
  return ok
    ? { ok: true, sourceId: CARD_BUILTIN_SOURCE_ID, disabled }
    : {
        ok: false,
        sourceId: CARD_BUILTIN_SOURCE_ID,
        disabled,
        message: "Failed to write card source preferences",
      }
}

export function getBuiltinCardRuntimeSourceDisabled(storage?: AppPreferencesStorage): boolean {
  return getCardDisabledSourceIds(storage).includes(CARD_BUILTIN_SOURCE_ID)
}
