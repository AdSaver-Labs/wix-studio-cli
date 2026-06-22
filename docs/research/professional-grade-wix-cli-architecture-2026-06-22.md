# Professional-Grade Wix/Studio CLI Architecture Brief

**Date:** 2026-06-22  
**Owner lane:** Research / Education  
**Consumer:** Dexter / Jacques / QA Manager  
**Scope:** Research and architecture only. No Wix site was mutated, published, messaged, or externally changed.

## Executive recommendation

Build the Wix execution CLI as a **capability-routed Wix Site Operating System**, not a Studio click-bot.

The production-grade route is a layered orchestrator:

1. **Official APIs / SDK / MCP first** for structured objects: CMS, Blog, Stores/eCommerce, Bookings, Media, Forms/CRM, site/account inventory, embedded scripts, app/site-plugin state, schemas/docs lookup.
2. **Git Integration + Wix CLI for Sites second** for site code: Velo/backend modules, web methods, HTTP functions, routers, npm packages, local editor, preview, publish workflow, and Git rollback.
3. **Wix CLI Apps + Blocks/custom app layer third** for reusable professional widgets, product/portfolio sections, dashboard tooling, site plugins, service plugins, and client-specific custom functionality.
4. **Studio Editor automation via Playwright/CDP last-mile only** for visual/editor-only surfaces: page/section layout, responsive breakpoint tuning, headers/footers, typography application where not exposed by APIs, animation panel settings, page menus, and final canvas composition.
5. **Public preview/mobile-first QA gate around every mutation** before any claim of production readiness or use as AdSaver client-site proof.

**Decision:** Treat high-level briefs as compiled artifacts, not direct UI actions. The CLI should transform a site-change brief into a versioned `site-change-spec`, route each operation through the safest adapter, execute only with receipts, and produce preview/public proof across desktop/tablet/phone. Mobile is the most important outcome even if design workflow proceeds desktop → tablet → phone.

**Confidence:** High for hybrid architecture; medium for robust Studio last-mile recipes; low for arbitrary fully general canvas automation without recipe constraints.

---

## Source-backed platform facts

- Wix’s current general **Wix CLI** is for Wix apps and Wix-managed headless projects; Wix’s own docs direct Wix site development to **Git Integration & Wix CLI for Sites** instead. The CLI uses an Astro-based structure, supports extensions, local development, previews, and CI/CD workflows. Source: `https://dev.wix.com/docs/wix-cli/guides/about-the-wix-cli.md`.
- **Git Integration & Wix CLI for Sites** stores site code in GitHub, supports local IDE work, Local Editor testing, preview, publish, package install/update/uninstall, and version control. Source: `https://dev.wix.com/docs/develop-websites/articles/workspace-tools/developer-tools/git-integration-wix-cli-for-sites/about-git-integration-wix-cli-for-sites.md`.
- Documented Wix CLI for Sites commands include `wix dev`, `wix install`, `wix update`, `wix uninstall`, `wix preview`, `wix publish`, `wix login`, `wix whoami`, and `wix logout`. Wix warns that publishing local code can leave live site and GitHub repo out of sync; preview requires a previously published site and uses live HTTP functions. Source: `https://dev.wix.com/docs/develop-websites/articles/workspace-tools/developer-tools/git-integration-wix-cli-for-sites/wix-cli-for-sites-commands.md`.
- Wix provides an official **MCP server** that can search Wix docs, write Wix-platform code, list Wix sites, call Wix site APIs, and manage site-level actions. It supports remote HTTP/SSE or `@wix/mcp-remote`, with optional API-key authentication. Source: `https://dev.wix.com/docs/sdk/articles/use-the-wix-mcp/about-the-wix-mcp.md`.
- The Wix SDK docs expose modules for core client/auth, host modules for workspace/dashboard/editor/site, business solutions including Blog, Bookings, CRM, Data/CMS, eCom, Events, Restaurants, and Stores, plus frontend modules such as SEO and location. Source: `https://dev.wix.com/docs/sdk.md`.
- The unified API reference exposes large structured API areas including app management, embedded scripts, editor deep links, site plugins, eCommerce, Stores, Bookings, CMS, Events, Restaurants, Blog, and more. Source: `https://dev.wix.com/docs/api-reference.md`.
- The SDK **Editor API** is explicitly for code running within a Wix editor context, such as settings panels, not a general-purpose external site-development/canvas-editing API. Source: `https://dev.wix.com/docs/sdk/host-modules/editor/introduction.md`.
- Wix Blocks is documented as an app-development framework for site widgets, site plugins, dashboard pages, widget API/design, editor configuration/panels, CMS collections, and deploying/managing Blocks apps. Source: `https://dev.wix.com/docs/build-apps.md`.
- Prior local research reached the same strategic conclusion: “doing almost anything in Wix” is feasible, but not through one interface; use API/SDK/MCP, Git/CLI, private apps/extensions, browser automation last, and QA around every change. Source: `knowledge/projects/wix-full-capability-expansion-2026-06-03/EXECUTIVE-SUMMARY.md`.

