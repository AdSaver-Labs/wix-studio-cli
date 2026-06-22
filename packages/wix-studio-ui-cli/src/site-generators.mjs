import { createHash } from 'node:crypto';
import { viewportNames, viewportMatrixSummary, twoStepQaContract, qaProofRequirements } from './qa-contract.mjs';

const SUPPORTED_CHANGE_TYPES = new Set(['faq', 'about', 'header', 'footer', 'product', 'portfolio', 'policy', 'hero', 'services', 'cta']);

export function generateSiteChangeSpec(options = {}) {
  const type = String(options.type || '').toLowerCase();
  if (!SUPPORTED_CHANGE_TYPES.has(type)) {
    const err = new Error(`Unsupported --type "${options.type || ''}". Supported: ${[...SUPPORTED_CHANGE_TYPES].join(', ')}`);
    err.code = 'UNSUPPORTED_CHANGE_TYPE';
    throw err;
  }
  const context = normalizeContext(options);
  const template = templates[type](context);
  const spec = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    changeType: type,
    business: context.business,
    page: template.page,
    section: template.section,
    content: template.content,
    design: template.design,
    responsive: responsiveContract(type),
    conversion: template.conversion,
    seo: template.seo,
    accessibility: accessibilityContract(type),
    legal: template.legal || null,
    animation: template.animation || defaultAnimation(type),
    implementation: implementationContract(type),
    proof: proofContract(type),
    rollback: rollbackContract(type),
    assumptions: context.assumptions,
    fingerprint: null
  };
  spec.fingerprint = fingerprint(spec);
  return spec;
}

export function listSiteChangeTemplates() {
  return {
    status: 'PASS',
    supportedChangeTypes: [...SUPPORTED_CHANGE_TYPES],
    mobileFirstPolicy: 'desktop/tablet/phone are all required; phone is primary pass/fail for professional completion',
    viewportMatrix: viewportMatrixSummary(),
    twoStepQa: twoStepQaContract(),
    highRiskNotes: {
      policy: 'draft only until human/legal review',
      product: 'live store/order/payment changes require explicit approval',
      headerFooter: 'global sections require before/after proof and rollback',
      seo: 'indexing/canonical/redirect mutations require approval'
    }
  };
}

function normalizeContext(options) {
  const business = {
    name: options.businessName || options.business || 'Client Business',
    industry: options.industry || 'professional services',
    audience: options.audience || 'mobile-first visitors comparing providers',
    tone: options.tone || 'clear, confident, benefit-led, premium but practical',
    primaryGoal: options.goal || options.primaryGoal || 'convert qualified visitors into enquiries',
    location: options.location || null,
    language: options.language || 'en'
  };
  return {
    business,
    assumptions: [
      'Generated copy/design is a professional starting point and must be adapted to real client facts before publish.',
      'Phone experience is the primary pass/fail gate because most visitors are expected to arrive on mobile.',
      'Published Wix-domain proof is required separately from editor/preview proof because Wix preview/editor rendering can differ from the real published site.',
      'No domain, payment, order, booking, or publish action is implied by this generated spec.'
    ]
  };
}

