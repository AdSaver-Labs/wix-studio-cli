# Wix Studio UI CLI — Engineering Scaffold

Safe local prototype for inspecting and controlling Wix Studio Editor UI through a user-owned browser session.

## Status

- Prototype only
- Dry-run by default
- Execution requires `--execute`
- High-risk intents remain blocked unless an explicit approval token is supplied

Use this package when the Wix surface is editor-only and an API route is not available.

## Human usage

### macOS

```bash
cd packages/wix-studio-ui-cli
npm install
npm run check
npm run smoke
```

Start Chrome with remote debugging:

```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222
```

### Windows

Open PowerShell:

```powershell
cd packages/wix-studio-ui-cli
npm install
npm run check
npm run smoke
```

Start Chrome with remote debugging:

```powershell
& 'C:\Program Files\Google\Chrome\Application\chrome.exe' --remote-debugging-port=9222
```

## Chrome attach model

Discover debuggable pages:

```bash
node bin/wix-studio-ui-cli.mjs chrome-pages --execute --port 9222
```

Use the page WebSocket URL for read-only inspection:

```bash
node bin/wix-studio-ui-cli.mjs inspect --execute --cdp-url 'ws://127.0.0.1:9222/devtools/page/...'
node bin/wix-studio-ui-cli.mjs element-map --execute --cdp-url 'ws://127.0.0.1:9222/devtools/page/...' --out evidence/element-map.json
node bin/wix-studio-ui-cli.mjs save-state-detect --execute --cdp-url 'ws://127.0.0.1:9222/devtools/page/...'
```

## AI-agent usage

Recommended agent loop:

1. `chrome-pages --execute --port 9222`
2. `inspect --dry-run`
3. `verification --dry-run`
4. confirm target tab and risk class
5. run the minimal `--execute` command needed
6. capture evidence before claiming success

### Agent rules

- Start with dry-run unless the command is purely enumerative
- Prefer inspection and verification commands before click/edit actions
- Treat the browser tab as human-owned state
- Do not perform publish/delete/domain/payment-like actions without explicit human approval
- Keep evidence JSONL files for auditability and rollback reasoning

## Quick checks

```bash
npm run check
npm run smoke
```

## Examples

```bash
node bin/wix-studio-ui-cli.mjs chrome-pages --port 9222
node bin/wix-studio-ui-cli.mjs inspect --cdp-url ws://127.0.0.1:9222/devtools/page/ABC --execute
node bin/wix-studio-ui-cli.mjs click-by-label --label Preview --execute --cdp-url ws://127.0.0.1:9222/devtools/page/ABC
```

Mutation candidates still require dry-run first and evidence capture.
