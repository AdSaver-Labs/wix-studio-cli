# Wix Studio CLI

Safety-first monorepo for two complementary tools:

- `packages/wix-blog-cli` — draft-first Wix Blog CLI with verification receipts, approval-manifest publishing, and post-publish checks
- `packages/wix-studio-ui-cli` — dry-run-first Wix Studio UI CLI for browser-attached editor inspection and controlled UI actions

## Who this repo is for

- operators running Wix workflows from a terminal
- engineers building safer Wix automation
- AI agents that need deterministic CLI steps with explicit stop/go gates

## Safety position

This repository is public-safe by design.

It excludes:
- credentials
- cookies
- tokens
- private browser profiles
- private client receipts
- live client secrets

Both CLIs are designed to default toward read-only, draft-first, or fail-closed behavior.

## Packages

### 1) Wix Blog CLI

Use when the work is article-oriented and should follow:

`manifest -> draft -> verify -> approval -> publish -> verify-public`

Quick start:

```bash
cd packages/wix-blog-cli
npm install
npm run check
npm run smoke
```

Docs:
- `packages/wix-blog-cli/README.md`
- `packages/wix-blog-cli/schemas/article-manifest.schema.json`
- `packages/wix-blog-cli/schemas/client-pack.schema.json`

### 2) Wix Studio UI CLI

Use when the work is visual/editor-only and must go through a browser-attached UI flow.

Quick start:

```bash
cd packages/wix-studio-ui-cli
npm install
npm run check
npm run smoke
```

Docs:
- `packages/wix-studio-ui-cli/README.md`
- `docs/research/wix-studio-ui-cli-route-research.md`

## Human usage

### macOS

1. Install Node.js 22+
2. Install Chrome or Chromium if you need browser-backed commands
3. `npm install`
4. run the package-local README flow

### Windows

1. Install Node.js 22+
2. Install Chrome if you need browser-backed commands
3. Use PowerShell
4. `npm install`
5. run the package-local README flow

## AI-agent usage

Recommended repo-level policy:

- use `wix-blog-cli` for content/draft/publish workflows
- use `wix-studio-ui-cli` for editor/UI inspection work
- always run dry-run or validation commands first
- require human approval before any irreversible publish-like step
- keep receipts/evidence so later runs can resume safely

## Recommended command patterns for agents

### Blog workflow

```bash
wix-blog status --client <id>
wix-blog next --client <id>
wix-blog validate-manifest --client <id> --manifest <file>
wix-blog prepare-packet --client <id> --manifest <file>
# wait for explicit human approval
wix-blog publish --client <id> --draft-receipt <verified> --approval-manifest <approved>
wix-blog verify-public --receipt <publish-receipt>
```

### Wix Studio UI workflow

```bash
wix-studio-ui inspect --dry-run
wix-studio-ui verification --dry-run
wix-studio-ui chrome-pages --execute --port 9222
```

## Monorepo checks

From repo root:

```bash
npm install
npm run check
npm run smoke
```

## Architecture

Hybrid route:

1. official Wix APIs where supported
2. CLI + structured manifests for deterministic workflows
3. browser/CDP automation only when the Wix surface is editor-only

See `docs/research/wix-studio-ui-cli-route-research.md`.
