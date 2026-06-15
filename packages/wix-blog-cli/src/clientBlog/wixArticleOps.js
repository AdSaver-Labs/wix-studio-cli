const { WixClient } = require('../wix/client');
const { getDraft, updateDraft, publishDraft } = require('../wix/posts');
const { draftPostFromArticle, validateArticle } = require('./articlePayload');
const { loadClientPack, wixConfigFromClient } = require('./clients');
const { writeJson, readJson, receiptPath } = require('./receipts');
const { verifyPublicUrl } = require('./publicVerify');
const { articleFingerprint, receiptFingerprint, sha256 } = require('./hash');
const { appendLedger, ledgerPath } = require('./ledger');
const { writeSummary } = require('./summaryCard');

function safeTs(){ return new Date().toISOString().replace(/[:.]/g,'-'); }
function textFromRichContent(rc){ let out=''; function walk(n){ if(!n)return; if(Array.isArray(n)) return n.forEach(walk); if(n.textData?.text) out += n.textData.text+' '; if(n.nodes) walk(n.nodes); } walk(rc?.nodes||[]); return out.trim(); }
function getSeoTitle(d){ return (d.seoData?.tags||[]).find(t=>t.type==='title')?.children || ''; }
function getMeta(d){ return (d.seoData?.tags||[]).find(t=>t.type==='meta' && t.props?.name==='description')?.props?.content || ''; }
function getFocus(d){ return d.seoData?.settings?.keywords?.find(k=>k.isMain)?.term || d.seoData?.settings?.keywords?.[0]?.term || ''; }
function getOgImage(d){ return (d.seoData?.tags||[]).find(t=>t.props?.property==='og:image')?.props?.content || ''; }
function linkishCount(body){ return (body.match(/https?:\/\//g)||[]).length; }
function cyrillic(s=''){ return /[\u0400-\u04FF]/.test(s); }
function draftHash(d){ return sha256({title:d.title,excerpt:d.excerpt,seoSlug:d.seoSlug,seoTitle:getSeoTitle(d),meta:getMeta(d),focus:getFocus(d),body:textFromRichContent(d.richContent||{}),media:d.media}); }
function imagePolicyFor(clientId){ const pack=loadClientPack(clientId); return pack.wix?.imagePolicy || pack.imagePolicy || 'required'; }
function qaDraftReceipt(d, context={}){
  const body=textFromRichContent(d.richContent||{});
  const words=body.split(/\s+/).filter(Boolean).length;
  const headings=(d.richContent?.nodes||[]).filter(n=>n.type==='HEADING').length;
  const checks=[]; const add=(name, pass, detail='')=>checks.push({name,status:pass?'PASS':'FAIL',detail:String(detail||'')});
  const language=context.language || d.language;
  const imagePolicy=context.imagePolicy || 'required';
  const mediaPresent=!!(d.media?.wixMedia || getOgImage(d));
  add('status_unpublished', d.status==='UNPUBLISHED', d.status);
  add('body_words_min_500', words>=500, String(words));
  add('headings_min_4', headings>=4, String(headings));
  add('seo_slug_present', !!d.seoSlug, d.seoSlug||'');
  add('seo_slug_latin_kebab', /^[a-z0-9-]+$/.test(d.seoSlug||''), d.seoSlug||'');
  add('seo_title_present', !!getSeoTitle(d), getSeoTitle(d));
  add('seo_title_length', getSeoTitle(d).length>0 && getSeoTitle(d).length<=75, `${getSeoTitle(d).length}`);
  add('meta_description_present', !!getMeta(d), getMeta(d));
  add('meta_description_length', getMeta(d).length>=80 && getMeta(d).length<=170, `${getMeta(d).length}`);
  add('focus_keyword_present', !!getFocus(d), getFocus(d));
  add('no_todo_placeholders', !/\bTODO\b|PLACEHOLDER|Lorem ipsum/i.test(body+' '+d.title+' '+getMeta(d)), '');
  add('internal_link_or_url_present', linkishCount(body)>=1, `${linkishCount(body)}`);
  if(language==='bg') add('bg_contains_cyrillic', cyrillic(body+d.title), '');
  if(language==='en') add('en_metadata_no_cyrillic', !cyrillic(d.title+' '+getSeoTitle(d)+' '+getMeta(d)), '');
  if(imagePolicy==='required') add('image_required_present', mediaPresent, mediaPresent?'present':'missing');
  else add('image_policy_text_only_allowed', true, imagePolicy);
  return {ok:checks.every(c=>c.status==='PASS'), words, headings, checks, summary:{title:d.title, seoSlug:d.seoSlug, seoTitle:getSeoTitle(d), metaDescription:getMeta(d), focusKeyword:getFocus(d), imagePolicy, draftHash:draftHash(d)}};
}
function readManifest(manifestPath, clientId){
  const pack=loadClientPack(clientId);
  const manifest=readJson(manifestPath);
  const articles=manifest.articles || (Array.isArray(manifest) ? manifest : []);
  if(!articles.length) throw new Error('ARTICLE_MANIFEST_EMPTY');
  const imagePolicy=pack.wix?.imagePolicy || pack.imagePolicy || manifest.imagePolicy || 'required';
  for (const article of articles) validateArticle({...article, imagePolicy: article.imagePolicy || imagePolicy}, {imagePolicy});
  return {manifest, articles, imagePolicy};
}
function existingByKey(clientId){
  const ledger=readJson(ledgerPath(clientId),{articles:[]});
  const map=new Map();
  for(const r of ledger.articles||[]) if(r.articleKey && r.lang && r.draftId) map.set(`${r.articleKey}|${r.lang}`, r);
  return map;
}
function resultFromFetched(article, fetched, qa){
  const articleHash=articleFingerprint(article); const dHash=draftHash(fetched);
  return {idempotencyKey:`${article.key}|${article.language}|${article.slug}`, articleKey:article.key||article.slug, language:article.language, title:fetched.title, draftId:fetched.id, status:fetched.status, url:fetched.url, seoSlug:fetched.seoSlug, articleHash, draftHash:dHash, qa};
}
async function createDraftsFromManifest(clientId, manifestPath, opts={}){
  const site=wixConfigFromClient(clientId);
  const {articles,imagePolicy}=readManifest(manifestPath,clientId);
  const known=existingByKey(clientId);
  const client=await WixClient.fromBrowser({site});
  const results=[];
  try{
    for(const article of articles){
      const existing=known.get(`${article.key}|${article.language}`);
      if(existing?.draftId && !opts.allowDuplicates){
        const draftPost={...draftPostFromArticle({...article,imagePolicy}, {imagePolicy}), id:existing.draftId};
        await updateDraft(client, existing.draftId, draftPost);
        const fetched=await getDraft(client, existing.draftId);
        const qa=qaDraftReceipt(fetched,{language:article.language,imagePolicy});
        results.push({...resultFromFetched(article,fetched,qa), operation:'updated_existing_idempotent'});
        continue;
      }
      const draftPost=draftPostFromArticle({...article,imagePolicy}, {imagePolicy});
      const json=await client.request('/_api/communities-blog-node-api/v3/draft-posts',{method:'POST',body:JSON.stringify({draftPost, fieldsets:['RICH_CONTENT','URL','TRANSLATIONS']})});
      const d=json.draftPost;
      const fetched=await getDraft(client,d.id);
      const qa=qaDraftReceipt(fetched,{language:article.language,imagePolicy});
      results.push({...resultFromFetched(article,fetched,qa), operation:'created'});
    }
  } finally { await client.close(); }
  const receipt={generatedAt:new Date().toISOString(), clientId, site, sourceManifest:manifestPath, imagePolicy, count:results.length, passCount:results.filter(r=>r.qa.ok).length, failCount:results.filter(r=>!r.qa.ok).length, results};
  receipt.receiptHash=receiptFingerprint(receipt);
  const out=opts.out || receiptPath(clientId, `wix-draft-create-${safeTs()}.json`);
  writeJson(out, receipt); receipt.ledgerPath=appendLedger(clientId, receipt, 'draft-create'); receipt.summaryPath=writeSummary(clientId, receipt, 'draft-create'); writeJson(out, receipt);
  return {out, receipt};
}
async function updateDraftsFromManifest(clientId, manifestPath, receiptFile, opts={}){
  const site=wixConfigFromClient(clientId);
  const {articles,imagePolicy}=readManifest(manifestPath,clientId);
  const previous=readJson(receiptFile);
  const byKey=new Map((previous.results||[]).map(r=>[r.articleKey,r]));
  const client=await WixClient.fromBrowser({site});
  const results=[];
  try{
    for(const article of articles){
      const prior=byKey.get(article.key || article.slug);
      if(!prior?.draftId) throw new Error(`DRAFT_ID_NOT_FOUND_FOR_ARTICLE ${article.key || article.slug}`);
      const draftPost={...draftPostFromArticle({...article,imagePolicy},{imagePolicy}), id:prior.draftId};
      await updateDraft(client, prior.draftId, draftPost);
      const fetched=await getDraft(client, prior.draftId);
      const qa=qaDraftReceipt(fetched,{language:article.language,imagePolicy});
      results.push({...resultFromFetched(article,fetched,qa), operation:'updated'});
    }
  } finally { await client.close(); }
  const receipt={generatedAt:new Date().toISOString(), clientId, site, sourceManifest:manifestPath, sourceReceipt:receiptFile, imagePolicy, count:results.length, passCount:results.filter(r=>r.qa.ok).length, failCount:results.filter(r=>!r.qa.ok).length, results};
  receipt.receiptHash=receiptFingerprint(receipt);
  const out=opts.out || receiptPath(clientId, `wix-draft-update-${safeTs()}.json`);
  writeJson(out, receipt); receipt.ledgerPath=appendLedger(clientId, receipt, 'draft-update'); receipt.summaryPath=writeSummary(clientId, receipt, 'draft-update'); writeJson(out, receipt);
  return {out, receipt};
}
async function verifyDraftReceipt(clientId, receiptFile, opts={}){
  const site=wixConfigFromClient(clientId); const imagePolicy=imagePolicyFor(clientId);
  const receipt=readJson(receiptFile);
  const client=await WixClient.fromBrowser({site});
  const checks=[];
  try{
    for(const r of receipt.results || []){
      const d=await getDraft(client,r.draftId);
      checks.push({...r, status:d.status, title:d.title, seoSlug:d.seoSlug, url:d.url, draftHash:draftHash(d), qa:qaDraftReceipt(d,{language:r.language,imagePolicy:receipt.imagePolicy||imagePolicy})});
    }
  } finally { await client.close(); }
  const outObj={generatedAt:new Date().toISOString(), clientId, sourceReceipt:receiptFile, imagePolicy:receipt.imagePolicy||imagePolicy, count:checks.length, passCount:checks.filter(r=>r.qa.ok).length, failCount:checks.filter(r=>!r.qa.ok).length, results:checks};
  outObj.receiptHash=receiptFingerprint(outObj);
  const out=opts.out || receiptPath(clientId, `wix-draft-verify-${safeTs()}.json`);
  writeJson(out, outObj); outObj.ledgerPath=appendLedger(clientId, outObj, 'draft-verify'); outObj.summaryPath=writeSummary(clientId, outObj, 'draft-verify'); writeJson(out, outObj);
  return {out, receipt:outObj};
}
function validateApprovalManifest(clientId, approvalPath, draftReceipt){
  const approval=readJson(approvalPath); const pack=loadClientPack(clientId);
  const errors=[];
  if(pack.publishingGate !== 'publish-after-qa' && approval.overrideClientGate !== true) errors.push(`client publishingGate ${pack.publishingGate} does not allow publish`);
  if(approval.clientId !== clientId) errors.push('clientId mismatch');
  if(approval.approved !== true) errors.push('approved must be true');
  if(approval.publishAfterQa !== true) errors.push('publishAfterQa must be true');
  if(!approval.qa || approval.qa.status !== 'PASS') errors.push('qa.status must be PASS');
  if(approval.receiptHash && approval.receiptHash !== draftReceipt.receiptHash) errors.push('receiptHash mismatch');
  if(approval.expiresAt && Date.parse(approval.expiresAt) < Date.now()) errors.push('approval expired');
  const approvedIds=new Set(approval.draftIds || []);
  const receiptRows=draftReceipt.results||[]; const receiptIds=new Set(receiptRows.map(r=>r.draftId));
  if(!approvedIds.size) errors.push('draftIds missing');
  for(const id of approvedIds) if(!receiptIds.has(id)) errors.push(`draftId not in receipt: ${id}`);
  const byDraft=Object.fromEntries(receiptRows.map(r=>[r.draftId,r]));
  if(approval.draftHashes) for(const [id,h] of Object.entries(approval.draftHashes)) if(byDraft[id]?.draftHash && byDraft[id].draftHash!==h) errors.push(`draftHash mismatch: ${id}`);
  if((draftReceipt.failCount||0)>0) errors.push('draft receipt has failures');
  if((draftReceipt.imagePolicy||imagePolicyFor(clientId))==='required') {
    const imageFailures=(draftReceipt.results||[]).some(r=>(r.qa?.checks||[]).some(c=>c.name==='image_required_present'&&c.status!=='PASS'));
    if(imageFailures) errors.push('image required but not verified in draft receipt');
  }
  if(errors.length) throw new Error(`APPROVAL_MANIFEST_INVALID: ${errors.join('; ')}`);
  return approval;
}
function approvalTemplate(clientId, receiptFile, opts={}){
  const receipt=readJson(receiptFile);
  const draftHashes={}; for(const r of receipt.results||[]) draftHashes[r.draftId]=r.draftHash;
  const obj={clientId, approved:false, publishAfterQa:true, approver:'Alej', createdAt:new Date().toISOString(), expiresAt:new Date(Date.now()+24*3600*1000).toISOString(), qa:{status:receipt.failCount===0?'PASS':'FAIL', receipt:receiptFile}, receiptHash:receipt.receiptHash, draftIds:(receipt.results||[]).map(r=>r.draftId), draftHashes, note:'Set approved=true only after QA PASS and Alej/client publish policy allows publishing.'};
  const out=opts.out||receiptPath(clientId,`approval-template-${safeTs()}.json`); writeJson(out,obj); return {out,template:obj};
}
async function publishFromReceipt(clientId, receiptFile, approvalPath, opts={}){
  const site=wixConfigFromClient(clientId);
  const draftReceipt=readJson(receiptFile);
  validateApprovalManifest(clientId, approvalPath, draftReceipt);
  const approval=readJson(approvalPath);
  const allow=new Set(approval.draftIds);
  const client=await WixClient.fromBrowser({site}); const results=[];
  try{
    for(const r of draftReceipt.results || []){
      if(!allow.has(r.draftId)) continue;
      const before=await getDraft(client,r.draftId);
      const qa=qaDraftReceipt(before,{language:r.language,imagePolicy:draftReceipt.imagePolicy||imagePolicyFor(clientId)});
      if(!qa.ok) throw new Error(`QA_FAILED_REFUSING_PUBLISH ${r.draftId}`);
      if(r.draftHash && draftHash(before)!==r.draftHash) throw new Error(`DRAFT_CHANGED_AFTER_QA_REFUSING_PUBLISH ${r.draftId}`);
      const published=await publishDraft(client,r.draftId);
      const url=(published.url?.base && published.url?.path) ? published.url.base + published.url.path : (r.url?.base && r.url?.path ? r.url.base + r.url.path : null);
      const publicVerify=url ? await verifyPublicUrl(url,{title:published.title||before.title, metaDescription:getMeta(before), slug:before.seoSlug, requireImages:(draftReceipt.imagePolicy||imagePolicyFor(clientId))==='required'}) : {ok:false, error:'NO_PUBLIC_URL'};
      results.push({articleKey:r.articleKey,language:r.language,draftId:r.draftId,postId:published.id,title:published.title||before.title,url,seoSlug:before.seoSlug,draftHash:draftHash(before),publicVerify,status:publicVerify.ok?'PUBLISHED_VERIFIED':'PUBLISHED_VERIFICATION_FAILED'});
    }
  } finally { await client.close(); }
  const outObj={generatedAt:new Date().toISOString(), clientId, sourceReceipt:receiptFile, approvalManifest:approvalPath, count:results.length, passCount:results.filter(r=>r.status==='PUBLISHED_VERIFIED').length, failCount:results.filter(r=>r.status!=='PUBLISHED_VERIFIED').length, results};
  outObj.receiptHash=receiptFingerprint(outObj);
  const out=opts.out || receiptPath(clientId, `wix-publish-${safeTs()}.json`);
  writeJson(out, outObj); outObj.ledgerPath=appendLedger(clientId,outObj,'publish'); outObj.summaryPath=writeSummary(clientId, outObj, 'publish'); writeJson(out,outObj);
  return {out, receipt:outObj};
}
async function verifyPublicFromReceipt(receiptFile, opts={}){
  const receipt=readJson(receiptFile);
  const targets=(receipt.results||[]).map(r=>({url:r.url || (r.publicVerify&&r.publicVerify.url), title:r.title, slug:r.seoSlug})).filter(r=>r.url);
  const results=[]; for(const t of targets) results.push(await verifyPublicUrl(t.url,t));
  const outObj={generatedAt:new Date().toISOString(), clientId:receipt.clientId, sourceReceipt:receiptFile, count:results.length, passCount:results.filter(r=>r.ok).length, failCount:results.filter(r=>!r.ok).length, results};
  const out=opts.out || receiptPath(receipt.clientId || 'unknown', `public-verify-${safeTs()}.json`);
  writeJson(out,outObj); return {out, receipt:outObj};
}
async function preparePacket(clientId, manifestPath, opts={}){
  const createOrUpdate = opts.receipt ? await updateDraftsFromManifest(clientId, manifestPath, opts.receipt, {}) : await createDraftsFromManifest(clientId, manifestPath, {});
  const verify = await verifyDraftReceipt(clientId, createOrUpdate.out, {});
  const approval = approvalTemplate(clientId, verify.out, {});
  const summaryPath = writeSummary(clientId, verify.receipt, 'prepare-packet');
  return {status: verify.receipt.failCount ? 'FAIL' : 'PASS', clientId, draftReceipt:createOrUpdate.out, verifyReceipt:verify.out, approvalTemplate:approval.out, summaryPath, count:verify.receipt.count, passCount:verify.receipt.passCount, failCount:verify.receipt.failCount, receiptHash:verify.receipt.receiptHash};
}
module.exports = { createDraftsFromManifest, updateDraftsFromManifest, verifyDraftReceipt, publishFromReceipt, verifyPublicFromReceipt, qaDraftReceipt, approvalTemplate, preparePacket };
