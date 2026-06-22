# Run Summary — Production-Grade Wix CLI Architecture

## Status
CANDIDATE → locally verified for the implemented slices.

## Implemented in this run
- Added Donatello research synthesis: `docs/research/professional-grade-wix-cli-architecture-2026-06-22.md`.
- Added professional Wix capability registry with 63 operation mappings: APIs/SDK, Git/Wix CLI, Blocks/apps, Studio last-mile recipes, browser QA, approval gates, proof requirements, rollback classes.
- Added CLI commands:
  - `capabilities`
  - `capability-explain --operation <id>`
  - `route-plan --plan <json>`
  - `responsive-audit --execute --cdp-url <ws> [--url <url>]`
- Added `responsive-audit` phone-primary QA gate:
  - desktop 1440×900
  - tablet 768×1024
  - phone 390×844
  - phone-small 360×800
- Responsive audit checks:
  - horizontal overflow
  - unreadable small text
  - weak tap targets
  - obvious CTA presence
  - visible header/nav warning
  - clipped text/content
- Added responsive fixture: `packages/wix-studio-ui-cli/test/responsive-fixture.html`.

## Important design decision
The CLI direction is a Wix Site Operating System / change compiler, not a blind click bot:
1. Generate a typed site-change/spec plan.
2. Route each operation to the safest adapter.
3. Use Studio UI automation only as versioned last-mile recipes.
4. Require receipts, rollback, preview/public proof, and phone-primary responsive QA before claiming professional completion.

## Failure/repair note
Initial executable `responsive-audit` proof failed correctly because the fixture had:
- nav tap targets below the threshold;
- tight H1 layout detected as clipped.

Repair:
- increased nav min-width/padding;
- loosened H1 line-height/letter spacing;
- reran executable proof successfully.

## Current limitations / not proven yet
- No live Wix Studio mutation was executed in this slice.
- No real Wix test site has been built yet.
- Studio recipe framework is not yet implemented.
- GitHub push/PR is not yet completed in this transcript.
- QA agent final verdict is still pending; local gates are green.

## Additional implemented slice — Studio recipe framework v1
- Added `src/studio-recipes.mjs`.
- Added commands:
  - `studio-recipe-validate --recipe <json>`
  - `studio-recipe-run --recipe <json> --dry-run`
  - `studio-recipe-run --execute --mutation-ok --cdp-url <ws> --recipe <json>`
- Added recipe examples:
  - `recipes/faq-section.example.json`
  - `recipes/responsive-fixture-text-edit.example.json`
- Recipe framework supports:
  - preconditions;
  - deterministic fingerprinting;
  - step validation;
  - mutating-step detection;
  - selector proof;
  - text edit;
  - viewport switch;
  - screenshot capture;
  - save-state detection;
  - verification and rollback requirements.

## Executable recipe proof
Ran `studio-recipe-run` against the local responsive fixture through headless Chromium/CDP.

Result: PASS

Proof:
- text edit returned `ok=true` and `stableValueCommitted=true`;
- phone viewport screenshot captured;
- no Wix/client/live surface touched.
