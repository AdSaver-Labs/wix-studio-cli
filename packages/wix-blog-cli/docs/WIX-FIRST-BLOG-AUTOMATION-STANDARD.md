# Wix-First Blog Automation Standard

**Owner:** Dexter / Alej
**Updated:** 2026-06-15

## Core rule
When Alej asks for client articles, recurring weekly articles, or “3 articles/week” for a Wix client, the default output is **Wix blog drafts or published Wix posts**, not article files stored on the VPS.

Local VPS storage is only for tiny receipts/config/evidence, not full article bodies.

## Default workflow
1. Identify client pack and Wix site config.
2. Generate/write article directly into Wix Blog as a draft.
3. Include SEO fields in Wix:
   - slug
   - SEO title/title tag
   - meta description
   - focus keyword when available
   - excerpt
   - language
4. Add/attach article images where the site workflow supports it.
5. Run QA gate.
6. If QA passes and the client has publishing approval enabled, publish automatically.
7. Verify public URL after publish:
   - HTTP 200
   - title/meta/canonical/slug
   - rendered page scan for spacing/translation/layout issues
   - image presence/alt text where accessible
8. Save only compact receipts:
   - Wix draft/post IDs
   - QA result
   - public URLs
   - verification result
   - blockers, if any
9. Delete any temporary article-body files/scripts after Wix creation or publish verification.

## Safe operator flow

Default command path for client articles:

1. `status --client <id>` / `next --client <id>` to confirm config and blockers.
2. `validate-manifest --client <id> --manifest <file>` for local schema/quality checks.
3. `prepare-packet --client <id> --manifest <file>` for validate → create/update draft → verify → approval template → human summary. This command is safe: it does **not** publish.
4. QA agent reviews the generated verify receipt + summary.
5. Publishing is only allowed through `publish --client <id> --draft-receipt <verified-receipt> --approval-manifest <approval.json>` where the approval manifest has `approved=true`, `publishAfterQa=true`, `qa.status=PASS`, matching draft IDs, and matching receipt/content hashes.
6. `verify-public --receipt <publish-receipt>` after publishing.

Legacy `run --mode publish` is disabled unless `WIX_BLOG_ALLOW_LEGACY_PUBLISH=1` is explicitly set for approved legacy maintenance.

## QA authority
Alej has approved QA Manager involvement for this Wix article workflow.

Default gate:
- Dexter/main creates or updates Wix drafts/posts.
- QA Manager reviews the article/SEO/publishing readiness when needed.
- If QA marks PASS and the client pack allows publish-after-QA, Dexter publishes.
- Dexter/main still performs final public verification and owns the final truth.

If QA Manager is unavailable, main session performs the QA and records that QA-agent review was unavailable.

## Client publishing modes
- `publish-after-qa`: publish automatically after QA PASS and public-safe checks.
- `draft-after-qa`: leave as Wix draft after QA PASS.
- `approval-first`: requires Alej approval before publishing unless Alej later changes the client pack.

## No fake blockers
Never say “client has no Wix access” only because the local config is missing. Correct labels:
- `CONFIG_MISSING`: access may exist, but site config/dashboard ID has not been saved.
- `ACCESS_UNVERIFIED`: browser/account access must be checked.
- `AUTH_BLOCKED`: login/session/2FA/captcha blocks action.
- `WIX_API_BLOCKED`: authenticated dashboard loads but blog API action fails.
- `PUBLISHED_VERIFICATION_FAILED`: Wix action succeeded but public proof failed.

## Storage discipline
Do not keep full article drafts under `1-Projects/` after they are pushed into Wix.
Keep compact JSON receipts only.

Every draft/create/update/verify/publish receipt must include a stable receipt/content hash and a human-readable summary card.

Client publish approval must be bound to receipt hash + draft hashes + exact draft IDs + expiry/approver metadata.

Image policy must be explicit per client: `required` or `text-only-explicit`. If `required`, QA must verify image/OG-image evidence before publish.

Internal links and CTA are mandatory in article manifests.
