#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { inspectScript, elementMapScript, frameMapScript, clickByLabelScript, textEditScript, saveStateDetectScript, diagnosticsScript, selectorResolveScript } from '../src/dom-recipes.mjs';
import { CdpClient, discoverPagesFromPort } from '../src/cdp-client.mjs';
import { assertAllowed } from '../src/risk-policy.mjs';
import { defaultEvidencePath, logEvidence, writeArtifact } from '../src/evidence.mjs';
import { readSiteSpec, validateSiteSpec, buildImplementationPlan } from '../src/site-spec.mjs';
import { readCapabilityRegistry, summarizeRegistry, explainOperation, routePlanFile } from '../src/capability-registry.mjs';
import { readStudioRecipe, validateStudioRecipe, dryRunStudioRecipe, runStudioRecipe } from '../src/studio-recipes.mjs';
import { generateSiteChangeSpec, listSiteChangeTemplates } from '../src/site-generators.mjs';
import { selectResponsiveViewports, twoStepQaContract, viewportMatrixSummary } from '../src/qa-contract.mjs';
import { generateRecipeSkeletonFromSpecFile } from '../src/recipe-skeletons.mjs';

const COMMANDS = new Set(['inspect', 'snapshot', 'element-map', 'frame-map', 'selector-resolve', 'selectors-evidence', 'click-by-label', 'text-edit', 'responsive-mode', 'responsive-audit', 'qa-preview-inspect', 'qa-published-inspect', 'publish-test-site', 'save-state-detect', 'diagnostics', 'verification', 'chrome-pages', 'read-only-proof', 'context-pack', 'seo-audit', 'public-seo-proof', 'sitemap-check', 'robots-check', 'site-spec-validate', 'site-build-plan', 'capabilities', 'capability-explain', 'route-plan', 'studio-recipe-validate', 'studio-recipe-run', 'templates', 'generate-change-spec', 'generate-recipe-skeleton']);

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
  responsive-audit    Capture expanded responsive proof and enforce phone/large-desktop/breakpoint gates
  save-state-detect   Detect visible saved/saving/unsaved/error state text
  diagnostics         Read-only Wix editor failure/hazard scan with remediation guidance
  verification        Emit verification checklist/evidence bundle guidance
  qa-preview-inspect  First QA gate: editor/context + preview URL proof before publish
  publish-test-site   Approval-gated publish contract for a non-client Wix test-site/domain
  qa-published-inspect Second QA gate: Wix-domain rendered proof after test-site publish
  chrome-pages        List debuggable Chrome pages from --port (default 9222)
  read-only-proof     Run a full non-mutating attach proof bundle against a selected Chrome/Wix tab
  context-pack        Alias for read-only-proof; compact one-shot Wix context/proof bundle
  seo-audit           Read-only public SEO extraction for a URL
  public-seo-proof    Alias for seo-audit, intended as completion evidence
  sitemap-check       Read-only fetch of /sitemap.xml
  robots-check        Read-only fetch of /robots.txt
  site-spec-validate  Validate a Wix Studio booking/business site spec before implementation
  site-build-plan     Convert a site spec into a phased, proof-gated implementation plan
  capabilities        Summarize the professional Wix capability registry
  capability-explain  Explain one operation route: --operation page.about.optimize
  route-plan          Route a site-build-plan JSON through safest adapters/proof gates
  studio-recipe-validate Validate a versioned Studio last-mile recipe JSON
  studio-recipe-run   Dry-run or execute a versioned Studio last-mile recipe JSON
  templates           List supported mobile-first page/section generators
  generate-change-spec Generate a structured Wix change spec for FAQ/About/header/footer/etc.
  generate-recipe-skeleton Convert a generated change spec into a fail-closed Studio recipe skeleton

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
  --url <url>               Optional public/preview URL for SEO and responsive-audit navigation
  --spec <path>             Site spec JSON for site-spec-validate/site-build-plan
  --plan <path>             Plan JSON for route-plan
  --operation <id>          Operation id for capability-explain
  --recipe <path>           Studio recipe JSON for studio-recipe-validate/studio-recipe-run
  --type <kind>             Change type for generate-change-spec: faq/about/header/footer/product/portfolio/policy/hero/services/cta
  --business-name <name>    Business/client name for generated change specs
  --industry <text>         Industry/context for generated change specs
  --audience <text>         Target audience for generated change specs
  --goal <text>             Primary conversion/business goal for generated change specs

