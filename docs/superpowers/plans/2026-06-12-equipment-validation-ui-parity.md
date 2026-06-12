# Equipment Validation UI Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the equipment-pack validation experience up to the card-pack validation standard while sharing localized equipment diagnostic copy with formal equipment import details.

**Architecture:** Add one shared equipment diagnostic copy mapper under `equipment/ui`, then consume it from both the equipment editor dry-run validation mapping and the content-pack manager import diagnostic view. Keep the equipment validation result modal independent from the card-pack modal, but add equipment-side summary/group helpers so the UI stays testable.

**Tech Stack:** Next.js app router, React client components, TypeScript, Vitest, Testing Library, shadcn/Radix dialog/tabs/collapsible primitives, lucide-react icons.

---

## File Structure

- Create `equipment/ui/diagnostic-copy.ts`
  - Owns localized equipment diagnostic copy for UI surfaces.
  - Exports `localizeEquipmentDiagnostic()`, `formatLocalizedEquipmentDiagnosticMessage()`, and `equipmentFieldLabelFromPath()`.
- Modify `equipment/ui/types.ts`
  - Reuses shared diagnostic localization in `toDiagnosticView()` for formal import details and equipment initialization errors.
- Modify `app/card-editor/equipment/equipment-validation.ts`
  - Reuses shared diagnostic localization for editor validation.
  - Adds display summary and group helpers for the modal.
- Modify `app/card-editor/equipment/components/equipment-validation-results.tsx`
  - Adds quick overview, collapsible groups, improved success/failure copy, `按位置`, target-specific locate button labels.
- Modify `components/content-pack-manager/import-content-pack.ts`
  - Improves failed equipment import summary with error/warning counts.
- Modify tests:
  - `app/card-editor/equipment/__tests__/equipment-validation.test.ts`
  - `app/card-editor/equipment/components/__tests__/equipment-validation-results.test.tsx`
  - `components/content-pack-manager/__tests__/import-content-pack.test.ts`
  - `equipment/ui/__tests__/equipment-ui-store.test.ts`

---

### Task 1: Shared Equipment Diagnostic Localization

**Files:**
- Create: `equipment/ui/diagnostic-copy.ts`
- Modify: `app/card-editor/equipment/equipment-validation.ts`
- Test: `app/card-editor/equipment/__tests__/equipment-validation.test.ts`

- [ ] **Step 1: Write failing localization tests**

Append these tests inside `describe("equipment validation mapping", () => { ... })` in `app/card-editor/equipment/__tests__/equipment-validation.test.ts`:

```ts
  it("localizes focused equipment diagnostics for editor validation", () => {
    const friendly = mapEquipmentDiagnosticsToFriendly([
      {
        severity: "error",
        code: "UNKNOWN_FIELD",
        path: "/equipment/weapons/0/extra",
        message: "Unknown field is not allowed.",
        value: "unexpected",
      },
      {
        severity: "error",
        code: "FIELD_TOO_LONG",
        path: "/name",
        message: "Field is too long.",
        value: "x".repeat(101),
      },
      {
        severity: "error",
        code: "EMPTY_EQUIPMENT",
        path: "/equipment",
        message: "Equipment pack is empty.",
      },
      {
        severity: "warning",
        code: "DESCRIPTION_LONG",
        path: "/description",
        message: "Description is long.",
      },
    ]);

    expect(friendly[0]).toMatchObject({
      description: "该字段不是装备包格式支持的字段",
      suggestion: "请删除这个字段，然后重新验证",
    });
    expect(friendly[1].description).toBe("该字段内容过长");
    expect(friendly[1].suggestion).toContain("重新验证");
    expect(friendly[2]).toMatchObject({
      title: "装备包内容有问题",
      description: "装备包至少需要包含一件武器或一件护甲",
    });
    expect(friendly[3]).toMatchObject({
      severity: "warning",
      description: "描述内容较长，可能影响阅读体验",
    });
  });

  it("does not expose raw English pipeline messages in localized fallback copy", () => {
    const friendly = mapEquipmentDiagnosticsToFriendly([
      {
        severity: "error",
        code: "RUNTIME_CACHE_BUILD_FAILED",
        path: "",
        message: "Runtime cache build failed.",
      },
    ]);

    expect(friendly[0].description).not.toContain("Runtime cache build failed");
    expect(friendly[0].description).toBe("装备数据刷新失败");
    expect(friendly[0].suggestion).toContain("重新验证");
  });
```

- [ ] **Step 2: Run localization tests and verify RED**

