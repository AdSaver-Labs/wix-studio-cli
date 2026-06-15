const { applyGlossary } = require('../translate/translator');
function slugify(s) { return (s || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,90).replace(/-+$/,'') || 'post'; }
function cleanTitle(title) { return applyGlossary((title || '').replace(/\s+/g,' ').trim()).replace(/craftsmen|masters/gi,'contractors'); }
function focusKeyword(title, fallback='property management Sofia') {
  const t = cleanTitle(title).replace(/[?:].*$/, '').replace(/\|.*$/, '').trim();
  if (/contractor/i.test(t)) return 'reliable contractors Sofia';
  if (/tenant/i.test(t)) return 'tenant management Sofia';
  if (/renovation|repair|budget/i.test(t)) return 'rental apartment renovation Sofia';
  if (/short-term/i.test(t)) return 'short-term rental management Sofia';
  return (t.length >= 18 && t.length <= 60) ? t : fallback;
}
function seoTitleFor(title) {
  let t = cleanTitle(title)
    .replace(/\s+-\s+which is better for your property\??/i, '')
    .replace(/\s+-\s+.*$/, '')
    .replace(/:.*$/, '')
    .trim();
  if (/short-term.*long-term|long-term.*short-term/i.test(title)) t = 'Short-Term vs Long-Term Rental';
  if (/contractor/i.test(title)) t = t.includes('Sofia') ? t : `${t} in Sofia`;
  const suffix = ' | Top Kvartiri';
  if ((t + suffix).length > 65) t = t.slice(0, 65 - suffix.length).replace(/\s+\S*$/, '');
  return t + suffix;
}
function trimMeta(base) {
  let out = (base || '').replace(/\s+/g, ' ').trim();
  if (out.length > 155) out = out.slice(0, 152).replace(/[,;:]?\s+\S*$/, '');
  out = out.replace(/\s+(and|or|for|with|on|to|of|in)$/i, '').replace(/[,;:]$/, '');
  if (!/[.!?]$/.test(out)) out += '.';
  return out;
}
function metaDescription(title) {
  const t = cleanTitle(title).toLowerCase();
  if (/short-term.*long-term|long-term.*short-term/i.test(t)) return 'Compare short-term and long-term rentals in Sofia, including income potential, risks, management needs, and the best fit for your property.';
  if (/contractor/i.test(t)) return 'Learn how to choose reliable contractors in Sofia, compare offers, avoid hidden costs, and protect your rental renovation budget.';
  if (/tenant/i.test(t)) return 'Practical tenant management guidance for Sofia property owners, including common rental problems, prevention, and professional solutions.';
  if (/renovation|repair|budget/i.test(t)) return 'Plan rental apartment renovation in Sofia with clearer costs, smarter choices, fewer mistakes, and better long-term rental returns.';
  if (/prepare|quick rental|rental/i.test(t)) return 'Prepare your Sofia apartment for rental with practical steps that improve presentation, tenant interest, operations, and long-term returns.';
  return trimMeta(`Practical guidance for Sofia property owners on ${t}, rental income, renovation planning, and professional property management.`);
}
function excerptFromText(text, title) {
  const first = (text || '').replace(/\s+/g,' ').trim();
  let ex = first && first.length > 80 ? first : `A practical guide for Sofia property owners: ${cleanTitle(title)}.`;
  if (ex.length > 260) ex = ex.slice(0, 257).replace(/\s+\S*$/, '') + '...';
  return ex;
}
function seoData(title, meta, focus) {
  return { tags: [
    { type:'title', props:{}, children: seoTitleFor(title), custom:false, disabled:false },
    { type:'meta', props:{ name:'description', content: meta }, children:'', custom:false, disabled:false }
  ], settings: { preventAutoRedirect: false, keywords: [{ term: focus, isMain: true }] } };
}
module.exports = { slugify, cleanTitle, focusKeyword, metaDescription, excerptFromText, seoTitleFor, seoData };