---

## Recommended professional-grade architecture

```text
High-level Alej/Dexter site-change brief
  ↓
Brief Intake + Policy Classifier
  - target site, business goal, audience, pages/sections, risk, approval level
  - mobile success criteria required
  ↓
Site Inventory + Capability Registry
  - official API/SDK/MCP discovery
  - Git/Wix CLI state
  - Studio/editor state + public URL state
  ↓
Spec Compiler
  - content/copy spec
  - design tokens + component/section spec
  - responsive breakpoint spec
  - SEO/legal/policy spec
  - mutation plan with adapter routing
  ↓
Execution Adapters
  1. REST/SDK/MCP adapter
  2. Git + Wix CLI for Sites adapter
  3. Wix CLI app / Blocks scaffold adapter
  4. Studio Playwright/CDP adapter
  5. Human handoff adapter
  ↓
Receipts + Evidence Ledger
  - mutation receipts, before/after diffs, screenshots, preview URLs, public proofs
  ↓
QA Gates
  - code tests, API readback, preview proof, mobile visual proof, SEO/legal/accessibility/performance checks
  ↓
Publish Gate / Rollback Gate
  - explicit operator approval, GitHub sync verification, rollback plan, QA Manager verdict
```

### Core principle

The CLI must separate **planning**, **routing**, **execution**, and **proof**. A command that changes Wix must never be “click this button and hope.” It should be: compile plan → classify risk → run adapter → record receipt → verify on preview/public output → decide next step.

---

## Capability map by Wix surface

| Wix surface | Best adapter | Stable/public? | Example capabilities | CLI stance |
|---|---|---:|---|---|
| Account/site inventory | MCP / REST / SDK | High | list sites, site metadata, API schema lookup | Read-only first adapter. |
| Blog | REST / SDK / MCP | High | draft/update posts, categories, tags, SEO-oriented content flows | API-first; public proof after publish/preview. |
| CMS/Data | REST / SDK | High, with consistency caveats | collections, items, references, portfolio data, FAQ data | Use schema diff + bounded readback retries. |
| Media | REST / SDK | High | upload/reuse assets, folders, URLs | Asset registry with checksums and alt text. |
| Stores/eCommerce | REST / SDK / app extensions | Medium-high but risky | products, catalogs, custom product logic, orders/payments flows | Product content OK with approval; orders/payments blocked unless explicit. |
| Bookings/Events/Restaurants | REST / SDK / extensions | Medium-high but risky | services, availability, event data, reservations | Mutate only on test site or with explicit operator approval. |
| Forms/CRM | REST / SDK | Medium-high | schemas/submissions/contacts | Read/export/QA; visual form placement is Studio/Blocks. |
| Embedded scripts/custom code | API / app extensions / Git | Medium-high but security-sensitive | analytics, consent-aware snippets, custom embeds | Require security/consent review and rollback. |
| Velo/backend/site code | Git Integration + Wix CLI for Sites | High for code workflow | web methods, backend modules, routers, HTTP functions, npm packages | Git branch + tests + preview before publish. |
| Preview/publish | Wix CLI for Sites | Medium-high but high risk | `wix preview`, `wix publish` | Preview allowed after gates; publish blocked until approval. |
| Reusable widgets/sections | Blocks / Wix CLI app | Medium | site widgets, site plugins, product widgets, dashboard pages | Preferred for reusable professional components. |
| Header/footer/page layout | Studio UI automation / human | Low-medium | visual composition, menus, layout sections | Last-mile recipes only; screenshot proof required. |
| Responsive breakpoint layout | Studio UI automation + public QA | Low-medium | desktop/tablet/phone tuning | Highest QA emphasis; mobile must pass. |
| Typography/theme tokens | Studio UI, CSS/code where applicable | Mixed | global text styles, component-level styles | Prefer token spec + Git/CSS if possible; Studio recipe if needed. |
| Animations/effects | Studio UI / custom code / Blocks | Mixed | scroll/fade/sideways effects | Prefer reusable CSS/Blocks; Studio panels are risky. |
| Legal/policy pages | Content generator + Studio/Git/API | Medium | privacy/terms/refund/shipping disclaimers | Generate as templates only; require legal disclaimer/review. |
| Public proof | Browser QA / Lighthouse / Playwright | High | screenshots, content assertions, mobile viewport proof | Mandatory before “done.” |

