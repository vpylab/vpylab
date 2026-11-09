/**
 * VPyLab — 코드 공유 API (수업용 판, Railway + Supabase)
 *
 * 보안: 공개 키로 직접 INSERT 불가(021 마이그레이션) → 서버 경유 + rate-limit + 크기·이름 검증
 *
 *   POST /api/share        { code, title?, name? } → { id, url, editKey, named }
 *   PUT  /api/share/:id    Authorization: Bearer <editKey>, { code, title? } → { id, url, named }
 *   DELETE /api/share/:id  Authorization: Bearer <editKey> → { id, deleted } (무작위 주소만, 정한 이름은 409)
 *
 * 이름 규칙은 server/shared/share-names.js(오픈소스 판 cloudflare/share-core.js와 같음).
 * 수정 열쇠는 만든 브라우저에만 있고, 서버는 SHA-256만 vpylab_share_keys(서버 전용 표)에 둡니다.
 */

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { Router } from 'express';
import { RATE_LIMITS, createAnonymousLimiter } from '../middleware/rate-limit.js';
import { createClient } from '@supabase/supabase-js';
import { nanoid } from 'nanoid';
import { SHARE_NAME_MESSAGES, checkShareName } from '../shared/share-names.js';

const router = Router();

// 서버용 Supabase 클라이언트 (service_role 키) — 지연 초기화
// ESM import 호이스팅으로 dotenv.config()보다 먼저 평가되므로
// 모듈 최상위에서 createClient 호출하면 env 미로드 시 크래시 발생
let _supabase = null;
function getSupabase() {
  if (!_supabase) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error('SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 미설정');
    }
    _supabase = createClient(url, key, { auth: { persistSession: false } });
  }
  return _supabase;
}

const MAX_CODE_SIZE = 50_000; // 50KB
const SHARE_ID_LENGTH = 8;

// 공유 생성 rate-limit — 비로그인 경로라 IP 기준. 한 학급(30명)이 1분 안에 모두 공유해도 통과하도록 60회.
const shareLimiter = createAnonymousLimiter({ limit: RATE_LIMITS.anonymousSharePerMinute, scope: '공유 링크 생성' });

const isDuplicate = (error) => error?.code === '23505' || /duplicate/i.test(error?.message || '');
const hashKey = (key) => createHash('sha256').update(key).digest('hex');
const newEditKey = () => randomBytes(24).toString('base64url');
const cleanTitle = (title) => (typeof title === 'string' ? title : '제목 없음').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 200) || '제목 없음';

function validateCode(code, res) {
  if (!code || typeof code !== 'string') {
    res.status(400).json({ error: '코드가 필요합니다.', code: 'code_missing' });
    return false;
  }
  if (code.length > MAX_CODE_SIZE) {
    res.status(400).json({ error: '코드가 너무 깁니다 (50KB 초과)', code: 'code_too_large' });
    return false;
  }
  return true;
}

function bearerKey(req) {
  const match = String(req.get('authorization') || '').match(/^Bearer\s+([A-Za-z0-9_-]{16,128})$/);
  return match ? match[1] : '';
}

