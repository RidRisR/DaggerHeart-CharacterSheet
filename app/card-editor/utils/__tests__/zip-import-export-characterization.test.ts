import JSZip from "jszip";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CardPackageState } from "../../types";
import { exportCardPackageWithImages } from "../zip-export";
import { importCardPackageWithImages } from "../zip-import";

type LegacyCardPackageState = CardPackageState & {
  isModified?: boolean;
  lastSaved?: Date;
};

const getAllEditorImageKeys = vi.hoisted(() => vi.fn<() => Promise<string[]>>());
const getImageBlobFromDB = vi.hoisted(
  () => vi.fn<(cardId: string) => Promise<Blob | null>>(),
);
const clearAllEditorImages = vi.hoisted(() => vi.fn(async () => undefined));
const saveImageToDB = vi.hoisted(
  () =>
    vi.fn<(cardId: string, blob: Blob) => Promise<void>>(
      async () => undefined,
    ),
);

vi.mock("../image-db-helpers", () => ({
  getAllEditorImageKeys,
  getImageBlobFromDB,
  clearAllEditorImages,
  saveImageToDB,
}));

function packageWithImages(): LegacyCardPackageState {
  return {
    name: "图片包",
    version: "1.0.0",
    description: "描述",
    author: "作者",
    customFieldDefinitions: {
      professions: [],
      ancestries: [],
      communities: [],
      domains: [],
      variants: [],
    },
    profession: [
      {
        id: "card-with-image",
        名称: "带图职业",
        imageUrl: "https://example.test/card.png",
      } as never,
      {
        id: "card-without-image",
        名称: "远程图职业",
        imageUrl: "https://example.test/remote.png",
      } as never,
    ],
    ancestry: [],
    community: [],
    subclass: [],
    domain: [],
    variant: [],
    isModified: true,
    lastSaved: new Date("2026-06-19T00:00:00.000Z"),
  };
}

describe("card editor DHCB import/export characterization", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("records current DHCB export filtering orphan images and omitting imageUrl for packaged images", async () => {
    getAllEditorImageKeys.mockResolvedValue(["card-with-image", "orphan-image"]);
    const imageBytes = Object.assign(new Uint8Array([1, 2, 3]), {
      type: "image/png",
    }) as unknown as Blob;
    getImageBlobFromDB.mockImplementation(async (cardId) =>
      cardId === "card-with-image" ? imageBytes : null,
    );

    const blob = await exportCardPackageWithImages(packageWithImages(), "图片包");
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const cardsJson = JSON.parse(await zip.file("cards.json")!.async("text"));

    expect(zip.file("manifest.json")).not.toBeNull();
    expect(zip.file("images/card-with-image.png")).not.toBeNull();
    expect(zip.file("images/orphan-image.png")).toBeNull();
    expect(cardsJson).not.toHaveProperty("isModified");
    expect(cardsJson).not.toHaveProperty("lastSaved");
    expect(cardsJson.profession[0]).toMatchObject({
      id: "card-with-image",
      hasLocalImage: true,
    });
    expect(cardsJson.profession[0]).not.toHaveProperty("imageUrl");
    expect(cardsJson.profession[1]).toMatchObject({
      id: "card-without-image",
      imageUrl: "https://example.test/remote.png",
    });
  });

  it("records current DHCB import clearing editor images, saving packaged images, and marking matching cards", async () => {
    const zip = new JSZip();
    zip.file(
      "cards.json",
      JSON.stringify({
        name: "导入图片包",
        author: "作者",
        isModified: true,
        lastSaved: "2026-06-19T00:00:00.000Z",
        profession: [
          { id: "card-with-image", 名称: "带图职业", hasLocalImage: false },
          { id: "card-without-image", 名称: "无图职业", hasLocalImage: false },
        ],
        ancestry: [
          {
            id: "ancestry-a-1",
            名称: "星裔能力1",
            种族: "星裔",
            简介: "观星者",
            类别: 1,
          },
        ],
        subclass: [],
      }),
    );
    zip.file("images/card-with-image.png", new Uint8Array([1, 2, 3]));

    const file = (await zip.generateAsync({ type: "arraybuffer" })) as unknown as File;

    const imported = await importCardPackageWithImages(file);

    expect(clearAllEditorImages).toHaveBeenCalledTimes(1);
    expect(saveImageToDB).toHaveBeenCalledWith(
      "card-with-image",
      expect.any(Blob),
    );
    expect(imported.profession?.[0]).toMatchObject({
      id: "card-with-image",
      hasLocalImage: true,
    });
    expect(imported.profession?.[1]).toMatchObject({
      id: "card-without-image",
    });
    expect(imported.profession?.[1]).not.toHaveProperty("hasLocalImage");
    expect(imported.ancestry).toHaveLength(2);
    expect(imported).not.toHaveProperty("isModified");
    expect(imported).not.toHaveProperty("lastSaved");
  });

  it("records current DHCB import skipping orphan images without adding cards", async () => {
    const zip = new JSZip();
    zip.file(
      "cards.json",
      JSON.stringify({
        name: "孤儿图片包",
        profession: [{ id: "card-a", 名称: "职业" }],
        ancestry: [],
        subclass: [],
      }),
    );
    zip.file("images/orphan.png", new Uint8Array([4, 5, 6]));

    const file = (await zip.generateAsync({ type: "arraybuffer" })) as unknown as File;

    const imported = await importCardPackageWithImages(file);

    expect(saveImageToDB).not.toHaveBeenCalledWith("orphan", expect.any(Blob));
    expect(imported.profession).toEqual([
      expect.objectContaining({ id: "card-a" }),
    ]);
    expect(imported.profession).toHaveLength(1);
  });

  it("records current DHCB import continuing when image persistence fails", async () => {
    saveImageToDB.mockRejectedValueOnce(new Error("save failed"));
    const zip = new JSZip();
    zip.file(
      "cards.json",
      JSON.stringify({
        name: "图片失败包",
        profession: [
          { id: "card-with-image", 名称: "职业", hasLocalImage: false },
        ],
        ancestry: [],
        subclass: [],
      }),
    );
    zip.file("images/card-with-image.png", new Uint8Array([7, 8, 9]));

    const file = (await zip.generateAsync({ type: "arraybuffer" })) as unknown as File;

    const imported = await importCardPackageWithImages(file);

    expect(imported.profession?.[0]).toMatchObject({
      id: "card-with-image",
    });
    expect(imported.profession?.[0]).not.toHaveProperty("hasLocalImage");
    expect(saveImageToDB).toHaveBeenCalledWith(
      "card-with-image",
      expect.any(Blob),
    );
  });
});
