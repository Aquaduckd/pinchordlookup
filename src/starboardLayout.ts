/**
 * Maps Javelin/Starboard steno key codes to display letters for the layout visual.
 * Covers v24.1 and similar layouts.
 */
const STENO_CODE_TO_LETTER: Record<string, string> = {
  stenoNum1: "#",
  stenoS2: "S",
  stenoKL: "K",
  stenoWL: "W",
  stenoRL: "R",
  stenoO: "O",
  stenoRR: "R",
  stenoPR: "P",
  stenoLR: "L",
  stenoTR: "T",
  stenoDR: "D",
  stenoCaret: "^",
  stenoTL: "T",
  stenoPL: "P",
  stenoHL: "H",
  stenoA: "A",
  stenoBR: "B",
  stenoGR: "G",
  stenoSR: "S",
  stenoZR: "Z",
  stenoStar1: "*",
  stenoE: "E",
  stenoU: "U",
  stenoFR: "F",
};

interface JavelinKeySlot {
  t: string;
  d?: { a?: { t: string; c?: string } };
}

interface JavelinLayer {
  keys: JavelinKeySlot[][];
}

interface JavelinLayout {
  layers: JavelinLayer[];
}

function getCodeFromSlot(slot: JavelinKeySlot[]): string | null {
  for (const entry of slot) {
    const code = entry.d?.a?.c;
    if (code && typeof code === "string") return code;
  }
  return null;
}

/**
 * Extract up to 24 key labels from a Starboard/Javelin layout JSON (Default layer).
 * Each label is the display letter for that key position.
 */
export function keyLabelsFromLayoutJson(layout: JavelinLayout): string[] {
  const keys = layout?.layers?.[0]?.keys;
  if (!Array.isArray(keys)) return [];
  const labels: string[] = [];
  for (let i = 0; i < 24 && i < keys.length; i++) {
    const code = getCodeFromSlot(keys[i]);
    const letter = code ? (STENO_CODE_TO_LETTER[code] ?? code.replace(/^steno/, "").slice(0, 2)) : "";
    labels.push(letter || String(i + 1));
  }
  return labels;
}

/**
 * Fetch a layout file and return 24 key labels for the layout visual.
 */
export async function fetchKeyLabels(layoutUrl: string): Promise<string[]> {
  const res = await fetch(layoutUrl);
  if (!res.ok) return [];
  const layout = (await res.json()) as JavelinLayout;
  return keyLabelsFromLayoutJson(layout);
}
