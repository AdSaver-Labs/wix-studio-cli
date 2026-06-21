const { getPost, createEnDraft, getDraft, updateDraft, publishDraft } = require('../wix/posts');
const { clone, collectTextRefs, extractText, normalizeInlineSpacing } = require('../transform/richContent');
const { gt, translateMany, applyGlossary } = require('../translate/translator');
const { slugify, cleanTitle, focusKeyword, metaDescription, excerptFromText, seoData } = require('../seo/seoFields');
const { qaDraft } = require('../qa/qaPost');
const { saveCheckpoint } = require('./checkpoints');
const { writeEvidence, appendMainEvidence } = require('./evidence');
const config = require('../config');

function publicUrlFor(post, slug){ return post?.url?.base && post?.url?.path ? post.url.base + post.url.path : `${config.site.baseUrl}/en/post/${slug}`; }
async function httpStatus(url){ return new Promise(resolve=>{ const https=require('https'); const req=https.get(url,{headers:{'user-agent':'Mozilla/5.0'},timeout:20000},res=>{res.resume(); resolve({status:res.statusCode,url:res.headers.location||url});}); req.on('error',e=>resolve({status:0,error:e.message,url})); req.on('timeout',()=>{req.destroy(); resolve({status:0,error:'timeout',url});}); }); }

async function buildDraftPayload(sourcePost, existingDraft) {
  let title = cleanTitle(await gt(sourcePost.title || 'Untitled'));
  title = title.charAt(0).toUpperCase() + title.slice(1);
  const rich = clone(existingDraft.richContent || sourcePost.richContent || {});
  const refs = collectTextRefs(rich, []);
  const translations = await translateMany(refs.map(r => r.text));
  refs.forEach((r,i) => { r.obj[r.key] = applyGlossary(translations[i] || r.text); });
  normalizeInlineSpacing(rich);
  const bodyText = extractText(rich);
  let excerpt = sourcePost.excerpt ? applyGlossary(await gt(sourcePost.excerpt)) : excerptFromText(bodyText, title);
  if (excerpt.length > 280) excerpt = excerpt.slice(0,277).replace(/\s+\S*$/,'') + '...';
  const focus = focusKeyword(title);
  const meta = metaDescription(title);
  const slug = slugify(title);
  let media = clone(existingDraft.media || sourcePost.media || null);
  const firstAlt = refs.find(r => r.kind === 'altText')?.obj?.altText || title;
  if (media) { media.altText = firstAlt; if (media.wixMedia?.image) media.wixMedia.image.altText = firstAlt; }
  return {
    id: existingDraft.id,
    title,
    excerpt,
    richContent: rich,
    seoData: seoData(title, meta, focus),
    seoSlug: slug,
    media,
    featured: existingDraft.featured,
    categoryIds: existingDraft.categoryIds || sourcePost.categoryIds || [],
    hashtags: existingDraft.hashtags || sourcePost.hashtags || [],
    commentingEnabled: existingDraft.commentingEnabled,
    tagIds: existingDraft.tagIds || sourcePost.tagIds || [],
    relatedPostIds: existingDraft.relatedPostIds || [],
    pricingPlanIds: existingDraft.pricingPlanIds || [],
    language: 'en'
  };
}

async function runPost(client, postId, opts={}) {
  const batchId = opts.batchId || 'manual';
  saveCheckpoint(postId,{status:'started',attempts:(opts.attempts||0)+1,steps:{started:true}});
  const sourcePost = await getPost(client, postId);
  saveCheckpoint(postId,{title:sourcePost.title,steps:{fetchedSource:true}});
  let draftId = (sourcePost.translations||[]).find(t=>t.language==='en')?.id;
  let existingDraft;
  if (opts.mode === 'plan' || opts.dryRun) {
    // Plan mode must be read-only: do not create or patch a Wix draft.
    existingDraft = { id: draftId || 'PLAN_ONLY_NO_DRAFT_CREATED', richContent: sourcePost.richContent, media: sourcePost.media, featured: sourcePost.featured, categoryIds: sourcePost.categoryIds, hashtags: sourcePost.hashtags, commentingEnabled: sourcePost.commentingEnabled, tagIds: sourcePost.tagIds, relatedPostIds: [], pricingPlanIds: [] };
  } else {
    if (!draftId) draftId = await createEnDraft(client, postId, 'en');
    if (!draftId) throw new Error('Could not create/find EN draft id');
    saveCheckpoint(postId,{draftId,steps:{draftCreated:true}});
    existingDraft = await getDraft(client, draftId);
  }
  const draftPost = await buildDraftPayload(sourcePost, existingDraft);
  saveCheckpoint(postId,{steps:{translated:true}});
  const qaBefore = qaDraft({sourcePost,draftPost});
  if (opts.mode === 'plan' || opts.dryRun) {
    const ev = {status:'PLAN_ONLY',sourcePostId:postId,draftId,title:draftPost.title,generatedAt:new Date().toISOString(),seo:{title:draftPost.title,seoTitle:draftPost.seoData.tags[0].children,meta:draftPost.seoData.tags[1].props.content,slug:draftPost.seoSlug,focus:draftPost.seoData.settings.keywords[0].term},qa:qaBefore};
    ev.files=writeEvidence(batchId,postId,ev); saveCheckpoint(postId,{status:'planned',steps:{planned:true}}); return ev;
  }
  const updated = await updateDraft(client, draftId, draftPost);
  saveCheckpoint(postId,{status:'draft_updated',steps:{patched:true}});
  const fetched = await getDraft(client, draftId);
  const qa = qaDraft({sourcePost,draftPost:fetched});
  let status = qa.ok ? 'DRAFT_READY' : 'QA_FAILED';
  let published = null, publicCheck = null, publicUrl = publicUrlFor(fetched, fetched.seoSlug);
  if (opts.mode === 'publish') {
    if (!opts.approved) throw new Error('Publish requested without --approved');
    if (!qa.ok && !opts.forcePublish) throw new Error('QA failed; refusing publish without --force-publish');
    published = await publishDraft(client, draftId);
    publicUrl = publicUrlFor(published, fetched.seoSlug);
    publicCheck = await httpStatus(publicUrl);
    status = publicCheck.status === 200 ? 'PUBLISHED' : 'PUBLISHED_PUBLIC_CHECK_FAILED';
    saveCheckpoint(postId,{status,steps:{published:true},publicUrl});
  }
  const ev = {status,sourcePostId:postId,draftId,title:fetched.title,publicUrl,publicCheck,generatedAt:new Date().toISOString(),seo:{title:fetched.title,seoTitle:(fetched.seoData.tags||[])[0]?.children,meta:(fetched.seoData.tags||[])[1]?.props?.content,slug:fetched.seoSlug,focus:fetched.seoData.settings?.keywords?.[0]?.term},qa};
  ev.files=writeEvidence(batchId,postId,ev); if (status.startsWith('PUBLISHED')) appendMainEvidence(ev); return ev;
}
module.exports={runPost};
