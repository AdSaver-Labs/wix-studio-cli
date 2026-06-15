const fs = require('fs');
const path = require('path');
const config = require('../config');

const terminology = [
  [/Top Apartments/gi, 'Top Kvartiri'],
  [/top apartments/gi, 'Top Kvartiri'],
  [/\bmasters\b/gi, 'contractors'],
  [/\bcraftsmen\b/gi, 'contractors'],
  [/\bflat\b/gi, 'apartment'],
  [/\bflats\b/gi, 'apartments'],
  [/\blodgers\b/gi, 'tenants'],
  [/\bobject\b/gi, 'property'],
  [/\bobjects\b/gi, 'properties'],
  [/\brepair works\b/gi, 'renovation work'],
  [/\brents management\b/gi, 'rental management'],
  [/\bmanagement of apartments\b/gi, 'apartment management'],
  [/\bhelps the owners already during\b/gi, 'helps owners during'],
  [/\bhelps owners already during\b/gi, 'helps owners during'],
  [/\balready during\b/gi, 'during'],
  [/\bthe owners\b/gi, 'owners'],
  [/\bshort term\b/gi, 'short-term'],
  [/\blong term\b/gi, 'long-term'],
];

const forbiddenTerms = [
  { pattern: /Top Apartments/i, reason: 'Brand must stay Top Kvartiri.' },
  { pattern: /\bmasters\b/i, reason: 'Use contractors/service providers in professional English.' },
  { pattern: /\bcraftsmen\b/i, reason: 'Use contractors/service providers in professional English.' },
  { pattern: /\bobject(s)?\b/i, reason: 'Use property/properties for real estate context.' },
  { pattern: /\bflat(s)?\b/i, reason: 'Use apartment/apartments for this client voice.' },
];

function sentencePolish(text = '') {
  let out = String(text)
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.!?;:])/g, '$1')
    .replace(/([.!?])([A-Za-z])/g, '$1 $2')
    .trim();
  for (const [re, val] of terminology) out = out.replace(re, val);
  out = out
    .replace(/\bwe offer you\b/gi, 'we provide')
    .replace(/\byou can trust to us\b/gi, 'you can rely on us')
    .replace(/\bfor your comfort\b/gi, 'for a smoother experience')
    .replace(/\btake care for\b/gi, 'take care of')
    .replace(/\bin the most good way\b/gi, 'in the best way')
    .replace(/\bprofitable from your property\b/gi, 'more profitable for your property')
    .replace(/\bfull management of your property\b/gi, 'complete property management')
    .replace(/\brental apartment\b/gi, 'rental apartment');
  return out;
}

function brandGlossary(text = '') {
  let out = String(text || '');
  for (const [re, val] of config.glossary || []) out = out.replace(re, val);
  return sentencePolish(out);
}

function findBrandIssues(fields = {}) {
  const issues = [];
  for (const [field, value] of Object.entries(fields)) {
    const text = String(value || '');
    for (const rule of forbiddenTerms) {
      if (rule.pattern.test(text)) issues.push({ field, term: String(rule.pattern), reason: rule.reason });
    }
  }
  return issues;
}

const businessGoals = [
  'Attract Sofia property owners who want hands-off rental management.',
  'Build trust around renovation coordination, tenant handling, and income optimisation.',
  'Explain practical property-owner decisions in clear English for international owners.',
  'Position Top Kvartiri as a reliable local operating partner, not just a listing service.',
];

const articlePillars = [
  'Rental property management in Sofia',
  'Renovation and repair coordination for rental apartments',
  'Short-term vs long-term rental strategy',
  'Tenant screening, communication, and issue prevention',
  'Owner checklists for remote/international landlords',
  'Preparing apartments for stronger occupancy and reviews',
];