const templates = {
  faq: (ctx) => ({
    page: { recommendedPageType: 'section_or_page', title: 'Frequently Asked Questions', slug: '/faq' },
    section: { type: 'faq', recommendedPlacement: 'near conversion decision point or standalone FAQ page' },
    content: {
      headline: 'Questions before you get started?',
      intro: `Clear answers about working with ${ctx.business.name}, timelines, pricing, process, and what happens next.`,
      blocks: [
        { q: `What does ${ctx.business.name} help with?`, a: `${ctx.business.name} helps ${ctx.business.audience} achieve ${ctx.business.primaryGoal} through a clear, professional process.` },
        { q: 'How quickly can we start?', a: 'Most projects begin with a short discovery step, then a scoped plan with milestones, deliverables, and proof points.' },
        { q: 'What do you need from us?', a: 'Access, brand assets, business facts, examples you like, and any must-have legal or operational requirements.' },
        { q: 'How do we know the work is complete?', a: 'Completion requires preview proof, phone-first responsive QA, content review, SEO basics, accessibility checks, and final approval.' }
      ]
    },
    design: { layout: 'accordion_cards', visualStyle: 'clean cards with generous spacing and strong contrast', typography: 'use existing site type scale; headings bold, answers readable at 16px+ on phone' },
    conversion: { primaryCta: 'Still have questions? Contact us', microcopy: 'Fast, clear next step with low friction.' },
    seo: { schemaCandidate: 'FAQPage', h2: 'Frequently Asked Questions', internalLinks: ['contact', 'services/about relevant page'] },
    animation: { allowed: ['subtle accordion open', 'fade-in on scroll'], reducedMotion: 'instant reveal without movement' }
  }),
  about: (ctx) => ({
    page: { recommendedPageType: 'page', title: `About ${ctx.business.name}`, slug: '/about' },
    section: { type: 'about_page', recommendedPlacement: 'main navigation and footer' },
    content: {
      headline: `A sharper way to choose ${ctx.business.industry} support.`,
      intro: `${ctx.business.name} exists to help ${ctx.business.audience} move from uncertainty to a clear, professionally executed result.`,
      blocks: [
        { heading: 'What we believe', body: 'Good work should be clear, measurable, easy to approve, and built around the way real customers decide.' },
        { heading: 'How we work', body: 'We combine strategy, implementation, mobile-first design, copy, QA, and proof so every change can be inspected before it goes live.' },
        { heading: 'Why clients choose us', body: 'Less guessing, fewer delays, cleaner execution, and a conversion-first website experience that works especially well on phones.' }
      ]
    },
    design: { layout: 'story_sections_with_trust_strip', visualStyle: 'premium editorial layout with human proof, trust markers, and strong CTA', typography: 'consistent H1/H2/body scale; avoid tiny body text on phone' },
    conversion: { primaryCta: 'Talk to us', secondaryCta: 'See our work', trustMarkers: ['process clarity', 'proof-based delivery', 'mobile-first QA'] },
    seo: { titleTemplate: `About ${ctx.business.name} | ${ctx.business.industry}`, metaDescription: `Learn how ${ctx.business.name} helps ${ctx.business.audience} with ${ctx.business.primaryGoal}.`, h1: `About ${ctx.business.name}` }
  }),
  header: (ctx) => ({
    page: { recommendedPageType: 'global_section', title: 'Global Header', slug: null },
    section: { type: 'header', recommendedPlacement: 'global site header' },
    content: { logoText: ctx.business.name, nav: ['Services', 'Work', 'About', 'FAQ', 'Contact'], primaryCta: 'Get started' },
    design: { layout: 'desktop_horizontal_tablet_compact_phone_drawer', visualStyle: 'sticky optional, clear contrast, CTA visible without crowding', typography: 'nav labels readable and tap-friendly' },
    conversion: { primaryCta: 'Get started', mobilePriority: ['logo', 'menu', 'CTA or contact shortcut'] },
    seo: { notes: 'Header links should support crawlable internal navigation without stuffing.' },
    animation: { allowed: ['subtle sticky shadow', 'menu fade'], reducedMotion: 'no animated menu travel' }
  }),
  footer: (ctx) => ({
    page: { recommendedPageType: 'global_section', title: 'Global Footer', slug: null },
    section: { type: 'footer', recommendedPlacement: 'global site footer' },
    content: { summary: `${ctx.business.name} helps ${ctx.business.audience} ${ctx.business.primaryGoal}.`, columns: ['Main pages', 'Services', 'Legal', 'Contact'], cta: 'Ready to talk?' },
    design: { layout: 'stacked_phone_grid_desktop', visualStyle: 'calm trust-building close with clear links and contact route', typography: 'small text never below 13px; legal links legible' },
    conversion: { primaryCta: 'Contact us', trustMarkers: ['clear legal links', 'contact details', 'brand close'] },
    seo: { internalLinks: ['home', 'services', 'about', 'contact', 'privacy', 'terms'] }
  }),
  product: (ctx) => ({
    page: { recommendedPageType: 'product_page_or_section', title: 'Product / Offer Detail', slug: '/products/example' },
    section: { type: 'product_detail', recommendedPlacement: 'product page, product cards, or offer section' },
    content: { headline: 'A clear offer built around the outcome customers want.', blocks: ['benefit-led summary', 'features translated into outcomes', 'proof/trust', 'pricing or next-step clarity', 'FAQ objections'] },
    design: { layout: 'mobile_stack_desktop_media_plus_details', visualStyle: 'image-led, benefit-led, CTA always easy to reach', typography: 'price/CTA hierarchy strong; body readable' },
    conversion: { primaryCta: 'Buy / enquire / book', secondaryCta: 'Ask a question', objections: ['fit', 'price', 'delivery', 'support'] },
    seo: { schemaCandidate: 'Product or Service', notes: 'Live store/catalog changes need approval and API readback.' }
  }),
  portfolio: (ctx) => ({
    page: { recommendedPageType: 'page_or_section', title: 'Portfolio / Work', slug: '/work' },
    section: { type: 'portfolio', recommendedPlacement: 'main nav and conversion support sections' },
    content: { headline: 'Work designed to be clear, credible, and conversion-focused.', blocks: ['case study cards', 'problem → solution → result', 'visual proof', 'service tags', 'CTA'] },
    design: { layout: 'filterable_grid_or_case_study_stack', visualStyle: 'strong imagery, concise cards, mobile cards first', typography: 'case titles clear; metadata secondary but readable' },
    conversion: { primaryCta: 'Start a similar project', proofNeeds: ['real client facts', 'permission to show work', 'before/after where possible'] },
    seo: { internalLinks: ['services', 'contact', 'about'], schemaCandidate: 'CreativeWork where applicable' }
  }),
  policy: (ctx) => ({
    page: { recommendedPageType: 'legal_policy_page', title: 'Policy Page Draft', slug: '/policy-draft' },
    section: { type: 'policy_page', recommendedPlacement: 'footer/legal navigation only after review' },
    content: { headline: 'Policy draft for review', blocks: ['scope', 'data/payment/service assumptions', 'customer responsibilities', 'limitations', 'contact route', 'review date'] },
    design: { layout: 'plain_readable_legal_document', visualStyle: 'simple, trustworthy, no distracting motion', typography: 'high readability, clear headings, body 16px+ on phone' },
    conversion: { primaryCta: 'Contact us with questions', note: 'Policy pages should reduce confusion without pretending to replace legal advice.' },
    seo: { robots: 'index only if client wants public policy indexed; no aggressive SEO copy' },
    legal: { status: 'DRAFT_REQUIRES_HUMAN_LEGAL_REVIEW', disclaimer: 'Generated policy content is not legal advice and must be reviewed against jurisdiction, business model, payment/refund/data practices, and client obligations before publishing.' }
  }),
  hero: (ctx) => genericSection(ctx, 'hero', 'A clear promise above the fold.', 'primary conversion section'),
  services: (ctx) => genericSection(ctx, 'services', 'Services explained as outcomes.', 'service grid or service detail section'),
  cta: (ctx) => genericSection(ctx, 'cta', 'A focused next step.', 'conversion close section')
};

