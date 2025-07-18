/**
 * Predefined Field Functions
 * Provides access to card names and variant types for validation and UI
 */

import { useUnifiedCardStore } from './stores/unified-card-store';
import { type CustomFieldsForBatch, type VariantTypesForBatch, type CustomFieldNamesStore } from './stores/unified-card-store';

// Helper function to merge custom fields
function mergeCustomFields(tempBatchId?: string, tempDefinitions?: CustomFieldsForBatch): CustomFieldNamesStore {
  const store = useUnifiedCardStore.getState();
  const existing = store.getAggregatedCustomFields();
  
  if (!tempDefinitions) {
    return existing;
  }
  
  const merged: CustomFieldNamesStore = { ...existing };
  
  for (const [category, names] of Object.entries(tempDefinitions)) {
    if (Array.isArray(names)) {
      if (!merged[category]) {
        merged[category] = [];
      }
      merged[category] = [...new Set([...merged[category], ...names])];
    }
  }
  
  return merged;
}

// Helper function to merge variant types
function mergeVariantTypes(tempBatchId?: string, tempDefinitions?: VariantTypesForBatch): VariantTypesForBatch {
  const store = useUnifiedCardStore.getState();
  const existing = store.getAggregatedVariantTypes();
  
  if (!tempDefinitions) {
    return existing;
  }
  
  return { ...existing, ...tempDefinitions };
}

// Card name getter functions
export function getProfessionCardNames(tempBatchId?: string, tempDefinitions?: CustomFieldsForBatch): string[] {
  const aggregatedCustomFields = mergeCustomFields(tempBatchId, tempDefinitions);
  const customNames = aggregatedCustomFields.professions || [];
  return [...new Set([...customNames])];
}

export function getAncestryCardNames(tempBatchId?: string, tempDefinitions?: CustomFieldsForBatch): string[] {
  const aggregatedCustomFields = mergeCustomFields(tempBatchId, tempDefinitions);
  const customNames = aggregatedCustomFields.ancestries || [];
  return [...new Set([...customNames])];
}

export function getCommunityCardNames(tempBatchId?: string, tempDefinitions?: CustomFieldsForBatch): string[] {
  const aggregatedCustomFields = mergeCustomFields(tempBatchId, tempDefinitions);
  const customNames = aggregatedCustomFields.communities || [];
  return [...new Set([...customNames])];
}

export function getSubClassCardNames(tempBatchId?: string, tempDefinitions?: CustomFieldsForBatch): string[] {
  // Subclass names are derived from profession names
  return getProfessionCardNames(tempBatchId, tempDefinitions);
}

export function getDomainCardNames(tempBatchId?: string, tempDefinitions?: CustomFieldsForBatch): string[] {
  const aggregatedCustomFields = mergeCustomFields(tempBatchId, tempDefinitions);
  const customNames = aggregatedCustomFields.domains || [];
  return [...new Set([...customNames])];
}

// Variant type functions
export function getVariantTypes(tempBatchId?: string, tempDefinitions?: VariantTypesForBatch): Record<string, any> {
  return mergeVariantTypes(tempBatchId, tempDefinitions);
}

export function getVariantSubclasses(variantType: string, tempBatchId?: string, tempDefinitions?: VariantTypesForBatch): string[] {
  const aggregatedTypes = mergeVariantTypes(tempBatchId, tempDefinitions);
  const typeDef = aggregatedTypes[variantType];
  return typeDef?.subclasses || [];
}

export function getVariantTypeNames(tempBatchId?: string, tempDefinitions?: VariantTypesForBatch): string[] {
  const aggregatedTypes = mergeVariantTypes(tempBatchId, tempDefinitions);
  return Object.keys(aggregatedTypes);
}

export function hasVariantType(variantType: string, tempBatchId?: string, tempDefinitions?: VariantTypesForBatch): boolean {
  const aggregatedTypes = mergeVariantTypes(tempBatchId, tempDefinitions);
  return variantType in aggregatedTypes;
}

export function getVariantTypeName(variantType: string, _tempBatchId?: string, _tempDefinitions?: VariantTypesForBatch): string {
  // Use variantType directly as display name
  return variantType;
}