"use client";

import { useCallback, useEffect, useState } from "react";
import { projectCardAutomationSetupRequirements } from "@/card/automation/setup-projection";
import type { SheetData } from "@/lib/sheet-data";
import {
  CardAutomationSetupDialog,
  type CardAutomationSetupDialogProps,
} from "./card-automation-setup-dialog";

interface CardAutomationSetupAvailableEffect {
  kind: "cardAutomationSetupAvailable";
  cardInstanceId: string;
}

type CardAutomationSetupPromptEffect =
  | CardAutomationSetupAvailableEffect
  | { kind: string; cardInstanceId?: string };

export type CardAutomationSetupPromptSelectionResult =
  | {
      kind: "success";
      cardInstanceId?: string;
      effects?: CardAutomationSetupPromptEffect[];
    }
  | { kind: "failure"; message: string };

export interface UseCardAutomationSetupPromptInput {
  sheetData: SheetData;
  onSaveAbility: CardAutomationSetupDialogProps["onSaveAbility"];
}

function isCardAutomationSetupAvailableEffect(
  effect: CardAutomationSetupPromptEffect,
): effect is CardAutomationSetupAvailableEffect {
  return (
    effect.kind === "cardAutomationSetupAvailable" &&
    typeof effect.cardInstanceId === "string"
  );
}

function sheetContainsCardInstance(
  sheetData: SheetData,
  cardInstanceId: string,
) {
  return [
    ...(sheetData.cards ?? []),
    ...(sheetData.inventory_cards ?? []),
  ].some((card) => card?.instanceId === cardInstanceId);
}

export function useCardAutomationSetupPrompt({
  sheetData,
  onSaveAbility,
}: UseCardAutomationSetupPromptInput) {
  const [cardInstanceId, setCardInstanceId] = useState<string | null>(null);
  const [pendingCardInstanceId, setPendingCardInstanceId] = useState<{
    cardInstanceId: string;
    observedSheetData: SheetData;
  } | null>(null);

  const openForCard = useCallback(
    (nextCardInstanceId: string) => {
      const requirements = projectCardAutomationSetupRequirements(sheetData, {
        cardInstanceId: nextCardInstanceId,
      });

      if (requirements.length > 0) {
        setCardInstanceId(nextCardInstanceId);
      }
    },
    [sheetData],
  );

  useEffect(() => {
    if (!pendingCardInstanceId) return;
    if (pendingCardInstanceId.observedSheetData === sheetData) return;
    if (
      !sheetContainsCardInstance(
        sheetData,
        pendingCardInstanceId.cardInstanceId,
      )
    ) {
      return;
    }

    const requirements = projectCardAutomationSetupRequirements(sheetData, {
      cardInstanceId: pendingCardInstanceId.cardInstanceId,
    });

    if (requirements.length > 0) {
      setCardInstanceId(pendingCardInstanceId.cardInstanceId);
    }
    setPendingCardInstanceId(null);
  }, [pendingCardInstanceId, sheetData]);

  const handleSelectionResult = useCallback(
    (result: CardAutomationSetupPromptSelectionResult) => {
      if (result.kind === "failure") return;

      const setupEffect = result.effects?.find(
        isCardAutomationSetupAvailableEffect,
      );

      if (setupEffect) {
        setCardInstanceId(setupEffect.cardInstanceId);
        setPendingCardInstanceId(null);
        return;
      }

      if (result.cardInstanceId) {
        setPendingCardInstanceId({
          cardInstanceId: result.cardInstanceId,
          observedSheetData: sheetData,
        });
      }
    },
    [sheetData],
  );

  const dialog = (
    <CardAutomationSetupDialog
      open={Boolean(cardInstanceId)}
      sheetData={sheetData}
      cardInstanceId={cardInstanceId}
      onOpenChange={(open) => {
        if (!open) {
          setCardInstanceId(null);
        }
      }}
      onSaveAbility={onSaveAbility}
    />
  );

  return {
    openForCard,
    handleSelectionResult,
    dialog,
  };
}
