"use client";

import { useState, type ReactNode } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Lightbulb,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  EditorValidationDiagnosticView,
  EditorValidationStatus,
  EditorValidationViewModel,
} from "../services/editor-validation-view-model";

export interface EditorValidationResultsProps<TJumpTarget> {
  viewModel: EditorValidationViewModel<TJumpTarget> | null;
  open: boolean;
  onClose(): void;
  onJumpToTarget?(target: TJumpTarget): void;
}

interface DiagnosticGroupProps<TJumpTarget> {
  title: string;
  diagnostics: EditorValidationDiagnosticView<TJumpTarget>[];
  severity: "error" | "warning";
  onJumpToTarget?(target: TJumpTarget): void;
}

function DiagnosticScrollArea({ children }: { children: ReactNode }) {
  return (
    <ScrollArea aria-label="诊断列表" className="h-full min-h-0">
      <div className="space-y-4 pr-4 pb-2">{children}</div>
    </ScrollArea>
  );
}

const statusDescriptions: Record<EditorValidationStatus, string> = {
  passed: "草稿完全符合当前检查要求，可以导出发布文件。",
  passedWithWarnings: "草稿可以导出发布文件，但有建议处理的问题。",
  failed: "导出发布前应修复这些草稿问题。",
};

function ValidationOverview({
  errorCount,
  warningCount,
  affectedGroupTypes,
  checkedItemCount,
}: {
  errorCount: number;
  warningCount: number;
  affectedGroupTypes: string[];
  checkedItemCount: number;
}) {
  return (
    <div
      aria-label="验证概览"
      role="region"
      className="grid grid-cols-2 gap-3 rounded-lg border bg-gradient-to-r from-gray-50 to-gray-100 p-3 md:grid-cols-4 md:gap-4 md:p-4"
    >
      <div className="text-center">
        <div className="text-xl font-bold text-red-600 md:text-2xl">
          {errorCount}
        </div>
        <div className="text-xs text-gray-600 md:text-sm">关键错误</div>
        <div className="mt-1 hidden text-xs text-red-500 md:block">
          必须修复
        </div>
      </div>
      <div className="text-center">
        <div className="text-xl font-bold text-amber-600 md:text-2xl">
          {warningCount}
        </div>
        <div className="text-xs text-gray-600 md:text-sm">警告</div>
        <div className="mt-1 hidden text-xs text-amber-500 md:block">
          建议修复
        </div>
      </div>
      <div className="text-center">
        <div className="text-xl font-bold text-blue-600 md:text-2xl">
          {affectedGroupTypes.length}
        </div>
        <div className="text-xs text-gray-600 md:text-sm">问题类型</div>
        <div className="mt-1 hidden text-xs text-blue-500 md:block">
          {affectedGroupTypes.length > 0
            ? affectedGroupTypes.join("、")
            : "未提供具体位置"}
        </div>
      </div>
      <div className="text-center">
        <div className="text-xl font-bold text-green-600 md:text-2xl">
          {checkedItemCount}
        </div>
        <div className="text-xs text-gray-600 md:text-sm">检查总数</div>
        <div className="mt-1 hidden text-xs text-green-500 md:block">
          已验证
        </div>
      </div>
    </div>
  );
}

