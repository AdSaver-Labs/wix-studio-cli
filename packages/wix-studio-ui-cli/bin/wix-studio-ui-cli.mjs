#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { inspectScript, elementMapScript, frameMapScript, clickByLabelScript, textEditScript, saveStateDetectScript, diagnosticsScript, selectorResolveScript } from '../src/dom-recipes.mjs';
import { CdpClient, discoverPagesFromPort } from '../src/cdp-client.mjs';
import { assertAllowed } from '../src/risk-policy.mjs';
import { defaultEvidencePath, logEvidence, writeArtifact } from '../src/evidence.mjs';
import { readSiteSpec, validateSiteSpec, buildImplementationPlan } from '../src/site-spec.mjs';

const COMMANDS = new Set(['inspect', 'snapshot', 'element-map', 'frame-map', 'selector-resolve', 'selectors-evidence', 'click-by-label', 'text-edit', 'responsive-mode', 'save-state-detect', 'diagnostics', 'verification', 'chrome-pages', 'read-only-proof', 'context-pack', 'seo-audit', 'public-seo-proof', 'sitemap-check', 'robots-check', 'site-spec-validate', 'site-build-plan']);

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
  return `wix-studio-ui-cli v0.1.1

Safe CLI scaffold for Wix Studio Editor UI control. Dry-run by default.

Usage:
  wix-studio-ui <command> [options]

Commands:
  inspect             Read title/url, frames, active element, and visible control labels
  snapshot            Capture screenshot via CDP Page.captureScreenshot
  element-map         Build visible element map for labels/inputs/buttons/selectors
  frame-map           Inventory iframes and same-origin frame controls
  selector-resolve    Resolve a label to confidence-scored visible candidates before mutation
  selectors-evidence  Alias for selector-resolve; emits /selectors/evidence-compatible proof
  click-by-label      Click a UI control by visible/ARIA/data label (requires --execute)
  text-edit           Edit input/textarea/contenteditable by --selector or --label (requires --execute)
  responsive-mode     Set CDP viewport to desktop/tablet/mobile for preview evidence
  save-state-detect   Detect visible saved/saving/unsaved/error state text
  diagnostics         Read-only Wix editor failure/hazard scan with remediation guidance
  verification        Emit verification checklist/evidence bundle guidance
  chrome-pages        List debuggable Chrome pages from --port (default 9222)
  read-only-proof     Run a full non-mutating attach proof bundle against a selected Chrome/Wix tab
  context-pack        Alias for read-only-proof; compact one-shot Wix context/proof bundle
  seo-audit           Read-only public SEO extraction for a URL
  public-seo-proof    Alias for seo-audit, intended as completion evidence
  sitemap-check       Read-only fetch of /sitemap.xml
  robots-check        Read-only fetch of /robots.txt
  site-spec-validate  Validate a Wix Studio booking/business site spec before implementation
  site-build-plan     Convert a site spec into a phased, proof-gated implementation plan

Global options:
  --dry-run                Force dry run (default)
  --execute                Actually run command against --cdp-url; high-risk intents stay blocked
  --cdp-url <url>          Chrome DevTools page WebSocket URL
  --port <n>               Chrome remote debugging discovery port for chrome-pages
  --evidence <path>        JSONL evidence path (default: evidence/<timestamp>-<command>.jsonl)
  --out <path>             Artifact output path for screenshot/element/frame map
  --approval-manifest <p>  Required for publish/delete/domain/payment/SEO-like intents; raw tokens are rejected
  --mutation-ok            Required for reversible live UI mutations when no approval manifest is used
  --target-url-contains <s> Select a discovered Chrome page by URL/title substring for read-only-proof
  --spec <path>             Site spec JSON for site-spec-validate/site-build-plan

Examples:
  node bin/wix-studio-ui-cli.mjs chrome-pages --execute --port 9222
  node bin/wix-studio-ui-cli.mjs inspect --execute --cdp-url ws://127.0.0.1:9222/devtools/page/ABC
  node bin/wix-studio-ui-cli.mjs element-map --execute --cdp-url ws://... --out evidence/element-map.json
  node bin/wix-studio-ui-cli.mjs diagnostics --execute --cdp-url ws://...
  node bin/wix-studio-ui-cli.mjs read-only-proof --execute --port 9222 --target-url-contains wix --out evidence/live-readonly
  node bin/wix-studio-ui-cli.mjs site-spec-validate --spec examples/booking-site-spec.example.json
  node bin/wix-studio-ui-cli.mjs site-build-plan --spec examples/booking-site-spec.example.json --out evidence/site-build-plan.json
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
  const gate = await assertAllowed({ command, options: args, execute });
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

  if (['site-spec-validate', 'site-build-plan'].includes(command) && args.dryRun !== true) {
    const result = await runSiteSpecCommand(command, args);
    await logEvidence(evidencePath, { phase: 'result', result });
    jsonOut({ command, result, evidencePath }); return;
  }

  if (!execute) {
    const plan = dryRunPlan(command, args, gate, evidencePath);
    await logEvidence(evidencePath, { phase: 'dry-run', plan });
    jsonOut(plan); return;
  }

  if (['seo-audit', 'public-seo-proof'].includes(command)) {
    const result = await runSeoAudit(args);
    await logEvidence(evidencePath, { phase: 'result', result });
    jsonOut({ command, result, evidencePath }); return;
  }

  if (['sitemap-check', 'robots-check'].includes(command)) {
    const result = await runSiteFileCheck(command, args);
    await logEvidence(evidencePath, { phase: 'result', result });
    jsonOut({ command, result, evidencePath }); return;
  }

  if (command === 'read-only-proof' || command === 'context-pack') {
    const result = await runReadOnlyProof(args, evidencePath);
    await logEvidence(evidencePath, { phase: 'result', result });
    jsonOut({ command, result, evidencePath }); return;
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
    executeHint: 'Add --execute with --cdp-url only after confirming target tab, risk, and rollback path. High-risk intents require --approval-manifest; raw approval tokens are rejected.'
  };
}

function plannedAction(command, args) {
  switch (command) {
    case 'inspect': return 'Would read page title/url, frame inventory, active element, and up to 100 visible controls from attached Chrome tab.';
    case 'snapshot': return `Would capture screenshot${args.out ? ` to ${args.out}` : ''}.`;
    case 'element-map': return `Would map visible controls/inputs/editables and selector hints${args.out ? ` to ${args.out}` : ''}.`;
    case 'frame-map': return `Would inventory iframes and same-origin frame controls${args.out ? ` to ${args.out}` : ''}.`;
    case 'selector-resolve':
    case 'selectors-evidence': return `Would resolve label to confidence-scored selector candidates for /selectors/evidence: ${args.label || '[missing --label]'}.`;
    case 'click-by-label': return `Would click visible control matching label: ${args.label || '[missing --label]'}.`;
    case 'text-edit': return `Would edit ${args.selector || args.label || '[missing --selector/--label]'} with ${String(args.text || '').length} chars, then report local DOM commit status.`;
    case 'responsive-mode': return `Would set viewport for mode=${args.mode || 'desktop'} and collect responsive preview evidence guidance.`;
    case 'save-state-detect': return 'Would scan visible text for Saved/Saving/Unsaved/Error saving/Draft/Publish/Preview state.';
    case 'diagnostics': return 'Would scan Wix editor symptoms: RTE local-only commits, iframe boundaries, inert CMS panels, stale tab/edit locks, save/publish hazards.';
    case 'verification': return 'Would emit verification checklist for before/after screenshots, save-state, responsive preview, hazard review, and evidence log.';
    case 'read-only-proof': return 'Would discover/select a Chrome tab, attach read-only through CDP, and collect inspect/element-map/frame-map/snapshot/save-state/diagnostics artifacts without mutating Wix.';
    case 'context-pack': return 'Would run the same compact read-only proof bundle as read-only-proof in one CDP session.';
    case 'seo-audit':
    case 'public-seo-proof': return `Would fetch public URL and extract title/meta/canonical/robots/hreflang/OG/schema/headings/images/internal links: ${args.url || '[missing --url]'}.`;
    case 'sitemap-check': return `Would fetch sitemap XML for base URL: ${args.baseUrl || args.url || '[missing --base-url/--url]'}.`;
    case 'robots-check': return `Would fetch robots.txt for base URL: ${args.baseUrl || args.url || '[missing --base-url/--url]'}.`;
    case 'site-spec-validate': return `Would validate local site spec: ${args.spec || '[missing --spec]'}.`;
    case 'site-build-plan': return `Would generate proof-gated Wix Studio implementation plan from local site spec: ${args.spec || '[missing --spec]'}.`;
    default: return 'Would perform read-only local planning.';
  }
}

async function runSiteSpecCommand(command, args) {
  const spec = await readSiteSpec(required(args.spec, '--spec'));
  const validation = validateSiteSpec(spec);
  if (command === 'site-spec-validate') {
    const result = { status: validation.status, ok: validation.ok, specFingerprint: spec.fingerprint, businessName: spec.businessName, siteType: spec.siteType, validation };
    if (args.out) await writeArtifact(args.out, JSON.stringify(result, null, 2));
    return result;
  }
  const plan = buildImplementationPlan(spec);
  if (args.out) await writeArtifact(args.out, JSON.stringify(plan, null, 2));
  return plan;
}

async function runReadOnlyProof(args, evidencePath) {
  const outDir = args.out || `evidence/read-only-proof-${new Date().toISOString().replace(/[:.]/g, '-')}`;
  const pages = await discoverPagesFromPort(Number(args.port || 9222));
  const targetNeedle = String(args.targetUrlContains || args.target || 'wix').toLowerCase();
  const page = pages.find((p) => String(`${p.url || ''} ${p.title || ''}`).toLowerCase().includes(targetNeedle)) || pages.find((p) => p.webSocketDebuggerUrl) || null;
  if (!page?.webSocketDebuggerUrl) throw new Error(`No debuggable Chrome page found for target substring "${targetNeedle}". Start system Chrome with --remote-debugging-port=${args.port || 9222} and open Wix Studio first.`);

  const base = `${outDir.replace(/\/$/, '')}/${new Date().toISOString().replace(/[:.]/g, '-')}`;
  const result = await withCdp({ ...args, cdpUrl: page.webSocketDebuggerUrl }, async (client) => {
    const inspect = valueOf(await client.evaluate(inspectScript()));
    const elementMap = valueOf(await client.evaluate(elementMapScript()));
    const frameMap = valueOf(await client.evaluate(frameMapScript()));
    const saveState = valueOf(await client.evaluate(saveStateDetectScript()));
    const diagnostics = enrichDiagnostics(valueOf(await client.evaluate(diagnosticsScript())));
    await client.send('Page.enable');
    const screenshot = await client.send('Page.captureScreenshot', { format: args.format || 'png', captureBeyondViewport: true });

    const artifacts = {
      inspect: await writeArtifact(`${base}-inspect.json`, JSON.stringify(inspect, null, 2)),
      elementMap: await writeArtifact(`${base}-element-map.json`, JSON.stringify(elementMap, null, 2)),
      frameMap: await writeArtifact(`${base}-frame-map.json`, JSON.stringify(frameMap, null, 2)),
      saveState: await writeArtifact(`${base}-save-state.json`, JSON.stringify(saveState, null, 2)),
      diagnostics: await writeArtifact(`${base}-diagnostics.json`, JSON.stringify(diagnostics, null, 2)),
      screenshot: await writeArtifact(`${base}-snapshot.${args.format === 'jpeg' ? 'jpg' : 'png'}`, screenshot.data, 'base64')
    };

    return {
      selectedPage: { title: page.title, url: page.url, id: page.id || null },
      likelyWixStudio: !!(inspect?.isLikelyWixStudio || diagnostics?.wixLikely),
      counts: { buttons: inspect?.buttons?.length || 0, elements: elementMap.length, frames: frameMap.length, hazards: diagnostics?.hazards?.length || 0 },
      saveState: saveState?.state || 'unknown',
      symptoms: diagnostics?.symptoms || [],
      artifacts
    };
  });

  await logEvidence(evidencePath, { phase: 'read-only-proof-artifacts', outDir, selectedPage: result.selectedPage, artifacts: result.artifacts });
  return result;
}

async function runCommand(command, args) {
  return withCdp(args, async (client) => {
    if (command === 'inspect') return valueOf(await client.evaluate(inspectScript()));
    if (command === 'element-map') {
      const map = valueOf(await client.evaluate(elementMapScript()));
      if (args.out) await writeArtifact(args.out, JSON.stringify(map, null, 2));
      return summarizeMapResult(map, args);
    }
    if (command === 'frame-map') {
      const map = valueOf(await client.evaluate(frameMapScript()));
      if (args.out) await writeArtifact(args.out, JSON.stringify(map, null, 2));
      return { count: map.length, frames: args.out ? undefined : map, out: args.out || null };
    }
    if (command === 'selector-resolve' || command === 'selectors-evidence') return { evidenceType: '/selectors/evidence', ...valueOf(await client.evaluate(selectorResolveScript(required(args.label, '--label')))) };
    if (command === 'snapshot') {
      await client.send('Page.enable');
      const shot = await client.send('Page.captureScreenshot', { format: args.format || 'png', captureBeyondViewport: true });
      if (args.out) await writeArtifact(args.out, shot.data, 'base64');
      return { captured: true, out: args.out || null, bytesBase64: args.out ? undefined : shot.data.length };
    }
    if (command === 'click-by-label') return valueOf(await client.evaluate(clickByLabelScript(required(args.label, '--label'))));
    if (command === 'text-edit') return valueOf(await client.evaluate(textEditScript({ selector: args.selector, label: args.label, text: args.text || '' })));
    if (command === 'save-state-detect') return valueOf(await client.evaluate(saveStateDetectScript()));
    if (command === 'diagnostics') return enrichDiagnostics(valueOf(await client.evaluate(diagnosticsScript())));
    if (command === 'responsive-mode') {
      const viewport = viewportFor(args.mode || 'desktop');
      await client.send('Emulation.setDeviceMetricsOverride', { ...viewport, deviceScaleFactor: 1, mobile: viewport.mobile });
      return { ok: true, mode: args.mode || 'desktop', viewport, nextEvidence: ['snapshot', 'save-state-detect', 'verification'] };
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

function enrichDiagnostics(scan) {
  return {
    ...scan,
    guidance: diagnosticsGuidance(scan)
  };
}

function diagnosticsGuidance(scan = {}) {
  const guidance = [
    { symptom: 'RTE accepts text locally but Wix model does not commit', action: 'After text-edit, run save-state-detect; if state stays unknown/unsaved, click outside the RTE or use the editor toolbar Apply/Done control manually, then verify with snapshot and element-map. Treat localValueCommitted as necessary but not sufficient.' },
    { symptom: 'Iframe settings selection', action: 'Run frame-map. If target controls are inside a cross-origin iframe, use the browser/OpenClaw tab or a dedicated Playwright frame locator; do not assume document.querySelector can reach it.' },
    { symptom: 'CMS panel inert/loading', action: 'Use diagnostics to look for CMS + loading/error text. Refresh only after evidence capture; avoid repeated clicks. If inert persists, close duplicate editor tabs and re-open from dashboard.' },
    { symptom: 'Stale tabs/edit locks', action: 'If diagnostics finds locked/another tab/take over text, stop mutation attempts. Use one active editor tab for aprehasuppga@mail.com and capture a snapshot before taking over.' },
    { symptom: 'Save/publish verification', action: 'Never infer success from click completion. Require save-state-detect saved_visible plus before/after snapshots. Publish remains high-risk and blocked without manifest approval.' }
  ];
  if (scan.hazards?.length) guidance.unshift({ symptom: 'High-risk controls visible', action: `Avoid these controls unless explicitly approved: ${scan.hazards.slice(0, 10).join(', ')}` });
  return guidance;
}

function verificationChecklist(args) {
  return {
    target: args.target || 'Wix Studio Editor tab',
    requiredEvidence: [
      'chrome-pages selected URL/title for account/site confirmation, preferably aprehasuppga@mail.com session context when visible',
      'before snapshot',
      'element-map and frame-map with target label/selector',
      'dry-run plan JSONL entry showing action fingerprint for high-risk intents',
      'post-action save-state-detect result with state=saved_visible or documented block',
      'desktop/tablet/mobile preview screenshots for visual changes',
      'diagnostics output confirming no publish/delete/domain/payment hazards were touched',
      'rollback note before publish-impacting or destructive actions'
    ],
    blockedWithoutApprovalManifest: ['publish/unpublish', 'delete/remove/truncate', 'domain/DNS', 'payment/checkout/order/booking', 'SEO/indexing/canonical/redirect'],
    approvalManifestShape: {
      schemaVersion: 1,
      approved: true,
      command: 'text-edit',
      fingerprint: '<from dry-run risk.fingerprint>',
      operator: '<human/operator>',
      rollbackPlan: '<specific rollback path>',
      issuedAt: new Date().toISOString(),
      expiresAt: '<ISO timestamp within approval window>'
    }
  };
}

function summarizeMapResult(map, args) {
  if (args.out) return { count: map.length, out: args.out };
  if (args.full || args.inline) return { count: map.length, map, out: null };
  const max = Number(args.maxElements || 20);
  return {
    count: map.length,
    compact: true,
    topControls: map
      .filter((item) => item.actionable || item.editable || item.selectorHint)
      .slice(0, max)
      .map((item) => ({ index: item.index, label: item.label, tag: item.tag, role: item.role, selectorHint: item.selectorHint, selectorStability: item.selectorStability, editable: item.editable, actionable: item.actionable })),
    fullMapHint: 'Use --full/--inline to print the full map, or --out <path> to write it as an artifact.'
  };
}

async function runSeoAudit(args) {
  const url = required(args.url || args.publicUrl, '--url');
  const res = await fetch(url, { redirect: 'follow', headers: { 'user-agent': 'OpenClaw Wix SEO proof/0.1' } });
  const html = await res.text();
  const base = new URL(res.url || url);
  const title = textOf(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]);
  const metaDescription = attrOf(html, 'meta', 'name', 'description', 'content');
  const robots = attrOf(html, 'meta', 'name', 'robots', 'content') || attrOf(html, 'meta', 'name', 'googlebot', 'content');
  const canonical = attrOf(html, 'link', 'rel', 'canonical', 'href');
  const og = collectMeta(html, /^og:/i);
  const twitter = collectMeta(html, /^twitter:/i);
  const hreflang = [...html.matchAll(/<link\b[^>]*rel=["'][^"']*alternate[^"']*["'][^>]*>/gi)].map((m) => ({ lang: getAttr(m[0], 'hreflang'), href: getAttr(m[0], 'href') })).filter((x) => x.lang || x.href);
  const jsonLdCount = (html.match(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>/gi) || []).length;
  const headings = collectHeadings(html);
  const images = [...html.matchAll(/<img\b[^>]*>/gi)].map((m) => ({ alt: getAttr(m[0], 'alt') || '', src: getAttr(m[0], 'src') || '' }));
  const links = [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi)].map((m) => m[1]).filter(Boolean);
  const internalLinks = links.filter((href) => {
    try { return new URL(href, base).host === base.host; } catch { return false; }
  });
  const issues = [];
  if (!title) issues.push('missing_title');
  if (!metaDescription) issues.push('missing_meta_description');
  if (!canonical) issues.push('missing_canonical');
  if (/noindex/i.test(robots || '')) issues.push('noindex_detected');
  if (!headings.h1.length) issues.push('missing_h1');
  if (images.length && images.some((img) => !img.alt.trim())) issues.push('images_missing_alt');
  if (!og['og:title'] || !og['og:description']) issues.push('incomplete_open_graph');
  if (!jsonLdCount) issues.push('missing_json_ld');
  const result = {
    status: res.status,
    finalUrl: res.url,
    publicProof: true,
    title,
    metaDescription,
    canonical,
    robots: robots || null,
    hreflang,
    og,
    twitter,
    jsonLdCount,
    headings,
    images: { count: images.length, missingAlt: images.filter((img) => !img.alt.trim()).length },
    links: { total: links.length, internal: internalLinks.length },
    issues,
    verdict: issues.length ? 'UNPROVEN_WITH_ISSUES' : 'PASS_READ_ONLY_PUBLIC_SEO_PROOF'
  };
  if (args.out) await writeArtifact(args.out, JSON.stringify(result, null, 2));
  return result;
}

async function runSiteFileCheck(command, args) {
  const raw = required(args.baseUrl || args.url, '--base-url/--url');
  const base = new URL(raw);
  const path = command === 'robots-check' ? '/robots.txt' : '/sitemap.xml';
  const url = new URL(path, `${base.protocol}//${base.host}`).toString();
  const res = await fetch(url, { redirect: 'follow', headers: { 'user-agent': 'OpenClaw Wix SEO proof/0.1' } });
  const text = await res.text();
  const result = { url, status: res.status, bytes: text.length, sample: text.slice(0, Number(args.sampleChars || 1200)) };
  if (args.out) await writeArtifact(args.out, JSON.stringify(result, null, 2));
  return result;
}

