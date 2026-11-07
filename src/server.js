import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join, normalize } from 'node:path';
import { Store } from './service.js';

const PUB = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };

export function createApp(store) {
  const sessions = new Map();
  const send = (res, code, body) => { res.writeHead(code, { 'content-type': 'application/json', 'cache-control': 'no-store' }); res.end(JSON.stringify(body)); };
  const body = (req) => new Promise((ok, no) => { let d = ''; req.on('data', (c) => { d += c; if (d.length > 262144) { no(new Error('TOO_BIG')); req.destroy(); } }); req.on('end', () => { try { ok(d ? JSON.parse(d) : {}); } catch { no(new Error('BAD_JSON')); } }); });
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x'), path = url.pathname;
    try {
      if (path === '/api/health') return send(res, 200, { ok: true });
      if (path === '/api/login' && req.method === 'POST') {
        const b = await body(req), u = store.authenticate(b.loginName, b.pin);
        if (!u) return send(res, 401, { error: 'BAD_LOGIN', message: 'Login name or PIN is not right.' });
        const token = randomBytes(24).toString('hex'); sessions.set(token, u); return send(res, 200, { token, user: u });
      }
      if (path.startsWith('/api/')) {
        const user = sessions.get((req.headers.authorization || '').replace('Bearer ', ''));
        if (!user) return send(res, 401, { error: 'UNAUTHENTICATED', message: 'Please sign in.' });
        if (path === '/api/activities' && req.method === 'GET') return send(res, 200, store.listActivities(Object.fromEntries(url.searchParams)));
        let m;
        if ((m = path.match(/^\/api\/activities\/([\w-]+)\/plan-draft$/)) && req.method === 'GET') { const d = store.planFromActivity(m[1]); return d ? send(res, 200, d) : send(res, 404, { error: 'NOT_FOUND' }); }
        if (path === '/api/plans' && req.method === 'GET') return send(res, 200, store.listPlans());
        if ((m = path.match(/^\/api\/plans\/([\w-]+)$/)) && req.method === 'PUT') {
          const b = await body(req); const r = store.savePlan(user, { ...b.plan, id: m[1] }, b.baseVersion);
          return send(res, r.ok ? 200 : r.code === 'CONFLICT' ? 409 : r.code === 'STORAGE' ? 500 : 422, r);
        }
        if (path === '/api/sync' && req.method === 'POST') { const b = await body(req); return send(res, 200, { results: store.applySync(user, b.ops) }); }
        if (path === '/api/export' && req.method === 'GET') return user.role === 'admin' ? send(res, 200, store.exportAll()) : send(res, 403, { error: 'FORBIDDEN', message: 'Only a local administrator can export data.' });
        return send(res, 404, { error: 'NOT_FOUND' });
      }
      const file = normalize(path === '/' ? '/index.html' : path).replace(/^(\.\.[/\\])+/, '');
      const ext = file.slice(file.lastIndexOf('.'));
      try { const data = await readFile(join(PUB, file)); res.writeHead(200, { 'content-type': MIME[ext] || 'application/octet-stream' }); return res.end(data); } catch { return send(res, 404, { error: 'NOT_FOUND' }); }
    } catch (e) { return send(res, e.message === 'BAD_JSON' ? 400 : e.message === 'TOO_BIG' ? 413 : 500, { error: e.message === 'BAD_JSON' ? 'BAD_JSON' : 'SERVER_ERROR', message: 'Request could not be processed.' }); }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const store = new Store(process.env.STEMMATE_DB || 'stemmate.db');
  store.addUser('Mr.Coach', 'facilitator', process.env.COACH_PIN || '123456');   // synthetic demo account; set COACH_PIN to change
  store.addUser('Admin.Local', 'admin', process.env.ADMIN_PIN || '654321');      // local administrator (export / decommission)
  const port = Number(process.env.PORT || 3000);
  createApp(store).listen(port, () => console.log(`STEMMate v2.0 running on http://localhost:${port}`));
}