function DiagnosticGroup<TJumpTarget>({
  title,
  diagnostics,
  severity,
  onJumpToTarget,
}: DiagnosticGroupProps<TJumpTarget>) {
  const [isOpen, setIsOpen] = useState(true);

  if (diagnostics.length === 0) return null;

  const Icon = severity === "error" ? XCircle : AlertCircle;
  const colorClasses =
    severity === "error"
      ? "text-red-500 bg-red-50 border-red-200"
      : "text-amber-500 bg-amber-50 border-amber-200";

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger
        className={`flex w-full items-center justify-between rounded-lg border p-3 transition-colors hover:bg-opacity-80 ${colorClasses}`}
      >
        <div className="flex min-w-0 items-center gap-3">
          <Icon className="h-5 w-5 shrink-0" />
          <span className="truncate font-medium">{title}</span>
          <Badge variant={severity === "error" ? "destructive" : "secondary"}>
            {diagnostics.length}
          </Badge>
        </div>
        {isOpen ? (
          <ChevronDown className="h-4 w-4 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0" />
        )}
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-2">
        <div className="space-y-3">
          {diagnostics.map((diagnostic, index) => (
            <div
              key={`${diagnostic.technical?.internalPath ?? diagnostic.authorPath ?? diagnostic.title}:${diagnostic.technical?.code ?? diagnostic.severity}:${index}`}
              className="ml-4 rounded-lg border bg-white p-3 shadow-sm transition-shadow hover:shadow-md md:ml-8"
            >
              <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h4 className="text-sm font-medium text-gray-900 md:text-base">
                      {diagnostic.title}
                    </h4>
                    {diagnostic.fieldLabel ? (
                      <Badge variant="outline" className="text-xs">
                        字段: {diagnostic.fieldLabel}
                      </Badge>
                    ) : null}
                    <Badge
                      variant={
                        diagnostic.severity === "error"
                          ? "destructive"
                          : "secondary"
                      }
                      className="text-xs"
                    >
                      {diagnostic.severity === "error" ? "错误" : "警告"}
                    </Badge>
                  </div>
                  <p className="mb-2 text-sm text-gray-600">
                    {diagnostic.description}
                  </p>
                  <div className="flex items-start gap-2 rounded bg-blue-50 p-2">
                    <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                    <p className="text-sm text-blue-700">
                      {diagnostic.suggestion}
                    </p>
                  </div>
                </div>
                {diagnostic.jumpTarget && onJumpToTarget ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-label={`定位问题：${diagnostic.title}`}
                    onClick={() => onJumpToTarget(diagnostic.jumpTarget!)}
                    className="w-full self-start hover:bg-blue-50 md:ml-3 md:w-auto md:shrink-0"
                  >
                    定位问题
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function EditorValidationResults<TJumpTarget>({
  viewModel,
  open,
  onClose,
  onJumpToTarget,
}: EditorValidationResultsProps<TJumpTarget>) {
  if (!viewModel) return null;

  const isPassed = viewModel.status === "passed";
  const isWarningOnly = viewModel.status === "passedWithWarnings";
  const isFailed = viewModel.status === "failed";
  const canExport = !isFailed;
  const hasDiagnostics = viewModel.diagnostics.length > 0;
  const hasSummaryIssues =
    viewModel.summary.errorCount > 0 || viewModel.summary.warningCount > 0;
  const critical = viewModel.groups.critical;
  const warnings = viewModel.groups.warnings;
  const byGroupType = viewModel.groups.byGroupType;
  const bySpecificGroup = viewModel.groups.bySpecificGroup;
  const affectedGroupTypes = Object.keys(byGroupType);
  const statusDescription = statusDescriptions[viewModel.status];
  const emptyStateClasses = isPassed
    ? {
        container:
          "border-green-200 bg-gradient-to-b from-green-50 to-green-100",
        circle: "bg-green-500",
        title: "text-green-800",
        text: "text-green-700",
        card: "border-green-200",
        cardText: "text-green-600",
      }
    : isWarningOnly
      ? {
          container:
            "border-amber-200 bg-gradient-to-b from-amber-50 to-amber-100",
          circle: "bg-amber-500",
          title: "text-amber-800",
          text: "text-amber-700",
          card: "border-amber-200",
          cardText: "text-amber-700",
        }
      : {
          container: "border-red-200 bg-gradient-to-b from-red-50 to-red-100",
          circle: "bg-red-500",
          title: "text-red-800",
          text: "text-red-700",
          card: "border-red-200",
          cardText: "text-red-700",
        };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <DialogContent className="flex max-h-[90vh] max-w-6xl flex-col overflow-hidden">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {isPassed ? (
              <CheckCircle2 className="h-6 w-6 text-green-500" />
            ) : isWarningOnly ? (
              <AlertCircle className="h-6 w-6 text-amber-500" />
            ) : (
              <AlertTriangle className="h-6 w-6 text-red-500" />
            )}
            <div>
              <DialogTitle className="text-xl">{viewModel.title}</DialogTitle>
              <DialogDescription className="mt-1">
                {statusDescription}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {hasDiagnostics ? (
          <div className="flex min-h-0 flex-1 flex-col space-y-4 overflow-hidden">
            <ValidationOverview
              errorCount={viewModel.summary.errorCount}
              warningCount={viewModel.summary.warningCount}
              affectedGroupTypes={affectedGroupTypes}
              checkedItemCount={viewModel.summary.checkedItemCount}
            />

            <Tabs
              defaultValue="specific"
              className="flex min-h-0 w-full flex-1 flex-col overflow-hidden"
            >
              <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
                <TabsTrigger value="priority" className="text-xs md:text-sm">
                  按优先级
                </TabsTrigger>
                <TabsTrigger value="specific" className="text-xs md:text-sm">
                  按位置
                </TabsTrigger>
                <TabsTrigger value="type" className="text-xs md:text-sm">
                  按类型
                </TabsTrigger>
                <TabsTrigger value="all" className="text-xs md:text-sm">
                  全部
                </TabsTrigger>
              </TabsList>

              <TabsContent
                value="priority"
                className="min-h-0 flex-1 overflow-hidden"
              >
                <DiagnosticScrollArea>
                  {critical.length > 0 ? (
                    <DiagnosticGroup
                      title="必须修复"
                      diagnostics={critical}
                      severity="error"
                      onJumpToTarget={onJumpToTarget}
                    />
                  ) : null}
                  {warnings.length > 0 ? (
                    <DiagnosticGroup
                      title="建议修复"
                      diagnostics={warnings}
                      severity="warning"
                      onJumpToTarget={onJumpToTarget}
                    />
                  ) : null}
                </DiagnosticScrollArea>
              </TabsContent>

              <TabsContent
                value="specific"
                className="min-h-0 flex-1 overflow-hidden"
              >
                <DiagnosticScrollArea>
                  {Object.entries(bySpecificGroup).map(([title, diagnostics]) => (
                    <DiagnosticGroup
                      key={title}
                      title={title}
                      diagnostics={diagnostics}
                      severity={
                        diagnostics.some(
                          (diagnostic) => diagnostic.severity === "error",
                        )
                          ? "error"
                          : "warning"
                      }
                      onJumpToTarget={onJumpToTarget}
                    />
                  ))}
                </DiagnosticScrollArea>
              </TabsContent>

              <TabsContent
                value="type"
                className="min-h-0 flex-1 overflow-hidden"
              >
                <DiagnosticScrollArea>
                  {Object.entries(byGroupType).map(([title, diagnostics]) => (
                    <DiagnosticGroup
                      key={title}
                      title={`${title}问题`}
                      diagnostics={diagnostics}
                      severity={
                        diagnostics.some(
                          (diagnostic) => diagnostic.severity === "error",
                        )
                          ? "error"
                          : "warning"
                      }
                      onJumpToTarget={onJumpToTarget}
                    />
                  ))}
                </DiagnosticScrollArea>
              </TabsContent>

              <TabsContent
                value="all"
                className="min-h-0 flex-1 overflow-hidden"
              >
                <DiagnosticScrollArea>
                  <DiagnosticGroup
                    title="所有问题"
                    diagnostics={viewModel.diagnostics}
                    severity={critical.length > 0 ? "error" : "warning"}
                    onJumpToTarget={onJumpToTarget}
                  />
                </DiagnosticScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col space-y-4 overflow-hidden">
            {!isPassed && hasSummaryIssues ? (
              <ValidationOverview
                errorCount={viewModel.summary.errorCount}
                warningCount={viewModel.summary.warningCount}
                affectedGroupTypes={affectedGroupTypes}
                checkedItemCount={viewModel.summary.checkedItemCount}
              />
            ) : null}
            <div
              className={`rounded-lg border py-12 text-center ${emptyStateClasses.container}`}
            >
              <div
                className={`mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full ${emptyStateClasses.circle}`}
              >
                {isFailed ? (
                  <AlertTriangle className="h-10 w-10 text-white" />
                ) : isWarningOnly ? (
                  <AlertCircle className="h-10 w-10 text-white" />
                ) : (
                  <CheckCircle2 className="h-10 w-10 text-white" />
                )}
              </div>
              <h3
                className={`mb-3 text-2xl font-semibold ${emptyStateClasses.title}`}
              >
                验证完成
              </h3>
              <p className={`mb-4 text-lg ${emptyStateClasses.text}`}>
                草稿包含{" "}
                <span className="font-semibold">
                  {viewModel.summary.checkedItemCount}
                </span>{" "}
                个检查对象，当前检查{isPassed ? "通过" : "完成"}
              </p>
              <div
                className={`inline-block rounded-lg border bg-white p-4 shadow-sm ${emptyStateClasses.card}`}
              >
                <p className={`font-medium ${emptyStateClasses.cardText}`}>
                  {statusDescription}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col items-center justify-between gap-4 border-t pt-6 md:flex-row">
          <div className="text-center text-xs text-gray-500 md:text-left md:text-sm">
            {isFailed ? <>修复问题后，点击工具栏的验证按钮重新检查</> : null}
          </div>
          <div className="flex w-full gap-3 md:w-auto">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 md:flex-none"
            >
              关闭
            </Button>
            {canExport ? (
              <Button
                onClick={onClose}
                className="flex-1 bg-green-600 hover:bg-green-700 md:flex-none"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                开始导出
              </Button>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
