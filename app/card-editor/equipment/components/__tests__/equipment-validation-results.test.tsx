import "@testing-library/jest-dom/vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { EquipmentPackApplicationImportResult } from "@/equipment/packs/application-service";
import { EquipmentValidationResults } from "../equipment-validation-results";

function makeResult(
  overrides: Partial<EquipmentPackApplicationImportResult>,
): EquipmentPackApplicationImportResult {
  return {
    success: false,
    stage: "structuralValidation",
    mode: "dryRun",
    storageCommitted: false,
    diagnostics: [],
    summary: {
      packId: undefined,
      name: "测试装备包",
      version: "1.0.0",
      author: "作者",
      weaponCount: 1,
      armorCount: 1,
      warningCount: 0,
      errorCount: 0,
    },
    ...overrides,
  };
}

describe("equipment validation results", () => {
  it("groups equipment diagnostics and jumps to mapped metadata, weapon, and armor targets", async () => {
    const user = userEvent.setup();
    const onJumpToTarget = vi.fn();
    const result = makeResult({
      success: false,
      diagnostics: [
        {
          severity: "error",
          code: "MISSING_FIELD",
          path: "/name",
          message: "Name is required.",
        },
        {
          severity: "error",
          code: "MISSING_FIELD",
          path: "/version",
          message: "Version is required.",
        },
        {
          severity: "error",
          code: "MISSING_FIELD",
          path: "/equipment/weapons/0/name",
          message: "Weapon name is required.",
        },
        {
          severity: "warning",
          code: "DESCRIPTION_LONG",
          path: "/equipment/armor/0/description",
          message: "Armor description is long.",
        },
        {
          severity: "error",
          code: "SOURCE_READ_FAILED",
          path: "",
          message: "Unable to read source.",
        },
      ],
      summary: {
        packId: undefined,
        name: "测试装备包",
        version: "1.0.0",
        author: "作者",
        weaponCount: 1,
        armorCount: 1,
        warningCount: 1,
        errorCount: 4,
      },
    });

    render(
      <EquipmentValidationResults
        validationResult={result}
        open
        onClose={vi.fn()}
        onJumpToTarget={onJumpToTarget}
      />,
    );

    for (const tab of ["按优先级", "按位置", "按类型", "全部"]) {
      expect(screen.getByRole("tab", { name: tab })).toBeInTheDocument();
    }

    const overview = screen.getByRole("region", { name: "验证概览" });
    for (const label of ["关键错误", "警告", "问题类型", "检查总数"]) {
      expect(within(overview).getByText(label)).toBeInTheDocument();
    }
    expect(
      within(overview).getByText("基础信息、武器、护甲、系统"),
    ).toBeInTheDocument();
    expect(within(overview).getByText("已验证")).toBeInTheDocument();
    const requiredGroup = screen.getByRole("button", {
      name: /^基础信息/,
    });
    expect(requiredGroup).toHaveAttribute("aria-expanded", "true");
    await user.click(requiredGroup);
    expect(requiredGroup).toHaveAttribute("aria-expanded", "false");
    await user.click(requiredGroup);

    const metadataProblem = screen
      .getByText("装备包基础信息的版本号有问题")
      .closest("div");
    const weaponProblem = screen
      .getByText("第1件武器的名称有问题")
      .closest("div");
    const armorProblem = screen
      .getByText("第1件护甲的描述有问题")
      .closest("div");

    expect(metadataProblem).not.toBeNull();
    expect(weaponProblem).not.toBeNull();
    expect(armorProblem).not.toBeNull();
    expect(screen.getAllByText("系统问题")).not.toHaveLength(0);

    const jumpButtons = screen.getAllByRole("button", {
      name: /^定位问题：/,
    });

    await user.click(jumpButtons[1]);
    expect(onJumpToTarget).toHaveBeenCalledWith({
      tab: "metadata",
      field: "version",
    });

    await user.click(jumpButtons[2]);
    expect(onJumpToTarget).toHaveBeenCalledWith({
      tab: "weapons",
      index: 0,
      field: "name",
    });

    await user.click(jumpButtons[3]);
    expect(onJumpToTarget).toHaveBeenCalledWith({
      tab: "armor",
      index: 0,
      field: "description",
    });

    expect(jumpButtons).toHaveLength(4);

    await user.click(screen.getByRole("tab", { name: "按位置" }));
    expect(screen.getByRole("button", { name: /^基础信息/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^第1件武器/ })).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "按类型" }));
    expect(screen.getByRole("button", { name: /^基础信息问题/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^武器问题/ })).toBeInTheDocument();

    expect(
      screen.getByText("导出发布前应修复这些草稿问题。"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "开始导出" })).not.toBeInTheDocument();
  });

  it("renders a success result and closes from the primary footer action", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const result = makeResult({
      success: true,
      diagnostics: [],
      summary: {
        packId: undefined,
        name: "测试装备包",
        version: "1.0.0",
        author: "作者",
        weaponCount: 2,
        armorCount: 1,
        warningCount: 0,
        errorCount: 0,
      },
    });

    render(
      <EquipmentValidationResults
        validationResult={result}
        open
        onClose={onClose}
      />,
    );

    expect(
      screen.getAllByRole("heading", { name: "装备包检查通过" }),
    ).not.toHaveLength(0);
    expect(
      screen.getAllByText("草稿完全符合当前检查要求，可以导出发布文件。"),
    ).not.toHaveLength(0);
    expect(screen.getByText(/草稿包含/)).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText(/个检查对象，当前检查通过/)).toBeInTheDocument();
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "关闭" }));
    expect(onClose).toHaveBeenCalledOnce();

    await user.click(screen.getByRole("button", { name: "开始导出" }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
