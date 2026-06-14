# Risk Policy

Default mode: dry-run.

## Allowed without approval

- Read-only tab discovery, inspection, element maps, screenshots, save-state detection.
- Local fixture tests.
- Reversible draft-safe UI experiments only when explicitly executed and verified.

## Explicit approval required

- Publish or unpublish.
- Delete/remove/truncate pages, elements, collections, media, data, or apps.
- Domain, DNS, plan, billing, payment, checkout, order, booking, or paid feature changes.
- SEO/indexing/canonical/redirect/meta changes affecting live discoverability.
- Broad custom embeds or script injection.

## Required proof for UI mutations

1. Dry-run plan.
2. Before screenshot.
3. Element map showing target.
4. Action evidence log.
5. Save-state detection.
6. After screenshot.
7. Responsive desktop/tablet/mobile proof when visual layout changes.
8. Rollback note for anything publish-impacting.