function sameHash(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/** 공유 행과 열쇠 행을 만듭니다. 열쇠를 못 남기면 공유 행도 지워 이름이 고칠 수 없는 채로 남지 않게 합니다. */
async function insertShare(db, { id, code, title, named }) {
  const { error } = await db.from('vpylab_shares').insert({ id, code, title, named });
  if (error) return { error };
  const editKey = newEditKey();
  const { error: keyError } = await db.from('vpylab_share_keys').insert({ share_id: id, edit_key_hash: hashKey(editKey) });
  if (keyError) {
    await db.from('vpylab_shares').delete().eq('id', id);
    return { error: keyError, keyFailed: true };
  }
  return { editKey };
}

/**
 * POST /api/share
 * Body: { code, title, name? }
 * Returns: { id, url, editKey, named }
 */
router.post('/', shareLimiter, async (req, res) => {
  try {
    const { code, title, name } = req.body || {};
    if (!validateCode(code, res)) return;
    const safeTitle = cleanTitle(title);
    const db = getSupabase();

    if (name !== undefined && name !== null && String(name).trim() !== '') {
      const checked = checkShareName(name);
      if (checked.error) return res.status(400).json({ error: SHARE_NAME_MESSAGES[checked.error], code: checked.error });
      const result = await insertShare(db, { id: checked.name, code, title: safeTitle, named: true });
      if (result.editKey) return res.status(201).json({ id: checked.name, url: `/s/${checked.name}`, editKey: result.editKey, named: true });
      if (!result.keyFailed && isDuplicate(result.error)) {
        return res.status(409).json({ error: SHARE_NAME_MESSAGES.name_taken, code: 'name_taken' });
      }
      console.error('[Share] 이름 공유 실패:', result.error?.message);
      return res.status(500).json({ error: '공유 링크 생성 실패', code: 'server_error' });
    }

    // nanoid로 짧은 ID 생성, 충돌 시 재시도
    for (let attempt = 0; attempt < 3; attempt++) {
      const id = nanoid(SHARE_ID_LENGTH);
      const result = await insertShare(db, { id, code, title: safeTitle, named: false });
      if (result.editKey) return res.json({ id, url: `/s/${id}`, editKey: result.editKey, named: false });
      // PK 충돌이면 재시도
      if (result.keyFailed || !isDuplicate(result.error)) {
        console.error('[Share] 공유 실패:', result.error?.message);
        return res.status(500).json({ error: '공유 링크 생성 실패', code: 'server_error' });
      }
    }

    res.status(500).json({ error: '공유 링크 생성 실패 (충돌 초과)', code: 'server_error' });
  } catch (err) {
    console.error('[Share] 오류:', err.message);
    res.status(500).json({ error: '서버 오류', code: 'server_error' });
  }
});

/**
 * PUT /api/share/:id — 같은 브라우저(수정 열쇠)에서 공유 내용을 지금 코드로 바꿉니다.
 */
router.put('/:id', shareLimiter, async (req, res) => {
  try {
    const id = String(req.params.id || '');
    if (!/^[A-Za-z0-9_-]{3,40}$/.test(id)) return res.status(404).json({ error: '공유 코드를 찾을 수 없습니다.', code: 'not_found' });
    const { code, title } = req.body || {};
    if (!validateCode(code, res)) return;
    const db = getSupabase();

    const { data: keyRow, error: keyError } = await db.from('vpylab_share_keys').select('edit_key_hash').eq('share_id', id).maybeSingle();
    if (keyError) {
      console.error('[Share] 열쇠 조회 실패:', keyError.message);
      return res.status(500).json({ error: '서버 오류', code: 'server_error' });
    }
    if (!keyRow) return res.status(404).json({ error: '공유 코드를 찾을 수 없습니다.', code: 'not_found' });
    const key = bearerKey(req);
    if (!key || !sameHash(hashKey(key), keyRow.edit_key_hash)) {
      return res.status(403).json({ error: '이 이름을 만든 브라우저에서만 고칠 수 있습니다.', code: 'not_owner' });
    }

    const { data: updated, error } = await db.from('vpylab_shares')
      .update({ code, title: cleanTitle(title), updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id, named')
      .maybeSingle();
    if (error) {
      console.error('[Share] 고치기 실패:', error.message);
      return res.status(500).json({ error: '서버 오류', code: 'server_error' });
    }
    if (!updated) return res.status(404).json({ error: '공유 코드를 찾을 수 없습니다.', code: 'not_found' });
    res.json({ id, url: `/s/${id}`, named: updated.named === true });
  } catch (err) {
    console.error('[Share] 오류:', err.message);
    res.status(500).json({ error: '서버 오류', code: 'server_error' });
  }
});

/**
 * DELETE /api/share/:id — 이름을 정한 뒤 쓰이지 않게 된 무작위 주소를 지웁니다.
 * 만든 브라우저(수정 열쇠)만 지울 수 있고, 정한 이름은 지우지 않습니다. 열쇠 행은 외래 키(ON DELETE CASCADE)로 함께 지워집니다.
 */
// 학급 전체가 이름을 정해도 공유 한도를 쓰지 않게 공유 제한에서 뺍니다(IP 전체 제한은 그대로 받습니다).
router.delete('/:id', async (req, res) => {
  try {
    const id = String(req.params.id || '');
    if (!/^[A-Za-z0-9_-]{3,40}$/.test(id)) return res.status(404).json({ error: '공유 코드를 찾을 수 없습니다.', code: 'not_found' });
    const db = getSupabase();

    const { data: keyRow, error: keyError } = await db.from('vpylab_share_keys').select('edit_key_hash').eq('share_id', id).maybeSingle();
    if (keyError) {
      console.error('[Share] 열쇠 조회 실패:', keyError.message);
      return res.status(500).json({ error: '서버 오류', code: 'server_error' });
    }
    if (!keyRow) return res.status(404).json({ error: '공유 코드를 찾을 수 없습니다.', code: 'not_found' });
    const key = bearerKey(req);
    if (!key || !sameHash(hashKey(key), keyRow.edit_key_hash)) {
      return res.status(403).json({ error: '이 주소를 만든 브라우저에서만 지울 수 있습니다.', code: 'not_owner' });
    }

    const { data: row, error: rowError } = await db.from('vpylab_shares').select('named').eq('id', id).maybeSingle();
    if (rowError) {
      console.error('[Share] 공유 조회 실패:', rowError.message);
      return res.status(500).json({ error: '서버 오류', code: 'server_error' });
    }
    if (!row) return res.status(404).json({ error: '공유 코드를 찾을 수 없습니다.', code: 'not_found' });
    if (row.named === true) return res.status(409).json({ error: '정한 이름은 지울 수 없습니다.', code: 'named' });

    const { error } = await db.from('vpylab_shares').delete().eq('id', id).eq('named', false);
    if (error) {
      console.error('[Share] 지우기 실패:', error.message);
      return res.status(500).json({ error: '서버 오류', code: 'server_error' });
    }
    res.json({ id, deleted: true });
  } catch (err) {
    console.error('[Share] 오류:', err.message);
    res.status(500).json({ error: '서버 오류', code: 'server_error' });
  }
});

export default router;
