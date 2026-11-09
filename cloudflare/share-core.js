/**
 * 오픈소스 판 짧은 공유 주소(/s/<이름>)의 핵심 로직. Cloudflare Pages 함수(functions/api/share/)가 사용합니다.
 *
 * 요청과 응답
 *   POST /api/share            { code, title?, name? } → 201 { id, url, editKey, named }
 *   GET  /api/share/:id        → 200 { id, code, title, named, updatedAt }
 *   PUT  /api/share/:id        Authorization: Bearer <editKey>, { code, title? } → 200 { id, url, named }
 *
 * 규칙
 *   - 이름은 영어 소문자·숫자·하이픈(-) 3~30자, 하이픈으로 시작하거나 끝나지 않습니다. 먼저 정한 사람이 씁니다.
 *   - 이름을 정하지 않으면 헷갈리는 글자(0·o·1·l·i)를 뺀 무작위 6자를 붙입니다.
 *   - 고치려면 만들 때 받은 수정 열쇠가 필요합니다. 서버에는 열쇠의 해시만 둡니다. 로그인·개인정보는 받지 않습니다.
 *   - 코드는 50,000자까지. 같은 IP에서 1분에 60개까지 만들 수 있습니다(학교는 한 IP를 함께 쓰므로 넉넉하게).
 *
 * D1 바인딩 이름은 DB(wrangler.toml), IP 해시 소금은 비밀값 SHARE_SALT(없으면 고정 문자열)입니다.
 */

import { RESERVED_NAMES, SHARE_NAME_MESSAGES, SHARE_NAME_PATTERN, checkShareName } from '../server/shared/share-names.js';

export const MAX_CODE_SIZE = 50_000;
export const MAX_TITLE = 200;
export const MAX_BODY_BYTES = 256 * 1024;
// 한 학급(30명)이 같은 IP에서 공유 창을 열고(무작위 주소) 이름까지 정하면 1분에 60건이 넘을 수 있어 120으로 둡니다.
export const RATE_PER_MINUTE = 120;
export const RANDOM_ID_LENGTH = 6;
export const RANDOM_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

const NAME_PATTERN = SHARE_NAME_PATTERN;
const RANDOM_PATTERN = new RegExp(`^[${RANDOM_ALPHABET}]{${RANDOM_ID_LENGTH}}$`);

export { RESERVED_NAMES };

export class ShareError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/** 이름 정규화와 검사(규칙은 server/shared/share-names.js). 통과하면 소문자 이름, 아니면 ShareError */
export function normalizeName(raw) {
  const result = checkShareName(raw);
  if (result.error) throw new ShareError(400, result.error, SHARE_NAME_MESSAGES[result.error]);
  return result.name;
}

/** 주소에서 받은 id가 가능한 모양인지(정한 이름 또는 무작위 6자) */
export function isValidId(raw) {
  const id = String(raw ?? '').toLowerCase();
  return NAME_PATTERN.test(id) || RANDOM_PATTERN.test(id);
}

export function randomId(random = crypto.getRandomValues.bind(crypto)) {
  const bytes = random(new Uint8Array(RANDOM_ID_LENGTH));
  return Array.from(bytes, (b) => RANDOM_ALPHABET[b % RANDOM_ALPHABET.length]).join('');
}

