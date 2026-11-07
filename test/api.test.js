import test from 'node:test';
import assert from 'node:assert/strict';
import { Store } from '../src/service.js';
import { createApp } from '../src/server.js';

async function boot() {
  const store = new Store(); store.addUser('Mr.Coach', 'facilitator', '123456'); store.addUser('Admin.Local', 'admin', '654321');
  const srv = createApp(store); await new Promise((r) => srv.listen(0, r));
  const base = `http://127.0.0.1:${srv.address().port}`;
  const call = async (path, { method = 'GET', token, body } = {}) => { const r = await fetch(base + path, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined }); return { status: r.status, json: await r.json() }; };
  const login = async (loginName, pin) => (await call('/api/login', { method: 'POST', body: { loginName, pin } })).json.token;
  return { srv, call, login };
}
const plan = { title: 'API plan', learningGoal: 'Learners measure and compare results', materials: 'Tape', safety: 'Clear area', inclusion: 'Pairs', steps: [{ instruction: 'Measure', minutes: 20 }] };

test('E2E-01 [FR-01,FR-03,FR-05] sign in -> discover -> adapt -> save -> list (full slice over HTTP)', async () => {
  const { srv, call, login } = await boot();
  try {
    const t = await login('Mr.Coach', '123456'); assert.ok(t);
    const acts = await call('/api/activities?q=pitch', { token: t }); assert.equal(acts.json[0].id, 'act-pitch-area');
    const draft = (await call('/api/activities/act-pitch-area/plan-draft', { token: t })).json;
    const put = await call(`/api/plans/${draft.id}`, { method: 'PUT', token: t, body: { plan: { ...draft, learningGoal: 'Learners calculate the area of the pitch' }, baseVersion: 0 } });
    assert.equal(put.status, 200); assert.equal(put.json.plan.status, 'ready');
    const list = await call('/api/plans', { token: t }); assert.equal(list.json.length, 1);
  } finally { srv.close(); }
});
test('E2E-02 [QR-04] unauthenticated and bad-login requests are refused', async () => {
  const { srv, call } = await boot();
  try {
    assert.equal((await call('/api/plans')).status, 401);
    assert.equal((await call('/api/login', { method: 'POST', body: { loginName: 'Mr.Coach', pin: 'bad' } })).status, 401);
  } finally { srv.close(); }
});
test('E2E-03 [QR-04] role rule: facilitator cannot export, local admin can', async () => {
  const { srv, call, login } = await boot();
  try {
    assert.equal((await call('/api/export', { token: await login('Mr.Coach', '123456') })).status, 403);
    assert.equal((await call('/api/export', { token: await login('Admin.Local', '654321') })).status, 200);
  } finally { srv.close(); }
});
test('E2E-04 [FR-03] validation errors return 422 with field-level messages', async () => {
  const { srv, call, login } = await boot();
  try {
    const t = await login('Mr.Coach', '123456');
    const r = await call('/api/plans/plan-zzzz9999', { method: 'PUT', token: t, body: { plan: { ...plan, title: '' }, baseVersion: 0 } });
    assert.equal(r.status, 422); assert.equal(r.json.errors[0].field, 'title');
  } finally { srv.close(); }
});
test('E2E-05 [FR-05] stale edit returns 409 with the server copy so the app can offer a safe merge', async () => {
  const { srv, call, login } = await boot();
  try {
    const t = await login('Mr.Coach', '123456'); const p = '/api/plans/plan-conf0001';
    await call(p, { method: 'PUT', token: t, body: { plan, baseVersion: 0 } });
    await call(p, { method: 'PUT', token: t, body: { plan: { ...plan, title: 'Newer' }, baseVersion: 1 } });
    const r = await call(p, { method: 'PUT', token: t, body: { plan: { ...plan, title: 'Stale' }, baseVersion: 1 } });
    assert.equal(r.status, 409); assert.equal(r.json.server.title, 'Newer');
  } finally { srv.close(); }
});
test('E2E-06 [QR-04] malformed JSON gives 400 not a crash', async () => {
  const { srv, login } = await boot();
  try { const t = await login('Mr.Coach', '123456'); const addr = srv.address(); const r = await fetch(`http://127.0.0.1:${addr.port}/api/sync`, { method: 'POST', headers: { authorization: 'Bearer ' + t }, body: '{bad' }); assert.equal(r.status, 400); } finally { srv.close(); }
});