---

## Deep module interface design

### 1. Brief intake and compiler

**Purpose:** Convert natural-language work into a typed, reviewable site-change spec.

Commands:

```bash
wixsite brief init --site <site-id> --goal "Create FAQ and optimized About page"
wixsite brief compile brief.md --out runs/<run-id>/site-change.spec.json
wixsite plan runs/<run-id>/site-change.spec.json --out runs/<run-id>/plan.json
```

Spec fields:

```json
{
  "site": { "id": "...", "environment": "test|client|prod" },
  "goal": "conversion-first FAQ + About improvements",
  "audience": "...",
  "mobileSuccessCriteria": ["CTA visible above first major scroll", "no horizontal overflow"],
  "pages": [],
  "sections": [],
  "content": {},
  "designSystem": {},
  "seo": {},
  "legal": { "requiresHumanLegalReview": true },
  "riskPolicy": {},
  "proofRequired": ["desktop", "tablet", "phone", "public_or_preview_url"]
}
```

### 2. Capability registry and router

**Purpose:** Decide whether each operation goes API, Git/CLI, Blocks/custom app, Studio automation, or human handoff.

Commands:

```bash
wixsite capabilities list
wixsite capabilities explain page.create
wixsite route plan.json --out routed-plan.json
```

Registry fields:

```json
{
  "operation": "page.about.optimize",
  "preferredAdapter": "studio|git|api|blocks|human",
  "stablePublicSurface": false,
  "risk": "read|draft|reversible|publish-impacting|destructive|regulated",
  "approvalRequired": true,
  "receipts": ["beforeScreenshot", "afterScreenshot", "previewUrl"],
  "rollback": ["git revert", "site history", "manual Studio undo"]
}
```

### 3. Content/copy/SEO/legal generator

**Purpose:** Produce production-ready text assets before implementation.

Commands:

```bash
wixsite content generate --type faq --brand brand.json --out content/faq.json
wixsite content generate --type about --conversion-goal lead --out content/about.md
wixsite seo plan --page about --keywords keywords.json --out seo/about.json
wixsite legal draft --type privacy --jurisdiction "client-provided" --out legal/privacy-draft.md
```

Rules:

- Legal/policy pages are **draft templates**, not legal advice.
- SEO output must include title, meta description, heading plan, internal links, schema candidate, and proof assertions.
- Copy output must include mobile-first above-the-fold CTA and trust proof.

### 4. Design system and style token manager

**Purpose:** Ensure professional consistency across pages/sections.

Commands:

```bash
wixsite tokens extract --site <site-id> --out design/tokens.current.json
wixsite tokens propose --brand brand.json --out design/tokens.proposed.json
wixsite tokens diff design/tokens.current.json design/tokens.proposed.json
wixsite tokens apply design/tokens.proposed.json --adapter git|studio --dry-run
```

