# Test Results — Wix Studio UI CLI

UTC: 2026-06-14T10:27:32Z

## Commands

```

> wix-studio-ui-cli@0.1.0 check
> node --check bin/wix-studio-ui-cli.mjs && for f in src/*.mjs; do node --check "$f"; done


> wix-studio-ui-cli@0.1.0 smoke
> node bin/wix-studio-ui-cli.mjs --help && node bin/wix-studio-ui-cli.mjs inspect --dry-run && node bin/wix-studio-ui-cli.mjs verification --dry-run

wix-studio-ui-cli v0.1.0

Safe CLI scaffold for Wix Studio Editor UI control. Dry-run by default.

Usage:
  wix-studio-ui <command> [options]

Commands:
  inspect             Read title/url and visible control labels
  snapshot            Capture screenshot via CDP Page.captureScreenshot
  element-map         Build visible element map for labels/inputs/buttons
  click-by-label      Click a UI control by visible/ARIA label (requires --execute)
  text-edit           Edit input/textarea/contenteditable by --selector or --label (requires --execute)
  responsive-mode     Planned responsive viewport switch recipe; dry-run scaffold
  save-state-detect   Detect visible saved/saving/unsaved state text
  verification        Emit planned verification checklist/evidence bundle
  chrome-pages        List debuggable Chrome pages from --port (default 9222)

Global options:
  --dry-run           Force dry run (default)
  --execute           Actually run command against --cdp-url; still blocks high-risk intents
  --cdp-url <url>     Chrome DevTools page WebSocket URL
  --port <n>          Chrome remote debugging discovery port for chrome-pages
  --evidence <path>   JSONL evidence path (default: evidence/<timestamp>-<command>.jsonl)
  --out <path>        Artifact output path for screenshot/element map
  --approval-token x  Required for publish/delete/domain/payment/SEO-like intents

Examples:
  node bin/wix-studio-ui-cli.mjs chrome-pages --port 9222
  node bin/wix-studio-ui-cli.mjs inspect --cdp-url ws://127.0.0.1:9222/devtools/page/ABC --execute
  node bin/wix-studio-ui-cli.mjs click-by-label --label Preview --execute --cdp-url ws://...

{
  "command": "inspect",
  "dryRun": true,
  "risk": {
    "risk": "read_only",
    "approvalRequired": false,
    "reasons": []
  },
  "evidencePath": "packages/wix-studio-ui-cli/evidence/2026-06-14T10-27-33-574Z-inspect.jsonl",
  "plannedAction": "Would read page title/url and up to 80 visible controls from attached Chrome tab.",
  "executeHint": "Add --execute with --cdp-url only after confirming target tab, risk, and rollback path. High-risk intents also require --approval-token."
}
{
  "command": "verification",
  "dryRun": true,
  "risk": {
    "risk": "read_only",
    "approvalRequired": false,
    "reasons": []
  },
  "evidencePath": "packages/wix-studio-ui-cli/evidence/2026-06-14T10-27-33-685Z-verification.jsonl",
  "plannedAction": "Would emit verification checklist for before/after screenshots, save-state, responsive preview, and evidence log.",
  "executeHint": "Add --execute with --cdp-url only after confirming target tab, risk, and rollback path. High-risk intents also require --approval-token."
}
publish dry-run exit: 0
publish execute without approval exit: 3
{
  "ok": false,
  "error": "Approval required: Publishing live site changes requires explicit operator approval.",
  "code": "APPROVAL_REQUIRED",
  "classification": {
    "risk": "approval_required",
    "approvalRequired": true,
    "reasons": [
      "Publishing live site changes requires explicit operator approval."
    ]
  }
}
```

## Status

- PASS: Node syntax checks for CLI and all src modules.
- PASS: Help, inspect dry-run, and verification dry-run smoke commands.
- PASS: High-risk Publish label is allowed as dry-run planning only.
- PASS: High-risk Publish execution is blocked without approval.
- BLOCKED: Live Wix Studio read-only attach proof requires an existing Chrome/Wix session and was intentionally not attempted in this scaffold slice.

## 2026-06-22 16:10 UTC — adapter contract slice

- PASS: `npm run -s check && npm run -s smoke && npm run -s test:guardrails`.
- PASS: `adapter-contracts` emits versioned API/Git/Studio/QA/Publish/Human contracts with write executors fail-closed.
- PASS: `approval-manifest-template` emits a non-approved manifest template bound to an exact action fingerprint.
- PASS_WITH_BLOCKERS: `apply-plan` packets now include adapter execution contracts; real write executors remain intentionally fail-closed until non-client proof + approval gates pass.
