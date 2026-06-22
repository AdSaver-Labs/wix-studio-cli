import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

export const BLOCKED_INTENTS = [
  { pattern: /\bpublish\b|\bunpublish\b/i, reason: 'Publishing live site changes requires explicit operator approval.' },
  { pattern: /\bdelete\b|\bremove\b|\bdestroy\b|\btruncate\b/i, reason: 'Destructive Wix actions require explicit operator approval.' },
  { pattern: /\bdomain\b|\bdns\b|\btransfer\b/i, reason: 'Domain/DNS changes require explicit operator approval and rollback plan.' },
  { pattern: /\bpayment\b|\bcheckout\b|\border\b|\bbooking\b/i, reason: 'Payment/checkout/order/booking mutations require explicit approval and test/sandbox evidence.' },
  { pattern: /\bseo\b|\bcanonical\b|\bindex\b|\bnoindex\b|\bredirect\b/i, reason: 'SEO/indexing mutations require explicit approval and before/after proof.' }
];

export const READ_ONLY_COMMANDS = new Set([
  'inspect',
  'snapshot',
  'element-map',
  'frame-map',
  'diagnostics',
  'save-state-detect',
  'verification',
  'chrome-pages',
  'read-only-proof',
  'context-pack',
  'responsive-audit',
  'selector-resolve',
  'selectors-evidence',
  'seo-audit',
  'public-seo-proof',
  'sitemap-check',
  'robots-check',
  'site-spec-validate',
  'site-build-plan',
  'capabilities',
  'capability-explain',
  'route-plan',
  'studio-recipe-validate'
]);

const APPROVAL_SCHEMA_VERSION = 2;
const APPROVAL_TTL_MS = 30 * 60 * 1000;

export function classifyAction(command, options = {}) {
  const haystack = [command, options.label, options.text, options.intent, options.mode, options.selector, options.target]
    .filter(Boolean)
    .join(' ');
  const hits = BLOCKED_INTENTS.filter((rule) => rule.pattern.test(haystack));
  const readOnly = READ_ONLY_COMMANDS.has(command);
  const approvalRequired = hits.length > 0 && !readOnly;
  return {
    risk: readOnly ? 'read_only' : approvalRequired ? 'approval_required' : 'reversible_ui_candidate',
    approvalRequired,
    reasons: hits.map((hit) => hit.reason),
    fingerprint: approvalFingerprint(command, options)
  };
}

export function approvalFingerprint(command, options = {}) {
  const payload = {
    command,
    labelHash: options.label ? sha256(String(options.label)) : null,
    selectorHash: options.selector ? sha256(String(options.selector)) : null,
    intent: options.intent || null,
    mode: options.mode || null,
    targetHash: options.target ? sha256(String(options.target)) : null,
    siteId: options.siteId || null,
    pageId: options.pageId || null,
    publicUrlHash: options.publicUrl ? sha256(String(options.publicUrl)) : null,
    cdpTargetUrlHash: options.cdpTargetUrl ? sha256(String(options.cdpTargetUrl)) : null,
    recipeId: options.recipeId || options.recipe || null,
    expectedBeforeStateHash: options.expectedBeforeStateHash || null,
    textHash: options.text ? sha256(String(options.text)) : null
  };
  return sha256(JSON.stringify(payload));
}

export async function assertAllowed({ command, options, execute }) {
  const classification = classifyAction(command, options);
  if (!execute) {
    return { allowed: true, dryRun: true, classification };
  }
  if (classification.approvalRequired || options.approvalManifest) {
    await assertApprovalManifest({ command, options, classification });
  } else if (classification.risk === 'reversible_ui_candidate' && options.mutationOk !== true) {
    const err = new Error(`Live reversible Wix UI mutation requires explicit --mutation-ok or --approval-manifest. Action fingerprint: ${classification.fingerprint}`);
    err.code = 'MUTATION_CONFIRMATION_REQUIRED';
    err.classification = classification;
    throw err;
  }
  return { allowed: true, dryRun: false, classification };
}

export async function assertApprovalManifest({ command, options, classification }) {
  if (options.approvalToken) {
    throw approvalError('Raw --approval-token is intentionally rejected. Use --approval-manifest <json> bound to this exact action fingerprint.');
  }
  if (!options.approvalManifest) {
    throw approvalError(`Approval required: ${classification.reasons.join(' ')} Action fingerprint: ${classification.fingerprint}`);
  }

  let manifest;
  try {
    manifest = JSON.parse(await readFile(resolve(options.approvalManifest), 'utf8'));
  } catch (err) {
    throw approvalError(`Could not read approval manifest: ${err.message}`);
  }

  const now = Date.now();
  const expiresAt = Date.parse(manifest.expiresAt || '');
  const issuedAt = Date.parse(manifest.issuedAt || '');
  const reasons = [];
  if (manifest.schemaVersion !== APPROVAL_SCHEMA_VERSION) reasons.push(`schemaVersion must be ${APPROVAL_SCHEMA_VERSION}`);
  if (manifest.approved !== true) reasons.push('approved must be true');
  if (manifest.command !== command) reasons.push('command mismatch');
  if (manifest.fingerprint !== classification.fingerprint) reasons.push('fingerprint mismatch');
  if (!manifest.operator || String(manifest.operator).trim().length < 2) reasons.push('operator is required');
  if (!manifest.rollbackPlan || String(manifest.rollbackPlan).trim().length < 10) reasons.push('rollbackPlan is required');
  if (classification.approvalRequired) {
    if (!manifest.target || typeof manifest.target !== 'object') reasons.push('target object is required for high-risk approvals');
    if (!manifest.proofRequired || !Array.isArray(manifest.proofRequired) || manifest.proofRequired.length === 0) reasons.push('proofRequired[] is required for high-risk approvals');
  }
  if (!Number.isFinite(issuedAt) || now - issuedAt > APPROVAL_TTL_MS || issuedAt - now > 60_000) reasons.push('issuedAt must be within the last 30 minutes');
  if (!Number.isFinite(expiresAt) || expiresAt <= now) reasons.push('expiresAt must be in the future');

  if (reasons.length) {
    throw approvalError(`Invalid approval manifest: ${reasons.join('; ')}. Required fingerprint: ${classification.fingerprint}`);
  }
  return true;
}

function approvalError(message) {
  const err = new Error(message);
  err.code = 'APPROVAL_REQUIRED';
  err.classification = { risk: 'approval_required', approvalRequired: true };
  return err;
}

function sha256(input) {
  return createHash('sha256').update(input).digest('hex');
}
