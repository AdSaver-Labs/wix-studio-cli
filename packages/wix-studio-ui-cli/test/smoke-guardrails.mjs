import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

const bin = new URL('../bin/wix-studio-ui-cli.mjs', import.meta.url).pathname;
const repoRoot = resolve(dirname(bin), '../../..');
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

const commands = ['doctor', 'inventory', 'adapter-contracts', 'approval-manifest-template', 'apply-plan', 'apply', 'chrome-pages', 'inspect', 'snapshot', 'element-map', 'frame-map', 'selector-resolve', 'selectors-evidence', 'click-by-label', 'text-edit', 'responsive-mode', 'responsive-audit', 'qa-preview-inspect', 'qa-published-inspect', 'publish-test-site', 'save-state-detect', 'diagnostics', 'verification', 'read-only-proof', 'context-pack', 'seo-audit', 'public-seo-proof', 'sitemap-check', 'robots-check', 'site-spec-validate', 'site-build-plan', 'capabilities', 'capability-explain', 'route-plan', 'studio-recipe-validate', 'studio-recipe-run', 'templates', 'generate-change-spec', 'generate-recipe-skeleton'];
for (const command of commands) {
  const args = [command, '--dry-run'];
  if (['selector-resolve', 'selectors-evidence', 'click-by-label'].includes(command)) args.push('--label', 'Preview');
  if (command === 'text-edit') args.push('--label', 'Title', '--text', 'Hello');
  if (['seo-audit', 'public-seo-proof'].includes(command)) args.push('--url', 'https://example.com');
  if (['sitemap-check', 'robots-check'].includes(command)) args.push('--base-url', 'https://example.com');
  if (['site-spec-validate', 'site-build-plan'].includes(command)) args.push('--spec', 'examples/booking-site-spec.example.json');
  if (command === 'capability-explain') args.push('--operation', 'page.about.optimize');
  if (['route-plan', 'apply-plan', 'apply'].includes(command)) args.push('--plan', 'examples/nonexistent-plan-for-dry-run.json');
  if (command === 'approval-manifest-template') args.push('--approval-command', 'text-edit', '--label', 'SEO', '--text', 'Fixture title');
  if (['studio-recipe-validate', 'studio-recipe-run'].includes(command)) args.push('--recipe', 'recipes/faq-section.example.json');
  if (command === 'generate-change-spec') args.push('--type', 'about', '--business-name', 'AdSaver', '--industry', 'performance marketing', '--audience', 'service businesses', '--goal', 'turn website visitors into qualified leads');
  if (command === 'generate-recipe-skeleton') args.push('--spec', 'runs/2026-06-22-production-grade-wix-cli-architecture/generated-change-specs/about.spec.json');
  const res = run(args);
  assert(res.status === 0, `${command} dry-run exits 0`, res.stderr || res.stdout);
  assert(res.stdout.includes('"dryRun": true') || ['chrome-pages', 'doctor', 'studio-recipe-validate'].includes(command), `${command} emits dry-run JSON`, res.stdout);
}

const doctor = run(['doctor', '--dry-run']);
assert(doctor.status === 0, 'doctor dry-run exits 0', doctor.stderr || doctor.stdout);
const doctorJson = JSON.parse(doctor.stdout);
assert(doctorJson.result.safetyDefaults.publishFailClosed === true, 'doctor reports fail-closed publish safety', doctor.stdout);
assert(doctorJson.result.adapters.qa.twoStepQa.includes('editor-preview-inspection'), 'doctor reports two-step QA editor gate', doctor.stdout);
assert(doctorJson.result.adapters.qa.twoStepQa.includes('published-wix-domain-inspection'), 'doctor reports two-step QA published gate', doctor.stdout);

