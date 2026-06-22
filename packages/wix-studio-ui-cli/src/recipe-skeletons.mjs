import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { qaProofRequirements, twoStepQaContract, viewportNames } from './qa-contract.mjs';

export async function generateRecipeSkeletonFromSpecFile(specPath, options = {}) {
  if (!specPath) throw new Error('Missing required option --spec');
  const spec = JSON.parse(await readFile(specPath, 'utf8'));
  return generateRecipeSkeletonFromSpec(spec, options);
}

export function generateRecipeSkeletonFromSpec(spec, options = {}) {
  const changeType = spec.changeType || spec.section?.type || 'custom';
  const recipe = {
    schemaVersion: 1,
    recipeId: options.recipeId || `skeleton.${changeType}.${slug(spec.business?.name || 'test-site')}`,
    generatedAt: new Date().toISOString(),
    sourceSpecFingerprint: spec.fingerprint || null,
    operation: operationFor(changeType),
    target: {
      environment: 'non-client-wix-test-site',
      page: spec.page?.slug || spec.page?.title || null,
      sectionType: spec.section?.type || changeType,
      publishAllowed: false
    },
    preconditions: [
      'Use only a non-client Wix test site until QA Manager PASS exists.',
      'Open the intended Wix Studio editor tab in a user-owned browser session.',
      'Run context-pack/read-only-proof before mutation.',
      'Resolve selectors with /selectors/evidence-compatible proof before every click/edit.',
      'Do not publish, attach domains, mutate payments/orders/bookings, or change SEO indexing/canonical/redirect settings without explicit scoped approval.'
    ],
    selectorStrategy: {
      required: ['/inputs/buttons/selectors', '/selectors/evidence-compatible', '/ARIA/data'],
      fallbackOrder: ['stable data-testid/data-hook', 'ARIA role+name', 'visible label text', 'manually approved selector'],
      failClosedOn: ['selector drift', 'multiple ambiguous candidates', 'unexpected dialog', 'missing save proof', 'missing phone proof']
    },
    steps: stepsForSpec(spec),
    verification: {
      requiredProof: qaProofRequirements(),
      twoStepQa: twoStepQaContract(),
      responsiveViewports: viewportNames(),
      commands: [
        'qa-preview-inspect --execute --cdp-url <editor-or-preview-ws> --out <evidence/preview-qa>',
        'publish-test-site --execute --approval-manifest <manifest.json> --target <non-client-test-site>',
        'qa-published-inspect --execute --cdp-url <browser-ws> --url <published-wix-domain-url> --out <evidence/published-qa>'
      ]
    },
    rollback: {
      required: true,
      notes: spec.rollback || ['restore previous copy/layout from receipt', 'remove inserted section/page if needed', 'use Wix site history for visual rollback']
    },
    risk: {
      default: 'reversible_ui_candidate',
      approvalRequiredIf: ['publish', 'domain/DNS', 'payment/order/booking mutation', 'SEO indexing/canonical/redirect mutation', 'legal/policy finalization']
    },
    fingerprint: null
  };
  recipe.fingerprint = fingerprint(recipe);
  return recipe;
}

function stepsForSpec(spec) {
  const steps = [];
  const type = spec.changeType || spec.section?.type || 'custom';
  steps.push({
    id: 'resolve-target-surface',
    kind: 'selector-proof',
    intent: `Find target surface for ${type}`,
    requiredEvidence: ['/selectors/evidence-compatible', '/ARIA/data'],
    selector: null,
    execute: false
  });
  steps.push({
    id: 'apply-content-draft',
    kind: 'manual-or-text-edit-skeleton',
    intent: 'Apply generated copy/content only after client facts are confirmed.',
    contentPreview: summarizeContent(spec.content),
    selector: null,
    execute: false
  });
  steps.push({
    id: 'apply-layout-guidance',
    kind: 'manual-or-studio-layout-skeleton',
    intent: spec.design?.layout || 'Apply mobile-first layout guidance.',
    design: spec.design || {},
    selector: null,
    execute: false
  });
  if (spec.animation?.allowed?.length) {
    steps.push({
      id: 'apply-safe-animation',
      kind: 'manual-or-studio-animation-skeleton',
      intent: 'Apply only subtle non-blocking animations with reduced-motion fallback.',
      animation: spec.animation,
      selector: null,
      execute: false
    });
  }
  steps.push({ id: 'save-state-proof', kind: 'save-state-detect', requiredState: 'saved_visible', execute: false });
  steps.push({ id: 'responsive-preview-proof', kind: 'qa-preview-inspect', viewports: 'expanded', execute: false });
  return steps;
}

function operationFor(type) {
  const map = {
    faq: 'content.faq.add',
    about: 'page.about.optimize',
    header: 'global.header.rework',
    footer: 'global.footer.rework',
    product: 'commerce.product-page.optimize',
    portfolio: 'content.portfolio.add',
    policy: 'legal.policy.draft',
    hero: 'section.hero.optimize',
    services: 'section.services.optimize',
    cta: 'section.cta.optimize'
  };
  return map[type] || `custom.${type}`;
}

function summarizeContent(content = {}) {
  return {
    headline: content.headline || null,
    intro: content.intro || null,
    blockCount: Array.isArray(content.blocks) ? content.blocks.length : 0
  };
}

function slug(input) {
  return String(input).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'site';
}

function fingerprint(recipe) {
  const copy = { ...recipe, generatedAt: null, fingerprint: null };
  return createHash('sha256').update(JSON.stringify(copy)).digest('hex');
}