Token types:

- color roles: background, surface, primary, accent, text, muted, border;
- typography roles: H1/H2/H3/body/small/button;
- spacing scale;
- section rhythm;
- CTA patterns;
- mobile typography overrides;
- motion tokens: duration, easing, reduced-motion fallback.

### 5. Page/section generator

**Purpose:** Generate reusable professional sections and pages.

Commands:

```bash
wixsite page generate about --spec specs/about.json --out sections/about.plan.json
wixsite section generate faq --source content/faq.json --out sections/faq.section.json
wixsite section apply sections/faq.section.json --site <site-id> --dry-run
```

Section contract:

```json
{
  "sectionType": "faq",
  "contentBlocks": [],
  "layout": { "desktop": {}, "tablet": {}, "phone": {} },
  "designTokens": {},
  "seo": {},
  "accessibility": {},
  "proofSelectors": []
}
```

### 6. Responsive QA module

**Purpose:** Make phone proof non-negotiable.

Commands:

```bash
wixsite qa responsive --url <preview-url> --desktop --tablet --phone --out evidence/responsive/
wixsite qa mobile-score --url <preview-url> --threshold pass
wixsite qa visual-diff --before <url> --after <url> --viewports desktop,tablet,phone
```

Minimum viewport set:

- desktop: 1440×900;
- tablet: 768×1024;
- phone: 390×844 and 360×800;
- optional large phone: 430×932.

Must detect:

- horizontal overflow;
- CTA visibility and tap target size;
- clipped text/images;
- unreadable type;
- header/menu usability;
- section order and spacing;
- CLS-like layout jumps where testable;
- broken links/forms/buttons;
- reduced-motion fallback where animations are used.

### 7. Studio automation adapter

**Purpose:** Execute only versioned last-mile recipes.

Commands:

```bash
wixsite studio inspect --cdp-url http://127.0.0.1:9222 --out evidence/studio-map.json
wixsite studio recipe run create-section --recipe recipes/faq-section.yaml --dry-run
wixsite studio recipe run create-section --recipe recipes/faq-section.yaml --execute --approval <token>
wixsite studio verify-save --out evidence/save-state.json
```

Rules:

- Must attach to a dedicated user-approved browser profile/session.
- Must never capture credentials or persist internal tokens.
- Must use recipes with preconditions, not free-form arbitrary clicks.
- Must capture before/after screenshots and save-state evidence.
- Must fail closed on selector drift, unexpected dialogs, or missing preview proof.

### 8. Receipts/evidence ledger

**Purpose:** Make every claim auditable.

Commands:

```bash
wixsite receipts list --run <run-id>
wixsite evidence bundle --run <run-id> --out runs/<run-id>/evidence.zip
wixsite report qa-summary --run <run-id> --out runs/<run-id>/QA-SUMMARY.md
```

Receipt schema:

```json
{
  "timestamp": "...",
  "runId": "...",
  "operation": "...",
  "adapter": "api|git|blocks|studio|human",
  "risk": "...",
  "inputHash": "...",
  "mutationReceipt": {},
  "readback": {},
  "proof": ["screenshot", "previewUrl", "publicUrl", "apiReadback"],
  "rollback": {}
}
```

---

## Commands/modules to build

### Required top-level commands

```bash
wixsite doctor
wixsite auth status
wixsite inventory fetch --site <site-id>
wixsite brief compile <brief.md>
wixsite plan <spec.json>
wixsite route <plan.json>
wixsite apply <routed-plan.json> --dry-run
wixsite apply <routed-plan.json> --execute --approval <token>
wixsite qa responsive --url <url>
wixsite qa seo --url <url>
wixsite qa performance --url <url>
wixsite preview create --source origin-main|local
wixsite publish gate --run <run-id>
wixsite rollback plan --run <run-id>
wixsite github sync-status
wixsite evidence bundle --run <run-id>
```

### Functional modules