function attrOf(html, tag, matchAttr, matchValue, returnAttr) {
  const re = new RegExp(`<${tag}\\b[^>]*>`, 'gi');
  for (const m of html.matchAll(re)) {
    const raw = m[0];
    const value = getAttr(raw, matchAttr);
    if (value && value.toLowerCase() === matchValue.toLowerCase()) return getAttr(raw, returnAttr) || null;
  }
  return null;
}

function collectMeta(html, namePattern) {
  const out = {};
  for (const m of html.matchAll(/<meta\b[^>]*>/gi)) {
    const key = getAttr(m[0], 'property') || getAttr(m[0], 'name');
    if (key && namePattern.test(key)) out[key] = getAttr(m[0], 'content') || '';
  }
  return out;
}

function collectHeadings(html) {
  const h1 = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => textOf(m[1])).filter(Boolean).slice(0, 10);
  const h2 = [...html.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi)].map((m) => textOf(m[1])).filter(Boolean).slice(0, 20);
  return { h1, h2 };
}

function getAttr(tag, name) {
  const re = new RegExp(`${name}\\s*=\\s*(["'])(.*?)\\1`, 'i');
  return tag.match(re)?.[2] || null;
}

function textOf(value = '') {
  return String(value).replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
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
  if (copy.approvalToken) copy.approvalToken = '[rejected/redacted]';
  if (copy.approvalManifest) copy.approvalManifest = '[provided]';
  if (copy.cdpUrl) copy.cdpUrl = '[provided]';
  if (copy.text) { copy.textHash = sha256(String(copy.text)); copy.textLength = String(copy.text).length; copy.text = '[redacted]'; }
  if (copy.label) { copy.labelHash = sha256(String(copy.label)); copy.labelLength = String(copy.label).length; copy.label = '[redacted]'; }
  if (copy.selector) { copy.selectorHash = sha256(String(copy.selector)); copy.selector = '[redacted]'; }
  if (copy.url) { copy.urlHash = sha256(String(copy.url)); copy.url = '[redacted]'; }
  return copy;
}

function sha256(input) {
  return createHash('sha256').update(input).digest('hex');
}

main().catch((err) => {
  console.error(JSON.stringify({ ok: false, error: err.message, code: err.code || 'ERROR', failureClass: err.code || 'UNCLASSIFIED_ERROR', classification: err.classification || null, durationMs: null }, null, 2));
  process.exitCode = err.code === 'APPROVAL_REQUIRED' || err.code === 'MUTATION_CONFIRMATION_REQUIRED' ? 3 : 1;
});
