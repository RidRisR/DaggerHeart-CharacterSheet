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
    for (const label of ["关键错误", "警告", "问题类型", "装备条目"]) {
      expect(within(overview).getByText(label)).toBeInTheDocument();
    }
    expect(
      within(overview).getByText("基础信息、武器、护甲、系统"),
    ).toBeInTheDocument();
    expect(within(overview).getByText("武器 + 护甲")).toBeInTheDocument();
    const requiredGroup = screen.getByRole("button", {
      name: /必须修复（正式导入前）/,
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
    const systemProblem = screen.getByText("系统问题").closest("div");

    expect(metadataProblem).not.toBeNull();
    expect(weaponProblem).not.toBeNull();
    expect(armorProblem).not.toBeNull();
    expect(systemProblem).not.toBeNull();

    await user.click(
      within(metadataProblem as HTMLElement).getByRole("button", {
        name: "定位基础信息",
      }),
    );
    expect(onJumpToTarget).toHaveBeenCalledWith({
      tab: "metadata",
      field: "version",
    });

    await user.click(
      within(weaponProblem as HTMLElement).getByRole("button", {
        name: "定位装备",
      }),
    );
    expect(onJumpToTarget).toHaveBeenCalledWith({
      tab: "weapons",
      index: 0,
      field: "name",
    });

    await user.click(
      within(armorProblem as HTMLElement).getByRole("button", {
        name: "定位装备",
      }),
    );
    expect(onJumpToTarget).toHaveBeenCalledWith({
      tab: "armor",
      index: 0,
      field: "description",
    });

    expect(
      within(systemProblem as HTMLElement).queryByRole("button", {
        name: "定位装备",
      }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "按位置" }));
    expect(screen.getByRole("button", { name: /^基础信息/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^第1件武器/ })).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "按类型" }));
    expect(screen.getByRole("button", { name: /^基础信息问题/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^武器问题/ })).toBeInTheDocument();

    expect(screen.getByText(/你仍可导出草稿/)).toBeInTheDocument();
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
      screen.getByText("装备包可以导出并用于内容包管理导入。"),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(/装备包包含 2 件武器和 1 件护甲/),
    ).toHaveLength(2);

    await user.click(screen.getByRole("button", { name: "关闭" }));
    expect(onClose).toHaveBeenCalledOnce();

    await user.click(screen.getByRole("button", { name: "返回编辑器" }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
