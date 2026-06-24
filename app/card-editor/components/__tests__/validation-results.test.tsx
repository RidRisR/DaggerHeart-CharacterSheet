import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { CardValidationJumpTarget } from "../../services/card-editor-validation";
import { createEditorValidationViewModel } from "../../services/editor-validation-view-model";
import { ValidationResults } from "../validation-results";

describe("card validation results", () => {
  it("renders warning-only validation as exportable with visible warnings", () => {
    const viewModel = createEditorValidationViewModel<CardValidationJumpTarget>({
      checkedItemCount: 1,
      diagnostics: [
        {
          severity: "warning",
          source: "import",
          title: "Legacy format assumed",
          description: "No format field; using legacy card format.",
          suggestion: "修改草稿后重新验证。",
          groupType: "系统",
          specificGroup: "卡牌包",
          technical: {
            code: "LEGACY_FORMAT_ASSUMED",
            internalPath: "",
          },
        },
      ],
      copy: {
        passedWithWarnings: {
          title: "卡牌包检查通过，但有建议处理的问题",
          description: "卡牌包包含 1 张卡牌，可以导出发布文件；建议处理 1 个警告。",
        },
      },
    });

    render(
      <ValidationResults
        validationResult={viewModel}
        open
        onClose={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("heading", {
        name: "卡牌包检查通过，但有建议处理的问题",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Legacy format assumed")).toBeInTheDocument();
    expect(screen.getByText("No format field; using legacy card format.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "开始导出" })).toBeInTheDocument();
    expect(
      screen.queryByText(/修复问题后，点击工具栏的"验证卡牌包"按钮重新检查/),
    ).not.toBeInTheDocument();
  });

  it("keeps metadata jump targets for card package metadata diagnostics", async () => {
    const user = userEvent.setup();
    const onJumpToMetadata = vi.fn();
    const viewModel = createEditorValidationViewModel<CardValidationJumpTarget>({
      checkedItemCount: 0,
      diagnostics: [
        {
          severity: "error",
          source: "import",
          title: "卡牌包名称有问题",
          description: "名称不能为空",
          suggestion: "请补全名称",
          fieldLabel: "名称",
          authorPath: "/name",
          groupType: "系统",
          specificGroup: "系统问题",
          jumpTarget: { tab: "metadata", field: "name" },
          technical: {
            code: "MISSING_FIELD",
            internalPath: "/name",
          },
        },
      ],
    });

    render(
      <ValidationResults
        validationResult={viewModel}
        open
        onClose={vi.fn()}
        onJumpToMetadata={onJumpToMetadata}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "定位问题：卡牌包名称有问题" }),
    );

    expect(onJumpToMetadata).toHaveBeenCalledTimes(1);
  });
});
