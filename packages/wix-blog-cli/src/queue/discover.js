const path = require('path');
const config = require('../config');
const { queryPosts } = require('../wix/posts');
const { writeJson, ensure, dataDir } = require('../runner/files');
async function discover(client) {
  const bg = await queryPosts(client, 'bg');
  const en = await queryPosts(client, 'en');
  const enTranslationIds = new Set((en.posts||[]).map(p => p.translationId).filter(Boolean));
  const enTitles = new Set((en.posts||[]).map(p => (p.title||'').toLowerCase()));
  const queue = (bg.posts||[]).map(p => {
    const enTrans = (p.translations||[]).find(t => t.language === 'en');
    const hasEn = Boolean(enTrans?.id || enTranslationIds.has(p.translationId));
    return { id:p.id, title:p.title, slug:p.slug, url:p.url, translationId:p.translationId, hasEn, enDraftOrPostId: enTrans?.id || null, firstPublishedDate:p.firstPublishedDate, lastPublishedDate:p.lastPublishedDate };
  }).filter(x => !x.hasEn);
  const out = { site: config.site, generatedAt: new Date().toISOString(), counts: { bg: bg.posts?.length||0, en: en.posts?.length||0, missingEn: queue.length }, queue };
  const jsonPath = path.join(dataDir, 'queues', 'topkvartiri-latest.json');
  writeJson(jsonPath, out);
  const mdPath = path.join(dataDir, 'queues', 'topkvartiri-latest.md');
  ensure(path.dirname(mdPath));
  require('fs').writeFileSync(mdPath, `# TopKvartiri Wix Blog Automation Queue\n\nGenerated: ${out.generatedAt}\n\n- BG posts: ${out.counts.bg}\n- EN posts: ${out.counts.en}\n- Missing EN: ${out.counts.missingEn}\n\n` + queue.map((q,i)=>`${i+1}. [ ] ${q.title} (${q.id})`).join('\n') + '\n');
  return { ...out, files: { jsonPath, mdPath } };
}
module.exports = { discover };
