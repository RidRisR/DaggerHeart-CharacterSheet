"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Copy, Plus, Trash2 } from "lucide-react";
import {
  EQUIPMENT_MODIFIER_TARGETS,
  EQUIPMENT_TARGET_LABELS,
} from "@/automation/equipment/contribution-utils";
import type { EquipmentModifierTargetId } from "@/automation/equipment/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  BURDEN_OPTIONS,
  DAMAGE_TYPE_OPTIONS,
  RANGE_OPTIONS,
  TIER_OPTIONS,
  TRAIT_OPTIONS,
} from "@/components/modals/custom-equipment-draft-form";
import {
  buildStandardEquipmentId,
  generateStandardEquipmentId,
  parseStandardEquipmentId,
  type EquipmentItemKind,
} from "../equipment-id";
import type {
  ArmorEditorDraft,
  WeaponEditorDraft,
} from "../equipment-draft";
import { EquipmentQuickSwitch } from "./equipment-quick-switch";

type ModifierContribution =
  | WeaponEditorDraft["modifierContributions"][number]
  | ArmorEditorDraft["modifierContributions"][number];

interface BaseProps<TItem> {
  items: TItem[];
  selectedIndex: number;
  onSelect(index: number): void;
  onAdd(): void;
  onDuplicate(index: number): void;
  onDelete(index: number): void;
}

export function WeaponItemTab(
  props: BaseProps<WeaponEditorDraft> & {
    packageName: string;
    author: string;
    onUpdate(index: number, patch: Partial<WeaponEditorDraft>): void;
  },
) {
  const item = props.items[props.selectedIndex];

  return (
    <EquipmentItemShell
      title="武器"
      unitLabel="件"
      items={props.items}
      selectedIndex={props.selectedIndex}
      onSelect={props.onSelect}
      onAdd={props.onAdd}
      onDuplicate={props.onDuplicate}
      onDelete={props.onDelete}
      getTitle={(weapon, index) => weapon.name || `未命名武器 ${index + 1}`}
      getSubtitle={(weapon) =>
        [weapon.tier || "未选阶级", weapon.damage || "未填伤害"].join(" / ")
      }
      renderQuickSwitchItem={(weapon, index) => (
        <WeaponQuickSwitchPreview
          weapon={weapon}
          title={weapon.name || `未命名武器 ${index + 1}`}
        />
      )}
    >
      {item ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <TextInput
              label="武器名称"
              value={item.name}
              onChange={(name) => props.onUpdate(props.selectedIndex, { name })}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <CompactEquipmentIdEditor
              id={item.id}
              kind="weapon"
              packageName={props.packageName}
              author={props.author}
              onChange={(id) => props.onUpdate(props.selectedIndex, { id })}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <EnumSelect
              label="武器类型"
              value={item.weaponType}
              options={[
                { value: "primary", label: "主武器" },
                { value: "secondary", label: "副武器" },
              ]}
              onChange={(weaponType) =>
                props.onUpdate(props.selectedIndex, {
                  weaponType:
                    weaponType as WeaponEditorDraft["weaponType"],
                })
              }
            />
            <EnumSelect
              label="阶级"
              value={item.tier}
              options={TIER_OPTIONS.map((value) => ({ value, label: value }))}
              onChange={(tier) =>
                props.onUpdate(props.selectedIndex, {
                  tier: tier as WeaponEditorDraft["tier"],
                })
              }
            />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <EnumSelect
              label="伤害类型"
              value={item.damageType}
              options={DAMAGE_TYPE_OPTIONS}
              onChange={(damageType) =>
                props.onUpdate(props.selectedIndex, {
                  damageType:
                    damageType as WeaponEditorDraft["damageType"],
                })
              }
            />
            <EnumSelect
              label="负荷"
              value={item.burden}
              options={BURDEN_OPTIONS}
              onChange={(burden) =>
                props.onUpdate(props.selectedIndex, {
                  burden: burden as WeaponEditorDraft["burden"],
                })
              }
            />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <EnumSelect
              label="范围"
              value={item.range}
              options={RANGE_OPTIONS}
              onChange={(range) =>
                props.onUpdate(props.selectedIndex, {
                  range: range as WeaponEditorDraft["range"],
                })
              }
            />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <EnumSelect
              label="属性"
              value={item.trait}
              options={TRAIT_OPTIONS}
              onChange={(trait) =>
                props.onUpdate(props.selectedIndex, {
                  trait: trait as WeaponEditorDraft["trait"],
                })
              }
            />
            <TextInput
              label="伤害"
              value={item.damage}
              onChange={(damage) =>
                props.onUpdate(props.selectedIndex, { damage })
              }
            />
          </div>
          <EquipmentFeatureEditor
            featureName={item.featureName}
            description={item.description}
            onFeatureNameChange={(featureName) =>
              props.onUpdate(props.selectedIndex, { featureName })
            }
            onDescriptionChange={(description) =>
              props.onUpdate(props.selectedIndex, { description })
            }
          />
          <ModifierContributionsEditor
            contributions={item.modifierContributions}
            onChange={(modifierContributions) =>
              props.onUpdate(props.selectedIndex, { modifierContributions })
            }
          />
        </div>
      ) : (
        <EmptyItemMessage label="武器" onAdd={props.onAdd} />
      )}
    </EquipmentItemShell>
  );
}