1. **Site-spec generator** — brief → typed spec with mobile success criteria.
2. **Page/section generator** — About, FAQ, product, portfolio, policy/legal, landing sections.
3. **Style token manager** — extract/propose/diff/apply brand tokens.
4. **Responsive QA** — desktop/tablet/phone screenshots and assertions; phone is primary pass/fail.
5. **Content/SEO/legal policy generator** — copy, metadata, schema candidates, disclaimers.
6. **Animation/effects module** — motion tokens, allowed effect recipes, reduced-motion fallback.
7. **Product/portfolio module** — CMS/Stores-backed models plus Studio/Blocks render sections.
8. **Custom app/Blocks scaffold** — reusable widgets/site plugins/dashboard pages.
9. **Publish gate** — explicit approval, QA Manager verdict, repo/live sync check.
10. **Rollback/history** — Git revert, run manifest, Wix history/manual rollback notes.
11. **GitHub sync** — branch status, uncommitted code, remote sync, PR/CI state.

---

## Realistic API vs risky UI automation boundary

### Realistically public/stable

Use these for production automation first:

- Blog/CMS/media/business data operations through REST/SDK/MCP.
- Product/catalog/service data where Wix APIs expose the object and permissions are available.
- Velo/site code through Git Integration + Wix CLI for Sites.
- Reusable custom functionality via Wix CLI Apps, Blocks, site widgets, site plugins, dashboard pages, service plugins.
- Preview/publish through Wix CLI for Sites, gated and with Git sync discipline.
- Public QA via Playwright/Lighthouse-style browser checks.

### Requires risky Studio UI automation or human handoff

Use recipes and proof gates only:

- arbitrary page canvas composition;
- visual header/footer editing;
- page/section placement and alignment;
- editor theme/text-style changes not exposed in Git/API;
- responsive breakpoint-specific layout tuning;
- Studio animation panels/effects;
- app placement and element configuration when not available via API/site plugin status;
- menu/navigation visual configuration;
- anything where Wix changes labels, panels, iframe structure, or generated selectors.

### Do not automate blindly

- publishing to production;
- DNS/domain connections;
- payment, checkout, order, booking, reservation, or live customer data changes;
- legal/policy finalization;
- SEO indexing/canonical/redirect changes on client sites without approval;
- destructive deletes/truncates.

---

## Mandatory QA gates before production-ready claims or AdSaver proof

A run is **not production-ready** until all required gates pass or are explicitly marked blocked:

1. **Plan gate:** typed spec, routed plan, risk classification, rollback path.
2. **Source gate:** official adapter chosen where available; Studio UI only justified in plan.
3. **Local code gate:** tests/typecheck/lint for any CLI or Velo/Blocks code touched.
4. **Mutation receipt gate:** every write has receipt, input hash, adapter, and readback.
5. **Preview gate:** preview URL or public test URL exists; if Wix preview caveat applies, note it.
6. **Responsive gate:** desktop/tablet/phone screenshots; phone must pass no-overflow, readability, CTA, header/menu, tap targets.
7. **Content gate:** copy is complete, non-placeholder, conversion-aligned, and brand-consistent.
8. **SEO gate:** title/meta/H1/internal links/indexability/robots/sitemap/canonical where relevant.
9. **Accessibility gate:** semantic headings, alt text, contrast, focus/tap usability, reduced-motion fallback.
10. **Performance gate:** image sizing, lazy-load where applicable, no obvious blocking embeds, mobile load sanity.
11. **Legal gate:** policies marked draft unless reviewed by qualified human; jurisdiction/client assumptions explicit.
12. **Publish safety gate:** production publish/domain/payment/customer-data changes require explicit operator approval.
13. **GitHub sync gate:** repo clean, branch pushed, CI green/known, no local-code publish desync.
14. **QA Manager verdict:** PASS/FAIL/BLOCKED with evidence bundle before using as client proof.

---

## Suggested iterative execution loop

