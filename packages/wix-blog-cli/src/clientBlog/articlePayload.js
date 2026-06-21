function id(prefix='n'){ return prefix + Math.random().toString(36).slice(2,10); }
function txt(text, bold=false){ return {type:'TEXT', id:'', nodes:[], textData:{text: String(text || ''), decorations:bold?[{type:'BOLD', fontWeightValue:700}]:[]}}; }
function p(text){ return {type:'PARAGRAPH', id:id('p'), nodes:[txt(text)], paragraphData:{}}; }
function h(text, level=2){ return {type:'HEADING', id:id('h'), nodes:[txt(text,true)], headingData:{level}}; }
function img(image={}){
  const imageData = { altText: image.alt || image.altText || '' };
  if (image.caption) imageData.caption = image.caption;
  if (image.wixMedia) imageData.image = image.wixMedia;
  else if (image.url || image.src || image.assetUrl) imageData.image = { src: { url: image.url || image.src || image.assetUrl } };
  return {type:'IMAGE', id:id('img'), nodes:[], imageData};
}
function list(items){ return {type:'BULLETED_LIST', id:id('l'), nodes:(items||[]).map(item=>({type:'LIST_ITEM', id:id('li'), nodes:[{type:'PARAGRAPH', id:id('p'), nodes:[txt(item)], paragraphData:{}}]})), bulletedListData:{indentation:0}}; }
function spacer(){ return {type:'PARAGRAPH', id:id('s'), nodes:[], paragraphData:{}}; }
function linkBlock(link){ return p(`${link.anchor || link.label || 'Read more'}: ${link.url}`); }
function ctaBlock(cta){ return p(`${cta.label || 'Contact us'}: ${cta.url || ''}`.trim()); }
function normalizeKeyword(s='') { return String(s || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\u0400-\u04ff]+/g, ' ').trim().replace(/\s+/g, ' '); }
function keywordTokens(keyword='') { return normalizeKeyword(keyword).split(' ').filter(t => t.length > 1); }
function containsKeyword(haystack='', keyword='') {
  const h = normalizeKeyword(haystack);
  const k = normalizeKeyword(keyword);
  if (!k) return false;
  if (h.includes(k)) return true;
  const tokens = keywordTokens(keyword);
  return tokens.length > 0 && tokens.every(t => h.includes(t));
}
function richContentFromBlocks(blocks, article={}){
  const nodes=[];
  for (const b of blocks || []) {
    if (b.type === 'heading' || b.type === 'h') nodes.push(h(b.text, b.level || 2));
    else if (b.type === 'list') nodes.push(list(b.items || []));
    else if (b.type === 'image') nodes.push(img(b));
    else if (b.type === 'paragraph' || b.type === 'p') nodes.push(p(b.text));
    else if (b.type === 'internalLink') nodes.push(linkBlock(b));
    else if (b.type === 'cta') nodes.push(ctaBlock(b));
    else if (typeof b === 'string') nodes.push(p(b));
    nodes.push(spacer());
  }
  for (const image of article.images || []) {
    if (image.role === 'featured') continue;
    if (image.wixMedia || image.url || image.src || image.assetUrl) { nodes.push(img(image)); nodes.push(spacer()); }
  }
  for (const l of article.internalLinks || []) { nodes.push(linkBlock(l)); nodes.push(spacer()); }
  if (article.cta) { nodes.push(h(article.cta.heading || 'Next step', 2)); nodes.push(ctaBlock(article.cta)); }
  return { nodes };
}
function seoData(title, meta, focus, article={}){
  const tags=[
    {type:'title', props:{}, children:title, custom:false, disabled:false},
    {type:'meta', props:{name:'description', content:meta}, children:'', custom:false, disabled:false},
    {type:'meta', props:{property:'og:title', content:article.ogTitle || title}, children:'', custom:false, disabled:false},
    {type:'meta', props:{property:'og:description', content:article.ogDescription || meta}, children:'', custom:false, disabled:false},
    {type:'meta', props:{name:'twitter:card', content:article.twitterCard || 'summary_large_image'}, children:'', custom:false, disabled:false},
    {type:'meta', props:{name:'twitter:title', content:article.twitterTitle || title}, children:'', custom:false, disabled:false},
    {type:'meta', props:{name:'twitter:description', content:article.twitterDescription || meta}, children:'', custom:false, disabled:false}
  ];
  if(article.ogImage) tags.push({type:'meta', props:{property:'og:image', content:article.ogImage}, children:'', custom:false, disabled:false});
  return { tags, settings:{preventAutoRedirect:false, keywords: focus ? [{term:focus,isMain:true}] : []} };
}
function textOfBlocks(blocks=[]){
  return blocks.map(b=>typeof b==='string'?b:(b.text||((b.items||[]).join(' '))||'')).join(' ');
}
function validateArticleResult(article, opts={}){
  const errors=[];
  for (const k of ['key','title','slug','seoTitle','metaDescription','excerpt','language']) if(!article[k]) errors.push(`missing ${k}`);
  if(!['bg','en'].includes(article.language)) errors.push(`unsupported language ${article.language}`);
  if(!article.focusKeyword) errors.push('missing focusKeyword');
  if(!Array.isArray(article.blocks) || article.blocks.length < 6) errors.push('blocks must contain at least 6 content blocks');
  if(article.metaDescription && (article.metaDescription.length < 80 || article.metaDescription.length > 170)) errors.push(`metaDescription length ${article.metaDescription.length} outside 80-170`);
  if(article.seoTitle && article.seoTitle.length > 75) errors.push(`seoTitle length ${article.seoTitle.length} > 75`);
  if(article.slug && !/^[a-z0-9-]+$/.test(article.slug)) errors.push(`slug must be latin lowercase/kebab: ${article.slug}`);
  if(article.focusKeyword && article.slug && !containsKeyword(article.slug.replace(/-/g, ' '), article.focusKeyword)) errors.push('focusKeyword must be represented in slug');
  if(article.focusKeyword && article.metaDescription && !containsKeyword(article.metaDescription, article.focusKeyword)) errors.push('focusKeyword must appear in metaDescription');
  if(article.focusKeyword && article.seoTitle && !containsKeyword(article.seoTitle, article.focusKeyword)) errors.push('focusKeyword must appear in seoTitle');
  const body=textOfBlocks(article.blocks||[]);
  const headings=(article.blocks||[]).filter(b => b && (b.type === 'heading' || b.type === 'h')).map(b => b.text || '').join(' | ');
  if(article.focusKeyword && !containsKeyword(headings, article.focusKeyword)) errors.push('focusKeyword must appear in at least one subheading');
  if(/TODO|PLACEHOLDER|Lorem ipsum/i.test(body+' '+article.title+' '+article.metaDescription)) errors.push('placeholder text present');
  if((article.language==='bg') && !/[\u0400-\u04FF]/.test(body+article.title)) errors.push('Bulgarian article must contain Cyrillic text');
  if((article.language==='en') && /[\u0400-\u04FF]/.test(article.title+' '+article.seoTitle+' '+article.metaDescription)) errors.push('English metadata/title contains Cyrillic');
  if(!Array.isArray(article.internalLinks) || article.internalLinks.length < (opts.minInternalLinks ?? 1)) errors.push('missing internalLinks');
  for(const l of article.internalLinks||[]) if(!l.url || !(l.anchor||l.label)) errors.push('internalLink requires url and anchor/label');
  if(!Array.isArray(article.relatedPostIds) || article.relatedPostIds.length < (opts.minRelatedPosts ?? 1)) errors.push('missing relatedPostIds');
  if(!article.cta || !article.cta.url || !article.cta.label) errors.push('missing cta.url/label');
  const imagePolicy=opts.imagePolicy || article.imagePolicy || 'required';
  if(imagePolicy==='required') {
    const imgs = article.images || [];
    const minImages = opts.minImages ?? 1;
    if(!Array.isArray(imgs) || imgs.length < minImages) errors.push(`imagePolicy required but needs at least ${minImages} images`);
    const socialShareImage = article.ogImage || article.socialShareImage || opts.socialShareImage || opts.socialShareLogo;
    const hasUsableImageEvidence = !!socialShareImage || imgs.some(img => img && (img.wixMedia || img.url || img.src || img.assetUrl));
    if(!hasUsableImageEvidence) errors.push('imagePolicy required but no usable image evidence (wixMedia/url/src/assetUrl/ogImage)');
    if(!socialShareImage) errors.push('social share image/logo missing (ogImage/socialShareImage/client socialShareLogo)');
    for(const img of imgs) {
      if(!img.alt || !img.role) errors.push('each image requires role and alt');
      if(img.role === 'featured' && !(img.wixMedia || img.url || img.src || img.assetUrl || article.ogImage)) errors.push('featured image requires wixMedia/url/src/assetUrl or article ogImage');
    }
  }
  return {
    ok: errors.length === 0,
    status: errors.length ? 'FAIL' : 'PASS',
    articleKey: article.key || article.slug || article.title || null,
    language: article.language || null,
    errors,
    metrics: {
      blockCount: Array.isArray(article.blocks) ? article.blocks.length : 0,
      headingCount: (article.blocks || []).filter(b => b && (b.type === 'heading' || b.type === 'h')).length,
      internalLinkCount: Array.isArray(article.internalLinks) ? article.internalLinks.length : 0,
      relatedPostCount: Array.isArray(article.relatedPostIds) ? article.relatedPostIds.length : 0,
      imageCount: Array.isArray(article.images) ? article.images.length : 0,
      metaLength: article.metaDescription ? article.metaDescription.length : 0,
      seoTitleLength: article.seoTitle ? article.seoTitle.length : 0
    }
  };
}
function validateArticle(article, opts={}){
  const result = validateArticleResult(article, opts);
  if(!result.ok) throw new Error(`ARTICLE_PAYLOAD_INVALID ${article.key || article.title || ''}: ${result.errors.join('; ')}`);
}
function draftPostFromArticle(article, opts={}){
  validateArticle(article, opts);
  const featuredImage = (article.images||[]).find(i=>i.role==='featured' && i.wixMedia) || null;
  return {
    title: article.title,
    excerpt: article.excerpt,
    featured: !!article.featured,
    categoryIds: article.categoryIds || [],
    hashtags: article.hashtags || [],
    commentingEnabled: article.commentingEnabled !== false,
    tagIds: article.tagIds || [],
    relatedPostIds: article.relatedPostIds || [],
    pricingPlanIds: article.pricingPlanIds || [],
    language: article.language,
    richContent: richContentFromBlocks(article.blocks, article),
    seoSlug: article.slug,
    seoData: seoData(article.seoTitle, article.metaDescription, article.focusKeyword, article),
    media: featuredImage ? { displayed:true, custom:true, wixMedia: featuredImage.wixMedia, altText: featuredImage.alt } : (article.media || { displayed:true, custom:false })
  };
}
module.exports = { validateArticle, validateArticleResult, draftPostFromArticle, richContentFromBlocks, textOfBlocks, containsKeyword, keywordTokens };