export function ArmorItemTab(
  props: BaseProps<ArmorEditorDraft> & {
    packageName: string;
    author: string;
    onUpdate(index: number, patch: Partial<ArmorEditorDraft>): void;
  },
) {
  const item = props.items[props.selectedIndex];

  return (
    <EquipmentItemShell
      title="护甲"
      unitLabel="件"
      items={props.items}
      selectedIndex={props.selectedIndex}
      onSelect={props.onSelect}
      onAdd={props.onAdd}
      onDuplicate={props.onDuplicate}
      onDelete={props.onDelete}
      getTitle={(armor, index) => armor.name || `未命名护甲 ${index + 1}`}
      getSubtitle={(armor) =>
        `护甲 ${armor.baseArmorMax ?? "-"} / ${armor.baseThresholds.minor ?? "-"}-${armor.baseThresholds.major ?? "-"}`
      }
      renderQuickSwitchItem={(armor, index) => (
        <ArmorQuickSwitchPreview
          armor={armor}
          title={armor.name || `未命名护甲 ${index + 1}`}
        />
      )}
    >
      {item ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <TextInput
              label="护甲名称"
              value={item.name}
              onChange={(name) => props.onUpdate(props.selectedIndex, { name })}
            />
            <EnumSelect
              label="阶级"
              value={item.tier}
              options={TIER_OPTIONS.map((value) => ({ value, label: value }))}
              onChange={(tier) =>
                props.onUpdate(props.selectedIndex, {
                  tier: tier as ArmorEditorDraft["tier"],
                })
              }
            />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <CompactEquipmentIdEditor
              id={item.id}
              kind="armor"
              packageName={props.packageName}
              author={props.author}
              onChange={(id) => props.onUpdate(props.selectedIndex, { id })}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <NumericInput
              label="基础护甲槽"
              value={item.baseArmorMax}
              onCommit={(baseArmorMax) =>
                props.onUpdate(props.selectedIndex, { baseArmorMax })
              }
            />
            <NumericInput
              label="轻微阈值"
              value={item.baseThresholds.minor}
              onCommit={(minor) =>
                props.onUpdate(props.selectedIndex, {
                  baseThresholds: { ...item.baseThresholds, minor },
                })
              }
            />
            <NumericInput
              label="严重阈值"
              value={item.baseThresholds.major}
              onCommit={(major) =>
                props.onUpdate(props.selectedIndex, {
                  baseThresholds: { ...item.baseThresholds, major },
                })
              }
            />
          </div>
          <EquipmentFeatureEditor
            featureName={item.featureName}
            description={item.description}
            onFeatureNameChange={(featureName) =>
              props.onUpdate(props.selectedIndex, { featureName })
            }
            onDescriptionChange={(description) =>
              props.onUpdate(props.selectedIndex, { description })
            }
          />
          <ModifierContributionsEditor
            contributions={item.modifierContributions}
            onChange={(modifierContributions) =>
              props.onUpdate(props.selectedIndex, { modifierContributions })
            }
          />
        </div>
      ) : (
        <EmptyItemMessage label="护甲" onAdd={props.onAdd} />
      )}
    </EquipmentItemShell>
  );
}

