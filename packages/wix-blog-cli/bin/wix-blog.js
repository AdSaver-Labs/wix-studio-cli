#!/usr/bin/env node
const fs = require('fs'); const path = require('path');
const { WixClient } = require('../src/wix/client');
const { discover } = require('../src/queue/discover');
const { runPost } = require('../src/runner/runPost');
const { readJson, writeJson, ensure, dataDir, ts } = require('../src/runner/files');
const { qaDraft } = require('../src/qa/qaPost');
const { getPost, getDraft } = require('../src/wix/posts');
const { writeArticlePlan } = require('../src/brand/topkvartiri');
const { createDraftsFromManifest, updateDraftsFromManifest, verifyDraftReceipt, snapshotDraftsFromReceipt, diffDraftsFromManifest, publishFromReceipt, verifyPublicFromReceipt, approvalTemplate, preparePacket, readManifest, auditManifestReadiness } = require('../src/clientBlog/wixArticleOps');
const { discoverSiteConfig, applyDiscoveredConfig } = require('../src/clientBlog/discoverSite');
const { clientStatus } = require('../src/clientBlog/status');
const { verifyRenderedReceipt } = require('../src/clientBlog/renderVerify');
const { clientPackPath } = require('../src/clientBlog/clients');
const { receiptFingerprint } = require('../src/clientBlog/hash');

