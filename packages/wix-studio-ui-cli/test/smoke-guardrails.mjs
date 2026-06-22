import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const bin = new URL('../bin/wix-studio-ui-cli.mjs', import.meta.url).pathname;
const baseEnv = { ...process.env, NO_COLOR: '1' };

function run(args) {
  return spawnSync(process.execPath, [bin, ...args], { encoding: 'utf8', env: baseEnv });
}

function assert(condition, message, detail = '') {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    if (detail) console.error(detail);
    process.exit(1);
  }
}

const commands = ['chrome-pages', 'inspect', 'snapshot', 'element-map', 'frame-map', 'selector-resolve', 'selectors-evidence', 'click-by-label', 'text-edit', 'responsive-mode', 'responsive-audit', 'save-state-detect', 'diagnostics', 'verification', 'read-only-proof', 'context-pack', 'seo-audit', 'public-seo-proof', 'sitemap-check', 'robots-check', 'site-spec-validate', 'site-build-plan', 'capabilities', 'capability-explain', 'route-plan', 'studio-recipe-validate', 'studio-recipe-run', 'templates', 'generate-change-spec'];
for (const command of commands) {
  const args = [command, '--dry-run'];
  if (['selector-resolve', 'selectors-evidence', 'click-by-label'].includes(command)) args.push('--label', 'Preview');
  if (command === 'text-edit') args.push('--label', 'Title', '--text', 'Hello');
  if (['seo-audit', 'public-seo-proof'].includes(command)) args.push('--url', 'https://example.com');
  if (['sitemap-check', 'robots-check'].includes(command)) args.push('--base-url', 'https://example.com');
  if (['site-spec-validate', 'site-build-plan'].includes(command)) args.push('--spec', 'examples/booking-site-spec.example.json');
  if (command === 'capability-explain') args.push('--operation', 'page.about.optimize');
  if (command === 'route-plan') args.push('--plan', 'examples/nonexistent-plan-for-dry-run.json');
  if (['studio-recipe-validate', 'studio-recipe-run'].includes(command)) args.push('--recipe', 'recipes/faq-section.example.json');
  if (command === 'generate-change-spec') args.push('--type', 'about', '--business-name', 'AdSaver', '--industry', 'performance marketing', '--audience', 'service businesses', '--goal', 'turn website visitors into qualified leads');
  const res = run(args);
  assert(res.status === 0, `${command} dry-run exits 0`, res.stderr || res.stdout);
  assert(res.stdout.includes('"dryRun": true') || ['chrome-pages', 'studio-recipe-validate'].includes(command), `${command} emits dry-run JSON`, res.stdout);
}

const capabilities = run(['capabilities']);
assert(capabilities.status === 0, 'capabilities exits 0', capabilities.stderr || capabilities.stdout);
const capabilitiesJson = JSON.parse(capabilities.stdout);
assert(capabilitiesJson.result.operationCount >= 50, 'capability registry contains broad professional operation map', capabilities.stdout);

const explain = run(['capability-explain', '--operation', 'section.header.rework']);
assert(explain.status === 0, 'capability-explain exits 0', explain.stderr || explain.stdout);
assert(JSON.parse(explain.stdout).result.operation.adapter.includes('studio'), 'header rework routes to studio last-mile recipe', explain.stdout);

const planOut = join(tmpdir(), `wix-cli-plan-${Date.now()}.json`);
const routedOut = join(tmpdir(), `wix-cli-routed-${Date.now()}.json`);
const plan = run(['site-build-plan', '--spec', 'examples/booking-site-spec.example.json', '--out', planOut]);
assert(plan.status === 0, 'site-build-plan fixture exits 0', plan.stderr || plan.stdout);
const routed = run(['route-plan', '--plan', planOut, '--out', routedOut]);
assert(routed.status === 0, 'route-plan fixture exits 0', routed.stderr || routed.stdout);
const routedJson = JSON.parse(routed.stdout);
assert(routedJson.result.operationCount > 0, 'route-plan emits routed actions', routed.stdout);
assert(routedJson.result.missingCapabilityCount === 0, 'route-plan maps every fixture action to a capability', routed.stdout);

const recipeValidate = run(['studio-recipe-validate', '--recipe', 'recipes/faq-section.example.json']);
assert(recipeValidate.status === 0, 'studio-recipe-validate exits 0', recipeValidate.stderr || recipeValidate.stdout);
assert(JSON.parse(recipeValidate.stdout).result.validation.ok === true, 'studio recipe fixture is valid', recipeValidate.stdout);

