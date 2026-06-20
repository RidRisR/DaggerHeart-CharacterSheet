import { afterEach, describe, expect, it, vi } from "vitest";
import type { CardPackageState } from "../../types";
import {
  ensureAncestryPairs,
  ensureSubclassTriples,
} from "../import-export";

type LegacyCardPackageState = CardPackageState & {
  isModified?: boolean;
  lastSaved?: Date;
};

function packageBase(): LegacyCardPackageState {
  return {
    name: "旧行为测试包",
    version: "1.0.0",
    description: "描述",
    author: "作者",
    customFieldDefinitions: {
      professions: ["自定义职业字段"],
      ancestries: [],
      communities: [],
      domains: [],
      variants: [],
    },
    profession: [],
    ancestry: [],
    community: [],
    subclass: [],
    domain: [],
    variant: [],
    isModified: true,
    lastSaved: new Date("2026-06-19T00:00:00.000Z"),
  };
}

describe("card editor import/export characterization", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("records current JSON import recovery completing a single ancestry card into a pair", () => {
    const result = ensureAncestryPairs(
      [
        {
          id: "ancestry-a-1",
          名称: "星裔能力1",
          种族: "星裔",
          简介: "观星者",
          类别: 1,
          效果: "基础能力",
        } as never,
      ],
      packageBase(),
    );

    expect(result).toHaveLength(2);
    expect(result.map((card) => card.类别)).toEqual([1, 2]);
    expect(result[1]).toMatchObject({
      名称: "星裔能力2",
      种族: "星裔",
      简介: "观星者",
      类别: 2,
      效果: "进阶能力效果",
    });
  });

  it("records current JSON import recovery completing a single subclass card into a triple", () => {
    const result = ensureSubclassTriples(
      [
        {
          id: "subclass-a",
          名称: "星术师基石",
          子职业: "星术师",
          主职: "法师",
          等级: "基石",
          描述: "基石能力",
          施法: "灵巧",
        } as never,
      ],
      packageBase(),
    );

    expect(result).toHaveLength(3);
    expect(result.map((card) => card.等级)).toEqual(["基石", "专精", "大师"]);
    expect(result[1]).toMatchObject({
      名称: "星术师专精",
      子职业: "星术师",
      主职: "法师",
      等级: "专精",
      描述: "专精等级能力描述",
    });
    expect(result[2]).toMatchObject({
      名称: "星术师大师",
      子职业: "星术师",
      主职: "法师",
      等级: "大师",
      描述: "大师等级能力描述",
    });
  });

});
