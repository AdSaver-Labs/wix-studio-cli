# Test Results — Wix CLI Site OS Architecture Candidate

## Hardening preflight
Command:

```bash
/home/Alej/.openclaw/workspace/3-Resources/agent-ops-hardening/scripts/preflight-guardrail-pack.sh /home/Alej/.openclaw/workspace wix-cli-two-step-qa-contract
```

Result: PASS — warnings=0.

## Local static / guardrail gates
Command:

```bash
npm run -s check && npm run -s smoke && npm run -s test:guardrails
```

Result: PASS.

Evidence:
- `npm run -s check`: Node syntax checks passed for bin/src/test modules.
- `npm run -s smoke`: help + core dry-run commands passed.
- `npm run -s test:guardrails`: `PASS smoke-guardrails`.

## Self-heal note
One guardrail run failed after command names changed from spaced plan labels to executable hyphenated commands. Ran the hardening self-heal wrapper for diagnosis, then patched tests/route mapping from:
- `qa preview-inspect` → `qa-preview-inspect`
- `publish test-site` → `publish-test-site`
- `qa published-inspect` → `qa-published-inspect`

Re-run result: PASS.

## Expanded responsive audit proof
Command shape:

```bash
chromium --headless=new --disable-gpu --no-sandbox --remote-debugging-port=9335 \
  "file://$PWD/test/responsive-fixture.html"
node bin/wix-studio-ui-cli.mjs responsive-audit \
  --execute \
  --cdp-url "$WS" \
  --out evidence/responsive-fixture-proof-expanded \
  --viewports expanded \
  --settle-ms 100
```

Result:

```json
{
  "status": "PASS",
  "checkedViewports": 18,
  "phone": 0,
  "large": 0,
  "breakpoint": 0
}
```

Artifact:
- `packages/wix-studio-ui-cli/evidence/responsive-fixture-proof-expanded/responsive-audit.json`

## Generated change-spec proof
Command shape:

```bash
for type in faq about header footer product portfolio policy; do
  node packages/wix-studio-ui-cli/bin/wix-studio-ui-cli.mjs generate-change-spec \
    --type "$type" \
    --business-name "Wix Test Site" \
    --industry "professional services" \
    --out "runs/2026-06-22-production-grade-wix-cli-architecture/generated-change-specs/${type}.spec.json"
done
```

Result: PASS.

Each generated spec includes:
- 18 responsive viewports.
- `editor-preview-inspection` gate.
- `published-wix-domain-inspection` gate.
- 10 required proof items.

## Generated recipe skeleton proof
Command shape:

```bash
for spec in runs/2026-06-22-production-grade-wix-cli-architecture/generated-change-specs/*.spec.json; do
  base=$(basename "$spec" .spec.json)
  node packages/wix-studio-ui-cli/bin/wix-studio-ui-cli.mjs generate-recipe-skeleton \
    --spec "$spec" \
    --out "runs/2026-06-22-production-grade-wix-cli-architecture/generated-recipe-skeletons/${base}.recipe.json"
done
```

Result: PASS.

Guardrail coverage confirms generated recipe skeletons include:
- `/inputs/buttons/selectors`
- `/selectors/evidence-compatible`
- `/ARIA/data`
- `published-wix-domain-inspection`
- 18 responsive viewports.

## Capability routing proof
Command:

```bash
node bin/wix-studio-ui-cli.mjs capabilities
node bin/wix-studio-ui-cli.mjs site-build-plan --spec examples/booking-site-spec.example.json --out runs/2026-06-22-production-grade-wix-cli-architecture/site-build-plan.json
node bin/wix-studio-ui-cli.mjs route-plan --plan runs/2026-06-22-production-grade-wix-cli-architecture/site-build-plan.json --out runs/2026-06-22-production-grade-wix-cli-architecture/routed-plan.json
```

Result: PASS by guardrail coverage.

Key checks:
- capability registry operations: 63.
- route-plan includes `qa-preview-inspect`, `publish-test-site`, and `qa-published-inspect`.
- missing capability mappings in fixture: 0.

## Unproven
- Real Wix Studio editor mutation.
- Real non-client Wix test-site publish.
- Real published Wix-domain QA.
- Production/client readiness.

## 2026-06-22 16:10 UTC — adapter contract slice

Command:

```bash
npm run -s check && npm run -s smoke && npm run -s test:guardrails
```

Result: PASS.

Additional proof artifacts:
- `adapter-contracts.json` — PASS; versioned API/Git/Studio/QA/Publish/Human adapter contracts emitted; write executors remain fail-closed.
- `approval-manifest-template.text-edit-seo.json` — non-approved manifest template bound to exact `text-edit` action fingerprint.
- `apply-plan-with-contracts.json` — PASS_WITH_BLOCKERS; 32 packets, 7 read-only ready, 23 staged-needs-proof, 2 approval-blocked; packets now include adapter execution contracts.