Run:

```bash
pnpm vitest run app/card-editor/equipment/__tests__/equipment-validation.test.ts
```

Expected: FAIL because `UNKNOWN_FIELD`, `FIELD_TOO_LONG`, `EMPTY_EQUIPMENT`, `DESCRIPTION_LONG`, and runtime cache codes still use the old generic/English fallback.

- [ ] **Step 3: Add the shared diagnostic copy mapper**

Create `equipment/ui/diagnostic-copy.ts`:

```ts
import type { EquipmentPackApplicationDiagnostic } from "@/equipment/packs/application-service"

export type EquipmentDiagnosticCopyContext = "editorValidation" | "contentImport"

export interface LocalizedEquipmentDiagnosticCopy {
  description: string
  suggestion: string
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
  target: "修正目标",
  value: "修正值",
}

function actionForContext(context: EquipmentDiagnosticCopyContext) {
  return context === "editorValidation" ? "重新验证" : "重新导入"
}

function fixVerbForContext(context: EquipmentDiagnosticCopyContext) {
  return context === "editorValidation" ? "修改草稿" : "修改文件"
}

function conciseValue(value: unknown) {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return `当前值为 ${String(value)}。`
  }
  return ""
}

export function equipmentFieldLabelFromPath(path: string | undefined): string | undefined {
  if (!path) return undefined
  const parts = path.split("/").filter(Boolean)
  const leaf = parts[parts.length - 1]
  return leaf ? FIELD_NAMES[leaf] ?? leaf : undefined
}

export function localizeEquipmentDiagnostic(
  diagnostic: EquipmentPackApplicationDiagnostic,
  context: EquipmentDiagnosticCopyContext,
  field = equipmentFieldLabelFromPath(diagnostic.path),
): LocalizedEquipmentDiagnosticCopy {
  const action = actionForContext(context)
  const fixVerb = fixVerbForContext(context)
  const value = conciseValue(diagnostic.value)
  const fieldName = field ?? "该字段"

  switch (diagnostic.code) {
    case "MISSING_FIELD":
      return {
        description: `${fieldName}不能为空`,
        suggestion: `请补全${fieldName}后${action}`,
      }
    case "UNKNOWN_FIELD":
      return {
        description: "该字段不是装备包格式支持的字段",
        suggestion: `请删除这个字段，然后${action}`,
      }
    case "INVALID_TYPE":
      return {
        description: `${fieldName}的格式或取值不正确`,
        suggestion: `${value}请按装备包格式要求${fixVerb}，然后${action}`,
      }
    case "INVALID_ENUM":
      return {
        description: `${fieldName}不是装备包支持的选项`,
        suggestion: `${value}请从编辑器下拉选项或装备包 schema 允许的值中选择，然后${action}`,
      }
    case "FIELD_TOO_LONG":
      return {
        description: `${fieldName}内容过长`,
        suggestion: `请缩短${fieldName}内容后${action}`,
      }
    case "DUPLICATE_ID":
      return {
        description: "此 ID 已被同一装备包内的其他装备或修正项使用",
        suggestion: `请修改其中一个重复 ID，确保每件装备和每个修正项唯一，然后${action}`,
      }
    case "ID_CONFLICT":
      return {
        description: "此装备 ID 已被现有装备占用",
        suggestion: `请改用未被内置装备或已安装装备包使用的 ID，然后${action}`,
      }
    case "EMPTY_EQUIPMENT":
      return {
        description: "装备包至少需要包含一件武器或一件护甲",
        suggestion: `请添加武器或护甲后${action}`,
      }
    case "INVALID_THRESHOLD_ORDER":
      return {
        description: "严重阈值不能小于轻微阈值",
        suggestion: `请调整护甲阈值顺序后${action}`,
      }
    case "INVALID_CONTRIBUTION_TARGET":
      return {
        description: "数值修正目标不是装备支持的目标",
        suggestion: `请改用装备可作用的修正目标，然后${action}`,
      }
    case "MISSING_TEMPLATE_DESCRIPTION":
      return {
        description: "装备缺少描述",
        suggestion: `建议补充装备描述，方便玩家理解效果，然后${action}`,
      }
    case "DESCRIPTION_LONG":
      return {
        description: "描述内容较长，可能影响阅读体验",
        suggestion: `建议精简描述内容后${action}`,
      }
    case "SOURCE_READ_FAILED":
      return {
        description: "无法读取装备包来源",
        suggestion: `请确认文件可以被浏览器读取，然后${action}`,
      }
    case "INVALID_JSON":
      return {
        description: "文件不是有效的 JSON",
        suggestion: `请修复 JSON 语法后${action}`,
      }
    case "INVALID_FORMAT":
      return {
        description: "文件不是受支持的装备包格式",
        suggestion: `请确认 format 为 daggerheart.equipment-pack.v1，然后${action}`,
      }
    case "FILE_TOO_LARGE":
      return {
        description: "装备包文件过大",
        suggestion: `请压缩或拆分装备包内容后${action}`,
      }
    case "PACK_LIMIT_EXCEEDED":
      return {
        description: "自定义装备包数量已达到上限",
        suggestion: `请删除不再使用的装备包后${action}`,
      }
    case "TEMPLATE_LIMIT_EXCEEDED":
      return {
        description: "装备包内的装备数量超过上限",
        suggestion: `请减少装备条目数量后${action}`,
      }
    case "PACK_ID_GENERATION_FAILED":
      return {
        description: "无法生成装备包管理 ID",
        suggestion: `请稍后重试；如果仍然失败，请更换装备包名称后${action}`,
      }
    case "STORAGE_QUOTA_EXCEEDED":
      return {
        description: "浏览器存储空间不足",
        suggestion: "请清理不需要的内容包或浏览器数据后重试",
      }
    case "STORAGE_SERIALIZE_FAILED":
    case "STORAGE_WRITE_FAILED":
      return {
        description: "装备包写入存储失败",
        suggestion: "请确认浏览器存储可用后重试",
      }
    case "RUNTIME_CACHE_BUILD_FAILED":
    case "RUNTIME_CACHE_DUPLICATE_TEMPLATE_ID":
      return {
        description: "装备数据刷新失败",
        suggestion: `请检查装备 ID 是否冲突，修复后${action}`,
      }
    default:
      return {
        description: "当前字段未通过装备包校验",
        suggestion: `请检查该字段的格式和取值，然后${action}`,
      }
  }
}

export function formatLocalizedEquipmentDiagnosticMessage(copy: LocalizedEquipmentDiagnosticCopy): string {
  return `${copy.description}。${copy.suggestion}`
}
```

