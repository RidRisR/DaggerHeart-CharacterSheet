import { isModifierTargetId } from "@/automation/core/other-adjustments";
import {
  cardAutomationCompilerError,
  type CardAutomationCompilerDiagnostic,
} from "./compiler-diagnostics";
import type {
  CardAbilityIR,
  CardAutomationIR,
  CardChoiceIR,
  CardConditionIR,
  CardEffectIR,
  CardOptionEffectIR,
  CardValueIR,
} from "./ir-types";
import { CARD_AUTOMATION_PHASE_1_LIMITS } from "./limits";

export type ValidateCardAutomationIRResult =
  | { ok: true }
  | { ok: false; diagnostics: CardAutomationCompilerDiagnostic[] };

function pushInvalidIR(
  diagnostics: CardAutomationCompilerDiagnostic[],
  path: string,
  message: string,
  value?: unknown,
): void {
  diagnostics.push(
    cardAutomationCompilerError("INVALID_AUTOMATION_IR", message, {
      path,
      value,
    }),
  );
}

function pushLimitExceeded(
  diagnostics: CardAutomationCompilerDiagnostic[],
  path: string,
  message: string,
  value?: unknown,
): void {
  diagnostics.push(
    cardAutomationCompilerError("AUTOMATION_LIMIT_EXCEEDED", message, {
      path,
      value,
    }),
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function validateUniqueIds(
  values: readonly { id: string }[],
  path: string,
  diagnostics: CardAutomationCompilerDiagnostic[],
): void {
  const seen = new Set<string>();
  values.forEach((value, index) => {
    if (seen.has(value.id)) {
      pushInvalidIR(
        diagnostics,
        `${path}/${index}/id`,
        `Duplicate id "${value.id}".`,
        value.id,
      );
    }
    seen.add(value.id);
  });
}

function validateValueDepth(
  value: CardValueIR,
  path: string,
  diagnostics: CardAutomationCompilerDiagnostic[],
  depth = 1,
): void {
  if (depth > CARD_AUTOMATION_PHASE_1_LIMITS.maxValueExpressionDepth) {
    pushLimitExceeded(
      diagnostics,
      path,
      "Card value expression is too deeply nested.",
      depth,
    );
    return;
  }
  if (typeof value === "number") return;

  switch (value.kind) {
    case "readTarget":
      if (!isModifierTargetId(value.target)) {
        pushInvalidIR(
          diagnostics,
          `${path}/target`,
          `Unknown modifier target "${value.target}".`,
          value.target,
        );
      }
      return;
    case "level":
    case "tier":
    case "proficiency":
    case "attribute":
      return;
    case "add":
    case "multiply":
    case "min":
    case "max":
      value.values.forEach((nested, index) =>
        validateValueDepth(
          nested,
          `${path}/values/${index}`,
          diagnostics,
          depth + 1,
        ),
      );
      return;
    case "subtract":
    case "divide":
      validateValueDepth(value.left, `${path}/left`, diagnostics, depth + 1);
      validateValueDepth(value.right, `${path}/right`, diagnostics, depth + 1);
      return;
    case "floor":
    case "ceil":
    case "round":
      validateValueDepth(value.value, `${path}/value`, diagnostics, depth + 1);
      return;
    case "valueByTier": {
      const values = isRecord(value.values) ? value.values : {};
      const keys = Object.keys(values).sort();
      if (
        keys.length !== 4 ||
        keys[0] !== "1" ||
        keys[1] !== "2" ||
        keys[2] !== "3" ||
        keys[3] !== "4"
      ) {
        pushInvalidIR(
          diagnostics,
          `${path}/values`,
          'valueByTier values must contain exactly "1", "2", "3", and "4".',
          value.values,
        );
      }
      Object.entries(values).forEach(([tier, nested]) => {
        validateValueDepth(
          nested as CardValueIR,
          `${path}/values/${tier}`,
          diagnostics,
          depth + 1,
        );
      });
      return;
    }
  }
}

function validateConditionDepth(
  condition: CardConditionIR,
  path: string,
  diagnostics: CardAutomationCompilerDiagnostic[],
  depth = 1,
): void {
  if (depth > CARD_AUTOMATION_PHASE_1_LIMITS.maxConditionDepth) {
    pushLimitExceeded(
      diagnostics,
      path,
      "Card condition is too deeply nested.",
      depth,
    );
    return;
  }

  switch (condition.kind) {
    case "all":
    case "any":
      if (condition.conditions.length === 0) {
        pushInvalidIR(
          diagnostics,
          `${path}/conditions`,
          `${condition.kind} conditions must not be empty.`,
          condition.conditions,
        );
      }
      condition.conditions.forEach((nested, index) =>
        validateConditionDepth(
          nested,
          `${path}/conditions/${index}`,
          diagnostics,
          depth + 1,
        ),
      );
      return;
    case "not":
      validateConditionDepth(
        condition.condition,
        `${path}/condition`,
        diagnostics,
        depth + 1,
      );
      return;
    case "cardCount": {
      const hasAtLeast = condition.atLeast !== undefined;
      const hasExactly = condition.exactly !== undefined;
      if (hasAtLeast === hasExactly) {
        pushInvalidIR(
          diagnostics,
          path,
          "cardCount must contain exactly one of atLeast or exactly.",
          condition,
        );
      }
      return;
    }
    case "equipmentSlotEmpty":
    case "equipmentSlotFilled":
    case "choiceEquals":
    case "choiceIncludes":
      return;
  }
}

function validateConditionChoiceReferences(
  condition: CardConditionIR,
  allowedChoiceIds: ReadonlySet<string>,
  path: string,
  diagnostics: CardAutomationCompilerDiagnostic[],
): void {
  switch (condition.kind) {
    case "all":
    case "any":
      condition.conditions.forEach((nested, index) =>
        validateConditionChoiceReferences(
          nested,
          allowedChoiceIds,
          `${path}/conditions/${index}`,
          diagnostics,
        ),
      );
      return;
    case "not":
      validateConditionChoiceReferences(
        condition.condition,
        allowedChoiceIds,
        `${path}/condition`,
        diagnostics,
      );
      return;
    case "choiceEquals":
    case "choiceIncludes":
      if (!allowedChoiceIds.has(condition.choiceId)) {
        pushInvalidIR(
          diagnostics,
          `${path}/choiceId`,
          `Unknown choice reference "${condition.choiceId}".`,
          condition.choiceId,
        );
      }
      return;
    case "cardCount":
    case "equipmentSlotEmpty":
    case "equipmentSlotFilled":
      return;
  }
}

function validateOptionEffect(
  effect: CardOptionEffectIR,
  path: string,
  declaredChoiceIds: ReadonlySet<string>,
  diagnostics: CardAutomationCompilerDiagnostic[],
  effectDepth: number,
): void {
  if (effectDepth > CARD_AUTOMATION_PHASE_1_LIMITS.maxNestedEffectDepth) {
    pushLimitExceeded(
      diagnostics,
      path,
      "Card effect is too deeply nested.",
      effectDepth,
    );
    return;
  }
  if (effect.kind === "emitModifier" || effect.kind === "emitBase") {
    if (!isModifierTargetId(effect.target)) {
      pushInvalidIR(
        diagnostics,
        `${path}/target`,
        `Unknown modifier target "${effect.target}".`,
        effect.target,
      );
    }
    validateValueDepth(effect.value, `${path}/value`, diagnostics);
    return;
  }
  validateConditionDepth(effect.when, `${path}/when`, diagnostics);
  validateConditionChoiceReferences(
    effect.when,
    declaredChoiceIds,
    `${path}/when`,
    diagnostics,
  );
  effect.effects.forEach((nested, index) =>
    validateOptionEffect(
      nested,
      `${path}/effects/${index}`,
      declaredChoiceIds,
      diagnostics,
      effectDepth + 1,
    ),
  );
}

function validateEffect(
  effect: CardEffectIR,
  path: string,
  declaredChoiceIds: ReadonlySet<string>,
  diagnostics: CardAutomationCompilerDiagnostic[],
  effectDepth = 1,
): void {
  if (effectDepth > CARD_AUTOMATION_PHASE_1_LIMITS.maxNestedEffectDepth) {
    pushLimitExceeded(
      diagnostics,
      path,
      "Card effect is too deeply nested.",
      effectDepth,
    );
    return;
  }

  switch (effect.kind) {
    case "emitModifier":
    case "emitBase":
      if (!isModifierTargetId(effect.target)) {
        pushInvalidIR(
          diagnostics,
          `${path}/target`,
          `Unknown modifier target "${effect.target}".`,
          effect.target,
        );
      }
      validateValueDepth(effect.value, `${path}/value`, diagnostics);
      return;
    case "emitWhen":
      validateConditionDepth(effect.when, `${path}/when`, diagnostics);
      validateConditionChoiceReferences(
        effect.when,
        declaredChoiceIds,
        `${path}/when`,
        diagnostics,
      );
      effect.effects.forEach((nested, index) =>
        validateEffect(
          nested,
          `${path}/effects/${index}`,
          declaredChoiceIds,
          diagnostics,
          effectDepth + 1,
        ),
      );
      return;
    case "emitEachSelectedOptionEffect":
      if (!declaredChoiceIds.has(effect.choiceId)) {
        pushInvalidIR(
          diagnostics,
          `${path}/choiceId`,
          `Unknown choice reference "${effect.choiceId}".`,
          effect.choiceId,
        );
      }
      return;
    case "emitEachSelectedTarget":
      if (!declaredChoiceIds.has(effect.choiceId)) {
        pushInvalidIR(
          diagnostics,
          `${path}/choiceId`,
          `Unknown choice reference "${effect.choiceId}".`,
          effect.choiceId,
        );
      }
      validateValueDepth(effect.value, `${path}/value`, diagnostics);
      return;
  }
}

function validateChoice(
  choice: CardChoiceIR,
  index: number,
  previousChoiceIds: ReadonlySet<string>,
  duplicateDirectRequirements: Map<string, string>,
  path: string,
  diagnostics: CardAutomationCompilerDiagnostic[],
): void {
  if (choice.cardinality.unique === false) {
    pushInvalidIR(
      diagnostics,
      `${path}/cardinality/unique`,
      "Phase 1 choices must be unique.",
      choice.cardinality.unique,
    );
  }

  if (
    choice.kind === "selectOne" &&
    (choice.cardinality.min !== 1 || choice.cardinality.max !== 1)
  ) {
    pushInvalidIR(
      diagnostics,
      `${path}/cardinality`,
      "selectOne choices must require exactly one selection.",
      choice.cardinality,
    );
  }

  if (choice.requiredWhen) {
    validateConditionDepth(
      choice.requiredWhen,
      `${path}/requiredWhen`,
      diagnostics,
    );
    validateConditionChoiceReferences(
      choice.requiredWhen,
      previousChoiceIds,
      `${path}/requiredWhen`,
      diagnostics,
    );
    if (choice.requiredWhen.kind === "choiceEquals") {
      const key = `${choice.requiredWhen.choiceId}\u0000${choice.requiredWhen.valueId}`;
      const previousPath = duplicateDirectRequirements.get(key);
      if (previousPath) {
        pushInvalidIR(
          diagnostics,
          `${path}/requiredWhen`,
          "Only one later choice may use the same direct choiceEquals requirement.",
          { firstPath: previousPath, duplicateIndex: index },
        );
      } else {
        duplicateDirectRequirements.set(key, `${path}/requiredWhen`);
      }
    }
  }
}

function validateChoiceOptionEffects(
  choice: CardChoiceIR,
  choicePath: string,
  declaredChoiceIds: ReadonlySet<string>,
  diagnostics: CardAutomationCompilerDiagnostic[],
): void {
  if (choice.domain.kind !== "staticOptions") return;
  choice.domain.options.forEach((option, optionIndex) => {
    option.effects?.forEach((effect, effectIndex) =>
      validateOptionEffect(
        effect,
        `${choicePath}/domain/options/${optionIndex}/effects/${effectIndex}`,
        declaredChoiceIds,
        diagnostics,
        1,
      ),
    );
  });
}

function countOptionEffectContributions(effect: CardOptionEffectIR): number {
  switch (effect.kind) {
    case "emitModifier":
    case "emitBase":
      return 1;
    case "emitWhen":
      return effect.effects.reduce(
        (total, nested) => total + countOptionEffectContributions(nested),
        0,
      );
  }
}

function countEffectContributions(
  effect: CardEffectIR,
  choicesById: ReadonlyMap<string, CardChoiceIR>,
): number {
  switch (effect.kind) {
    case "emitModifier":
    case "emitBase":
      return 1;
    case "emitWhen":
      return effect.effects.reduce(
        (total, nested) =>
          total + countEffectContributions(nested, choicesById),
        0,
      );
    case "emitEachSelectedTarget":
      return choicesById.get(effect.choiceId)?.cardinality.max ?? 1;
    case "emitEachSelectedOptionEffect": {
      const choice = choicesById.get(effect.choiceId);
      if (!choice || choice.domain.kind !== "staticOptions") return 1;
      return choice.domain.options.reduce(
        (choiceTotal, option) =>
          choiceTotal +
          (option.effects ?? []).reduce(
            (optionTotal, optionEffect) =>
              optionTotal + countOptionEffectContributions(optionEffect),
            0,
          ),
        0,
      );
    }
  }
}

function collectOptionContributionEffectIds(
  effect: CardOptionEffectIR,
  path: string,
  ids: Map<string, string>,
  diagnostics: CardAutomationCompilerDiagnostic[],
): void {
  switch (effect.kind) {
    case "emitModifier":
    case "emitBase":
      collectContributionEffectId(effect.id, path, ids, diagnostics);
      return;
    case "emitWhen":
      effect.effects.forEach((nested, index) =>
        collectOptionContributionEffectIds(
          nested,
          `${path}/effects/${index}`,
          ids,
          diagnostics,
        ),
      );
      return;
  }
}

function collectContributionEffectId(
  id: string,
  path: string,
  ids: Map<string, string>,
  diagnostics: CardAutomationCompilerDiagnostic[],
): void {
  const previousPath = ids.get(id);
  if (previousPath) {
    pushInvalidIR(
      diagnostics,
      `${path}/id`,
      `Duplicate contribution effect id "${id}".`,
      {
        firstPath: previousPath,
        duplicatePath: `${path}/id`,
      },
    );
    return;
  }
  ids.set(id, `${path}/id`);
}

function collectEffectContributionIds(
  effect: CardEffectIR,
  path: string,
  ids: Map<string, string>,
  diagnostics: CardAutomationCompilerDiagnostic[],
): void {
  switch (effect.kind) {
    case "emitModifier":
    case "emitBase":
    case "emitEachSelectedTarget":
      collectContributionEffectId(effect.id, path, ids, diagnostics);
      return;
    case "emitWhen":
      effect.effects.forEach((nested, index) =>
        collectEffectContributionIds(
          nested,
          `${path}/effects/${index}`,
          ids,
          diagnostics,
        ),
      );
      return;
    case "emitEachSelectedOptionEffect":
      return;
  }
}

function validateContributionEffectIds(
  ability: CardAbilityIR,
  path: string,
  diagnostics: CardAutomationCompilerDiagnostic[],
): void {
  const ids = new Map<string, string>();
  ability.choices?.forEach((choice, choiceIndex) => {
    if (choice.domain.kind !== "staticOptions") return;
    choice.domain.options.forEach((option, optionIndex) => {
      option.effects?.forEach((effect, effectIndex) =>
        collectOptionContributionEffectIds(
          effect,
          `${path}/choices/${choiceIndex}/domain/options/${optionIndex}/effects/${effectIndex}`,
          ids,
          diagnostics,
        ),
      );
    });
  });
  ability.effects.forEach((effect, effectIndex) =>
    collectEffectContributionIds(
      effect,
      `${path}/effects/${effectIndex}`,
      ids,
      diagnostics,
    ),
  );
}

function validateAbility(
  ability: CardAbilityIR,
  abilityIndex: number,
  diagnostics: CardAutomationCompilerDiagnostic[],
): void {
  const path = `/abilities/${abilityIndex}`;
  const choices = ability.choices ?? [];
  if (
    ability.effects.length > CARD_AUTOMATION_PHASE_1_LIMITS.maxEffectsPerAbility
  ) {
    pushLimitExceeded(
      diagnostics,
      `${path}/effects`,
      "Card ability has too many effects.",
      ability.effects.length,
    );
  }
  if (choices.length > CARD_AUTOMATION_PHASE_1_LIMITS.maxChoicesPerAbility) {
    pushLimitExceeded(
      diagnostics,
      `${path}/choices`,
      "Card ability has too many choices.",
      choices.length,
    );
  }
  validateUniqueIds(choices, `${path}/choices`, diagnostics);

  const declaredChoiceIds = new Set(choices.map((choice) => choice.id));
  const choicesById = new Map(choices.map((choice) => [choice.id, choice]));
  const previousChoiceIds = new Set<string>();
  const duplicateDirectRequirements = new Map<string, string>();
  choices.forEach((choice, index) => {
    validateChoice(
      choice,
      index,
      previousChoiceIds,
      duplicateDirectRequirements,
      `${path}/choices/${index}`,
      diagnostics,
    );
    previousChoiceIds.add(choice.id);
  });

  if (ability.when) {
    validateConditionDepth(ability.when, `${path}/when`, diagnostics);
    validateConditionChoiceReferences(
      ability.when,
      declaredChoiceIds,
      `${path}/when`,
      diagnostics,
    );
  }
  choices.forEach((choice, index) =>
    validateChoiceOptionEffects(
      choice,
      `${path}/choices/${index}`,
      declaredChoiceIds,
      diagnostics,
    ),
  );
  const expandedContributionCount = ability.effects.reduce(
    (total, effect) => total + countEffectContributions(effect, choicesById),
    0,
  );
  if (
    expandedContributionCount >
    CARD_AUTOMATION_PHASE_1_LIMITS.maxExpandedContributionsPerAbility
  ) {
    pushLimitExceeded(
      diagnostics,
      `${path}/effects`,
      "Card ability can expand to too many contributions.",
      expandedContributionCount,
    );
  }
  validateContributionEffectIds(ability, path, diagnostics);
  ability.effects.forEach((effect, index) =>
    validateEffect(
      effect,
      `${path}/effects/${index}`,
      declaredChoiceIds,
      diagnostics,
    ),
  );
}

export function validateCardAutomationIR(
  ir: CardAutomationIR,
): ValidateCardAutomationIRResult {
  const diagnostics: CardAutomationCompilerDiagnostic[] = [];

  if (
    ir.abilities.length > CARD_AUTOMATION_PHASE_1_LIMITS.maxAbilitiesPerCard
  ) {
    pushLimitExceeded(
      diagnostics,
      "/abilities",
      "Card automation has too many abilities.",
      ir.abilities.length,
    );
  }
  validateUniqueIds(ir.abilities, "/abilities", diagnostics);
  ir.abilities.forEach((ability, index) =>
    validateAbility(ability, index, diagnostics),
  );

  return diagnostics.length > 0 ? { ok: false, diagnostics } : { ok: true };
}
