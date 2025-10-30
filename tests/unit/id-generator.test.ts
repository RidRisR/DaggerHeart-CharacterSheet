import { describe, it, expect } from 'vitest'
import {
  sanitizeIdString,
  generateRobustCardId,
  parseCardId,
  buildCardId,
  isIdUniqueInPackage
} from '@/app/card-editor/utils/id-generator'
import type { CardPackageState } from '@/app/card-editor/types'

describe('ID Generator - sanitizeIdString', () => {
  it('应该移除非法字符', () => {
    expect(sanitizeIdString('hello@world!')).toBe('hello-world')
    expect(sanitizeIdString('test#123$abc')).toBe('test-123-abc')
  })

  it('应该保留中文字符', () => {
    expect(sanitizeIdString('我的卡包')).toBe('我的卡包')
    expect(sanitizeIdString('测试-Test-123')).toBe('测试-Test-123')
  })

  it('应该合并多个连字符', () => {
    expect(sanitizeIdString('hello---world')).toBe('hello-world')
    expect(sanitizeIdString('test--123')).toBe('test-123')
  })

  it('应该移除开头和结尾的连字符', () => {
    expect(sanitizeIdString('-hello-')).toBe('hello')
    expect(sanitizeIdString('---test---')).toBe('test')
  })

  it('应该保留字母、数字和中文', () => {
    expect(sanitizeIdString('abc123XYZ')).toBe('abc123XYZ')
    expect(sanitizeIdString('张三李四123')).toBe('张三李四123')
  })
})

describe('ID Generator - 截断功能', () => {
  it('短名称应该保持不变', () => {
    const id = generateRobustCardId('测试包', '张三', 'profession')
    expect(id).toContain('测试包')
    expect(id).toContain('张三')
  })

  it('长中文名称应该被截断到8字符', () => {
    const longPackage = '我的超级酷炫的DaggerHeart自定义卡包集合第一版'
    const longAuthor = '张三李四王五赵六孙七周八吴九郑十'

    const id = generateRobustCardId(longPackage, longAuthor, 'profession')

    // 验证ID包含截断后的包名和作者名（前8字符）
    expect(id).toContain('我的超级酷炫的D')
    expect(id).toContain('张三李四王五赵六')
  })

  it('长英文名称应该被截断到8字符', () => {
    const longPackage = 'MyAwesomeCardPackageVersion1'
    const longAuthor = 'JohnSmithDoeJunior'

    const id = generateRobustCardId(longPackage, longAuthor, 'ancestry')

    // 验证ID包含截断后的名称（前8字符）
    expect(id).toContain('MyAwesom')
    expect(id).toContain('JohnSmit')
  })

  it('混合名称应该被截断到8字符', () => {
    const mixedPackage = '卡包Pack2024Version'
    const mixedAuthor = '作者Author123'

    const id = generateRobustCardId(mixedPackage, mixedAuthor, 'community')

    // 验证ID包含截断后的名称（前8字符）
    expect(id).toContain('卡包Pack20')
    expect(id).toContain('作者Autho')
  })

  it('恰好8字符的名称应该保持不变', () => {
    const package8 = '12345678'
    const author8 = 'ABCDEFGH'

    const id = generateRobustCardId(package8, author8, 'subclass')

    expect(id).toContain('12345678')
    expect(id).toContain('ABCDEFGH')
  })

  it('空字符串应该使用默认值并截断', () => {
    const id = generateRobustCardId('', '', 'profession')

    // 默认值 "新建卡包" 和 "作者" 都少于8字符，应该保持不变
    expect(id).toContain('新建卡包')
    expect(id).toContain('作者')
  })
})

describe('ID Generator - generateRobustCardId', () => {
  it('应该生成包含所有必要部分的ID', () => {
    const id = generateRobustCardId('测试包', '张三', 'profession')

    // 验证ID格式：包名-作者-类型缩写-时间戳-随机数
    const parts = id.split('-')
    expect(parts.length).toBeGreaterThanOrEqual(5)
    expect(parts[0]).toBe('测试包')
    expect(parts[1]).toBe('张三')
    expect(parts[2]).toBe('prof') // profession 的缩写
  })

  it('应该为不同类型生成正确的类型缩写', () => {
    const types = [
      { type: 'profession' as const, abbr: 'prof' },
      { type: 'ancestry' as const, abbr: 'ance' },
      { type: 'community' as const, abbr: 'comm' },
      { type: 'subclass' as const, abbr: 'subc' },
      { type: 'domain' as const, abbr: 'doma' },
      { type: 'variant' as const, abbr: 'vari' }
    ]

    types.forEach(({ type, abbr }) => {
      const id = generateRobustCardId('包', '者', type)
      expect(id).toContain(`-${abbr}-`)
    })
  })

  it('应该生成唯一的ID（带时间戳和随机数）', () => {
    const id1 = generateRobustCardId('测试包', '张三', 'profession')
    const id2 = generateRobustCardId('测试包', '张三', 'profession')

    // 由于包含时间戳和随机数，两次生成的ID应该不同
    expect(id1).not.toBe(id2)
  })

  it('应该在ID冲突时添加额外随机后缀', () => {
    const mockPackage: CardPackageState = {
      name: '测试包',
      author: '张三',
      version: '1.0.0',
      description: '',
      customFieldDefinitions: {
        professions: [],
        ancestries: [],
        communities: [],
        domains: [],
        variants: []
      },
      profession: [],
      ancestry: [],
      community: [],
      subclass: [],
      domain: [],
      variant: []
    }

    // 第一次生成
    const id1 = generateRobustCardId('测试包', '张三', 'profession', mockPackage)

    // 添加到卡包中
    mockPackage.profession = [{ id: id1, 名称: '测试', 职业: '战士', 简介: '', 效果: '', 类别: 0 }]

    // 第二次生成，由于时间戳和随机数的存在，极少会冲突
    // 但如果冲突，应该添加额外后缀
    const id2 = generateRobustCardId('测试包', '张三', 'profession', mockPackage)

    // 验证两个ID不同
    expect(id1).not.toBe(id2)
  })
})