```text
1. Pick one small slice.
2. Compile high-level brief into spec.
3. Route operations through capability registry.
4. Implement in safest adapter.
5. Run local tests / fixture tests.
6. Execute only on non-client Wix test site.
7. Generate preview/public proof.
8. Run responsive QA with phone as primary pass/fail.
9. QA Manager verdict: PASS / FAIL / BLOCKED.
10. Push to GitHub with evidence and run manifest.
11. Capture learning in docs/capability registry.
12. Move to next slice.
```

Do **not** use AdSaver as client-site proof until the CLI has passed at least one live non-client Wix test proof for the same operation class.

---

## Risks and mitigations

| Risk | Why it matters | Mitigation |
|---|---|---|
| Selector/UI drift | Studio labels/iframes/classes can change and break recipes | versioned recipes, semantic locators first, preflight element map, fail closed, screenshots. |
| Save persistence uncertainty | UI action may not actually save/publish | save-state detector, preview/public readback, before/after proof, no claim from editor UI alone. |
| Mobile regressions | Most visitors are phone users; desktop-first design can fail mobile | mandatory phone QA, mobile success criteria in spec, two phone widths, no-overflow/tap-target checks. |
| Git/live desync | Wix warns local publish can desync live site and GitHub repo | require GitHub sync-status before publish, prefer origin/main preview/publish, block dirty local publishes. |
| Legal/policy liability | Generated policies can be wrong by jurisdiction/business model | mark as draft, require human legal review, capture assumptions and exclusions. |
| Publishing/domain safety | Mistakes can affect real client traffic | publish gate, domain/DNS block, explicit approval, rollback plan, QA Manager verdict. |
| Payment/bookings/customer data harm | Live business data is sensitive and irreversible | default block; test-site only unless explicit scoped approval. |
| Internal endpoint dependency | Unofficial network endpoints can change or violate assumptions | official APIs first, internal fallback only behind risk flag, no token persistence. |
| Animation performance/accessibility | Effects can hurt mobile and users preferring reduced motion | motion token budget, reduced-motion fallback, mobile performance gate. |
| Overbroad “AI can do anything” briefs | Free-form actions are unsafe and untestable | compile to typed spec, route per operation, require receipts/proof. |

---

## Next 5 build slices

1. **Capability registry + router v1**
   - Output: `capabilities/wix-capability-registry.json`, `wixsite route`, risk policy.
   - KPI: 50+ operation mappings; every operation has adapter, risk, proof, rollback.
   - First step: seed from existing `CAPABILITY-REGISTRY-SEED.json` and this brief.

2. **Site-spec generator + plan compiler**
   - Output: `wixsite brief compile`, JSON schema, example About+FAQ spec.
   - KPI: one high-level brief compiles into deterministic plan without mutations.
   - First step: define `site-change.spec.schema.json` and sample briefs.

3. **Responsive QA harness**
   - Output: `wixsite qa responsive`, screenshots/assertions for desktop/tablet/phone.
   - KPI: detects horizontal overflow, mobile CTA/header/readability failures on fixture pages.
   - First step: build local fixture pages and Playwright viewport checks.

4. **Public/stable adapter v1: inventory + CMS/Blog/content receipts**
   - Output: read-only inventory, dry-run content plan, receipt ledger schema.
   - KPI: can prove API readback on test site without Studio UI automation.
   - First step: implement inventory/read-only calls through official MCP/API where credentials permit; otherwise mock fixtures.

5. **Studio last-mile recipe framework**
   - Output: `studio inspect`, `studio recipe run --dry-run`, selector drift detection, save-state proof.
   - KPI: can run one safe recipe on non-client test site and produce before/after/phone proof.
   - First step: formalize recipe YAML with preconditions, selectors, expected UI states, verification steps.

---

## Bottom line

The best CLI is not “professional browser automation.” It is a **professional Wix change compiler and proof engine** that uses browser automation only when Wix gives us no stable API. This gives Dexter/Jacques the range Alej wants—FAQ pages, optimized About copy, professional headers/footers, products, portfolios, design consistency, animations, speed, custom apps—without pretending that Studio canvas editing is a stable public API.
