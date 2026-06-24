import type { ModifierTargetId } from "@/automation/core/types";
import type { CardAutomationSnapshot } from "./snapshot";
import type { CardAttributeKey, CardValueIR } from "./ir-types";

export type CardValueEvaluationResult =
  | { ok: true; value: number }
  | { ok: false; message: string };

type CardValueEvaluationSuccess = Extract<CardValueEvaluationResult, { ok: true }>;
type CardValueEvaluationFailure = Extract<CardValueEvaluationResult, { ok: false }>;

function finite(value: number): CardValueEvaluationResult {
  return Number.isFinite(value)
    ? { ok: true, value }
    : { ok: false, message: "Card value expression produced a non-finite number." };
}

function attributeTarget(attribute: CardAttributeKey): ModifierTargetId {
  return `${attribute}.value`;
}

function evaluateMany(
  values: CardValueIR[],
  snapshot: CardAutomationSnapshot,
): CardValueEvaluationResult[] {
  return values.map((value) => evaluateCardValue(value, snapshot));
}

function firstFailure(
  results: CardValueEvaluationResult[],
): CardValueEvaluationFailure | undefined {
  return results.find(
    (result): result is CardValueEvaluationFailure => !result.ok,
  );
}

function successfulValues(
  results: CardValueEvaluationResult[],
): CardValueEvaluationSuccess[] {
  return results.filter(
    (result): result is CardValueEvaluationSuccess => result.ok,
  );
}

export function evaluateCardValue(
  value: CardValueIR,
  snapshot: CardAutomationSnapshot,
): CardValueEvaluationResult {
  if (typeof value === "number") return finite(value);

  switch (value.kind) {
    case "readTarget": {
      const targetValue = snapshot.targetValues[value.target];
      return targetValue === undefined
        ? {
            ok: false,
            message: `Target "${value.target}" has no numeric pre-card value.`,
          }
        : finite(targetValue);
    }
    case "level":
      return snapshot.level === undefined
        ? { ok: false, message: "Character level has no numeric value." }
        : finite(snapshot.level);
    case "tier":
      return snapshot.tier === undefined
        ? { ok: false, message: "Character tier has no numeric value." }
        : finite(Number(snapshot.tier));
    case "proficiency":
      return snapshot.proficiency === undefined
        ? { ok: false, message: "Character proficiency has no numeric value." }
        : finite(snapshot.proficiency);
    case "attribute": {
      const targetValue = snapshot.targetValues[attributeTarget(value.attribute)];
      return targetValue === undefined
        ? {
            ok: false,
            message: `Attribute "${value.attribute}" has no numeric pre-card value.`,
          }
        : finite(targetValue);
    }
    case "add": {
      const results = evaluateMany(value.values, snapshot);
      const failure = firstFailure(results);
      if (failure) return failure;
      return finite(
        successfulValues(results).reduce((total, result) => total + result.value, 0),
      );
    }
    case "subtract": {
      const left = evaluateCardValue(value.left, snapshot);
      if (!left.ok) return left;
      const right = evaluateCardValue(value.right, snapshot);
      if (!right.ok) return right;
      return finite(left.value - right.value);
    }
    case "multiply": {
      const results = evaluateMany(value.values, snapshot);
      const failure = firstFailure(results);
      if (failure) return failure;
      return finite(
        successfulValues(results).reduce((total, result) => total * result.value, 1),
      );
    }
    case "divide": {
      const left = evaluateCardValue(value.left, snapshot);
      if (!left.ok) return left;
      const right = evaluateCardValue(value.right, snapshot);
      if (!right.ok) return right;
      if (right.value === 0) {
        return { ok: false, message: "Card value expression divides by zero." };
      }
      return finite(left.value / right.value);
    }
    case "floor": {
      const result = evaluateCardValue(value.value, snapshot);
      return result.ok ? finite(Math.floor(result.value)) : result;
    }
    case "ceil": {
      const result = evaluateCardValue(value.value, snapshot);
      return result.ok ? finite(Math.ceil(result.value)) : result;
    }
    case "round": {
      const result = evaluateCardValue(value.value, snapshot);
      return result.ok ? finite(Math.round(result.value)) : result;
    }
    case "min": {
      const results = evaluateMany(value.values, snapshot);
      const failure = firstFailure(results);
      if (failure) return failure;
      return results.length === 0
        ? { ok: false, message: "Card value min requires at least one value." }
        : finite(Math.min(...successfulValues(results).map((result) => result.value)));
    }
    case "max": {
      const results = evaluateMany(value.values, snapshot);
      const failure = firstFailure(results);
      if (failure) return failure;
      return results.length === 0
        ? { ok: false, message: "Card value max requires at least one value." }
        : finite(Math.max(...successfulValues(results).map((result) => result.value)));
    }
    case "valueByTier":
      if (snapshot.tier === undefined) {
        return { ok: false, message: "Character tier has no numeric value." };
      }
      return evaluateCardValue(value.values[snapshot.tier], snapshot);
  }
}
