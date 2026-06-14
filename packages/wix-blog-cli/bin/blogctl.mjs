#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const CLIENTS = path.join(ROOT, 'clients');

function readJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
function writeFile(p, s) { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s); }
function arg(name, fallback=null) { const i=process.argv.indexOf(name); return i>=0 ? process.argv[i+1] : fallback; }
function slug(s) { return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9а-я]+/gi,'-').replace(/^-|-$/g,'').slice(0,80); }
function weekNow() {
  const d = new Date();
  const onejan = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  const week = Math.ceil((((d - onejan) / 86400000) + onejan.getUTCDay()+1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2,'0')}`;
}
function listClients() {
  const rows = fs.readdirSync(CLIENTS, { withFileTypes:true }).filter(d=>d.isDirectory()).map(d=>d.name);
  for (const id of rows) {
    const p = path.join(CLIENTS, id, 'client-pack.json');
    if (!fs.existsSync(p)) continue;
    const c = readJson(p);
    console.log(`${c.clientId}\t${c.clientName}\t${c.niche}`);
  }
}
function validatePack(id) {
  const packPath = path.join(CLIENTS, id, 'client-pack.json');
  const ledgerPath = path.join(CLIENTS, id, 'article-ledger.json');
  const bankPath = path.join(CLIENTS, id, 'topic-bank.json');
  const schema = readJson(path.join(ROOT, 'schemas', 'client-pack.schema.json'));
  const errors=[];
  if (!fs.existsSync(packPath)) errors.push(`missing client-pack.json for ${id}`);
  if (!fs.existsSync(ledgerPath)) errors.push(`missing article-ledger.json for ${id}`);
  if (!fs.existsSync(bankPath)) errors.push(`missing topic-bank.json for ${id}`);
  if (!errors.length) {
    const c=readJson(packPath);
    for (const k of schema.required) if (!(k in c)) errors.push(`client-pack missing ${k}`);
    const ledger=readJson(ledgerPath);
    const urls=new Set();
    for (const a of ledger.articles || []) {
      if (!a.title || !a.lang || !a.status) errors.push(`ledger incomplete row ${JSON.stringify(a)}`);
      if (a.url && urls.has(a.url)) errors.push(`duplicate URL ${a.url}`);
      if (a.url) urls.add(a.url);
    }
  }
  if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
  console.log(`PASS validate-pack ${id}`);
}
function planWeek(id, week) {
  const c=readJson(path.join(CLIENTS, id, 'client-pack.json'));
  const ledger=readJson(path.join(CLIENTS, id, 'article-ledger.json'));
  const bank=readJson(path.join(CLIENTS, id, 'topic-bank.json'));
  const usedText = new Set((ledger.articles||[]).map(a => `${a.title} ${a.primaryKeyword || ''}`.toLowerCase()));
  const chosen=[];
  const lanesWanted=['owner','operations','market'];
  for (const lane of lanesWanted) {
    const candidate = bank.topics.find(t => t.lane===lane && ![...usedText].some(u => u.includes(t.bgTitle.toLowerCase().slice(0,24)) || u.includes((t.keywordsBg?.[0]||'').toLowerCase())));
    if (candidate) chosen.push(candidate);
  }
  for (const t of bank.topics) if (chosen.length < (c.weeklyArticleCount || 3) && !chosen.find(x=>x.id===t.id)) chosen.push(t);
  const runDir = path.join(ROOT, 'runs', `${week}-${id}`);
  fs.mkdirSync(runDir, { recursive:true });
  const plan = { generatedAt:new Date().toISOString(), clientId:id, clientName:c.clientName, week, status:'topic-plan-generated', publishingGate:c.publishingGate, sourceLimitations:['This deterministic plan uses client topic bank. Add fresh web/search/source snippets before final drafting when available.'], topics: chosen.slice(0, c.weeklyArticleCount || 3).map((t,i)=>({ articleNumber:i+1, ...t })) };
  writeFile(path.join(runDir, 'topic-plan.json'), JSON.stringify(plan,null,2)+'\n');
  let md = `# Weekly Topic Plan — ${c.clientName} — ${week}\n\nStatus: Topic plan generated. Drafting/publishing requires approval or next workflow step.\n\nPublishing gate: ${c.publishingGate}\n\n`;
  for (const t of plan.topics) {
    md += `## ${t.articleNumber}. ${t.bgTitle}\n\n- EN: ${t.enTitle}\n- Lane: ${t.lane}\n- Intent: ${t.intent}\n- BG keywords: ${t.keywordsBg.join(', ')}\n- EN keywords: ${t.keywordsEn.join(', ')}\n- Why useful: ${t.whyUseful}\n\n`;
  }
  md += `## Next low-token step\n\nPaste this plan + client pack summary into the topic/outline prompt only after adding any fresh weekly source snippets.\n`;
  writeFile(path.join(runDir, 'TOPIC-PLAN.md'), md);
  for (const t of plan.topics) {
    const pkg = `# Article Package — ${c.clientName} — ${week} — ${t.articleNumber}\n\n## Status\n- Client: ${c.clientName}\n- Client ID: ${id}\n- Week: ${week}\n- Status: Topic Selected / Awaiting Draft\n- Publishing gate: ${c.publishingGate}\n\n## Strategic intent\n- Audience: ${c.audiences[0]}\n- Search intent: ${t.intent}\n- Funnel role: informational trust-building with soft service CTA\n- Why now: ${t.whyUseful}\n\n## Bulgarian package\n- Title: ${t.bgTitle}\n- Slug: ${slug(t.bgTitle)}\n- SEO title: ${t.bgTitle} | ${c.clientName}\n- Meta description: TODO during outline/draft step\n- Focus keywords: ${t.keywordsBg.join(', ')}\n- Excerpt: TODO\n\n## English package\n- Title: ${t.enTitle}\n- Slug: ${slug(t.enTitle)}\n- SEO title: ${t.enTitle} | ${c.clientName}\n- Meta description: TODO during outline/draft step\n- Focus keywords: ${t.keywordsEn.join(', ')}\n- Excerpt: TODO\n\n## Outline\nTODO with low-token outline prompt.\n\n## Draft body\n### BG\nTODO\n\n### EN\nTODO\n\n## Internal links\n${c.internalLinks.slice(0,3).map(l=>`- ${l.url} — ${l.label} (${l.useFor})`).join('\n')}\n\n## Image plan\n- Featured image: TODO\n- Supporting image 1: TODO\n- Supporting image 2: TODO\n\n## Sources / evidence\n- Source checked: TODO fresh weekly source snippets\n- Key fact supported: TODO\n- Limitation/blocker: ${plan.sourceLimitations[0]}\n\n## QA checklist\n- [ ] Client/niche correct.\n- [ ] No wrong-client references.\n- [ ] Search intent clear.\n- [ ] Humanized intro, no generic filler.\n- [ ] BG-first if Bulgarian client.\n- [ ] EN equivalent prepared if required.\n- [ ] SEO metadata complete.\n- [ ] Internal links included.\n- [ ] Image brief and alt text included.\n- [ ] Claims source-grounded.\n- [ ] Publishing approval status clear.\n`;
    writeFile(path.join(runDir, `article-${String(t.articleNumber).padStart(2,'0')}-${t.id}.md`), pkg);
  }
  console.log(`PASS plan-week ${id} ${week}`);
  console.log(runDir);
}
const cmd=process.argv[2];
if (!cmd || ['-h','--help'].includes(cmd)) {
  console.log('Usage: blogctl.mjs list-clients | validate-pack --client <id> | plan-week --client <id> [--week YYYY-Www]');
  process.exit(0);
}
if (cmd==='list-clients') listClients();
else if (cmd==='validate-pack') validatePack(arg('--client'));
else if (cmd==='plan-week') planWeek(arg('--client'), arg('--week', weekNow()));
else { console.error(`unknown command ${cmd}`); process.exit(1); }