Examples:
  node bin/wix-studio-ui-cli.mjs chrome-pages --execute --port 9222
  node bin/wix-studio-ui-cli.mjs inspect --execute --cdp-url ws://127.0.0.1:9222/devtools/page/ABC
  node bin/wix-studio-ui-cli.mjs element-map --execute --cdp-url ws://... --out evidence/element-map.json
  node bin/wix-studio-ui-cli.mjs diagnostics --execute --cdp-url ws://...
  node bin/wix-studio-ui-cli.mjs read-only-proof --execute --port 9222 --target-url-contains wix --out evidence/live-readonly
  node bin/wix-studio-ui-cli.mjs responsive-audit --execute --cdp-url ws://... --url https://example.com --out evidence/responsive --viewports expanded
  node bin/wix-studio-ui-cli.mjs site-spec-validate --spec examples/booking-site-spec.example.json
  node bin/wix-studio-ui-cli.mjs site-build-plan --spec examples/booking-site-spec.example.json --out evidence/site-build-plan.json
  node bin/wix-studio-ui-cli.mjs capabilities
  node bin/wix-studio-ui-cli.mjs capability-explain --operation page.about.optimize
  node bin/wix-studio-ui-cli.mjs route-plan --plan evidence/site-build-plan.json --out evidence/routed-plan.json
  node bin/wix-studio-ui-cli.mjs studio-recipe-validate --recipe recipes/faq-section.example.json
  node bin/wix-studio-ui-cli.mjs studio-recipe-run --recipe recipes/faq-section.example.json --dry-run
  node bin/wix-studio-ui-cli.mjs templates
  node bin/wix-studio-ui-cli.mjs generate-change-spec --type about --business-name "AdSaver" --industry "performance marketing" --out evidence/about-spec.json
  node bin/wix-studio-ui-cli.mjs generate-recipe-skeleton --spec evidence/about-spec.json --out evidence/about.recipe.json
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
  const command = args._[0] === 'qa' || args._[0] === 'publish' ? `${args._[0]} ${args._[1] || ''}`.trim() : args._[0];
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

  if (['capabilities', 'capability-explain', 'route-plan'].includes(command) && args.dryRun !== true) {
    const result = await runCapabilityCommand(command, args);
    await logEvidence(evidencePath, { phase: 'result', result });
    jsonOut({ command, result, evidencePath }); return;
  }

  if (command === 'studio-recipe-validate') {
    const recipe = await readStudioRecipe(required(args.recipe, '--recipe'));
    const result = { recipeId: recipe.recipeId, operation: recipe.operation, fingerprint: recipe.fingerprint, validation: validateStudioRecipe(recipe) };
    if (args.out) await writeArtifact(args.out, JSON.stringify(result, null, 2));
    await logEvidence(evidencePath, { phase: 'result', result });
    jsonOut({ command, result, evidencePath }); return;
  }

  if (command === 'studio-recipe-run' && !execute) {
    const recipe = await readStudioRecipe(required(args.recipe, '--recipe'));
    const result = dryRunStudioRecipe(recipe);
    if (args.out) await writeArtifact(args.out, JSON.stringify(result, null, 2));
    await logEvidence(evidencePath, { phase: 'dry-run', result });
    jsonOut({ command, dryRun: true, result, evidencePath }); return;
  }

  if (['templates', 'generate-change-spec', 'generate-recipe-skeleton'].includes(command) && args.dryRun !== true) {
    const result = command === 'templates' ? listSiteChangeTemplates() : command === 'generate-change-spec' ? generateSiteChangeSpec(args) : await generateRecipeSkeletonFromSpecFile(required(args.spec, '--spec'), args);
    if (args.out) await writeArtifact(args.out, JSON.stringify(result, null, 2));
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

  if (command === 'publish-test-site') {
    const result = runPublishTestSiteContract(args);
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
    case 'responsive-audit': return `Would capture expanded desktop/tablet/phone/breakpoint screenshots and fail if phone, large desktop, or breakpoint edges have overflow, unreadable text, weak tap targets, hidden CTA/header, or clipped content: ${args.url || args.cdpUrl ? 'target provided' : '[missing --url or --cdp-url]'}.`;
    case 'save-state-detect': return 'Would scan visible text for Saved/Saving/Unsaved/Error saving/Draft/Publish/Preview state.';
    case 'diagnostics': return 'Would scan Wix editor symptoms: RTE local-only commits, iframe boundaries, inert CMS panels, stale tab/edit locks, save/publish hazards.';
    case 'verification': return 'Would emit verification checklist requiring editor/preview inspection, approval-gated test-site publish, published Wix-domain inspection, expanded responsive proof, rollback, and evidence bundle.';
    case 'qa-preview-inspect': return 'Would run first QA gate: editor/context proof plus preview URL screenshots and expanded responsive audit before any test-site publish.';
    case 'publish-test-site': return 'Would validate approval manifest, non-client Wix test-site target, preview PASS, Git sync/status, and rollback plan. Current publisher adapter fails closed until implemented.';
    case 'qa-published-inspect': return 'Would run second QA gate: browser-rendered published Wix-domain proof, expanded responsive audit, SEO/content sanity, and console/runtime check.';
    case 'read-only-proof': return 'Would discover/select a Chrome tab, attach read-only through CDP, and collect inspect/element-map/frame-map/snapshot/save-state/diagnostics artifacts without mutating Wix.';
    case 'context-pack': return 'Would run the same compact read-only proof bundle as read-only-proof in one CDP session.';
    case 'seo-audit':
    case 'public-seo-proof': return `Would fetch public URL and extract title/meta/canonical/robots/hreflang/OG/schema/headings/images/internal links: ${args.url || '[missing --url]'}.`;
    case 'sitemap-check': return `Would fetch sitemap XML for base URL: ${args.baseUrl || args.url || '[missing --base-url/--url]'}.`;
    case 'robots-check': return `Would fetch robots.txt for base URL: ${args.baseUrl || args.url || '[missing --base-url/--url]'}.`;
    case 'site-spec-validate': return `Would validate local site spec: ${args.spec || '[missing --spec]'}.`;
    case 'site-build-plan': return `Would generate proof-gated Wix Studio implementation plan from local site spec: ${args.spec || '[missing --spec]'}.`;
    case 'capabilities': return 'Would summarize professional Wix capability registry: operations, adapters, risks, proofs, rollback classes.';
    case 'capability-explain': return `Would explain operation routing/proof requirements for: ${args.operation || '[missing --operation]'}.`;
    case 'route-plan': return `Would route site-build-plan JSON through capability registry: ${args.plan || '[missing --plan]'}.`;
    case 'studio-recipe-validate': return `Would validate Studio recipe JSON: ${args.recipe || '[missing --recipe]'}.`;
    case 'studio-recipe-run': return `Would dry-run Studio recipe JSON with preconditions, step hashes, verification, rollback, and phone-primary proof requirements: ${args.recipe || '[missing --recipe]'}.`;
    case 'templates': return 'Would list supported mobile-first Wix page/section change generators.';
    case 'generate-change-spec': return `Would generate structured Wix change spec for type=${args.type || '[missing --type]'} with mobile-first proof contract.`;
    case 'generate-recipe-skeleton': return `Would convert generated change spec into fail-closed Studio recipe skeleton with selector-proof, two-step QA, and rollback requirements: ${args.spec || '[missing --spec]'}.`;
    default: return 'Would perform read-only local planning.';
  }
}

