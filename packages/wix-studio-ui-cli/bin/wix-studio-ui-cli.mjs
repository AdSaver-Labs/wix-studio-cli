#!/usr/bin/env node
import { inspectScript, elementMapScript, clickByLabelScript, textEditScript, saveStateDetectScript } from '../src/dom-recipes.mjs';
import { CdpClient, discoverPagesFromPort } from '../src/cdp-client.mjs';
import { assertAllowed } from '../src/risk-policy.mjs';
import { defaultEvidencePath, logEvidence, writeArtifact } from '../src/evidence.mjs';

const COMMANDS = new Set(['inspect', 'snapshot', 'element-map', 'click-by-label', 'text-edit', 'responsive-mode', 'save-state-detect', 'verification', 'chrome-pages']);

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith('--')) { args._.push(token); continue; }
    const [rawKey, inlineValue] = token.slice(2).split('=');
    const key = rawKey.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    if (inlineValue !== undefined) args[key] = inlineValue;
    else if (argv[i + 1] && !argv[i + 1].startsWith('--')) args[key] = argv[++i];
    else args[key] = true;
  }
  return args;
}

function help() {
  return `wix-studio-ui-cli v0.1.0

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
`;
}

async function withCdp(args, fn) {
  const client = new CdpClient({ cdpUrl: args.cdpUrl, timeoutMs: Number(args.timeoutMs || 8000) });
  await client.connect();
  try { return await fn(client); }
  finally { await client.close(); }
}

function jsonOut(obj) {
  console.log(JSON.stringify(obj, null, 2));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args.h || args._.length === 0) { console.log(help()); return; }
  const command = args._[0];
  if (!COMMANDS.has(command)) throw new Error(`Unknown command: ${command}\n\n${help()}`);

  const execute = args.execute === true && args.dryRun !== true;
  const evidencePath = args.evidence || defaultEvidencePath(command);
  const gate = assertAllowed({ command, options: args, execute });
  await logEvidence(evidencePath, { phase: 'start', command, execute, gate, args: sanitizeArgs(args) });

  if (command === 'chrome-pages') {
    if (!execute) {
      const result = { dryRun: true, wouldDiscover: `http://127.0.0.1:${args.port || 9222}/json`, evidencePath };
      await logEvidence(evidencePath, { phase: 'dry-run', result });
      jsonOut(result); return;
    }
    const pages = await discoverPagesFromPort(Number(args.port || 9222));
    await logEvidence(evidencePath, { phase: 'result', count: pages.length });
    jsonOut({ pages, evidencePath }); return;
  }

  if (!execute) {
    const plan = dryRunPlan(command, args, gate, evidencePath);
    await logEvidence(evidencePath, { phase: 'dry-run', plan });
    jsonOut(plan); return;
  }

  const result = await runCommand(command, args);
  await logEvidence(evidencePath, { phase: 'result', result });
  jsonOut({ command, result, evidencePath });
}

function dryRunPlan(command, args, gate, evidencePath) {
  return {
    command,
    dryRun: true,
    risk: gate.classification,
    evidencePath,
    plannedAction: plannedAction(command, args),
    executeHint: 'Add --execute with --cdp-url only after confirming target tab, risk, and rollback path. High-risk intents also require --approval-token.'
  };
}

function plannedAction(command, args) {
  switch (command) {
    case 'inspect': return 'Would read page title/url and up to 80 visible controls from attached Chrome tab.';
    case 'snapshot': return `Would capture screenshot${args.out ? ` to ${args.out}` : ''}.`;
    case 'element-map': return `Would map visible controls/inputs${args.out ? ` to ${args.out}` : ''}.`;
    case 'click-by-label': return `Would click visible control matching label: ${args.label || '[missing --label]'}.`;
    case 'text-edit': return `Would edit ${args.selector || args.label || '[missing --selector/--label]'} with ${String(args.text || '').length} chars.`;
    case 'responsive-mode': return `Would switch or prepare responsive mode recipe for mode=${args.mode || 'desktop/tablet/mobile not specified'}.`;
    case 'save-state-detect': return 'Would scan visible text for Saved/Saving/Unsaved/Draft/Publish/Preview state.';
    case 'verification': return 'Would emit verification checklist for before/after screenshots, save-state, responsive preview, and evidence log.';
    default: return 'Would perform read-only local planning.';
  }
}

async function runCommand(command, args) {
  return withCdp(args, async (client) => {
    if (command === 'inspect') return valueOf(await client.evaluate(inspectScript()));
    if (command === 'element-map') {
      const map = valueOf(await client.evaluate(elementMapScript()));
      if (args.out) await writeArtifact(args.out, JSON.stringify(map, null, 2));
      return { count: map.length, map: args.out ? undefined : map, out: args.out || null };
    }
    if (command === 'snapshot') {
      await client.send('Page.enable');
      const shot = await client.send('Page.captureScreenshot', { format: args.format || 'png', captureBeyondViewport: true });
      if (args.out) await writeArtifact(args.out, shot.data, 'base64');
      return { captured: true, out: args.out || null, bytesBase64: args.out ? undefined : shot.data.length };
    }
    if (command === 'click-by-label') return valueOf(await client.evaluate(clickByLabelScript(required(args.label, '--label'))));
    if (command === 'text-edit') return valueOf(await client.evaluate(textEditScript({ selector: args.selector, label: args.label, text: args.text || '' })));
    if (command === 'save-state-detect') return valueOf(await client.evaluate(saveStateDetectScript()));
    if (command === 'responsive-mode') {
      const viewport = viewportFor(args.mode || 'desktop');
      await client.send('Emulation.setDeviceMetricsOverride', { ...viewport, deviceScaleFactor: 1, mobile: viewport.mobile });
      return { ok: true, mode: args.mode || 'desktop', viewport };
    }
    if (command === 'verification') return verificationChecklist(args);
    throw new Error(`Unsupported command execution: ${command}`);
  });
}

function viewportFor(mode) {
  if (mode === 'mobile') return { width: 390, height: 844, mobile: true };
  if (mode === 'tablet') return { width: 820, height: 1180, mobile: true };
  return { width: 1440, height: 1000, mobile: false };
}

function verificationChecklist(args) {
  return {
    target: args.target || 'Wix Studio Editor tab',
    requiredEvidence: [
      'before snapshot',
      'element map with target label/selector',
      'dry-run plan JSONL entry',
      'post-action save-state-detect result',
      'desktop/tablet/mobile preview screenshots for visual changes',
      'rollback note before publish-impacting or destructive actions'
    ],
    blockedWithoutApproval: ['publish', 'delete/remove/truncate', 'domain/DNS', 'payment/checkout/order/booking', 'SEO/indexing/canonical/redirect']
  };
}

function valueOf(runtimeResult) {
  return runtimeResult?.result?.value ?? runtimeResult;
}

function required(value, name) {
  if (!value) throw new Error(`Missing required option ${name}`);
  return value;
}

function sanitizeArgs(args) {
  const copy = { ...args };
  if (copy.approvalToken) copy.approvalToken = '[redacted]';
  if (copy.cdpUrl) copy.cdpUrl = '[provided]';
  return copy;
}

main().catch((err) => {
  console.error(JSON.stringify({ ok: false, error: err.message, code: err.code || 'ERROR', classification: err.classification || null }, null, 2));
  process.exitCode = err.code === 'APPROVAL_REQUIRED' ? 3 : 1;
});