describe('ID Generator - parseCardId', () => {
  it('应该正确解析标准格式的ID', () => {
    const id = '测试包-张三-prof-m8k9l2-a3b4c5'
    const result = parseCardId(id, '测试包', '张三', 'profession')

    expect(result.isStandard).toBe(true)
    expect(result.customSuffix).toBe('m8k9l2-a3b4c5')
    expect(result.prefix).toBe('测试包-张三-prof-')
  })

  it('应该正确解析截断后的ID', () => {
    const longPackage = '我的超级酷炫的DaggerHeart'
    const longAuthor = '张三李四王五赵六'
    const id = '我的超级酷炫的D-张三李四王五赵六-prof-m8k9l2-a3b4c5'

    const result = parseCardId(id, longPackage, longAuthor, 'profession')

    expect(result.isStandard).toBe(true)
    expect(result.customSuffix).toBe('m8k9l2-a3b4c5')
  })

  it('应该处理非标准格式的ID', () => {
    const id = 'custom-id-format'
    const result = parseCardId(id, '测试包', '张三', 'profession')

    expect(result.isStandard).toBe(false)
    expect(result.customSuffix).toBe('custom-id-format')
  })
})

describe('ID Generator - buildCardId', () => {
  it('应该根据组件构建正确的ID', () => {
    const id = buildCardId('测试包', '张三', 'profession', 'custom-suffix')

    expect(id).toBe('测试包-张三-prof-custom-suffix')
  })

  it('应该截断过长的包名和作者名', () => {
    const longPackage = '我的超级酷炫的DaggerHeart自定义卡包'
    const longAuthor = '张三李四王五赵六孙七'

    const id = buildCardId(longPackage, longAuthor, 'ancestry', 'suffix')

    expect(id).toContain('我的超级酷炫的D')
    expect(id).toContain('张三李四王五赵六')
    expect(id).toContain('ance')
    expect(id).toContain('suffix')
  })

  it('应该清理后缀中的非法字符', () => {
    const id = buildCardId('包', '者', 'community', 'test@suffix!')

    expect(id).toContain('test-suffix')
  })

  it('应该处理空后缀', () => {
    const id = buildCardId('包', '者', 'subclass', '')

    expect(id).toContain('unnamed') // 空后缀使用默认值
  })
})

describe('ID Generator - isIdUniqueInPackage', () => {
  const mockPackage: CardPackageState = {
    name: '测试包',
    author: '张三',
    version: '1.0.0',
    description: '',
    customFieldDefinitions: {
      professions: [],
      ancestries: [],
      communities: [],
      domains: [],
      variants: []
    },
    profession: [
      { id: 'existing-id-1', 名称: '测试1', 职业: '战士', 简介: '', 效果: '', 类别: 0 },
      { id: 'existing-id-2', 名称: '测试2', 职业: '法师', 简介: '', 效果: '', 类别: 0 }
    ],
    ancestry: [],
    community: [],
    subclass: [],
    domain: [],
    variant: []
  }

  it('应该识别唯一的ID', () => {
    const isUnique = isIdUniqueInPackage('new-unique-id', mockPackage)
    expect(isUnique).toBe(true)
  })

  it('应该识别重复的ID', () => {
    const isUnique = isIdUniqueInPackage('existing-id-1', mockPackage)
    expect(isUnique).toBe(false)
  })

  it('应该在排除特定卡牌时正确检查唯一性', () => {
    const cardToExclude = mockPackage.profession?.[0]
    const isUnique = isIdUniqueInPackage('existing-id-1', mockPackage, cardToExclude)

    // 排除该卡牌后，ID应该被认为是唯一的
    expect(isUnique).toBe(true)
  })
})

describe('ID Generator - 长度优化验证', () => {
  it('截断后的ID应该明显短于原始ID', () => {
    const longPackage = '我的超级酷炫的DaggerHeart自定义卡包集合第一版'
    const longAuthor = '张三李四王五赵六孙七周八吴九郑十'

    // 生成新ID（会截断）
    const newId = generateRobustCardId(longPackage, longAuthor, 'profession')

    // 模拟旧ID（不截断）
    const oldId = `${longPackage}-${longAuthor}-prof-timestamp-random`

    // 新ID应该明显短于旧ID
    expect(newId.length).toBeLessThan(oldId.length)

    // 验证新ID长度在合理范围内（约30-40字符）
    expect(newId.length).toBeLessThan(50)
  })

  it('短名称的ID长度应该保持合理', () => {
    const id = generateRobustCardId('测试', '作者', 'profession')

    // 短名称生成的ID应该在合理范围内
    expect(id.length).toBeLessThan(35)
  })

  it('所有类型的ID格式应该一致', () => {
    const types: Array<'profession' | 'ancestry' | 'community' | 'subclass' | 'domain' | 'variant'> =
      ['profession', 'ancestry', 'community', 'subclass', 'domain', 'variant']

    types.forEach(type => {
      const id = generateRobustCardId('长名称PackageName', '长作者AuthorName', type)
      const parts = id.split('-')

      // 验证格式一致性：包名-作者-类型-时间戳-随机数
      expect(parts.length).toBeGreaterThanOrEqual(5)
      expect(parts[0].length).toBeLessThanOrEqual(8) // 包名截断到8字符
      expect(parts[1].length).toBeLessThanOrEqual(8) // 作者截断到8字符
      expect(parts[2].length).toBe(4) // 类型缩写固定4字符
    })
  })
})
