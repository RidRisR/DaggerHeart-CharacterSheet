import { describe, expect, it, vi } from "vitest";
import type { CardPackageState } from "../../types";
import type { CardEditorImageReader } from "../card-draft-serialization";
import {
  collectCardDraftIds,
  createLegacyDhcbView,
  serializeCardDraftToLegacyJson,
} from "../card-draft-serialization";

function baseDraft(partial: Partial<CardPackageState> = {}): CardPackageState {
  return {
    name: "Pack",
    version: "1.0.0",
    description: "Desc",
    author: "Author",
    customFieldDefinitions: {
      professions: [],
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
    ...partial,
  };
}

function imageService(overrides: Partial<CardEditorImageReader> = {}): CardEditorImageReader {
  return {
    listImageKeys: vi.fn().mockResolvedValue([]),
    getImageBlob: vi.fn().mockResolvedValue(null),
    ...overrides,
  };
}

describe("card draft serialization", () => {
  it("serializes legacy JSON from a whitelist without mutating card arrays", () => {
    const profession = [{ id: "card-a", 名称: "Warrior" } as never];
    const draft = {
      ...baseDraft({ profession }),
      isModified: true,
      lastSaved: new Date("2026-06-19T00:00:00.000Z"),
      unknownEditorField: "remove me",
    };

    const serialized = serializeCardDraftToLegacyJson(draft);

    expect(serialized).toEqual({
      name: "Pack",
      version: "1.0.0",
      description: "Desc",
      author: "Author",
      customFieldDefinitions: {
        professions: [],
        ancestries: [],
        communities: [],
        domains: [],
        variants: [],
      },
      profession,
      ancestry: [],
      community: [],
      subclass: [],
      domain: [],
      variant: [],
    });
    expect(serialized).not.toHaveProperty("isModified");
    expect(serialized).not.toHaveProperty("lastSaved");
    expect(serialized).not.toHaveProperty("unknownEditorField");
    expect(serialized.profession).not.toBe(profession);
    expect(draft.profession).toBe(profession);
  });

  it("does not share card object references with the input draft", () => {
    const draft = baseDraft({
      profession: [{ id: "card-a", 名称: "Warrior" } as never],
    });

    const serialized = serializeCardDraftToLegacyJson(draft);
    expect(serialized.profession).toHaveLength(1);
    const serializedProfessionCard = serialized.profession![0]!;
    (serializedProfessionCard as { 名称: string }).名称 = "Changed";

    expect(draft.profession![0]!).toMatchObject({ 名称: "Warrior" });
  });

  it("omits local image flags from legacy JSON serialization", () => {
    const serialized = serializeCardDraftToLegacyJson(
      baseDraft({
        profession: [
          {
            id: "json-local-image",
            名称: "Warrior",
            imageUrl: "https://example.test/fallback.png",
            hasLocalImage: true,
          } as never,
        ],
      }),
    );

    expect(serialized.profession).toHaveLength(1);
    const serializedProfessionCard = serialized.profession![0]!;
    expect(serializedProfessionCard).toMatchObject({
      id: "json-local-image",
      imageUrl: "https://example.test/fallback.png",
    });
    expect(serializedProfessionCard).not.toHaveProperty("hasLocalImage");
  });

  it("does not share custom field definition nested references with the input draft", () => {
    const draft = baseDraft({
      customFieldDefinitions: {
        professions: [],
        ancestries: [],
        communities: [],
        domains: [],
        variants: ["食物"],
        variantTypes: {
          食物: {
            subclasses: ["餐食"],
            levelRange: [1, 3],
            defaultLevel: 1,
            description: "Food cards",
          },
        },
      },
    });

    const serialized = serializeCardDraftToLegacyJson(draft);
    const serializedVariantType = serialized.customFieldDefinitions?.variantTypes?.食物;
    serializedVariantType?.subclasses?.push("饮料");
    if (serializedVariantType?.levelRange) {
      serializedVariantType.levelRange[0] = 2;
    }

    expect(draft.customFieldDefinitions?.variantTypes?.食物.subclasses).toEqual(["餐食"]);
    expect(draft.customFieldDefinitions?.variantTypes?.食物.levelRange).toEqual([1, 3]);
  });

  it("treats malformed card arrays as empty arrays", () => {
    const serialized = serializeCardDraftToLegacyJson(
      baseDraft({
        profession: { id: "not-an-array" } as never,
        domain: null as never,
      }),
    );

    expect(serialized.profession).toEqual([]);
    expect(serialized.domain).toEqual([]);
    expect(collectCardDraftIds(baseDraft({ profession: "bad" as never }))).toEqual(new Set());
  });

  it("creates a legacy DHCB view with only current-card local images", async () => {
    const packagedBlob = new Blob([new Uint8Array([1, 2, 3])], {
      type: "image/png",
    });
    const orphanBlob = new Blob([new Uint8Array([4, 5, 6])], {
      type: "image/png",
    });
    const getImageBlob = vi.fn(async (cardId: string) => {
      if (cardId === "card-with-image") return packagedBlob;
      if (cardId === "orphan-image") return orphanBlob;
      return null;
    });
    const draft = baseDraft({
      profession: [
        {
          id: "card-with-image",
          名称: "Warrior",
          imageUrl: "https://example.test/card.png",
          hasLocalImage: false,
        } as never,
      ],
      variant: [
        {
          id: "card-without-image",
          名称: "Variant",
          imageUrl: "https://example.test/remote.png",
          hasLocalImage: true,
        } as never,
      ],
    });

    const view = await createLegacyDhcbView(
      draft,
      imageService({
        listImageKeys: vi.fn().mockResolvedValue(["card-with-image", "orphan-image"]),
        getImageBlob,
      }),
    );

    expect(view.cardsJson.profession).toHaveLength(1);
    expect(view.cardsJson.variant).toHaveLength(1);
    const packagedProfessionCard = view.cardsJson.profession![0]!;
    const remoteVariantCard = view.cardsJson.variant![0]!;
    expect(packagedProfessionCard).toMatchObject({
      id: "card-with-image",
      hasLocalImage: true,
    });
    expect(packagedProfessionCard).not.toHaveProperty("imageUrl");
    expect(remoteVariantCard).toMatchObject({
      id: "card-without-image",
      imageUrl: "https://example.test/remote.png",
    });
    expect(remoteVariantCard).not.toHaveProperty("hasLocalImage");
    expect(view.images).toEqual([{ cardId: "card-with-image", blob: packagedBlob }]);
    expect(getImageBlob).toHaveBeenCalledTimes(1);
    expect(getImageBlob).toHaveBeenCalledWith("card-with-image");
  });

  it("clears stale local image flags when there is no matching image key", async () => {
    const draft = baseDraft({
      profession: [
        {
          id: "stale-local-image",
          名称: "Warrior",
          imageUrl: "https://example.test/fallback.png",
          hasLocalImage: true,
        } as never,
      ],
    });

    const view = await createLegacyDhcbView(draft, imageService());

    expect(view.images).toEqual([]);
    expect(view.cardsJson.profession).toHaveLength(1);
    const professionCard = view.cardsJson.profession![0]!;
    expect(professionCard).toMatchObject({
      id: "stale-local-image",
      imageUrl: "https://example.test/fallback.png",
    });
    expect(professionCard).not.toHaveProperty("hasLocalImage");
  });

  it("clears stale local image flags when a matching image key has no blob", async () => {
    const draft = baseDraft({
      profession: [
        {
          id: "missing-blob",
          名称: "Warrior",
          imageUrl: "https://example.test/fallback.png",
          hasLocalImage: true,
        } as never,
      ],
    });

    const view = await createLegacyDhcbView(
      draft,
      imageService({
        listImageKeys: vi.fn().mockResolvedValue(["missing-blob"]),
        getImageBlob: vi.fn().mockResolvedValue(null),
      }),
    );

    expect(view.images).toEqual([]);
    expect(view.cardsJson.profession).toHaveLength(1);
    const professionCard = view.cardsJson.profession![0]!;
    expect(professionCard).toMatchObject({
      id: "missing-blob",
      imageUrl: "https://example.test/fallback.png",
    });
    expect(professionCard).not.toHaveProperty("hasLocalImage");
  });

  it("skips matching image keys whose blobs cannot be read", async () => {
    const draft = baseDraft({
      profession: [
        {
          id: "image-read-fails",
          名称: "Warrior",
          imageUrl: "https://example.test/fallback.png",
          hasLocalImage: true,
        } as never,
      ],
    });

    const view = await createLegacyDhcbView(
      draft,
      imageService({
        listImageKeys: vi.fn().mockResolvedValue(["image-read-fails"]),
        getImageBlob: vi.fn().mockRejectedValue(new Error("read failed")),
      }),
    );

    expect(view.images).toEqual([]);
    expect(view.cardsJson.profession).toHaveLength(1);
    const professionCard = view.cardsJson.profession![0]!;
    expect(professionCard).toMatchObject({
      id: "image-read-fails",
      imageUrl: "https://example.test/fallback.png",
    });
    expect(professionCard).not.toHaveProperty("hasLocalImage");
  });
});
