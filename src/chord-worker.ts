// Web Worker: chord spelling computation (runs off main thread)

type ChordData = {
  initials?: Record<string, string>;
  vowels?: Record<string, string>;
  finals?: Record<string, string>;
  suffix?: Record<string, string>;
  suffixes?: Record<string, string>;
};

type Strokes = [string, string, string, string];

function isLiteral(s: string): boolean {
  if (!s) return true;
  return !s.includes("{") && !s.includes("}") && !s.includes("|");
}

function literalPart(s: string): string {
  return isLiteral(s) ? s : "";
}

function buildComponents(data: ChordData): [string, string][][] {
  const withEmpty = (m: Record<string, string> | undefined): [string, string][] => {
    const items = Object.entries(m ?? {});
    if (!items.some(([k]) => k === "")) items.unshift(["", ""]);
    return items;
  };
  const suffixMap = data.suffix && Object.keys(data.suffix).length ? data.suffix : data.suffixes;
  let suffixes = Object.entries(suffixMap ?? {});
  if (!suffixes.some(([k]) => k === "")) suffixes = [["", ""], ...suffixes];
  return [
    withEmpty(data.initials),
    withEmpty(data.vowels),
    withEmpty(data.finals),
    suffixes,
  ];
}

function* allChordOutputs(
  components: [string, string][][]
): Generator<[string, Strokes]> {
  const [initials, vowels, finals, suffixes] = components;
  for (const [iStroke, iVal] of initials) {
    for (const [vStroke, vVal] of vowels) {
      for (const [fStroke, fVal] of finals) {
        for (const [sStroke, sVal] of suffixes) {
          const out =
            literalPart(iVal) +
            literalPart(vVal) +
            literalPart(fVal) +
            literalPart(sVal);
          yield [out, [iStroke, vStroke, fStroke, sStroke]];
        }
      }
    }
  }
}

function chordRepr(strokes: Strokes): string {
  const [i, v, f, s] = strokes;
  const fDisplay =
    f && f.startsWith("-") && !i && !v ? f : f?.startsWith("-") ? f.slice(1) : f;
  const raw = [i, v, fDisplay, s].join("") || "∅";
  return raw.replace(/\|/g, "&");
}

/** Chords whose output is a prefix of target, longest first (on-demand, no full list). */
function getPrefixChords(
  target: string,
  components: [string, string][][]
): [string, Strokes][] {
  const list: [string, Strokes][] = [];
  for (const [out, strokes] of allChordOutputs(components)) {
    if (out && target.startsWith(out)) list.push([out, strokes]);
  }
  list.sort(([a], [b]) => b.length - a.length);
  return list;
}

function* findSpellingsGenerator(
  target: string,
  components: [string, string][][],
  memo: Record<string, [string, Strokes][][]> = {}
): Generator<[string, Strokes][]> {
  if (target === "") {
    memo[""] = [[]];
    yield [];
    return;
  }
  if (target in memo) {
    for (const way of memo[target]) yield way;
    return;
  }
  const chordList = getPrefixChords(target, components);
  const ways: [string, Strokes][][] = [];
  for (const [out, strokes] of chordList) {
    const rest = target.slice(out.length);
    for (const restWay of findSpellingsGenerator(rest, components, memo)) {
      const way: [string, Strokes][] = [[out, strokes], ...restWay];
      ways.push(way);
      yield way;
    }
  }
  memo[target] = ways;
}

const YIELD_EVERY = 5;

let currentJobId: number | null = null;
let jobRunning = false;
let pendingJob: { id: number; version: string; target: string; maxEntries?: number } | null = null;

const cache: Record<string, ChordData> = {};

async function startJob(
  id: number,
  version: string,
  target: string,
  maxEntries?: number
): Promise<void> {
  let data = cache[version];
  if (!data) {
    const res = await fetch(`../chord-versions/pinchord-chords-${version}.json`);
    if (!res.ok) throw new Error(`Failed to load ${version}`);
    data = (await res.json()) as ChordData;
    cache[version] = data;
  }
  runJob(id, data, target, maxEntries, (display, ways) => {
    if (currentJobId === id) self.postMessage({ type: "chunk", id, spellings: display, ways });
  });
}

function runJob(
  id: number,
  data: ChordData,
  target: string,
  maxEntries: number | undefined,
  onChunk: (display: string[], ways: Strokes[][]) => void
): void {
  jobRunning = true;
  (async () => {
    try {
      const components = buildComponents(data);
      const memo: Record<string, [string, Strokes][][]> = {};
      let total = 0;
      const gen = findSpellingsGenerator(target, components, memo);
      let generatorDone = false;
      while (true) {
        const batch: [string, Strokes][][] = [];
        for (let i = 0; i < YIELD_EVERY; i++) {
          if (maxEntries !== undefined && total >= maxEntries) break;
          const { value, done } = gen.next();
          if (done) {
            generatorDone = true;
            break;
          }
          batch.push(value);
          total++;
        }
        for (const way of batch) {
          const display = way.map(([, s]) => chordRepr(s)).join(" / ");
          const strokes = way.map(([, s]) => s);
          onChunk([display], [strokes]);
        }
        if (generatorDone || (maxEntries !== undefined && total >= maxEntries)) {
          if (currentJobId === id) self.postMessage({ type: "resultDone", id, total });
          return;
        }
        await new Promise((r) => setTimeout(r, 0));
        if (currentJobId !== id) {
          const next = pendingJob;
          pendingJob = null;
          if (next) startJob(next.id, next.version, next.target, next.maxEntries);
          return;
        }
      }
    } finally {
      jobRunning = false;
    }
  })().catch((err) => {
    jobRunning = false;
    if (currentJobId === id) {
      self.postMessage({
        type: "error",
        id,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  });
}

self.onmessage = (e: MessageEvent<{ type: string; id: number; version: string; target: string; maxEntries?: number }>) => {
  const { type, id, version, target, maxEntries } = e.data;
  if (type !== "compute") return;
  currentJobId = id;
  pendingJob = { id, version, target, maxEntries };
  if (!jobRunning) {
    pendingJob = null;
    startJob(id, version, target, maxEntries).catch((err) => {
      currentJobId = null;
      self.postMessage({
        type: "error",
        id,
        message: err instanceof Error ? err.message : String(err),
      });
    });
  }
};
