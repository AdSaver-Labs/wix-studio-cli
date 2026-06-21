import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const REQUIRED_BOOKING_PAGES = ['home', 'properties', 'property-detail', 'booking', 'contact'];
const REQUIRED_HOME_SECTIONS = ['hero', 'trust', 'featured-properties', 'how-it-works', 'cta'];
const REQUIRED_PROOF_GATES = ['desktop-screenshot', 'mobile-screenshot', 'save-state', 'public-seo-proof'];

export async function readSiteSpec(specPath) {
  if (!specPath) throw new Error('Missing required option --spec');
  const raw = await readFile(specPath, 'utf8');
  try {
    const spec = JSON.parse(raw);
    return normalizeSiteSpec(spec, specPath);
  } catch (error) {
    throw new Error(`SITE_SPEC_INVALID_JSON: ${error.message}`);
  }
}

export function normalizeSiteSpec(spec, sourcePath = null) {
  const normalized = {
    schemaVersion: spec.schemaVersion || 1,
    sourcePath,
    siteType: spec.siteType || spec.type || 'booking-site',
    businessName: spec.businessName || spec.brand?.name || '',
    primaryLanguage: spec.primaryLanguage || spec.language || 'en',
    secondaryLanguages: spec.secondaryLanguages || spec.languages?.filter((l) => l !== (spec.primaryLanguage || spec.language)) || [],
    brand: spec.brand || {},
    pages: Array.isArray(spec.pages) ? spec.pages : [],
    sections: spec.sections || {},
    properties: spec.properties || spec.listings || [],
    integrations: spec.integrations || {},
    seo: spec.seo || {},
    conversion: spec.conversion || {},
    proofGates: spec.proofGates || REQUIRED_PROOF_GATES,
    constraints: spec.constraints || []
  };
  normalized.fingerprint = sha256(JSON.stringify({
    siteType: normalized.siteType,
    businessName: normalized.businessName,
    pages: normalized.pages,
    properties: normalized.properties,
    seo: normalized.seo,
    integrations: normalized.integrations
  }));
  return normalized;
}

export function validateSiteSpec(spec) {
  const errors = [];
  const warnings = [];
  const pageIds = new Set((spec.pages || []).map((p) => p.id || p.slug || p.name).filter(Boolean));
  const sectionIds = new Set(Object.keys(spec.sections || {}));

  if (spec.schemaVersion !== 1) warnings.push(`unknown schemaVersion ${spec.schemaVersion}; treating as v1-compatible`);
  if (!spec.businessName || spec.businessName.length < 2) errors.push('businessName is required');
  if (!['booking-site', 'business-site', 'landing-page'].includes(spec.siteType)) warnings.push(`siteType ${spec.siteType} is not a standard template type`);
  if (!Array.isArray(spec.pages) || spec.pages.length < 3) errors.push('pages must include at least 3 page definitions');

  for (const required of REQUIRED_BOOKING_PAGES) {
    if (spec.siteType === 'booking-site' && !pageIds.has(required)) errors.push(`booking-site missing required page: ${required}`);
  }
  for (const required of REQUIRED_HOME_SECTIONS) {
    if (spec.siteType === 'booking-site' && !sectionIds.has(required)) errors.push(`booking-site missing required section: ${required}`);
  }

  for (const page of spec.pages || []) {
    const id = page.id || page.slug || page.name || '[unnamed]';
    if (!page.title || page.title.length < 3) errors.push(`page ${id} missing title`);
    if (!page.slug || !/^[a-z0-9-\/]+$/.test(page.slug)) errors.push(`page ${id} missing latin kebab slug`);
    if (!Array.isArray(page.sections) || page.sections.length === 0) errors.push(`page ${id} missing sections[]`);
    if (page.seo) {
      if (!page.seo.title || page.seo.title.length > 75) errors.push(`page ${id} SEO title missing or >75 chars`);
      if (!page.seo.metaDescription || page.seo.metaDescription.length < 80 || page.seo.metaDescription.length > 170) errors.push(`page ${id} metaDescription must be 80-170 chars`);
    } else warnings.push(`page ${id} missing seo object`);
  }

  if (spec.siteType === 'booking-site') {
    if (!Array.isArray(spec.properties) || spec.properties.length < 1) errors.push('booking-site requires at least one property/listing');
    for (const property of spec.properties || []) {
      const id = property.id || property.slug || property.name || '[unnamed-property]';
      if (!property.name) errors.push(`property ${id} missing name`);
      if (!property.bookingUrl && !property.bookingWidget && !property.integrationId) errors.push(`property ${id} missing bookingUrl/bookingWidget/integrationId`);
      if (!Array.isArray(property.images) || property.images.length < 1) warnings.push(`property ${id} has no image references`);
    }
    if (!spec.integrations.booking && !spec.integrations.hospitable && !spec.integrations.customBooking) warnings.push('booking-site has no explicit booking integration object');
  }

  for (const gate of REQUIRED_PROOF_GATES) {
    if (!spec.proofGates.includes(gate)) errors.push(`proofGates missing required gate: ${gate}`);
  }

  return {
    ok: errors.length === 0,
    status: errors.length ? 'FAIL' : warnings.length ? 'PASS_WITH_WARNINGS' : 'PASS',
    errors,
    warnings,
    counts: { pages: spec.pages.length, sections: sectionIds.size, properties: spec.properties.length, proofGates: spec.proofGates.length }
  };
}

