const MAX_BODY_BYTES = 16 * 1024;
const RATE_LIMIT = 5;
const RATE_WINDOW_MINUTES = 10;
const RESEND_URL = 'https://api.resend.com/emails';
const SCREEN_TYPES = new Set(['indoor', 'outdoor', 'rental', 'transparent', 'consultation']);
const LOCATIONS = new Set(['facade', 'mall', 'boardroom', 'stadium', 'event', 'other']);

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function addText(errors, input, field, min, max, required = true) {
  const value = cleanString(input[field]);
  if ((required && value.length < min) || value.length > max) errors[field] = 'invalid';
  return value || null;
}

function addEnum(errors, input, field, values, required = true) {
  const value = cleanString(input[field]);
  if ((required && !value) || (value && !values.has(value))) errors[field] = 'invalid';
  return value || null;
}

function addNumber(errors, input, field, required = true) {
  const empty = input[field] === '' || input[field] === null || input[field] === undefined;
  const value = empty ? null : Number(input[field]);
  if ((required && value === null) || (value !== null && (!Number.isFinite(value) || value < 0.5 || value > 100))) {
    errors[field] = 'invalid';
  }
  return value;
}

export function validateQuote(input) {
  const errors = {};
  const source = addEnum(errors, input, 'source', new Set(['wizard', 'modal']));
  const language = addEnum(errors, input, 'language', new Set(['ar', 'en']));
  const name = addText(errors, input, 'name', 2, 100);
  const company = addText(errors, input, 'company', 2, 120);
  const phone = addText(errors, input, 'phone', 7, 30);
  const email = addText(errors, input, 'email', 3, 254);
  const notes = addText(errors, input, 'notes', 0, 2000, false);
  const sourceUrl = addText(errors, input, 'sourceUrl', 0, 500, false);
  const product = addText(errors, input, 'product', source === 'modal' ? 2 : 0, 160, source === 'modal');
  const screenType = addEnum(errors, input, 'screenType', SCREEN_TYPES, source === 'wizard');
  const location = addEnum(errors, input, 'location', LOCATIONS, source === 'wizard');
  const width = addNumber(errors, input, 'width', source === 'wizard');
  const height = addNumber(errors, input, 'height', source === 'wizard');

  if (phone && (!/^[+\d\s().-]+$/.test(phone) || (phone.match(/\d/g) || []).length < 7 || (phone.match(/\d/g) || []).length > 15)) {
    errors.phone = 'invalid';
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'invalid';

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    value: {
      source,
      language,
      name,
      company,
      phone,
      email,
      screenType,
      width,
      height,
      location,
      product,
      notes,
      sourceUrl
    }
  };
}

export function buildEmailText(quote) {
  const lines = [
    `طلب تسعير جديد ${quote.reference}`,
    '',
    `العميل: ${quote.name}`,
    `الشركة: ${quote.company}`,
    `الهاتف: ${quote.phone}`,
    `البريد: ${quote.email}`,
    `المصدر: ${quote.source}`
  ];
  if (quote.product) lines.push(`المنتج: ${quote.product}`);
  if (quote.screenType) lines.push(`نوع الشاشة: ${quote.screenType}`);
  if (quote.width && quote.height) lines.push(`الأبعاد: ${quote.width} × ${quote.height} متر`);
  if (quote.location) lines.push(`الموقع: ${quote.location}`);
  if (quote.notes) lines.push('', `الملاحظات: ${quote.notes}`);
  lines.push('', `وقت الاستلام: ${quote.createdAt}`, `صفحة المصدر: ${quote.sourceUrl || '-'}`);
  return lines.join('\n');
}

function allowedCorsHeaders(request, env) {
  const origin = request.headers.get('Origin');
  if (!origin) return {};
  const allowed = new Set((env.ALLOWED_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean));
  if (!allowed.has(origin)) return null;
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Idempotency-Key',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };
}

function json(data, status, cors = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...cors
    }
  });
}

