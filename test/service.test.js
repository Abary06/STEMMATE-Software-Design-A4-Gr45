import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store } from '../src/service.js';

const coach = { login: 'Mr.Coach', role: 'facilitator' };
const plan = (o = {}) => ({ id: 'plan-aaaa1111', title: 'Sprint timing', learningGoal: 'Time 20 m sprints and calculate speed', materials: 'Stopwatch', safety: 'Warm up', inclusion: 'Timers seated', steps: [{ instruction: 'Time', minutes: 15 }], ...o });
const mk = () => { const s = new Store(); s.addUser('Mr.Coach', 'facilitator', '123456'); s.addUser('Admin.Local', 'admin', '654321'); return s; };

test('IT-01 [FR-01] activity discovery filters by text, topic, time and equipment', () => {
  const s = mk();
  assert.ok(s.listActivities().length >= 6);
  assert.deepEqual(s.listActivities({ q: 'sprint' }).map((a) => a.id), ['act-sprint-speed']);
  assert.ok(s.listActivities({ topic: 'Data' }).every((a) => a.topic === 'Data'));
  assert.ok(s.listActivities({ maxMinutes: 35 }).every((a) => a.minutes <= 35));
  assert.ok(s.listActivities({ equipment: 'none' }).every((a) => a.equipment === 'none'));
  assert.deepEqual(s.listActivities({ q: 'zzzz' }), []);
});
test('IT-02 [FR-01,FR-03] every library activity includes steps, timing, safety and inclusion', () => {
  for (const a of mk().listActivities()) { assert.ok(a.steps.length > 0 && a.safety && a.inclusion && a.materials, a.id); assert.equal(a.steps.reduce((n, x) => n + x.minutes, 0), a.minutes, a.id); }
});
test('IT-03 [FR-01,FR-03] adapting an activity yields a valid editable draft carrying safety + inclusion', () => {
  const s = mk(); const d = s.planFromActivity('act-sprint-speed', 'plan-new00001');
  assert.equal(d.activityId, 'act-sprint-speed'); assert.ok(d.safety && d.inclusion);
  const r = s.savePlan(coach, d, 0); assert.equal(r.ok, true); assert.equal(r.plan.status, 'draft'); // learning goal still missing
});
test('IT-04 [FR-03] saving persists plan, steps, status and version', () => {
  const s = mk(); const r = s.savePlan(coach, plan(), 0);
  assert.equal(r.ok, true); assert.equal(r.plan.version, 1); assert.equal(r.plan.status, 'ready'); assert.equal(s.getPlan('plan-aaaa1111').steps.length, 1);
});
test('IT-05 [FR-03] invalid plan writes nothing', () => {
  const s = mk(); const r = s.savePlan(coach, plan({ title: '' }), 0); assert.equal(r.ok, false); assert.equal(s.listPlans().length, 0);
});
test('IT-06 [FR-05] stale baseVersion is a CONFLICT and does not overwrite', () => {
  const s = mk(); s.savePlan(coach, plan(), 0); s.savePlan(coach, plan({ title: 'Edited A' }), 1);
  const r = s.savePlan(coach, plan({ title: 'Edited B' }), 1);
  assert.equal(r.code, 'CONFLICT'); assert.equal(s.getPlan('plan-aaaa1111').title, 'Edited A');
});
test('IT-07 [FR-05] sync replay with same opId is idempotent (retry after dropped reply)', () => {
  const s = mk(); const op = { opId: 'op-1', plan: plan(), baseVersion: 0 };
  const a = s.applySync(coach, [op])[0], b = s.applySync(coach, [op])[0];
  assert.equal(a.ok, true); assert.equal(b.replayed, true); assert.equal(s.getPlan('plan-aaaa1111').version, 1);
});
test('IT-08 [FR-05] one bad operation does not block the others in a batch', () => {
  const s = mk(); const res = s.applySync(coach, [{ opId: 'o1', plan: plan({ title: '' }), baseVersion: 0 }, { opId: 'o2', plan: plan({ id: 'plan-bbbb2222' }), baseVersion: 0 }]);
  assert.deepEqual(res.map((r) => r.ok), [false, true]);
});
test('IT-09 [FR-04] data survives closing and reopening the database file', () => {
  const dir = mkdtempSync(join(tmpdir(), 'stm-')), f = join(dir, 't.db');
  try { const a = new Store(f); a.savePlan(coach, plan(), 0); a.close(); const b = new Store(f); assert.equal(b.getPlan('plan-aaaa1111').title, 'Sprint timing'); b.close(); } finally { rmSync(dir, { recursive: true, force: true }); }
});
test('IT-10 [QR-04] PINs are stored hashed and wrong PIN is refused', () => {
  const s = mk(); assert.equal(s.authenticate('Mr.Coach', '000000'), null); assert.equal(s.authenticate('nobody', '123456'), null);
  assert.equal(s.authenticate('Mr.Coach', '123456').role, 'facilitator');
  assert.ok(!JSON.stringify(s.db.prepare('SELECT * FROM users').all().map((u) => Buffer.from(u.pin_hash).toString())).includes('123456'));
});
test('IT-11 [QR-03] export contains plans and activities but no learner names or PINs', () => {
  const s = mk(); s.savePlan(coach, plan(), 0); const j = JSON.stringify(s.exportAll());
  assert.ok(j.includes('plan-aaaa1111')); assert.ok(!/pin_hash|salt|123456/.test(j));
});
test('FT-01 [FR-05] storage failure is reported as STORAGE and rolls back (no half-saved plan)', () => {
  const s = mk(); s.db.exec('DROP TABLE plan_steps'); const r = s.savePlan(coach, plan(), 0);
  assert.equal(r.code, 'STORAGE'); assert.equal(s.db.prepare('SELECT COUNT(*) c FROM plans').get().c, 0);
});