export function buildImplementationPlan(spec) {
  const validation = validateSiteSpec(spec);
  const actions = [];
  let order = 1;
  const add = (phase, command, risk, detail, proof = []) => actions.push({ order: order++, phase, command, risk, detail, proof });

  add('preflight', 'chrome-pages', 'read_only', 'Attach to the intended Wix Studio test-site editor tab only.', ['selected Chrome page title/url']);
  add('preflight', 'context-pack', 'read_only', 'Capture inspect, element-map, frame-map, diagnostics, save-state, and screenshot before mutations.', ['context-pack artifacts']);
  add('structure', 'manual/wix-template-selection', 'operator_step', 'Create or select a Wix Studio test site/template matching the business/booking style. CLI must not create paid/live resources silently.', ['test site dashboard/editor URL']);

  for (const page of spec.pages) {
    add('pages', 'plan-page', 'reversible_ui_candidate', `Create/configure page "${page.title}" at slug /${page.slug}; sections: ${(page.sections || []).join(', ')}`, ['before/after snapshot', 'save-state']);
  }
  for (const [sectionId, section] of Object.entries(spec.sections || {})) {
    add('content', 'plan-section', 'reversible_ui_candidate', `Build section ${sectionId}: ${section.intent || section.heading || 'content block'} with CTA/layout/media requirements.`, ['element-map selector proof', 'desktop screenshot', 'mobile screenshot']);
  }
  for (const property of spec.properties || []) {
    add('booking-data', 'plan-property-card', 'approval_required_if_live_booking', `Add property card/detail for ${property.name}; booking target must remain test/draft unless Alej approves live integration.`, ['booking link/widget proof', 'no live payment mutation']);
  }
  add('responsive', 'responsive-mode', 'read_only', 'Capture desktop/tablet/mobile visual proof and note breakpoints needing manual polish.', ['desktop screenshot', 'tablet screenshot', 'mobile screenshot']);
  add('seo', 'public-seo-proof', 'read_only_after_publish_or_preview', 'Run public/readable SEO proof only against preview/public test URL, not client production.', ['title/meta/canonical/OG/headings proof']);
  add('handoff', 'verification', 'read_only', 'Emit final proof checklist and remaining unproven gaps before touching real booking website.', ['verification JSON', 'operator summary']);

  return {
    status: validation.ok ? 'PASS' : 'BLOCKED_SPEC_INVALID',
    specFingerprint: spec.fingerprint,
    businessName: spec.businessName,
    siteType: spec.siteType,
    validation,
    phases: summarizePhases(actions),
    actions,
    mutationPolicy: {
      default: 'dry-run/read-only first',
      liveClientSite: 'blocked until test-site proof and explicit Alej approval',
      publish: 'blocked without approval manifest and proof gates',
      bookingPaymentsOrders: 'blocked without explicit approval and sandbox/test evidence'
    }
  };
}

function summarizePhases(actions) {
  const map = new Map();
  for (const action of actions) map.set(action.phase, (map.get(action.phase) || 0) + 1);
  return [...map.entries()].map(([phase, count]) => ({ phase, count }));
}

function sha256(input) {
  return createHash('sha256').update(input).digest('hex');
}
