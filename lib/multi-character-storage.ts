import { SheetData, CharacterMetadata, CharacterList } from "./sheet-data";
import { defaultSheetData } from "./default-sheet-data";
import { createEmptyCard } from "@/card/card-types";

// ===== 多角色系统存储键 =====
export const CHARACTER_LIST_KEY = "dh_character_list";       // 角色元数据列表
export const CHARACTER_DATA_PREFIX = "dh_character_";        // 单个角色数据前缀 
export const ACTIVE_CHARACTER_ID_KEY = "dh_active_character_id"; // 当前活动角色ID

// ===== 旧系统存储键（仅用于迁移） =====
const LEGACY_SHEET_DATA_KEY = "charactersheet_data";
const LEGACY_FOCUSED_CARDS_KEY = "focused_card_ids";
const LEGACY_PERSISTENT_FORM_DATA_KEY = "persistentFormData";

// ===== 常量 =====
export const MAX_CHARACTERS = 10;

// ===== UUID生成器 =====
export function generateCharacterId(): string {
  // 只在客户端生成ID，避免服务端/客户端不一致
  if (typeof window === 'undefined') {
    // 服务器端返回一个临时占位符，实际调用应该在客户端
    console.warn('[generateCharacterId] Called on server side, returning placeholder');
    return 'temp-server-id';
  }
  
  // 客户端使用UUID v4算法
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// ===== 角色列表管理 =====
export function loadCharacterList(): CharacterList {
  try {
    const stored = localStorage.getItem(CHARACTER_LIST_KEY);
    if (!stored) {
      return {
        characters: [],
        activeCharacterId: null,
        lastUpdated: new Date().toISOString()
      };
    }
    
    const parsed = JSON.parse(stored);
    // 基本结构验证
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.characters)) {
      console.error('[CharacterList] Invalid structure, returning default');
      return {
        characters: [],
        activeCharacterId: null,
        lastUpdated: new Date().toISOString()
      };
    }
    
    return parsed;
  } catch (error) {
    console.error('[CharacterList] Load failed (Fast Fail):', error);
    return {
      characters: [],
      activeCharacterId: null,
      lastUpdated: new Date().toISOString()
    };
  }
}

export function saveCharacterList(list: CharacterList): void {
  try {
    list.lastUpdated = new Date().toISOString();
    localStorage.setItem(CHARACTER_LIST_KEY, JSON.stringify(list));
  } catch (error) {
    console.error('[CharacterList] Save failed (Fast Fail):', error);
    throw error; // 快速失败
  }
}

export function addCharacterToMetadataList(saveName: string): CharacterMetadata | null {
  const list = loadCharacterList();
  
  // 检查数量限制
  if (list.characters.length >= MAX_CHARACTERS) {
    console.error(`[CharacterList] Cannot add character: limit of ${MAX_CHARACTERS} reached`);
    return null;
  }
  
  const id = generateCharacterId();
  const now = new Date().toISOString();
  
  const metadata: CharacterMetadata = {
    id,
      saveName: saveName || "未命名存档",
    lastModified: now,
    createdAt: now,
    order: list.characters.length
  };
  
  list.characters.push(metadata);
  saveCharacterList(list);
  
  return metadata;
}

export function updateCharacterInMetadataList(
  characterId: string, 
    updates: Partial<Pick<CharacterMetadata, 'saveName'>>
): void {
  const list = loadCharacterList();
  const index = list.characters.findIndex(char => char.id === characterId);
  
  if (index === -1) {
    console.error(`[CharacterList] Character ${characterId} not found for update`);
    return;
  }
  
    if (updates.saveName !== undefined) {
        list.characters[index].saveName = updates.saveName;
  }
  
  list.characters[index].lastModified = new Date().toISOString();
  saveCharacterList(list);
}

export function removeCharacterFromMetadataList(characterId: string): void {
  const list = loadCharacterList();
  list.characters = list.characters.filter(char => char.id !== characterId);
  
  // 如果删除的是活动角色，清除活动状态
  if (list.activeCharacterId === characterId) {
    list.activeCharacterId = null;
  }
  
  saveCharacterList(list);
}