async function sha256(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

function referenceFor(id, date) {
  return `DS-${date.slice(0, 10).replaceAll('-', '')}-${id.slice(0, 8).toUpperCase()}`;
}

function isLocalRequest(request) {
  return ['127.0.0.1', 'localhost'].includes(new URL(request.url).hostname);
}

async function updateNotification(env, id, status, providerId = null, errorCode = null) {
  await env.DB.prepare(`
    UPDATE quote_requests
    SET notification_status = ?2,
        notification_attempts = notification_attempts + 1,
        notification_provider_id = ?3,
        notification_error_code = ?4,
        notified_at = ?5
    WHERE id = ?1
  `).bind(id, status, providerId, errorCode, new Date().toISOString()).run();
}

async function sendNotification(env, quote, forceLocal = false) {
  if (forceLocal || env.EMAIL_MODE !== 'send') {
    await updateNotification(env, quote.id, 'skipped_local');
    console.info(`quote_notification_skipped ${quote.reference}`);
    return;
  }

  if (!env.RESEND_API_KEY || !env.EMAIL_FROM || !env.EMAIL_TO) {
    await updateNotification(env, quote.id, 'failed', null, 'configuration');
    throw new Error('email_configuration');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(RESEND_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `quote-${quote.id}`
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: env.EMAIL_TO.split(',').map(value => value.trim()).filter(Boolean),
        reply_to: quote.email,
        subject: `طلب تسعير جديد ${quote.reference} — ${quote.company}`,
        text: buildEmailText(quote)
      })
    });
    if (!response.ok) throw new Error(`provider_${response.status}`);
    const result = await response.json();
    await updateNotification(env, quote.id, 'sent', result.id || null);
  } catch (error) {
    const code = error.name === 'AbortError' ? 'timeout' : cleanString(error.message).slice(0, 80) || 'unknown';
    await updateNotification(env, quote.id, 'failed', null, code);
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function rowToQuote(row) {
  return {
    id: row.id,
    reference: row.reference,
    createdAt: row.created_at,
    source: row.source,
    name: row.name,
    company: row.company,
    phone: row.phone,
    email: row.email,
    screenType: row.screen_type,
    width: row.width,
    height: row.height,
    location: row.location,
    product: row.product,
    notes: row.notes,
    sourceUrl: row.source_url
  };
}

async function retryNotifications(env) {
  const pending = await env.DB.prepare(`
    SELECT * FROM quote_requests
    WHERE notification_status IN ('pending', 'failed') AND notification_attempts < 5
    ORDER BY created_at ASC
    LIMIT 20
  `).all();
  for (const row of pending.results || []) {
    try {
      await sendNotification(env, rowToQuote(row));
    } catch {
      console.error(`quote_notification_retry_failed ${row.reference}`);
    }
  }
}

async function handleQuote(request, env, cors) {
  if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) {
    return json({ ok: false, code: 'unsupported_media_type' }, 415, cors);
  }
  const declaredSize = Number(request.headers.get('Content-Length') || 0);
  if (declaredSize > MAX_BODY_BYTES) return json({ ok: false, code: 'payload_too_large' }, 413, cors);

  const body = await request.text();
  if (new TextEncoder().encode(body).byteLength > MAX_BODY_BYTES) {
    return json({ ok: false, code: 'payload_too_large' }, 413, cors);
  }

  let input;
  try {
    input = JSON.parse(body);
  } catch {
    return json({ ok: false, code: 'invalid_json' }, 400, cors);
  }
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return json({ ok: false, code: 'invalid_json' }, 400, cors);
  }

  const idempotencyKey = cleanString(request.headers.get('Idempotency-Key'));
  if (!/^[A-Za-z0-9_-]{16,128}$/.test(idempotencyKey)) {
    return json({ ok: false, code: 'invalid_idempotency_key' }, 400, cors);
  }
  if (cleanString(input.website)) {
    return json({ ok: true, reference: 'DS-RECEIVED' }, 201, cors);
  }

  const validation = validateQuote(input);
  if (!validation.ok) return json({ ok: false, code: 'validation_error', fields: validation.errors }, 422, cors);
  if (!env.DB) return json({ ok: false, code: 'storage_unavailable' }, 503, cors);

  const requestHash = await sha256(JSON.stringify(validation.value));
  try {
    const existing = await env.DB.prepare(`
      SELECT reference, request_hash, created_at FROM quote_requests WHERE idempotency_key = ?1
    `).bind(idempotencyKey).first();
    if (existing) {
      if (existing.request_hash !== requestHash) return json({ ok: false, code: 'idempotency_conflict' }, 409, cors);
      return json({ ok: true, reference: existing.reference, receivedAt: existing.created_at, duplicate: true }, 200, cors);
    }

    const localRequest = isLocalRequest(request);
    const ipHashSalt = env.IP_HASH_SALT || (localRequest ? 'local-preview' : '');
    if (!ipHashSalt) return json({ ok: false, code: 'service_not_configured' }, 503, cors);
    const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For')?.split(',')[0].trim() || 'local';
    const clientHash = await sha256(`${ipHashSalt}:${ip}`);
    const since = new Date(Date.now() - RATE_WINDOW_MINUTES * 60000).toISOString();
    const recent = await env.DB.prepare(`
      SELECT COUNT(*) AS count FROM quote_requests WHERE client_hash = ?1 AND created_at >= ?2
    `).bind(clientHash, since).first();
    if (Number(recent?.count || 0) >= RATE_LIMIT) {
      return json({ ok: false, code: 'rate_limited' }, 429, { ...cors, 'Retry-After': '600' });
    }

    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const reference = referenceFor(id, createdAt);
    const quote = { id, reference, createdAt, ...validation.value };
    await env.DB.prepare(`
      INSERT INTO quote_requests (
        id, reference, idempotency_key, request_hash, created_at, source, language,
        name, company, phone, email, screen_type, width, height, location, product,
        notes, source_url, client_hash
      ) VALUES (
        ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15,
        ?16, ?17, ?18, ?19
      )
    `).bind(
      id, reference, idempotencyKey, requestHash, createdAt, quote.source, quote.language,
      quote.name, quote.company, quote.phone, quote.email, quote.screenType, quote.width,
      quote.height, quote.location, quote.product, quote.notes, quote.sourceUrl, clientHash
    ).run();

    try {
      await sendNotification(env, quote, localRequest);
    } catch {
      console.error(`quote_notification_failed ${reference}`);
    }
    return json({ ok: true, reference, receivedAt: createdAt }, 201, cors);
  } catch (error) {
    console.error(`quote_storage_failed ${error.name || 'Error'}`);
    return json({ ok: false, code: 'storage_unavailable' }, 503, cors);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/health') return json({ ok: true }, 200);
    if (url.pathname !== '/api/quote') return json({ ok: false, code: 'not_found' }, 404);

    const cors = allowedCorsHeaders(request, env);
    if (cors === null) return json({ ok: false, code: 'origin_not_allowed' }, 403);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'POST') return json({ ok: false, code: 'method_not_allowed' }, 405, cors);
    return handleQuote(request, env, cors);
  },

  async scheduled(_controller, env, ctx) {
    ctx.waitUntil(retryNotifications(env));
  }
};

