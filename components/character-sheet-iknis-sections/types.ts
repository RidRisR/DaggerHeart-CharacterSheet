// 材料需求接口
export interface MaterialCost {
  fragments?: { [key: string]: number }  // 碎片 (d6): 齿轮, 线圈, 缆线, 扳机, 镜头, 水晶
  metals?: { [key: string]: number }     // 金属 (d8): 铝, 铜, 钴, 银, 铂, 金
  components?: { [key: string]: number } // 组件 (d10): 保险丝, 电路, 碟片, 继电器, 电容器, 电池
  relics?: { [key: string]: number }     // 遗物
}

export interface UpgradeConfig {
  title: string
  cost: MaterialCost
  tier?: string
  checkboxes?: number
}

export interface ScrapMaterials {
  fragments?: number[]   // 6 items: 齿轮, 线圈, 缆线, 扳机, 镜头, 水晶
  metals?: number[]      // 6 items: 铝, 铜, 钴, 银, 铂, 金
  components?: number[]  // 6 items: 保险丝, 电路, 碟片, 继电器, 电容器, 电池
  relics?: string[]      // 5 custom text inputs
}

// 材料名称到存储位置的映射
export const MATERIAL_MAPPING = {
  fragments: {
    '齿轮': 0, '线圈': 1, '缆线': 2, '线': 2, '扳机': 3, '镜头': 4, '水晶': 5
  } as Record<string, number>,
  metals: {
    '铝': 0, '铜': 1, '钴': 2, '银': 3, '铂': 4, '铂金': 4, '金': 5
  } as Record<string, number>,
  components: {
    '保险丝': 0, '电路': 1, '碟片': 2, '圆盘': 2, '继电器': 3, '电容器': 4, '电池': 5
  } as Record<string, number>
}