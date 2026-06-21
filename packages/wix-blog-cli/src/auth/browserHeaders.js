const config = require('../config');

function getChromium(){ return require('playwright').chromium; }

async function getPageAndHeaders(siteOverride = {}) {
  const chromium = getChromium();
  const effectiveSite = { ...config.site, ...(siteOverride.site || siteOverride) };
  const cdpUrl = siteOverride.cdpUrl || config.cdpUrl;
  const browser = await chromium.connectOverCDP(cdpUrl);
  const ctx = browser.contexts()[0] || await browser.newContext();
  let page = ctx.pages().find(p => p.url().includes('manage.wix.com') && (!effectiveSite.siteId || p.url().includes(effectiveSite.siteId))) || ctx.pages().find(p => p.url().includes('manage.wix.com')) || await ctx.newPage();
  let captured;
  page.on('request', req => {
    const u = req.url();
    const h = req.headers();
    const isWixDashboard = u.includes('manage.wix.com') || u.includes('wix.com/_api') || u.includes('communities-blog-node-api');
    const isBlogApi = u.includes('/v3/posts/query') || u.includes('/v3/draft-posts/') || u.includes('/communities-blog-node-api/');
    if (!captured && isWixDashboard && (isBlogApi || (h.authorization && h['x-xsrf-token']))) {
      captured = h;
    }
  });
  if (effectiveSite.dashboardPostsUrl && (!page.url().includes(effectiveSite.siteId || 'manage.wix.com') || !page.url().includes('/blog/posts'))) {
    await page.goto(effectiveSite.dashboardPostsUrl, { waitUntil: 'domcontentloaded' }).catch(() => {});
  }
  // Avoid forced reloads when the dashboard is already open: the later API
  // calls run inside this page, and a reload racing with page.evaluate can
  // destroy the execution context. Navigate/reload only when needed to capture
  // fresh Wix auth headers.
  if (!captured) await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await page.waitForTimeout(1000).catch(() => {});
  for (let i = 0; i < 150 && !captured; i++) await page.waitForTimeout(200);
  if (!captured) {
    await browser.close().catch(() => {});
    throw new Error('WIX_AUTH_HEADERS_NOT_CAPTURED: open/login to Wix dashboard in OpenClaw browser, then retry');
  }
  return { browser, page, headers: captured };
}

function wixHeaders(headers, extra = {}) {
  return {
    'content-type': 'application/json',
    authorization: headers.authorization,
    'x-xsrf-token': headers['x-xsrf-token'],
    'x-wix-client-artifact-id': 'communities-blog-bm',
    'x-wix-brand': 'wix',
    ...extra,
  };
}

module.exports = { getPageAndHeaders, wixHeaders };