async function runCapabilityCommand(command, args) {
  const registry = await readCapabilityRegistry(args.registry);
  let result;
  if (command === 'capabilities') result = summarizeRegistry(registry);
  else if (command === 'capability-explain') result = explainOperation(registry, required(args.operation, '--operation'));
  else result = await routePlanFile(required(args.plan, '--plan'), args.registry);
  if (args.out) await writeArtifact(args.out, JSON.stringify(result, null, 2));
  return result;
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
    if (command === 'studio-recipe-run') {
      const recipe = await readStudioRecipe(required(args.recipe, '--recipe'));
      return runStudioRecipe(client, recipe, args);
    }
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
    if (command === 'responsive-audit') return runResponsiveAudit(client, args);
    if (command === 'qa-preview-inspect') return runQaPreviewInspect(client, args);
    if (command === 'qa-published-inspect') return runQaPublishedInspect(client, args);
    if (command === 'verification') return verificationChecklist(args);
    throw new Error(`Unsupported command execution: ${command}`);
  });
}

async function runResponsiveAudit(client, args) {
  const outDir = args.out || `evidence/responsive-${new Date().toISOString().replace(/[:.]/g, '-')}`;
  await client.send('Page.enable');
  await client.send('Runtime.enable');
  if (args.url) {
    await client.send('Page.navigate', { url: args.url });
    await sleep(Number(args.waitMs || 3000));
  }
  const viewports = responsiveViewports(args);
  const captures = [];
  for (const viewport of viewports) {
    await client.send('Emulation.setDeviceMetricsOverride', { width: viewport.width, height: viewport.height, deviceScaleFactor: viewport.deviceScaleFactor || 1, mobile: viewport.mobile });
    await sleep(Number(args.settleMs || 900));
    const assertions = valueOf(await client.evaluate(responsiveAssertionScript(viewport.name)));
    const shot = await client.send('Page.captureScreenshot', { format: args.format || 'png', captureBeyondViewport: true });
    const suffix = `${viewport.name}-${viewport.width}x${viewport.height}`;
    const screenshot = await writeArtifact(`${outDir.replace(/\/$/, '')}/${suffix}.${args.format === 'jpeg' ? 'jpg' : 'png'}`, shot.data, 'base64');
    captures.push({ viewport, assertions, screenshot });
  }
  const phoneCaptures = captures.filter((capture) => capture.viewport.phonePrimary);
  const largeDesktopCaptures = captures.filter((capture) => capture.viewport.category === 'large-desktop');
  const breakpointCaptures = captures.filter((capture) => capture.viewport.category === 'breakpoint-edge');
  const blockingIssues = captures.flatMap((capture) => capture.assertions.issues.map((issue) => ({ viewport: capture.viewport.name, issue })));
  const phoneBlockingIssues = phoneCaptures.flatMap((capture) => capture.assertions.issues.map((issue) => ({ viewport: capture.viewport.name, issue })));
  const largeDesktopBlockingIssues = largeDesktopCaptures.flatMap((capture) => capture.assertions.issues.map((issue) => ({ viewport: capture.viewport.name, issue })));
  const breakpointBlockingIssues = breakpointCaptures.flatMap((capture) => capture.assertions.issues.map((issue) => ({ viewport: capture.viewport.name, issue })));
  const result = {
    status: phoneBlockingIssues.length ? 'FAIL_PHONE_PRIMARY'
      : largeDesktopBlockingIssues.length ? 'FAIL_LARGE_DESKTOP'
        : breakpointBlockingIssues.length ? 'FAIL_BREAKPOINT_EDGE'
          : blockingIssues.length ? 'FAIL_RESPONSIVE_MATRIX'
            : 'PASS',
    phonePrimary: true,
    largeDesktopRequired: true,
    breakpointEdgesRequired: true,
    targetUrl: args.url || null,
    checkedViewports: viewports.map((v) => ({ name: v.name, width: v.width, height: v.height, category: v.category || null, phonePrimary: !!v.phonePrimary, required: v.required !== false })),
    blockingIssues,
    phoneBlockingIssues,
    largeDesktopBlockingIssues,
    breakpointBlockingIssues,
    captures,
    professionalDesignGate: {
      phoneMustPass: true,
      largeDesktopMustPass: true,
      breakpointEdgesMustPass: true,
      desktopTabletMustBeReviewed: true,
      requiredManualReview: ['visual hierarchy', 'brand fit', 'conversion clarity', 'copy quality', 'animation tastefulness']
    }
  };
  await writeArtifact(`${outDir.replace(/\/$/, '')}/responsive-audit.json`, JSON.stringify(result, null, 2));
  return result;
}

