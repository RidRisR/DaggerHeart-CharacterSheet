// 浏览器控制台版本的迁移测试脚本
// 复制此代码到浏览器控制台中运行

// 模拟旧数据
const mockLegacyData = {
  name: "测试角色",
  level: "5",
  profession: "战士",
  cards: []
};

const mockLegacyFocusedCards = ["card1", "card2", "card3"];

// 安全清理函数（仅清理角色系统相关数据）
function safeCleanupForConsoleTest() {
  console.log('开始安全清理角色系统数据...');
  
  const keysToRemove = [
    "charactersheet_data",
    "focused_card_ids", 
    "persistentFormData",
    "dh_character_list",
    "dh_active_character_id"
  ];
  
  let removedCount = 0;
  keysToRemove.forEach(key => {
    if (localStorage.getItem(key) !== null) {
      localStorage.removeItem(key);
      console.log(`已清理: ${key}`);
      removedCount++;
    }
  });
  
  // 清理角色数据文件
  const keysToCheck = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('dh_character_')) {
      keysToCheck.push(key);
    }
  }
  
  keysToCheck.forEach(key => {
    localStorage.removeItem(key);
    console.log(`已清理角色数据: ${key}`);
    removedCount++;
  });
  
  console.log(`✅ 安全清理完成，共清理了 ${removedCount} 个键，其他应用数据保留`);
  return removedCount;
}

// 测试数据迁移功能
async function testMigration() {
  console.log('=== 多角色存储系统迁移测试 ===');
  
  // 安全清理之前的测试数据
  safeCleanupForConsoleTest();
  
  // 1. 设置旧数据
  localStorage.setItem("charactersheet_data", JSON.stringify(mockLegacyData));
  localStorage.setItem("focused_card_ids", JSON.stringify(mockLegacyFocusedCards));
  localStorage.setItem("persistentFormData", "旧的持久数据");
  
  console.log('1. 设置旧数据完成');
  
  // 2. 动态导入多角色存储模块
  let multiCharacterStorage;
  try {
    // 在开发环境中，模块路径可能不同
    const module = await import('/lib/multi-character-storage.ts');
    multiCharacterStorage = module;
    console.log('2. 成功导入多角色存储模块');
  } catch (error) {
    console.error('2. 无法导入多角色存储模块:', error);
    console.log('提示：请确保在应用页面的控制台中运行此脚本');
    return;
  }
  
  // 3. 执行迁移
  try {
    multiCharacterStorage.migrateToMultiCharacterStorage();
    console.log('3. 数据迁移成功');
  } catch (error) {
    console.error('3. 数据迁移失败:', error);
    return;
  }
  
  // 4. 验证迁移结果
  const characterList = multiCharacterStorage.loadCharacterList();
  console.log('4. 角色列表:', characterList);
  
  if (characterList.characters.length !== 1) {
    console.error('❌ 错误：应该有1个角色');
    return;
  }
  
  const characterId = characterList.characters[0].id;
  const characterData = multiCharacterStorage.loadCharacterById(characterId);
  console.log('5. 迁移的角色数据:', characterData);
  
  // 5. 验证数据完整性
  if (characterData?.name !== "测试角色") {
    console.error('❌ 错误：角色名不匹配');
    return;
  }
  
  if (!Array.isArray(characterData?.focused_card_ids) || 
      characterData.focused_card_ids.length !== 3) {
    console.error('❌ 错误：聚焦卡牌数据不匹配');
    console.log('实际聚焦卡牌数据:', characterData?.focused_card_ids);
    return;
  }
  
  // 6. 验证旧数据已清理
  if (localStorage.getItem("charactersheet_data") !== null) {
    console.error('❌ 错误：旧的charactersheet_data未清理');
    return;
  }
  
  if (localStorage.getItem("focused_card_ids") !== null) {
    console.error('❌ 错误：旧的focused_card_ids未清理');
    return;
  }
  
  if (localStorage.getItem("persistentFormData") !== null) {
    console.error('❌ 错误：persistentFormData未清理');
    return;
  }
  
  console.log('✅ 所有测试通过！迁移功能正常工作');
  
  // 7. 测试重复迁移（应该跳过）
  console.log('\n=== 重复迁移测试 ===');
  
  const beforeList = multiCharacterStorage.loadCharacterList();
  multiCharacterStorage.migrateToMultiCharacterStorage(); // 应该跳过
  const afterList = multiCharacterStorage.loadCharacterList();
  
  if (JSON.stringify(beforeList) === JSON.stringify(afterList)) {
    console.log('✅ 重复迁移测试通过：跳过已迁移的数据');
  } else {
    console.error('❌ 重复迁移测试失败：不应该重复迁移');
  }
}

// 简化版测试（如果导入失败）
function testBasicFunctionality() {
  console.log('=== 基础功能测试 ===');
  
  // 测试localStorage基本功能
  localStorage.setItem("test_key", "test_value");
  const retrieved = localStorage.getItem("test_key");
  
  if (retrieved === "test_value") {
    console.log('✅ localStorage 基础功能正常');
  } else {
    console.error('❌ localStorage 基础功能异常');
  }
  
  localStorage.removeItem("test_key");
  
  // 显示当前localStorage内容（分类显示）
  console.log('当前 localStorage 内容:');
  
  const allKeys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) allKeys.push(key);
  }
  
  const characterKeys = allKeys.filter(key => 
    key === 'charactersheet_data' || 
    key === 'focused_card_ids' || 
    key === 'persistentFormData' ||
    key === 'dh_character_list' ||
    key === 'dh_active_character_id' ||
    key.startsWith('dh_character_')
  );
  
  const otherKeys = allKeys.filter(key => !characterKeys.includes(key));
  
  if (characterKeys.length > 0) {
    console.log('📋 角色系统相关数据:');
    characterKeys.forEach(key => {
      const value = localStorage.getItem(key);
      console.log(`  🎯 ${key}: ${value?.substring(0, 100)}...`);
    });
  }
  
  if (otherKeys.length > 0) {
    console.log('📋 其他应用数据 (不会被清理):');
    otherKeys.forEach(key => {
      const value = localStorage.getItem(key);
      console.log(`  🔒 ${key}: ${value?.substring(0, 50)}...`);
    });
  }
  
  console.log(`总计: ${allKeys.length} 个键 (${characterKeys.length} 个角色相关, ${otherKeys.length} 个其他)`);
}

// 添加安全清理命令
function safeCleanup() {
  return safeCleanupForConsoleTest();
}

// 运行测试
console.log('多角色存储系统测试工具已加载 (安全版本)');
console.log('运行命令:');
console.log('- testMigration() : 测试完整的数据迁移功能');
console.log('- testBasicFunctionality() : 测试基础功能和查看存储');
console.log('- safeCleanup() : 安全清理角色系统数据（保留其他应用数据）');

// 自动运行基础测试
testBasicFunctionality();
