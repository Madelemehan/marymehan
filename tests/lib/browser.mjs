// Minimal headless-Chrome driver over the DevTools protocol, so the tests need no npm packages.
// Uses an installed Chrome/Chromium (set CHROME_PATH to override). All non-local network
// requests are blocked, so tests never hit PayPal or Google Analytics.
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CANDIDATES = [
  process.env.CHROME_PATH,
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/snap/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
];

export function findChrome() {
  return CANDIDATES.find(p => p && existsSync(p)) || null;
}

export async function launchBrowser(chromePath = findChrome()) {
  if (!chromePath) throw new Error('No Chrome/Chromium found; set CHROME_PATH');
  const profile = mkdtempSync(join(tmpdir(), 'mm-test-chrome-'));
  const proc = spawn(chromePath, [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--disable-extensions', '--mute-audio', `--user-data-dir=${profile}`, '--remote-debugging-port=0',
    '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost, EXCLUDE 127.0.0.1',
    'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] });

  const wsUrl = await new Promise((resolve, reject) => {
    let buf = '';
    const timer = setTimeout(() => reject(new Error('Chrome did not start within 20s')), 20000);
    proc.stderr.on('data', d => {
      buf += d;
      const m = buf.match(/DevTools listening on (ws:\/\/\S+)/);
      if (m) { clearTimeout(timer); resolve(m[1]); }
    });
    proc.on('exit', code => { clearTimeout(timer); reject(new Error(`Chrome exited (${code}): ${buf.slice(-500)}`)); });
  });

  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  let nextId = 0;
  const pending = new Map();
  const listeners = new Set();
  ws.onmessage = e => {
    const msg = JSON.parse(e.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
    } else {
      listeners.forEach(fn => fn(msg));
    }
  };
  const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params, sessionId }));
  });

  return {
    // Each page gets its own profile (fresh localStorage); navigations within a page share it.
    async newPage({ width = 1280, height = 900 } = {}) {
      const { browserContextId } = await send('Target.createBrowserContext');
      const { targetId } = await send('Target.createTarget', { url: 'about:blank', browserContextId });
      const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
      const errors = [];   // uncaught exceptions + console.error + failed local loads
      const waiters = new Set();
      const onMsg = msg => {
        if (msg.sessionId !== sessionId) return;
        const p = msg.params;
        if (msg.method === 'Runtime.exceptionThrown') {
          errors.push('uncaught: ' + (p.exceptionDetails.exception?.description || p.exceptionDetails.text));
        } else if (msg.method === 'Runtime.consoleAPICalled' && p.type === 'error') {
          errors.push('console.error: ' + p.args.map(a => a.value ?? a.description ?? '').join(' '));
        } else if (msg.method === 'Log.entryAdded' && p.entry.level === 'error') {
          const url = p.entry.url || '';
          const local = url.startsWith('file:') || /^https?:\/\/(localhost|127\.0\.0\.1)[:/]/.test(url);
          // the site has no favicon, and external requests are blocked on purpose
          if (local && !url.endsWith('/favicon.ico')) errors.push('load: ' + p.entry.text + ' ' + url);
        }
        waiters.forEach(w => w(msg));
      };
      listeners.add(onMsg);
      await send('Runtime.enable', {}, sessionId);
      await send('Log.enable', {}, sessionId);
      await send('Page.enable', {}, sessionId);
      await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 600 }, sessionId);

      const evaluate = async (fn, ...args) => {
        const expression = `(${fn})(...${JSON.stringify(args)})`;
        const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, sessionId);
        if (r.exceptionDetails) throw new Error('evaluate failed: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
        return r.result.value;
      };

      const page = {
        errors,
        evaluate,
        async goto(url) {
          const loaded = new Promise(resolve => {
            const w = msg => { if (msg.method === 'Page.loadEventFired') { waiters.delete(w); resolve(); } };
            waiters.add(w);
          });
          await send('Page.navigate', { url }, sessionId);
          await loaded;
        },
        // Wait until main.js has rendered the page (<html data-mm-state="ready|error">)
        async gotoAndRender(url, timeout = 8000) {
          await page.goto(url);
          return page.waitFor(() => document.documentElement.dataset.mmState, timeout);
        },
        async waitFor(fn, timeout = 5000) {
          const end = Date.now() + timeout;
          for (;;) {
            const v = await evaluate(fn).catch(() => null);
            if (v) return v;
            if (Date.now() > end) throw new Error('timed out waiting for ' + fn.toString().slice(0, 120));
            await new Promise(r => setTimeout(r, 50));
          }
        },
        click: selector => evaluate(s => {
          const el = document.querySelector(s);
          if (!el) throw new Error('no element ' + s);
          el.click();
          return true;
        }, selector),
        async close() {
          listeners.delete(onMsg);
          await send('Target.disposeBrowserContext', { browserContextId }).catch(() => {});
        },
      };
      return page;
    },
    async close() {
      await send('Browser.close').catch(() => {});
      ws.close();
      proc.kill();
      rmSync(profile, { recursive: true, force: true });
    },
  };
}
