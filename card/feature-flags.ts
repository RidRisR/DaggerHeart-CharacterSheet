/**
 * Feature Flags for Card System Migration
 * Controls the rollout of the new unified card system
 */

// Feature flag configuration
interface FeatureFlags {
  useUnifiedCardSystem: boolean;
  enableUnifiedCardDebug: boolean;
  enableUnifiedCardMetrics: boolean;
}

// Default feature flag values
const DEFAULT_FLAGS: FeatureFlags = {
  useUnifiedCardSystem: true, // Default to unified system (legacy available as fallback)
  enableUnifiedCardDebug: false,
  enableUnifiedCardMetrics: false,
};

/**
 * Get feature flag from environment variables or localStorage
 */
function getFeatureFlag(key: keyof FeatureFlags): boolean {
  // Check environment variable first
  const envKey = `NEXT_PUBLIC_${key.toUpperCase()}`;
  const envValue = process.env[envKey];
  if (envValue !== undefined) {
    return envValue === 'true';
  }
  
  // Check localStorage for client-side override
  if (typeof window !== 'undefined') {
    const localValue = localStorage.getItem(`feature_flag_${key}`);
    if (localValue !== null) {
      return localValue === 'true';
    }
  }
  
  // Return default
  return DEFAULT_FLAGS[key];
}

/**
 * Set feature flag in localStorage (client-side only)
 */
export function setFeatureFlag(key: keyof FeatureFlags, value: boolean): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(`feature_flag_${key}`, value.toString());
    console.log(`[Feature Flags] Set ${key} = ${value}`);
    
    // If changing the main flag, suggest page reload
    if (key === 'useUnifiedCardSystem') {
      console.log('[Feature Flags] ⚠️  Main card system flag changed. Please reload the page for changes to take effect.');
    }
  }
}

/**
 * Get all current feature flag values
 */
export function getFeatureFlags(): FeatureFlags {
  return {
    useUnifiedCardSystem: getFeatureFlag('useUnifiedCardSystem'),
    enableUnifiedCardDebug: getFeatureFlag('enableUnifiedCardDebug'),
    enableUnifiedCardMetrics: getFeatureFlag('enableUnifiedCardMetrics'),
  };
}

/**
 * Enable unified card system for testing
 */
export function enableUnifiedCardSystem(): void {
  setFeatureFlag('useUnifiedCardSystem', true);
}

/**
 * Disable unified card system (fallback to legacy)
 */
export function disableUnifiedCardSystem(): void {
  setFeatureFlag('useUnifiedCardSystem', false);
}

/**
 * Enable debug logging for unified card system
 */
export function enableUnifiedCardDebug(): void {
  setFeatureFlag('enableUnifiedCardDebug', true);
}

/**
 * Main feature flag check - should we use unified card system?
 */
export function shouldUseUnifiedCardSystem(): boolean {
  const flags = getFeatureFlags();
  
  // Log the decision if debug is enabled
  if (flags.enableUnifiedCardDebug) {
    console.log('[Feature Flags] Unified Card System:', flags.useUnifiedCardSystem ? 'ENABLED' : 'DISABLED');
  }
  
  return flags.useUnifiedCardSystem;
}

/**
 * Developer utilities for testing (global functions)
 */
if (typeof window !== 'undefined') {
  // Add global functions for easy testing in browser console
  (window as any).cardSystemFlags = {
    enable: enableUnifiedCardSystem,
    disable: disableUnifiedCardSystem,
    enableDebug: enableUnifiedCardDebug,
    status: () => {
      const flags = getFeatureFlags();
      console.table(flags);
      return flags;
    },
    help: () => {
      console.log(`
Card System Feature Flags:

🚀 Enable unified system:  cardSystemFlags.enable() (default)
🔙 Disable unified system: cardSystemFlags.disable() (fallback to legacy)
🐛 Enable debug logging:   cardSystemFlags.enableDebug()
📊 Check current status:   cardSystemFlags.status()

After changing the main flag, reload the page to see changes.
      `);
    }
  };
  
  // Show help on initial load if debug is enabled
  if (getFeatureFlag('enableUnifiedCardDebug')) {
    console.log('[Feature Flags] Card system debug mode enabled. Type cardSystemFlags.help() for commands.');
  }
}

// Export current flag state for build-time decisions
export const UNIFIED_CARD_SYSTEM_ENABLED = shouldUseUnifiedCardSystem();