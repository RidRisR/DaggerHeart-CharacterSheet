import { describe, expect, it } from "vitest";
import {
  createEditorValidationViewModel,
  type EditorValidationDiagnosticView,
} from "../editor-validation-view-model";

interface TestJumpTarget {
  tab: "metadata" | "items";
  index?: number;
  field?: string;
}

function diagnostic(
  overrides: Partial<EditorValidationDiagnosticView<TestJumpTarget>>,
): EditorValidationDiagnosticView<TestJumpTarget> {
  return {
    severity: "error",
    source: "import",
    title: "Name is required",
    description: "The item name is missing.",
    suggestion: "Add a name and validate again.",
    groupType: "Items",
    specificGroup: "Item 1",
    ...overrides,
  };
}

describe("createEditorValidationViewModel", () => {
  it("marks empty diagnostics as passed and creates no groups", () => {
    const viewModel = createEditorValidationViewModel({
      checkedItemCount: 3,
      diagnostics: [],
    });

    expect(viewModel.status).toBe("passed");
    expect(viewModel.summary).toEqual({
      errorCount: 0,
      warningCount: 0,
      checkedItemCount: 3,
    });
    expect(viewModel.diagnostics).toEqual([]);
    expect(viewModel.groups).toEqual({
      critical: [],
      warnings: [],
      bySpecificGroup: {},
      byGroupType: {},
    });
  });

  it("marks warning-only diagnostics as passed with warnings and keeps them visible", () => {
    const warning = diagnostic({
      severity: "warning",
      title: "Description is long",
      groupType: "Metadata",
      specificGroup: "Metadata",
    });

    const viewModel = createEditorValidationViewModel({
      checkedItemCount: 1,
      diagnostics: [warning],
    });

    expect(viewModel.status).toBe("passedWithWarnings");
    expect(viewModel.summary).toEqual({
      errorCount: 0,
      warningCount: 1,
      checkedItemCount: 1,
    });
    expect(viewModel.diagnostics).toEqual([warning]);
    expect(viewModel.groups.critical).toEqual([]);
    expect(viewModel.groups.warnings).toEqual([warning]);
    expect(viewModel.groups.bySpecificGroup).toEqual({ Metadata: [warning] });
    expect(viewModel.groups.byGroupType).toEqual({ Metadata: [warning] });
  });

  it("marks the view model as failed when any diagnostic is an error", () => {
    const warning = diagnostic({
      severity: "warning",
      title: "Description is long",
      groupType: "Metadata",
      specificGroup: "Metadata",
    });
    const error = diagnostic({
      severity: "error",
      title: "Weapon name is required",
      groupType: "Weapons",
      specificGroup: "Weapon 1",
    });

    const viewModel = createEditorValidationViewModel({
      checkedItemCount: 2,
      diagnostics: [warning, error],
    });

    expect(viewModel.status).toBe("failed");
    expect(viewModel.summary).toEqual({
      errorCount: 1,
      warningCount: 1,
      checkedItemCount: 2,
    });
    expect(viewModel.groups.critical).toEqual([error]);
    expect(viewModel.groups.warnings).toEqual([warning]);
  });

  it("groups prototype-like labels without throwing", () => {
    const protoGroup = diagnostic({
      severity: "warning",
      groupType: "constructor",
      specificGroup: "__proto__",
    });

    const viewModel = createEditorValidationViewModel({
      checkedItemCount: 1,
      diagnostics: [protoGroup],
    });

    expect(viewModel.groups.bySpecificGroup.__proto__).toEqual([protoGroup]);
    expect(viewModel.groups.byGroupType.constructor).toEqual([protoGroup]);
    expect(
      Object.prototype.hasOwnProperty.call(
        viewModel.groups.bySpecificGroup,
        "__proto__",
      ),
    ).toBe(true);
    expect(
      Object.prototype.hasOwnProperty.call(
        viewModel.groups.byGroupType,
        "constructor",
      ),
    ).toBe(true);
  });

  it("preserves projected jump targets instead of deriving them from author paths", () => {
    const projectedJumpTarget: TestJumpTarget = {
      tab: "metadata",
      field: "name",
    };
    const warning = diagnostic({
      severity: "warning",
      authorPath: "/items/0/name",
      jumpTarget: projectedJumpTarget,
    });

    const viewModel = createEditorValidationViewModel({
      checkedItemCount: 1,
      diagnostics: [warning],
    });

    expect(viewModel.diagnostics[0].authorPath).toBe("/items/0/name");
    expect(viewModel.diagnostics[0].jumpTarget).toBe(projectedJumpTarget);
  });
});
