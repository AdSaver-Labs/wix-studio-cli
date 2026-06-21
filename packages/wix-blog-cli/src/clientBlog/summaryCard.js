const fs = require('fs');
const path = require('path');
const { receiptPath, writeJson } = require('./receipts');
function safeTs(){ return new Date().toISOString().replace(/[:.]/g,'-'); }
function mdEscape(s=''){ return String(s).replace(/[\r\n]+/g,' ').trim(); }
function cardFromReceipt(receipt, opts={}){
  const action = opts.action || 'workflow';
  const published = /publish/i.test(action);
  const lines=[];
  lines.push(`# Wix Blog ${action} Summary`);
  lines.push('');
  lines.push(`- Client: ${receipt.clientId || opts.clientId || 'unknown'}`);
  lines.push(`- Generated: ${receipt.generatedAt || new Date().toISOString()}`);
  lines.push(`- Count: ${receipt.count ?? (receipt.results||[]).length}`);
  lines.push(`- PASS: ${receipt.passCount ?? 0}`);
  lines.push(`- FAIL: ${receipt.failCount ?? 0}`);
  lines.push(`- Receipt hash: ${receipt.receiptHash || 'n/a'}`);
  lines.push(`- Publish state: ${published ? 'PUBLISHED command path used — verify public receipt required' : 'SAFE: nothing was published'}`);
  lines.push('');
  lines.push('## Articles');
  for(const r of receipt.results||[]) {
    const failed=(r.qa?.checks||r.publicVerify?.checks||[]).filter(c=>c.status && c.status!=='PASS');
    lines.push(`- ${mdEscape(r.title || r.articleKey || r.draftId)} (${r.language || 'n/a'})`);
    if(r.draftId) lines.push(`  - Draft ID: ${r.draftId}`);
    if(r.postId) lines.push(`  - Post ID: ${r.postId}`);
    if(r.seoSlug) lines.push(`  - Slug: ${r.seoSlug}`);
    if(r.url) lines.push(`  - URL: ${typeof r.url==='string'?r.url:((r.url.base||'')+(r.url.path||''))}`);
    lines.push(`  - Status: ${r.status || (r.qa?.ok?'PASS':'CHECK')}`);
    if(failed.length) lines.push(`  - Blockers: ${failed.map(f=>`${f.name}:${f.detail||f.status}`).join('; ')}`);
  }
  lines.push('');
  if((receipt.failCount||0)>0) lines.push('Next safe action: fix listed blockers, then rerun verification.');
  else if(!published) lines.push('Next safe action: generate approval-template and publish only after explicit approval manifest is set to approved=true.');
  else lines.push('Next safe action: run/inspect verify-public receipt and monitor indexing/search evidence.');
  return lines.join('\n')+'\n';
}
function writeSummary(clientId, receipt, action, out){
  const md=cardFromReceipt(receipt,{clientId,action});
  const file=out || receiptPath(clientId||receipt.clientId||'unknown', `${action}-summary-${safeTs()}.md`);
  fs.mkdirSync(path.dirname(file),{recursive:true}); fs.writeFileSync(file,md);
  return file;
}
module.exports={cardFromReceipt,writeSummary};
