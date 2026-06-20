import "@testing-library/jest-dom/vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  createEditorValidationViewModel,
  type EditorValidationDiagnosticView,
  type EditorValidationViewModel,
} from "../../services/editor-validation-view-model";
import { EditorValidationResults } from "../editor-validation-results";

type TestJumpTarget = {
  tab: "metadata" | "items";
  index?: number;
  field?: string;
};

function diagnostic(
  overrides: Partial<EditorValidationDiagnosticView<TestJumpTarget>>,
): EditorValidationDiagnosticView<TestJumpTarget> {
  return {
    severity: "error",
    source: "import",
    title: "名称缺失",
    description: "条目缺少名称。",
    suggestion: "补充名称后重新验证。",
    groupType: "武器",
    specificGroup: "第1件武器",
    ...overrides,
  };
}

describe("editor validation results", () => {
  it("renders passed status as a standalone success screen without empty tabs", () => {
    const viewModel = createEditorValidationViewModel<TestJumpTarget>({
      checkedItemCount: 3,
      diagnostics: [],
    });

    render(
      <EditorValidationResults
        viewModel={viewModel}
        open
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText("验证完成")).toBeInTheDocument();
    expect(
      screen.getAllByText("草稿完全符合当前检查要求，可以导出发布文件。"),
    ).not.toHaveLength(0);
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
  });

  it("renders passedWithWarnings status with diagnostic groups", () => {
    const viewModel = createEditorValidationViewModel<TestJumpTarget>({
      checkedItemCount: 2,
      diagnostics: [
        diagnostic({
          severity: "warning",
          title: "描述较长",
          description: "描述内容可能过长。",
          suggestion: "精简描述。",
          groupType: "护甲",
          specificGroup: "第1件护甲",
        }),
      ],
    });

    render(
      <EditorValidationResults
        viewModel={viewModel}
        open
        onClose={vi.fn()}
      />,
    );

    expect(
      screen.getByText("草稿可以导出发布文件，但有建议处理的问题。"),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "按优先级" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /第1件护甲/ })).toBeInTheDocument();
    expect(screen.getByText("描述较长")).toBeInTheDocument();
    expect(screen.getByText("描述内容可能过长。")).toBeInTheDocument();
  });

  it("renders failed status with diagnostic groups and jump buttons", () => {
    const target: TestJumpTarget = {
      tab: "items",
      index: 0,
      field: "name",
    };
    const viewModel = createEditorValidationViewModel<TestJumpTarget>({
      checkedItemCount: 2,
      diagnostics: [
        diagnostic({
          severity: "error",
          jumpTarget: target,
          fieldLabel: "名称",
        }),
      ],
    });

    render(
      <EditorValidationResults
        viewModel={viewModel}
        open
        onClose={vi.fn()}
        onJumpToTarget={vi.fn()}
      />,
    );

    expect(
      screen.getAllByText("导出发布前应修复这些草稿问题。"),
    ).not.toHaveLength(0);
    expect(screen.getByRole("button", { name: /第1件武器/ })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "定位问题：名称缺失" }),
    ).toBeInTheDocument();
  });

  it("uses remaining dialog height for diagnostic scrolling instead of a fixed viewport height", () => {
    const viewModel = createEditorValidationViewModel<TestJumpTarget>({
      checkedItemCount: 2,
      diagnostics: [
        diagnostic({
          severity: "error",
          title: "最后一张卡片内容过长",
          description: "最后一张卡片有很多需要阅读的内容。",
          suggestion: "检查最后一张卡片的全部内容。",
        }),
      ],
    });

    const { container } = render(
      <EditorValidationResults
        viewModel={viewModel}
        open
        onClose={vi.fn()}
      />,
    );

    const scrollAreas = screen.getAllByLabelText("诊断列表");

    expect(scrollAreas).not.toHaveLength(0);
    expect(container.innerHTML).not.toContain("60vh");
  });

  it("renders summary counts for failed status even when diagnostics are empty", () => {
    const viewModel: EditorValidationViewModel<TestJumpTarget> = {
      status: "failed",
      title: "需要修复一些装备问题",
      description: "检测到 2 个关键问题。",
      summary: {
        errorCount: 2,
        warningCount: 1,
        checkedItemCount: 4,
      },
      diagnostics: [],
      groups: {
        critical: [],
        warnings: [],
        bySpecificGroup: {},
        byGroupType: {},
      },
    };

    render(
      <EditorValidationResults
        viewModel={viewModel}
        open
        onClose={vi.fn()}
      />,
    );

    expect(
      screen.getAllByText("导出发布前应修复这些草稿问题。"),
    ).not.toHaveLength(0);
    const overview = screen.getByRole("region", { name: "验证概览" });

    expect(within(overview).getByText("关键错误")).toBeInTheDocument();
    expect(within(overview).getByText("警告")).toBeInTheDocument();
    expect(within(overview).getByText("检查总数")).toBeInTheDocument();
    expect(within(overview).getByText("2")).toBeInTheDocument();
    expect(within(overview).getByText("1")).toBeInTheDocument();
    expect(within(overview).getByText("4")).toBeInTheDocument();
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
  });

  it("passes the view model jump target when a jump button is clicked", async () => {
    const user = userEvent.setup();
    const onJumpToTarget = vi.fn();
    const target: TestJumpTarget = {
      tab: "items",
      index: 1,
      field: "description",
    };
    const viewModel = createEditorValidationViewModel<TestJumpTarget>({
      checkedItemCount: 2,
      diagnostics: [
        diagnostic({
          severity: "error",
          jumpTarget: target,
          title: "描述缺失",
        }),
      ],
    });

    render(
      <EditorValidationResults
        viewModel={viewModel}
        open
        onClose={vi.fn()}
        onJumpToTarget={onJumpToTarget}
      />,
    );

    expect(screen.getByText("描述缺失")).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "定位问题：描述缺失" }),
    );

    expect(onJumpToTarget).toHaveBeenCalledWith(target);
  });
});
