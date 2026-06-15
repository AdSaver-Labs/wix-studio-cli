# Wix Blog CLI

Safety-first CLI for Wix blog workflows:
- create or update drafts
- verify draft quality from Wix readback
- generate a publish approval manifest
- publish only when approval is explicit
- verify the public page after publish

## Safety model

This package is fail-closed by default.

- No legacy direct publish path
- No force-publish path
- `publish` requires an approval manifest with `approved=true`
- Required-image clients must prove real image evidence
- Verification receipts are hash-bound so publish cannot silently drift from what QA approved

## What this package is for

Use this when you want a repeatable Wix-first article workflow where the article body lives in Wix drafts/posts and local files keep only manifests, receipts, and evidence.

## What this package is not

This repo does **not** include credentials, cookies, client secrets, private site IDs, or private client receipts.

You bring:
- your own Wix account access
- your own Chrome/Chromium session
- your own client packs and article manifests

## Install

### macOS

```bash
brew install node
cd packages/wix-blog-cli
npm install
```

If you want browser-backed Wix commands, also make sure Chrome or Chromium is installed.

### Windows

1. Install Node.js 22+
2. Open PowerShell
3. Run:

```powershell
cd packages/wix-blog-cli
npm install
```

If you want browser-backed Wix commands, install Google Chrome or Chromium.

## Quick checks

```bash
npm run check
npm run smoke
```

## Human terminal usage

### 1) Create a client pack

Create:

```text
clients/<client-id>/client-pack.json
```

Start from `examples/clients/example-client/client-pack.json`.

### 2) Create an article manifest

Start from:

```text
examples/article-manifest.example.json
```

### 3) Inspect current safe status

```bash
wix-blog status --client example-client
wix-blog next --client example-client
```

### 4) Validate the manifest before touching Wix

```bash
wix-blog validate-manifest --client example-client --manifest examples/article-manifest.example.json
```

### 5) Create drafts in Wix

```bash
wix-blog create-wix-drafts --client example-client --manifest examples/article-manifest.example.json --out receipts/example-create.json
```

### 6) Verify draft readback from Wix

```bash
wix-blog verify-wix-drafts --client example-client --receipt receipts/example-create.json --out receipts/example-verify.json
```

### 7) Generate approval template

```bash
wix-blog approval-template --client example-client --receipt receipts/example-verify.json --out receipts/example-approval.json
```

### 8) Publish only after explicit approval

Edit the approval file so it contains:
- `approved: true`
- `publishAfterQa: true`
- `qa.status: "PASS"`

Then run:

```bash
wix-blog publish --client example-client --draft-receipt receipts/example-verify.json --approval-manifest receipts/example-approval.json --out receipts/example-publish.json
```

### 9) Verify public output

```bash
wix-blog verify-public --receipt receipts/example-publish.json --out receipts/example-public-verify.json
wix-blog verify-rendered --receipt receipts/example-publish.json --out receipts/example-rendered-verify.json
```

## AI-agent usage

This CLI is intentionally structured so an agent can use it safely in small deterministic steps.

Recommended loop:

1. `status --client <id>`
2. `next --client <id>`
3. `validate-manifest --client <id> --manifest <file>`
4. `prepare-packet --client <id> --manifest <file>`
5. wait for human approval
6. `publish --client <id> --draft-receipt <verified> --approval-manifest <approved>`
7. `verify-public --receipt <publish-receipt>`

### Agent rules

- Never publish without an approval manifest
- Treat `FAIL`, `BLOCKED`, and `APPROVAL_MANIFEST_INVALID` as stop states
- Persist receipts so later runs can resume safely
- Prefer `prepare-packet` for a compact create/update → verify → approval-template bundle
- Use `verify-rendered` or `verify-public` before claiming success

## Browser / CDP setup

Browser-backed commands use an existing logged-in browser session.

Set:

```bash
export WIX_CDP_URL=http://127.0.0.1:9222
```

Windows PowerShell:

```powershell
$env:WIX_CDP_URL = 'http://127.0.0.1:9222'
```

Then start Chrome/Chromium with remote debugging.

### macOS example

```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222
```

### Windows example

```powershell
& 'C:\Program Files\Google\Chrome\Application\chrome.exe' --remote-debugging-port=9222
```

Open the Wix dashboard in that browser and sign in before running create/update/verify/publish commands.

## Environment variables

- `WIX_CDP_URL` — CDP endpoint, default `http://127.0.0.1:18800`
- `WIX_BLOG_WORKSPACE` — root folder for local state
- `WIX_BLOG_CLIENT_ROOT` — defaults to `<workspace>/clients`
- `WIX_BLOG_RECEIPTS_ROOT` — defaults to `<workspace>/receipts`
- `WIX_BLOG_DATA_DIR` — legacy planning data directory
- `WIX_BLOG_MAIN_EVIDENCE_FILE` — optional evidence append target

## Command summary

```bash
wix-blog --help
```

Key client-workflow commands:
- `discover-site-config`
- `apply-site-config`
- `status`
- `next`
- `validate-manifest`
- `prepare-packet`
- `create-wix-drafts`
- `update-wix-drafts`
- `verify-wix-drafts`
- `verify-rendered`
- `approval-template`
- `publish`
- `verify-public`

## Schemas and docs

- `schemas/article-manifest.schema.json`
- `schemas/client-pack.schema.json`
- `docs/WIX-FIRST-BLOG-AUTOMATION-STANDARD.md`

## Legacy commands

The CLI still contains older planning/draft helpers for the original bilingual blog workflow. They remain available, but the approval-manifest client workflow above is the primary supported path.
