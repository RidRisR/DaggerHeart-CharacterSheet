import { afterEach, describe, expect, it, vi } from "vitest";
import {
  downloadEquipmentDraftJson,
  importEquipmentDraftFromFile,
  recoverEquipmentEditorDraft,
  toEquipmentExportJson,
} from "../equipment-import-export";

describe("equipment editor import/export", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("recovers missing editor-safe structure", () => {
    const result = recoverEquipmentEditorDraft({
      format: "daggerheart.equipment-pack.v1",
      name: "装备",
      version: "1.0.0",
      equipment: { weapons: [{ name: "半成品" }] },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.draft.author).toBe("");
    expect(result.draft.description).toBe("");
    expect(result.draft.equipment.weapons[0]).toMatchObject({
      name: "半成品",
      tier: "",
      modifierContributions: [],
    });
    expect(result.draft.equipment.armor).toEqual([]);
  });

  it("rejects non-object weapon entries", () => {
    const result = recoverEquipmentEditorDraft({
      format: "daggerheart.equipment-pack.v1",
      equipment: { weapons: ["bad"] },
    });

    expect(result).toMatchObject({ ok: false });
  });

  it.each([
    ["null top-level", null],
    ["array top-level", []],
    ["wrong string format", { format: "daggerheart.card-pack.v1" }],
    ["non-string format", { format: 123 }],
    [
      "equipment array",
      { format: "daggerheart.equipment-pack.v1", equipment: [] },
    ],
    [
      "weapons object",
      {
        format: "daggerheart.equipment-pack.v1",
        equipment: { weapons: {} },
      },
    ],
    [
      "armor object",
      { format: "daggerheart.equipment-pack.v1", equipment: { armor: {} } },
    ],
    [
      "non-object armor entry",
      {
        format: "daggerheart.equipment-pack.v1",
        equipment: { armor: ["bad"] },
      },
    ],
  ])("rejects invalid envelope: %s", (_name, value) => {
    expect(recoverEquipmentEditorDraft(value)).toMatchObject({ ok: false });
  });

  it("reports malformed JSON file import", async () => {
    const file = new File(["{"], "bad.json", { type: "application/json" });

    await expect(importEquipmentDraftFromFile(file)).resolves.toMatchObject({
      ok: false,
      message: "装备 JSON 解析失败",
    });
  });

  it("keeps null numeric placeholders in export JSON", () => {
    const result = recoverEquipmentEditorDraft({
      format: "daggerheart.equipment-pack.v1",
      equipment: {
        armor: [{ id: "armor", name: "armor", baseThresholds: {} }],
      },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(toEquipmentExportJson(result.draft).equipment.armor[0]).toMatchObject(
      {
        baseArmorMax: null,
        baseThresholds: { minor: null, major: null },
      },
    );
  });

  it("filters unsafe modifier contributions during recovery", () => {
    const result = recoverEquipmentEditorDraft({
      format: "daggerheart.equipment-pack.v1",
      equipment: {
        weapons: [
          {
            id: "weapon",
            modifierContributions: [
              null,
              "bad",
              { id: "missing-shape" },
              {
                id: "valid",
                definition: { kind: "modifier", target: "evasion" },
                editable: { label: "闪避", value: 1 },
              },
            ],
          },
        ],
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.draft.equipment.weapons[0].modifierContributions).toEqual([
      {
        id: "valid",
        definition: { kind: "modifier", target: "evasion" },
        editable: { label: "闪避", value: 1 },
      },
    ]);
  });

  it("downloads equipment JSON with the draft name or equipment pack fallback", async () => {
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);
    const createObjectURL = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:equipment");
    const revokeObjectURL = vi.spyOn(URL, "revokeObjectURL").mockImplementation(
      () => undefined,
    );
    const result = recoverEquipmentEditorDraft({
      format: "daggerheart.equipment-pack.v1",
      name: "",
      version: "1.2.3",
      author: "作者",
      description: "描述",
      equipment: {
        weapons: [{ id: "weapon", name: "武器" }],
        armor: [{ id: "armor", name: "护甲" }],
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    downloadEquipmentDraftJson(result.draft);

    const anchor = Array.from(document.querySelectorAll("a")).find(
      (item) => item.download === "装备包.json",
    );

    expect(anchor).toBeUndefined();
    expect(click).toHaveBeenCalledTimes(1);
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    await expect(
      (createObjectURL.mock.calls[0][0] as Blob).text().then(JSON.parse),
    ).resolves.toMatchObject({
      format: "daggerheart.equipment-pack.v1",
      name: "",
      version: "1.2.3",
      author: "作者",
      description: "描述",
      equipment: {
        weapons: [expect.objectContaining({ id: "weapon", name: "武器" })],
        armor: [expect.objectContaining({ id: "armor", name: "护甲" })],
      },
    });
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:equipment");
  });

  it("revokes the object URL when download click fails", () => {
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {
      throw new Error("click failed");
    });
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:equipment");
    const revokeObjectURL = vi.spyOn(URL, "revokeObjectURL").mockImplementation(
      () => undefined,
    );
    const result = recoverEquipmentEditorDraft({
      format: "daggerheart.equipment-pack.v1",
      name: "装备",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(() => downloadEquipmentDraftJson(result.draft)).toThrow(
      "click failed",
    );
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:equipment");
  });
});
