import { classifyAction } from './risk-policy.mjs';

export const ADAPTER_CONTRACT_SCHEMA_VERSION = 1;
export const APPROVAL_MANIFEST_SCHEMA_VERSION = 2;

const COMMON_EXECUTION_STATES = [
  'NOT_STARTED',
  'PREFLIGHT_READY',
  'DRY_RUN_VERIFIED',
  'EXECUTION_APPROVED',
  'EXECUTION_STARTED',
  'POSTCHECK_VERIFIED',
  'ROLLBACK_READY',
  'FAILED_CLOSED'
];

const ADAPTER_CONTRACTS = {
  api: {
    adapter: 'api',
    executor: 'api-adapter',
    status: 'interface_defined_executor_fail_closed',
    purpose: 'Structured Wix objects through official Wix API/SDK/MCP routes before browser UI automation.',
    allowedRisk: ['read_only', 'low', 'medium'],
    requiredInputs: ['operation', 'target.siteId', 'target.objectType', 'payloadHash', 'idempotencyKey'],
    preconditions: ['official credential hint present', 'target site resolved', 'dry-run diff generated', 'rollback strategy declared'],
    executeContract: ['validate target binding', 'create before snapshot', 'apply idempotent API call', 'write receipt', 'run postcheck'],
    postchecks: ['API readback matches intended payload', 'preview/rendered proof when visible output changed'],
    rollback: ['restore previous object snapshot', 're-run postcheck', 'write rollback receipt'],
    failClosedUntil: ['real API client implementation exists', 'sandbox/non-client proof passes', 'QA verdict accepts evidence']
  },
  git: {
    adapter: 'git',
    executor: 'git-wix-cli-adapter',
    status: 'interface_defined_executor_fail_closed',
    purpose: 'Wix code/custom app changes with Git/Wix CLI, reviewable diffs, and reversible commits.',
    allowedRisk: ['read_only', 'low', 'medium'],
    requiredInputs: ['operation', 'repoStatusClean', 'branch', 'diffHash', 'testCommand'],
    preconditions: ['clean worktree or explicit stash plan', 'local tests pass before change', 'rollback branch/commit known'],
    executeContract: ['apply patch', 'run tests', 'commit only if requested by operator workflow', 'sync only after proof gate'],
    postchecks: ['tests pass', 'diff reviewed', 'Wix CLI dry-run/sync readiness evidence exists'],
    rollback: ['git restore/revert to recorded commit', 'rerun tests'],
    failClosedUntil: ['Wix Git sync path is proven on non-client site', 'branch protection/review policy is documented']
  },
  studio: {
    adapter: 'studio',
    executor: 'studio-recipe-adapter',
    status: 'interface_defined_recipe_required',
    purpose: 'Last-mile Wix Studio editor operations that official APIs/Git cannot perform.',
    allowedRisk: ['reversible_ui_candidate', 'approval_required'],
    requiredInputs: ['recipeId', 'recipeFingerprint', 'selectorEvidence', 'beforeSnapshot', 'mutationApproval'],
    preconditions: ['target is non-client/test or explicitly approved', 'selector confidence proof exists', 'phone-primary responsive proof plan exists', 'save-state baseline captured'],
    executeContract: ['run one recipe step at a time', 'capture evidence per step', 'verify saved state', 'stop on ambiguity/inert controls/error banners'],
    postchecks: ['editor-preview-inspection PASS', 'responsive-audit PASS', 'save-state PASS'],
    rollback: ['recipe rollback steps or manual restore path', 'restore snapshot/duplicate page when available'],
    failClosedUntil: ['recipe validates', 'approval manifest is bound to exact fingerprint when required', 'QA preview proof passes']
  },
  qa: {
    adapter: 'qa',
    executor: 'qa-adapter',
    status: 'evidence_only_available',
    purpose: 'Preview/published/rendered proof collection and decision-grade QA verdicts.',
    allowedRisk: ['read_only'],
    requiredInputs: ['targetUrlOrPreviewFrame', 'viewportMatrix', 'proofDirectory'],
    preconditions: ['target URL/frame selected', 'no editor-chrome-only screenshots counted as rendered proof'],
    executeContract: ['capture desktop/tablet/phone/breakpoint evidence', 'scan console/runtime symptoms', 'summarize PASS/FAIL/BLOCKED'],
    postchecks: ['phone proof included', 'large desktop proof included', '320px/390px edge proof included'],
    rollback: ['not applicable; evidence-only adapter'],
    failClosedUntil: []
  },
  publish: {
    adapter: 'publish',
    executor: 'publish-adapter',
    status: 'contract_only_fail_closed',
    purpose: 'Approval-gated publish to non-client Wix temporary domain after preview QA passes.',
    allowedRisk: ['approval_required'],
    requiredInputs: ['approvalManifest', 'previewQaPassReceipt', 'nonClientSiteProof', 'rollbackPlan'],
    preconditions: ['operator approval manifest valid', 'custom domain/DNS not in scope', 'preview QA PASS', 'rollback/restore plan documented'],
    executeContract: ['validate manifest', 'click or API publish only through proven publisher adapter', 'capture publish receipt', 'run published-domain QA'],
    postchecks: ['published-wix-domain-inspection PASS', 'responsive-audit PASS', 'SEO/content sanity PASS'],
    rollback: ['restore previous version if available or publish prior duplicate/test backup', 'document residual risk'],
    failClosedUntil: ['publisher adapter is implemented and proven on non-client site']
  },
  human: {
    adapter: 'human',
    executor: 'human-handoff',
    status: 'manual_review_required',
    purpose: 'Operations that are unmapped, too risky, or require human platform decisions.',
    allowedRisk: ['approval_required'],
    requiredInputs: ['question', 'evidenceBundle', 'recommendedDecision'],
    preconditions: ['exact blocker stated', 'safe options listed'],
    executeContract: ['no automated mutation', 'handoff to operator'],
    postchecks: ['operator decision captured before next action'],
    rollback: ['not applicable until operator approves a concrete mutation path'],
    failClosedUntil: ['capability mapping and executor proof exist']
  }
};

