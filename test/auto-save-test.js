/**
 * 测试自动保存功能
 * 这个脚本可以在浏览器控制台中运行，用于验证角色数据的自动保存功能
 */

// 测试自动保存功能
function testAutoSave() {
    console.log('=== 开始测试自动保存功能 ===');

    // 1. 获取当前角色列表
    const { loadCharacterList, loadCharacterById, saveCharacterById } = window;

    if (!loadCharacterList || !loadCharacterById || !saveCharacterById) {
        console.error('❌ 多角色存储函数未找到，请确保在主应用页面运行此脚本');
        return;
    }

    const characterList = loadCharacterList();

    if (characterList.characters.length === 0) {
        console.error('❌ 没有找到任何角色，请先创建角色再测试');
        return;
    }

    console.log(`📋 找到 ${characterList.characters.length} 个角色`);

    // 2. 选择第一个角色进行测试
    const testCharacter = characterList.characters[0];
    console.log(`🎯 测试角色: ${testCharacter.name} (${testCharacter.id})`);

    // 3. 加载角色数据
    let characterData = loadCharacterById(testCharacter.id);
    if (!characterData) {
        console.error('❌ 无法加载角色数据');
        return;
    }

    console.log('✅ 角色数据加载成功');
    console.log('📝 当前角色名称:', characterData.name);
    console.log('📝 当前角色等级:', characterData.level);

    // 4. 修改角色数据
    const originalName = characterData.name;
    const originalLevel = characterData.level;
    const testName = `${originalName}_测试_${Date.now()}`;
    const testLevel = (parseInt(originalLevel) || 1) + 1;

    characterData.name = testName;
    characterData.level = testLevel.toString();

    console.log('🔄 修改角色数据:');
    console.log('  新名称:', testName);
    console.log('  新等级:', testLevel);

    // 5. 保存角色数据
    try {
        saveCharacterById(testCharacter.id, characterData);
        console.log('✅ 角色数据保存成功');
    } catch (error) {
        console.error('❌ 角色数据保存失败:', error);
        return;
    }

    // 6. 验证数据是否正确保存
    const savedData = loadCharacterById(testCharacter.id);
    if (!savedData) {
        console.error('❌ 无法加载保存后的角色数据');
        return;
    }

    console.log('🔍 验证保存结果:');
    console.log('  保存后名称:', savedData.name);
    console.log('  保存后等级:', savedData.level);

    // 7. 检查元数据是否同步更新
    const updatedList = loadCharacterList();
    const updatedCharacter = updatedList.characters.find(c => c.id === testCharacter.id);

    if (updatedCharacter) {
        console.log('🔍 验证元数据同步:');
        console.log('  元数据中的名称:', updatedCharacter.name);
        console.log('  元数据最后修改时间:', updatedCharacter.lastModified);
    }

    // 8. 验证结果
    const nameCorrect = savedData.name === testName;
    const levelCorrect = savedData.level === testLevel.toString();
    const metadataCorrect = updatedCharacter && updatedCharacter.name === testName;

    if (nameCorrect && levelCorrect && metadataCorrect) {
        console.log('🎉 自动保存功能测试通过！');
        console.log('✅ 角色数据正确保存');
        console.log('✅ 角色元数据正确同步');
    } else {
        console.log('❌ 自动保存功能测试失败：');
        if (!nameCorrect) console.log('  - 角色名称保存错误');
        if (!levelCorrect) console.log('  - 角色等级保存错误');
        if (!metadataCorrect) console.log('  - 角色元数据同步错误');
    }

    // 9. 恢复原始数据（可选）
    console.log('🔄 恢复原始数据...');
    characterData.name = originalName;
    characterData.level = originalLevel.toString();
    saveCharacterById(testCharacter.id, characterData);
    console.log('✅ 原始数据已恢复');

    console.log('=== 自动保存功能测试完成 ===');
}

// 测试localStorage直接访问
function testLocalStorageAccess() {
    console.log('=== 测试localStorage访问 ===');

    // 查看所有角色相关的localStorage键
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('dh_character_') || key === 'dh_character_list' || key === 'dh_active_character_id')) {
            keys.push(key);
        }
    }

    console.log(`📋 找到 ${keys.length} 个角色相关的localStorage键:`);
    keys.forEach(key => {
        console.log(`  - ${key}`);
    });

    // 显示活动角色ID
    const activeId = localStorage.getItem('dh_active_character_id');
    console.log(`🎯 活动角色ID: ${activeId}`);

    // 显示角色列表
    const listData = localStorage.getItem('dh_character_list');
    if (listData) {
        try {
            const list = JSON.parse(listData);
            console.log(`📝 角色列表: ${list.characters.length} 个角色`);
            list.characters.forEach(char => {
                console.log(`  - ${char.name} (${char.id})`);
            });
        } catch (error) {
            console.error('❌ 角色列表解析失败:', error);
        }
    }

    console.log('=== localStorage访问测试完成 ===');
}

// 导出函数到全局作用域
if (typeof window !== 'undefined') {
    window.testAutoSave = testAutoSave;
    window.testLocalStorageAccess = testLocalStorageAccess;
}

console.log('📋 自动保存测试脚本已加载');
console.log('使用方法:');
console.log('  testAutoSave() - 测试自动保存功能');
console.log('  testLocalStorageAccess() - 查看localStorage状态');
