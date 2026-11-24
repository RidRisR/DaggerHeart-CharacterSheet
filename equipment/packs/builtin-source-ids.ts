export const HOPE_FEAR_EQUIPMENT_SOURCE_ID = "builtin.hope-fear"
export type BuiltinEquipmentSourceId = "builtin" | typeof HOPE_FEAR_EQUIPMENT_SOURCE_ID

export function isBuiltinEquipmentSourceId(id: string): id is BuiltinEquipmentSourceId {
  return id === "builtin" || id === HOPE_FEAR_EQUIPMENT_SOURCE_ID
}
