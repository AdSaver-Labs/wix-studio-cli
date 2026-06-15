const crypto = require('crypto');
function stable(value){
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.keys(value).sort().reduce((o,k)=>{o[k]=stable(value[k]); return o;},{});
  return value;
}
function sha256(value){ return crypto.createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(stable(value))).digest('hex'); }
function articleFingerprint(article){ return sha256({key:article.key,language:article.language,title:article.title,slug:article.slug,seoTitle:article.seoTitle,metaDescription:article.metaDescription,focusKeyword:article.focusKeyword,excerpt:article.excerpt,blocks:article.blocks,internalLinks:article.internalLinks,images:article.images,cta:article.cta}); }
function receiptFingerprint(receipt){ return sha256({clientId:receipt.clientId,count:receipt.count,results:(receipt.results||[]).map(r=>({articleKey:r.articleKey,language:r.language,draftId:r.draftId,status:r.status,seoSlug:r.seoSlug,articleHash:r.articleHash,draftHash:r.draftHash,qaOk:r.qa?.ok}))}); }
module.exports = { sha256, articleFingerprint, receiptFingerprint };
