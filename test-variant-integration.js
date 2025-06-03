/**
 * Variant Card System Integration Test
 * 验证变体卡牌系统集成是否正常工作
 */

// Import the necessary modules
const { CustomCardManager } = require('./data/card/custom-card-manager');
const { CustomCardStorage } = require('./data/card/card-storage');
const fs = require('fs');

// 测试数据
const testImportData = {
    "name": "变体卡牌集成测试",
    "version": "1.0.0",
    "description": "测试变体卡牌系统是否正确集成",
    "author": "系统测试",
    "customFieldDefinitions": {
        "variantTypes": {
            "测试类型": {
                "id": "测试类型",
                "name": "测试类型",
                "description": "用于测试的变体类型",
                "subclasses": ["子类1", "子类2"],
                "supportsLevel": true
            }
        }
    },
    "variant": [
        {
            "id": "test-variant-001",
            "名称": "测试变体卡牌",
            "类型": "测试类型",
            "子类别": "子类1",
            "等级": 1,
            "效果": "这是一张用于测试的变体卡牌",
            "简略信息": {
                "item1": "测试项目1",
                "item2": "测试项目2",
                "item3": "测试项目3"
            }
        }
    ]
};

async function testVariantCardIntegration() {
    console.log('🧪 开始变体卡牌系统集成测试...');
    
    try {
        // 清理之前的测试数据
        console.log('📦 清理测试环境...');
        const manager = CustomCardManager.getInstance();
        
        // 测试导入
        console.log('📥 测试导入变体卡牌...');
        const result = await manager.importCards(testImportData, 'integration-test');
        
        if (!result.success) {
            console.error('❌ 导入失败:', result.errors);
            return false;
        }
        
        console.log('✅ 导入成功!', {
            imported: result.imported,
            batchId: result.batchId
        });
        
        // 验证变体类型定义是否保存成功
        console.log('🔍 检查变体类型定义存储...');
        const aggregatedTypes = CustomCardStorage.getAggregatedVariantTypes();
        
        if (!aggregatedTypes['测试类型']) {
            console.error('❌ 变体类型定义未正确保存');
            return false;
        }
        
        console.log('✅ 变体类型定义保存成功:', Object.keys(aggregatedTypes));
        
        // 验证卡牌是否正确转换
        console.log('🃏 检查变体卡牌转换...');
        const allCards = manager.getAllCards();
        const variantCards = allCards.filter(card => card.type === 'variant');
        
        if (variantCards.length === 0) {
            console.error('❌ 变体卡牌未正确转换');
            return false;
        }
        
        console.log('✅ 变体卡牌转换成功:', variantCards.length, '张变体卡牌');
        
        // 清理测试数据
        console.log('🧹 清理测试数据...');
        if (result.batchId) {
            const removed = manager.removeBatch(result.batchId);
            if (!removed) {
                console.warn('⚠️ 测试数据清理失败，可能需要手动清理');
            } else {
                console.log('✅ 测试数据清理成功');
            }
        }
        
        console.log('🎉 变体卡牌系统集成测试通过!');
        return true;
        
    } catch (error) {
        console.error('❌ 集成测试失败:', error);
        return false;
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    testVariantCardIntegration()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('测试执行失败:', error);
            process.exit(1);
        });
}

module.exports = { testVariantCardIntegration };
