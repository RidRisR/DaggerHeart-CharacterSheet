"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface CardAutomationSetupMarkerProps {
  cardName: string;
  onClick: () => void;
}

export function CardAutomationSetupMarker({
  cardName,
  onClick,
}: CardAutomationSetupMarkerProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-7 w-7 text-amber-600 hover:text-amber-700"
      aria-label={`配置 ${cardName} 的卡牌自动化`}
      title="需要配置卡牌自动化"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      <AlertTriangle aria-hidden="true" />
    </Button>
  );
}