async function runQaPreviewInspect(client, args) {
  const outDir = args.out || `evidence/qa-preview-${new Date().toISOString().replace(/[:.]/g, '-')}`;
  const inspect = valueOf(await client.evaluate(inspectScript()));
  const saveState = valueOf(await client.evaluate(saveStateDetectScript()));
  const diagnostics = enrichDiagnostics(valueOf(await client.evaluate(diagnosticsScript())));
  const previewFrame = selectPreviewFrame(diagnostics?.frames || []);
  const previewUrl = args.url || previewFrame?.src || null;
  if (!previewUrl) {
    const err = new Error('QA_PREVIEW_INSPECT_REQUIRES_PREVIEW_URL_OR_FRAME: provide --url or attach to a Wix editor page with a visible preview-frame iframe. Refusing to audit editor chrome as site preview.');
    err.code = 'QA_PREVIEW_TARGET_MISSING';
    throw err;
  }
  const previewTarget = previewFrame && !args.url
    ? await openTemporaryCdpTarget(client.cdpUrl, previewUrl)
    : { client, close: async () => {} };
  let responsive;
  try {
    responsive = await runResponsiveAudit(previewTarget.client, { ...args, url: previewUrl, out: `${outDir.replace(/\/$/, '')}/responsive-preview`, viewports: args.viewports || 'expanded' });
  } finally {
    await previewTarget.close();
  }
  const result = {
    gate: 'editor-preview-inspection',
    status: responsive.status === 'PASS' ? 'PASS' : 'FAIL',
    twoStepQa: twoStepQaContract(),
    editorContext: { title: inspect?.title || null, url: inspect?.url || null, likelyWixStudio: !!inspect?.isLikelyWixStudio },
    previewTarget: { url: previewUrl, source: args.url ? 'explicit-url' : 'wix-editor-preview-frame', frameName: previewFrame?.name || null, frameTitle: previewFrame?.title || null },
    saveState: saveState?.state || 'unknown',
    diagnostics: { wixLikely: !!diagnostics?.wixLikely, hazards: diagnostics?.hazards || [], symptoms: diagnostics?.symptoms || [] },
    responsive,
    nextRequiredGate: 'published-wix-domain-inspection',
    completionRule: 'Preview/editor PASS is necessary but never sufficient; published Wix-domain proof is still required.'
  };
  await writeArtifact(`${outDir.replace(/\/$/, '')}/qa-preview-inspection.json`, JSON.stringify(result, null, 2));
  return result;
}

