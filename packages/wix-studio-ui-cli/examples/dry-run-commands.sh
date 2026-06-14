#!/usr/bin/env bash
set -euo pipefail
node bin/wix-studio-ui-cli.mjs inspect --dry-run
node bin/wix-studio-ui-cli.mjs snapshot --dry-run --out evidence/example.png
node bin/wix-studio-ui-cli.mjs element-map --dry-run --out evidence/element-map.json
node bin/wix-studio-ui-cli.mjs click-by-label --dry-run --label Preview
node bin/wix-studio-ui-cli.mjs text-edit --dry-run --label 'Heading' --text 'New headline'
node bin/wix-studio-ui-cli.mjs responsive-mode --dry-run --mode mobile
node bin/wix-studio-ui-cli.mjs save-state-detect --dry-run
node bin/wix-studio-ui-cli.mjs verification --dry-run
