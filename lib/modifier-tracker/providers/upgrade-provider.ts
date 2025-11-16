/**
 * 升级项调整值提供者
 *
 * 从已勾选的升级项中收集调整值声明
 */

import type { IModifierProvider } from '../provider-interface'
import type { Modifier, ModifierDeclaration } from '../types'
import { ModifierSourceType, ModifierType } from '../types'
import type { SheetData } from '@/lib/sheet-data'
import { getUpgradeConfig } from '../upgrade-effects'

export class UpgradeModifierProvider implements IModifierProvider {
  readonly name = 'UpgradeProvider'

  getModifiers(sheetData: SheetData): Modifier[] {
    const modifiers: Modifier[] = []
    const checkedUpgrades = sheetData.checkedUpgrades

    if (!checkedUpgrades) return modifiers

    // 遍历所有已勾选的升级项
    Object.entries(checkedUpgrades).forEach(([checkKey, checkedMap]) => {
      // 跳过 tier1, tier2, tier3 基础结构
      if (checkKey === 'tier1' || checkKey === 'tier2' || checkKey === 'tier3') {
        return
      }

      // 检查是否有勾选
      const isChecked = Object.values(checkedMap).some(v => v === true)
      if (!isChecked) return

      // 查找配置
      const config = getUpgradeConfig(checkKey)
      if (config?.modifiers) {
        modifiers.push(...this.convertDeclarations(
          config.modifiers,
          ModifierSourceType.Upgrade,
          config.label,
          checkKey
        ))
      }
    })

    return modifiers
  }

  /**
   * 将数据源的声明转换为运行时 Modifier
   *
   * @private
   */
  private convertDeclarations(
    declarations: ModifierDeclaration[],
    sourceType: ModifierSourceType,
    sourceName: string,
    sourceId?: string
  ): Modifier[] {
    return declarations.map((decl, index) => ({
      id: `${sourceType}-${sourceId || 'unknown'}-${index}`,
      attribute: decl.attribute,
      sourceType,
      sourceName,
      sourceId,
      modifierType: decl.type as ModifierType,
      value: decl.value,
      description: decl.description
    }))
  }
}
