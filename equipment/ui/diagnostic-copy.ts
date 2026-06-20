import type { EquipmentPackApplicationDiagnostic } from "@/equipment/packs/application-service";

export type EquipmentDiagnosticCopyContext = "editorValidation" | "contentImport";

export interface LocalizedEquipmentDiagnosticCopy {
  description: string;
  suggestion: string;
}

const FIELD_NAMES: Record<string, string> = {
  id: "装备ID",
  name: "名称",
  version: "版本号",
  author: "作者",
  description: "描述",
  format: "格式",
  equipment: "装备列表",
  weapons: "武器列表",
  armor: "护甲列表",
  weaponItem: "武器条目",
  armorItem: "护甲条目",
  tier: "等级",
  weaponType: "武器类型",
  trait: "属性",
  damageType: "伤害类型",
  range: "范围",
  burden: "负荷",
  damage: "伤害",
  baseArmorMax: "基础护甲槽",
  baseThresholds: "伤害阈值",
  minor: "轻微阈值",
  major: "严重阈值",
  featureName: "特性名称",
  modifierContributions: "数值修正",
  modifierContribution: "数值修正条目",
  target: "修正目标",
  value: "数值",
};

function fieldNameOrDefault(field: string | undefined) {
  return field ?? "该字段";
}

function leafField(path: string | undefined) {
  if (!path) return undefined;
  const parts = path.split("/").filter(Boolean);
  const leaf = parts[parts.length - 1];

  if (leaf && /^\d+$/.test(leaf)) {
    const parent = parts[parts.length - 2];
    if (parent === "weapons") return "weaponItem";
    if (parent === "armor") return "armorItem";
    if (parent === "modifierContributions") return "modifierContribution";
    return parent;
  }

  return leaf;
}

export function equipmentFieldLabelFromPath(
  path: string | undefined,
): string | undefined {
  const field = leafField(path);
  return field ? FIELD_NAMES[field] ?? field : undefined;
}