function EquipmentItemShell<TItem>(
  props: BaseProps<TItem> & {
    title: string;
    unitLabel: string;
    getTitle(item: TItem, index: number): string;
    getSubtitle(item: TItem): string;
    renderQuickSwitchItem?(item: TItem, index: number): ReactNode;
    children: ReactNode;
  },
) {
  const currentNumber =
    props.items.length === 0 ? 0 : props.selectedIndex + 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{props.title}编辑</h3>
          <p className="text-sm text-muted-foreground">
            当前: {currentNumber} / {props.items.length} {props.unitLabel}
          </p>
        </div>
      </div>

      {props.items.length === 0 ? (
        <EmptyItemMessage label={props.title} onAdd={props.onAdd} />
      ) : (
        <>

      <div className="flex items-center justify-between border-b pb-3">
        <div className="flex gap-2 items-center">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={props.items.length === 0 || props.selectedIndex <= 0}
            onClick={() => props.onSelect(props.selectedIndex - 1)}
          >
            上一件
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={
              props.items.length === 0 ||
              props.selectedIndex >= props.items.length - 1
            }
            onClick={() => props.onSelect(props.selectedIndex + 1)}
          >
            下一件
          </Button>
          <div className="h-4 w-px bg-border mx-2"></div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={props.onAdd}
            className="flex items-center gap-1"
          >
            <Plus className="h-4 w-4" />
            新建
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={props.items.length === 0}
            onClick={() => props.onDuplicate(props.selectedIndex)}
            className="flex items-center gap-1"
          >
            <Copy className="h-4 w-4" />
            复制
          </Button>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={props.items.length === 0}
            onClick={() => props.onDelete(props.selectedIndex)}
            className="flex items-center gap-1"
          >
            <Trash2 className="h-4 w-4" />
            删除
          </Button>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <span>快速跳转:</span>
          <select
            value={String(props.selectedIndex)}
            disabled={props.items.length === 0}
            onChange={(event) => props.onSelect(Number(event.target.value))}
            aria-label="快速跳转"
            className="border rounded px-2 py-1"
          >
            {props.items.map((item, index) => (
              <option key={index} value={String(index)}>
                {index + 1}. {props.getTitle(item, index)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr),410px]">
        <div className="border rounded-lg p-4 relative">{props.children}</div>
        <div className="hidden lg:block">
          <div className="sticky top-4">
            <h4 className="text-sm font-medium text-muted-foreground mb-2">
              快速选择
            </h4>
            <EquipmentQuickSwitch
              items={props.items}
              selectedIndex={props.selectedIndex}
              getTitle={props.getTitle}
              getSubtitle={props.getSubtitle}
              renderItem={props.renderQuickSwitchItem}
              onSelect={props.onSelect}
            />
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  );
}

function TextInput(props: {
  label: string;
  value: string;
  onChange(value: string): void;
}) {
  const id = props.label;
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{props.label}</Label>
      <Input
        id={id}
        aria-label={props.label}
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
      />
    </div>
  );
}

function TextareaField(props: {
  label: string;
  value: string;
  onChange(value: string): void;
}) {
  const id = props.label;
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{props.label}</Label>
      <Textarea
        id={id}
        aria-label={props.label}
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
      />
    </div>
  );
}

function CompactEquipmentIdEditor({
  id,
  kind,
  packageName,
  author,
  onChange,
}: {
  id: string;
  kind: EquipmentItemKind;
  packageName: string;
  author: string;
  onChange(id: string): void;
}) {
  const parsed = parseStandardEquipmentId(id, packageName, author, kind);
  const [isEditing, setIsEditing] = useState(false);
  const [customSuffix, setCustomSuffix] = useState(parsed.suffix);
  const fullId = buildStandardEquipmentId(
    packageName || "装备包",
    author || "作者",
    kind,
    customSuffix,
  );

  useEffect(() => {
    if (!isEditing) {
      setCustomSuffix(parsed.suffix);
    }
  }, [id, isEditing, parsed.suffix]);

  const save = () => {
    const nextId = fullId.trim();
    if (nextId) {
      onChange(nextId);
      setIsEditing(false);
    }
  };

  const cancel = () => {
    setCustomSuffix(parsed.suffix);
    setIsEditing(false);
  };

  const regenerate = () => {
    onChange(
      generateStandardEquipmentId({
        packName: packageName || "装备包",
        author: author || "作者",
        kind,
      }),
    );
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="mt-1 space-y-2 rounded-md border bg-muted/20 p-2">
        <div className="flex items-center gap-1">
          <span className="whitespace-nowrap font-mono text-xs text-muted-foreground">
            {parsed.prefix}
          </span>
          <Input
            aria-label="装备ID后缀"
            value={customSuffix}
            onChange={(event) => setCustomSuffix(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                save();
              }
              if (event.key === "Escape") {
                event.preventDefault();
                cancel();
              }
            }}
            onBlur={save}
            placeholder="自定义后缀"
            className="h-6 flex-1 font-mono text-xs"
          />
        </div>
        <p className="break-all font-mono text-xs text-muted-foreground">
          {fullId}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-1 flex items-center justify-between gap-2">
      <div className="min-w-0 flex-1">
        <span className="break-all font-mono text-xs text-muted-foreground">
          ID: {id}
        </span>
        {!parsed.isStandard ? (
          <span className="ml-1 text-xs text-yellow-600">⚠️</span>
        ) : null}
      </div>
      <div className="flex flex-shrink-0 gap-1">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-5 w-5 p-0 text-xs"
          onClick={() => setIsEditing(true)}
          title="编辑ID"
        >
          ✎
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-5 w-5 p-0 text-xs"
          onClick={regenerate}
          title="重新生成ID"
        >
          ↻
        </Button>
      </div>
    </div>
  );
}