const applyPlanFixture = run(['site-build-plan', '--spec', 'examples/booking-site-spec.example.json', '--out', '/tmp/wix-cli-guardrail-plan.json']);
assert(applyPlanFixture.status === 0, 'site-build-plan fixture exits 0', applyPlanFixture.stderr || applyPlanFixture.stdout);
const applyPlan = run(['apply-plan', '--plan', '/tmp/wix-cli-guardrail-plan.json']);
assert(applyPlan.status === 0, 'apply-plan fixture exits 0', applyPlan.stderr || applyPlan.stdout);
const applyJson = JSON.parse(applyPlan.stdout);
assert(applyJson.result.readOnlyCompiler === true, 'apply-plan is read-only compiler', applyPlan.stdout);
assert(applyJson.result.policy.officialAdaptersFirst === true, 'apply-plan keeps official-adapters-first policy', applyPlan.stdout);
assert(applyJson.result.policy.writeExecutorsFailClosed === true, 'apply-plan keeps write executors fail-closed', applyPlan.stdout);
assert(applyJson.result.counts.packets > 0, 'apply-plan emits packets', applyPlan.stdout);
assert(applyJson.result.packets.some((packet) => packet.execution?.contractSchemaVersion === 1), 'apply-plan packets include adapter execution contracts', applyPlan.stdout);


const adapterContracts = run(['adapter-contracts']);
assert(adapterContracts.status === 0, 'adapter-contracts exits 0', adapterContracts.stderr || adapterContracts.stdout);
const adapterContractsJson = JSON.parse(adapterContracts.stdout).result;
assert(adapterContractsJson.writeExecutorsFailClosed === true, 'adapter-contracts reports write executors fail-closed', adapterContracts.stdout);
assert(adapterContractsJson.contracts.some((contract) => contract.executor === 'studio-recipe-adapter'), 'adapter-contracts includes Studio recipe adapter contract', adapterContracts.stdout);
assert(adapterContractsJson.contracts.some((contract) => contract.executor === 'publish-adapter' && contract.status.includes('fail_closed')), 'adapter-contracts keeps publish adapter fail-closed', adapterContracts.stdout);

const approvalTemplate = run(['approval-manifest-template', '--approval-command', 'text-edit', '--label', 'SEO', '--text', 'hi']);
assert(approvalTemplate.status === 0, 'approval-manifest-template exits 0', approvalTemplate.stderr || approvalTemplate.stdout);
const approvalTemplateJson = JSON.parse(approvalTemplate.stdout).result;
assert(approvalTemplateJson.approved === false, 'approval manifest template is not pre-approved', approvalTemplate.stdout);
assert(approvalTemplateJson.command === 'text-edit', 'approval manifest template binds requested command', approvalTemplate.stdout);
assert(approvalTemplateJson.fingerprint && approvalTemplateJson.fingerprint.length === 64, 'approval manifest template includes exact action fingerprint', approvalTemplate.stdout);

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
const planJson = JSON.parse(plan.stdout);
assert(planJson.result.status === 'PASS', 'site-build-plan fixture status is PASS', plan.stdout);
assert(planJson.result.validation.ok === true, 'site-build-plan fixture validation is ok', plan.stdout);
const routed = run(['route-plan', '--plan', planOut, '--out', routedOut]);
assert(routed.status === 0, 'route-plan fixture exits 0', routed.stderr || routed.stdout);
const routedJson = JSON.parse(routed.stdout);
assert(routedJson.result.operationCount > 0, 'route-plan emits routed actions', routed.stdout);
assert(routedJson.result.missingCapabilityCount === 0, 'route-plan maps every fixture action to a capability', routed.stdout);
const routedCommands = routedJson.result.routedActions.map((action) => action.command);
assert(routedCommands.includes('qa-preview-inspect'), 'route-plan includes mandatory editor/preview QA gate', routed.stdout);
assert(routedCommands.includes('publish-test-site'), 'route-plan includes approval-gated test-site publish gate', routed.stdout);
assert(routedCommands.includes('qa-published-inspect'), 'route-plan includes mandatory published Wix-domain QA gate', routed.stdout);

