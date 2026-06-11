export type EquipmentItemKind = "weapon" | "armor";

const TYPE_ABBREVIATION: Record<EquipmentItemKind, string> = {
  weapon: "weap",
  armor: "armo",
};

export function sanitizeEquipmentIdString(value: string): string {
  return value
    .replace(/[^\w\u4e00-\u9fff-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function truncate(value: string, maxLength = 8) {
  return value.length <= maxLength ? value : value.substring(0, maxLength);
}

function stripLongGenericPackSuffix(value: string) {
  return value.length > 4 ? value.replace(/[包库]$/, "") : value;
}

function cleanPrefixPart(value: string, fallback: string) {
  const sanitized = sanitizeEquipmentIdString(value);
  return truncate(stripLongGenericPackSuffix(sanitized) || fallback);
}

function randomSuffix(input: { now?: () => number; random?: () => number }) {
  const timestamp = (input.now ?? Date.now)().toString(36);
  const random = (input.random ?? Math.random)()
    .toString(36)
    .substring(2, 8)
    .padEnd(6, "0");
  return `${timestamp}-${random}`;
}

export function buildStandardEquipmentId(
  packName: string,
  author: string,
  kind: EquipmentItemKind,
  suffix: string,
) {
  const cleanPackName = cleanPrefixPart(packName, "装备包");
  const cleanAuthor = cleanPrefixPart(author, "作者");
  const cleanSuffix = sanitizeEquipmentIdString(suffix) || "unnamed";
  return `${cleanPackName}-${cleanAuthor}-${TYPE_ABBREVIATION[kind]}-${cleanSuffix}`;
}

export function generateStandardEquipmentId(input: {
  packName: string;
  author: string;
  kind: EquipmentItemKind;
  now?: () => number;
  random?: () => number;
}) {
  return buildStandardEquipmentId(
    input.packName || "装备包",
    input.author || "作者",
    input.kind,
    randomSuffix(input),
  );
}

export function parseStandardEquipmentId(
  id: string,
  packName: string,
  author: string,
  kind: EquipmentItemKind,
): { isStandard: boolean; suffix: string; prefix: string } {
  const prefix = buildStandardEquipmentId(
    packName || "装备包",
    author || "作者",
    kind,
    "",
  ).replace(/unnamed$/, "");

  if (!id.startsWith(prefix)) {
    return { isStandard: false, suffix: id, prefix };
  }

  return { isStandard: true, suffix: id.substring(prefix.length), prefix };
}

export function rewriteEquipmentIdsForMetadataChange<
  TWeapon extends { id?: string },
  TArmor extends { id?: string },
>(input: {
  previous: { name: string; author: string };
  next: { name: string; author: string };
  weapons: TWeapon[];
  armor: TArmor[];
}) {
  return {
    weapons: input.weapons.map((item) => {
      const parsed = parseStandardEquipmentId(
        item.id ?? "",
        input.previous.name,
        input.previous.author,
        "weapon",
      );
      return parsed.isStandard
        ? {
            ...item,
            id: buildStandardEquipmentId(
              input.next.name,
              input.next.author,
              "weapon",
              parsed.suffix,
            ),
          }
        : item;
    }),
    armor: input.armor.map((item) => {
      const parsed = parseStandardEquipmentId(
        item.id ?? "",
        input.previous.name,
        input.previous.author,
        "armor",
      );
      return parsed.isStandard
        ? {
            ...item,
            id: buildStandardEquipmentId(
              input.next.name,
              input.next.author,
              "armor",
              parsed.suffix,
            ),
          }
        : item;
    }),
  };
}
