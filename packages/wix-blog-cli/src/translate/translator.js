const https = require('https');
const config = require('../config');
const { brandGlossary } = require('../brand/topkvartiri');
function applyGlossary(s='') { let out = s; for (const [re, val] of config.glossary) out = out.replace(re, val); return brandGlossary(out); }
function gt(text, sl='bg', tl='en') {
  return new Promise((resolve, reject) => {
    if (!text || !text.trim()) return resolve(text || '');
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=` + encodeURIComponent(text);
    https.get(url, res => { let d=''; res.on('data', c => d += c); res.on('end', () => { try { const j=JSON.parse(d); resolve(applyGlossary((j[0]||[]).map(x=>x[0]).join(''))); } catch(e) { reject(e); } }); }).on('error', reject);
  });
}
async function translateMany(texts, opts={}) {
  const delim = '\n|||OCSEP_7f3b9|||\n';
  const out = [];
  for (let i = 0; i < texts.length;) {
    const chunk = []; let len = 0;
    while (i < texts.length && len + texts[i].length + delim.length < (opts.maxChars || 3300)) { chunk.push(texts[i]); len += texts[i].length + delim.length; i++; }
    let translated = await gt(chunk.join(delim));
    let parts = translated.split(/\n?\|\|\|\s*OCSEP_7f3b9\s*\|\|\|\n?/);
    if (parts.length !== chunk.length) { parts = []; for (const t of chunk) parts.push(await gt(t)); }
    out.push(...parts.map(applyGlossary));
    await new Promise(r => setTimeout(r, opts.delayMs || 150));
  }
  return out;
}
module.exports = { gt, translateMany, applyGlossary };
