"use client";

import type { ReactNode } from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import type { EquipmentPackApplicationImportResult } from "@/equipment/packs/application-service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
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
  const errors = diagnostics.filter((diagnostic) => diagnostic.severity === "error");
  const warnings = diagnostics.filter(
    (diagnostic) => diagnostic.severity === "warning",
  );
  const isValid = validationResult.success && errors.length === 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="flex max-h-[90vh] max-w-6xl flex-col overflow-hidden">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {isValid ? (
              <CheckCircle2 className="h-6 w-6 text-green-500" />
            ) : (
              <AlertTriangle className="h-6 w-6 text-red-500" />
            )}
            <div>
              <DialogTitle className="text-xl">
                {isValid ? "验证通过！" : "需要修复一些装备问题"}
              </DialogTitle>
              <DialogDescription className="mt-1">
                {isValid
                  ? "当前装备包检查通过。"
                  : `检测到 ${errors.length} 个错误和 ${warnings.length} 个警告。导出仍可继续，但导入系统前需要修复错误。`}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {isValid ? (
          <SuccessSummary validationResult={validationResult} />
        ) : (
          <Tabs
            defaultValue="priority"
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
          >
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
              <TabsTrigger value="priority">按优先级</TabsTrigger>
              <TabsTrigger value="specific">按装备</TabsTrigger>
              <TabsTrigger value="type">按类型</TabsTrigger>
              <TabsTrigger value="all">全部</TabsTrigger>
            </TabsList>
            <TabsContent value="priority" className="min-h-0 flex-1 overflow-hidden">
              <DiagnosticScroll>
                <DiagnosticGroup
                  title="必须修复（阻止导入）"
                  diagnostics={errors}
                  onJumpToTarget={onJumpToTarget}
                />
                <DiagnosticGroup
                  title="建议修复（提升质量）"
                  diagnostics={warnings}
                  onJumpToTarget={onJumpToTarget}
                />
              </DiagnosticScroll>
            </TabsContent>
            <TabsContent value="specific" className="min-h-0 flex-1 overflow-hidden">
              <DiagnosticScroll>
                {groupBy(diagnostics, (diagnostic) => diagnostic.specificGroup).map(
                  ([title, items]) => (
                    <DiagnosticGroup
                      key={title}
                      title={title}
                      diagnostics={items}
                      onJumpToTarget={onJumpToTarget}
                    />
                  ),
                )}
              </DiagnosticScroll>
            </TabsContent>
            <TabsContent value="type" className="min-h-0 flex-1 overflow-hidden">
              <DiagnosticScroll>
                {groupBy(diagnostics, (diagnostic) => diagnostic.groupType).map(
                  ([title, items]) => (
                    <DiagnosticGroup
                      key={title}
                      title={`${title}问题`}
                      diagnostics={items}
                      onJumpToTarget={onJumpToTarget}
                    />
                  ),
                )}
              </DiagnosticScroll>
            </TabsContent>
            <TabsContent value="all" className="min-h-0 flex-1 overflow-hidden">
              <DiagnosticScroll>
                <DiagnosticGroup
                  title="所有问题"
                  diagnostics={diagnostics}
                  onJumpToTarget={onJumpToTarget}
                />
              </DiagnosticScroll>
            </TabsContent>
          </Tabs>
        )}

        <div className="flex justify-end border-t pt-4">
          <Button variant="outline" onClick={onClose}>
            关闭
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SuccessSummary({
  validationResult,
}: {
  validationResult: EquipmentPackApplicationImportResult;
}) {
  return (
    <div className="rounded-lg border border-green-200 bg-green-50 p-8 text-center">
      <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-green-600" />
      <h3 className="mb-2 text-xl font-semibold text-green-800">
        装备包检查通过
      </h3>
      <p className="text-green-700">
        装备包包含 {validationResult.summary.weaponCount} 件武器和{" "}
        {validationResult.summary.armorCount} 件护甲，当前检查通过。
      </p>
    </div>
  );
}

function DiagnosticScroll({ children }: { children: ReactNode }) {
  return (
    <ScrollArea className="h-[60vh]">
      <div className="space-y-4 pr-4">{children}</div>
    </ScrollArea>
  );
}

function DiagnosticGroup({
  title,
  diagnostics,
  onJumpToTarget,
}: {
  title: string;
  diagnostics: FriendlyEquipmentDiagnostic[];
  onJumpToTarget?(target: EquipmentValidationJumpTarget): void;
}) {
  if (diagnostics.length === 0) return null;

  const hasError = diagnostics.some((diagnostic) => diagnostic.severity === "error");
  const Icon = hasError ? XCircle : AlertCircle;

  return (
    <section className="rounded-lg border bg-muted/20 p-3">
      <div className="mb-3 flex items-center gap-2">
        <Icon
          className={hasError ? "h-5 w-5 text-red-500" : "h-5 w-5 text-amber-500"}
        />
        <h3 className="font-medium">{title}</h3>
        <Badge variant={hasError ? "destructive" : "secondary"}>
          {diagnostics.length}
        </Badge>
      </div>
      <div className="space-y-3">
        {diagnostics.map((diagnostic, index) => (
          <DiagnosticCard
            key={`${diagnostic.diagnostic.path}:${diagnostic.diagnostic.code}:${index}`}
            diagnostic={diagnostic}
            onJumpToTarget={onJumpToTarget}
          />
        ))}
      </div>
    </section>
  );
}

function DiagnosticCard({
  diagnostic,
  onJumpToTarget,
}: {
  diagnostic: FriendlyEquipmentDiagnostic;
  onJumpToTarget?(target: EquipmentValidationJumpTarget): void;
}) {
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
            {diagnostic.jumpTarget && onJumpToTarget ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onJumpToTarget(diagnostic.jumpTarget!)}
              >
                定位装备
              </Button>
            ) : null}
          </div>
          <p className="mb-1 text-sm text-muted-foreground">
            {diagnostic.description}
          </p>
          <p className="text-sm text-blue-700">{diagnostic.suggestion}</p>
        </div>
      </div>
    </div>
  );
}

function groupBy(
  diagnostics: FriendlyEquipmentDiagnostic[],
  getKey: (diagnostic: FriendlyEquipmentDiagnostic) => string,
) {
  const groups = new Map<string, FriendlyEquipmentDiagnostic[]>();
  for (const diagnostic of diagnostics) {
    const key = getKey(diagnostic);
    groups.set(key, [...(groups.get(key) ?? []), diagnostic]);
  }
  return Array.from(groups.entries());
}
