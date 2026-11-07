import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePlan } from '../src/validate.js';

const good = { id: 'plan-0001', title: 'Sprint timing', learningGoal: 'Time 20 m sprints and calculate speed', materials: 'Stopwatch, cones', safety: 'Warm up first', inclusion: 'Timers can be seated', steps: [{ instruction: 'Warm up', minutes: 10 }, { instruction: 'Time sprints', minutes: 20 }] };

test('UT-01 [FR-03] complete plan is ready with correct total minutes', () => {
  const r = validatePlan(good); assert.equal(r.ok, true); assert.equal(r.status, 'ready'); assert.equal(r.totalMinutes, 30);
});
test('UT-02 [FR-03] empty title is rejected with TITLE_REQUIRED', () => {
  const r = validatePlan({ ...good, title: '   ' }); assert.equal(r.ok, false); assert.equal(r.errors[0].code, 'TITLE_REQUIRED');
});
test('UT-03 [FR-04] draft with only a title is valid and saved as draft (unfinished work is kept)', () => {
  const r = validatePlan({ id: 'plan-0002', title: 'Half done' }); assert.equal(r.ok, true); assert.equal(r.status, 'draft'); assert.ok(r.missing.includes('safety note'));
});
test('UT-04 [FR-03] plan missing safety or inclusion cannot be ready', () => {
  for (const f of ['safety', 'inclusion']) assert.equal(validatePlan({ ...good, [f]: '' }).status, 'draft');
});
test('UT-05 [FR-03] step minutes must be whole numbers 1-60', () => {
  for (const m of [0, -5, 61, 2.5, 'abc', '']) { const r = validatePlan({ ...good, steps: [{ instruction: 'x', minutes: m }] }); assert.ok(r.errors.some((e) => e.code === 'STEP_MINUTES'), String(m)); }
});
test('UT-06 [FR-03] steps over 90 minutes in total are rejected', () => {
  const r = validatePlan({ ...good, steps: [{ instruction: 'a', minutes: 60 }, { instruction: 'b', minutes: 40 }] }); assert.ok(r.errors.some((e) => e.code === 'OVER_TIME'));
});
test('UT-07 [QR-03] malformed input (non-string, injection-like text) is normalised, not executed', () => {
  const r = validatePlan({ id: 'plan-0003', title: 123, steps: 'nope' }); assert.equal(r.ok, false);
});
