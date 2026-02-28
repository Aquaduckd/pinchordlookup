/**
 * Key names from the javelin system YAML "keys:" section (in order, skip "-").
 * v24.1: first 24 for the layout visual; index i = display index i+1 (straight zip).
 */
const KEY_NAMES_V24_1 = [
  "_", "#", "+", "T", "S", "P", "W", "H", "R", "&",
  "A", "O", "I", "U", "^", "L", "R", "P", "K", "F", "S", "T", "*", "E",
];

/**
 * Returns 24 key labels for the layout visual: key name at index i is for display index i+1 (straight zip).
 */
export function getLayoutKeyLabels(keyNames: string[]): string[] {
  return keyNames.slice(0, 24);
}

/**
 * Default key names (v24.1) for the layout visual.
 */
export function getDefaultLayoutKeyLabels(): string[] {
  return KEY_NAMES_V24_1.slice(0, 24);
}