function genericSection(ctx, type, headline, placement) {
  return {
    page: { recommendedPageType: 'section', title: headline, slug: null },
    section: { type, recommendedPlacement: placement },
    content: { headline, intro: `${ctx.business.name} helps ${ctx.business.audience} ${ctx.business.primaryGoal}.`, blocks: ['benefit', 'proof', 'next step'] },
    design: { layout: 'mobile_stack_then_desktop_enhancement', visualStyle: 'conversion-first, clear hierarchy, strong spacing', typography: 'consistent with site tokens' },
    conversion: { primaryCta: 'Get started', secondaryCta: 'Learn more' },
    seo: { notes: 'Use semantic headings and internal links where relevant.' }
  };
}

function responsiveContract(type) {
  return {
    policy: 'expanded desktop/tablet/phone/breakpoint matrix required; phone is primary pass/fail; large desktop/27-inch and breakpoint edges are also blocking for professional completion when layout breaks',
    viewports: viewportNames(),
    mustPass: ['no horizontal overflow', 'readable text', 'tap targets >=40px', 'CTA visible or intentionally placed', 'no clipped text/images', 'section order makes sense on phone'],
    typeSpecific: type === 'header' ? ['phone menu usable', 'logo/menu/CTA not crowded'] : type === 'product' ? ['CTA easy to reach', 'price/offer clarity on phone'] : []
  };
}

function accessibilityContract(type) {
  return {
    required: ['semantic heading order', 'alt text for meaningful images', 'contrast sanity', 'keyboard/focus usable for controls', 'reduced-motion fallback for animations'],
    typeSpecific: type === 'faq' ? ['accordion controls expose names/states where possible'] : type === 'policy' ? ['plain readable text structure'] : []
  };
}

function implementationContract(type) {
  const adapterByType = {
    faq: 'cms_or_studio_recipe',
    about: 'content_generator_then_studio_recipe',
    header: 'studio_recipe_last_mile',
    footer: 'studio_recipe_last_mile',
    product: 'stores_or_cms_then_blocks_or_studio',
    portfolio: 'cms_then_blocks_or_studio',
    policy: 'content_generator_then_studio_or_git'
  };
  return {
    preferredAdapter: adapterByType[type] || 'studio_recipe_or_blocks',
    requiresRecipe: ['header', 'footer', 'faq', 'about', 'product', 'portfolio', 'policy'].includes(type),
    failClosedOn: ['selector drift', 'unexpected dialog', 'missing save proof', 'missing editor/preview proof', 'missing published Wix-domain proof', 'missing expanded responsive proof'],
    approvalRequiredIf: ['publish', 'domain/DNS', 'payment/order/booking mutation', 'SEO indexing/canonical/redirect mutation', 'legal finalization']
  };
}

function proofContract(type) {
  return {
    required: qaProofRequirements(),
    twoStepQa: twoStepQaContract(),
    content: ['placeholder scan', 'brand/tone fit review', 'conversion clarity review'],
    seo: ['title/meta/H1/internal links where page-level change applies'],
    legal: type === 'policy' ? ['human/legal review required before publish'] : []
  };
}

function rollbackContract(type) {
  return type === 'policy'
    ? ['keep previous policy page until reviewed', 'remove draft page or restore previous policy', 'use Wix site history if needed']
    : ['restore previous copy/layout from receipt', 'remove inserted section/page if needed', 'use Wix site history for visual rollback'];
}

function defaultAnimation(type) {
  if (type === 'policy') return { allowed: [], reducedMotion: 'no animation' };
  return { allowed: ['subtle fade-in', 'gentle reveal', 'non-blocking hover states'], avoid: ['heavy parallax on phone', 'motion that hides content', 'effects without reduced-motion fallback'], reducedMotion: 'static content, no travel/scroll effects' };
}

function fingerprint(spec) {
  const copy = { ...spec, generatedAt: null, fingerprint: null };
  return createHash('sha256').update(JSON.stringify(copy)).digest('hex');
}
