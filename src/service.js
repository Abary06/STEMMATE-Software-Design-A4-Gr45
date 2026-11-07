import { DatabaseSync } from 'node:sqlite';
import { scryptSync, randomBytes, timingSafeEqual, randomUUID } from 'node:crypto';
import { ACTIVITIES } from './seed.js';
import { validatePlan } from './validate.js';

const hash = (pin, salt) => scryptSync(pin, salt, 32);

export class Store {
  constructor(path = ':memory:') {
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
      CREATE TABLE IF NOT EXISTS users(login TEXT PRIMARY KEY, role TEXT NOT NULL CHECK(role IN('facilitator','admin')), salt BLOB NOT NULL, pin_hash BLOB NOT NULL);
      CREATE TABLE IF NOT EXISTS activities(id TEXT PRIMARY KEY, title TEXT NOT NULL, topic TEXT NOT NULL, minutes INTEGER NOT NULL, equipment TEXT NOT NULL, summary TEXT NOT NULL, materials TEXT NOT NULL, safety TEXT NOT NULL, inclusion TEXT NOT NULL, steps_json TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS plans(id TEXT PRIMARY KEY, title TEXT NOT NULL, learning_goal TEXT NOT NULL DEFAULT '', activity_id TEXT REFERENCES activities(id), materials TEXT NOT NULL DEFAULT '', safety TEXT NOT NULL DEFAULT '', inclusion TEXT NOT NULL DEFAULT '', status TEXT NOT NULL CHECK(status IN('draft','ready')), total_minutes INTEGER NOT NULL DEFAULT 0, version INTEGER NOT NULL, updated_at TEXT NOT NULL, updated_by TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS plan_steps(plan_id TEXT NOT NULL REFERENCES plans(id) ON DELETE CASCADE, position INTEGER NOT NULL, instruction TEXT NOT NULL, minutes INTEGER NOT NULL, PRIMARY KEY(plan_id, position));
      CREATE TABLE IF NOT EXISTS applied_ops(op_id TEXT PRIMARY KEY, result_json TEXT NOT NULL, applied_at TEXT NOT NULL);`);
    this.#seed();
  }
  #seed() {
    if (this.db.prepare('SELECT COUNT(*) c FROM activities').get().c) return;
    const ins = this.db.prepare('INSERT INTO activities VALUES(?,?,?,?,?,?,?,?,?,?)');
    for (const a of ACTIVITIES) ins.run(a.id, a.title, a.topic, a.minutes, a.equipment, a.summary, a.materials, a.safety, a.inclusion, JSON.stringify(a.steps));
  }
  addUser(login, role, pin) { const salt = randomBytes(16); this.db.prepare('INSERT OR REPLACE INTO users VALUES(?,?,?,?)').run(login, role, salt, hash(pin, salt)); }
  authenticate(login, pin) {
    const u = this.db.prepare('SELECT * FROM users WHERE login=?').get(String(login || ''));
    const h = hash(String(pin || ''), u ? u.salt : Buffer.alloc(16));
    return u && timingSafeEqual(h, u.pin_hash) ? { login: u.login, role: u.role } : null;
  }
  #act(r) { return { id: r.id, title: r.title, topic: r.topic, minutes: r.minutes, equipment: r.equipment, summary: r.summary, materials: r.materials, safety: r.safety, inclusion: r.inclusion, steps: JSON.parse(r.steps_json).map(([instruction, minutes]) => ({ instruction, minutes })) }; }
  /** FR-01: discover activities by text, topic, time and equipment level. */
  listActivities({ q = '', topic = '', maxMinutes = 0, equipment = '' } = {}) {
    const needle = String(q).trim().toLowerCase(), max = Number(maxMinutes) || 0;
    return this.db.prepare('SELECT * FROM activities ORDER BY title').all().map((r) => this.#act(r)).filter((a) =>
      (!needle || `${a.title} ${a.summary} ${a.topic}`.toLowerCase().includes(needle)) && (!topic || a.topic === topic) && (!max || a.minutes <= max) && (!equipment || a.equipment === equipment));
  }
  getActivity(id) { const r = this.db.prepare('SELECT * FROM activities WHERE id=?').get(String(id)); return r ? this.#act(r) : null; }
  /** Turn an activity into an editable draft plan, copying steps, timing, safety and inclusion guidance. */
  planFromActivity(id, newId = randomUUID()) {
    const a = this.getActivity(id); if (!a) return null;
    return { id: newId, title: a.title, learningGoal: '', activityId: a.id, materials: a.materials, safety: a.safety, inclusion: a.inclusion, steps: a.steps };
  }
  #plan(r) {
    const steps = this.db.prepare('SELECT instruction, minutes FROM plan_steps WHERE plan_id=? ORDER BY position').all(r.id).map((x) => ({ ...x }));
    return { id: r.id, title: r.title, learningGoal: r.learning_goal, activityId: r.activity_id, materials: r.materials, safety: r.safety, inclusion: r.inclusion, steps, status: r.status, totalMinutes: r.total_minutes, version: r.version, updatedAt: r.updated_at, updatedBy: r.updated_by };
  }
  getPlan(id) { const r = this.db.prepare('SELECT * FROM plans WHERE id=?').get(String(id)); return r ? this.#plan(r) : null; }
  listPlans() { return this.db.prepare('SELECT * FROM plans ORDER BY updated_at DESC').all().map((r) => this.#plan(r)); }

  /** Validate -> optimistic-lock -> persist in one transaction. Returns {ok,...}; never throws for user errors. */
  savePlan(user, raw, baseVersion = 0, now = new Date().toISOString()) {
    const v = validatePlan(raw);
    if (!v.ok) return { ok: false, code: 'VALIDATION', errors: v.errors };
    const p = v.plan, cur = this.getPlan(p.id);
    if (p.activityId && !this.getActivity(p.activityId)) return { ok: false, code: 'VALIDATION', errors: [{ field: 'activityId', code: 'UNKNOWN_ACTIVITY', message: 'Unknown activity.' }] };
    if (cur && cur.version !== Number(baseVersion)) return { ok: false, code: 'CONFLICT', server: cur };
    if (!cur && Number(baseVersion) !== 0) return { ok: false, code: 'CONFLICT', server: null };
    const version = (cur ? cur.version : 0) + 1;
    this.db.exec('BEGIN');
    try {
      this.db.prepare(`INSERT INTO plans VALUES(?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title, learning_goal=excluded.learning_goal, activity_id=excluded.activity_id, materials=excluded.materials, safety=excluded.safety, inclusion=excluded.inclusion, status=excluded.status, total_minutes=excluded.total_minutes, version=excluded.version, updated_at=excluded.updated_at, updated_by=excluded.updated_by`)
        .run(p.id, p.title, p.learningGoal, p.activityId, p.materials, p.safety, p.inclusion, v.status, v.totalMinutes, version, now, user.login);
      this.db.prepare('DELETE FROM plan_steps WHERE plan_id=?').run(p.id);
      const ins = this.db.prepare('INSERT INTO plan_steps VALUES(?,?,?,?)');
      p.steps.forEach((st, i) => ins.run(p.id, i, st.instruction, st.minutes));
      this.db.exec('COMMIT');
    } catch (e) { try { this.db.exec('ROLLBACK'); } catch {} return { ok: false, code: 'STORAGE', message: 'Could not save to the server database. Your plan is still safe on this phone.' }; }
    return { ok: true, plan: this.getPlan(p.id) };
  }
  /** FR-05: idempotent sync. Replaying an opId returns the stored result, so a retry after a dropped reply never duplicates or overwrites. */
  applySync(user, ops, now = new Date().toISOString()) {
    return (Array.isArray(ops) ? ops : []).map((op) => {
      const opId = String((op && op.opId) || '');
      if (!opId) return { opId, ok: false, code: 'VALIDATION', errors: [{ field: 'opId', code: 'OP_ID', message: 'Missing opId.' }] };
      const seen = this.db.prepare('SELECT result_json FROM applied_ops WHERE op_id=?').get(opId);
      if (seen) return { ...JSON.parse(seen.result_json), replayed: true };
      const res = { opId, ...this.savePlan(user, op.plan, op.baseVersion, now) };
      if (res.ok || res.code === 'VALIDATION' || res.code === 'CONFLICT') this.db.prepare('INSERT INTO applied_ops VALUES(?,?,?)').run(opId, JSON.stringify(res), now);
      return res;
    });
  }
  /** Backup / decommissioning (admin): full JSON export; contains no personal learner data by design. */
  exportAll() { return { exportedAt: new Date().toISOString(), schema: 2, activities: this.listActivities(), plans: this.listPlans() }; }
  close() { this.db.close(); }
}