const recipeDryRun = run(['studio-recipe-run', '--recipe', 'recipes/faq-section.example.json', '--dry-run']);
assert(recipeDryRun.status === 0, 'studio-recipe-run dry-run exits 0', recipeDryRun.stderr || recipeDryRun.stdout);
const recipeDryRunJson = JSON.parse(recipeDryRun.stdout);
assert(recipeDryRunJson.result.validation.ok === true, 'studio recipe dry-run includes validation', recipeDryRun.stdout);
assert(recipeDryRunJson.result.steps.some((step) => step.mutates === true), 'studio recipe dry-run identifies mutating steps', recipeDryRun.stdout);

const templates = run(['templates']);
assert(templates.status === 0, 'templates exits 0', templates.stderr || templates.stdout);
assert(JSON.parse(templates.stdout).result.supportedChangeTypes.includes('policy'), 'templates includes policy generator', templates.stdout);

for (const type of ['faq', 'about', 'header', 'footer', 'product', 'portfolio', 'policy']) {
  const generated = run(['generate-change-spec', '--type', type, '--business-name', 'AdSaver', '--industry', 'performance marketing', '--audience', 'service businesses', '--goal', 'turn website visitors into qualified leads']);
  assert(generated.status === 0, `generate-change-spec ${type} exits 0`, generated.stderr || generated.stdout);
  const parsed = JSON.parse(generated.stdout);
  assert(parsed.result.changeType === type, `generate-change-spec ${type} reports type`, generated.stdout);
  assert(parsed.result.responsive.policy.includes('phone is primary'), `generate-change-spec ${type} includes phone-primary policy`, generated.stdout);
  assert(parsed.result.proof.required.includes('responsive-audit PASS with phone primary'), `generate-change-spec ${type} requires responsive proof`, generated.stdout);
}

const noApproval = run(['click-by-label', '--label', 'Publish', '--execute', '--cdp-url', 'ws://127.0.0.1:9/devtools/page/fake']);
assert(noApproval.status === 3, 'publish-like execute without approval is blocked', noApproval.stderr || noApproval.stdout);
assert(noApproval.stderr.includes('APPROVAL_REQUIRED'), 'no approval error exposes APPROVAL_REQUIRED', noApproval.stderr);

const dummyToken = run(['text-edit', '--label', 'SEO', '--text', 'hi', '--execute', '--cdp-url', 'ws://127.0.0.1:9/devtools/page/fake', '--approval-token', 'dummy']);
assert(dummyToken.status === 3, 'dummy --approval-token is rejected before CDP', dummyToken.stderr || dummyToken.stdout);
assert(dummyToken.stderr.includes('Raw --approval-token is intentionally rejected'), 'dummy token rejection message is explicit', dummyToken.stderr);

const tmp = mkdtempSync(join(tmpdir(), 'wix-cli-approval-'));
try {
  const dry = run(['text-edit', '--label', 'SEO', '--text', 'hi', '--dry-run']);
  const parsed = JSON.parse(dry.stdout);
  const fingerprint = parsed.risk.fingerprint;
  const manifestPath = join(tmp, 'approval.json');
  const now = new Date();
  writeFileSync(manifestPath, JSON.stringify({
    schemaVersion: 2,
    approved: true,
    command: 'text-edit',
    fingerprint,
    operator: 'QA fixture',
    rollbackPlan: 'Fixture-only rollback plan; no live Wix mutation occurs.',
    target: { siteId: 'fixture', pageId: 'fixture', publicUrl: 'https://example.com/fixture' },
    proofRequired: ['before_snapshot', 'after_snapshot', 'save_state'],
    issuedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 5 * 60 * 1000).toISOString()
  }));
  const approved = run(['text-edit', '--label', 'SEO', '--text', 'hi', '--execute', '--cdp-url', 'ws://127.0.0.1:9/devtools/page/fake', '--approval-manifest', manifestPath]);
  assert(approved.status === 1, 'valid approval manifest passes policy and reaches CDP boundary in fixture', approved.stderr || approved.stdout);
  assert(approved.stderr.includes('CDP WebSocket error') || approved.stderr.includes('Timed out connecting'), 'approved fixture failed at CDP, not policy', approved.stderr);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

console.log('PASS smoke-guardrails');