function EquipmentFeatureEditor(props: {
  featureName: string;
  description: string;
  onFeatureNameChange(value: string): void;
  onDescriptionChange(value: string): void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-[280px,1fr]">
      <TextInput
        label="特性名称"
        value={props.featureName}
        onChange={props.onFeatureNameChange}
      />
      <TextareaField
        label="特性描述"
        value={props.description}
        onChange={props.onDescriptionChange}
      />
    </div>
  );
}

function buildFeaturePreviewText(featureName: string, description: string) {
  const feature = featureName.trim();
  const text = description.trim();

  if (!feature) {
    return text;
  }

  return text ? `${feature}: ${text}` : feature;
}

function optionLabel(
  options: Array<{ value: string; label: string }>,
  value: string,
) {
  return options.find((option) => option.value === value)?.label ?? value;
}

function WeaponQuickSwitchPreview({
  weapon,
  title,
}: {
  weapon: WeaponEditorDraft;
  title: string;
}) {
  const info = [
    optionLabel(DAMAGE_TYPE_OPTIONS, weapon.damageType),
    optionLabel(BURDEN_OPTIONS, weapon.burden),
    optionLabel(RANGE_OPTIONS, weapon.range),
  ]
    .filter(Boolean)
    .join("/");
  const damage = [
    optionLabel(TRAIT_OPTIONS, weapon.trait),
    weapon.damage,
  ]
    .filter(Boolean)
    .join(": ");

  return (
    <span className="block w-[385px] max-w-full text-gray-800">
      <span className="mb-1 block rounded-t-md bg-gray-800 p-1 text-[10px] font-bold text-white">
        {weapon.weaponType === "secondary" ? "副武器" : "主武器"}
      </span>
      <span className="grid grid-cols-10 gap-1">
        <span className="col-span-4">
          <span className="block text-[8px] text-gray-600">名称</span>
          <span className="block h-6 overflow-hidden rounded border border-gray-400 bg-white px-2 py-0.5 text-sm">
            {title}
          </span>
        </span>
        <span className="col-span-3">
          <span className="block text-[8px] text-gray-600">基本信息</span>
          <span className="block h-6 overflow-hidden border-b border-gray-400 text-sm">
            {info}
          </span>
        </span>
        <span className="col-span-3">
          <span className="block text-[8px] text-gray-600">伤害骰</span>
          <span className="block h-6 overflow-hidden border-b border-gray-400 text-sm">
            {damage}
          </span>
        </span>
      </span>
      <EquipmentFeaturePrintPreview
        text={buildFeaturePreviewText(weapon.featureName, weapon.description)}
      />
    </span>
  );
}