- [ ] **Step 4: Reuse the mapper in editor validation**

Modify `app/card-editor/equipment/equipment-validation.ts`:

1. Import shared functions:

```ts
import {
  equipmentFieldLabelFromPath,
  localizeEquipmentDiagnostic,
} from "@/equipment/ui/diagnostic-copy";
```

2. Replace the local `FIELD_NAMES`, `fieldLabel()`, `leafField()`, and `descriptionAndSuggestion()` implementations with:

```ts
function leafField(path: string | undefined) {
  if (!path) return undefined;
  const parts = path.split("/");
  return parts[parts.length - 1];
}

function fieldLabel(field: string | undefined) {
  return field ? equipmentFieldLabelFromPath(`/${field}`) ?? field : undefined;
}
```

3. In `mapEquipmentDiagnosticsToFriendly()`, replace:

```ts
const { description, suggestion } = descriptionAndSuggestion(diagnostic);
```

with:

```ts
const { description, suggestion } = localizeEquipmentDiagnostic(
  diagnostic,
  "editorValidation",
  field,
);
```

4. For unmapped diagnostics at path `/equipment`, use title `装备包内容有问题` and `specificGroup: "装备包内容"` instead of always `系统问题`.

- [ ] **Step 5: Run localization tests and verify GREEN**

Run:

```bash
pnpm vitest run app/card-editor/equipment/__tests__/equipment-validation.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit Task 1**

```bash
git add equipment/ui/diagnostic-copy.ts app/card-editor/equipment/equipment-validation.ts app/card-editor/equipment/__tests__/equipment-validation.test.ts
git commit -m "feat: localize equipment diagnostics"
```

---

### Task 2: Formal Equipment Import Diagnostic Reuse

**Files:**
- Modify: `equipment/ui/types.ts`
- Modify: `components/content-pack-manager/import-content-pack.ts`
- Test: `components/content-pack-manager/__tests__/import-content-pack.test.ts`
- Test: `equipment/ui/__tests__/equipment-ui-store.test.ts`

- [ ] **Step 1: Write failing content manager tests**

Update the `"maps failed equipment importer diagnostics"` test in `components/content-pack-manager/__tests__/import-content-pack.test.ts`:

```ts
  it("maps failed equipment importer diagnostics with localized copy and counts", async () => {
    const result = await importContentPackFiles(
      [jsonFile("equipment.json", { format: "daggerheart.equipment-pack.v1" })],
      {
        importEquipmentFile: vi.fn(async () => ({
          success: false,
          summary: { weaponCount: 0, armorCount: 0 },
          diagnostics: [
            {
              severity: "error" as const,
              code: "INVALID_JSON" as const,
              path: "/metadata",
              message: "Invalid JSON.",
              value: { format: "bad" },
            },
            {
              severity: "warning" as const,
              code: "DESCRIPTION_LONG" as const,
              path: "/description",
              message: "Description is long.",
            },
          ],
        })),
        importCardJson: vi.fn(),
        importDhcb: vi.fn(),
      },
    );

    expect(result.results[0]).toMatchObject({
      kind: "equipment",
      success: false,
      summary: "装备包导入失败：发现 1 个错误和 1 个警告",
      diagnostics: [
        {
          severity: "error",
          code: "INVALID_JSON",
          path: "/metadata",
          message: "文件不是有效的 JSON。请修复 JSON 语法后重新导入",
          value: { format: "bad" },
        },
        {
          severity: "warning",
          code: "DESCRIPTION_LONG",
          path: "/description",
          message: "描述内容较长，可能影响阅读体验。建议精简描述内容后重新导入",
        },
      ],
    });
  });
```

Add a card import guard test in the same file:

```ts
  it("keeps card import error messages unchanged", async () => {
    const result = await importContentPackFiles(
      [jsonFile("cards.json", { profession: [{ id: "bad" }] })],
      {
        importEquipmentFile: vi.fn(),
        importCardJson: vi.fn(async () => ({
          success: false,
          imported: 0,
          errors: ["card raw error"],
          batchId: undefined,
        })),
        importDhcb: vi.fn(),
      },
    );

    expect(result.results[0]).toMatchObject({
      kind: "card",
      success: false,
      summary: "卡牌包导入失败",
      diagnostics: [{ message: "card raw error" }],
    });
  });
```

- [ ] **Step 2: Write failing diagnostic view test**

Append to `equipment/ui/__tests__/equipment-ui-store.test.ts`:

```ts
import { toDiagnosticView } from "../types"
```

Then add inside `describe("equipment UI store", () => { ... })`:

```ts
  it("localizes runtime and storage diagnostic view messages", () => {
    expect(
      toDiagnosticView({
        severity: "error",
        code: "RUNTIME_CACHE_BUILD_FAILED",
        path: "",
        message: "Runtime cache build failed.",
      }),
    ).toMatchObject({
      code: "RUNTIME_CACHE_BUILD_FAILED",
      message: "装备数据刷新失败。请检查装备 ID 是否冲突，修复后重新导入",
    });

    expect(
      toDiagnosticView({
        severity: "error",
        code: "STORAGE_WRITE_FAILED",
        path: "",
        message: "Storage write failed.",
      }),
    ).toMatchObject({
      code: "STORAGE_WRITE_FAILED",
      message: "装备包写入存储失败。请确认浏览器存储可用后重试",
    });
  });
```

- [ ] **Step 3: Run import/UI tests and verify RED**

Run:

```bash
pnpm vitest run components/content-pack-manager/__tests__/import-content-pack.test.ts equipment/ui/__tests__/equipment-ui-store.test.ts
```

Expected: FAIL because formal import diagnostics still expose raw messages and failure summary is still `装备包导入失败`.

- [ ] **Step 4: Localize `toDiagnosticView()`**

Modify `equipment/ui/types.ts`:

```ts
import {
  formatLocalizedEquipmentDiagnosticMessage,
  localizeEquipmentDiagnostic,
} from "./diagnostic-copy"
```

Update `toDiagnosticView()`:

```ts
export function toDiagnosticView(diagnostic: EquipmentUiStoreDiagnostic): EquipmentUiDiagnosticView {
  const copy = localizeEquipmentDiagnostic(diagnostic, "contentImport")

  return {
    severity: diagnostic.severity,
    code: String(diagnostic.code),
    path: "path" in diagnostic ? diagnostic.path : "",
    message: formatLocalizedEquipmentDiagnosticMessage(copy),
    value: diagnostic.value,
  }
}
```

- [ ] **Step 5: Improve equipment import failure summary**

Modify `components/content-pack-manager/import-content-pack.ts`:

1. Add helper:

```ts
function equipmentFailureSummary(diagnostics: EquipmentUiStoreDiagnostic[]) {
  const errorCount = diagnostics.filter((diagnostic) => diagnostic.severity === "error").length
  const warningCount = diagnostics.filter((diagnostic) => diagnostic.severity === "warning").length
  if (warningCount > 0) {
    return `装备包导入失败：发现 ${errorCount} 个错误和 ${warningCount} 个警告`
  }
  return `装备包导入失败：发现 ${errorCount} 个错误`
}
```

2. Replace failed equipment summary:

```ts
summary: result.success ? `导入 ${importedCount} 个装备模板` : equipmentFailureSummary(result.diagnostics),
```

- [ ] **Step 6: Run import/UI tests and verify GREEN**

Run:

```bash
pnpm vitest run components/content-pack-manager/__tests__/import-content-pack.test.ts equipment/ui/__tests__/equipment-ui-store.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit Task 2**