// ===== 单个角色数据管理 =====
export function saveCharacterById(id: string, data: SheetData): void {
  try {
    const key = CHARACTER_DATA_PREFIX + id;
    localStorage.setItem(key, JSON.stringify(data));
    
      // 不再同步更新元数据中的角色名称
      // 只更新最后修改时间
      const list = loadCharacterList();
      const index = list.characters.findIndex(char => char.id === id);
      if (index !== -1) {
          list.characters[index].lastModified = new Date().toISOString();
          saveCharacterList(list);
      }
  } catch (error) {
    console.error(`[Character] Save failed for ${id} (Fast Fail):`, error);
    throw error; // 快速失败
  }
}

export function loadCharacterById(id: string): SheetData | null {
  try {
    const key = CHARACTER_DATA_PREFIX + id;
    const stored = localStorage.getItem(key);
    
    if (!stored) {
      console.warn(`[Character] No data found for ${id}`);
      return null;
    }
    
    const parsed = JSON.parse(stored);
    
    // 基本验证
    if (!parsed || typeof parsed !== 'object') {
      console.error(`[Character] Invalid data structure for ${id}`);
      return null;
    }
    
    // 确保具有focused_card_ids字段（向后兼容）
    if (!parsed.focused_card_ids) {
      parsed.focused_card_ids = [];
    }
    
    // 兼容性迁移：为旧角色添加 inventory_cards 字段
    if (!parsed.inventory_cards) {
      console.log(`[Migration] Adding inventory_cards to character ${id}`);
      parsed.inventory_cards = Array(20).fill(0).map(() => createEmptyCard());
      // 立即保存迁移后的数据
      saveCharacterById(id, parsed);
    }

    return parsed;
  } catch (error) {
    console.error(`[Character] Load failed for ${id} (Fast Fail):`, error);
    return null;
  }
}

export function deleteCharacterById(id: string): boolean {
  try {
    const key = CHARACTER_DATA_PREFIX + id;
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`[Character] Delete failed for ${id} (Fast Fail):`, error);
    return false;
  }
}

// ===== 活动角色管理 =====
export function setActiveCharacterId(id: string | null): void {
  try {
    if (id === null) {
      localStorage.removeItem(ACTIVE_CHARACTER_ID_KEY);
    } else {
      localStorage.setItem(ACTIVE_CHARACTER_ID_KEY, id);
    }
    
    // 同步更新角色列表中的活动状态
    const list = loadCharacterList();
    list.activeCharacterId = id;
    saveCharacterList(list);
  } catch (error) {
    console.error('[ActiveCharacter] Set failed (Fast Fail):', error);
    throw error;
  }
}

export function getActiveCharacterId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_CHARACTER_ID_KEY);
  } catch (error) {
    console.error('[ActiveCharacter] Get failed (Fast Fail):', error);
    return null;
  }
}

// ===== 角色操作 =====
export function createNewCharacter(name: string, order?: number): SheetData {
  const newCharacter: SheetData = {
    ...defaultSheetData,
    name: name || "新角色",
    // 注释：移除了 focused_card_ids 初始化，聚焦功能由双卡组系统取代
  };
  
  return newCharacter;
}

export function duplicateCharacter(originalId: string, newName: string): SheetData | null {
  const originalData = loadCharacterById(originalId);
  if (!originalData) {
    console.error(`[Character] Cannot duplicate ${originalId}: not found`);
    return null;
  }
  
  const duplicatedData: SheetData = {
    ...originalData,
    name: newName || `${originalData.name} (副本)`,
    // 注释：移除了 focused_card_ids 复制，聚焦功能由双卡组系统取代
  };
  
  return duplicatedData;
}

