"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { EquipmentEditorDraft } from "../equipment-draft";

interface EquipmentMetadataTabProps {
  draft: EquipmentEditorDraft;
  onUpdate(
    field: "name" | "version" | "author" | "description",
    value: string,
  ): void;
  onRequestCopyFromCard(): void;
}

export function EquipmentMetadataTab({
  draft,
  onUpdate,
  onRequestCopyFromCard,
}: EquipmentMetadataTabProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>装备包基础信息</CardTitle>
            <CardDescription>
              设置装备包的名称、版本、作者和描述
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRequestCopyFromCard}
          >
            从卡牌包基础信息复制
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="equipment-name">装备包名称 *</Label>
            <Input
              id="equipment-name"
              placeholder="请输入装备包名称"
              value={draft.name}
              onChange={(event) => onUpdate("name", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="equipment-version">版本号 *</Label>
            <Input
              id="equipment-version"
              placeholder="例如: 1.0.0"
              value={draft.version}
              onChange={(event) => onUpdate("version", event.target.value)}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="equipment-author">作者信息</Label>
          <Input
            id="equipment-author"
            placeholder="请输入作者信息"
            value={draft.author}
            onChange={(event) => onUpdate("author", event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="equipment-description">装备包描述</Label>
          <Textarea
            id="equipment-description"
            placeholder="请输入装备包描述"
            className="min-h-[100px]"
            value={draft.description}
            onChange={(event) => onUpdate("description", event.target.value)}
          />
          <p className="text-sm text-muted-foreground">
            简要描述这个装备包的内容和特色
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
