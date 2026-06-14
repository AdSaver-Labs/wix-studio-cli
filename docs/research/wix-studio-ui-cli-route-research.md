# Donatello Route Research — Wix Studio UI CLI

**Date:** 2026-06-14  
**Owner lane:** Research  
**Consumer:** Jacques / Engineering  
**Scope:** Research and route recommendation only. No live Wix sites were mutated, published, deleted, or messaged.

## Executive recommendation

Build the Wix Studio UI CLI as a **hybrid Wix control-plane orchestrator**, not as a pure “click the editor” bot.

**Recommended route:**

1. **Official Wix APIs / SDK / MCP for structured objects** — site inventory, Blog, CMS/data, media, forms submissions, bookings, eCommerce, custom embeds, site URLs, docs/schema lookup.
2. **Git Integration + Wix CLI for Sites for code** — Velo/backend/frontend code, HTTP functions, web methods, routers, jobs, global CSS, npm packages, preview/publish workflow, rollback through Git.
3. **Playwright/CDP Studio UI adapter only for editor-only surfaces** — page creation, page/section layout, responsive breakpoint design, element selection/properties, menus, dataset wiring, visual/editor-only SEO settings.
4. **Human approval + visual QA around all publish-impacting or destructive operations.**

**Bottom line:** A CLI that can control “as much of Wix Studio as technically possible” is feasible, but only if it routes work across APIs, Git/CLI, and browser recipes. A browser-only CLI will be brittle, slow, hard to roll back, and unsafe for live sites.

**Confidence:** Medium-high for the hybrid architecture; medium for broad Studio UI automation; low for fully general arbitrary canvas automation without recipe constraints.  
**Expected impact:** High — gives Jacques a practical route to a usable Wix automation system without overpromising editor internals.  
**Effort:** High.  
**Risk:** Medium/high unless gated by draft/test-site, screenshots, and approvals.

---

## 1. Research question

What is the best route for building a CLI that can control the Wix Studio Editor UI as much as technically possible, while respecting official Wix limits, auth/session realities, editor brittleness, and rollback/safety needs?

---

## 2. Evidence reviewed

### Local / existing OpenClaw artifacts

- `knowledge/projects/wix-full-capability-expansion-2026-06-03/REPORT.md`
- `knowledge/skills/wix-platform-execution-routing-for-magentic.md`
- `knowledge/playbooks/wix-blog-automation-token-saving-playbook.md`
- `agents/magentic/MAGENTIC_WIX_AUTOMATION_GUIDELINE.md`
- `agents/magentic/wix_api.js`
- `agents/magentic/inspect_wix.js`
- root-level Wix/Studio Playwright scripts such as `renova_open_editor.js`, `renova_editor_inspect.js`, `renova_*`, and earlier blog/editor helper scripts.

### External docs checked 2026-06-14

- Wix API Reference: `https://dev.wix.com/docs/api-reference`
- Wix MCP: `https://dev.wix.com/docs/api-reference/articles/ai-tools/wix-mcp/about-the-wix-mcp.md`
- Wix CLI: `https://dev.wix.com/docs/wix-cli/guides/about-the-wix-cli`
- Git Integration & Wix CLI for Sites: `https://dev.wix.com/docs/develop-websites/articles/workspace-tools/developer-tools/git-integration-wix-cli-for-sites/about-git-integration-wix-cli-for-sites`
- Wix CLI for Sites commands: `https://dev.wix.com/docs/develop-websites/articles/workspace-tools/developer-tools/git-integration-wix-cli-for-sites/wix-cli-for-sites-commands`
- Wix IDE: `https://dev.wix.com/docs/develop-websites/articles/workspace-tools/velo-workspace/wix-ide/wix-studio-about-the-wix-ide`
- Wix Studio breakpoints: `https://support.wix.com/en/article/studio-editor-managing-breakpoints`
- Playwright best practices: `https://playwright.dev/docs/best-practices`
- Playwright authentication: `https://playwright.dev/docs/auth`
- Playwright screenshots: `https://playwright.dev/docs/screenshots`

---

## 3. Official Wix CLI/API/SDK limits

### What official Wix surfaces handle well

