function id(prefix='n'){ return prefix + Math.random().toString(36).slice(2,10); }
function txt(text, bold=false){ return {type:'TEXT', id:'', nodes:[], textData:{text: String(text || ''), decorations:bold?[{type:'BOLD', fontWeightValue:700}]:[]}}; }
function p(text){ return {type:'PARAGRAPH', id:id('p'), nodes:[txt(text)], paragraphData:{}}; }
function h(text, level=2){ return {type:'HEADING', id:id('h'), nodes:[txt(text,true)], headingData:{level}}; }
function list(items){ return {type:'BULLETED_LIST', id:id('l'), nodes:(items||[]).map(item=>({type:'LIST_ITEM', id:id('li'), nodes:[{type:'PARAGRAPH', id:id('p'), nodes:[txt(item)], paragraphData:{}}]})), bulletedListData:{indentation:0}}; }
function spacer(){ return {type:'PARAGRAPH', id:id('s'), nodes:[], paragraphData:{}}; }
function linkBlock(link){ return p(`${link.anchor || link.label || 'Read more'}: ${link.url}`); }
function ctaBlock(cta){ return p(`${cta.label || 'Contact us'}: ${cta.url || ''}`.trim()); }
function richContentFromBlocks(blocks, article={}){
  const nodes=[];
  for (const b of blocks || []) {
    if (b.type === 'heading' || b.type === 'h') nodes.push(h(b.text, b.level || 2));
    else if (b.type === 'list') nodes.push(list(b.items || []));
    else if (b.type === 'paragraph' || b.type === 'p') nodes.push(p(b.text));
    else if (b.type === 'internalLink') nodes.push(linkBlock(b));
    else if (b.type === 'cta') nodes.push(ctaBlock(b));
    else if (typeof b === 'string') nodes.push(p(b));
    nodes.push(spacer());
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
function validateArticle(article, opts={}){
  const errors=[];
  for (const k of ['key','title','slug','seoTitle','metaDescription','excerpt','language']) if(!article[k]) errors.push(`missing ${k}`);
  if(!['bg','en'].includes(article.language)) errors.push(`unsupported language ${article.language}`);
  if(!article.focusKeyword) errors.push('missing focusKeyword');
  if(!Array.isArray(article.blocks) || article.blocks.length < 6) errors.push('blocks must contain at least 6 content blocks');
  if(article.metaDescription && (article.metaDescription.length < 80 || article.metaDescription.length > 170)) errors.push(`metaDescription length ${article.metaDescription.length} outside 80-170`);
  if(article.seoTitle && article.seoTitle.length > 75) errors.push(`seoTitle length ${article.seoTitle.length} > 75`);
  if(article.slug && !/^[a-z0-9-]+$/.test(article.slug)) errors.push(`slug must be latin lowercase/kebab: ${article.slug}`);
  const body=textOfBlocks(article.blocks||[]);
  if(/TODO|PLACEHOLDER|Lorem ipsum/i.test(body+' '+article.title+' '+article.metaDescription)) errors.push('placeholder text present');
  if((article.language==='bg') && !/[\u0400-\u04FF]/.test(body+article.title)) errors.push('Bulgarian article must contain Cyrillic text');
  if((article.language==='en') && /[\u0400-\u04FF]/.test(article.title+' '+article.seoTitle+' '+article.metaDescription)) errors.push('English metadata/title contains Cyrillic');
  if(!Array.isArray(article.internalLinks) || article.internalLinks.length < (opts.minInternalLinks ?? 1)) errors.push('missing internalLinks');
  for(const l of article.internalLinks||[]) if(!l.url || !(l.anchor||l.label)) errors.push('internalLink requires url and anchor/label');
  if(!article.cta || !article.cta.url || !article.cta.label) errors.push('missing cta.url/label');
  const imagePolicy=opts.imagePolicy || article.imagePolicy || 'required';
  if(imagePolicy==='required') {
    const imgs = article.images || [];
    if(!Array.isArray(imgs) || imgs.length < 1) errors.push('imagePolicy required but images missing');
    const hasUsableImageEvidence = !!article.ogImage || imgs.some(img => img && (img.wixMedia || img.url || img.src || img.assetUrl));
    if(!hasUsableImageEvidence) errors.push('imagePolicy required but no usable image evidence (wixMedia/url/src/assetUrl/ogImage)');
    for(const img of imgs) {
      if(!img.alt || !img.role) errors.push('each image requires role and alt');
      if(img.role === 'featured' && !(img.wixMedia || img.url || img.src || img.assetUrl || article.ogImage)) errors.push('featured image requires wixMedia/url/src/assetUrl or article ogImage');
    }
  }
  if(errors.length) throw new Error(`ARTICLE_PAYLOAD_INVALID ${article.key || article.title || ''}: ${errors.join('; ')}`);
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
module.exports = { validateArticle, draftPostFromArticle, richContentFromBlocks, textOfBlocks };