const committedPlan = JSON.parse(readFileSync(join(repoRoot, 'runs/2026-06-22-production-grade-wix-cli-architecture/site-build-plan.json'), 'utf8'));
assert(committedPlan.status === 'PASS', 'committed site-build-plan status is PASS', JSON.stringify(committedPlan, null, 2));
assert(committedPlan.validation?.ok === true, 'committed site-build-plan validation is ok', JSON.stringify(committedPlan.validation, null, 2));
const committedRouted = JSON.parse(readFileSync(join(repoRoot, 'runs/2026-06-22-production-grade-wix-cli-architecture/routed-plan.json'), 'utf8'));
const committedCommands = committedRouted.routedActions.map((action) => action.command);
assert(committedRouted.missingCapabilityCount === 0, 'committed routed-plan has no missing capabilities', JSON.stringify(committedRouted, null, 2));
assert(committedCommands.includes('qa-preview-inspect'), 'committed routed-plan includes mandatory editor/preview QA gate', JSON.stringify(committedRouted, null, 2));
assert(committedCommands.includes('publish-test-site'), 'committed routed-plan includes approval-gated test-site publish gate', JSON.stringify(committedRouted, null, 2));
assert(committedCommands.includes('qa-published-inspect'), 'committed routed-plan includes mandatory published Wix-domain QA gate', JSON.stringify(committedRouted, null, 2));

const cliSource = readFileSync(bin, 'utf8');
assert(cliSource.includes('selectPreviewFrame'), 'qa-preview-inspect routes through preview-frame selector instead of editor chrome', 'selectPreviewFrame missing');
assert(cliSource.includes('QA_PREVIEW_INSPECT_REQUIRES_PREVIEW_URL_OR_FRAME'), 'qa-preview-inspect fails closed when no preview URL/frame exists', 'missing preview target fail-closed error');
assert(cliSource.includes('source: args.url ? \'explicit-url\' : \'wix-editor-preview-frame\''), 'qa-preview-inspect records whether proof came from explicit URL or Wix preview frame', 'preview source evidence missing');

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
  assert(parsed.result.responsive.viewports.includes('desktop-27in:2560x1440'), `generate-change-spec ${type} includes 27-inch desktop viewport`, generated.stdout);
  assert(parsed.result.responsive.viewports.includes('breakpoint-320:320x800'), `generate-change-spec ${type} includes 320px breakpoint edge`, generated.stdout);
  assert(parsed.result.proof.required.includes('responsive-audit PASS with expanded viewport matrix'), `generate-change-spec ${type} requires expanded responsive proof`, generated.stdout);
  assert(parsed.result.proof.required.includes('editor-preview-inspection PASS'), `generate-change-spec ${type} requires editor/preview inspection`, generated.stdout);
  assert(parsed.result.proof.required.includes('published-wix-domain-inspection PASS'), `generate-change-spec ${type} requires published Wix-domain inspection`, generated.stdout);
}

const skeletonSpec = join(tmpdir(), `wix-cli-about-spec-${Date.now()}.json`);
const generatedAbout = run(['generate-change-spec', '--type', 'about', '--business-name', 'AdSaver', '--industry', 'performance marketing', '--out', skeletonSpec]);
assert(generatedAbout.status === 0, 'generate-change-spec writes skeleton source spec', generatedAbout.stderr || generatedAbout.stdout);
const skeleton = run(['generate-recipe-skeleton', '--spec', skeletonSpec]);
assert(skeleton.status === 0, 'generate-recipe-skeleton exits 0', skeleton.stderr || skeleton.stdout);
const skeletonJson = JSON.parse(skeleton.stdout).result;
assert(skeletonJson.selectorStrategy.required.includes('/inputs/buttons/selectors'), 'recipe skeleton requires /inputs/buttons/selectors', skeleton.stdout);
assert(skeletonJson.selectorStrategy.required.includes('/selectors/evidence-compatible'), 'recipe skeleton requires /selectors/evidence-compatible', skeleton.stdout);
assert(skeletonJson.selectorStrategy.required.includes('/ARIA/data'), 'recipe skeleton requires /ARIA/data', skeleton.stdout);
assert(skeletonJson.verification.twoStepQa.gates.some((gate) => gate.id === 'published-wix-domain-inspection'), 'recipe skeleton requires published Wix-domain QA gate', skeleton.stdout);
assert(skeletonJson.verification.responsiveViewports.length >= 18, 'recipe skeleton carries expanded viewport matrix', skeleton.stdout);

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
