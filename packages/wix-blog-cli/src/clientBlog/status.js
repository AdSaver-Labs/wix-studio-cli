const fs = require('fs');
const path = require('path');
const { loadClientPack, RECEIPTS_ROOT } = require('./clients');
const { ledgerPath } = require('./ledger');
const { WORKSPACE } = require('./clients');
function readJson(p,f=null){ try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return f;} }
function findLatestReceipt(clientId, pattern){
  const dir=path.join(RECEIPTS_ROOT,clientId);
  if(!fs.existsSync(dir)) return null;
  const files=fs.readdirSync(dir).filter(f=>pattern.test(f)).map(f=>path.join(dir,f)).sort((a,b)=>fs.statSync(b).mtimeMs-fs.statSync(a).mtimeMs);
  return files[0]||null;
}
function hasImageFailures(verify){
  if(!verify) return true;
  return (verify.results||[]).some(r=>(r.qa?.checks||[]).some(c=>c.name==='image_required_present'&&c.status!=='PASS'));
}
function clientStatus(clientId){
  const pack=loadClientPack(clientId); const wix=pack.wix||{};
  const ledger=readJson(ledgerPath(clientId),{articles:[]});
  const latestVerify=findLatestReceipt(clientId,/draft-verify|WIX-DRAFT-VERIFY/i);
  const latestPublish=findLatestReceipt(clientId,/publish/i);
  const verify=latestVerify?readJson(latestVerify):null;
  const imagePolicy=wix.imagePolicy||pack.imagePolicy||'required';
  const blockers=[];
  if(!wix.siteId||!wix.dashboardPostsUrl) blockers.push('CONFIG_MISSING');
  if(verify?.failCount>0) blockers.push('DRAFT_QA_FAILED');
  if(!verify) blockers.push('NO_DRAFT_VERIFY_RECEIPT');
  if(imagePolicy==='required' && hasImageFailures(verify)) blockers.push('IMAGE_REQUIRED_NOT_VERIFIED');
  const next = blockers.includes('CONFIG_MISSING') ? 'discover-site-config'
    : blockers.includes('NO_DRAFT_VERIFY_RECEIPT') ? 'create/update then verify drafts'
    : blockers.includes('DRAFT_QA_FAILED') ? 'fix drafts then verify-wix-drafts'
    : blockers.includes('IMAGE_REQUIRED_NOT_VERIFIED') ? 'add/verify article image or OG image evidence'
    : 'approval-template then publish when approved';
  return {clientId,clientName:pack.clientName,publishingGate:pack.publishingGate,wix:{status:wix.status,siteId:wix.siteId,dashboardPostsUrl:wix.dashboardPostsUrl,imagePolicy},latestVerify,latestPublish,counts:{ledgerArticles:(ledger.articles||[]).length,verifyCount:verify?.count||0,verifyPass:verify?.passCount||0,verifyFail:verify?.failCount||0},blockers,nextSafeAction:next};
}
module.exports={clientStatus};
