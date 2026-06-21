const https = require('https');
function fetchText(url, timeoutMs=20000){
  return new Promise(resolve=>{
    const req=https.get(url,{headers:{'user-agent':'Mozilla/5.0'}},res=>{
      let body=''; res.setEncoding('utf8');
      res.on('data',d=>{ if(body.length<800000) body+=d; });
      res.on('end',()=>resolve({url,status:res.statusCode,headers:res.headers,body}));
    });
    req.on('error',e=>resolve({url,status:0,error:e.message,headers:{},body:''}));
    req.setTimeout(timeoutMs,()=>{req.destroy(); resolve({url,status:0,error:'timeout',headers:{},body:''});});
  });
}
function attr(html, tag, attrName, attrValue, target='content'){
  const re=new RegExp(`<${tag}[^>]+(?:name|property|rel)=["']${attrValue.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}["'][^>]+${target}=["']([^"']*)["']`, 'i');
  return (html.match(re)||[])[1] || '';
}
function titleText(html){ return (html.match(/<title[^>]*>([^<]*)<\/title>/i)||[])[1] || ''; }
function tagTexts(html, tag){ return [...html.matchAll(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`,'gi'))].map(m=>m[1].replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()).filter(Boolean); }
function hasNoindex(html, headers={}){ return /<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(html) || /noindex/i.test(headers['x-robots-tag']||''); }
function count(re, html){ return (html.match(re)||[]).length; }
async function verifyPublicUrl(url, expected={}){
  const res=await fetchText(url);
  const html=res.body||'';
  const title=titleText(html);
  const meta=attr(html,'meta','name','description','content');
  const canonical=(html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)||[])[1] || '';
  const ogTitle=attr(html,'meta','property','og:title','content');
  const ogDesc=attr(html,'meta','property','og:description','content');
  const ogImage=attr(html,'meta','property','og:image','content');
  const twCard=attr(html,'meta','name','twitter:card','content');
  const h1=tagTexts(html,'h1'); const h2=tagTexts(html,'h2');
  const links=[...html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)].map(m=>({href:m[1],text:m[2].replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()}));
  const host=new URL(url).hostname.replace(/^www\./,'');
  const internalLinks=links.filter(l=>{try{return new URL(l.href,url).hostname.replace(/^www\./,'')===host;}catch{return false;}});
  const images=[...html.matchAll(/<img[^>]+>/gi)].map(m=>({tag:m[0],alt:(m[0].match(/alt=["']([^"']*)["']/i)||[])[1]||''}));
  const jsonLd=count(/<script[^>]+type=["']application\/ld\+json["']/gi,html);
  const checks=[]; const add=(name, pass, detail='')=>checks.push({name,status:pass?'PASS':'FAIL',detail:String(detail||'')});
  add('http_200', res.status===200, res.status);
  add('title_present', !!title, title);
  if(expected.title) add('title_contains_expected', title.toLowerCase().includes(expected.title.slice(0,35).toLowerCase()), title);
  add('meta_present', !!meta, meta);
  add('canonical_present', !!canonical, canonical);
  if(expected.url || expected.slug) add('canonical_or_url_contains_slug', (canonical||url).includes(expected.slug||''), canonical||url);
  add('not_noindex', !hasNoindex(html,res.headers), res.headers['x-robots-tag']||'');
  add('h1_present', h1.length>0, h1.join(' | '));
  add('heading_hierarchy_present', h1.length+h2.length>=3, `${h1.length+h2.length}`);
  add('internal_links_present', internalLinks.length>=1, `${internalLinks.length}`);
  add('og_title_present', !!ogTitle, ogTitle);
  add('og_description_present', !!ogDesc, ogDesc);
  add('twitter_card_present', !!twCard, twCard);
  if(expected.requireOgImage) add('og_image_present', !!ogImage, ogImage);
  if(expected.requireSchema) add('json_ld_present', jsonLd>0, `${jsonLd}`);
  if(expected.requireImages) add('images_present', images.length>0, `${images.length}`);
  if(images.length) add('image_alt_text_present', images.every(i=>i.alt), `${images.filter(i=>i.alt).length}/${images.length}`);
  add('no_visible_placeholders_in_html', !/TODO|PLACEHOLDER|Lorem ipsum/i.test(html), '');
  return {url,status:res.status,title,meta,canonical,ogTitle,ogDesc,ogImage,twCard,h1,h2Count:h2.length,internalLinkCount:internalLinks.length,imageCount:images.length,jsonLdCount:jsonLd,checks,ok:checks.every(c=>c.status==='PASS')};
}
module.exports = { verifyPublicUrl };
