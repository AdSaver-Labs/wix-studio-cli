const fs = require('fs');
const path = require('path');
const { CLIENT_ROOT } = require('./clients');
function readJson(p, fallback){ try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return fallback;} }
function writeJson(p,obj){ fs.mkdirSync(path.dirname(p),{recursive:true}); fs.writeFileSync(p, JSON.stringify(obj,null,2)+'\n'); }
function ledgerPath(clientId){ return path.join(CLIENT_ROOT, clientId, 'article-ledger.json'); }
function keyOf(row){ return [row.articleKey,row.language,row.seoSlug,row.draftId,row.postId].filter(Boolean).join('|'); }
function appendLedger(clientId, receipt, eventType){
  const p=ledgerPath(clientId);
  const ledger=readJson(p,{clientId,articles:[]});
  ledger.clientId ||= clientId; ledger.articles ||= [];
  const byKey=new Map(ledger.articles.map((r,i)=>[keyOf(r),i]));
  for(const r of receipt.results||[]){
    const row={
      articleKey:r.articleKey, title:r.title, lang:r.language, status:r.status,
      draftId:r.draftId, postId:r.postId, url:r.url?.base&&r.url?.path?r.url.base+r.url.path:r.url,
      seoSlug:r.seoSlug, qaStatus:r.qa?.ok?'PASS':(r.qa?'FAIL':undefined),
      articleHash:r.articleHash, draftHash:r.draftHash, receiptType:eventType,
      updatedAt:receipt.generatedAt||new Date().toISOString()
    };
    const k=keyOf(row);
    if(byKey.has(k)) ledger.articles[byKey.get(k)]={...ledger.articles[byKey.get(k)],...row};
    else { ledger.articles.push(row); byKey.set(k, ledger.articles.length-1); }
  }
  ledger.updatedAt=new Date().toISOString();
  writeJson(p,ledger); return p;
}
module.exports = { ledgerPath, appendLedger };
