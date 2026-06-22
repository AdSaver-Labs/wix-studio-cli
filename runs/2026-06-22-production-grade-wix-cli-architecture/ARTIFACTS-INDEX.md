# Artifacts Index

## Research / architecture
- `docs/research/professional-grade-wix-cli-architecture-2026-06-22.md`

## CLI source changes
- `packages/wix-studio-ui-cli/bin/wix-studio-ui-cli.mjs`
- `packages/wix-studio-ui-cli/src/qa-contract.mjs`
- `packages/wix-studio-ui-cli/src/capability-registry.mjs`
- `packages/wix-studio-ui-cli/src/risk-policy.mjs`
- `packages/wix-studio-ui-cli/src/site-spec.mjs`
- `packages/wix-studio-ui-cli/src/site-generators.mjs`
- `packages/wix-studio-ui-cli/src/studio-recipes.mjs`
- `packages/wix-studio-ui-cli/src/recipe-skeletons.mjs`
- `packages/wix-studio-ui-cli/capabilities/wix-capability-registry.json`
- `packages/wix-studio-ui-cli/test/smoke-guardrails.mjs`
- `packages/wix-studio-ui-cli/test/responsive-fixture.html`

## Generated run artifacts
- `runs/2026-06-22-production-grade-wix-cli-architecture/RUN-SUMMARY.md`
- `runs/2026-06-22-production-grade-wix-cli-architecture/TEST-RESULTS.md`
- `runs/2026-06-22-production-grade-wix-cli-architecture/ARTIFACTS-INDEX.md`
- `runs/2026-06-22-production-grade-wix-cli-architecture/NEXT-ACTIONS.md`
- `runs/2026-06-22-production-grade-wix-cli-architecture/capabilities-summary.json`
- `runs/2026-06-22-production-grade-wix-cli-architecture/site-build-plan.json`
- `runs/2026-06-22-production-grade-wix-cli-architecture/routed-plan.json`

## Generated change specs
- `runs/2026-06-22-production-grade-wix-cli-architecture/generated-change-specs/faq.spec.json`
- `runs/2026-06-22-production-grade-wix-cli-architecture/generated-change-specs/about.spec.json`
- `runs/2026-06-22-production-grade-wix-cli-architecture/generated-change-specs/header.spec.json`
- `runs/2026-06-22-production-grade-wix-cli-architecture/generated-change-specs/footer.spec.json`
- `runs/2026-06-22-production-grade-wix-cli-architecture/generated-change-specs/product.spec.json`
- `runs/2026-06-22-production-grade-wix-cli-architecture/generated-change-specs/portfolio.spec.json`
- `runs/2026-06-22-production-grade-wix-cli-architecture/generated-change-specs/policy.spec.json`

## Generated recipe skeletons
- `runs/2026-06-22-production-grade-wix-cli-architecture/generated-recipe-skeletons/faq.recipe.json`
- `runs/2026-06-22-production-grade-wix-cli-architecture/generated-recipe-skeletons/about.recipe.json`
- `runs/2026-06-22-production-grade-wix-cli-architecture/generated-recipe-skeletons/header.recipe.json`
- `runs/2026-06-22-production-grade-wix-cli-architecture/generated-recipe-skeletons/footer.recipe.json`
- `runs/2026-06-22-production-grade-wix-cli-architecture/generated-recipe-skeletons/product.recipe.json`
- `runs/2026-06-22-production-grade-wix-cli-architecture/generated-recipe-skeletons/portfolio.recipe.json`
- `runs/2026-06-22-production-grade-wix-cli-architecture/generated-recipe-skeletons/policy.recipe.json`

## Local evidence artifacts not intended for Git by default
- `packages/wix-studio-ui-cli/evidence/responsive-fixture-proof-expanded/responsive-audit.json`
- `packages/wix-studio-ui-cli/evidence/responsive-fixture-proof-expanded/*.png`
- transient `packages/wix-studio-ui-cli/evidence/*.jsonl`

Reason: root `.gitignore` excludes `evidence/` and `*.jsonl`; proof summaries are captured in `TEST-RESULTS.md`.

## Current proof status
- Local gates: PASS.
- Expanded responsive fixture proof: PASS across 18 viewports.
- Two-step QA contract present in CLI/generators/site-plan.
- Spec → recipe skeleton conversion present and locally tested.
- Real Wix test-site proof: pending.
- Published Wix-domain proof: pending.

## 2026-06-22 16:10 UTC adapter contract slice

- `adapter-contracts.json` — versioned fail-closed write-adapter interface contracts.
- `adapter-contracts.stdout.json` — CLI stdout wrapper for adapter contracts command.
- `approval-manifest-template.text-edit-seo.json` — sample non-approved manifest template bound to exact action fingerprint.
- `approval-manifest-template.stdout.json` — CLI stdout wrapper for manifest-template command.
- `apply-plan-with-contracts.json` — routed implementation packets with adapter execution contracts.
- `apply-plan-with-contracts.stdout.json` — CLI stdout wrapper for contracted apply-plan command.
