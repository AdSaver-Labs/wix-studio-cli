const assert = require('assert');
const { slugify, metaDescription, seoTitleFor } = require('../src/seo/seoFields');
const { qaDraft } = require('../src/qa/qaPost');
const { clone, countImages } = require('../src/transform/richContent');

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
console.log('unit tests PASS');
