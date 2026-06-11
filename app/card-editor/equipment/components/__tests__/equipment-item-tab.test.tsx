import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type {
  ArmorEditorDraft,
  WeaponEditorDraft,
} from "../../equipment-draft";
import { ArmorItemTab, WeaponItemTab } from "../equipment-item-tab";

const baseWeapon: WeaponEditorDraft = {
  id: "weapon",
  name: "短剑",
  tier: "T1",
  weaponType: "primary",
  trait: "agility",
  damageType: "physical",
  range: "melee",
  burden: "oneHanded",
  damage: "d8",
  featureName: "锋利",
  description: "近身攻击时很可靠。",
  modifierContributions: [],
};

const baseArmor: ArmorEditorDraft = {
  id: "armor",
  name: "皮甲",
  tier: "T1",
  baseArmorMax: 3,
  baseThresholds: { minor: 5, major: 10 },
  featureName: "轻便",
  description: "适合快速行动。",
  modifierContributions: [],
};

describe("equipment item tabs", () => {
  it("shows card-editor-like top navigation and every weapon authoring field", () => {
    render(
      <WeaponItemTab
        packageName="测试装备包"
        author="测试作者"
        items={[baseWeapon]}
        selectedIndex={0}
        onSelect={vi.fn()}
        onAdd={vi.fn()}
        onDuplicate={vi.fn()}
        onDelete={vi.fn()}
        onUpdate={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "武器编辑" }),
    ).toBeInTheDocument();
    expect(screen.getByText("当前: 1 / 1 件")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "上一件" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "下一件" })).toBeInTheDocument();
    expect(screen.getByLabelText("快速跳转")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "新建" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "复制" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "删除" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /短剑/ })).toBeInTheDocument();
    expect(screen.getByText("ID: weapon")).toBeInTheDocument();
    expect(screen.getByTitle("编辑ID")).toBeInTheDocument();

    for (const label of [
      "武器名称",
      "阶级",
      "武器类型",
      "属性",
      "伤害类型",
      "范围",
      "负荷",
      "伤害",
      "特性名称",
      "特性描述",
    ]) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
  });

  it("edits armor tier and keeps invalid numeric typing out of the draft", async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();

    render(
      <ArmorItemTab
        packageName="测试装备包"
        author="测试作者"
        items={[baseArmor]}
        selectedIndex={0}
        onSelect={vi.fn()}
        onAdd={vi.fn()}
        onDuplicate={vi.fn()}
        onDelete={vi.fn()}
        onUpdate={onUpdate}
      />,
    );

    expect(screen.getByLabelText("阶级")).toBeInTheDocument();
    expect(screen.getByLabelText("基础护甲槽")).toHaveValue("3");

    await user.clear(screen.getByLabelText("基础护甲槽"));
    await user.type(screen.getByLabelText("基础护甲槽"), "abc");
    await user.tab();

    expect(screen.getByText("请输入有效数字")).toBeInTheDocument();
    expect(onUpdate).not.toHaveBeenCalledWith(0, { baseArmorMax: null });
    expect(onUpdate).not.toHaveBeenCalledWith(0, { baseArmorMax: expect.any(Number) });
  });

  it("commits empty armor numeric fields as null and valid numbers as numbers", async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();

    render(
      <ArmorItemTab
        packageName="测试装备包"
        author="测试作者"
        items={[baseArmor]}
        selectedIndex={0}
        onSelect={vi.fn()}
        onAdd={vi.fn()}
        onDuplicate={vi.fn()}
        onDelete={vi.fn()}
        onUpdate={onUpdate}
      />,
    );

    await user.clear(screen.getByLabelText("基础护甲槽"));
    await user.tab();

    expect(onUpdate).toHaveBeenCalledWith(0, { baseArmorMax: null });

    await user.clear(screen.getByLabelText("轻微阈值"));
    await user.type(screen.getByLabelText("轻微阈值"), "7");
    await user.tab();

    expect(onUpdate).toHaveBeenCalledWith(0, {
      baseThresholds: { minor: 7, major: 10 },
    });
  });

  it("adds and edits modifier contributions using the equipment target shape", async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();

    render(
      <WeaponItemTab
        packageName="测试装备包"
        author="测试作者"
        items={[baseWeapon]}
        selectedIndex={0}
        onSelect={vi.fn()}
        onAdd={vi.fn()}
        onDuplicate={vi.fn()}
        onDelete={vi.fn()}
        onUpdate={onUpdate}
      />,
    );

    await user.click(screen.getByRole("button", { name: "添加修正" }));

    expect(onUpdate).toHaveBeenLastCalledWith(0, {
      modifierContributions: [
        expect.objectContaining({
          definition: { kind: "modifier", target: "evasion" },
          editable: { label: "", value: 0 },
        }),
      ],
    });
  });
});
