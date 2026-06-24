import "@testing-library/jest-dom/vitest";

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CardAutomationSetupMarker } from "../card-automation-setup-marker";

describe("CardAutomationSetupMarker", () => {
  it("renders an accessible setup button and calls onClick", () => {
    const onClick = vi.fn();

    render(
      <CardAutomationSetupMarker cardName="Setup Card" onClick={onClick} />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "配置 Setup Card 的卡牌自动化",
      }),
    );

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("stops click propagation", () => {
    const onClick = vi.fn();
    const onParentClick = vi.fn();

    render(
      <div onClick={onParentClick}>
        <CardAutomationSetupMarker cardName="Setup Card" onClick={onClick} />
      </div>,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "配置 Setup Card 的卡牌自动化",
      }),
    );

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onParentClick).not.toHaveBeenCalled();
  });
});