| Area | Best route | Practical CLI action |
|---|---|---|
| Blog posts/drafts/categories/tags | REST/SDK/API, optionally MCP schemas | `wixctl blog draft/update/publish-plan`, readback QA |
| CMS collections/items | REST/SDK Data Collections + Data Items | schema/item diff, import, patch, consistent-read verification |
| Media | Media API | upload, folder management, file IDs/URLs, asset reuse |
| Forms submissions | Forms API | read/export/count/update submissions; visual form layout likely editor-side |
| Bookings/eCommerce | REST/SDK/service plugins | catalog/services/orders/availability workflows; live orders/bookings require explicit approval |
| Custom embeds/scripts | Custom Embeds API | create/enable/disable snippets with consent category discipline |
| Site URLs / account/site discovery | APIs/MCP | inventory, preview/editor/published URL handoff |
| Velo/site code | Git Integration + Wix CLI for Sites | local code edits, npm packages, preview, publish, Git rollback |
| Apps/extensions/widgets | Wix CLI/app extension architecture | reusable components and dashboard/service plugin features |

### Key official limitations and caveats

1. **General visual canvas editing is not exposed as a broad public REST/SDK API.** Official APIs cover many business/data/code surfaces, but arbitrary Studio page layout, element placement, responsive breakpoint tweaks, page menus, and many editor settings remain Studio UI actions.
2. **The modern Wix CLI is not the same as Wix CLI for Sites.** Wix docs state the general Wix CLI is for Wix apps and Wix-managed headless projects; Wix site development should use **Git Integration & Wix CLI for Sites**.
3. **Wix CLI for Sites is code-oriented.** Documented commands include `wix dev`, `wix install`, `wix update`, `wix uninstall`, `wix preview`, `wix publish`, `wix login`, `wix whoami`, and `wix logout`. It is not a full Studio canvas control API.
4. **Preview has caveats.** Wix docs say `wix preview` requires the site to have been previously published, is not a Release Manager test site, and uses live versions of HTTP functions. HTTP function changes need commit/push + functional testing, not preview alone.
5. **Publishing from local code can desync repo/live site.** Wix docs warn publishing local code can leave the live site and GitHub repo out of sync if local changes are not pushed.
6. **Wix IDE and Git Integration have compatibility constraints.** Wix IDE docs note the browser IDE is unavailable for sites using Git Integration; code workflows must avoid concurrent editor/local-code conflicts.
7. **Data/content writes need readback and consistency handling.** Existing knowledge notes Wix Data eventual consistency and per-item update cautions; the CLI should prefer patch/update diffs and bounded verification retries.

**Conclusion:** official tooling should be the CLI’s first layer, but cannot replace Studio UI automation for visual/editor-only tasks.

---

## 4. Wix Studio UI automation approaches

### A. OpenClaw/browser tool recipes

Use this for supervised, small editor tasks when operating in the existing OpenClaw environment. It is good for interactive inspection, screenshots, login checks, and manual handoff. It is not ideal as the durable engine of a productized CLI because the agent snapshots are token-heavy and may not expose enough low-level control.

### B. Playwright over a launched browser profile

Use Playwright as the core automation engine for the CLI:

- persistent user data directory for a dedicated Wix automation profile;
- `storageState` or profile cookies for auth reuse, stored outside Git and workspace artifacts;
- role/text/label locators where available;
- generated locators during recipe authoring;
- screenshots/traces/videos for evidence;
- isolated execution contexts where possible.

Playwright docs recommend user-visible locators, web-first assertions, isolated tests, and protected auth state. Those practices map well to a Wix Studio automation harness.

### C. Playwright `connectOverCDP` into an existing Chromium

Existing local scripts already prove a CDP route:

- `agents/magentic/inspect_wix.js` connects to `http://127.0.0.1:18800`, attaches to the existing browser, logs Wix dashboard/editor requests and responses, reloads pages, and inspects visible text.
- `agents/magentic/wix_api.js` attaches to an authenticated browser session to capture Wix auth/XSRF headers for direct blog API calls.
- `renova_open_editor.js` and `renova_editor_inspect.js` use CDP to open Wix editor/dashboard pages and inspect frames.

This is useful for **MVP and in-house automation** because it reuses a live logged-in session. For a safer long-term CLI, Jacques should still wrap it behind an adapter and migrate toward dedicated profiles + official auth where available.

### D. Network-level internal API discovery

The current Magentic blog automation already uses internal authenticated dashboard endpoints for gaps not yet wired through official API auth. This can be highly effective but should be treated as a **fallback adapter**, not the primary foundation:

- endpoints may change without notice;
- headers/tokens must not be persisted;
- official APIs should replace internal endpoints when credentials/scopes are available;
- write operations need fail-closed QA and rollback evidence.

### E. Visual computer-use automation

Canvas-level visual clicking/image recognition can cover some cases where DOM/ARIA is weak, but should be the last layer. It is expensive, fragile, hard to verify, and risky around destructive controls.

---

## 5. DOM/canvas/editor challenges

Wix Studio is a complex editor, not a simple public web app form. Expected challenges:

1. **Nested frames and editor shells.** Existing inspection scripts show multiple frames; controls and canvas content may live in different contexts.
2. **Canvas may not expose stable semantic DOM.** Editor canvas interactions can involve transformed layers, overlays, selection handles, generated IDs, and non-user-facing class names.
3. **Dynamic labels and async panels.** Wix may change labels, data hooks, panel timing, modals, A/B UI states, or lazy-loaded controls.
4. **Responsive breakpoint state is editor-specific.** Wix Studio supports default mobile/tablet/desktop breakpoints and up to 6 breakpoints per page/global section. Deleting a breakpoint deletes its layout/design properties and can reduce responsiveness.
5. **Selection state matters.** The same panel can mean different things depending on selected page, section, element, breakpoint, or layer.
6. **Undo/persistence uncertainty.** A click may change editor state but not persist; verification must check preview/rendered output, not just that a panel displays expected text.
7. **Code/design concurrency.** Local Editor, browser IDE, Git integration, and Studio can conflict if multiple editing surfaces are active.
8. **Publish controls are nearby.** Automation must detect and block publish/delete/checkout/payment/bookings changes unless explicitly approved.

**Implication for Jacques:** do not attempt “arbitrary natural-language UI control” first. Start with narrow, versioned recipes with preconditions, selectors, screenshots, and escape hatches.

---

## 6. Proposed CLI architecture

### Command shape

Use one CLI, multiple adapters:

```bash
wix-studioctl doctor
wix-studioctl inventory --site <siteId>
wix-studioctl plan <spec.yaml> --out runs/<id>/plan.json
wix-studioctl apply <plan.json> --dry-run
wix-studioctl apply <plan.json> --adapter api|git|studio --no-publish
wix-studioctl studio open --site <siteId>
wix-studioctl studio recipe create-page-from-template --site <siteId> --spec page.yaml --draft-only
wix-studioctl qa preview --url <previewUrl> --desktop --tablet --mobile
wix-studioctl evidence bundle --run <id>
```

### Internal layers

```text
Request/spec
  -> capability registry
  -> site/session inventory
  -> plan/diff/risk classifier
  -> approval gate if needed
  -> adapter execution:
       official API/SDK/MCP | Git/Wix CLI for Sites | Studio Playwright/CDP | human handoff
  -> verification harness
  -> evidence bundle
  -> rollback notes
```

### Capability registry fields

```yaml
operation: studio.page.create_from_template
preferred_adapter: studio
risk: reversible
approval_required: false
preconditions:
  - authenticated_wix_profile
  - target_site_confirmed
  - no_publish
smallest_proof: create one unpublished test page from known template
verification:
  - editor after screenshot
  - preview desktop/tablet/mobile screenshots
  - page title/URL readback if available
rollback:
  - duplicate/remove test page only after approval
  - or revert through Wix Site History for page/layout changes where applicable
fallback: human handoff with editor URL and exact remaining action
```

### Why this architecture is best

- Avoids using browser automation where APIs are safer.
- Gives Jacques a clean boundary between reliable and brittle work.
- Makes every mutation traceable by plan/evidence/rollback.
- Lets the CLI grow recipe-by-recipe instead of pretending it can control unknown UI states.

---

## 7. Auth/session handling

### Recommended auth tiers

1. **Official API keys/OAuth/scoped credentials** for REST/SDK/MCP operations. Store in a secret manager, not workspace files.
2. **Wix CLI login** for Git/Wix CLI for Sites code workflows. Use `wix whoami` in `doctor` to verify identity before any publish-capable command.
3. **Dedicated browser automation profile** for Studio UI automation. Do not share a personal browsing profile unless explicitly approved. Store auth state outside Git; treat cookies/storage as secrets.
4. **CDP attach to existing browser** for MVP/internal workflows only. Good for reusing existing login and current local OpenClaw setup; less reproducible for a durable CLI.
5. **Human login handoff** when 2FA, account chooser, CAPTCHA, or insecure-browser rejections occur. The CLI should pause with a URL and resume after auth is restored.

