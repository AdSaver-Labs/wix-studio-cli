const { collectTextRefs, countImages, extractText, collectInlineSpacingIssues } = require('../transform/richContent');
const { findBrandIssues } = require('../brand/topkvartiri');
function hasCyrillic(s='') { return /[\u0400-\u04FF]/.test(s); }
function getSeoTitle(draft) { return (draft.seoData?.tags || []).find(t => t.type === 'title')?.children || ''; }
function getMeta(draft) { return (draft.seoData?.tags || []).find(t => t.type === 'meta' && t.props?.name === 'description')?.props?.content || ''; }
function qaDraft({ sourcePost, draftPost }) {
  const checks = [];
  const fail = (name, detail) => checks.push({ name, status: 'FAIL', detail });
  const pass = (name, detail='') => checks.push({ name, status: 'PASS', detail });
  const title = draftPost.title || '';
  const excerpt = draftPost.excerpt || '';
  const seoTitle = getSeoTitle(draftPost);
  const meta = getMeta(draftPost);
  const bodyText = extractText(draftPost.richContent || {});
  const altRefs = collectTextRefs(draftPost.richContent || []).filter(r => r.kind === 'altText');
  const fields = { title, excerpt, seoTitle, meta, bodyText, altText: altRefs.map(r => r.obj[r.key]).join('\n') };
  for (const [k,v] of Object.entries(fields)) hasCyrillic(v) ? fail(`no_cyrillic_${k}`, `Cyrillic found in ${k}`) : pass(`no_cyrillic_${k}`);
  seoTitle ? pass('seo_title_present', seoTitle) : fail('seo_title_present','missing');
  seoTitle && seoTitle.length <= 70 ? pass('seo_title_length', `${seoTitle.length} chars`) : fail('seo_title_length', `${seoTitle.length} chars`);
  meta ? pass('meta_description_present', meta) : fail('meta_description_present','missing');
  meta && meta.length >= 110 && meta.length <= 160 && !meta.endsWith('...') ? pass('meta_description_length', `${meta.length} chars`) : fail('meta_description_length', `${meta.length} chars`);
  (draftPost.seoSlug && /^[a-z0-9-]+$/.test(draftPost.seoSlug)) ? pass('slug_clean', draftPost.seoSlug) : fail('slug_clean', draftPost.seoSlug || 'missing');
  (draftPost.seoData?.settings?.keywords || []).some(k => k.isMain && k.term) ? pass('focus_keyword_present') : fail('focus_keyword_present','missing');
  const brandIssues = findBrandIssues({ title, excerpt, seoTitle, meta, bodyText, altText: fields.altText });
  brandIssues.length ? fail('brand_voice_glossary', brandIssues.map(i => `${i.field}: ${i.reason}`).join('; ')) : pass('brand_voice_glossary');
  const inlineSpacingIssues = collectInlineSpacingIssues(draftPost.richContent || {});
  inlineSpacingIssues.length ? fail('inline_spacing_boundaries', inlineSpacingIssues.map(i => `${i.path}: ${i.preview}`).slice(0, 5).join('; ')) : pass('inline_spacing_boundaries');
  const srcImages = countImages(sourcePost.richContent || {}), dstImages = countImages(draftPost.richContent || {});
  dstImages >= srcImages ? pass('image_count_preserved', `${dstImages}/${srcImages}`) : fail('image_count_preserved', `${dstImages}/${srcImages}`);
  altRefs.length > 0 ? pass('image_alt_text_present', `${altRefs.length} alt refs`) : (srcImages ? fail('image_alt_text_present','no alt text') : pass('image_alt_text_present','no images'));
  const ok = checks.every(c => c.status === 'PASS');
  return { ok, checks, summary: { title, seoTitle, meta, slug: draftPost.seoSlug, images: { source: srcImages, draft: dstImages } } };
}
module.exports = { qaDraft, hasCyrillic };
