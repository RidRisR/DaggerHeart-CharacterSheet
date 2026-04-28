import { describe, expect, it } from 'vitest'
import { copyCard } from '@/app/card-editor/utils/card-factory'
import type { CardPackageState } from '@/app/card-editor/types'
import type { ProfessionCard } from '@/card/profession-card/convert'

const packageData: CardPackageState = {
  name: '测试卡包',
  author: '测试作者',
  version: '1.0.0',
  description: '',
  customFieldDefinitions: {
    professions: [],
    ancestries: [],
    communities: [],
    domains: [],
    variants: [],
  },
  profession: [],
  ancestry: [],
  community: [],
  subclass: [],
  domain: [],
  variant: [],
}

describe('copyCard', () => {
  it('preserves zero starting evasion when copying profession cards', () => {
    const original: ProfessionCard = {
      id: 'zero-evasion-profession',
      名称: '零闪避职业',
      简介: '测试职业',
      领域1: '领域一',
      领域2: '领域二',
      起始生命: 6,
      起始闪避: 0,
      起始物品: '测试物品',
      希望特性: '测试希望特性',
      职业特性: '测试职业特性',
    }

    const copied = copyCard(original, 'profession', packageData) as ProfessionCard

    expect(copied.起始闪避).toBe(0)
  })
})
