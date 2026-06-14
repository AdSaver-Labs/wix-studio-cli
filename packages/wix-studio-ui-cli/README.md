# Wix Studio UI CLI — Engineering Scaffold

Safe local prototype for inspecting and controlling Wix Studio Editor UI through a user-owned browser session.

## Status

- Prototype only; no live Wix mutations performed.
- Dry-run by default.
- Execution requires `--execute` and a Chrome DevTools page WebSocket URL.
- Publish/delete/domain/payment/SEO-like intents are blocked unless an explicit approval token is supplied by the operator flow.

## Quick local checks

```bash
cd packages/wix-studio-ui-cli
npm run check
npm run smoke
```

## Chrome attach model

Start or use an existing non-headless Chrome profile with remote debugging enabled, for example:

```bash
chromium --remote-debugging-port=9222 --user-data-dir=/tmp/wix-studio-debug-profile
```

Then discover page WebSocket URLs:

```bash
node bin/wix-studio-ui-cli.mjs chrome-pages --execute --port 9222
```

Use the page `webSocketDebuggerUrl` with read-only commands:

```bash
node bin/wix-studio-ui-cli.mjs inspect --execute --cdp-url 'ws://127.0.0.1:9222/devtools/page/...'
node bin/wix-studio-ui-cli.mjs element-map --execute --cdp-url 'ws://...' --out evidence/element-map.json
node bin/wix-studio-ui-cli.mjs save-state-detect --execute --cdp-url 'ws://...'
```

Mutation candidates still require dry-run first and evidence capture.
