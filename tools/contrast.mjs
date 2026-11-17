#!/usr/bin/env node
// Checks WCAG 2.x contrast for the colour pairs the site uses, in both schemes.
// Reads raw `--palette-*: #hex` tokens and role tokens
// `--color-*: light-dark(var(--palette-a), var(--palette-b))` from tokens.css.
// Usage: node site/tools/contrast.mjs [path/to/tokens.css]   (exit 1 on any failure)

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const BODY = 4.5; // WCAG 1.4.3, normal text
const LARGE = 3; // WCAG 1.4.3 large text, 1.4.11 non-text UI

// [foreground role, background role, minimum ratio, what the pair is for]
const PAIRS = [
  ['ink', 'paper', BODY, 'body text'],
  ['ink', 'paper-shade', BODY, 'body text on shaded panel'],
  ['ink-muted', 'paper', BODY, 'secondary text'],
  ['ink-faint', 'paper', BODY, 'fine print'],
  ['ink-muted', 'paper-shade', BODY, 'secondary text on shaded panel'],
  ['check-green', 'paper', BODY, 'links and green text'],
  ['check-green', 'paper-shade', BODY, 'links on shaded panel'],
  ['accent', 'paper', BODY, 'accent text'],
  ['on-check-green', 'check-green', BODY, 'text on green fill'],
  ['success', 'paper', BODY, 'success message'],
  ['warning', 'paper', BODY, 'warning message'],
  ['danger', 'paper', BODY, 'danger message'],
  ['accent', 'paper-shade', LARGE, 'accent display text on shaded panel'],
  ['focus', 'paper', LARGE, 'focus ring'],
  ['focus', 'paper-shade', LARGE, 'focus ring on shaded panel'],
  ['check-green', 'paper', LARGE, 'mark and UI strokes'],
  ['on-highlight', 'highlight', LARGE, 'hero highlight: near-black display text on red'],
  ['ink', 'tint', BODY, 'text on green-tint panel (theme switch track when on)'],
  ['check-green', 'tint', BODY, 'links on green-tint panel'],
];

const fail = (msg) => {
  console.error(`contrast: ${msg}`);
  process.exit(2);
};

const path = process.argv[2] ?? fileURLToPath(new URL('../css/tokens.css', import.meta.url));
let source;
try {
  source = readFileSync(path, 'utf8');
} catch (err) {
  fail(`cannot read ${path} (${err.code}); pass the tokens file as the first argument`);
}
const css = source.replace(/\/\*[\s\S]*?\*\//g, '');

const palette = new Map(
  [...css.matchAll(/--palette-([\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)].map(([, n, hex]) => [n, hex]),
);
const roles = new Map(
  [...css.matchAll(/--color-([\w-]+):\s*light-dark\(\s*var\(--palette-([\w-]+)\)\s*,\s*var\(--palette-([\w-]+)\)\s*\)\s*;/g)]
    .map(([, role, light, dark]) => [role, { light, dark }]),
);

const hexOf = (role, scheme) => {
  const entry = roles.get(role);
  if (!entry) fail(`${path}: no "--color-${role}: light-dark(var(--palette-…), var(--palette-…))" token`);
  const hex = palette.get(entry[scheme]);
  if (!hex) fail(`${path}: --color-${role} uses --palette-${entry[scheme]}, which is not a 6-digit hex token`);
  return hex;
};

const luminance = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const ratio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

let failures = 0;
for (const scheme of ['light', 'dark']) {
  console.log(`${scheme}:`);
  for (const [fg, bg, min, use] of PAIRS) {
    const [f, b] = [hexOf(fg, scheme), hexOf(bg, scheme)];
    const r = ratio(f, b);
    const ok = r >= min;
    if (!ok) failures++;
    console.log(`  ${ok ? 'pass' : 'FAIL'} ${r.toFixed(2).padStart(5)}:1 >= ${min}  ${fg} ${f} on ${bg} ${b}  (${use})`);
  }
}
console.log(failures ? `${failures} pair(s) below minimum` : 'all pairs pass');
process.exit(failures ? 1 : 0);
