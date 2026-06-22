# Next Actions

## Remaining 4 execution points
1. Automatic spec → recipe skeleton conversion — DONE LOCALLY
   - Generated specs now convert into Studio recipe skeletons with selectors, preconditions, verification, rollback, and two-step QA requirements.

2. Non-client Wix test-site proof — NEXT
   - Run a safe FAQ/About/header-footer operation class only on a non-client Wix test site.
   - Capture save-state, editor/preview screenshots, and `qa-preview-inspect` proof.

3. Approval-gated test-site publish + published Wix-domain QA — PENDING TEST-SITE PROOF/APPROVAL
   - Use `publish-test-site` only with explicit approval manifest and non-client test-site target.
   - Then run `qa-published-inspect --url <wix-domain>`.
   - Completion requires both editor/preview QA and real published Wix-domain QA.

4. QA Manager final verdict loop — RE-RUN AFTER THIS PATCH AND AGAIN AFTER LIVE TEST-SITE PROOF
   - Request PASS/FAIL/BLOCKED after all evidence exists.
   - QA must check both gates, 18-viewport responsive proof, rollback, and no production/client mutation.

## Before AdSaver website build
- CLI must pass at least one live non-client Wix Studio proof for the same operation class:
  - page/section creation;
  - header/footer rework;
  - copy application;
  - responsive audit;
  - save/preview proof;
  - published Wix-domain proof.

## Safety
- Do not attach domains.
- Do not publish production/client sites without explicit approval.
- Domain/DNS/payment/order/booking mutations require explicit scoped approval.
- SEO/indexing/canonical/redirect mutations require approval and before/after proof.
- Policy/legal pages remain drafts until human/legal review.

## Added after adapter contract slice — 2026-06-22 16:10 UTC

1. Implement one narrow Studio recipe executor proof on non-client `My Site 2`, limited to reversible phone/responsive test-site changes, only after scoped mutation approval.
2. Capture before/after editor-preview proof, save-state proof, expanded responsive audit, and rollback evidence.
3. Keep publish adapter fail-closed until preview QA PASS and explicit non-client temporary-domain publish approval manifest are present.
