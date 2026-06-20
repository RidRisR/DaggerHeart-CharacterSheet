import type { CardValidationJumpTarget } from "../services/card-editor-validation";
import type { EditorValidationViewModel } from "../services/editor-validation-view-model";
import type { CardType } from "../types";
import { EditorValidationResults } from "./editor-validation-results";

interface ValidationResultsProps {
  validationResult: EditorValidationViewModel<CardValidationJumpTarget> | null;
  open: boolean;
  onClose(): void;
  onJumpToCard?: (cardType: CardType, cardIndex: number) => void;
  onJumpToMetadata?: () => void;
}

export function ValidationResults({
  validationResult,
  open,
  onClose,
  onJumpToCard,
  onJumpToMetadata,
}: ValidationResultsProps) {
  return (
    <EditorValidationResults
      viewModel={validationResult}
      open={open}
      onClose={onClose}
      onJumpToTarget={
        onJumpToCard || onJumpToMetadata
          ? (target) => {
              if (target.tab === "metadata") {
                onJumpToMetadata?.();
                return;
              }

              onJumpToCard?.(target.tab, target.index);
            }
          : undefined
      }
    />
  );
}
