# Artifacts Index

## Research / architecture
- `docs/research/professional-grade-wix-cli-architecture-2026-06-22.md`

## CLI source changes
- `packages/wix-studio-ui-cli/bin/wix-studio-ui-cli.mjs`
- `packages/wix-studio-ui-cli/src/capability-registry.mjs`
- `packages/wix-studio-ui-cli/src/risk-policy.mjs`
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

## Local evidence artifacts not intended for Git by default
- `packages/wix-studio-ui-cli/evidence/responsive-fixture-proof/responsive-audit.json`
- `packages/wix-studio-ui-cli/evidence/responsive-fixture-proof/*.png`
- transient `packages/wix-studio-ui-cli/evidence/*.jsonl`

Reason: root `.gitignore` excludes `evidence/` and `*.jsonl`; proof summaries are captured in `TEST-RESULTS.md`.

## Studio recipe framework v1
- `packages/wix-studio-ui-cli/src/studio-recipes.mjs`
- `packages/wix-studio-ui-cli/recipes/faq-section.example.json`
- `packages/wix-studio-ui-cli/recipes/responsive-fixture-text-edit.example.json`

## Page/section generator v1
- `packages/wix-studio-ui-cli/src/site-generators.mjs`
- `runs/2026-06-22-production-grade-wix-cli-architecture/generated-change-specs/faq.spec.json`
- `runs/2026-06-22-production-grade-wix-cli-architecture/generated-change-specs/about.spec.json`
- `runs/2026-06-22-production-grade-wix-cli-architecture/generated-change-specs/header.spec.json`
- `runs/2026-06-22-production-grade-wix-cli-architecture/generated-change-specs/footer.spec.json`
- `runs/2026-06-22-production-grade-wix-cli-architecture/generated-change-specs/product.spec.json`
- `runs/2026-06-22-production-grade-wix-cli-architecture/generated-change-specs/portfolio.spec.json`
- `runs/2026-06-22-production-grade-wix-cli-architecture/generated-change-specs/policy.spec.json`
