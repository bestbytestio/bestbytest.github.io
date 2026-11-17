// Structural CUBE CSS checks that stylelint cannot express.
// Usage: node tools/cube-check.mjs   (from site/; exit 1 on any failure)
//
// 1. main.css declares the layers in the fixed order.
// 2. Every stylesheet under css/ is imported by main.css; every import except
//    tokens.css names a layer; every block file goes in layer(blocks).
// 3. Every block file opens with a header comment that lists its custom
//    properties and its exceptions.
// 4. A block's API is the set of custom properties it reads with a fallback,
//    var(--name, default). Each must start with the block's name, and the
//    header must document exactly that set (no stale, no missing entries).
// 5. Every class used in index.html is defined in some stylesheet.
import { readFileSync, readdirSync } from 'node:fs';
import { basename, join } from 'node:path';

const LAYERS = ['reset', 'globals', 'compositions', 'utilities', 'blocks', 'exceptions'];
const errors = [];
const fail = (msg) => errors.push(msg);
const read = (p) => readFileSync(p, 'utf8');

const main = read('css/main.css');

// 1. Layer order.
const layerStatement = main.match(/@layer\s+([^;{]+);/);
const declared = layerStatement ? layerStatement[1].split(',').map((s) => s.trim()) : [];
if (declared.join() !== LAYERS.join()) {
  fail(`css/main.css: @layer order is "${declared.join(', ')}"; expected "${LAYERS.join(', ')}"`);
}

// 2. Imports.
const imports = new Map(
  [...main.matchAll(/@import\s+url\(['"]?([^'")]+)['"]?\)\s*(?:layer\((\w+)\))?\s*;/g)].map(([, path, layer]) => [path, layer]),
);
const sheets = [
  ...readdirSync('css').filter((f) => f.endsWith('.css') && f !== 'main.css'),
  ...readdirSync('css/blocks').filter((f) => f.endsWith('.css')).map((f) => `blocks/${f}`),
];
for (const sheet of sheets) {
  if (!imports.has(sheet)) {
    fail(`css/${sheet}: not imported by css/main.css`);
    continue;
  }
  const layer = imports.get(sheet);
  if (sheet === 'tokens.css') {
    if (layer) fail(`css/main.css: tokens.css is imported into layer(${layer}); tokens stay unlayered`);
  } else if (!layer) {
    fail(`css/main.css: ${sheet} is imported without a layer`);
  } else if (!LAYERS.includes(layer)) {
    fail(`css/main.css: ${sheet} is imported into unknown layer(${layer})`);
  } else if (sheet.startsWith('blocks/') && layer !== 'blocks') {
    fail(`css/main.css: ${sheet} is imported into layer(${layer}); block files go in layer(blocks)`);
  }
}
for (const path of imports.keys()) {
  if (!sheets.includes(path)) fail(`css/main.css: imports ${path}, which does not exist`);
}

// 3 and 4. Block headers and APIs.
for (const file of readdirSync('css/blocks').filter((f) => f.endsWith('.css'))) {
  const path = join('css/blocks', file);
  const name = basename(file, '.css');
  const css = read(path);
  const header = css.match(/^\s*\/\*([\s\S]*?)\*\//);
  if (!header) {
    fail(`${path}: no header comment; open the file with its purpose, custom properties and exceptions`);
    continue;
  }
  const text = header[1];
  if (!/Exceptions:/.test(text)) fail(`${path}: header has no "Exceptions:" line (write "Exceptions: none." if there are none)`);

  const body = css.slice(header[0].length).replace(/\/\*[\s\S]*?\*\//g, '');
  const api = new Set([...body.matchAll(/var\(\s*--([\w-]+)\s*,/g)].map(([, p]) => p));
  const documented = new Set([...text.matchAll(/^\s*--([\w-]+)\s+default\b/gm)].map(([, p]) => p));

  if (api.size && !/Custom properties/.test(text)) fail(`${path}: header has no "Custom properties" section`);
  for (const prop of api) {
    if (!prop.startsWith(`${name}-`)) {
      fail(`${path}: reads var(--${prop}, …); a block's own properties start with --${name}- (set a composition's properties, don't read them with a fallback)`);
    }
    if (!documented.has(prop)) fail(`${path}: --${prop} is read but not documented in the header`);
  }
  for (const prop of documented) {
    if (!api.has(prop)) fail(`${path}: header documents --${prop}, which the block never reads`);
  }
}

// 5. Classes used in the HTML exist in the CSS.
const allCss = ['main.css', ...sheets].map((s) => read(join('css', s))).join('\n').replace(/\/\*[\s\S]*?\*\//g, '');
const defined = new Set([...allCss.matchAll(/\.(-?[a-z_][\w-]*)/gi)].map(([, c]) => c));
const html = read('index.html').replace(/<!--[\s\S]*?-->/g, '');
for (const [, list] of html.matchAll(/\sclass="([^"]*)"/g)) {
  for (const cls of list.split(/\s+/).filter(Boolean)) {
    if (!defined.has(cls)) fail(`index.html: class "${cls}" is not defined in any stylesheet`);
  }
}

for (const e of errors) console.log(`  fail  ${e}`);
console.log(errors.length ? `cube-check: ${errors.length} problem(s)` : 'cube-check: ok');
process.exit(errors.length ? 1 : 0);
