# Implementation Plan — Wix Studio UI CLI

## Phase 0 — Safe Scaffold (done in this slice)

- Create local Node CLI package under `packages/wix-studio-ui-cli/`.
- Implement dry-run default and JSONL evidence logging.
- Implement CDP attach client using Node 22 WebSocket/fetch primitives.
- Implement command contracts:
  - `inspect`
  - `snapshot`
  - `element-map`
  - `click-by-label`
  - `text-edit`
  - `responsive-mode`
  - `save-state-detect`
  - `verification`
- Add risk policy blocking publish/delete/domain/payment/SEO-like intents.
- Run syntax/smoke tests without network or live Wix access.

## Phase 1 — Read-only Wix Studio Proof

- Attach to an already-open Wix Studio Editor tab in system Chrome.
- Run only:
  - `chrome-pages`
  - `inspect`
  - `snapshot`
  - `element-map`
  - `save-state-detect`
- Save artifacts to `engineering/evidence/<run>/`.
- Document actual Wix Studio labels/selectors and UI drift risks.

## Phase 2 — Fixture-Based UI Action Tests

- Add local HTML fixture emulating buttons, panels, editable fields, and save-state text.
- Test `click-by-label`, `text-edit`, `responsive-mode` against fixture via CDP.
- Add assertions around evidence logs and blocker behavior.

## Phase 3 — Wix Studio Recipes

- Convert observed UI paths into named recipes:
  - open page panel
  - select page/section
  - edit text node
  - switch breakpoint
  - preview mode
  - detect unsaved/saved state
- Each recipe must specify prerequisites, risk tier, proof gates, and rollback notes.

## Phase 4 — Approval + OpenClaw Integration

- Replace placeholder approval token with OpenClaw-native approval cards/run manifest.
- Add optional OpenClaw browser automation adapter for cases where the managed browser is safer.
- Ensure logged-in user profile use remains explicit and never hidden.

## Phase 5 — Production Hardening

- Add robust selector strategy, retries, stale UI recovery, and confidence scoring.
- Add visual diff support for desktop/tablet/mobile screenshots.
- Package as internal CLI with versioned runbooks and fixture CI.