```bash
git add equipment/ui/types.ts components/content-pack-manager/import-content-pack.ts components/content-pack-manager/__tests__/import-content-pack.test.ts equipment/ui/__tests__/equipment-ui-store.test.ts
git commit -m "feat: reuse equipment diagnostic copy in imports"
```

---

### Task 3: Equipment Validation Display Summary and Group Helpers

**Files:**
- Modify: `app/card-editor/equipment/equipment-validation.ts`
- Test: `app/card-editor/equipment/__tests__/equipment-validation.test.ts`

- [ ] **Step 1: Write failing helper tests**

Update imports in `app/card-editor/equipment/__tests__/equipment-validation.test.ts`:

```ts
  createEquipmentValidationDisplaySummary,
  groupEquipmentValidationDiagnostics,
```

Append tests:

```ts
  it("creates display summary for equipment validation results", () => {
    const diagnostics = mapEquipmentDiagnosticsToFriendly([
      { severity: "error", code: "MISSING_FIELD", path: "/name", message: "Required field is missing." },
      { severity: "error", code: "MISSING_FIELD", path: "/equipment/weapons/0/name", message: "Required field is missing." },
      { severity: "warning", code: "DESCRIPTION_LONG", path: "/equipment/armor/0/description", message: "Description is long." },
    ]);

    expect(
      createEquipmentValidationDisplaySummary(diagnostics, {
        packId: undefined,
        name: "测试装备包",
        version: "1.0.0",
        author: "作者",
        weaponCount: 2,
        armorCount: 1,
        warningCount: 1,
        errorCount: 2,
      }),
    ).toEqual({
      criticalIssues: 2,
      warningIssues: 1,
      affectedTypes: ["基础信息", "武器", "护甲"],
      equipmentItems: 3,
    });
  });

  it("groups friendly equipment diagnostics for display tabs", () => {
    const diagnostics = mapEquipmentDiagnosticsToFriendly([
      { severity: "error", code: "MISSING_FIELD", path: "/name", message: "Required field is missing." },
      { severity: "error", code: "MISSING_FIELD", path: "/equipment/weapons/0/name", message: "Required field is missing." },
      { severity: "warning", code: "DESCRIPTION_LONG", path: "/equipment/armor/0/description", message: "Description is long." },
      { severity: "error", code: "SOURCE_READ_FAILED", path: "", message: "Unable to read." },
    ]);

    const groups = groupEquipmentValidationDiagnostics(diagnostics);

    expect(groups.critical).toHaveLength(3);
    expect(groups.warnings).toHaveLength(1);
    expect(Object.keys(groups.bySpecificGroup)).toEqual([
      "基础信息",
      "第1件武器",
      "第1件护甲",
      "系统问题",
    ]);
    expect(Object.keys(groups.byGroupType)).toEqual(["基础信息", "武器", "护甲", "系统"]);
  });
```

- [ ] **Step 2: Run helper tests and verify RED**

Run:

```bash
pnpm vitest run app/card-editor/equipment/__tests__/equipment-validation.test.ts
```

Expected: FAIL because the helper exports do not exist.

- [ ] **Step 3: Add helper types and functions**

Append to `app/card-editor/equipment/equipment-validation.ts` after `mapEquipmentDiagnosticsToFriendly()`:

```ts
export interface EquipmentValidationDisplaySummary {
  criticalIssues: number;
  warningIssues: number;
  affectedTypes: string[];
  equipmentItems: number;
}

export interface EquipmentValidationGroups {
  critical: FriendlyEquipmentDiagnostic[];
  warnings: FriendlyEquipmentDiagnostic[];
  bySpecificGroup: Record<string, FriendlyEquipmentDiagnostic[]>;
  byGroupType: Record<string, FriendlyEquipmentDiagnostic[]>;
}

function groupDiagnosticsBy(
  diagnostics: FriendlyEquipmentDiagnostic[],
  getKey: (diagnostic: FriendlyEquipmentDiagnostic) => string,
) {
  const groups: Record<string, FriendlyEquipmentDiagnostic[]> = {};
  for (const diagnostic of diagnostics) {
    const key = getKey(diagnostic);
    groups[key] = [...(groups[key] ?? []), diagnostic];
  }
  return groups;
}

export function createEquipmentValidationDisplaySummary(
  diagnostics: FriendlyEquipmentDiagnostic[],
  summary: EquipmentPackApplicationImportResult["summary"],
): EquipmentValidationDisplaySummary {
  const affectedTypes = Array.from(
    new Set(diagnostics.map((diagnostic) => diagnostic.groupType)),
  );

  return {
    criticalIssues: diagnostics.filter((diagnostic) => diagnostic.severity === "error").length,
    warningIssues: diagnostics.filter((diagnostic) => diagnostic.severity === "warning").length,
    affectedTypes,
    equipmentItems: summary.weaponCount + summary.armorCount,
  };
}

export function groupEquipmentValidationDiagnostics(
  diagnostics: FriendlyEquipmentDiagnostic[],
): EquipmentValidationGroups {
  return {
    critical: diagnostics.filter((diagnostic) => diagnostic.severity === "error"),
    warnings: diagnostics.filter((diagnostic) => diagnostic.severity === "warning"),
    bySpecificGroup: groupDiagnosticsBy(diagnostics, (diagnostic) => diagnostic.specificGroup),
    byGroupType: groupDiagnosticsBy(diagnostics, (diagnostic) => diagnostic.groupType),
  };
}
```

- [ ] **Step 4: Run helper tests and verify GREEN**

Run:

```bash
pnpm vitest run app/card-editor/equipment/__tests__/equipment-validation.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit Task 3**

```bash
git add app/card-editor/equipment/equipment-validation.ts app/card-editor/equipment/__tests__/equipment-validation.test.ts
git commit -m "feat: add equipment validation display helpers"
```

---

### Task 4: Equipment Validation Modal UI Parity

**Files:**
- Modify: `app/card-editor/equipment/components/equipment-validation-results.tsx`
- Test: `app/card-editor/equipment/components/__tests__/equipment-validation-results.test.tsx`

- [ ] **Step 1: Write failing modal tests**

Update `app/card-editor/equipment/components/__tests__/equipment-validation-results.test.tsx`:

1. In the first test, change expected tabs from `["按优先级", "按装备", "按类型", "全部"]` to:

```ts
for (const tab of ["按优先级", "按位置", "按类型", "全部"]) {
  expect(screen.getByRole("tab", { name: tab })).toBeInTheDocument();
}
```

2. Add overview assertions after render:

```ts
    expect(screen.getByText("关键错误")).toBeInTheDocument();
    expect(screen.getByText("警告")).toBeInTheDocument();
    expect(screen.getByText("问题类型")).toBeInTheDocument();
    expect(screen.getByText("装备条目")).toBeInTheDocument();
    expect(screen.getByText("基础信息、武器、护甲、系统")).toBeInTheDocument();
```

3. Add metadata locate coverage to diagnostics:

```ts
        {
          severity: "error",
          code: "MISSING_FIELD",
          path: "/version",
          message: "Required field is missing.",
        },
```

4. Assert target-specific button labels:

```ts
    const metadataProblem = screen
      .getByText("装备包基础信息的版本号有问题")
      .closest("div");
    expect(metadataProblem).not.toBeNull();

    await user.click(
      within(metadataProblem as HTMLElement).getByRole("button", {
        name: "定位基础信息",
      }),
    );
    expect(onJumpToTarget).toHaveBeenCalledWith({
      tab: "metadata",
      field: "version",
    });
```

5. Assert footer copy:

```ts
    expect(screen.getByText(/你仍可导出草稿/)).toBeInTheDocument();
```

6. Update success test assertions:

```ts
    expect(screen.getByText("装备包检查通过")).toBeInTheDocument();
    expect(screen.getByText(/装备包可以导出并用于内容包管理导入/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "返回编辑器" })).toBeInTheDocument();