export function listAdapterContracts() {
  return {
    schemaVersion: ADAPTER_CONTRACT_SCHEMA_VERSION,
    status: 'PASS',
    writeExecutorsFailClosed: true,
    executionStates: COMMON_EXECUTION_STATES,
    contracts: Object.values(ADAPTER_CONTRACTS)
  };
}

export function adapterKey(adapter = '') {
  const normalized = String(adapter).toLowerCase();
  if (normalized.includes('api') || normalized.includes('sdk') || normalized.includes('mcp')) return 'api';
  if (normalized.includes('git') || normalized.includes('cli')) return 'git';
  if (normalized.includes('studio')) return 'studio';
  if (normalized.includes('qa')) return 'qa';
  if (normalized.includes('publish')) return 'publish';
  return 'human';
}

export function contractForAdapter(adapter) {
  return ADAPTER_CONTRACTS[adapterKey(adapter)] || ADAPTER_CONTRACTS.human;
}

export function executionContractFor(capability = {}) {
  const contract = contractForAdapter(capability.adapter);
  return {
    executor: contract.executor,
    mode: contract.status,
    operation: capability.operation || null,
    contractSchemaVersion: ADAPTER_CONTRACT_SCHEMA_VERSION,
    requiredInputs: contract.requiredInputs,
    preconditions: contract.preconditions,
    executeContract: contract.executeContract,
    postchecks: contract.postchecks,
    rollback: contract.rollback,
    failClosedUntil: contract.failClosedUntil
  };
}

export function buildApprovalManifestTemplate({ command, options = {}, now = new Date() }) {
  const classification = classifyAction(command, options);
  const issuedAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + 30 * 60 * 1000).toISOString();
  const proofRequired = classification.approvalRequired
    ? ['before_snapshot', 'dry_run_receipt', 'rollback_plan', 'after_snapshot', 'save_state', 'qa_preview_or_published_pass']
    : ['before_snapshot', 'after_snapshot', 'save_state'];
  return {
    schemaVersion: APPROVAL_MANIFEST_SCHEMA_VERSION,
    approved: false,
    command,
    fingerprint: classification.fingerprint,
    operator: '[operator-name-required]',
    issuedAt,
    expiresAt,
    target: {
      siteId: options.siteId || '[required-for-high-risk]',
      pageId: options.pageId || '[required-when-known]',
      publicUrl: options.publicUrl || '[required-when-known]',
      cdpTargetUrlHash: options.cdpTargetUrl ? '[bound-in-fingerprint]' : '[optional]'
    },
    rollbackPlan: '[write a concrete rollback/restore plan before setting approved=true]',
    proofRequired,
    risk: classification.risk,
    approvalRequired: classification.approvalRequired,
    reasons: classification.reasons,
    safetyNotice: 'This is a template, not approval. Set approved=true only after Alej/operator approves this exact fingerprint and target.'
  };
}