export function randomKey(random = crypto.getRandomValues.bind(crypto)) {
  const bytes = random(new Uint8Array(24));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function sha256Hex(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** 시간이 일정한 문자열 비교(열쇠 해시 비교용) */
export function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function validateCode(code) {
  if (typeof code !== 'string' || !code.trim()) throw new ShareError(400, 'code_missing', '코드가 필요합니다.');
  if (code.length > MAX_CODE_SIZE) throw new ShareError(413, 'code_too_large', '코드가 너무 깁니다(50KB 초과).');
  return code;
}

export function cleanTitle(title) {
  return (typeof title === 'string' ? title : '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, MAX_TITLE);
}

/** 같은 IP에서 1분에 RATE_PER_MINUTE개까지. 키는 (소금+IP+분) 해시라 IP를 되돌려 알 수 없고 1분마다 바뀝니다. */
export async function checkRate(db, ip, salt, now = Date.now()) {
  const minute = Math.floor(now / 60_000);
  const key = await sha256Hex(`${salt}|${ip || 'unknown'}|${minute}`);
  await db.prepare('DELETE FROM share_rate WHERE ts < ?').bind(minute - 2).run();
  const row = await db
    .prepare('INSERT INTO share_rate (k, n, ts) VALUES (?, 1, ?) ON CONFLICT(k) DO UPDATE SET n = n + 1 RETURNING n')
    .bind(key, minute)
    .first();
  if ((row?.n ?? 1) > RATE_PER_MINUTE) {
    throw new ShareError(429, 'rate_limited', '같은 곳에서 공유 링크를 너무 많이 만들었습니다. 1분 뒤에 다시 시도하십시오.');
  }
}

function isUniqueViolation(error) {
  return /UNIQUE constraint failed|SQLITE_CONSTRAINT/i.test(String(error?.message || error));
}

export async function createShare(db, { code, title, name }, { random } = {}) {
  validateCode(code);
  const safeTitle = cleanTitle(title);
  const editKey = randomKey(random);
  const editKeyHash = await sha256Hex(editKey);
  const now = Date.now();
  const insert = (id, named) => db
    .prepare('INSERT INTO shares (id, code, title, named, edit_key_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(id, code, safeTitle, named ? 1 : 0, editKeyHash, now, now)
    .run();

  if (name !== undefined && name !== null && String(name).trim() !== '') {
    const id = normalizeName(name);
    try {
      await insert(id, true);
    } catch (error) {
      if (isUniqueViolation(error)) throw new ShareError(409, 'name_taken', SHARE_NAME_MESSAGES.name_taken);
      throw error;
    }
    return { id, url: `/s/${id}`, editKey, named: true };
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const id = randomId(random);
    try {
      await insert(id, false);
      return { id, url: `/s/${id}`, editKey, named: false };
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
    }
  }
  throw new ShareError(500, 'id_exhausted', '공유 링크를 만들지 못했습니다. 다시 시도해 주세요.');
}

export async function getShare(db, rawId) {
  if (!isValidId(rawId)) throw new ShareError(404, 'not_found', '공유 코드를 찾을 수 없습니다.');
  const id = String(rawId).toLowerCase();
  const row = await db.prepare('SELECT id, code, title, named, updated_at FROM shares WHERE id = ?').bind(id).first();
  if (!row) throw new ShareError(404, 'not_found', '공유 코드를 찾을 수 없습니다.');
  return { id: row.id, code: row.code, title: row.title, named: row.named === 1, updatedAt: row.updated_at };
}

export async function updateShare(db, rawId, editKey, { code, title }) {
  validateCode(code);
  if (!isValidId(rawId)) throw new ShareError(404, 'not_found', '공유 코드를 찾을 수 없습니다.');
  const id = String(rawId).toLowerCase();
  const row = await db.prepare('SELECT edit_key_hash, named FROM shares WHERE id = ?').bind(id).first();
  if (!row) throw new ShareError(404, 'not_found', '공유 코드를 찾을 수 없습니다.');
  if (!editKey || !safeEqual(await sha256Hex(editKey), row.edit_key_hash)) {
    throw new ShareError(403, 'not_owner', '이 이름을 만든 브라우저에서만 고칠 수 있습니다.');
  }
  await db.prepare('UPDATE shares SET code = ?, title = ?, updated_at = ? WHERE id = ?')
    .bind(code, cleanTitle(title), Date.now(), id)
    .run();
  return { id, url: `/s/${id}`, named: row.named === 1 };
}

/**
 * 무작위 주소 지우기. 공유 창을 열면 무작위 주소가 먼저 생기는데, 이어서 이름을 정하면 그 주소는 쓰이지 않습니다.
 * 만든 브라우저(수정 열쇠)만 지울 수 있고, 정한 이름은 지우지 않습니다(남이 받은 링크를 끊지 않게).
 */
export async function deleteRandomShare(db, rawId, editKey) {
  if (!isValidId(rawId)) throw new ShareError(404, 'not_found', '공유 코드를 찾을 수 없습니다.');
  const id = String(rawId).toLowerCase();
  const row = await db.prepare('SELECT edit_key_hash, named FROM shares WHERE id = ?').bind(id).first();
  if (!row) throw new ShareError(404, 'not_found', '공유 코드를 찾을 수 없습니다.');
  if (!editKey || !safeEqual(await sha256Hex(editKey), row.edit_key_hash)) {
    throw new ShareError(403, 'not_owner', '이 주소를 만든 브라우저에서만 지울 수 있습니다.');
  }
  if (row.named === 1) throw new ShareError(409, 'named', '정한 이름은 지울 수 없습니다.');
  await db.prepare('DELETE FROM shares WHERE id = ? AND named = 0').bind(id).run();
  return { id, deleted: true };
}

// ── HTTP 처리 ──────────────────────────────────────────────

export function json(status, body, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extraHeaders },
  });
}

/** 다른 사이트의 웹 페이지가 방문자 브라우저로 링크를 만들지 못하게, Origin이 있으면 같은 출처만 받습니다. */
export function assertSameOrigin(request) {
  const origin = request.headers.get('Origin');
  if (origin && origin !== new URL(request.url).origin) {
    throw new ShareError(403, 'bad_origin', '허용되지 않은 요청입니다.');
  }
}

export async function readJson(request) {
  const length = Number(request.headers.get('Content-Length') || 0);
  if (length > MAX_BODY_BYTES) throw new ShareError(413, 'code_too_large', '코드가 너무 깁니다(50KB 초과).');
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) throw new ShareError(413, 'code_too_large', '코드가 너무 깁니다(50KB 초과).');
  try {
    const body = JSON.parse(text);
    if (!body || typeof body !== 'object') throw new Error('not object');
    return body;
  } catch {
    throw new ShareError(400, 'bad_json', '요청 형식이 올바르지 않습니다.');
  }
}

export function bearerKey(request) {
  const header = request.headers.get('Authorization') || '';
  const match = header.match(/^Bearer\s+([A-Za-z0-9_-]{16,128})$/);
  return match ? match[1] : '';
}

/** 함수 본문을 감싸 ShareError는 그 상태 코드로, 나머지는 500으로 돌려줍니다. */
export async function handle(fn) {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof ShareError) return json(error.status, { error: error.message, code: error.code });
    console.error('[share] 오류:', error?.message || error);
    return json(500, { error: '서버 오류가 났습니다. 잠시 뒤 다시 시도해 주세요.', code: 'server_error' });
  }
}

export function requireDb(env) {
  if (!env?.DB) throw new ShareError(503, 'no_db', '공유 저장소가 연결되어 있지 않습니다.');
  return env.DB;
}
