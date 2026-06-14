export class CdpClient {
  constructor({ cdpUrl, timeoutMs = 8000 } = {}) {
    this.cdpUrl = cdpUrl;
    this.timeoutMs = timeoutMs;
    this.ws = null;
    this.nextId = 1;
    this.pending = new Map();
  }

  async connect() {
    if (!this.cdpUrl) throw new Error('Missing --cdp-url. Start Chrome with --remote-debugging-port=9222 or provide a page WebSocket URL.');
    if (typeof WebSocket === 'undefined') throw new Error('This Node runtime does not expose WebSocket globally. Use Node 22+ or add a small ws dependency later.');
    this.ws = new WebSocket(this.cdpUrl);
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Timed out connecting to CDP after ${this.timeoutMs}ms`)), this.timeoutMs);
      this.ws.addEventListener('open', () => { clearTimeout(timer); resolve(); }, { once: true });
      this.ws.addEventListener('error', (event) => { clearTimeout(timer); reject(new Error(`CDP WebSocket error: ${event.message || 'unknown'}`)); }, { once: true });
      this.ws.addEventListener('message', (event) => this.#onMessage(event));
    });
  }

  #onMessage(event) {
    let message;
    try { message = JSON.parse(event.data); } catch { return; }
    if (message.id && this.pending.has(message.id)) {
      const { resolve, reject, timer } = this.pending.get(message.id);
      clearTimeout(timer);
      this.pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message || JSON.stringify(message.error)));
      else resolve(message.result);
    }
  }

  async send(method, params = {}) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) throw new Error('CDP client is not connected.');
    const id = this.nextId++;
    const payload = JSON.stringify({ id, method, params });
    const result = new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`CDP command timed out: ${method}`));
      }, this.timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
    });
    this.ws.send(payload);
    return result;
  }

  async evaluate(expression, awaitPromise = true) {
    return this.send('Runtime.evaluate', { expression, awaitPromise, returnByValue: true });
  }

  async close() {
    if (this.ws) this.ws.close();
  }
}

export async function discoverPagesFromPort(port = 9222, host = '127.0.0.1') {
  const res = await fetch(`http://${host}:${port}/json`);
  if (!res.ok) throw new Error(`Chrome discovery failed: HTTP ${res.status}`);
  return res.json();
}
