import type { CardAutomationIR } from "./ir-types";

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => key !== "revision")
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => [key, sortValue(nested)]),
  );
}

export function canonicalizeCardAutomationIR(
  ir: Omit<CardAutomationIR, "revision"> | CardAutomationIR,
): string {
  return JSON.stringify(sortValue(ir));
}

function fnv1a32(text: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function createCardAutomationRevision(
  ir: Omit<CardAutomationIR, "revision"> | CardAutomationIR,
): string {
  return `stable32:${fnv1a32(canonicalizeCardAutomationIR(ir))}`;
}
