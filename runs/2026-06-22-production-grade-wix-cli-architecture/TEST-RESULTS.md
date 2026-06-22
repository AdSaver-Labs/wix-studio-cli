# Test Results — Production-Grade Wix CLI Architecture

## Local static / guardrail gates
Command:

```bash
npm run -s check && npm run -s smoke && npm run -s test:guardrails
```

Result: PASS

Evidence:
- `npm run -s check`: Node syntax checks passed for bin/src/test modules.
- `npm run -s smoke`: help + core dry-run commands passed.
- `npm run -s test:guardrails`: PASS smoke-guardrails.

## Post-fix verification
Command:

```bash
npm run -s check && npm run -s test:guardrails
```

Result: PASS

## Executable responsive audit proof
Command shape:

```bash
chromium --headless=new --disable-gpu --no-sandbox --remote-debugging-port=9333 about:blank
node bin/wix-studio-ui-cli.mjs responsive-audit \
  --execute \
  --cdp-url "$WS" \
  --url "file://$PWD/test/responsive-fixture.html" \
  --out evidence/responsive-fixture-proof
```

Initial result: FAIL_PHONE_PRIMARY — expected/correct, fixture had weak tap targets and clipped H1.

After fixture repair: PASS

Proof summary:

```json
{
  "status": "PASS",
  "captures": 4,
  "phoneBlockingIssues": 0
}
```

Generated proof artifacts:
- `packages/wix-studio-ui-cli/evidence/responsive-fixture-proof/responsive-audit.json`
- `packages/wix-studio-ui-cli/evidence/responsive-fixture-proof/desktop-1440x900.png`
- `packages/wix-studio-ui-cli/evidence/responsive-fixture-proof/tablet-768x1024.png`
- `packages/wix-studio-ui-cli/evidence/responsive-fixture-proof/phone-390x844.png`
- `packages/wix-studio-ui-cli/evidence/responsive-fixture-proof/phone-small-360x800.png`

## Capability routing proof
Command:

```bash
node bin/wix-studio-ui-cli.mjs capabilities
node bin/wix-studio-ui-cli.mjs site-build-plan --spec examples/booking-site-spec.example.json --out runs/2026-06-22-production-grade-wix-cli-architecture/site-build-plan.json
node bin/wix-studio-ui-cli.mjs route-plan --plan runs/2026-06-22-production-grade-wix-cli-architecture/site-build-plan.json --out runs/2026-06-22-production-grade-wix-cli-architecture/routed-plan.json
```

Result: PASS

Key output:
- capability registry operations: 63
- route-plan fixture actions: 29
- missing capability mappings in fixture: 0

## Executable Studio recipe proof
Command shape:

```bash
node bin/wix-studio-ui-cli.mjs studio-recipe-run \
  --execute \
  --mutation-ok \
  --cdp-url "$WS" \
  --recipe recipes/responsive-fixture-text-edit.example.json \
  --out evidence/studio-recipe-fixture-proof
```

Result: PASS

Proof summary:

```json
{
  "status": "PASS",
  "textEdit": true,
  "screenshots": 1
}
```

Evidence:
- `packages/wix-studio-ui-cli/evidence/studio-recipe-fixture-proof/03-phone-after-local-text-edit.png`
- `packages/wix-studio-ui-cli/evidence/*studio-recipe-run.jsonl` (transient, gitignored)
