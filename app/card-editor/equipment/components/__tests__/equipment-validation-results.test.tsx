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
  it("groups equipment diagnostics and jumps to mapped weapon and armor targets", async () => {
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
        errorCount: 3,
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

    for (const tab of ["按优先级", "按装备", "按类型", "全部"]) {
      expect(screen.getByRole("tab", { name: tab })).toBeInTheDocument();
    }

    const weaponProblem = screen
      .getByText("第1件武器的名称有问题")
      .closest("div");
    const armorProblem = screen
      .getByText("第1件护甲的描述有问题")
      .closest("div");
    const systemProblem = screen.getByText("系统问题").closest("div");

    expect(weaponProblem).not.toBeNull();
    expect(armorProblem).not.toBeNull();
    expect(systemProblem).not.toBeNull();

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
  });

  it("renders a success result", () => {
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
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText("验证通过！")).toBeInTheDocument();
    expect(screen.getByText(/2 件武器/)).toBeInTheDocument();
    expect(screen.getByText(/1 件护甲/)).toBeInTheDocument();
  });
});
