const { getPageAndHeaders, wixHeaders } = require('../auth/browserHeaders');
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
function classifyWixFailure(status, text=''){
  if(status===401||status===403) return 'AUTH_REQUIRED_OR_FORBIDDEN';
  if(status===404) return 'NOT_FOUND_OR_WRONG_SITE';
  if(status===400 && /validationError|fieldViolations|UnrecognizedEnumValidator|enum must be/i.test(text)) return 'WIX_VALIDATION_ERROR';
  if(status===409) return 'CONFLICT_RETRY_OR_DUPLICATE';
  if(status===429) return 'RATE_LIMITED';
  if(status>=500) return 'WIX_SERVER_ERROR';
  if(/csrf|xsrf/i.test(text)) return 'AUTH_CSRF_EXPIRED';
  if(/rate limit|too many requests/i.test(text)) return 'RATE_LIMITED';
  return 'WIX_API_ERROR';
}
function retryable(status, text=''){ return status===429 || status>=500 || /temporar|timeout|rate|too many/i.test(text); }
class WixClient {
  constructor(page, headers, browser, siteConfig = {}) { this.page = page; this.headers = headers; this.browser = browser; this.siteConfig = siteConfig; }
  static async fromBrowser(siteConfig = {}) { const { browser, page, headers } = await getPageAndHeaders(siteConfig); return new WixClient(page, headers, browser, siteConfig); }
  async close() { if (this.browser) await this.browser.close().catch(() => {}); }
  async request(path, opts = {}) {
    const maxAttempts = opts.maxAttempts || 3;
    const baseDelayMs = opts.baseDelayMs || 900;
    const cleanOpts = { ...opts }; delete cleanOpts.maxAttempts; delete cleanOpts.baseDelayMs;
    const run = () => this.page.evaluate(async ({ path, opts, headers }) => {
      const res = await fetch(path, {
        ...opts,
        headers: { ...headers, ...(opts.headers || {}) },
        credentials: 'include',
      });
      const text = await res.text();
      let json = null;
      try { json = JSON.parse(text); } catch {}
      return { status: res.status, ok: res.ok, text, json, retryAfter: res.headers.get('retry-after') };
    }, { path, opts: { ...cleanOpts, headers: wixHeaders(this.headers, cleanOpts.headers || {}) }, headers: wixHeaders(this.headers) });
    let last;
    for(let attempt=1; attempt<=maxAttempts; attempt++){
      try { last = await run(); }
      catch (err) {
        if (!String(err.message || err).includes('Execution context was destroyed') || attempt===maxAttempts) throw err;
        await this.page.waitForLoadState('domcontentloaded').catch(() => {});
        await this.page.waitForTimeout(1500).catch(() => {});
        continue;
      }
      if(last.ok) return last.json ?? JSON.parse(last.text || '{}');
      if(attempt >= maxAttempts || !retryable(last.status,last.text)) break;
      const retryAfter = Number(last.retryAfter || 0);
      await sleep((retryAfter ? retryAfter*1000 : baseDelayMs*Math.pow(2,attempt-1)) + Math.floor(Math.random()*250));
    }
    const failureClass = classifyWixFailure(last.status,last.text);
    const err = new Error(`${failureClass} WIX_API_${last.status}: ${path}: ${String(last.text||'').slice(0, 600)}`);
    err.result = last; err.failureClass = failureClass;
    throw err;
  }
}
module.exports = { WixClient, classifyWixFailure };
