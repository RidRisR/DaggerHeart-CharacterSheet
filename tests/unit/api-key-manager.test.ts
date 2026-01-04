/**
 * API Key管理器测试
 *
 * 测试api-key-manager.ts的加密存储功能
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { APIKeyManager } from '@/app/card-editor/services/api-key-manager'
import type { AIServiceConfig } from '@/app/card-editor/services/ai-types'

describe('APIKeyManager', () => {
  let manager: APIKeyManager
  const testConfig: AIServiceConfig = {
    provider: 'openai',
    apiKey: 'sk-test123456789',
    baseURL: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini'
  }

  beforeEach(() => {
    manager = new APIKeyManager()
    // 清理localStorage
    localStorage.clear()
  })

  afterEach(() => {
    // 测试后清理
    localStorage.clear()
  })

  describe('saveConfig', () => {
    it('应该成功保存配置到localStorage', async () => {
      await manager.saveConfig(testConfig)

      const stored = localStorage.getItem('dh_ai_config')
      expect(stored).toBeTruthy()
      expect(stored).not.toBe(JSON.stringify(testConfig)) // 应该是加密的
    })

    it('应该加密API Key(不应该是明文)', async () => {
      await manager.saveConfig(testConfig)

      const stored = localStorage.getItem('dh_ai_config')
      expect(stored).toBeTruthy()
      expect(stored).not.toContain(testConfig.apiKey) // 不应包含明文API Key
    })

    it('应该能够保存不同提供商的配置', async () => {
      const customConfig: AIServiceConfig = {
        provider: 'custom',
        apiKey: 'custom-key-123',
        baseURL: 'https://custom.api.com/v1',
        model: 'custom-model'
      }

      await manager.saveConfig(customConfig)

      const stored = localStorage.getItem('dh_ai_config')
      expect(stored).toBeTruthy()
    })
  })

  describe('loadConfig', () => {
    it('应该成功读取已保存的配置', async () => {
      await manager.saveConfig(testConfig)

      const loaded = await manager.loadConfig()

      expect(loaded).toBeTruthy()
      expect(loaded?.provider).toBe(testConfig.provider)
      expect(loaded?.apiKey).toBe(testConfig.apiKey)
      expect(loaded?.baseURL).toBe(testConfig.baseURL)
      expect(loaded?.model).toBe(testConfig.model)
    })

    it('应该在无配置时返回null', async () => {
      const loaded = await manager.loadConfig()

      expect(loaded).toBeNull()
    })

    it('应该正确解密API Key', async () => {
      const originalKey = 'sk-very-secret-key-12345'
      const config = { ...testConfig, apiKey: originalKey }

      await manager.saveConfig(config)
      const loaded = await manager.loadConfig()

      expect(loaded?.apiKey).toBe(originalKey)
    })

    it('应该处理降级方案(base64编码)', async () => {
      // 手动写入base64格式的数据(模拟降级场景)
      const base64Data = btoa(JSON.stringify(testConfig))
      localStorage.setItem('dh_ai_config', `base64:${base64Data}`)

      const loaded = await manager.loadConfig()

      expect(loaded).toBeTruthy()
      expect(loaded?.apiKey).toBe(testConfig.apiKey)
    })
  })

  describe('clearConfig', () => {
    it('应该清除已保存的配置', async () => {
      await manager.saveConfig(testConfig)
      expect(localStorage.getItem('dh_ai_config')).toBeTruthy()

      manager.clearConfig()

      expect(localStorage.getItem('dh_ai_config')).toBeNull()
    })

    it('应该在无配置时也能安全调用', () => {
      expect(() => manager.clearConfig()).not.toThrow()
    })
  })

  describe('加密/解密往返测试', () => {
    it('应该保证多次保存和读取的一致性', async () => {
      // 第一次保存和读取
      await manager.saveConfig(testConfig)
      const loaded1 = await manager.loadConfig()

      // 第二次保存和读取
      await manager.saveConfig(loaded1!)
      const loaded2 = await manager.loadConfig()

      // 第三次保存和读取
      await manager.saveConfig(loaded2!)
      const loaded3 = await manager.loadConfig()

      expect(loaded3?.apiKey).toBe(testConfig.apiKey)
      expect(loaded3?.provider).toBe(testConfig.provider)
    })

    it('应该处理包含特殊字符的API Key', async () => {
      const specialConfig = {
        ...testConfig,
        apiKey: 'sk-test!@#$%^&*()_+-=[]{}|;:,.<>?'
      }

      await manager.saveConfig(specialConfig)
      const loaded = await manager.loadConfig()

      expect(loaded?.apiKey).toBe(specialConfig.apiKey)
    })

    it('应该处理非常长的API Key', async () => {
      const longKey = 'sk-' + 'a'.repeat(1000)
      const longConfig = { ...testConfig, apiKey: longKey }

      await manager.saveConfig(longConfig)
      const loaded = await manager.loadConfig()

      expect(loaded?.apiKey).toBe(longKey)
    })
  })
})
