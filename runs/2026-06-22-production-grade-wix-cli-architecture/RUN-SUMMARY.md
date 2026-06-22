# Run Summary — Wix CLI Site OS Architecture Candidate

## Status
CANDIDATE — locally verified for implemented CLI slices. Not production/client-ready until a non-client Wix test-site completes editor/preview QA and published Wix-domain QA.

## Implemented in this run
- Added Donatello research synthesis: `docs/research/professional-grade-wix-cli-architecture-2026-06-22.md`.
- Added professional Wix capability registry with 63 operation mappings: APIs/SDK, Git/Wix CLI, Blocks/apps, Studio last-mile recipes, browser QA, approval gates, proof requirements, rollback classes.
- Added/expanded CLI commands:
  - `capabilities`
  - `capability-explain --operation <id>`
  - `route-plan --plan <json>`
  - `responsive-audit --execute --cdp-url <ws> [--url <url>] --viewports expanded`
  - `qa-preview-inspect`
  - `publish-test-site` (approval contract/fail-closed publisher placeholder)
  - `qa-published-inspect`
  - `studio-recipe-validate`
  - `studio-recipe-run`
  - `templates`
  - `generate-change-spec`
  - `generate-recipe-skeleton`
- Added shared QA contract module: `packages/wix-studio-ui-cli/src/qa-contract.mjs`.
- Added two-step QA contract:
  1. `editor-preview-inspection`
  2. `published-wix-domain-inspection`
- Expanded responsive matrix to 18 viewports including:
  - 27-inch / 2560×1440
  - 24-inch / 1920×1080
  - 1440×900 desktop
  - 1366×768 laptop
  - tablet landscape/portrait
  - large/standard/iPhone/small/min phones
  - breakpoint edges around 1280, 1024, 768/767, and 320.
- Added generators for FAQ, About, Header, Footer, Product, Portfolio, Policy, Hero, Services, CTA.
- Regenerated specs in `generated-change-specs/`; each now includes 18 viewport entries and both QA gates.
- Added automatic spec → recipe skeleton conversion in `src/recipe-skeletons.mjs`.
- Generated recipe skeletons include `/inputs/buttons/selectors`, `/selectors/evidence-compatible`, `/ARIA/data`, two-step QA, rollback, and 18-viewport proof requirements.

## Architecture decision
The CLI direction is a Wix Site Operating System / change compiler, not a blind click bot:
1. Generate typed spec.
2. Route each operation to the safest adapter.
3. Use Studio UI automation only as versioned last-mile recipes.
4. Require save receipts, rollback, editor/preview QA, published Wix-domain QA, and expanded responsive proof before calling work done.

## Current limitations / not proven yet
- No live Wix Studio mutation was executed in this slice.
- No real Wix test-site has been built/published yet.
- `publish-test-site` is intentionally fail-closed until a versioned publisher adapter is implemented and approved.
- No AdSaver/client-site work is approved by this evidence.

## Proof status
- Local static/guardrail gates: PASS.
- Responsive fixture expanded audit: PASS across 18 viewports.
- Generated specs: PASS for two-step QA + expanded viewport contract.
- Generated recipe skeletons: PASS for selector-proof, two-step QA, rollback, and expanded viewport contract.
- QA Manager initial audit: FAIL before fixes; re-QA pending after this patch.