function ArmorQuickSwitchPreview({
  armor,
  title,
}: {
  armor: ArmorEditorDraft;
  title: string;
}) {
  return (
    <span className="block w-[385px] max-w-full text-gray-800">
      <span className="mb-1 block rounded-t-md bg-gray-800 p-1 text-[10px] font-bold text-white">
        护甲
      </span>
      <span className="grid grid-cols-10 gap-1">
        <span className="col-span-4">
          <span className="block text-[8px] text-gray-600">名称</span>
          <span className="block h-6 overflow-hidden rounded border border-gray-400 bg-white px-2 py-0.5 text-sm">
            {title}
          </span>
        </span>
        <span className="col-span-3">
          <span className="block text-[8px] text-gray-600">护甲值</span>
          <span className="block h-6 overflow-hidden border-b border-gray-400 text-sm">
            {armor.baseArmorMax ?? ""}
          </span>
        </span>
        <span className="col-span-3">
          <span className="block text-[8px] text-gray-600">阈值</span>
          <span className="block h-6 overflow-hidden border-b border-gray-400 text-sm">
            {armor.baseThresholds.minor ?? ""}/{armor.baseThresholds.major ?? ""}
          </span>
        </span>
      </span>
      <EquipmentFeaturePrintPreview
        text={buildFeaturePreviewText(armor.featureName, armor.description)}
      />
    </span>
  );
}

function EquipmentFeaturePrintPreview({ text }: { text: string }) {
  return (
    <span
      aria-label="角色卡特性预览"
      className="mt-1 block h-[50px] overflow-hidden whitespace-pre-wrap break-words px-[3px] text-sm leading-[25px]"
      style={{
        backgroundImage: `repeating-linear-gradient(
          to bottom,
          transparent 0,
          transparent 24px,
          #9ca3af 24px,
          #9ca3af 25px
        )`,
        backgroundSize: "100% 25px",
        backgroundPosition: "0 0",
      }}
    >
      {text}
    </span>
  );
}

