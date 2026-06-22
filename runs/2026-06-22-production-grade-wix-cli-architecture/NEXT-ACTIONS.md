# Next Actions

## Immediate CLI build slices
1. Studio recipe framework v1
   - `studio recipe validate`
   - `studio recipe dry-run`
   - `studio recipe run --execute --approval-manifest`
   - recipe schema with preconditions, selectors, expected states, verification steps, rollback notes.

2. Section/page generators
   - typed generators for FAQ page/section, About page, header, footer, portfolio, product cards, policy pages.
   - mobile-first content/layout rules embedded in generated specs.

3. Receipts ledger
   - every mutation gets input hash, adapter, readback, proof paths, rollback plan.

4. Wix non-client test-site proof
   - run one safe recipe on a Wix test site only.
   - prove before/after screenshots, save state, preview URL, responsive-audit PASS.

5. QA Manager verdict loop
   - after each executable Wix slice, request PASS/FAIL/BLOCKED verdict with evidence bundle.

## Before AdSaver website build
- CLI must pass at least one live non-client Wix Studio proof for the same operation class:
  - page/section creation;
  - header/footer rework;
  - copy application;
  - responsive audit;
  - save/preview proof.

## GitHub
- Commit/push this architecture + responsive proof slice after review or as soon as operator confirms push is allowed for this repo state.

## Safety
- Do not attach domains.
- Do not publish production/client sites without explicit approval.
- Wix-domain publish for AdSaver demo is allowed only after CLI proof and QA verdict.

## Updated after Studio recipe framework v1
- Next implementation slice should add higher-level generators that emit recipe/spec pairs for:
  1. FAQ section/page;
  2. About page;
  3. global header/footer;
  4. product/portfolio section;
  5. policy page draft.
- Then run the first non-client Wix test-site recipe with QA evidence.
