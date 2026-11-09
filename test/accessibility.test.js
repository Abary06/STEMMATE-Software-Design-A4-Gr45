
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(
  new URL('../public/index.html', import.meta.url),
  'utf8'
);

test('ACCESS-01: page provides a screen-reader status region', () => {
  assert.match(html, /role="status"/);
  assert.match(html, /aria-live="polite"/);
});

test('ACCESS-02: main navigation has an accessible label', () => {
  assert.match(html, /<nav[^>]*aria-label="Main"/);
});

test('ACCESS-03: login fields have associated labels', () => {
  assert.match(html, /<label for="ln">Login name<\/label>/);
  assert.match(html, /<label for="pin">PIN<\/label>/);
});

test('ACCESS-04: activity search and filters have labels', () => {
  assert.match(html, /<label for="aq">Search<\/label>/);
  assert.match(html, /<label for="at">Topic<\/label>/);
  assert.match(html, /<label for="am">Time available<\/label>/);
  assert.match(html, /<label for="ae">Equipment<\/label>/);
});

test('ACCESS-05: form errors are announced to assistive technology', () => {
  assert.match(html, /role="alert"/);
});

test('ACCESS-06: remove-step buttons have descriptive accessible names', () => {
  assert.match(html, /aria-label="Remove step \$\{i\+1\}"/);
});