export function localizeEquipmentDiagnostic(
  diagnostic: EquipmentPackApplicationDiagnostic,
  _context: EquipmentDiagnosticCopyContext,
  field = equipmentFieldLabelFromPath(diagnostic.path),
): LocalizedEquipmentDiagnosticCopy {
  const fieldName = fieldNameOrDefault(field);

  switch (diagnostic.code) {
    case "MISSING_FIELD":
      return {
        description: `${fieldName}不能为空`,
        suggestion: `请补全${fieldName}`,
      };
    case "UNKNOWN_FIELD":
      return {
        description: "该字段不是装备包格式支持的字段",
        suggestion: "请删除这个字段",
      };
    case "INVALID_TYPE":
      return {
        description: `${fieldName}的格式或取值不正确`,
        suggestion: `请按装备包格式要求修正${fieldName}`,
      };
    case "INVALID_ENUM":
      return {
        description: `${fieldName}不是装备包支持的选项`,
        suggestion: "请从装备包支持的选项中选择",
      };
    case "FIELD_TOO_LONG":
      return {
        description: "该字段内容过长",
        suggestion: "请缩短该字段内容",
      };
    case "DUPLICATE_ID":
      return {
        description: "装备 ID 重复",
        suggestion: "请修改其中一个重复 ID，确保每件装备唯一",
      };
    case "ID_CONFLICT":
      return {
        description: "此装备 ID 已被现有装备占用",
        suggestion: "请改用未被内置装备或已安装装备包使用的 ID",
      };
    case "EMPTY_EQUIPMENT":
      return {
        description: "装备包至少需要包含一件武器或一件护甲",
        suggestion: "请添加武器或护甲",
      };
    case "INVALID_THRESHOLD_ORDER":
      return {
        description: "严重阈值不能小于轻微阈值",
        suggestion: "请调整护甲阈值顺序",
      };
    case "INVALID_CONTRIBUTION_TARGET":
      return {
        description: "数值修正目标不是装备支持的目标",
        suggestion: "请改用装备支持的修正目标",
      };
    case "MISSING_TEMPLATE_DESCRIPTION":
      return {
        description: "装备缺少描述",
        suggestion: "建议补充装备描述，方便玩家理解效果",
      };
    case "DESCRIPTION_LONG":
      return {
        description: "描述内容较长，可能影响阅读体验",
        suggestion: "建议精简描述内容",
      };
    case "SOURCE_READ_FAILED":
      return {
        description: "无法读取装备包来源",
        suggestion: "请确认文件可以被读取",
      };
    case "INVALID_JSON":
      return {
        description: "文件不是有效的 JSON",
        suggestion: "请修复 JSON 语法",
      };
    case "INVALID_FORMAT":
      return {
        description: "文件不是受支持的装备包格式",
        suggestion: "请确认 format 为 daggerheart.equipment-pack.v1",
      };
    case "FILE_TOO_LARGE":
      return {
        description: "装备包文件过大",
        suggestion: "请压缩或拆分装备包内容",
      };
    case "PACK_LIMIT_EXCEEDED":
      return {
        description: "自定义装备包数量已达到上限",
        suggestion: "请删除不再使用的装备包",
      };
    case "TEMPLATE_LIMIT_EXCEEDED":
      return {
        description: "装备包内的装备数量超过上限",
        suggestion: "请减少装备条目数量",
      };
    case "PACK_ID_GENERATION_FAILED":
      return {
        description: "无法生成装备包管理 ID",
        suggestion: "请稍后重试；如果仍然失败，请更换装备包名称",
      };
    case "STORAGE_QUOTA_EXCEEDED":
      return {
        description: "浏览器存储空间不足",
        suggestion: "请清理不需要的内容包或浏览器数据后重试",
      };
    case "STORAGE_SERIALIZE_FAILED":
      return {
        description: "装备包存储数据准备失败",
        suggestion: "请检查装备包内容后重试",
      };
    case "STORAGE_WRITE_FAILED":
      return {
        description: "装备包写入存储失败",
        suggestion: "请确认浏览器存储可用后重试",
      };
    case "PACK_NOT_FOUND":
      return {
        description: "找不到指定的装备包",
        suggestion: "请刷新装备包列表后重试",
      };
    case "PACK_ID_CONFLICT":
      return {
        description: "装备包管理 ID 已被占用",
        suggestion: "请稍后重试；如果仍然失败，请更换装备包名称",
      };
    case "PACK_ID_RESERVED":
      return {
        description: "装备包管理 ID 使用了系统保留值",
        suggestion: "请重新导入该装备包，或修改其存储 ID",
      };
    case "INDEX_READ_FAILED":
    case "INDEX_PARSE_FAILED":
    case "INDEX_FORMAT_INVALID":
      return {
        description: "装备包索引读取失败",
        suggestion: "请刷新页面后重试；如果仍然失败，请备份数据后清理损坏的装备包数据",
      };
    case "PACK_DATA_READ_FAILED":
    case "PACK_DATA_PARSE_FAILED":
    case "PACK_DATA_FORMAT_INVALID":
      return {
        description: "装备包数据读取失败",
        suggestion: "请删除或重新导入损坏的装备包",
      };
    case "ROLLBACK_FAILED":
      return {
        description: "装备包写入失败且回滚未完成",
        suggestion: "请刷新页面并检查装备包列表，必要时重新导入",
      };
    case "ORPHAN_PACK_DATA":
    case "MISSING_PACK_DATA":
      return {
        description: "装备包存储数据不完整",
        suggestion: "请刷新页面让系统修复索引，必要时重新导入装备包",
      };
    case "TEMPLATE_ID_CONFLICT":
      return {
        description: "装备模板 ID 存在冲突",
        suggestion: "请修改冲突的装备 ID",
      };
    case "ORPHAN_PACK_DATA_CLEANUP_PENDING":
      return {
        description: "发现未关联的装备包存储数据",
        suggestion: "系统会尝试自动清理；如果问题持续，请刷新页面后重试",
      };
    case "RUNTIME_CACHE_BUILD_FAILED":
      return {
        description: "装备数据刷新失败",
        suggestion: "请检查装备 ID 是否冲突",
      };
    case "RUNTIME_CACHE_DUPLICATE_TEMPLATE_ID":
      return {
        description: "装备数据刷新失败",
        suggestion: "请修改重复的装备 ID",
      };
    case "RUNTIME_CACHE_RESERVED_PACK_ID":
      return {
        description: "装备包 ID 使用了系统保留值",
        suggestion: "请重新导入该装备包，或修改其存储 ID",
      };
    default:
      return {
        description: "当前字段未通过装备包校验",
        suggestion: "请检查该字段的格式和取值",
      };
  }
}

export function formatLocalizedEquipmentDiagnosticMessage(
  copy: LocalizedEquipmentDiagnosticCopy,
): string {
  return `${copy.description}。${copy.suggestion}`;
}
