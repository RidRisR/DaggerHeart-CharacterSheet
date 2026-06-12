import { describe, expect, it, vi } from "vitest";
import type { EquipmentPackApplicationService } from "@/equipment/packs/application-service";
import { createDefaultEquipmentServices } from "@/equipment/services/default-equipment-services";
import type { EquipmentEditorDraft } from "../equipment-draft";
import {
  createEditorLocalDiagnostics,
  mapEquipmentDiagnosticsToFriendly,
  targetFromDiagnosticPath,
  validateEquipmentEditorDraft,
} from "../equipment-validation";

describe("equipment validation mapping", () => {
  it("maps weapon paths to weapon jump targets", () => {
    expect(targetFromDiagnosticPath("/equipment/weapons/3/damage")).toEqual({
      tab: "weapons",
      index: 3,
      field: "damage",
    });
  });

  it("maps armor paths to armor jump targets", () => {
    expect(
      targetFromDiagnosticPath("/equipment/armor/1/baseThresholds/minor"),
    ).toEqual({
      tab: "armor",
      index: 1,
      field: "minor",
    });
  });

  it("maps metadata paths to metadata jump targets", () => {
    expect(targetFromDiagnosticPath("/name")).toEqual({
      tab: "metadata",
      field: "name",
    });
  });

  it("leaves system and unmapped paths without jump targets", () => {
    expect(targetFromDiagnosticPath("")).toBeUndefined();
    expect(targetFromDiagnosticPath("/equipment/weapons")).toBeUndefined();
  });

  it("groups diagnostics into friendly equipment errors", () => {
    const result = mapEquipmentDiagnosticsToFriendly([
      {
        severity: "error",
        code: "MISSING_FIELD",
        path: "/equipment/armor/1/baseThresholds/minor",
        message: "Required field is missing.",
      },
    ]);

    expect(result[0]).toMatchObject({
      severity: "error",
      title: "第2件护甲的轻微阈值有问题",
      groupType: "护甲",
      specificGroup: "第2件护甲",
    });
  });

  it("maps metadata and system diagnostics into friendly groups", () => {
    const result = mapEquipmentDiagnosticsToFriendly([
      {
        severity: "error",
        code: "INVALID_TYPE",
        path: "/version",
        message: "Invalid field type or value.",
      },
      {
        severity: "error",
        code: "SOURCE_READ_FAILED",
        path: "",
        message: "Unable to read.",
      },
    ]);

    expect(result[0]).toMatchObject({
      title: "装备包基础信息的版本号有问题",
      groupType: "基础信息",
      specificGroup: "基础信息",
      jumpTarget: { tab: "metadata", field: "version" },
    });
    expect(result[1]).toMatchObject({
      title: "系统问题",
      groupType: "系统",
      specificGroup: "系统问题",
      jumpTarget: undefined,
    });
  });

  it("adds editor-local duplicate id diagnostics before dry-run diagnostics", async () => {
    const importFromSource = vi.fn().mockResolvedValue({
      success: true,
      stage: "stageImportData",
      mode: "dryRun",
      summary: {
        weaponCount: 1,
        armorCount: 1,
        warningCount: 0,
        errorCount: 0,
      },
      diagnostics: [
        {
          severity: "error",
          code: "INVALID_TYPE",
          path: "/author",
          message: "Invalid field type or value.",
        },
      ],
    });
    const applicationService = {
      importFromSource,
    } as unknown as EquipmentPackApplicationService;
    const draft: EquipmentEditorDraft = {
      format: "daggerheart.equipment-pack.v1",
      name: "装备",
      version: "1.0.0",
      author: "",
      description: "",
      equipment: {
        weapons: [{ id: "dup" } as never],
        armor: [{ id: "dup" } as never],
      },
    };

    expect(createEditorLocalDiagnostics(draft)).toEqual([
      expect.objectContaining({
        code: "DUPLICATE_ID",
        path: "/equipment/armor/0/id",
        message: expect.stringContaining("dup"),
      }),
    ]);

    const result = await validateEquipmentEditorDraft(draft, applicationService);

    expect(importFromSource).toHaveBeenCalledTimes(1);
    expect(importFromSource.mock.calls[0][1]).toEqual({ mode: "dryRun" });
    expect(result.success).toBe(false);
    expect(result.summary.errorCount).toBe(2);
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: "DUPLICATE_ID",
        path: "/equipment/armor/0/id",
      }),
      expect.objectContaining({ code: "INVALID_TYPE", path: "/author" }),
    ]);
  });

  it("deduplicates local duplicate id diagnostics from the real dry-run pipeline", async () => {
    const { applicationService } = createDefaultEquipmentServices({
      storage: "memory",
    });
    const draft: EquipmentEditorDraft = {
      format: "daggerheart.equipment-pack.v1",
      name: "重复装备包",
      version: "1.0.0",
      author: "作者",
      description: "",
      equipment: {
        weapons: [
          {
            id: "dup",
            name: "短剑",
            tier: "T1",
            weaponType: "primary",
            trait: "agility",
            damageType: "physical",
            range: "melee",
            burden: "oneHanded",
            damage: "d8",
            featureName: "",
            description: "",
            modifierContributions: [],
          },
        ],
        armor: [
          {
            id: "dup",
            name: "皮甲",
            tier: "T1",
            baseArmorMax: 3,
            baseThresholds: { minor: 5, major: 10 },
            featureName: "",
            description: "",
            modifierContributions: [],
          },
        ],
      },
    };

    const result = await validateEquipmentEditorDraft(draft, applicationService);
    const duplicateDiagnostics = result.diagnostics.filter(
      (diagnostic) =>
        diagnostic.code === "DUPLICATE_ID" &&
        diagnostic.path === "/equipment/armor/0/id",
    );

    expect(result.success).toBe(false);
    expect(duplicateDiagnostics).toHaveLength(1);
    expect(result.summary.errorCount).toBe(1);
  });

  it("maps editor-local duplicate id diagnostics to item fields", () => {
    const friendly = mapEquipmentDiagnosticsToFriendly([
      {
        severity: "error",
        code: "DUPLICATE_ID",
        path: "/equipment/weapons/1/id",
        message: "装备 ID 重复：dup",
      },
    ]);

    expect(friendly[0]).toMatchObject({
      groupType: "武器",
      specificGroup: "第2件武器",
      field: "装备ID",
      jumpTarget: { tab: "weapons", index: 1, field: "id" },
    });
  });

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

    expect(friendly[0].description).not.toContain(
      "Runtime cache build failed",
    );
    expect(friendly[0].description).toBe("装备数据刷新失败");
    expect(friendly[0].suggestion).toContain("重新验证");
  });

  it("uses item labels instead of numeric path segments", () => {
    const friendly = mapEquipmentDiagnosticsToFriendly([
      {
        severity: "error",
        code: "INVALID_TYPE",
        path: "/equipment/weapons/0",
        message: "Invalid field type or value.",
      },
      {
        severity: "error",
        code: "INVALID_TYPE",
        path: "/equipment/armor/0",
        message: "Invalid field type or value.",
      },
    ]);

    expect(friendly[0].description).toBe("武器条目的格式或取值不正确");
    expect(friendly[1].description).toBe("护甲条目的格式或取值不正确");
  });

  it("localizes lifecycle and storage diagnostics explicitly", () => {
    const friendly = mapEquipmentDiagnosticsToFriendly([
      {
        severity: "error",
        code: "PACK_NOT_FOUND",
        path: "",
        message: "Pack not found.",
      },
      {
        severity: "warning",
        code: "ORPHAN_PACK_DATA_CLEANUP_PENDING",
        path: "",
        message: "Cleanup pending.",
      },
    ]);

    expect(friendly[0].description).toBe("找不到指定的装备包");
    expect(friendly[0].suggestion).toContain("刷新装备包列表");
    expect(friendly[1].description).toBe("发现未关联的装备包存储数据");
    expect(friendly[1].suggestion).toContain("自动清理");
  });
});
