import assert from 'node:assert/strict';
import test from 'node:test';
import worker, { buildEmailText, validateQuote } from '../worker/src/index.js';

const validWizard = {
  source: 'wizard',
  language: 'ar',
  name: 'أحمد محمد',
  company: 'شركة الاختبار',
  phone: '+966 50 000 0000',
  email: 'test@example.com',
  screenType: 'outdoor',
  width: 4,
  height: 2.5,
  location: 'facade',
  notes: '',
  sourceUrl: 'http://127.0.0.1:8000/'
};

test('accepts and normalizes a complete wizard request', () => {
  const result = validateQuote(validWizard);
  assert.equal(result.ok, true);
  assert.equal(result.value.width, 4);
  assert.equal(result.value.product, null);
});

test('requires product but not dimensions for modal requests', () => {
  const result = validateQuote({
    ...validWizard,
    source: 'modal',
    product: 'Outdoor LED P4',
    screenType: undefined,
    width: undefined,
    height: undefined,
    location: undefined
  });
  assert.equal(result.ok, true);
  assert.equal(result.value.product, 'Outdoor LED P4');
});

test('rejects invalid contact and dimension data', () => {
  const result = validateQuote({ ...validWizard, email: 'bad', phone: '12', width: 0 });
  assert.equal(result.ok, false);
  assert.deepEqual(Object.keys(result.errors).sort(), ['email', 'phone', 'width']);
});

test('builds a plain-text sales notification with the reference', () => {
  const text = buildEmailText({
    ...validWizard,
    id: 'id',
    reference: 'DS-20261016-ABC12345',
    createdAt: '2026-10-16T10:00:00.000Z'
  });
  assert.match(text, /DS-20261016-ABC12345/);
  assert.match(text, /test@example\.com/);
  assert.match(text, /4 × 2\.5/);
});

test('rejects a non-object JSON body before accessing storage', async () => {
  const response = await worker.fetch(new Request('http://localhost/api/quote', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': 'test-null-payload-0001'
    },
    body: 'null'
  }), {});
  assert.equal(response.status, 400);
  assert.equal((await response.json()).code, 'invalid_json');
});

test('rejects browser requests from unapproved origins', async () => {
  const response = await worker.fetch(new Request('http://localhost/api/quote', {
    method: 'OPTIONS',
    headers: { Origin: 'https://example.com' }
  }), { ALLOWED_ORIGINS: 'https://www.diamondscreen.com.sa' });
  assert.equal(response.status, 403);
  assert.equal((await response.json()).code, 'origin_not_allowed');
});
