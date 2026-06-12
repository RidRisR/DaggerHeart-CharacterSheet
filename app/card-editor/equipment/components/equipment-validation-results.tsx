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
import type { EquipmentPackApplicationImportResult } from "@/equipment/packs/application-service";
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
import { cn } from "@/lib/utils";
import {
  createEquipmentValidationDisplaySummary,
  groupEquipmentValidationDiagnostics,
  mapEquipmentDiagnosticsToFriendly,
  type EquipmentValidationJumpTarget,
  type FriendlyEquipmentDiagnostic,
} from "../equipment-validation";

interface EquipmentValidationResultsProps {
  validationResult: EquipmentPackApplicationImportResult | null;
  open: boolean;
  onClose(): void;
  onJumpToTarget?(target: EquipmentValidationJumpTarget): void;
}

export function EquipmentValidationResults({
  validationResult,
  open,
  onClose,
  onJumpToTarget,
}: EquipmentValidationResultsProps) {
  if (!validationResult) return null;

  const diagnostics = mapEquipmentDiagnosticsToFriendly(
    validationResult.diagnostics,
  );
  const displaySummary = createEquipmentValidationDisplaySummary(
    diagnostics,
    validationResult.summary,
  );
  const groups = groupEquipmentValidationDiagnostics(diagnostics);
  const affectedTypes = formatAffectedTypes(displaySummary.affectedTypes);
  const isValid = validationResult.success && displaySummary.criticalIssues === 0;
  const successDescription = `装备包包含 ${validationResult.summary.weaponCount} 件武器和 ${validationResult.summary.armorCount} 件护甲，当前检查通过。`;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <DialogContent
        className={cn(
          "flex max-w-6xl flex-col overflow-hidden",
          isValid ? "max-h-[90vh]" : "h-[90vh] max-h-[90vh]",
        )}
      >
        <DialogHeader>
          <div className="flex items-center gap-3">
            {isValid ? (
              <CheckCircle2 className="h-6 w-6 text-green-500" />
            ) : (
              <AlertTriangle className="h-6 w-6 text-red-500" />
            )}
            <div>
              <DialogTitle className="text-xl">
                {isValid ? "装备包检查通过" : "需要修复一些装备问题"}
              </DialogTitle>
              <DialogDescription className="mt-1">
                {isValid
                  ? successDescription
                  : `检测到 ${displaySummary.criticalIssues} 个关键问题和 ${displaySummary.warningIssues} 个警告，影响 ${affectedTypes}。`}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {isValid ? (
          <SuccessSummary description={successDescription} />
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
            <QuickOverview
              criticalIssues={displaySummary.criticalIssues}
              warningIssues={displaySummary.warningIssues}
              affectedTypeCount={displaySummary.affectedTypes.length}
              affectedTypes={affectedTypes}
              equipmentItems={displaySummary.equipmentItems}
            />

            <Tabs
              defaultValue="priority"
              className="flex min-h-0 flex-1 flex-col overflow-hidden"
            >
              <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
                <TabsTrigger value="priority">按优先级</TabsTrigger>
                <TabsTrigger value="specific">按位置</TabsTrigger>
                <TabsTrigger value="type">按类型</TabsTrigger>
                <TabsTrigger value="all">全部</TabsTrigger>
              </TabsList>
              <TabsContent
                value="priority"
                className="min-h-0 flex-1 overflow-hidden data-[state=active]:flex data-[state=active]:flex-col"
              >
                <DiagnosticScroll>
                  <DiagnosticGroup
                    title="必须修复（正式导入前）"
                    diagnostics={groups.critical}
                    severity="error"
                    onJumpToTarget={onJumpToTarget}
                  />
                  <DiagnosticGroup
                    title="建议修复（提升质量）"
                    diagnostics={groups.warnings}
                    severity="warning"
                    onJumpToTarget={onJumpToTarget}
                  />
                </DiagnosticScroll>
              </TabsContent>
              <TabsContent
                value="specific"
                className="min-h-0 flex-1 overflow-hidden data-[state=active]:flex data-[state=active]:flex-col"
              >
                <DiagnosticScroll>
                  {Object.entries(groups.bySpecificGroup).map(([title, items]) => (
                    <DiagnosticGroup
                      key={title}
                      title={title}
                      diagnostics={items}
                      onJumpToTarget={onJumpToTarget}
                    />
                  ))}
                </DiagnosticScroll>
              </TabsContent>
              <TabsContent
                value="type"
                className="min-h-0 flex-1 overflow-hidden data-[state=active]:flex data-[state=active]:flex-col"
              >
                <DiagnosticScroll>
                  {Object.entries(groups.byGroupType).map(([title, items]) => (
                    <DiagnosticGroup
                      key={title}
                      title={`${title}问题`}
                      diagnostics={items}
                      onJumpToTarget={onJumpToTarget}
                    />
                  ))}
                </DiagnosticScroll>
              </TabsContent>
              <TabsContent
                value="all"
                className="min-h-0 flex-1 overflow-hidden data-[state=active]:flex data-[state=active]:flex-col"
              >
                <DiagnosticScroll>
                  <DiagnosticGroup
                    title="所有问题"
                    diagnostics={diagnostics}
                    onJumpToTarget={onJumpToTarget}
                  />
                </DiagnosticScroll>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {isValid ? (
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button variant="outline" onClick={onClose}>
              关闭
            </Button>
            <Button onClick={onClose}>返回编辑器</Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3 border-t pt-4 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-muted-foreground">
              你仍可导出草稿；若要作为装备包导入使用，请先修复错误并点击工具栏的"验证装备包"按钮重新检查。
            </p>
            <Button variant="outline" onClick={onClose}>
              关闭
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SuccessSummary({
  description,
}: {
  description: string;
}) {
  return (
    <div className="rounded-lg border border-green-200 bg-green-50 p-8 text-center">
      <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-green-600" />
      <h3 className="mb-2 text-xl font-semibold text-green-800">
        装备包检查通过
      </h3>
      <p className="text-green-700">{description}</p>
      <p className="mt-2 text-sm text-green-700">
        装备包可以导出并用于内容包管理导入。
      </p>
    </div>
  );
}

function QuickOverview({
  criticalIssues,
  warningIssues,
  affectedTypeCount,
  affectedTypes,
  equipmentItems,
}: {
  criticalIssues: number;
  warningIssues: number;
  affectedTypeCount: number;
  affectedTypes: string;
  equipmentItems: number;
}) {
  const stats = [
    {
      label: "关键错误",
      value: criticalIssues,
      hint: "正式导入前必须修复",
      className: "border-red-200 bg-red-50 text-red-700",
    },
    {
      label: "警告",
      value: warningIssues,
      hint: "建议修复以提升质量",
      className: "border-amber-200 bg-amber-50 text-amber-700",
    },
    {
      label: "问题类型",
      value: affectedTypeCount,
      hint: affectedTypes,
      className: "border-blue-200 bg-blue-50 text-blue-700",
    },
    {
      label: "装备条目",
      value: equipmentItems,
      hint: "武器 + 护甲",
      className: "border-slate-200 bg-slate-50 text-slate-700",
    },
  ];

  return (
    <div
      aria-label="验证概览"
      role="region"
      className="grid grid-cols-2 gap-3 md:grid-cols-4"
    >
      {stats.map((stat) => (
        <div key={stat.label} className={cn("rounded-lg border p-3", stat.className)}>
          <div className="text-xs font-medium">{stat.label}</div>
          <div className="mt-1 text-2xl font-semibold">{stat.value}</div>
          <div className="mt-1 text-xs opacity-80">{stat.hint}</div>
        </div>
      ))}
    </div>
  );
}

function DiagnosticScroll({ children }: { children: ReactNode }) {
  return (
    <ScrollArea className="min-h-0 flex-1">
      <div className="space-y-4 pr-4">{children}</div>
    </ScrollArea>
  );
}

function DiagnosticGroup({
  title,
  diagnostics,
  severity,
  onJumpToTarget,
}: {
  title: string;
  diagnostics: FriendlyEquipmentDiagnostic[];
  severity?: FriendlyEquipmentDiagnostic["severity"];
  onJumpToTarget?(target: EquipmentValidationJumpTarget): void;
}) {
  const [open, setOpen] = useState(true);

  if (diagnostics.length === 0) return null;

  const hasError =
    severity === "error" ||
    diagnostics.some((diagnostic) => diagnostic.severity === "error");
  const Icon = hasError ? XCircle : AlertCircle;
  const Chevron = open ? ChevronDown : ChevronRight;

  return (
    <Collapsible open={open} onOpenChange={setOpen} asChild>
      <section
        className={cn(
          "rounded-lg border",
          hasError
            ? "border-red-200 bg-red-50/40"
            : "border-amber-200 bg-amber-50/40",
        )}
      >
        <CollapsibleTrigger
          className={cn(
            "flex w-full items-center justify-between gap-3 rounded-lg p-3 text-left",
            hasError ? "text-red-800" : "text-amber-800",
          )}
        >
          <span className="flex min-w-0 items-center gap-2">
            <Icon className={hasError ? "h-5 w-5 text-red-500" : "h-5 w-5 text-amber-500"} />
            <span className="font-medium">{title}</span>
            <span
              className={cn(
                "inline-flex items-center rounded-full border border-transparent px-2.5 py-0.5 text-xs font-semibold",
                hasError
                  ? "bg-destructive text-destructive-foreground"
                  : "bg-secondary text-secondary-foreground",
              )}
            >
              {diagnostics.length}
            </span>
          </span>
          <Chevron className="h-4 w-4 shrink-0" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="space-y-3 px-3 pb-3">
            {diagnostics.map((diagnostic, index) => (
              <DiagnosticCard
                key={`${diagnostic.diagnostic.path}:${diagnostic.diagnostic.code}:${index}`}
                diagnostic={diagnostic}
                onJumpToTarget={onJumpToTarget}
              />
            ))}
          </div>
        </CollapsibleContent>
      </section>
    </Collapsible>
  );
}

function DiagnosticCard({
  diagnostic,
  onJumpToTarget,
}: {
  diagnostic: FriendlyEquipmentDiagnostic;
  onJumpToTarget?(target: EquipmentValidationJumpTarget): void;
}) {
  const locateLabel = locateButtonLabel(diagnostic.jumpTarget);

  return (
    <div className="rounded-md border bg-background p-3 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-medium md:text-base">{diagnostic.title}</h4>
            {diagnostic.field ? (
              <Badge variant="outline" className="text-xs">
                字段: {diagnostic.field}
              </Badge>
            ) : null}
            <Badge
              variant={
                diagnostic.severity === "error" ? "destructive" : "secondary"
              }
              className="text-xs"
            >
              {diagnostic.severity === "error" ? "错误" : "警告"}
            </Badge>
            {diagnostic.jumpTarget && locateLabel && onJumpToTarget ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onJumpToTarget(diagnostic.jumpTarget!)}
              >
                {locateLabel}
              </Button>
            ) : null}
          </div>
          <p className="mb-1 text-sm text-muted-foreground">
            {diagnostic.description}
          </p>
          <div className="mt-3 flex gap-2 rounded-md border border-blue-100 bg-blue-50 p-3 text-sm text-blue-800">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
            <p>{diagnostic.suggestion}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatAffectedTypes(
  affectedTypes: FriendlyEquipmentDiagnostic["groupType"][],
) {
  return affectedTypes.length > 0 ? affectedTypes.join("、") : "未发现具体位置";
}

function locateButtonLabel(target: EquipmentValidationJumpTarget | undefined) {
  if (!target) return undefined;
  if (target.tab === "metadata") return "定位基础信息";
  if (target.tab === "weapons" || target.tab === "armor") return "定位装备";
  return undefined;
}
