import type {
  CardModifierContribution,
  ResolvedCardAutomation,
} from "./ir-types";

export function projectCardAutomationContributions(
  resolved: ResolvedCardAutomation,
): CardModifierContribution[] {
  return resolved.sources.flatMap((source) =>
    source.abilities.flatMap((ability) => {
      if (ability.status !== "ready") return [];
      return ability.effects.flatMap((effect) =>
        effect.status === "ready" && effect.contribution
          ? [effect.contribution]
          : [],
      );
    }),
  );
}