// ===== 数据迁移（快速失败策略） =====
export function migrateToMultiCharacterStorage(): void {
  console.log('[Migration] Starting multi-character storage migration...');
  
  try {
    // 检查是否已迁移
    const existingList = localStorage.getItem(CHARACTER_LIST_KEY);
    if (existingList) {
      console.log('[Migration] Already migrated, skipping');
      return;
    }
    
    // 加载旧数据
    const legacySheetData = localStorage.getItem(LEGACY_SHEET_DATA_KEY);
    const legacyFocusedCards = localStorage.getItem(LEGACY_FOCUSED_CARDS_KEY);
    
    let migratedCharacterData: SheetData;
    
    if (legacySheetData) {
      console.log('[Migration] Found legacy character data, migrating...');
      
      try {
        const parsed = JSON.parse(legacySheetData);
        
        // 创建迁移的角色数据
        migratedCharacterData = {
          ...parsed,
          // 合并旧的全局聚焦卡牌ID到角色数据中
          focused_card_ids: legacyFocusedCards ? JSON.parse(legacyFocusedCards) : []
        };
        
        console.log('[Migration] Legacy data parsed successfully');
      } catch (parseError) {
        console.error('[Migration] Failed to parse legacy data (Fast Fail):', parseError);
        const errorMessage = parseError instanceof Error ? parseError.message : '未知解析错误';
        throw new Error(`数据迁移失败：旧数据格式无效 - ${errorMessage}`);
      }
    } else {
      console.log('[Migration] No legacy data found, creating default character');
      
      // 没有旧数据，创建默认空白角色
      migratedCharacterData = createNewCharacter("我的角色");
    }
    
    // 生成新角色ID并保存
    const newCharacterId = generateCharacterId();
    saveCharacterById(newCharacterId, migratedCharacterData);
    
    // 创建角色元数据
    const metadata: CharacterMetadata = {
      id: newCharacterId,
        saveName: "迁移的存档", // 迁移时使用默认存档名
      lastModified: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      order: 0
    };
    
    // 创建新的角色列表
    const newCharacterList: CharacterList = {
      characters: [metadata],
      activeCharacterId: newCharacterId,
      lastUpdated: new Date().toISOString()
    };
    
    // 保存新结构
    saveCharacterList(newCharacterList);
    setActiveCharacterId(newCharacterId);
    
    // 清理旧数据（关键步骤）
    console.log('[Migration] Cleaning up legacy storage keys...');
    localStorage.removeItem(LEGACY_SHEET_DATA_KEY);
    localStorage.removeItem(LEGACY_FOCUSED_CARDS_KEY);
    localStorage.removeItem(LEGACY_PERSISTENT_FORM_DATA_KEY);
    
    console.log('[Migration] Successfully completed migration to multi-character system');
    
  } catch (error) {
    console.error('[Migration] CRITICAL FAILURE (Fast Fail):', error);
    
    // 快速失败：不尝试回滚，清晰提示用户
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    alert(`数据迁移失败！\n\n错误详情：${errorMessage}\n\n请刷新页面重试，或联系技术支持。`);
    
    throw error; // 向上抛出，阻止应用继续运行
  }
}

// ===== 安全清理函数 =====
export function safeCleanupForTesting(): void {
  console.log('[SafeCleanup] Starting safe cleanup for testing...');
  
  // 只清理角色系统相关的键
  const keysToRemove = [
    LEGACY_SHEET_DATA_KEY,
    LEGACY_FOCUSED_CARDS_KEY, 
    LEGACY_PERSISTENT_FORM_DATA_KEY,
    CHARACTER_LIST_KEY,
    ACTIVE_CHARACTER_ID_KEY
  ];
  
  keysToRemove.forEach(key => {
    if (localStorage.getItem(key) !== null) {
      localStorage.removeItem(key);
      console.log(`[SafeCleanup] Removed ${key}`);
    }
  });
  
  // 清理所有角色数据文件 (dh_character_*)
  const keysToCheck = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(CHARACTER_DATA_PREFIX)) {
      keysToCheck.push(key);
    }
  }
  
  keysToCheck.forEach(key => {
    localStorage.removeItem(key);
    console.log(`[SafeCleanup] Removed character data: ${key}`);
  });
  
  console.log(`[SafeCleanup] Cleanup completed. Removed ${keysToRemove.length + keysToCheck.length} keys.`);
}

// ===== 获取所有角色相关的localStorage键 =====
export function getAllCharacterStorageKeys(): string[] {
  const characterKeys = [];
  
  // 添加系统键
  const systemKeys = [
    LEGACY_SHEET_DATA_KEY,
    LEGACY_FOCUSED_CARDS_KEY,
    LEGACY_PERSISTENT_FORM_DATA_KEY,
    CHARACTER_LIST_KEY,
    ACTIVE_CHARACTER_ID_KEY
  ];
  
  systemKeys.forEach(key => {
    if (localStorage.getItem(key) !== null) {
      characterKeys.push(key);
    }
  });
  
  // 添加角色数据键
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(CHARACTER_DATA_PREFIX)) {
      characterKeys.push(key);
    }
  }
  
  return characterKeys;
}