function selectPreviewFrame(frames = []) {
  return frames.find((frame) => frame?.visible && frame?.name === 'preview-frame' && frame?.src)
    || frames.find((frame) => frame?.visible && /renderer\/render\/document/i.test(frame?.src || ''))
    || null;
}

async function openTemporaryCdpTarget(sourceCdpUrl, url) {
  const endpoint = cdpHttpEndpoint(sourceCdpUrl);
  const createUrl = `${endpoint}/json/new?${encodeURIComponent(url)}`;
  const res = await fetch(createUrl, { method: 'PUT' });
  if (!res.ok) throw new Error(`TEMP_PREVIEW_TARGET_CREATE_FAILED: HTTP ${res.status}`);
  const target = await res.json();
  const tempClient = new CdpClient({ cdpUrl: target.webSocketDebuggerUrl, timeoutMs: 15000 });
  await tempClient.connect();
  return {
    client: tempClient,
    async close() {
      try { await tempClient.close(); } catch {}
      if (target?.id) {
        try { await fetch(`${endpoint}/json/close/${target.id}`); } catch {}
      }
    }
  };
}

function cdpHttpEndpoint(cdpUrl) {
  const parsed = new URL(cdpUrl);
  parsed.protocol = parsed.protocol === 'wss:' ? 'https:' : 'http:';
  parsed.pathname = '';
  parsed.search = '';
  parsed.hash = '';
  return parsed.toString().replace(/\/$/, '');
}