### Auth safety rules

- Never persist captured dashboard headers in project artifacts.
- Never print cookies, auth headers, XSRF tokens, API keys, or storageState contents in logs.
- Add `.gitignore` entries for `.auth/`, `storageState*.json`, traces that may include secrets, and raw HAR files unless redacted.
- `doctor` must show account/site identity before any write.
- If identity is ambiguous, fail closed.

---

## 8. Safety, rollback, and approval design

### Risk tiers

| Tier | Examples | Gate |
|---|---|---|
| Read-only | inventory, screenshots, public preview check | timestamped evidence |
| Draft-safe | create draft blog/page, upload unused media | dry-run + readback |
| Reversible | patch CMS item, add page section, code branch | diff + rollback notes + before/after screenshots |
| Publish-impacting | publish site/post, SEO canonical/indexing changes, active form change | explicit operator approval + pre/post proof |
| Destructive/high-risk | delete pages/data, truncate collections, payments/bookings/eCom live changes | explicit exact-target approval + backup/export + rollback plan |

### Rollback patterns

- **API data/content:** save before-state JSON; patch back or delete created draft/item.
- **CMS data:** export affected items before mutation; do not rely on Wix Site History for live database recovery.
- **Velo/code:** branch per task; commit/diff; rollback via Git revert.
- **Studio layout:** duplicate page before major recipe runs where possible; before screenshots; use Wix Site History only as partial safety net.
- **Publish:** pre-publish evidence bundle, explicit approval, post-publish smoke, rollback trigger.

### Hard blocks

The CLI should refuse to continue when:

- target site/account cannot be verified;
- recipe preconditions fail;
- selector confidence drops below threshold;
- a destructive or publish button appears outside an approved plan;
- preview/public QA cannot prove the result;
- editor opened the wrong site/page;
- auth/session state changed mid-run.

---

## 9. Proof-of-concept steps for Jacques

### POC 0 — Read-only doctor and inventory

**Goal:** prove the CLI can identify the account, site, editor URL, and supported adapters without mutation.

- Implement `doctor`:
  - Node/Playwright available;
  - browser profile path configured;
  - CDP endpoint optional;
  - Wix CLI installed and `wix whoami` works if using Git adapter;
  - API key/MCP config present if using API adapter;
  - output redacts secrets.
- Implement `inventory --read-only`:
  - official API/MCP where available;
  - browser/dashboard fallback only for URLs and page/editor context;
  - save `runs/<timestamp>/inventory.json`.

**Pass gate:** no site mutation; artifact includes target site/account IDs and adapter readiness.

### POC 1 — Studio launch + frame map + screenshot pack

**Goal:** make Studio opening and introspection reliable.

- Open Wix dashboard/editor for a test/dev site.
- Map pages/frames, visible top bar, selected page, current breakpoint if detectable.
- Capture screenshot of editor shell and canvas.
- Save DOM/ARIA/frame summary without tokens.

**Pass gate:** can repeatedly open the same test site and identify wrong-site/wrong-page conditions.

### POC 2 — Non-production “create unpublished test page from template” recipe

**Goal:** first real Studio mutation, still draft-safe.

- Preconditions: dev/test site only; no publish; duplicate/backup where possible.
- Use stable UI recipe to add a page from an existing template or blank page.
- Set page name/title only.
- Capture before/after editor screenshots.
- Open preview and capture desktop/tablet/mobile screenshots.
- Stop before publish.

**Pass gate:** created page is visible in editor/preview evidence; no publish occurred; rollback/handoff documented.

### POC 3 — Element property edit recipe

**Goal:** prove element selection + panel edit can persist.

- On the test page, add/select one known text/button element.
- Change text, link, alt text, or ID where available.
- Verify through preview screenshot/text extraction.

**Pass gate:** preview-visible result matches expected spec.

### POC 4 — Breakpoint QA recipe

**Goal:** automate verification before automating breakpoint edits.

- Capture preview at desktop/tablet/mobile widths.
- Compare against thresholds or visual review checklist.
- Only after QA is stable, attempt controlled breakpoint edits.

