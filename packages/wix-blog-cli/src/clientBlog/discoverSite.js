const fs = require('fs');
const path = require('path');
const config = require('../config');
const { loadClientPack, CLIENT_ROOT } = require('./clients');
const { writeJson, receiptPath } = require('./receipts');

function getChromium(){ return require('playwright').chromium; }

function normalize(s=''){ return String(s).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/https?:\/\//g,'').replace(/www\./g,'').replace(/[^a-z0-9а-я]+/gi,' ').trim(); }
function scoreCandidate(c, pack){
  const hay = normalize([c.text,c.href,c.url,c.siteId,c.name,c.displayName,c.domain].filter(Boolean).join(' '));
  let score=0;
  for (const part of [pack.clientName, pack.website, pack.website?.replace(/^https?:\/\//,'').replace(/^www\./,'')]) {
    const n=normalize(part); if(n && hay.includes(n)) score += n.includes('.') ? 10 : 6;
  }
  if(/dashboard\/[0-9a-f-]{20,}/i.test(c.href||c.url||'')) score += 8;
  if(c.siteId) score += 8;
  return score;
}
function extractSiteId(s=''){
  return (String(s).match(/dashboard\/([0-9a-f-]{20,})/i)||[])[1] || (String(s).match(/site(?:Id)?["'=:\/]+([0-9a-f-]{20,})/i)||[])[1] || null;
}
async function discoverSiteConfig(clientId, opts={}){
  const pack=loadClientPack(clientId);
  const chromium = getChromium();
  const browser=await chromium.connectOverCDP(opts.cdpUrl || config.cdpUrl, {timeout:15000});
  const ctx=browser.contexts()[0] || await browser.newContext();
  const page=ctx.pages().find(p=>p.url().includes('manage.wix.com')) || await ctx.newPage();
  const urls=['https://manage.wix.com/studio/sites?viewId=all-items-view','https://manage.wix.com/account/sites'];
  const candidates=[];
  try{
    for (const u of urls) {
      await page.goto(u,{waitUntil:'domcontentloaded',timeout:45000}).catch(()=>{});
      await page.waitForTimeout(6000);
      const pageUrl=page.url();
      const title=await page.title().catch(()=>null);
      const found=await page.evaluate(() => {
        const out=[];
        for (const el of [...document.querySelectorAll('a,button,[role=button],div,span')]) {
          const text=(el.innerText||el.textContent||'').trim().replace(/\s+/g,' ').slice(0,500);
          const href=el.href||el.getAttribute('href')||'';
          const attrs={};
          for (const a of el.attributes||[]) if(/href|id|data|aria|title|role/i.test(a.name)) attrs[a.name]=a.value;
          if(text || href) out.push({text,href,attrs});
        }
        const scripts=[...document.scripts].map(s=>s.textContent||'').filter(t=>/siteId|dashboard\/[0-9a-f-]{20,}/i.test(t)).slice(0,20).map(t=>t.slice(0,2000));
        const storage=[];
        try { for(let i=0;i<localStorage.length;i++){ const k=localStorage.key(i); const v=localStorage.getItem(k); if(/site|proekt|wix/i.test(k+' '+v)) storage.push({k,v:String(v).slice(0,2000)}); } } catch(e){}
        return {items:out, scripts, storage, body:document.body.innerText.slice(0,5000)};
      });
      for (const item of found.items) {
        const joined=[item.text,item.href,JSON.stringify(item.attrs)].join(' ');
        if(scoreCandidate({text:joined, href:item.href, siteId:extractSiteId(joined)}, pack) > 0 || /dashboard\/[0-9a-f-]{20,}/i.test(joined)) candidates.push({source:u,pageUrl,title,...item, siteId:extractSiteId(joined)});
      }
      for (const blob of [...found.scripts, ...found.storage.map(x=>JSON.stringify(x))]) {
        if(scoreCandidate({text:blob, href:'', siteId:extractSiteId(blob)}, pack) > 0 || /dashboard\/[0-9a-f-]{20,}/i.test(blob)) candidates.push({source:u,pageUrl,title,text:blob.slice(0,500), href:'', siteId:extractSiteId(blob)});
      }
    }
  } finally { await browser.close(); }
  const ranked=candidates.map(c=>({...c, score:scoreCandidate(c,pack)})).sort((a,b)=>b.score-a.score);
  const best=ranked[0] || null;
  const siteId=best?.siteId || null;
  const result={generatedAt:new Date().toISOString(), clientId, clientName:pack.clientName, website:pack.website, status:siteId?'PASS':'CONFIG_DISCOVERY_INCOMPLETE', best:best ? {score:best.score, siteId:best.siteId, text:best.text, href:best.href, source:best.source, pageUrl:best.pageUrl} : null, dashboardPostsUrl:siteId ? `https://manage.wix.com/dashboard/${siteId}/blog/posts` : null, candidates:ranked.slice(0,25).map(c=>({score:c.score,siteId:c.siteId,text:c.text,href:c.href,source:c.source,pageUrl:c.pageUrl}))};
  const out=opts.out || receiptPath(clientId, `site-discovery-${new Date().toISOString().replace(/[:.]/g,'-')}.json`);
  writeJson(out,result);
  return {out,result};
}
function applyDiscoveredConfig(clientId, discoveryFile){
  const discovery=JSON.parse(fs.readFileSync(discoveryFile,'utf8'));
  if(!discovery.best?.siteId) throw new Error('DISCOVERY_HAS_NO_SITE_ID');
  const p=path.join(CLIENT_ROOT, clientId, 'client-pack.json');
  const pack=JSON.parse(fs.readFileSync(p,'utf8'));
  pack.wix = pack.wix || {};
  pack.wix.status='CONFIGURED';
  pack.wix.siteId=discovery.best.siteId;
  pack.wix.dashboardPostsUrl=discovery.dashboardPostsUrl;
  pack.wix.baseUrl=pack.wix.baseUrl || pack.website;
  pack.wix.configuredAt=new Date().toISOString();
  pack.wix.configEvidence=discoveryFile;
  fs.writeFileSync(p, JSON.stringify(pack,null,2)+'\n');
  return {clientPack:p, siteId:pack.wix.siteId, dashboardPostsUrl:pack.wix.dashboardPostsUrl};
}
module.exports = { discoverSiteConfig, applyDiscoveredConfig };
