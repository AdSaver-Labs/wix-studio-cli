const config = require('../config');
const { writeJson, readJson, receiptPath } = require('./receipts');
function safeTs(){ return new Date().toISOString().replace(/[:.]/g,'-'); }
function expectSnippet(title=''){ return title.split(/\s+/).filter(w=>w.length>3).slice(0,4).join(' '); }
function getChromium(){ return require('playwright').chromium; }
async function verifyRenderedReceipt(receiptFile, opts={}){
  const receipt=readJson(receiptFile); const results=[];
  const chromium = getChromium();
  const browser=await chromium.connectOverCDP(opts.cdpUrl||config.cdpUrl,{timeout:15000});
  const ctx=browser.contexts()[0]||await browser.newContext();
  const page=ctx.pages()[0]||await ctx.newPage();
  try{
    for(const r of receipt.results||[]){
      const url=r.url?.base&&r.url?.path ? r.url.base+r.url.path : r.url;
      if(!url){ results.push({...r, rendered:{ok:false,checks:[{name:'url_present',status:'FAIL'}]}}); continue; }
      await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000}).catch(()=>{});
      await page.waitForTimeout(3000);
      const data=await page.evaluate(()=>({title:document.title,body:document.body?.innerText||'',h1:[...document.querySelectorAll('h1')].map(x=>x.innerText.trim()),h2:[...document.querySelectorAll('h2')].map(x=>x.innerText.trim()),links:[...document.querySelectorAll('a[href]')].map(a=>({text:a.innerText.trim(),href:a.href})).slice(0,100),images:[...document.querySelectorAll('img')].map(img=>({src:img.currentSrc||img.src,alt:img.alt||''})).slice(0,50)}));
      const checks=[]; const add=(name,pass,detail='')=>checks.push({name,status:pass?'PASS':'FAIL',detail});
      const body=data.body||''; const snip=expectSnippet(r.title||'');
      add('rendered_title_present', !!data.title, data.title);
      add('body_contains_title_snippet', snip ? body.toLowerCase().includes(snip.toLowerCase()) : true, snip);
      add('h1_present', data.h1.length>0, data.h1.join(' | '));
      add('headings_present', data.h1.length+data.h2.length>=3, String(data.h1.length+data.h2.length));
      add('no_visible_placeholders', !/TODO|PLACEHOLDER|Lorem ipsum/i.test(body), '');
      add('internal_links_present', data.links.some(l=>l.href.includes(new URL(url).hostname)), String(data.links.length));
      results.push({...r, url, rendered:{ok:checks.every(c=>c.status==='PASS'),checks,summary:{title:data.title,h1:data.h1,headingCount:data.h1.length+data.h2.length,linkCount:data.links.length,imageCount:data.images.length}}});
    }
  } finally { await browser.close().catch(()=>{}); }
  const outObj={generatedAt:new Date().toISOString(),sourceReceipt:receiptFile,clientId:receipt.clientId,count:results.length,passCount:results.filter(r=>r.rendered.ok).length,failCount:results.filter(r=>!r.rendered.ok).length,results};
  const out=opts.out||receiptPath(receipt.clientId||'unknown',`rendered-verify-${safeTs()}.json`); writeJson(out,outObj); return {out,receipt:outObj};
}
module.exports={verifyRenderedReceipt};