function EnumSelect(props: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange(value: string): void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={props.label}>{props.label}</Label>
      <Select value={props.value} onValueChange={props.onChange}>
        <SelectTrigger id={props.label} aria-label={props.label}>
          <SelectValue placeholder={`选择${props.label}`} />
        </SelectTrigger>
        <SelectContent>
          {props.options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function NumericInput(props: {
  label: string;
  value: number | null;
  hideLabel?: boolean;
  inputClassName?: string;
  onCommit(value: number | null): void;
}) {
  const [text, setText] = useState(props.value === null ? "" : String(props.value));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setText(props.value === null ? "" : String(props.value));
    setError(null);
  }, [props.value]);

  const commit = () => {
    const trimmed = text.trim();
    if (!trimmed) {
      setError(null);
      props.onCommit(null);
      return;
    }

    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) {
      setError("请输入有效数字");
      return;
    }

    setError(null);
    props.onCommit(parsed);
  };

  return (
    <div className="space-y-2">
      <Label
        className={props.hideLabel ? "sr-only" : undefined}
        htmlFor={props.label}
      >
        {props.label}
      </Label>
      <Input
        id={props.label}
        aria-label={props.label}
        className={props.inputClassName}
        value={text}
        onChange={(event) => setText(event.target.value)}
        onBlur={commit}
      />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function ModifierContributionsEditor(props: {
  contributions: ModifierContribution[];
  onChange(contributions: ModifierContribution[]): void;
}) {
  const addContribution = () => {
    props.onChange([
      ...props.contributions,
      {
        id: `editor-modifier:${Date.now()}:${props.contributions.length}`,
        definition: { kind: "modifier", target: "evasion" },
        editable: { label: "", value: 0 },
      },
    ]);
  };

  const updateContribution = (
    index: number,
    patch: Partial<ModifierContribution>,
  ) => {
    props.onChange(
      props.contributions.map((contribution, itemIndex) =>
        itemIndex === index ? { ...contribution, ...patch } : contribution,
      ),
    );
  };

  return (
    <div className="space-y-2 rounded-md border p-3">
      <div className="flex flex-col gap-2 border-b pb-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Label>数值修正</Label>
          <p className="text-xs text-muted-foreground">
            为装备添加可编辑的角色数值修正
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addContribution}
        >
          <Plus className="mr-1 h-4 w-4" />
          添加修正
        </Button>
      </div>
      {props.contributions.length > 0 ? (
        <div className="hidden grid-cols-1 gap-3 px-1 pt-1 text-xs font-medium text-muted-foreground md:grid md:grid-cols-[1fr,1fr,120px,32px]">
          <span>修正目标</span>
          <span>修正标签</span>
          <span>修正数值</span>
          <span className="sr-only">操作</span>
        </div>
      ) : null}
      {props.contributions.map((contribution, index) => (
        <div
          key={contribution.id}
          className="grid grid-cols-1 items-end gap-2 border-b py-2 last:border-b-0 md:grid-cols-[1fr,1fr,120px,32px]"
        >
          <div className="space-y-2">
            <Label
              className="sr-only"
              htmlFor={`modifier-target-${contribution.id}`}
            >
              修正目标 {index + 1}
            </Label>
            <Select
              value={contribution.definition.target}
              onValueChange={(target) =>
                updateContribution(index, {
                  definition: {
                    kind: "modifier",
                    target: target as EquipmentModifierTargetId,
                  },
                })
              }
            >
            <SelectTrigger
              id={`modifier-target-${contribution.id}`}
              aria-label={`修正目标 ${index + 1}`}
              className="h-9"
            >
                <SelectValue placeholder="修正目标" />
              </SelectTrigger>
              <SelectContent>
                {EQUIPMENT_MODIFIER_TARGETS.map((target) => (
                  <SelectItem key={target} value={target}>
                    {EQUIPMENT_TARGET_LABELS[target]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label
              className="sr-only"
              htmlFor={`modifier-label-${contribution.id}`}
            >
              修正标签 {index + 1}
            </Label>
            <Input
              id={`modifier-label-${contribution.id}`}
              aria-label={`修正标签 ${index + 1}`}
              className="h-9"
              value={contribution.editable.label}
              onChange={(event) =>
                updateContribution(index, {
                  editable: {
                    ...contribution.editable,
                    label: event.target.value,
                  },
                })
              }
            />
          </div>
          <NumericInput
            label={`修正数值 ${index + 1}`}
            hideLabel
            inputClassName="h-9"
            value={contribution.editable.value}
            onCommit={(value) =>
              updateContribution(index, {
                editable: {
                  ...contribution.editable,
                  value: value ?? 0,
                },
              })
            }
          />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label={`删除修正 ${index + 1}`}
            className="h-9 w-9"
            onClick={() =>
              props.onChange(
                props.contributions.filter((_, itemIndex) => itemIndex !== index),
              )
            }
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}

function EmptyItemMessage({
  label,
  onAdd,
}: {
  label: string;
  onAdd(): void;
}) {
  return (
    <div className="text-center py-8">
      <p className="mb-4 text-muted-foreground">还没有{label}</p>
      <Button
        type="button"
        onClick={onAdd}
        className="mx-auto flex items-center gap-2"
      >
        <Plus className="h-4 w-4" />
        创建第一件{label}
      </Button>
    </div>
  );
}
