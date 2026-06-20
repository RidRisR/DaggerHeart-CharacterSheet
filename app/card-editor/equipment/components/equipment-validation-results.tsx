import type { EquipmentPackApplicationImportResult } from "@/equipment/packs/application-service";
import { EditorValidationResults } from "../../components/editor-validation-results";
import {
  createEquipmentEditorValidationViewModel,
  type EquipmentValidationJumpTarget,
} from "../equipment-validation";

interface EquipmentValidationResultsProps {
  validationResult: EquipmentPackApplicationImportResult | null;
  open: boolean;
  onClose(): void;
  onJumpToTarget?(target: EquipmentValidationJumpTarget): void;
}

export function EquipmentValidationResults({
  validationResult,
  open,
  onClose,
  onJumpToTarget,
}: EquipmentValidationResultsProps) {
  const viewModel = validationResult
    ? createEquipmentEditorValidationViewModel(validationResult)
    : null;

  return (
    <EditorValidationResults
      viewModel={viewModel}
      open={open}
      onClose={onClose}
      onJumpToTarget={onJumpToTarget}
    />
  );
}