**Pass gate:** repeatable screenshot pack with clear viewport metadata.

### POC 5 — API/Git integration into same CLI

**Goal:** prove the orchestrator can route one plan across adapters.

Example plan:

- API: upload media or create CMS item.
- Git/CLI: add Velo helper or global CSS on branch.
- Studio: place/update visual component on unpublished page.
- QA: preview screenshot pack.

**Pass gate:** one evidence bundle shows adapter routing, diff, screenshots, and rollback notes.

---

## 10. Recommended implementation path

### Phase 1 — Foundation

- Build `wix-studioctl` skeleton with adapters: `api`, `git`, `studio`, `qa`.
- Add capability registry and risk classifier.
- Add redacted evidence bundle format.
- Add `doctor` and `inventory`.

**First action:** create the registry and doctor command before writing any editor-click recipe.

### Phase 2 — Studio UI recipe engine

- Playwright persistent context or CDP adapter.
- Recipe DSL: preconditions, steps, expected UI states, forbidden controls, screenshots, recovery.
- Frame-aware locator helpers.
- Selector library generated from real Studio sessions.
- Confidence scoring and human handoff.

### Phase 3 — Safe visual build recipes

Start with:

1. open editor;
2. create/rename unpublished page;
3. add known section/template;
4. update text/image/link in known component;
5. responsive screenshot QA.

Avoid initially:

- arbitrary drag/drop layout from scratch;
- deleting pages;
- publishing;
- eCommerce/bookings/payment operations;
- live client sites.

### Phase 4 — Hybrid full-site workflows

- `site-blueprint.yaml` with pages, content, design tokens, CMS, integrations, code modules.
- Execute each section through the safest adapter.
- Publish remains manual/approval-gated.

---

## 11. Recommendation to Jacques

Jacques should build the Wix Studio UI CLI as a **recipe-driven Playwright/CDP automation layer inside a broader Wix Capability Orchestrator**.

**Do this:**

- Use official APIs/MCP/SDK for structured data and business objects.
- Use Git Integration + Wix CLI for Sites for Velo/code/CSS/npm.
- Use Playwright with a dedicated Wix browser profile for Studio editor-only recipes.
- Keep CDP attach support because the existing OpenClaw environment already proves it works and can reuse active sessions.
- Implement strict no-publish default, target-site confirmation, before/after screenshots, preview QA, and rollback notes.

**Do not do this:**

- Do not build a browser-only “universal Wix clicker.”
- Do not persist session headers or cookies in workspace artifacts.
- Do not publish, delete, or edit live high-risk surfaces from the CLI without explicit approval.
- Do not rely on DOM class names or one-off coordinates as the primary selector strategy.

**Best first deliverable:**

`wix-studioctl doctor + inventory + studio open/frame-map/screenshot + create-unpublished-test-page-from-template recipe` on a non-production site.

### Signal → execution bridge

- **Owner:** Engineering lane / Jacques.
- **Output artifact:** `wix-studioctl` POC with capability registry, doctor, read-only inventory, Studio frame map, and one draft-safe page recipe.
- **Fallback owner:** Operations/human handoff for login, 2FA, and uncertain editor states.
- **KPI:** % of Wix requests routed to API/Git/Studio correctly with evidence and no manual repair.
- **Rollback trigger:** any wrong-site/wrong-page detection, unapproved publish/delete exposure, or preview QA mismatch.
- **Likely misconception to prevent:** “Full Wix Studio CLI = automate every click.” Correct model: deterministic adapters first, Studio browser recipes only for visual/editor-only gaps.

---

## 12. Donatello lesson format

### What

A Wix Studio UI CLI should be a hybrid orchestrator: API/SDK/MCP for structured objects, Git/Wix CLI for code, Playwright/CDP for editor-only visual work.

### Why

Wix has strong official control planes, but no broad public canvas API for arbitrary Studio layout manipulation. Browser automation can fill the gap, but only safely with recipes, evidence, and approval gates.

### How

Build a capability registry, route every operation to the safest adapter, implement Studio recipes with preconditions and screenshots, and fail closed when auth, selectors, or target-site confidence drops.

### First Action

Jacques should implement `wix-studioctl doctor` and a read-only `inventory/frame-map/screenshot` run before any live editor mutation.
