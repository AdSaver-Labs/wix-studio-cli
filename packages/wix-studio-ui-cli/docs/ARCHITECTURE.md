# Architecture — Wix Studio UI CLI

## Problem Definition

Wix Studio visual/editor work often lives outside deterministic APIs. The objective is to create a local CLI/harness that can inspect and carefully operate the Wix Studio Editor UI as fully as technically practical, while avoiding unsafe live mutations.

Acceptance target for this slice: architecture + safe scaffold + syntax-tested commands for inspect, snapshot, element-map, click-by-label, text-edit, responsive-mode, save-state-detect, and verification.

## Requirements

Functional:
- Attach to existing user-controlled Chrome via Chrome DevTools Protocol (CDP).
- Support dry-run default for all commands.
- Produce evidence logs for every command.
- Provide read-only inspection commands before any UI action.
- Provide planned UI action commands by label/selector.
- Support responsive viewport modes for desktop/tablet/mobile proof.

Safety:
- No publish/delete/domain/payment/SEO mutation without explicit approval.
- No hidden browser session by default; user-owned/system Chrome is preferred.
- No credential capture, no secret logging, no automatic login flows.
- Pause/escalate if labels/selectors diverge or verification cannot prove persistence.

## Architecture Plan

```text
CLI entrypoint
  ├─ argument parser
  ├─ risk policy gate
  ├─ evidence logger JSONL
  ├─ CDP adapter (optional execution)
  └─ DOM recipes
       ├─ inspect
       ├─ element-map
       ├─ click-by-label
       ├─ text-edit
       ├─ save-state-detect
       └─ responsive viewport
```

Execution channels:
1. **Dry-run planner**: default; prints intended action and risk classification.
2. **CDP attach**: explicit `--execute --cdp-url`; runs scripts in an existing Chrome tab.
3. **Future OpenClaw browser bridge**: map same command contract to OpenClaw browser snapshots/actions where safe.

## Command Design

| Command | Risk | Behavior |
|---|---:|---|
| `chrome-pages` | read-only | Discover CDP page targets from local debugging port. |
| `inspect` | read-only | Read title/url and visible buttons/links. |
| `snapshot` | read-only | Capture screenshot artifact. |
| `element-map` | read-only | Export visible controls/inputs with label and bounding box. |
| `click-by-label` | reversible candidate | Click a control matching visible/ARIA label; dry-run unless execute. |
| `text-edit` | reversible candidate | Fill editable matched by selector/label; dry-run unless execute. |
| `responsive-mode` | reversible candidate | Set CDP viewport emulation to desktop/tablet/mobile. |
| `save-state-detect` | read-only | Scan page text for saved/saving/unsaved signals. |
| `verification` | read-only | Emit required proof checklist. |

## Guardrails

Blocked unless explicit approval token is present:
- publish
- delete/remove/truncate
- domain/DNS changes
- payment/checkout/order/booking changes
- SEO/indexing/canonical/redirect changes

The approval token in this scaffold is not a bypass for real safety review; it is a placeholder for the operator-approved workflow. Future production version should integrate OpenClaw-native approvals and signed run manifests.

## Evidence Model

Every command appends JSONL events:
- timestamp
- command
- sanitized args
- dry-run/execution mode
- risk classification
- result or planned action

Screenshots and maps can be saved with `--out`.

## Testing Strategy

Current gate:
- Node syntax checks for every module.
- Help/smoke dry-run checks.
- Approval blocker test for high-risk labels.

Future gates:
- Fixture HTML page integration tests.
- CDP integration smoke against local static page.
- Wix Studio read-only attach proof with screenshots.
- Selector drift detection tests.

## Deployment Strategy

Keep as local project scaffold initially. Do not publish as a global command until:
- approval integration is implemented;
- fixture tests pass;
- Wix Studio read-only proof is captured;
- mutation commands have rollback recipes and operator-confirmed runbooks.
