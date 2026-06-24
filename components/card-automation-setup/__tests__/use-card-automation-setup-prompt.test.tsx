import "@testing-library/jest-dom/vitest";

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { CardAutomationIR } from "@/card/automation/ir-types";
import { makeSheet } from "@/card/automation/__tests__/helpers";
import type { StandardCard } from "@/card/card-types";
import type { SheetData } from "@/lib/sheet-data";
import {
  useCardAutomationSetupPrompt,
  type CardAutomationSetupPromptSelectionResult,
} from "../use-card-automation-setup-prompt";

vi.mock("../card-automation-setup-dialog", () => ({
  CardAutomationSetupDialog: ({
    open,
    cardInstanceId,
  }: {
    open: boolean;
    cardInstanceId: string | null;
  }) =>
    open ? (
      <div role="dialog" aria-label="setup dialog">
        {cardInstanceId}
      </div>
    ) : null,
}));

const setupAutomation: CardAutomationIR = {
  format: "daggerheart.card-automation.ir.v1",
  revision: "stable32:prompt",
  abilities: [
    {
      id: "choose-mode",
      label: "Choose Mode",
      lifetime: { kind: "whileInLoadout" },
      choices: [
        {
          id: "mode",
          label: "Mode",
          kind: "selectOne",
          cardinality: { min: 1, max: 1, unique: true },
          domain: {
            kind: "staticOptions",
            options: [{ id: "a", label: "A" }],
          },
        },
      ],
      effects: [],
    },
  ],
};

function makeCard(instanceId: string): StandardCard {
  return {
    standarized: true,
    id: `template-${instanceId}`,
    instanceId,
    name: "Prompt Card",
    type: "domain",
    class: "Blade",
    cardSelectDisplay: {},
    automation: setupAutomation,
    automationState: { version: 1, abilities: {} },
  };
}

function sheetWithCard(cardInstanceId: string): SheetData {
  return makeSheet({ cards: [makeCard(cardInstanceId)] });
}

function PromptHarness({ sheetData }: { sheetData: SheetData }) {
  const { handleSelectionResult, dialog } = useCardAutomationSetupPrompt({
    sheetData,
    onSaveAbility: vi.fn(() => ({ kind: "success" as const })),
  });

  const selectionResultWithoutTopLevelId: CardAutomationSetupPromptSelectionResult =
    {
      kind: "success",
      effects: [
        {
          kind: "cardAutomationSetupAvailable",
          cardInstanceId: "cardinst_effect",
        },
      ],
    };
  const selectionResultWithoutEffect: CardAutomationSetupPromptSelectionResult =
    {
      kind: "success",
      cardInstanceId: "cardinst_pending",
      effects: [],
    };

  return (
    <>
      <button
        type="button"
        onClick={() => handleSelectionResult(selectionResultWithoutTopLevelId)}
      >
        effect result
      </button>
      <button
        type="button"
        onClick={() => handleSelectionResult(selectionResultWithoutEffect)}
      >
        fallback result
      </button>
      {dialog}
    </>
  );
}

describe("useCardAutomationSetupPrompt", () => {
  it("opens from the setup effect card instance id without a top-level card id", () => {
    render(<PromptHarness sheetData={sheetWithCard("cardinst_effect")} />);

    fireEvent.click(screen.getByRole("button", { name: "effect result" }));

    expect(
      screen.getByRole("dialog", { name: "setup dialog" }),
    ).toHaveTextContent("cardinst_effect");
  });

  it("keeps no-effect fallback pending through unrelated sheet updates", () => {
    const { rerender } = render(<PromptHarness sheetData={makeSheet()} />);

    fireEvent.click(screen.getByRole("button", { name: "fallback result" }));

    expect(
      screen.queryByRole("dialog", { name: "setup dialog" }),
    ).not.toBeInTheDocument();

    rerender(<PromptHarness sheetData={makeSheet({ name: "Intermediate" })} />);

    expect(
      screen.queryByRole("dialog", { name: "setup dialog" }),
    ).not.toBeInTheDocument();

    rerender(<PromptHarness sheetData={sheetWithCard("cardinst_pending")} />);

    expect(
      screen.getByRole("dialog", { name: "setup dialog" }),
    ).toHaveTextContent("cardinst_pending");
  });

  it("does not throw when pending fallback sees missing card arrays", () => {
    const { rerender } = render(<PromptHarness sheetData={makeSheet()} />);

    fireEvent.click(screen.getByRole("button", { name: "fallback result" }));

    expect(() => {
      rerender(
        <PromptHarness
          sheetData={
            {
              ...makeSheet({ name: "Partial" }),
              cards: undefined,
              inventory_cards: undefined,
            } as unknown as SheetData
          }
        />,
      );
    }).not.toThrow();

    expect(
      screen.queryByRole("dialog", { name: "setup dialog" }),
    ).not.toBeInTheDocument();
  });

  it("opens pending fallback when sheet card arrays contain sparse slots", () => {
    const { rerender } = render(<PromptHarness sheetData={makeSheet()} />);

    fireEvent.click(screen.getByRole("button", { name: "fallback result" }));

    expect(() => {
      rerender(
        <PromptHarness
          sheetData={
            makeSheet({
              cards: [
                undefined,
                makeCard("cardinst_pending"),
              ] as unknown as StandardCard[],
              inventory_cards: [undefined] as unknown as StandardCard[],
            })
          }
        />,
      );
    }).not.toThrow();

    expect(
      screen.getByRole("dialog", { name: "setup dialog" }),
    ).toHaveTextContent("cardinst_pending");
  });
});
