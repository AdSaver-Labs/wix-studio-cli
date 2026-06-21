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

const commands = ['chrome-pages', 'inspect', 'snapshot', 'element-map', 'frame-map', 'selector-resolve', 'selectors-evidence', 'click-by-label', 'text-edit', 'responsive-mode', 'save-state-detect', 'diagnostics', 'verification', 'read-only-proof', 'context-pack', 'seo-audit', 'public-seo-proof', 'sitemap-check', 'robots-check', 'site-spec-validate', 'site-build-plan'];
for (const command of commands) {
  const args = [command, '--dry-run'];
  if (['selector-resolve', 'selectors-evidence', 'click-by-label'].includes(command)) args.push('--label', 'Preview');
  if (command === 'text-edit') args.push('--label', 'Title', '--text', 'Hello');
  if (['seo-audit', 'public-seo-proof'].includes(command)) args.push('--url', 'https://example.com');
  if (['sitemap-check', 'robots-check'].includes(command)) args.push('--base-url', 'https://example.com');
  if (['site-spec-validate', 'site-build-plan'].includes(command)) args.push('--spec', 'examples/booking-site-spec.example.json');
  const res = run(args);
  assert(res.status === 0, `${command} dry-run exits 0`, res.stderr || res.stdout);
  assert(res.stdout.includes('"dryRun": true') || command === 'chrome-pages', `${command} emits dry-run JSON`, res.stdout);
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
