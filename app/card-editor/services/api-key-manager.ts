/**
 * API Key管理器
 *
 * 提供API配置的安全存储和读取功能
 * 使用Web Crypto API进行加密
 */

import type { AIServiceConfig } from './ai-types'

/**
 * API Key管理器
 */
export class APIKeyManager {
  private readonly STORAGE_KEY = 'dh_ai_config'

  /**
   * 保存配置(加密后存储)
   */
  async saveConfig(config: AIServiceConfig): Promise<void> {
    try {
      const encrypted = await this.encrypt(JSON.stringify(config))
      localStorage.setItem(this.STORAGE_KEY, encrypted)
    } catch (error) {
      console.error('[APIKeyManager] 保存配置失败:', error)
      // 降级方案:使用base64编码
      const base64 = btoa(JSON.stringify(config))
      localStorage.setItem(this.STORAGE_KEY, `base64:${base64}`)
    }
  }

  /**
   * 读取配置(解密)
   */
  async loadConfig(): Promise<AIServiceConfig | null> {
    const stored = localStorage.getItem(this.STORAGE_KEY)
    if (!stored) return null

    try {
      // 检查是否是降级方案的base64编码
      if (stored.startsWith('base64:')) {
        const base64Data = stored.substring(7)
        const decrypted = atob(base64Data)
        return JSON.parse(decrypted)
      }

      // 正常的加密数据
      const decrypted = await this.decrypt(stored)
      return JSON.parse(decrypted)
    } catch (error) {
      console.error('[APIKeyManager] 读取配置失败:', error)
      return null
    }
  }

  /**
   * 清除配置
   */
  clearConfig(): void {
    localStorage.removeItem(this.STORAGE_KEY)
  }

  /**
   * 使用Web Crypto API加密数据
   */
  private async encrypt(data: string): Promise<string> {
    // 获取设备密钥
    const key = await this.getDeviceKey()

    // 生成随机IV
    const iv = crypto.getRandomValues(new Uint8Array(12))

    // 加密数据
    const encoder = new TextEncoder()
    const dataBuffer = encoder.encode(data)

    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      dataBuffer
    )

    // 合并IV和密文
    const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength)
    combined.set(iv)
    combined.set(new Uint8Array(encryptedBuffer), iv.length)

    // 转换为base64
    return btoa(String.fromCharCode(...combined))
  }

  /**
   * 解密数据
   */
  private async decrypt(encryptedData: string): Promise<string> {
    // 获取设备密钥
    const key = await this.getDeviceKey()

    // 从base64解码
    const combined = Uint8Array.from(atob(encryptedData), (c) => c.charCodeAt(0))

    // 分离IV和密文
    const iv = combined.slice(0, 12)
    const ciphertext = combined.slice(12)

    // 解密
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    )

    // 转换为字符串
    const decoder = new TextDecoder()
    return decoder.decode(decryptedBuffer)
  }

  /**
   * 基于设备指纹生成加密密钥
   */
  private async getDeviceKey(): Promise<CryptoKey> {
    // 使用设备特征生成指纹
    const fingerprint = [
      navigator.userAgent,
      screen.width,
      screen.height,
      screen.colorDepth,
      new Date().getTimezoneOffset(),
      navigator.language
    ].join('|')

    // 对指纹进行hash
    const encoder = new TextEncoder()
    const data = encoder.encode(fingerprint)
    const hash = await crypto.subtle.digest('SHA-256', data)

    // 导入为密钥
    return crypto.subtle.importKey('raw', hash, { name: 'AES-GCM' }, false, [
      'encrypt',
      'decrypt'
    ])
  }
}