```

- [ ] **Step 2: Run modal tests and verify RED**

Run:

```bash
pnpm vitest run app/card-editor/equipment/components/__tests__/equipment-validation-results.test.tsx
```

Expected: FAIL because the modal still lacks overview, uses `按装备`, uses one locate label, and has old success/footer copy.

- [ ] **Step 3: Update modal imports**

Modify `app/card-editor/equipment/components/equipment-validation-results.tsx`:

```ts
import { useState, type ReactNode } from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, Lightbulb, XCircle } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  createEquipmentValidationDisplaySummary,
  groupEquipmentValidationDiagnostics,
  mapEquipmentDiagnosticsToFriendly,
  type EquipmentValidationJumpTarget,
  type FriendlyEquipmentDiagnostic,
} from "../equipment-validation";
```

- [ ] **Step 4: Use display helpers in `EquipmentValidationResults`**

Inside the component, after diagnostics/errors/warnings/isValid:

```ts
  const displaySummary = createEquipmentValidationDisplaySummary(
    diagnostics,
    validationResult.summary,
  );
  const groups = groupEquipmentValidationDiagnostics(diagnostics);
```

Update failure `DialogDescription`:

```tsx
`检测到 ${displaySummary.criticalIssues} 个关键问题和 ${displaySummary.warningIssues} 个警告，影响 ${displaySummary.affectedTypes.join("、")}。`
```

- [ ] **Step 5: Add quick overview block**

Render before `<Tabs>` in the failure branch:

```tsx
<div className="grid grid-cols-2 gap-3 rounded-lg border bg-gradient-to-r from-gray-50 to-gray-100 p-3 md:grid-cols-4 md:gap-4 md:p-4">
  <SummaryStat value={displaySummary.criticalIssues} label="关键错误" hint="必须修复" className="text-red-600" />
  <SummaryStat value={displaySummary.warningIssues} label="警告" hint="建议修复" className="text-amber-600" />
  <SummaryStat
    value={displaySummary.affectedTypes.length}
    label="问题类型"
    hint={displaySummary.affectedTypes.join("、") || "无"}
    className="text-blue-600"
  />
  <SummaryStat value={displaySummary.equipmentItems} label="装备条目" hint="武器 + 护甲" className="text-green-600" />
</div>
```

Add helper:

```tsx
function SummaryStat({
  value,
  label,
  hint,
  className,
}: {
  value: number;
  label: string;
  hint: string;
  className: string;
}) {
  return (
    <div className="text-center">
      <div className={`text-xl font-bold md:text-2xl ${className}`}>{value}</div>
      <div className="text-xs text-gray-600 md:text-sm">{label}</div>
      <div className={`mt-1 hidden text-xs md:block ${className}`}>{hint}</div>
    </div>
  );
}
```

- [ ] **Step 6: Update tabs and groups**

Change `TabsList` trigger from `按装备` to `按位置`.

Use helper groups:

```tsx
<DiagnosticGroup
  title="必须修复（正式导入前）"
  diagnostics={groups.critical}
  onJumpToTarget={onJumpToTarget}
/>
<DiagnosticGroup
  title="建议修复（提升质量）"
  diagnostics={groups.warnings}
  onJumpToTarget={onJumpToTarget}