const articleIdeas = [
  {
    title: 'How to Prepare Your Sofia Apartment for Profitable Rental Management',
    primaryKeyword: 'rental property management Sofia',
    slug: 'prepare-sofia-apartment-rental-management',
    meta: 'A practical guide for Sofia property owners on preparing an apartment for smoother management, better tenants, stronger reviews, and rental income.',
    intent: 'Owners who have an apartment but need a clear readiness checklist before renting.',
    angle: 'Readiness checklist + why professional management prevents expensive mistakes.',
    cta: 'Ask Top Kvartiri to assess your apartment and recommend the next best steps.',
  },
  {
    title: 'Short-Term vs Long-Term Rental in Sofia: Which Is Better for Your Property?',
    primaryKeyword: 'short-term rental management Sofia',
    slug: 'short-term-vs-long-term-rental-sofia',
    meta: 'Compare short-term and long-term rentals in Sofia, including income potential, risks, management needs, and the best fit for your property.',
    intent: 'Owners comparing income strategies.',
    angle: 'Decision framework, not generic pros/cons.',
    cta: 'Request a management recommendation based on your apartment, location, and goals.',
  },
  {
    title: 'Renovating a Rental Apartment in Sofia: What Owners Should Prioritise First',
    primaryKeyword: 'rental apartment renovation Sofia',
    slug: 'rental-apartment-renovation-sofia-priorities',
    meta: 'Learn which renovation choices matter most for rental apartments in Sofia, from durability and layout to guest experience and long-term returns.',
    intent: 'Owners planning repairs or upgrades before renting.',
    angle: 'Spend where it improves reliability, occupancy, and perceived value.',
    cta: 'Let Top Kvartiri coordinate renovation priorities before you overspend.',
  },
  {
    title: 'How Professional Tenant Management Protects Your Sofia Property',
    primaryKeyword: 'tenant management Sofia',
    slug: 'professional-tenant-management-sofia',
    meta: 'See how professional tenant management in Sofia helps owners reduce stress, prevent avoidable problems, and keep rental operations organised.',
    intent: 'Owners worried about tenant problems and communication.',
    angle: 'Prevention, communication, documentation, and fast issue handling.',
    cta: 'Use Top Kvartiri for structured tenant management and owner reporting.',
  },
  {
    title: 'A Remote Owner’s Checklist for Managing an Apartment in Sofia',
    primaryKeyword: 'manage apartment in Sofia remotely',
    slug: 'remote-owner-checklist-manage-apartment-sofia',
    meta: 'A clear checklist for remote property owners in Sofia covering access, repairs, tenants, cleaning, reporting, and reliable local management.',
    intent: 'Bulgarian/international owners who are not physically near the property.',
    angle: 'Operational checklist that naturally leads to full-service management.',
    cta: 'Book a consultation so Top Kvartiri can handle the local details for you.',
  },
  {
    title: 'Why Good Property Photos Matter for Rental Apartments in Sofia',
    primaryKeyword: 'rental apartment photography Sofia',
    slug: 'rental-apartment-photography-sofia',
    meta: 'Better property photos can improve first impressions, booking quality, and tenant interest. Learn what Sofia rental owners should prepare before a shoot.',
    intent: 'Owners improving listing performance.',
    angle: 'Photos as part of the management and occupancy system.',
    cta: 'Ask Top Kvartiri about preparing and presenting your apartment professionally.',
  },
];

function buildArticlePlan(limit = articleIdeas.length) {
  return {
    site: config.site.name,
    generatedAt: new Date().toISOString(),
    businessGoals,
    articlePillars,
    publishingRules: [
      'Translate existing Bulgarian articles first when they already support service/commercial intent.',
      'Create new English articles only when they fill a business-goal gap or target owner search intent.',
      'Every article needs one primary keyword, clean slug, title tag, meta description, CTA, and internal link target.',
      'Preserve existing Wix media where translating a BG article; for new posts, require topic-relevant images and alt text before publish.',
      'Publish only after QA passes: no Cyrillic leftovers, brand glossary pass, SEO metadata present, image/alt evidence, and public HTTP 200.',
    ],
    ideas: articleIdeas.slice(0, Number(limit) || articleIdeas.length),
  };
}

function writeArticlePlan(limit) {
  const plan = buildArticlePlan(limit);
  const dir = path.join(config.dataDir, 'strategy');
  fs.mkdirSync(dir, { recursive: true });
  const jsonPath = path.join(dir, 'topkvartiri-article-plan.json');
  const mdPath = path.join(dir, 'topkvartiri-article-plan.md');
  fs.writeFileSync(jsonPath, JSON.stringify(plan, null, 2));
  fs.writeFileSync(mdPath, `# TopKvartiri English Article Plan\n\nGenerated: ${plan.generatedAt}\n\n## Business goals\n${plan.businessGoals.map(x => `- ${x}`).join('\n')}\n\n## Content pillars\n${plan.articlePillars.map(x => `- ${x}`).join('\n')}\n\n## Publishing rules\n${plan.publishingRules.map(x => `- ${x}`).join('\n')}\n\n## Recommended articles\n${plan.ideas.map((x, i) => `${i + 1}. **${x.title}**\n   - Keyword: ${x.primaryKeyword}\n   - Slug: ${x.slug}\n   - Meta: ${x.meta}\n   - Intent: ${x.intent}\n   - CTA: ${x.cta}`).join('\n')}\n`);
  return { plan, files: { jsonPath, mdPath } };
}

module.exports = { brandGlossary, sentencePolish, findBrandIssues, buildArticlePlan, writeArticlePlan, articleIdeas, articlePillars, businessGoals };
