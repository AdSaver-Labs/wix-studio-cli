import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const DEFAULT_REGISTRY_PATH = resolve(here, '../capabilities/wix-capability-registry.json');

const COMMAND_OPERATION_FALLBACKS = {
  'chrome-pages': 'site.context.pack',
  'context-pack': 'site.context.pack',
  'read-only-proof': 'site.context.pack',
  'plan-page': 'page.create',
  'plan-section': 'section.services.create',
  'plan-property-card': 'section.product_cards.create',
  'responsive-mode': 'responsive.viewport.capture',
  'responsive-audit': 'responsive.viewport.capture',
  'public-seo-proof': 'seo.public.audit',
  'seo-audit': 'seo.public.audit',
  'verification': 'qa.verdict.request',
  'manual/wix-template-selection': 'rollback.plan'
};

const PHASE_OPERATION_FALLBACKS = {
  preflight: 'site.context.pack',
  structure: 'page.create',
  pages: 'page.create',
  content: 'content.copy.apply',
  responsive: 'responsive.viewport.capture',
  seo: 'seo.public.audit',
  handoff: 'qa.verdict.request',
  'booking-data': 'stores.product.update'
};

export async function readCapabilityRegistry(path = DEFAULT_REGISTRY_PATH) {
  const raw = await readFile(path, 'utf8');
  const registry = JSON.parse(raw);
  const operations = Array.isArray(registry.operations) ? registry.operations : [];
  const byOperation = Object.fromEntries(operations.map((op) => [op.operation, op]));
  return { ...registry, operations, byOperation, path };
}

export function explainOperation(registry, operation) {
  if (!operation) throw new Error('Missing required option --operation');
  const exact = registry.byOperation?.[operation];
  if (exact) return { status: 'PASS', match: 'exact', operation: exact };
  const suggestions = suggestOperations(registry, operation);
  return { status: 'NOT_FOUND', operation, suggestions };
}

export function suggestOperations(registry, query) {
  const q = String(query || '').toLowerCase();
  return registry.operations
    .filter((op) => op.operation.toLowerCase().includes(q) || String(op.adapter).toLowerCase().includes(q) || String(op.risk).toLowerCase().includes(q))
    .slice(0, 12)
    .map((op) => op.operation);
}

export function summarizeRegistry(registry) {
  const byAdapter = countBy(registry.operations, (op) => op.adapter);
  const byRisk = countBy(registry.operations, (op) => op.risk);
  return {
    status: 'PASS',
    schemaVersion: registry.schemaVersion,
    operationCount: registry.operations.length,
    defaultPolicy: registry.defaultPolicy,
    byAdapter,
    byRisk,
    sampleOperations: registry.operations.slice(0, 12).map((op) => ({ operation: op.operation, adapter: op.adapter, risk: op.risk }))
  };
}

export async function routePlanFile(planPath, registryPath = DEFAULT_REGISTRY_PATH) {
  if (!planPath) throw new Error('Missing required option --plan');
  const [registry, planRaw] = await Promise.all([readCapabilityRegistry(registryPath), readFile(planPath, 'utf8')]);
  const plan = JSON.parse(planRaw);
  return routePlan(plan, registry);
}

export function routePlan(plan, registry) {
  const actions = Array.isArray(plan.actions) ? plan.actions : [];
  const routedActions = actions.map((action) => routeAction(action, registry));
  const missing = routedActions.filter((a) => !a.capability).map((a) => ({ order: a.order, command: a.command, phase: a.phase, inferredOperation: a.inferredOperation }));
  const highRisk = routedActions.filter((a) => /approval|required|publish|domain|payment|booking|regulated|security|external_write/i.test(a.capability?.risk || ''));
  const studioLastMile = routedActions.filter((a) => /studio/i.test(a.capability?.adapter || ''));
  return {
    status: missing.length ? 'PASS_WITH_WARNINGS' : 'PASS',
    operationCount: routedActions.length,
    missingCapabilityCount: missing.length,
    highRiskCount: highRisk.length,
    studioLastMileCount: studioLastMile.length,
    missing,
    routedActions,
    policy: {
      officialAdaptersFirst: true,
      studioAutomation: registry.defaultPolicy?.studioAutomation || 'last_mile_recipe_only',
      mobileProof: registry.defaultPolicy?.mobileProof || 'required_for_user_facing_changes',
      publish: registry.defaultPolicy?.publish || 'approval_manifest_required'
    }
  };
}

function routeAction(action, registry) {
  const inferredOperation = inferOperation(action);
  const capability = registry.byOperation?.[inferredOperation] || null;
  return {
    ...action,
    inferredOperation,
    capability: capability ? {
      operation: capability.operation,
      adapter: capability.adapter,
      risk: capability.risk,
      stablePublicSurface: capability.stablePublicSurface,
      proof: capability.proof || [],
      rollback: capability.rollback || []
    } : null,
    gate: capability ? gateForCapability(capability) : 'CAPABILITY_MAPPING_REQUIRED'
  };
}

function inferOperation(action = {}) {
  if (action.operation) return action.operation;
  if (COMMAND_OPERATION_FALLBACKS[action.command]) return COMMAND_OPERATION_FALLBACKS[action.command];
  if (PHASE_OPERATION_FALLBACKS[action.phase]) return PHASE_OPERATION_FALLBACKS[action.phase];
  return action.command || action.phase || 'unknown.operation';
}

function gateForCapability(capability) {
  if (/read_only|local_artifact/i.test(capability.risk)) return 'READ_ONLY_OK';
  if (/approval|required|publish|domain|payment|booking|regulated|security|external_write/i.test(capability.risk)) return 'APPROVAL_AND_QA_REQUIRED';
  if (/studio/i.test(capability.adapter)) return 'STUDIO_RECIPE_PROOF_REQUIRED';
  return 'MUTATION_RECEIPT_AND_RESPONSIVE_QA_REQUIRED';
}

function countBy(items, keyFn) {
  const out = {};
  for (const item of items) {
    const key = keyFn(item) || 'unknown';
    out[key] = (out[key] || 0) + 1;
  }
  return out;
}
