// Pure validation + business rules for session plans (no I/O) -> easy to unit test.
export const LIMITS = { title: [3, 80], goal: [10, 240], maxSteps: 12, stepMinutes: [1, 60], sessionMinutes: 90, text: 400 };
const UUID = /^[A-Za-z0-9_-]{8,64}$/;
const s = (v) => (typeof v === 'string' ? v.trim() : '');
const err = (field, code, message) => ({ field, code, message });

/** Normalise raw client input into a plan object (never trusts types). */
export function normalisePlan(raw = {}) {
  const steps = Array.isArray(raw.steps) ? raw.steps : [];
  return {
    id: s(raw.id), title: s(raw.title), learningGoal: s(raw.learningGoal), activityId: raw.activityId ? s(raw.activityId) : null,
    materials: s(raw.materials), safety: s(raw.safety), inclusion: s(raw.inclusion),
    steps: steps.map((x) => ({ instruction: s(x && x.instruction), minutes: x && x.minutes === '' ? NaN : Number(x && x.minutes) })),
  };
}

/** A draft only needs a valid title (FR-04: never lose unfinished work). 'ready' needs the full safe, inclusive plan (FR-03). */
export function validatePlan(raw) {
  const p = normalisePlan(raw), errors = [];
  if (!UUID.test(p.id)) errors.push(err('id', 'BAD_ID', 'Plan id is missing or invalid.'));
  if (!p.title) errors.push(err('title', 'TITLE_REQUIRED', 'Please enter a title.'));
  else if (p.title.length < LIMITS.title[0] || p.title.length > LIMITS.title[1]) errors.push(err('title', 'TITLE_LENGTH', `Title must be ${LIMITS.title[0]}-${LIMITS.title[1]} characters.`));
  if (p.learningGoal && (p.learningGoal.length < LIMITS.goal[0] || p.learningGoal.length > LIMITS.goal[1])) errors.push(err('learningGoal', 'GOAL_LENGTH', `Learning goal must be ${LIMITS.goal[0]}-${LIMITS.goal[1]} characters.`));
  for (const f of ['materials', 'safety', 'inclusion']) if (p[f].length > LIMITS.text) errors.push(err(f, 'TEXT_TOO_LONG', `Keep this under ${LIMITS.text} characters.`));
  if (p.steps.length > LIMITS.maxSteps) errors.push(err('steps', 'TOO_MANY_STEPS', `Use at most ${LIMITS.maxSteps} steps.`));
  let total = 0;
  p.steps.forEach((st, i) => {
    if (!st.instruction) errors.push(err(`steps[${i}].instruction`, 'STEP_EMPTY', `Step ${i + 1} needs an instruction.`));
    if (!Number.isInteger(st.minutes) || st.minutes < LIMITS.stepMinutes[0] || st.minutes > LIMITS.stepMinutes[1]) errors.push(err(`steps[${i}].minutes`, 'STEP_MINUTES', `Step ${i + 1}: enter whole minutes from ${LIMITS.stepMinutes[0]} to ${LIMITS.stepMinutes[1]}.`));
    else total += st.minutes;
  });
  if (total > LIMITS.sessionMinutes) errors.push(err('steps', 'OVER_TIME', `Steps add up to ${total} min; a session is at most ${LIMITS.sessionMinutes} min.`));
  const missing = [];
  if (!p.learningGoal) missing.push('learning goal');
  if (!p.steps.length) missing.push('at least one step');
  if (!p.materials) missing.push('materials');
  if (!p.safety) missing.push('safety note');
  if (!p.inclusion) missing.push('inclusion note');
  return { ok: errors.length === 0, errors, plan: p, totalMinutes: total, status: missing.length === 0 && errors.length === 0 ? 'ready' : 'draft', missing };
}
