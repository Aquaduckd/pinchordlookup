#!/usr/bin/env node
/**
 * Extract key order (keys section, name field, skip "-") from each
 * javelin-system YAML in ../../javelin-system-versions/ and write
 * key-orders.json (version -> array of up to 24 key names).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VERSIONS_DIR = path.join(__dirname, "../../javelin-system-versions");
const OUT_PATH = path.join(__dirname, "../key-orders.json");

function parseMask(value) {
  if (value == null) return 0;
  const s = String(value).trim();
  if (/^0x[0-9a-fA-F]+$/.test(s)) return parseInt(s, 16);
  return parseInt(s, 10) || 0;
}

function extractKeyNames(yamlContent) {
  const entries = [];
  let inKeys = false;
  const lines = yamlContent.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*keys\s*:/.test(line)) {
      inKeys = true;
      continue;
    }
    if (inKeys && /^\s*(undo|layout)\s*:/.test(line)) break;
    if (!inKeys) continue;
    const nameM = line.match(/^\s*-\s*name:\s*["']([^"']*)["']/);
    if (nameM) {
      const name = nameM[1];
      let mask = 0;
      const nextLine = lines[i + 1];
      const maskM = nextLine && nextLine.match(/\smask:\s*(.+)/);
      if (maskM) mask = parseMask(maskM[1]);
      entries.push({ name, mask });
    }
  }
  entries.sort((a, b) => a.mask - b.mask);
  return entries
    .filter((e) => e.name !== "-")
    .slice(0, 24)
    .map((e) => e.name);
}

function versionFromFilename(filename) {
  const base = path.basename(filename, ".yaml");
  return base.replace(/^pinchord-javelin-system-/, "");
}

const entries = fs.readdirSync(VERSIONS_DIR)
  .filter((f) => f.endsWith(".yaml") && f.startsWith("pinchord-javelin-system-"))
  .map((f) => {
    const content = fs.readFileSync(path.join(VERSIONS_DIR, f), "utf8");
    const version = versionFromFilename(f);
    const keys = extractKeyNames(content);
    return [version, keys];
  });

const out = Object.fromEntries(entries);
fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2), "utf8");
console.log("Wrote", OUT_PATH, "with versions:", Object.keys(out).sort().join(", "));
