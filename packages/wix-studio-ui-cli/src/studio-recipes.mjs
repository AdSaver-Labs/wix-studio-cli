import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { clickByLabelScript, textEditScript, saveStateDetectScript, selectorResolveScript } from './dom-recipes.mjs';
import { writeArtifact } from './evidence.mjs';

const SUPPORTED_STEP_TYPES = new Set([
  'selector-resolve',
  'click-by-label',
  'text-edit',
  'responsive-mode',
  'snapshot',
  'save-state-detect',
  'wait'
]);

const MUTATING_STEP_TYPES = new Set(['click-by-label', 'text-edit']);

export async function readStudioRecipe(path) {
  if (!path) throw new Error('Missing required option --recipe');
  const raw = await readFile(resolve(path), 'utf8');
  let recipe;
  try {
    recipe = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Recipe must be JSON for v1. YAML support can be layered later. Parse error: ${err.message}`);
  }
  return normalizeStudioRecipe(recipe, path);
}

export function normalizeStudioRecipe(recipe, path = null) {
  const normalized = {
    schemaVersion: recipe.schemaVersion,
    recipeId: recipe.recipeId || recipe.id || null,
    operation: recipe.operation || null,
    title: recipe.title || null,
    description: recipe.description || null,
    target: recipe.target || {},
    risk: recipe.risk || 'reversible_ui_candidate',
    mobileFirst: recipe.mobileFirst !== false,
    preconditions: Array.isArray(recipe.preconditions) ? recipe.preconditions : [],
    steps: Array.isArray(recipe.steps) ? recipe.steps : [],
    verification: Array.isArray(recipe.verification) ? recipe.verification : [],
    rollback: Array.isArray(recipe.rollback) ? recipe.rollback : [],
    sourcePath: path,
    fingerprint: recipeFingerprint(recipe)
  };
  return normalized;
}

export function validateStudioRecipe(recipe) {
  const errors = [];
  const warnings = [];
  if (recipe.schemaVersion !== 1) errors.push('schemaVersion must be 1');
  if (!recipe.recipeId || !/^[a-z0-9][a-z0-9._-]{2,80}$/i.test(recipe.recipeId)) errors.push('recipeId is required and must be stable/id-like');
  if (!recipe.operation) errors.push('operation is required and should match the capability registry when possible');
  if (!recipe.title) warnings.push('title is recommended for operator review');
  if (!recipe.steps.length) errors.push('steps[] must contain at least one step');
  if (!recipe.rollback.length) warnings.push('rollback[] is recommended for any mutation-capable recipe');
  if (!recipe.verification.length) warnings.push('verification[] is recommended; include save-state, screenshot, preview/responsive proof where relevant');
  if (recipe.mobileFirst !== true) warnings.push('mobileFirst should stay true for professional Wix design changes');

  recipe.steps.forEach((step, index) => {
    const label = `steps[${index}]`;
    if (!SUPPORTED_STEP_TYPES.has(step.type)) errors.push(`${label}.type unsupported: ${step.type}`);
    if (step.type === 'click-by-label' && !step.label) errors.push(`${label}.label is required for click-by-label`);
    if (step.type === 'selector-resolve' && !step.label) errors.push(`${label}.label is required for selector-resolve`);
    if (step.type === 'text-edit' && !step.label && !step.selector) errors.push(`${label}.label or selector is required for text-edit`);
    if (step.type === 'text-edit' && typeof step.text !== 'string') errors.push(`${label}.text string is required for text-edit`);
    if (step.type === 'responsive-mode' && step.mode && !['desktop', 'tablet', 'mobile'].includes(step.mode)) errors.push(`${label}.mode must be desktop/tablet/mobile`);
    if (step.type === 'wait' && step.ms !== undefined && !Number.isFinite(Number(step.ms))) errors.push(`${label}.ms must be numeric`);
  });

  const mutatingSteps = recipe.steps.filter((step) => MUTATING_STEP_TYPES.has(step.type));
  const requiresSaveProof = mutatingSteps.length > 0;
  if (requiresSaveProof && !recipe.verification.some((item) => /save|snapshot|responsive|preview/i.test(JSON.stringify(item)))) {
    warnings.push('mutation-capable recipe should require save/snapshot/responsive/preview proof');
  }

  return {
    ok: errors.length === 0,
    status: errors.length ? 'FAIL' : warnings.length ? 'PASS_WITH_WARNINGS' : 'PASS',
    errors,
    warnings,
    counts: {
      preconditions: recipe.preconditions.length,
      steps: recipe.steps.length,
      mutatingSteps: mutatingSteps.length,
      verification: recipe.verification.length,
      rollback: recipe.rollback.length
    }
  };
}

export function dryRunStudioRecipe(recipe) {
  const validation = validateStudioRecipe(recipe);
  const steps = recipe.steps.map((step, index) => ({
    order: index + 1,
    type: step.type,
    mutates: MUTATING_STEP_TYPES.has(step.type),
    labelHash: step.label ? sha256(String(step.label)) : null,
    selectorHash: step.selector ? sha256(String(step.selector)) : null,
    textHash: typeof step.text === 'string' ? sha256(step.text) : null,
    mode: step.mode || null,
    out: step.out || null,
    proof: step.proof || []
  }));
  return {
    status: validation.status,
    ok: validation.ok,
    recipeId: recipe.recipeId,
    operation: recipe.operation,
    risk: recipe.risk,
    mobileFirst: recipe.mobileFirst,
    fingerprint: recipe.fingerprint,
    validation,
    preconditions: recipe.preconditions,
    steps,
    verification: recipe.verification,
    rollback: recipe.rollback,
    executionPolicy: {
      mutateOnlyWithExecute: true,
      reversibleMutationsRequireMutationOkOrApprovalManifest: true,
      publishDomainPaymentsBookingsStillBlockedByRiskPolicy: true,
      phonePrimaryResponsiveProofRequired: true
    }
  };
}

export async function runStudioRecipe(client, recipe, args = {}) {
  const validation = validateStudioRecipe(recipe);
  if (!validation.ok) {
    const err = new Error(`Recipe validation failed: ${validation.errors.join('; ')}`);
    err.code = 'RECIPE_INVALID';
    throw err;
  }
  const outDir = args.out || `evidence/studio-recipe-${recipe.recipeId}-${new Date().toISOString().replace(/[:.]/g, '-')}`;
  const results = [];
  for (let i = 0; i < recipe.steps.length; i++) {
    const step = recipe.steps[i];
    const startedAt = new Date().toISOString();
    let result;
    if (step.type === 'selector-resolve') result = valueOf(await client.evaluate(selectorResolveScript(step.label)));
    else if (step.type === 'click-by-label') result = valueOf(await client.evaluate(clickByLabelScript(step.label)));
    else if (step.type === 'text-edit') result = valueOf(await client.evaluate(textEditScript({ selector: step.selector, label: step.label, text: step.text })));
    else if (step.type === 'save-state-detect') result = valueOf(await client.evaluate(saveStateDetectScript()));
    else if (step.type === 'responsive-mode') {
      const viewport = viewportFor(step.mode || 'desktop');
      await client.send('Emulation.setDeviceMetricsOverride', { ...viewport, deviceScaleFactor: 1, mobile: viewport.mobile });
      result = { ok: true, viewport, mode: step.mode || 'desktop' };
    } else if (step.type === 'snapshot') {
      await client.send('Page.enable');
      const shot = await client.send('Page.captureScreenshot', { format: step.format || args.format || 'png', captureBeyondViewport: true });
      const path = `${outDir.replace(/\/$/, '')}/${String(i + 1).padStart(2, '0')}-${step.name || 'snapshot'}.${step.format === 'jpeg' || args.format === 'jpeg' ? 'jpg' : 'png'}`;
      result = { captured: true, screenshot: await writeArtifact(path, shot.data, 'base64') };
    } else if (step.type === 'wait') {
      await sleep(Number(step.ms || 750));
      result = { waitedMs: Number(step.ms || 750) };
    }
    results.push({ order: i + 1, type: step.type, mutates: MUTATING_STEP_TYPES.has(step.type), startedAt, finishedAt: new Date().toISOString(), result });
    if (step.failClosedOnFalse !== false && result && result.ok === false) {
      const err = new Error(`Recipe step ${i + 1} failed closed: ${step.type}`);
      err.code = 'RECIPE_STEP_FAILED';
      err.partialResults = results;
      throw err;
    }
  }
  return {
    status: 'PASS',
    recipeId: recipe.recipeId,
    operation: recipe.operation,
    fingerprint: recipe.fingerprint,
    validation,
    results,
    verificationRequired: recipe.verification,
    rollback: recipe.rollback,
    outDir
  };
}

function viewportFor(mode) {
  if (mode === 'mobile') return { width: 390, height: 844, mobile: true };
  if (mode === 'tablet') return { width: 768, height: 1024, mobile: true };
  return { width: 1440, height: 900, mobile: false };
}

function recipeFingerprint(recipe) {
  const stable = {
    schemaVersion: recipe.schemaVersion,
    recipeId: recipe.recipeId || recipe.id || null,
    operation: recipe.operation || null,
    target: recipe.target || {},
    risk: recipe.risk || null,
    steps: Array.isArray(recipe.steps) ? recipe.steps.map((step) => ({ ...step, text: typeof step.text === 'string' ? sha256(step.text) : step.text })) : [],
    verification: recipe.verification || [],
    rollback: recipe.rollback || []
  };
  return sha256(JSON.stringify(stable));
}

function sha256(input) {
  return createHash('sha256').update(input).digest('hex');
}

function valueOf(runtimeResult) {
  return runtimeResult?.result?.value ?? runtimeResult;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
