import { CardSource, type ExtendedStandardCard } from '@/card/card-types'
import { CARD_BUILTIN_SOURCE_ID } from '@/card/runtime/source-types'

export type BeastFormTier = 1 | 2 | 3 | 4
export interface BeastForm {
  id: string
  name: string
  tier: BeastFormTier
  examples: string
  attributes?: string
  attack?: string
  advantages?: string
  traits: string
}

/** Project authored built-in Markdown without rewriting any rule text or emphasis. */
export function readBuiltinBeastForms(cards: Iterable<ExtendedStandardCard>): BeastForm[] {
  const forms: BeastForm[] = []
  const seen = new Set<string>()
  for (const card of cards) {
    if (card.source !== CardSource.BUILTIN || card.batchId !== CARD_BUILTIN_SOURCE_ID
      || card.type !== 'variant' || card.variantSpecial?.realType !== '野兽形态') continue
    const fail = (): never => { throw new Error(`Invalid built-in beast form: ${card.id}`) }
    if (seen.has(card.id) || !card.name || ![1, 2, 3, 4].includes(card.level ?? 0) || !card.description) fail()
    seen.add(card.id)
    const [examples, ...lines] = card.description!.split('\n')
    if (!/^（.+）$/.test(examples)) fail()
    const fields: Partial<Pick<BeastForm, 'attributes' | 'attack' | 'advantages'>> = {}
    const traits: string[] = []
    const keys = { '角色属性': 'attributes', '攻击掷骰': 'attack', '获得优势': 'advantages' } as const
    for (const line of lines) {
      const match = line.match(/^\*\*\*(角色属性|攻击掷骰|获得优势)\*\*\*：\s*(.*)$/)
      if (match) {
        const key = keys[match[1] as keyof typeof keys]
        if (key in fields || traits.some(part => part.trim())) fail()
        fields[key] = match[2]
      } else {
        traits.push(line)
      }
    }
    const body = traits.join('\n').trim()
    // Evolved forms deliberately have no stat block; partial stat blocks are invalid.
    if ((Object.keys(fields).length !== 0 && Object.keys(fields).length !== 3)
      || !body.startsWith('***') || /\*\*\*(角色属性|攻击掷骰|获得优势)/.test(body)) fail()
    forms.push({ id: card.id, name: card.name, tier: card.level as BeastFormTier, examples, ...fields, traits: body })
  }
  return forms
}