function parse(argv){ const out={_:[]}; for(let i=2;i<argv.length;i++){ const a=argv[i]; if(a.startsWith('--')){ const k=a.slice(2); const n=argv[i+1]; if(!n||n.startsWith('--')) out[k]=true; else out[k]=n,i++; } else out._.push(a); } return out; }
function print(obj){ console.log(JSON.stringify(obj,null,2)); }
function assertNoDryRun(args, command, detail='') { if(args['dry-run']) { print({status:'DRY_RUN', command, mutationBlocked:true, detail: detail || 'No Wix/client files were modified.'}); return true; } return false; }
function receiptValidation(receiptFile){
  const receipt=JSON.parse(fs.readFileSync(receiptFile,'utf8'));
  const warnings=[];
  for(const field of ['generatedAt','clientId','count','results']) if(receipt[field] === undefined) warnings.push(`missing ${field}`);
  let hashStatus='NOT_PRESENT';
  if(receipt.receiptHash){ const expected=receiptFingerprint(receipt); hashStatus = expected === receipt.receiptHash ? 'PASS' : 'FAIL'; if(hashStatus==='FAIL') warnings.push(`receiptHash mismatch expected ${expected}`); }
  return {status: warnings.length?'FAIL':'PASS', receiptFile, clientId:receipt.clientId||null, count:receipt.count ?? (receipt.results||[]).length, hashStatus, warnings};
}
function usage(){ console.log(`wix-blog commands:
  discover
  plan --limit N | --post ID
  draft --post ID
  qa --post ID --draft ID
  content-plan [--limit N]
  run --limit N | --post ID --mode plan|draft|publish [--approved]

  # Wix-first client article workflow
  doctor [--client <id>]
  discover-site-config --client <id> [--out receipt.json]
  apply-site-config --client <id> --discovery <site-discovery-receipt.json>
  status --client <id>
  next --client <id>
  validate-manifest --client <id> --manifest <article-manifest.json>
  audit-manifest --client <id> --manifest <article-manifest.json> [--out receipt.json]
  prepare-packet --client <id> --manifest <article-manifest.json> [--receipt existing-draft-receipt.json]
  create-wix-drafts --client <id> --manifest <article-manifest.json> [--out receipt.json]
  update-wix-drafts --client <id> --manifest <article-manifest.json> --receipt <draft-receipt.json> [--out receipt.json]
  snapshot-wix-drafts --client <id> --receipt <draft-receipt.json> [--out receipt.json]
  diff-wix-drafts --client <id> --manifest <article-manifest.json> --receipt <draft-receipt.json> [--out receipt.json]
  verify-wix-drafts --client <id> --receipt <draft-receipt.json> [--out receipt.json]
  verify-rendered --receipt <draft-or-publish-receipt.json> [--out receipt.json]
  receipt-validate --receipt <receipt.json>
  approval-template --client <id> --receipt <verified-draft-receipt.json> [--out approval.json]
  upload-images --client <id> --manifest <image-manifest.json>
  attach-images --client <id> --draft-receipt <receipt.json> --image-receipt <receipt.json>
  publish --client <id> --draft-receipt <receipt.json> --approval-manifest <approval.json> [--out receipt.json]
  verify-public --receipt <publish-receipt.json> [--out receipt.json]

Defaults are safe: no publish unless approval manifest has approved=true, publishAfterQa=true, qa.status=PASS, and matching draft IDs.
Mutation commands accept --dry-run to validate inputs and stop before writes/API mutations.`); }
async function withClient(fn){ const client=await WixClient.fromBrowser(); try{return await fn(client);} finally{await client.close();} }
async function main(){ const args=parse(process.argv); const cmd=args._[0]; if(!cmd||args.help){usage(); return;} const batchId=args.batch || `batch-${ts()}`;
 if(cmd==='discover') return await withClient(async c=>{ const r=await discover(c); console.log(JSON.stringify({status:'PASS',command:'discover',counts:r.counts,files:r.files},null,2)); });
 if(cmd==='plan') return await withClient(async c=>{ let posts=[]; if(args.post) posts=[args.post]; else { const q=fs.existsSync(path.join(dataDir,'queues','topkvartiri-latest.json'))?readJson(path.join(dataDir,'queues','topkvartiri-latest.json')):await discover(c); posts=(q.queue||[]).slice(0,Number(args.limit||1)).map(x=>x.id); } const results=[]; for(const id of posts) results.push(await runPost(c,id,{mode:'plan',dryRun:true,batchId})); const file=writeJson(path.join(dataDir,'batches',`${batchId}.json`),{batchId,mode:'plan',results}); console.log(JSON.stringify({status:'PASS',batchId,file,counts:{planned:results.length}},null,2)); });
 if(cmd==='draft') { if(!args.post) throw new Error('draft requires --post ID'); return await withClient(async c=>{ const ev=await runPost(c,args.post,{mode:'draft',batchId}); console.log(JSON.stringify({status:ev.status,batchId,evidence:ev.files,qa:ev.qa?.ok},null,2)); }); }
 if(cmd==='run') return await withClient(async c=>{ const mode=args.mode||'plan'; if(mode==='publish') throw new Error('LEGACY_PUBLISH_REMOVED: all publishing must use publish --client <id> --draft-receipt <verified-receipt> --approval-manifest <approval.json>. Env overrides are not allowed.'); if(args['force-publish']) throw new Error('FORCE_PUBLISH_REMOVED: no force-publish path is allowed. Use approval-manifest publishing only.'); let posts=[]; if(args.post) posts=[args.post]; else { const q=fs.existsSync(path.join(dataDir,'queues','topkvartiri-latest.json'))?readJson(path.join(dataDir,'queues','topkvartiri-latest.json')):await discover(c); posts=(q.queue||[]).slice(0,Number(args.limit||1)).map(x=>x.id); } const results=[]; for(const id of posts){ try{ results.push(await runPost(c,id,{mode,dryRun:mode==='plan',approved:false,forcePublish:false,batchId})); } catch(e){ results.push({status:'BLOCKED',sourcePostId:id,error:e.message,generatedAt:new Date().toISOString()}); } } const summary={pass:results.filter(r=>['PLAN_ONLY','DRAFT_READY'].includes(r.status)).length,fail:results.filter(r=>/FAILED|QA_FAILED/.test(r.status)).length,blocked:results.filter(r=>r.status==='BLOCKED').length}; const file=writeJson(path.join(dataDir,'batches',`${batchId}.json`),{batchId,mode,summary,results}); console.log(JSON.stringify({status:'DONE',batchId,mode,summary,file},null,2)); });
 if(cmd==='qa') { if(!args.post||!args.draft) throw new Error('qa requires --post ID --draft ID'); return await withClient(async c=>{ const sourcePost=await getPost(c,args.post); const draftPost=await getDraft(c,args.draft); const qa=qaDraft({sourcePost,draftPost}); console.log(JSON.stringify({status:qa.ok?'PASS':'FAIL',qa},null,2)); }); }
 if(cmd==='content-plan') { const result = writeArticlePlan(args.limit || 6); console.log(JSON.stringify({status:'PASS',command:'content-plan',count:result.plan.ideas.length,files:result.files},null,2)); return; }
 if(cmd==='status' || cmd==='next') {
   if(!args.client) throw new Error(`${cmd} requires --client <id>`);
   const s = clientStatus(args.client);
   console.log(JSON.stringify({status:s.blockers.length?'BLOCKED':'PASS', command:cmd, ...s}, null, 2)); return;
 }
 if(cmd==='doctor') {
   const checks=[]; const add=(name, ok, detail='')=>checks.push({name,status:ok?'PASS':'FAIL',detail:String(detail||'')});
   add('node_version_gte_22', Number(process.versions.node.split('.')[0]) >= 22, process.version);
   add('cdp_url_configured', !!process.env.WIX_CDP_URL, process.env.WIX_CDP_URL || 'default http://127.0.0.1:18800 will be used');
   if(args.client){ try{ const s=clientStatus(args.client); add('client_pack_loads', true, args.client); add('client_wix_configured', !s.blockers.includes('CONFIG_MISSING'), s.blockers.join(',')||'configured'); } catch(e){ add('client_pack_loads', false, e.message); } }
   print({status:checks.every(c=>c.status==='PASS')?'PASS':'BLOCKED', command:cmd, checks}); return;
 }
 if(cmd==='validate-manifest') {
   if(!args.client || !args.manifest) throw new Error('validate-manifest requires --client <id> --manifest <article-manifest.json>');
   const {articles,imagePolicy,qaPolicy}=readManifest(args.manifest,args.client);
   console.log(JSON.stringify({status:'PASS',command:cmd,client:args.client,count:articles.length,imagePolicy,qaPolicy},null,2)); return;
 }
 if(cmd==='audit-manifest') {
   if(!args.client || !args.manifest) throw new Error('audit-manifest requires --client <id> --manifest <article-manifest.json>');
   const r = auditManifestReadiness(args.client, args.manifest, {out:args.out});
   console.log(JSON.stringify({status:r.receipt.status,command:cmd,out:r.out,count:r.receipt.count,passCount:r.receipt.passCount,failCount:r.receipt.failCount,results:r.receipt.results.map(x=>({articleKey:x.articleKey,language:x.language,status:x.status,recommendedFixes:x.recommendedFixes}))},null,2)); return;
 }
 if(cmd==='discover-site-config') {
   if(!args.client) throw new Error('discover-site-config requires --client <id>');
   const r = await discoverSiteConfig(args.client, {out:args.out});
   console.log(JSON.stringify({status:r.result.status,command:cmd,out:r.out,siteId:r.result.best?.siteId||null,dashboardPostsUrl:r.result.dashboardPostsUrl||null,candidates:r.result.candidates.length},null,2)); return;
 }
 if(cmd==='apply-site-config') {
   if(!args.client || !args.discovery) throw new Error('apply-site-config requires --client <id> --discovery <site-discovery-receipt.json>');
   if(assertNoDryRun(args, cmd, `Validated discovery receipt path only: ${args.discovery}`)) return;
   const r = applyDiscoveredConfig(args.client, args.discovery);
   console.log(JSON.stringify({status:'PASS',command:cmd,...r},null,2)); return;
 }
 if(cmd==='prepare-packet') {
   if(!args.client || !args.manifest) throw new Error('prepare-packet requires --client <id> --manifest <article-manifest.json>');
   const r = await preparePacket(args.client, args.manifest, {receipt:args.receipt});
   console.log(JSON.stringify({command:cmd, ...r, safe:'SAFE: nothing was published'},null,2)); return;
 }
 if(cmd==='create-wix-drafts') {
   if(!args.client || !args.manifest) throw new Error('create-wix-drafts requires --client <id> --manifest <article-manifest.json>');
   if(args['dry-run']) { const {articles,imagePolicy,qaPolicy}=readManifest(args.manifest,args.client); print({status:'DRY_RUN',command:cmd,mutationBlocked:true,client:args.client,count:articles.length,imagePolicy,qaPolicy,next:'Run without --dry-run only after manifest review and approval to create/update Wix drafts.'}); return; }
   const r = await createDraftsFromManifest(args.client, args.manifest, {out:args.out});
   console.log(JSON.stringify({status:r.receipt.failCount?'FAIL':'PASS',command:cmd,out:r.out,summaryPath:r.receipt.summaryPath,count:r.receipt.count,passCount:r.receipt.passCount,failCount:r.receipt.failCount,receiptHash:r.receipt.receiptHash},null,2)); return;
 }
 if(cmd==='update-wix-drafts') {
   if(!args.client || !args.manifest || !args.receipt) throw new Error('update-wix-drafts requires --client <id> --manifest <article-manifest.json> --receipt <draft-receipt.json>');
   if(args['dry-run']) { const {articles,imagePolicy,qaPolicy}=readManifest(args.manifest,args.client); const prior=JSON.parse(fs.readFileSync(args.receipt,'utf8')); print({status:'DRY_RUN',command:cmd,mutationBlocked:true,client:args.client,count:articles.length,sourceReceipt:args.receipt,sourceReceiptCount:prior.count ?? (prior.results||[]).length,imagePolicy,qaPolicy,next:'Run without --dry-run only after reviewing target draft IDs.'}); return; }
   const r = await updateDraftsFromManifest(args.client, args.manifest, args.receipt, {out:args.out});
   console.log(JSON.stringify({status:r.receipt.failCount?'FAIL':'PASS',command:cmd,out:r.out,summaryPath:r.receipt.summaryPath,count:r.receipt.count,passCount:r.receipt.passCount,failCount:r.receipt.failCount,receiptHash:r.receipt.receiptHash},null,2)); return;
 }
 if(cmd==='snapshot-wix-drafts') {
   if(!args.client || !args.receipt) throw new Error('snapshot-wix-drafts requires --client <id> --receipt <draft-receipt.json>');
   const r = await snapshotDraftsFromReceipt(args.client, args.receipt, {out:args.out});
   console.log(JSON.stringify({status:'PASS',command:cmd,out:r.out,count:r.receipt.count,receiptHash:r.receipt.receiptHash,purpose:r.receipt.purpose},null,2)); return;
 }
 if(cmd==='diff-wix-drafts') {
   if(!args.client || !args.manifest || !args.receipt) throw new Error('diff-wix-drafts requires --client <id> --manifest <article-manifest.json> --receipt <draft-receipt.json>');
   const r = await diffDraftsFromManifest(args.client, args.manifest, args.receipt, {out:args.out});
   console.log(JSON.stringify({status:r.receipt.diffCount?'DIFF':'MATCH',command:cmd,out:r.out,summaryPath:r.receipt.summaryPath,count:r.receipt.count,matchCount:r.receipt.matchCount,diffCount:r.receipt.diffCount,receiptHash:r.receipt.receiptHash},null,2)); return;
 }
 if(cmd==='verify-wix-drafts') {
   if(!args.client || !args.receipt) throw new Error('verify-wix-drafts requires --client <id> --receipt <draft-receipt.json>');
   const r = await verifyDraftReceipt(args.client, args.receipt, {out:args.out});
   console.log(JSON.stringify({status:r.receipt.failCount?'FAIL':'PASS',command:cmd,out:r.out,summaryPath:r.receipt.summaryPath,count:r.receipt.count,passCount:r.receipt.passCount,failCount:r.receipt.failCount,receiptHash:r.receipt.receiptHash},null,2)); return;
 }
 if(cmd==='verify-rendered') {
   if(!args.receipt) throw new Error('verify-rendered requires --receipt <receipt.json>');
   const r = await verifyRenderedReceipt(args.receipt, {out:args.out});
   console.log(JSON.stringify({status:r.receipt.failCount?'FAIL':'PASS',command:cmd,out:r.out,count:r.receipt.count,passCount:r.receipt.passCount,failCount:r.receipt.failCount},null,2)); return;
 }
 if(cmd==='receipt-validate') {
   if(!args.receipt) throw new Error('receipt-validate requires --receipt <receipt.json>');
   print({command:cmd, ...receiptValidation(args.receipt)}); return;
 }
 if(cmd==='approval-template') {
   if(!args.client || !args.receipt) throw new Error('approval-template requires --client <id> --receipt <verified-draft-receipt.json>');
   const r = approvalTemplate(args.client, args.receipt, {out:args.out});
   console.log(JSON.stringify({status:'PASS',command:cmd,out:r.out,draftIds:r.template.draftIds.length,approved:r.template.approved,receiptHash:r.template.receiptHash},null,2)); return;
 }
 if(cmd==='upload-images') {
   if(!args.client || !args.manifest) throw new Error('upload-images requires --client <id> --manifest <image-manifest.json>');
   throw new Error('WIX_IMAGE_UPLOAD_ADAPTER_NOT_PROVEN: command is intentionally fail-closed until the Wix media upload endpoint is verified for this account/site. Do not fake image upload success.');
 }
 if(cmd==='attach-images') {
   if(!args.client || !args['draft-receipt'] || !args['image-receipt']) throw new Error('attach-images requires --client <id> --draft-receipt <receipt.json> --image-receipt <receipt.json>');
   throw new Error('WIX_IMAGE_ATTACH_ADAPTER_NOT_PROVEN: command is intentionally fail-closed until image upload receipt + rich-content insertion are verified.');
 }
 if(cmd==='publish') {
   if(!args.client || !args['draft-receipt'] || !args['approval-manifest']) throw new Error('publish requires --client <id> --draft-receipt <receipt.json> --approval-manifest <approval.json>');
   if(args['dry-run']) { const draftReceipt=JSON.parse(fs.readFileSync(args['draft-receipt'],'utf8')); const approval=JSON.parse(fs.readFileSync(args['approval-manifest'],'utf8')); print({status:'DRY_RUN',command:cmd,mutationBlocked:true,client:args.client,draftReceipt:args['draft-receipt'],approvalManifest:args['approval-manifest'],approval:{approved:approval.approved,publishAfterQa:approval.publishAfterQa,qa:approval.qa?.status,draftIds:(approval.draftIds||[]).length},draftReceiptStatus:{count:draftReceipt.count,passCount:draftReceipt.passCount,failCount:draftReceipt.failCount},next:'Publishing remains blocked until this command is run without --dry-run using an approved manifest.'}); return; }
   const r = await publishFromReceipt(args.client, args['draft-receipt'], args['approval-manifest'], {out:args.out});
   console.log(JSON.stringify({status:r.receipt.failCount?'FAIL':'PASS',command:cmd,out:r.out,count:r.receipt.count,passCount:r.receipt.passCount,failCount:r.receipt.failCount},null,2)); return;
 }
 if(cmd==='verify-public') {
   if(!args.receipt) throw new Error('verify-public requires --receipt <publish-receipt.json>');
   const r = await verifyPublicFromReceipt(args.receipt, {out:args.out});
   console.log(JSON.stringify({status:r.receipt.failCount?'FAIL':'PASS',command:cmd,out:r.out,count:r.receipt.count,passCount:r.receipt.passCount,failCount:r.receipt.failCount},null,2)); return;
 }
 usage(); process.exitCode=1;
}
main().catch(e=>{ console.error(JSON.stringify({status:'ERROR',error:e.message,stack:process.env.DEBUG?e.stack:undefined},null,2)); process.exit(1); });
