// 测试多角色存储系统的数据迁移功能
import {
    migrateToMultiCharacterStorage,
    loadCharacterList,
    generateCharacterId,
    saveCharacterById,
    loadCharacterById
} from '../lib/multi-character-storage.ts';

// 模拟旧数据
const mockLegacyData = {
    name: "测试角色",
    level: "5",
    profession: "战士",
    cards: []
};

const mockLegacyFocusedCards = ["card1", "card2", "card3"];

// 测试函数
function testMigration() {
    console.log('=== 多角色存储系统迁移测试 ===');

    // 安全清理：只清理角色系统相关数据
    const keysToRemove = [
        "charactersheet_data",
        "focused_card_ids", 
        "persistentFormData",
        "dh_character_list",
        "dh_active_character_id"
    ];
    
    keysToRemove.forEach(key => {
        localStorage.removeItem(key);
    });
    
    // 清理角色数据文件
    for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && key.startsWith('dh_character_')) {
            localStorage.removeItem(key);
        }
    }

    // 1. 设置旧数据
    localStorage.setItem("charactersheet_data", JSON.stringify(mockLegacyData));
    localStorage.setItem("focused_card_ids", JSON.stringify(mockLegacyFocusedCards));
    localStorage.setItem("persistentFormData", "旧的持久数据");

    console.log('1. 设置旧数据完成');

    // 2. 执行迁移
    try {
        migrateToMultiCharacterStorage();
        console.log('2. 数据迁移成功');
    } catch (error) {
        console.error('2. 数据迁移失败:', error);
        return;
    }

    // 3. 验证迁移结果
    const characterList = loadCharacterList();
    console.log('3. 角色列表:', characterList);

    if (characterList.characters.length !== 1) {
        console.error('错误：应该有1个角色');
        return;
    }

    const characterId = characterList.characters[0].id;
    const characterData = loadCharacterById(characterId);
    console.log('4. 迁移的角色数据:', characterData);

    // 4. 验证数据完整性
    if (characterData?.name !== "测试角色") {
        console.error('错误：角色名不匹配');
        return;
    }

    if (!Array.isArray(characterData?.focused_card_ids) ||
        characterData.focused_card_ids.length !== 3) {
        console.error('错误：聚焦卡牌数据不匹配');
        return;
    }

    // 5. 验证旧数据已清理
    if (localStorage.getItem("charactersheet_data") !== null) {
        console.error('错误：旧的charactersheet_data未清理');
        return;
    }

    if (localStorage.getItem("focused_card_ids") !== null) {
        console.error('错误：旧的focused_card_ids未清理');
        return;
    }

    if (localStorage.getItem("persistentFormData") !== null) {
        console.error('错误：persistentFormData未清理');
        return;
    }

    console.log('✅ 所有测试通过！迁移功能正常工作');
}

// 测试重复迁移（应该跳过）
function testDuplicateMigration() {
    console.log('\n=== 重复迁移测试 ===');

    const beforeList = loadCharacterList();
    migrateToMultiCharacterStorage(); // 应该跳过
    const afterList = loadCharacterList();

    if (JSON.stringify(beforeList) === JSON.stringify(afterList)) {
        console.log('✅ 重复迁移测试通过：跳过已迁移的数据');
    } else {
        console.error('❌ 重复迁移测试失败：不应该重复迁移');
    }
}

// 运行测试
if (typeof window !== 'undefined') {
    testMigration();
    testDuplicateMigration();
}