/>
```

For position tab:

```tsx
{Object.entries(groups.bySpecificGroup).map(([title, items]) => (
  <DiagnosticGroup key={title} title={title} diagnostics={items} onJumpToTarget={onJumpToTarget} />
))}
```

For type tab:

```tsx
{Object.entries(groups.byGroupType).map(([title, items]) => (
  <DiagnosticGroup key={title} title={`${title}问题`} diagnostics={items} onJumpToTarget={onJumpToTarget} />
))}
```

- [ ] **Step 7: Make diagnostic groups collapsible and card copy richer**

Replace `DiagnosticGroup` with a collapsible version:

```tsx
function DiagnosticGroup({
  title,
  diagnostics,
  onJumpToTarget,
}: {
  title: string;
  diagnostics: FriendlyEquipmentDiagnostic[];
  onJumpToTarget?(target: EquipmentValidationJumpTarget): void;
}) {
  const [isOpen, setIsOpen] = useState(true);
  if (diagnostics.length === 0) return null;

  const hasError = diagnostics.some((diagnostic) => diagnostic.severity === "error");
  const Icon = hasError ? XCircle : AlertCircle;
  const colorClasses = hasError
    ? "border-red-200 bg-red-50 text-red-500"
    : "border-amber-200 bg-amber-50 text-amber-500";

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className={`flex w-full items-center justify-between rounded-lg border p-3 transition-colors hover:bg-opacity-80 ${colorClasses}`}>
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5" />
          <span className="font-medium text-foreground">{title}</span>
          <Badge variant={hasError ? "destructive" : "secondary"}>{diagnostics.length}</Badge>
        </div>
        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2">
        <div className="space-y-3">
          {diagnostics.map((diagnostic, index) => (
            <DiagnosticCard
              key={`${diagnostic.diagnostic.path}:${diagnostic.diagnostic.code}:${index}`}
              diagnostic={diagnostic}
              onJumpToTarget={onJumpToTarget}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
```

Update `DiagnosticCard` suggestion:

```tsx
<div className="flex items-start gap-2 rounded bg-blue-50 p-2">
  <Lightbulb className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-500" />
  <p className="text-sm text-blue-700">{diagnostic.suggestion}</p>
</div>
```

Add locate label helper:

```ts
function locateButtonLabel(target: EquipmentValidationJumpTarget) {
  return target.tab === "metadata" ? "定位基础信息" : "定位装备";
}
```

Use:

```tsx
{diagnostic.jumpTarget && onJumpToTarget ? (
  <Button type="button" variant="outline" size="sm" onClick={() => onJumpToTarget(diagnostic.jumpTarget!)}>
    {locateButtonLabel(diagnostic.jumpTarget)}
  </Button>
) : null}
```

- [ ] **Step 8: Update success and footer copy**

Update `SuccessSummary` heading/copy:

```tsx
<h3 className="mb-2 text-2xl font-semibold text-green-800">装备包检查通过</h3>
<p className="text-green-700">
  装备包包含 {validationResult.summary.weaponCount} 件武器和{" "}
  {validationResult.summary.armorCount} 件护甲，当前检查通过。
</p>
<div className="mt-4 inline-block rounded-lg border border-green-200 bg-white p-4 shadow-sm">
  <p className="font-medium text-green-600">装备包可以导出并用于内容包管理导入。</p>
</div>
```

Update footer:

```tsx
<div className="flex flex-col items-center justify-between gap-4 border-t pt-4 md:flex-row">
  <div className="text-center text-xs text-gray-500 md:text-left md:text-sm">
    {!isValid ? <>你仍可导出草稿；若要作为装备包导入使用，请先修复错误并点击工具栏的&quot;验证装备包&quot;按钮重新检查。</> : null}
  </div>
  <div className="flex w-full gap-3 md:w-auto">
    <Button variant="outline" onClick={onClose} className="flex-1 md:flex-none">
      关闭
    </Button>
    {isValid ? (
      <Button onClick={onClose} className="flex-1 bg-green-600 hover:bg-green-700 md:flex-none">
        <CheckCircle2 className="mr-2 h-4 w-4" />
        返回编辑器
      </Button>
    ) : null}
  </div>
</div>
```

- [ ] **Step 9: Run modal tests and verify GREEN**

Run:

```bash
pnpm vitest run app/card-editor/equipment/components/__tests__/equipment-validation-results.test.tsx
```

Expected: PASS.

- [ ] **Step 10: Commit Task 4**

```bash
git add app/card-editor/equipment/components/equipment-validation-results.tsx app/card-editor/equipment/components/__tests__/equipment-validation-results.test.tsx
git commit -m "feat: align equipment validation modal"
```

---

## Final Verification

After all tasks are complete, run:

```bash
pnpm vitest run \
  app/card-editor/equipment/__tests__/equipment-validation.test.ts \
  app/card-editor/equipment/components/__tests__/equipment-validation-results.test.tsx \
  components/content-pack-manager/__tests__/import-content-pack.test.ts \
  equipment/ui/__tests__/equipment-ui-store.test.ts
```

Expected: PASS.

Then run a broader related sweep:

```bash
pnpm vitest run \
  components/content-pack-manager/__tests__/global-import-panel.test.tsx \
  components/content-pack-manager/__tests__/equipment-pack-tab.test.tsx \
  app/card-editor/__tests__/equipment-editor-page.test.tsx
```

Expected: PASS.

## Plan Self-Review

- Spec coverage:
  - Layout parity: Task 4.
  - Diagnostic Chinese copy: Task 1.
  - Formal equipment import reuse: Task 2.
  - Summary/group helpers: Task 3.
  - Context boundaries: already captured in the spec/context commits before this plan.
- No shared card/equipment validation modal abstraction is introduced.
- Card pack import copy is guarded by Task 2 tests and remains unchanged.
- `GlobalImportPanel` layout is not redesigned; only equipment diagnostic messages and failed equipment summary are changed.
