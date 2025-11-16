/**
 * 卡牌调整值提供者
 *
 * 从聚焦卡组中收集调整值声明
 */

import type { IModifierProvider } from '../provider-interface'
import type { Modifier, ModifierDeclaration } from '../types'
import { ModifierSourceType, ModifierType } from '../types'
import type { SheetData } from '@/lib/sheet-data'
import { isEmptyCard } from '@/card/card-types'

export class CardModifierProvider implements IModifierProvider {
  readonly name = 'CardProvider'

  getModifiers(sheetData: SheetData): Modifier[] {
    const modifiers: Modifier[] = []

    // 遍历聚焦卡组
    sheetData.cards.forEach((card) => {
      if (isEmptyCard(card)) return

      // 优先读取 modifiers 字段（新格式）
      if (card.modifiers) {
        modifiers.push(...this.convertDeclarations(
          card.modifiers,
          ModifierSourceType.Card,
          card.name,
          card.id
        ))
      }

      // 兼容旧格式：professionSpecial
      if (card.type === 'profession' && card.professionSpecial) {
        const { '起始闪避': evasion, '起始生命': hp } = card.professionSpecial

        if (evasion) {
          modifiers.push({
            id: `card-${card.id}-evasion`,
            attribute: 'evasion',
            sourceType: ModifierSourceType.Card,
            sourceName: card.name,
            sourceId: card.id,
            modifierType: ModifierType.Bonus,
            value: evasion,
            description: '职业起始闪避'
          })
        }

        if (hp) {
          modifiers.push({
            id: `card-${card.id}-hp`,
            attribute: 'hpMax',
            sourceType: ModifierSourceType.Card,
            sourceName: card.name,
            sourceId: card.id,
            modifierType: ModifierType.Bonus,
            value: hp,
            description: '职业起始生命'
          })
        }
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
      id: `${sourceType}-${sourceName}-${sourceId || 'unknown'}-${index}`,
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
