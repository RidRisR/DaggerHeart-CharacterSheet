/* 快速缓存测试 - 复制到浏览器控制台运行 */

// 步骤 1: 打开 http://localhost:3002
// 步骤 2: 按 F12 打开开发者工具
// 步骤 3: 复制粘贴以下代码到控制台
// 步骤 4: 按回车运行

console.log('🚀 快速缓存测试开始...\n');

// 尝试访问 CustomCardStorage
let storage;
try {
  // 从全局变量获取（Next.js 应用中）
  storage = window.CustomCardStorage;
  if (!storage) {
    // 尝试从模块中获取
    const modules = Object.keys(window).filter(key => key.includes('card') || key.includes('Card'));
    console.log('可用模块:', modules);
  }
} catch (e) {
  console.log('正在查找 CustomCardStorage...');
}

// 如果找不到，提供替代方案
if (!storage) {
  console.log('💡 提示：CustomCardStorage 可能需要从页面中访问');
  console.log('请尝试以下步骤：');
  console.log('1. 确保在 DaggerHeart 应用页面中运行');
  console.log('2. 访问 /card-import-test 页面');
  console.log('3. 等待页面完全加载后再运行测试');
  
  // 尝试延迟获取
  setTimeout(() => {
    console.log('🔄 重新尝试获取 CustomCardStorage...');
    storage = window.CustomCardStorage;
    if (storage) {
      console.log('✅ 成功找到 CustomCardStorage！');
      runQuickTest();
    } else {
      console.log('❌ 仍然找不到 CustomCardStorage');
      console.log('请手动检查页面是否正确加载了卡牌系统');
    }
  }, 2000);
} else {
  console.log('✅ 找到 CustomCardStorage，开始测试...');
  runQuickTest();
}

function runQuickTest() {
  if (!window.CustomCardStorage) {
    console.log('❌ CustomCardStorage 不可用');
    return;
  }
  
  const storage = window.CustomCardStorage;
  
  console.log('\n📊 测试现有批次缓存性能...');
  
  // 获取现有批次
  const index = storage.loadIndex();
  const batches = Object.keys(index.batches);
  
  console.log(`📦 找到 ${batches.length} 个批次`);
  
  if (batches.length === 0) {
    console.log('💡 没有现有批次，创建测试批次...');
    
    // 创建测试数据
    const testData = {
      metadata: {
        id: 'QUICK_TEST',
        name: '快速测试',
        fileName: 'test.json',
        importTime: new Date().toISOString()
      },
      cards: [{ id: 'test1', name: '测试卡牌', type: 'test' }]
    };
    
    // 保存测试批次
    storage.saveBatch('QUICK_TEST', testData);
    batches.push('QUICK_TEST');
    console.log('✅ 已创建测试批次');
  }
  
  // 清理缓存
  if (storage.clearBatchCache) {
    storage.clearBatchCache();
    console.log('🧹 已清理缓存');
  }
  
  // 测试第一个批次
  const testBatch = batches[0];
  console.log(`\n🔍 测试批次: ${testBatch}`);
  
  // 记录 localStorage 访问
  let getItemCount = 0;
  const originalGetItem = localStorage.getItem;
  localStorage.getItem = function(key) {
    if (key.includes('batch')) {
      getItemCount++;
      console.log(`📂 localStorage.getItem 调用 #${getItemCount}: ${key}`);
    }
    return originalGetItem.call(this, key);
  };
  
  // 首次加载
  console.log('\n1️⃣ 首次加载（应访问 localStorage）:');
  const start1 = performance.now();
  const result1 = storage.loadBatch(testBatch);
  const time1 = performance.now() - start1;
  console.log(`   结果: ${result1 ? '✅' : '❌'} | 耗时: ${time1.toFixed(2)}ms`);
  
  // 二次加载
  console.log('\n2️⃣ 二次加载（应命中缓存）:');
  const start2 = performance.now();
  const result2 = storage.loadBatch(testBatch);
  const time2 = performance.now() - start2;
  console.log(`   结果: ${result2 ? '✅' : '❌'} | 耗时: ${time2.toFixed(2)}ms`);
  
  // 三次加载
  console.log('\n3️⃣ 三次加载（应命中缓存）:');
  const start3 = performance.now();
  const result3 = storage.loadBatch(testBatch);
  const time3 = performance.now() - start3;
  console.log(`   结果: ${result3 ? '✅' : '❌'} | 耗时: ${time3.toFixed(2)}ms`);
  
  // 恢复原始 localStorage
  localStorage.getItem = originalGetItem;
  
  // 分析结果
  console.log('\n📈 性能分析:');
  console.log(`   localStorage 访问次数: ${getItemCount}`);
  console.log(`   首次加载: ${time1.toFixed(2)}ms`);
  console.log(`   缓存加载: ${time2.toFixed(2)}ms`);
  console.log(`   加速比: ${(time1 / time2).toFixed(1)}x`);
  
  // 期望结果
  console.log('\n🎯 期望结果:');
  console.log(`   ✅ localStorage 访问次数应该是 1`);
  console.log(`   ✅ 缓存加载应该明显快于首次加载`);
  console.log(`   ✅ 后续加载应该显示"命中内存缓存"消息`);
  
  // 实际结果
  console.log('\n📊 实际结果:');
  console.log(`   localStorage 访问: ${getItemCount} 次 ${getItemCount === 1 ? '✅' : '❌'}`);
  console.log(`   性能提升: ${(time1 / time2).toFixed(1)}x ${time1 > time2 ? '✅' : '❌'}`);
  
  console.log('\n🎉 快速测试完成！');
  
  // 清理测试数据
  if (testBatch === 'QUICK_TEST') {
    storage.removeBatch('QUICK_TEST');
    console.log('🧹 已清理测试数据');
  }
}

console.log('\n💡 如果没有自动运行，请手动调用 runQuickTest()');
