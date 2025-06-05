/**
 * 存储工具函数
 * 提供安全的JSON解析和存储操作
 */

// 调试标记
const DEBUG_STORAGE = false;

const logDebug = (operation: string, details: any) => {
    if (DEBUG_STORAGE) {
        console.log(`[StorageUtils:${operation}]`, details);
    }
};

/**
 * 安全的JSON解析函数
 * 避免"Unexpected end of JSON input"错误
 */
export function safeJsonParse<T>(jsonString: string | null, defaultValue: T): T {
    if (!jsonString || jsonString.trim() === '') {
        logDebug('safeJsonParse', 'Empty or null JSON string, returning default');
        return defaultValue;
    }
    
    try {
        const parsed = JSON.parse(jsonString);
        logDebug('safeJsonParse', 'Successfully parsed JSON');
        return parsed;
    } catch (error) {
        logDebug('safeJsonParse', { 
            error: error instanceof Error ? error.message : String(error),
            jsonString: jsonString.substring(0, 100) + (jsonString.length > 100 ? '...' : '')
        });
        return defaultValue;
    }
}

/**
 * 安全的localStorage获取函数
 */
export function safeGetItem<T>(key: string, defaultValue: T): T {
    if (typeof window === 'undefined' || !localStorage) {
        return defaultValue;
    }
    
    try {
        const item = localStorage.getItem(key);
        return safeJsonParse(item, defaultValue);
    } catch (error) {
        logDebug('safeGetItem', { key, error });
        return defaultValue;
    }
}

/**
 * 安全的localStorage设置函数
 */
export function safeSetItem(key: string, value: any): boolean {
    if (typeof window === 'undefined' || !localStorage) {
        return false;
    }
    
    try {
        const jsonString = JSON.stringify(value);
        localStorage.setItem(key, jsonString);
        logDebug('safeSetItem', { key, success: true });
        return true;
    } catch (error) {
        logDebug('safeSetItem', { key, error });
        return false;
    }
}

/**
 * 安全的localStorage删除函数
 */
export function safeRemoveItem(key: string): boolean {
    if (typeof window === 'undefined' || !localStorage) {
        return false;
    }
    
    try {
        localStorage.removeItem(key);
        logDebug('safeRemoveItem', { key, success: true });
        return true;
    } catch (error) {
        logDebug('safeRemoveItem', { key, error });
        return false;
    }
}

/**
 * 检查localStorage中的键是否存在且有效
 */
export function isValidStorageKey(key: string): boolean {
    if (typeof window === 'undefined' || !localStorage) {
        return false;
    }
    
    try {
        const item = localStorage.getItem(key);
        if (!item || item.trim() === '') {
            return false;
        }
        // 尝试解析JSON
        JSON.parse(item);
        return true;
    } catch (error) {
        return false;
    }
}

/**
 * 清理损坏的localStorage条目
 */
export function cleanupCorruptedKeys(): string[] {
    if (typeof window === 'undefined' || !localStorage) {
        return [];
    }
    
    const removedKeys: string[] = [];
    const keysToCheck: string[] = [];
    
    // 收集所有键
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
            keysToCheck.push(key);
        }
    }
    
    // 检查并清理损坏的键
    for (const key of keysToCheck) {
        if (!isValidStorageKey(key)) {
            try {
                localStorage.removeItem(key);
                removedKeys.push(key);
                logDebug('cleanupCorruptedKeys', { removedKey: key });
            } catch (error) {
                logDebug('cleanupCorruptedKeys', { key, error });
            }
        }
    }
    
    return removedKeys;
}

/**
 * 获取localStorage使用情况
 */
export function getStorageUsage(): {
    used: number;
    total: number;
    available: number;
    keys: number;
} {
    if (typeof window === 'undefined' || !localStorage) {
        return { used: 0, total: 0, available: 0, keys: 0 };
    }
    
    let used = 0;
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key) {
                const value = localStorage.getItem(key);
                if (value) {
                    used += (key.length + value.length) * 2; // UTF-16
                }
            }
        }
    } catch (error) {
        logDebug('getStorageUsage', { error });
    }
    
    const total = 10 * 1024 * 1024; // 10MB 估算
    return {
        used,
        total,
        available: total - used,
        keys: localStorage.length
    };
}
