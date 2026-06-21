const assert = require('assert');
const { slugify, metaDescription, seoTitleFor } = require('../src/seo/seoFields');
const { qaDraft } = require('../src/qa/qaPost');
const { clone, countImages } = require('../src/transform/richContent');
const { validateArticle, validateArticleResult, draftPostFromArticle } = require('../src/clientBlog/articlePayload');
const { qaDraftReceipt } = require('../src/clientBlog/wixArticleOps');

assert.strictEqual(slugify('How to Choose Reliable Contractors?'), 'how-to-choose-reliable-contractors');
assert(seoTitleFor('Short-term vs long-term rental - which is better for your property?').length <= 70);
const meta = metaDescription('Short-term vs long-term rental - which is better for your property?');
assert(meta.length >= 110 && meta.length <= 160 && !meta.endsWith('...'));
const source = { richContent: { nodes: [{ imageData: { altText: 'снимка' } }, { textData: { text: 'Източник' } }] } };
const draft = { title:'English title', excerpt:'English excerpt', seoSlug:'english-title', seoData:{tags:[{type:'title',children:'English Title | Top Kvartiri'},{type:'meta',props:{name:'description',content:'Practical tenant management guidance for Sofia property owners, including common rental problems, prevention, and professional solutions.'}}],settings:{keywords:[{term:'tenant management Sofia',isMain:true}]}}, richContent:{ nodes:[{ imageData:{ altText:'Apartment in Sofia' } },{ textData:{ text:'English body' } }] } };
const qa = qaDraft({ sourcePost: source, draftPost: draft });
assert.strictEqual(qa.ok, true, JSON.stringify(qa,null,2));
const bad = clone(draft); bad.title = 'Още кирилица';
assert.strictEqual(qaDraft({ sourcePost: source, draftPost: bad }).ok, false);

const completeArticle = {
  key: 'spring-roof-inspection-spring-2026',
  language: 'en',
  title: 'Spring Roof Inspection Checklist for Homeowners',
  excerpt: 'A practical homeowner checklist for spotting roof issues early and deciding when to call a professional.',
  slug: 'spring-roof-inspection-checklist-homeowners',
  focusKeyword: 'spring roof inspection checklist',
  seoTitle: 'Spring Roof Inspection Checklist for Homeowners | Example Client',
  metaDescription: 'Use this spring roof inspection checklist to catch small roof issues early, reduce repair costs, and know when to call a professional.',
  blocks: [
    {type:'heading', level:2, text:'Spring roof inspection checklist basics'},
    {type:'paragraph', text:'Use this guide to inspect flashing, gutters, visible shingles, attic moisture, drainage, ventilation, roof penetrations, and problem zones before leaks spread across the home. '.repeat(20)},
    {type:'heading', level:2, text:'Start with a visual ground check'},
    {type:'heading', level:2, text:'Check problem zones'},
    {type:'heading', level:2, text:'Watch for moisture signs indoors'},
    {type:'image', role:'body', url:'https://example.com/roof.jpg', alt:'Spring roof inspection checklist photo'}
  ],
  internalLinks: [{url:'https://example.com/services', anchor:'roof repair services'}],
  relatedPostIds: ['post-1'],
  cta: {url:'https://example.com/contact', label:'Book an inspection'},
  images: [{role:'featured', url:'https://example.com/roof.jpg', alt:'Spring roof inspection checklist roof image'}],
  ogImage: 'https://example.com/logo-or-share.jpg'
};
assert.doesNotThrow(() => validateArticle(completeArticle, {imagePolicy:'required', minImages:1, minRelatedPosts:1}));
const missingSeoKeyword = {...completeArticle, metaDescription:'A practical homeowner guide for spotting roof issues early, reducing repair costs, and knowing when to call a professional.'};
assert.throws(() => validateArticle(missingSeoKeyword, {imagePolicy:'required', minImages:1, minRelatedPosts:1}), /focusKeyword must appear in metaDescription/);
const readiness = validateArticleResult(missingSeoKeyword, {imagePolicy:'required', minImages:1, minRelatedPosts:1});
assert.strictEqual(readiness.status, 'FAIL');
assert(readiness.errors.includes('focusKeyword must appear in metaDescription'));
assert.strictEqual(readiness.metrics.headingCount, 4);
const missingRelated = {...completeArticle, relatedPostIds:[]};
assert.throws(() => validateArticle(missingRelated, {imagePolicy:'required', minImages:1, minRelatedPosts:1}), /missing relatedPostIds/);
const strictDraft = draftPostFromArticle(completeArticle, {imagePolicy:'required'});
strictDraft.id = 'draft-1';
strictDraft.status = 'UNPUBLISHED';
const strictQa = qaDraftReceipt(strictDraft, {language:'en', imagePolicy:'required', minImages:1, minRelatedPosts:1});
assert.strictEqual(strictQa.ok, true, JSON.stringify(strictQa,null,2));
const weakDraft = clone(strictDraft); weakDraft.relatedPostIds = []; weakDraft.seoData.tags.find(t => t.type === 'meta').props.content = 'A practical homeowner guide for spotting roof issues early, reducing repair costs, and knowing when to call a professional.';
const weakQa = qaDraftReceipt(weakDraft, {language:'en', imagePolicy:'required', minImages:1, minRelatedPosts:1});
assert.strictEqual(weakQa.ok, false);
assert(weakQa.checks.some(c => c.name === 'focus_keyword_in_meta' && c.status === 'FAIL'));
assert(weakQa.checks.some(c => c.name === 'related_posts_connected' && c.status === 'FAIL'));
console.log('unit tests PASS');
