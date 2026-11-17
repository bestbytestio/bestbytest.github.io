// Runs axe-core over an HTML file under jsdom; color-contrast is off (tools/contrast.mjs checks the token pairs).
// Usage: node tools/axe.mjs path/to/index.html   (exit 1 on any violation)
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const file = process.argv[2];
if (!file) {
  console.error('usage: node axe.mjs <file.html>');
  process.exit(2);
}
const dom = new JSDOM(readFileSync(file, 'utf8'), { runScripts: 'outside-only', pretendToBeVisual: true });
dom.window.eval(readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8'));
const results = await dom.window.axe.run(dom.window.document, {
  rules: { 'color-contrast': { enabled: false } },
});
for (const v of results.violations) {
  console.log(`${v.impact} ${v.id}: ${v.help}`);
  for (const n of v.nodes) console.log(`  ${n.target.join(' ')}`);
}
console.log(`axe: ${results.violations.length} violations, ${results.passes.length} rules passed, ${results.incomplete.length} incomplete`);
process.exit(results.violations.length ? 1 : 0);