async function runQaPublishedInspect(client, args) {
  const url = required(args.url, '--url');
  if (!/^https:\/\//i.test(url)) throw new Error('PUBLISHED_QA_REQUIRES_HTTPS_URL');
  if (!/\.wixsite\.com\b|\.wixstudio\.io\b|\.editorx\.io\b/i.test(new URL(url).hostname)) {
    throw new Error('PUBLISHED_QA_REQUIRES_WIX_DOMAIN_URL: use the real non-client Wix-domain test URL, not editor/preview/custom production domain.');
  }
  const outDir = args.out || `evidence/qa-published-${new Date().toISOString().replace(/[:.]/g, '-')}`;
  const responsive = await runResponsiveAudit(client, { ...args, out: `${outDir.replace(/\/$/, '')}/responsive-published`, viewports: args.viewports || 'expanded' });
  const seo = await runSeoAudit({ ...args, url });
  const result = {
    gate: 'published-wix-domain-inspection',
    status: responsive.status === 'PASS' ? 'PASS' : 'FAIL',
    publishedUrl: url,
    twoStepQa: twoStepQaContract(),
    responsive,
    seo,
    requiredManualReview: ['visual parity vs editor/preview', 'CTA/navigation click sanity', 'console/runtime warning scan where available', 'content placeholder scan'],
    completionRule: 'A Wix change is not done unless this published Wix-domain gate and editor-preview-inspection both pass.'
  };
  await writeArtifact(`${outDir.replace(/\/$/, '')}/qa-published-inspection.json`, JSON.stringify(result, null, 2));
  return result;
}

function runPublishTestSiteContract(args) {
  return {
    status: 'BLOCKED_PUBLISHER_ADAPTER_NOT_IMPLEMENTED',
    command: 'publish-test-site',
    failClosed: true,
    reason: 'The CLI validates the approval contract but intentionally does not click Wix Publish until a versioned publisher adapter is implemented and proven on a non-client test site.',
    requiredBeforeImplementation: [
      'explicit non-client Wix test-site target',
      'approval manifest bound to this exact action fingerprint',
      'Git clean/synced status or documented diff receipt',
      'qa-preview-inspect PASS',
      'rollback/restore plan',
      'post-publish qa-published-inspect must run against the Wix-domain URL'
    ],
    twoStepQa: twoStepQaContract(),
    target: args.target || args.url || null
  };
}

function responsiveViewports(args) {
  return selectResponsiveViewports(args.viewports || 'expanded');
}

function responsiveAssertionScript(viewportName) {
  return `(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const body = document.body;
    const doc = document.documentElement;
    const issues = [];
    const warnings = [];
    const scrollWidth = Math.max(body?.scrollWidth || 0, doc?.scrollWidth || 0);
    if (scrollWidth > vw + 2) issues.push({ code: 'horizontal_overflow', detail: { viewportWidth: vw, scrollWidth } });

    const visible = (el) => {
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 1 && rect.height > 1 && rect.bottom > 0 && rect.right > 0 && rect.top < vh && rect.left < vw;
    };
    const textEls = [...document.querySelectorAll('h1,h2,h3,p,li,a,button,[role="button"]')].filter(visible).slice(0, 250);
    const tinyText = textEls.filter((el) => Number.parseFloat(window.getComputedStyle(el).fontSize) < 13).slice(0, 20).map((el) => ({ tag: el.tagName.toLowerCase(), text: (el.innerText || el.textContent || '').trim().slice(0, 80), fontSize: window.getComputedStyle(el).fontSize }));
    if (tinyText.length) issues.push({ code: 'unreadable_small_text', count: tinyText.length, examples: tinyText.slice(0, 5) });

    const interactive = [...document.querySelectorAll('a,button,input,select,textarea,[role="button"],[tabindex]')].filter(visible).slice(0, 200);
    const smallTapTargets = interactive.filter((el) => {
      const rect = el.getBoundingClientRect();
      return rect.width < 40 || rect.height < 40;
    }).slice(0, 20).map((el) => {
      const rect = el.getBoundingClientRect();
      return { tag: el.tagName.toLowerCase(), text: (el.innerText || el.getAttribute('aria-label') || el.getAttribute('title') || '').trim().slice(0, 80), width: Math.round(rect.width), height: Math.round(rect.height) };
    });
    if (smallTapTargets.length) issues.push({ code: 'small_tap_targets', count: smallTapTargets.length, examples: smallTapTargets.slice(0, 5) });

    const ctaPattern = /book|call|contact|get started|start|quote|buy|shop|schedule|learn more|view|reserve|запази|обади|контакт|оферта|виж/i;
    const visibleCtas = interactive.filter((el) => ctaPattern.test((el.innerText || el.value || el.getAttribute('aria-label') || '').trim()));
    if (!visibleCtas.length) warnings.push({ code: 'no_visible_cta_detected', detail: 'No obvious visible CTA matched the built-in conversion pattern.' });

    const header = [...document.querySelectorAll('header,nav,[role="navigation"]')].find(visible);
    if (!header) warnings.push({ code: 'no_visible_header_or_nav_detected' });

    const clipped = textEls.filter((el) => el.scrollWidth > el.clientWidth + 2 || el.scrollHeight > el.clientHeight + 2).slice(0, 20).map((el) => ({ tag: el.tagName.toLowerCase(), text: (el.innerText || el.textContent || '').trim().slice(0, 80) }));
    if (clipped.length) issues.push({ code: 'clipped_text_or_content', count: clipped.length, examples: clipped.slice(0, 5) });

    return {
      viewportName: ${JSON.stringify(viewportName)},
      url: location.href,
      title: document.title,
      viewport: { width: vw, height: vh, scrollWidth, scrollHeight: Math.max(body?.scrollHeight || 0, doc?.scrollHeight || 0) },
      counts: { text: textEls.length, interactive: interactive.length, visibleCtas: visibleCtas.length },
      issues,
      warnings,
      verdict: issues.length ? 'FAIL' : 'PASS'
    };
  })()`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
    lifecycleGate: 'brief → typed spec → routed plan → editor/preview inspection → controlled mutation → save proof → preview QA → approval-gated test-site publish → published Wix-domain QA → evidence bundle → QA verdict → rollback path',
    requiredEvidence: [
      'chrome-pages selected URL/title for account/site confirmation, preferably aprehasuppga@mail.com session context when visible',
      'before snapshot',
      'element-map and frame-map with target label/selector',
      'dry-run plan JSONL entry showing action fingerprint for high-risk intents',
      'post-action save-state-detect result with state=saved_visible or documented block',
      'editor_preview_inspection PASS: selected editor URL/title, before/after screenshots, save-state proof, preview URL, preview screenshots',
      'responsive-audit PASS with expanded viewport matrix: 1366x768, 1440x900, 1920x1080, 2560x1440, 1024x768, 768x1024, 430x932, 390x844, 375x812, 360x800, and breakpoint edges 320/480/767/768/1023/1024/1279/1280',
      'published_wix_domain_inspection PASS after approval-gated test-site publish: Wix-domain URL, browser-rendered screenshots, responsive audit, SEO/content sanity, console/runtime check where available',
      'diagnostics output confirming no delete/domain/payment/client booking hazards were touched',
      'evidence bundle manifest with URLs, screenshots, route plan, receipts, failures, QA verdict, and rollback path'
    ],
    blockedWithoutApprovalManifest: ['publish/unpublish', 'delete/remove/truncate', 'domain/DNS', 'payment/checkout/order/booking', 'SEO/indexing/canonical/redirect'],
    approvalManifestShape: {
      schemaVersion: 2,
      approved: true,
      command: 'publish-test-site',
      fingerprint: '<from dry-run risk.fingerprint>',
      operator: '<human/operator>',
      target: { siteType: 'non-client Wix test site', wixDomainUrl: '<*.wixsite.com test URL>' },
      proofRequired: ['editor_preview_inspection PASS', 'git_sync_status', 'rollback_plan', 'published_wix_domain_inspection PASS'],
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
