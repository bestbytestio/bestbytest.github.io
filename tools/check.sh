#!/bin/sh
# Runs every site check. Exit 0 only if all pass.
# Usage: sh tools/check.sh   (or npm run check), from anywhere.
# Needs the dev dependencies: run `npm install` in site/ once.
cd "$(dirname "$0")/.." || exit 2

if [ ! -d node_modules ]; then
  echo "site checks: node_modules is missing; run 'npm install' in site/ first" >&2
  exit 2
fi

status=0
run() {
  label=$1; shift
  if output=$("$@" 2>&1); then
    echo "  ok    $label"
  else
    echo "  FAIL  $label"
    echo "$output" | sed 's/^/        /'
    status=1
  fi
}

run 'stylelint (tokens, logical properties, block rules)' npx --no-install stylelint 'css/**/*.css'
run 'cube-check (layers, imports, block headers and APIs, classes)' node tools/cube-check.mjs
run 'contrast (WCAG pairs, light and dark)' node tools/contrast.mjs
run 'html-validate' npx --no-install html-validate index.html
run 'axe (accessibility)' node tools/axe.mjs index.html

exit $status
