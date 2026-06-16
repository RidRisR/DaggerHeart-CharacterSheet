interface ContentPackStatsProps {
  cardPackCount: number
  enabledCardPackCount: number
  equipmentPackCount: number
  enabledEquipmentPackCount: number
  cardCount: number
  weaponTemplateCount: number
  armorTemplateCount: number
}

export function ContentPackStats(props: ContentPackStatsProps) {
  const items = [
    { label: "卡牌包", value: `${props.enabledCardPackCount}/${props.cardPackCount}` },
    { label: "装备包", value: `${props.enabledEquipmentPackCount}/${props.equipmentPackCount}` },
    { label: "卡牌", value: props.cardCount },
    { label: "装备模板", value: `${props.weaponTemplateCount} 武器 / ${props.armorTemplateCount} 护甲` },
  ]

  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="text-xs text-muted-foreground">{item.label}</div>
          <div className="mt-1 text-lg font-semibold">{item.value}</div>
        </div>
      ))}
    </section>
  )
}
