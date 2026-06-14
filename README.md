# Wix Studio CLI

Experimental, safety-first CLI toolkit for Wix and Wix Studio automation.

## Packages

- `packages/wix-studio-ui-cli` — dry-run-first CLI scaffold for inspecting and carefully controlling Wix Studio Editor UI through a user-owned browser session / CDP attach.
- `packages/wix-blog-cli` — public-safe baseline for repeatable Wix blog planning workflows.

## Safety position

This repository is designed for public use. It intentionally excludes credentials, tokens, cookies, browser profiles, API keys, client/private site data, private Wix site IDs, live publish evidence logs, and destructive automation defaults.

All mutation-capable commands should be dry-run first and require explicit operator approval for risky actions such as publish, delete, domain, payments, checkout, bookings, or broad SEO/indexing changes.

## Current architecture

Hybrid route:

1. Official Wix APIs/MCP where supported.
2. Git + Wix CLI for code and Velo surfaces.
3. Browser/CDP recipes only for Wix Studio editor-only visual/UI work.

See `docs/research/wix-studio-ui-cli-route-research.md`.
