import {
  cardAutomationCompilerError,
  type CardAutomationCompilerDiagnostic,
} from "./compiler-diagnostics";
import type { CardAutomationDefinition } from "./definition-types";
import {
  CARD_AUTOMATION_DEFINITION_FORMAT,
  CARD_AUTOMATION_IR_FORMAT,
  type CardAbilityIR,
  type CardAutomationIR,
  type CardChoiceIR,
  type CardChoiceOptionIR,
  type CardConditionIR,
  type CardContributionEffectIR,
  type CardEffectIR,
  type CardLifetimeIR,
  type CardMatchIR,
  type CardModifierTargetId,
  type CardOptionEffectIR,
  type CardValueIR,
} from "./ir-types";

export type NormalizeCardAutomationDefinitionResult =
  | { ok: true; irWithoutRevision: Omit<CardAutomationIR, "revision"> }
  | { ok: false; diagnostics: CardAutomationCompilerDiagnostic[] };

type MutableEffectCounter = { next: number };

const ATTRIBUTE_KEYS = [
  "agility",
  "strength",
  "finesse",
  "instinct",
  "presence",
  "knowledge",
] as const;
const CARD_ZONES = ["loadout", "vault", "any"] as const;
const CARD_TYPES = [
  "profession",
  "ancestry",
  "community",
  "subclass",
  "domain",
  "variant",
] as const;
const EQUIPMENT_SLOTS = ["armor", "primaryWeapon", "secondaryWeapon"] as const;
const TARGET_GROUPS = ["attributes", "experiences"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasString(value: unknown): value is string {
  return typeof value === "string";
}

function hasNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function hasBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function isOneOf<const T extends readonly string[]>(
  value: unknown,
  options: T,
): value is T[number] {
  return typeof value === "string" && options.includes(value);
}

function pushInvalid(
  diagnostics: CardAutomationCompilerDiagnostic[],
  path: string,
  message: string,
  value?: unknown,
): void {
  diagnostics.push(
    cardAutomationCompilerError("INVALID_AUTOMATION_DEFINITION", message, {
      path,
      value,
    }),
  );
}

function assertRecord(
  value: unknown,
  path: string,
  diagnostics: CardAutomationCompilerDiagnostic[],
): value is Record<string, unknown> {
  if (isRecord(value)) return true;
  pushInvalid(diagnostics, path, "Expected an object.", value);
  return false;
}

function assertKnownKeys(
  record: Record<string, unknown>,
  allowedKeys: readonly string[],
  path: string,
  diagnostics: CardAutomationCompilerDiagnostic[],
): boolean {
  const unknownKeys = Object.keys(record).filter(
    (key) => !allowedKeys.includes(key),
  );
  for (const key of unknownKeys) {
    pushInvalid(
      diagnostics,
      `${path}/${key}`,
      `Unknown field "${key}".`,
      record[key],
    );
  }
  return unknownKeys.length === 0;
}

function readRequiredString(
  record: Record<string, unknown>,
  key: string,
  path: string,
  diagnostics: CardAutomationCompilerDiagnostic[],
): string | undefined {
  const value = record[key];
  if (hasString(value)) return value;
  pushInvalid(
    diagnostics,
    `${path}/${key}`,
    `Expected "${key}" to be a string.`,
    value,
  );
  return undefined;
}

function readOptionalString(
  record: Record<string, unknown>,
  key: string,
  path: string,
  diagnostics: CardAutomationCompilerDiagnostic[],
): string | undefined {
  if (!(key in record)) return undefined;
  const value = record[key];
  if (hasString(value)) return value;
  pushInvalid(
    diagnostics,
    `${path}/${key}`,
    `Expected "${key}" to be a string.`,
    value,
  );
  return undefined;
}

function readRequiredArray(
  record: Record<string, unknown>,
  key: string,
  path: string,
  diagnostics: CardAutomationCompilerDiagnostic[],
): unknown[] | undefined {
  const value = record[key];
  if (Array.isArray(value)) return value;
  pushInvalid(
    diagnostics,
    `${path}/${key}`,
    `Expected "${key}" to be an array.`,
    value,
  );
  return undefined;
}

function readOptionalArray(
  record: Record<string, unknown>,
  key: string,
  path: string,
  diagnostics: CardAutomationCompilerDiagnostic[],
): unknown[] | undefined {
  if (!(key in record)) return undefined;
  const value = record[key];
  if (Array.isArray(value)) return value;
  pushInvalid(
    diagnostics,
    `${path}/${key}`,
    `Expected "${key}" to be an array.`,
    value,
  );
  return undefined;
}

function normalizeCardValue(
  value: unknown,
  path: string,
  diagnostics: CardAutomationCompilerDiagnostic[],
): CardValueIR | undefined {
  if (hasNumber(value)) return value;
  if (!assertRecord(value, path, diagnostics)) return undefined;

  const kind = value.kind;
  switch (kind) {
    case "readTarget": {
      assertKnownKeys(value, ["kind", "target"], path, diagnostics);
      const target = readRequiredString(value, "target", path, diagnostics);
      return target
        ? { kind, target: target as CardModifierTargetId }
        : undefined;
    }
    case "level":
    case "tier":
    case "proficiency":
      assertKnownKeys(value, ["kind"], path, diagnostics);
      return { kind };
    case "attribute": {
      assertKnownKeys(value, ["kind", "attribute"], path, diagnostics);
      if (!isOneOf(value.attribute, ATTRIBUTE_KEYS)) {
        pushInvalid(
          diagnostics,
          `${path}/attribute`,
          "Expected a known attribute key.",
          value.attribute,
        );
        return undefined;
      }
      return { kind, attribute: value.attribute };
    }
    case "add":
    case "multiply":
    case "min":
    case "max": {
      assertKnownKeys(value, ["kind", "values"], path, diagnostics);
      const values = readRequiredArray(value, "values", path, diagnostics);
      if (!values) return undefined;
      return {
        kind,
        values: values
          .map((nested, index) =>
            normalizeCardValue(nested, `${path}/values/${index}`, diagnostics),
          )
          .filter((nested): nested is CardValueIR => nested !== undefined),
      };
    }
    case "subtract":
    case "divide": {
      assertKnownKeys(value, ["kind", "left", "right"], path, diagnostics);
      const left = normalizeCardValue(value.left, `${path}/left`, diagnostics);
      const right = normalizeCardValue(
        value.right,
        `${path}/right`,
        diagnostics,
      );
      return left && right ? { kind, left, right } : undefined;
    }
    case "floor":
    case "ceil":
    case "round": {
      assertKnownKeys(value, ["kind", "value"], path, diagnostics);
      const nestedValue = normalizeCardValue(
        value.value,
        `${path}/value`,
        diagnostics,
      );
      return nestedValue ? { kind, value: nestedValue } : undefined;
    }
    case "valueByTier": {
      assertKnownKeys(value, ["kind", "values"], path, diagnostics);
      if (!assertRecord(value.values, `${path}/values`, diagnostics))
        return undefined;
      const values = Object.fromEntries(
        Object.entries(value.values)
          .map(
            ([tier, nested]) =>
              [
                tier,
                normalizeCardValue(
                  nested,
                  `${path}/values/${tier}`,
                  diagnostics,
                ),
              ] as const,
          )
          .filter(
            (entry): entry is readonly [string, CardValueIR] =>
              entry[1] !== undefined,
          ),
      );
      return { kind, values } as CardValueIR;
    }
    default:
      pushInvalid(
        diagnostics,
        `${path}/kind`,
        "Expected a known value kind.",
        kind,
      );
      return undefined;
  }
}

function normalizeCardMatch(
  value: unknown,
  path: string,
  diagnostics: CardAutomationCompilerDiagnostic[],
): CardMatchIR | undefined {
  if (!assertRecord(value, path, diagnostics)) return undefined;
  assertKnownKeys(
    value,
    ["type", "classification", "level", "variantType", "variantSubCategory"],
    path,
    diagnostics,
  );

  const match: CardMatchIR = {};
  if ("type" in value) {
    if (!isOneOf(value.type, CARD_TYPES))
      pushInvalid(
        diagnostics,
        `${path}/type`,
        "Expected a known card type.",
        value.type,
      );
    else match.type = value.type;
  }
  if ("classification" in value) {
    if (!hasString(value.classification))
      pushInvalid(
        diagnostics,
        `${path}/classification`,
        "Expected classification to be a string.",
        value.classification,
      );
    else match.classification = value.classification;
  }
  if ("level" in value) {
    if (!hasNumber(value.level))
      pushInvalid(
        diagnostics,
        `${path}/level`,
        "Expected level to be a number.",
        value.level,
      );
    else match.level = value.level;
  }
  if ("variantType" in value) {
    if (!hasString(value.variantType))
      pushInvalid(
        diagnostics,
        `${path}/variantType`,
        "Expected variantType to be a string.",
        value.variantType,
      );
    else match.variantType = value.variantType;
  }
  if ("variantSubCategory" in value) {
    if (!hasString(value.variantSubCategory)) {
      pushInvalid(
        diagnostics,
        `${path}/variantSubCategory`,
        "Expected variantSubCategory to be a string.",
        value.variantSubCategory,
      );
    } else match.variantSubCategory = value.variantSubCategory;
  }
  return match;
}

function normalizeCardCondition(
  value: unknown,
  path: string,
  diagnostics: CardAutomationCompilerDiagnostic[],
): CardConditionIR | undefined {
  if (!assertRecord(value, path, diagnostics)) return undefined;

  const kind = value.kind;
  switch (kind) {
    case "all":
    case "any": {
      assertKnownKeys(value, ["kind", "conditions"], path, diagnostics);
      const conditions = readRequiredArray(
        value,
        "conditions",
        path,
        diagnostics,
      );
      if (!conditions) return undefined;
      return {
        kind,
        conditions: conditions
          .map((condition, index) =>
            normalizeCardCondition(
              condition,
              `${path}/conditions/${index}`,
              diagnostics,
            ),
          )
          .filter(
            (condition): condition is CardConditionIR =>
              condition !== undefined,
          ),
      } as CardConditionIR;
    }
    case "not": {
      assertKnownKeys(value, ["kind", "condition"], path, diagnostics);
      const condition = normalizeCardCondition(
        value.condition,
        `${path}/condition`,
        diagnostics,
      );
      return condition ? { kind, condition } : undefined;
    }
    case "cardCount": {
      assertKnownKeys(
        value,
        ["kind", "zone", "match", "atLeast", "exactly"],
        path,
        diagnostics,
      );
      if (!isOneOf(value.zone, CARD_ZONES)) {
        pushInvalid(
          diagnostics,
          `${path}/zone`,
          "Expected a known card zone.",
          value.zone,
        );
        return undefined;
      }
      const match = normalizeCardMatch(
        value.match,
        `${path}/match`,
        diagnostics,
      );
      const condition: CardConditionIR = {
        kind,
        zone: value.zone,
        match: match ?? {},
      };
      if ("atLeast" in value) {
        if (!hasNumber(value.atLeast))
          pushInvalid(
            diagnostics,
            `${path}/atLeast`,
            "Expected atLeast to be a number.",
            value.atLeast,
          );
        else condition.atLeast = value.atLeast;
      }
      if ("exactly" in value) {
        if (!hasNumber(value.exactly))
          pushInvalid(
            diagnostics,
            `${path}/exactly`,
            "Expected exactly to be a number.",
            value.exactly,
          );
        else condition.exactly = value.exactly;
      }
      return match ? condition : undefined;
    }
    case "equipmentSlotEmpty":
    case "equipmentSlotFilled":
      assertKnownKeys(value, ["kind", "slot"], path, diagnostics);
      if (!isOneOf(value.slot, EQUIPMENT_SLOTS)) {
        pushInvalid(
          diagnostics,
          `${path}/slot`,
          "Expected a known equipment slot.",
          value.slot,
        );
        return undefined;
      }
      return { kind, slot: value.slot };
    case "choiceEquals":
    case "choiceIncludes": {
      assertKnownKeys(
        value,
        ["kind", "choiceId", "valueId"],
        path,
        diagnostics,
      );
      const choiceId = readRequiredString(value, "choiceId", path, diagnostics);
      const valueId = readRequiredString(value, "valueId", path, diagnostics);
      return choiceId && valueId ? { kind, choiceId, valueId } : undefined;
    }
    default:
      pushInvalid(
        diagnostics,
        `${path}/kind`,
        "Expected a known condition kind.",
        kind,
      );
      return undefined;
  }
}

function normalizeLifetime(
  value: unknown,
  path: string,
  diagnostics: CardAutomationCompilerDiagnostic[],
): CardLifetimeIR | undefined {
  if (value === undefined) return { kind: "whileInLoadout" };
  if (!assertRecord(value, path, diagnostics)) return undefined;
  assertKnownKeys(value, ["kind"], path, diagnostics);
  if (value.kind === "whileInLoadout" || value.kind === "permanentOnceClaimed")
    return { kind: value.kind };
  pushInvalid(
    diagnostics,
    `${path}/kind`,
    "Expected a known lifetime kind.",
    value.kind,
  );
  return undefined;
}

function normalizeCardinality(
  value: unknown,
  path: string,
  diagnostics: CardAutomationCompilerDiagnostic[],
): { min: number; max: number; unique: boolean } | undefined {
  if (!assertRecord(value, path, diagnostics)) return undefined;
  assertKnownKeys(value, ["min", "max", "unique"], path, diagnostics);
  const min = value.min;
  const max = value.max;
  const unique = value.unique;
  if (!hasNumber(min))
    pushInvalid(
      diagnostics,
      `${path}/min`,
      "Expected min to be a number.",
      min,
    );
  if (!hasNumber(max))
    pushInvalid(
      diagnostics,
      `${path}/max`,
      "Expected max to be a number.",
      max,
    );
  if (!hasBoolean(unique))
    pushInvalid(
      diagnostics,
      `${path}/unique`,
      "Expected unique to be a boolean.",
      unique,
    );
  return hasNumber(min) && hasNumber(max) && hasBoolean(unique)
    ? { min, max, unique }
    : undefined;
}

function nextDefaultEffectId(counter: MutableEffectCounter): string {
  const id = `effect-${counter.next}`;
  counter.next += 1;
  return id;
}

function normalizeContributionEffect(
  value: Record<string, unknown>,
  path: string,
  diagnostics: CardAutomationCompilerDiagnostic[],
  counter: MutableEffectCounter,
): CardContributionEffectIR | undefined {
  if (value.kind !== "emitModifier" && value.kind !== "emitBase") {
    pushInvalid(
      diagnostics,
      `${path}/kind`,
      "Expected a contribution effect kind.",
      value.kind,
    );
    return undefined;
  }
  assertKnownKeys(
    value,
    ["kind", "id", "target", "value", "label"],
    path,
    diagnostics,
  );
  const id =
    readOptionalString(value, "id", path, diagnostics) ??
    nextDefaultEffectId(counter);
  const target = readRequiredString(value, "target", path, diagnostics);
  const effectValue = normalizeCardValue(
    value.value,
    `${path}/value`,
    diagnostics,
  );
  const label = readOptionalString(value, "label", path, diagnostics);
  if (!target || effectValue === undefined) return undefined;
  return label === undefined
    ? {
        kind: value.kind,
        id,
        target: target as CardModifierTargetId,
        value: effectValue,
      }
    : {
        kind: value.kind,
        id,
        target: target as CardModifierTargetId,
        value: effectValue,
        label,
      };
}

function normalizeCardEffect(
  value: unknown,
  path: string,
  diagnostics: CardAutomationCompilerDiagnostic[],
  counter: MutableEffectCounter,
): CardEffectIR | undefined {
  if (!assertRecord(value, path, diagnostics)) return undefined;

  switch (value.kind) {
    case "emitModifier":
    case "emitBase":
      return normalizeContributionEffect(value, path, diagnostics, counter);
    case "emitWhen": {
      assertKnownKeys(
        value,
        ["kind", "id", "when", "effects"],
        path,
        diagnostics,
      );
      const id = readOptionalString(value, "id", path, diagnostics);
      const when = normalizeCardCondition(
        value.when,
        `${path}/when`,
        diagnostics,
      );
      const effectValues = readRequiredArray(
        value,
        "effects",
        path,
        diagnostics,
      );
      if (!when || !effectValues) return undefined;
      const effects = effectValues
        .map((effect, index) =>
          normalizeCardEffect(
            effect,
            `${path}/effects/${index}`,
            diagnostics,
            counter,
          ),
        )
        .filter((effect): effect is CardEffectIR => effect !== undefined);
      return id === undefined
        ? { kind: "emitWhen", when, effects }
        : { kind: "emitWhen", id, when, effects };
    }
    case "emitEachSelectedOptionEffect": {
      assertKnownKeys(value, ["kind", "id", "choiceId"], path, diagnostics);
      const id = readOptionalString(value, "id", path, diagnostics);
      const choiceId = readRequiredString(value, "choiceId", path, diagnostics);
      if (!choiceId) return undefined;
      return id === undefined
        ? { kind: "emitEachSelectedOptionEffect", choiceId }
        : { kind: "emitEachSelectedOptionEffect", id, choiceId };
    }
    case "emitEachSelectedTarget": {
      assertKnownKeys(
        value,
        ["kind", "id", "choiceId", "value", "label"],
        path,
        diagnostics,
      );
      const id =
        readOptionalString(value, "id", path, diagnostics) ??
        nextDefaultEffectId(counter);
      const choiceId = readRequiredString(value, "choiceId", path, diagnostics);
      const effectValue = normalizeCardValue(
        value.value,
        `${path}/value`,
        diagnostics,
      );
      const label = readOptionalString(value, "label", path, diagnostics);
      if (!choiceId || effectValue === undefined) return undefined;
      return label === undefined
        ? { kind: "emitEachSelectedTarget", id, choiceId, value: effectValue }
        : {
            kind: "emitEachSelectedTarget",
            id,
            choiceId,
            value: effectValue,
            label,
          };
    }
    default:
      pushInvalid(
        diagnostics,
        `${path}/kind`,
        "Expected a known effect kind.",
        value.kind,
      );
      return undefined;
  }
}

function normalizeOptionEffect(
  value: unknown,
  path: string,
  diagnostics: CardAutomationCompilerDiagnostic[],
  counter: MutableEffectCounter,
): CardOptionEffectIR | undefined {
  if (!assertRecord(value, path, diagnostics)) return undefined;

  switch (value.kind) {
    case "emitModifier":
    case "emitBase":
      return normalizeContributionEffect(value, path, diagnostics, counter);
    case "emitWhen": {
      assertKnownKeys(
        value,
        ["kind", "id", "when", "effects"],
        path,
        diagnostics,
      );
      const id = readOptionalString(value, "id", path, diagnostics);
      const when = normalizeCardCondition(
        value.when,
        `${path}/when`,
        diagnostics,
      );
      const effectValues = readRequiredArray(
        value,
        "effects",
        path,
        diagnostics,
      );
      if (!when || !effectValues) return undefined;
      const effects = effectValues
        .map((effect, index) => {
          if (!assertRecord(effect, `${path}/effects/${index}`, diagnostics))
            return undefined;
          return normalizeContributionEffect(
            effect,
            `${path}/effects/${index}`,
            diagnostics,
            counter,
          );
        })
        .filter(
          (effect): effect is CardContributionEffectIR => effect !== undefined,
        );
      return id === undefined
        ? { kind: "emitWhen", when, effects }
        : { kind: "emitWhen", id, when, effects };
    }
    default:
      pushInvalid(
        diagnostics,
        `${path}/kind`,
        "Expected a known option effect kind.",
        value.kind,
      );
      return undefined;
  }
}

function normalizeChoiceOption(
  value: unknown,
  path: string,
  diagnostics: CardAutomationCompilerDiagnostic[],
  counter: MutableEffectCounter,
): CardChoiceOptionIR | undefined {
  if (!assertRecord(value, path, diagnostics)) return undefined;
  assertKnownKeys(value, ["id", "label", "effects"], path, diagnostics);
  const id = readRequiredString(value, "id", path, diagnostics);
  const label = readRequiredString(value, "label", path, diagnostics);
  const effectsValue = readOptionalArray(value, "effects", path, diagnostics);
  if (!id || !label) return undefined;
  const effects = effectsValue
    ?.map((effect, index) =>
      normalizeOptionEffect(
        effect,
        `${path}/effects/${index}`,
        diagnostics,
        counter,
      ),
    )
    .filter((effect): effect is CardOptionEffectIR => effect !== undefined);
  return effects === undefined ? { id, label } : { id, label, effects };
}

function normalizeChoice(
  value: unknown,
  path: string,
  diagnostics: CardAutomationCompilerDiagnostic[],
  counter: MutableEffectCounter,
): CardChoiceIR | undefined {
  if (!assertRecord(value, path, diagnostics)) return undefined;
  assertKnownKeys(
    value,
    ["id", "label", "kind", "requiredWhen", "cardinality", "domain"],
    path,
    diagnostics,
  );

  const id = readRequiredString(value, "id", path, diagnostics);
  const label = readOptionalString(value, "label", path, diagnostics);
  const requiredWhen =
    "requiredWhen" in value
      ? normalizeCardCondition(
          value.requiredWhen,
          `${path}/requiredWhen`,
          diagnostics,
        )
      : undefined;
  const cardinality = normalizeCardinality(
    value.cardinality,
    `${path}/cardinality`,
    diagnostics,
  );
  if (!id || !cardinality) return undefined;

  if (value.kind === "selectOne" || value.kind === "selectMany") {
    if (cardinality.unique === false) {
      pushInvalid(
        diagnostics,
        `${path}/cardinality/unique`,
        "Phase 1 choices must be unique.",
        cardinality.unique,
      );
    }
    if (!assertRecord(value.domain, `${path}/domain`, diagnostics))
      return undefined;
    assertKnownKeys(
      value.domain,
      ["kind", "options"],
      `${path}/domain`,
      diagnostics,
    );
    if (value.domain.kind !== "staticOptions") {
      pushInvalid(
        diagnostics,
        `${path}/domain/kind`,
        "Expected staticOptions domain.",
        value.domain.kind,
      );
      return undefined;
    }
    const optionValues = readRequiredArray(
      value.domain,
      "options",
      `${path}/domain`,
      diagnostics,
    );
    if (!optionValues) return undefined;
    const options = optionValues
      .map((option, index) =>
        normalizeChoiceOption(
          option,
          `${path}/domain/options/${index}`,
          diagnostics,
          counter,
        ),
      )
      .filter((option): option is CardChoiceOptionIR => option !== undefined);
    return {
      id,
      ...(label === undefined ? {} : { label }),
      kind: value.kind,
      ...(requiredWhen === undefined ? {} : { requiredWhen }),
      cardinality,
      domain: { kind: "staticOptions", options },
    };
  }

  if (value.kind === "targetSelectMany") {
    if (cardinality.unique === false) {
      pushInvalid(
        diagnostics,
        `${path}/cardinality/unique`,
        "Phase 1 choices must be unique.",
        cardinality.unique,
      );
    }
    if (!assertRecord(value.domain, `${path}/domain`, diagnostics))
      return undefined;
    assertKnownKeys(
      value.domain,
      ["kind", "group"],
      `${path}/domain`,
      diagnostics,
    );
    if (value.domain.kind !== "modifierTargetGroup") {
      pushInvalid(
        diagnostics,
        `${path}/domain/kind`,
        "Expected modifierTargetGroup domain.",
        value.domain.kind,
      );
      return undefined;
    }
    if (!isOneOf(value.domain.group, TARGET_GROUPS)) {
      pushInvalid(
        diagnostics,
        `${path}/domain/group`,
        "Expected a known modifier target group.",
        value.domain.group,
      );
      return undefined;
    }
    return {
      id,
      ...(label === undefined ? {} : { label }),
      kind: "targetSelectMany",
      ...(requiredWhen === undefined ? {} : { requiredWhen }),
      cardinality,
      domain: { kind: "modifierTargetGroup", group: value.domain.group },
    };
  }

  pushInvalid(
    diagnostics,
    `${path}/kind`,
    "Expected a known choice kind.",
    value.kind,
  );
  return undefined;
}

function normalizeAbility(
  value: unknown,
  path: string,
  diagnostics: CardAutomationCompilerDiagnostic[],
): CardAbilityIR | undefined {
  if (!assertRecord(value, path, diagnostics)) return undefined;
  assertKnownKeys(
    value,
    ["id", "label", "lifetime", "choices", "when", "effects"],
    path,
    diagnostics,
  );
  const id = readRequiredString(value, "id", path, diagnostics);
  const label = readRequiredString(value, "label", path, diagnostics);
  const lifetime = normalizeLifetime(
    value.lifetime,
    `${path}/lifetime`,
    diagnostics,
  );
  const counter: MutableEffectCounter = { next: 1 };
  const choiceValues = readOptionalArray(value, "choices", path, diagnostics);
  const choices = choiceValues
    ?.map((choice, index) =>
      normalizeChoice(choice, `${path}/choices/${index}`, diagnostics, counter),
    )
    .filter((choice): choice is CardChoiceIR => choice !== undefined);
  const when =
    "when" in value
      ? normalizeCardCondition(value.when, `${path}/when`, diagnostics)
      : undefined;
  const effectValues = readRequiredArray(value, "effects", path, diagnostics);
  if (!id || !label || !lifetime || !effectValues) return undefined;
  const effects = effectValues
    .map((effect, index) =>
      normalizeCardEffect(
        effect,
        `${path}/effects/${index}`,
        diagnostics,
        counter,
      ),
    )
    .filter((effect): effect is CardEffectIR => effect !== undefined);
  return {
    id,
    label,
    lifetime,
    ...(choices === undefined ? {} : { choices }),
    ...(when === undefined ? {} : { when }),
    effects,
  };
}

function normalizeBody(
  body: unknown,
  diagnostics: CardAutomationCompilerDiagnostic[],
): { abilities: CardAbilityIR[] } | undefined {
  if (!assertRecord(body, "/body", diagnostics)) return undefined;
  if ("format" in body) {
    pushInvalid(
      diagnostics,
      "/body/format",
      "Definition body must not carry an internal format marker.",
      body.format,
    );
  }
  if ("revision" in body) {
    pushInvalid(
      diagnostics,
      "/body/revision",
      "Definition body must not carry an internal revision marker.",
      body.revision,
    );
  }
  assertKnownKeys(body, ["abilities"], "/body", diagnostics);
  const abilityValues = readRequiredArray(
    body,
    "abilities",
    "/body",
    diagnostics,
  );
  if (!abilityValues) return undefined;
  const abilities = abilityValues
    .map((ability, index) =>
      normalizeAbility(ability, `/body/abilities/${index}`, diagnostics),
    )
    .filter((ability): ability is CardAbilityIR => ability !== undefined);
  return { abilities };
}

export function normalizeCardAutomationDefinition(
  definition: CardAutomationDefinition,
): NormalizeCardAutomationDefinitionResult {
  const diagnostics: CardAutomationCompilerDiagnostic[] = [];

  if (!assertRecord(definition, "", diagnostics))
    return { ok: false, diagnostics };
  assertKnownKeys(definition, ["format", "mode", "body"], "", diagnostics);

  if (definition.format !== CARD_AUTOMATION_DEFINITION_FORMAT) {
    return {
      ok: false,
      diagnostics: [
        cardAutomationCompilerError(
          "UNSUPPORTED_AUTOMATION_FORMAT",
          "Unsupported card automation definition format.",
          {
            path: "/format",
            value: definition.format,
          },
        ),
      ],
    };
  }

  if (definition.mode !== "lowLevel") {
    return {
      ok: false,
      diagnostics: [
        cardAutomationCompilerError(
          "UNSUPPORTED_AUTOMATION_FORMAT",
          "Unsupported card automation definition mode.",
          {
            path: "/mode",
            value: definition.mode,
          },
        ),
      ],
    };
  }

  const body = normalizeBody(definition.body, diagnostics);
  if (diagnostics.length > 0 || !body) return { ok: false, diagnostics };

  return {
    ok: true,
    irWithoutRevision: {
      format: CARD_AUTOMATION_IR_FORMAT,
      abilities: body.abilities,
    },
  };
}
