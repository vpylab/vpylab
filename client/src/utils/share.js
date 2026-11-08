/**
 * VPyLab — 코드 공유 유틸리티
 * 짧은 URL 방식 (/s/abc12345 또는 /s/<정한 이름>) + LZ-String/base64 해시 하위 호환
 */

import { supabase } from '../lib/supabase';
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';

import { API_BASE, SHARE_BACKEND } from '../lib/api-base.js';
import { SHARE_NAME_PATTERN, checkShareName } from '../../../server/shared/share-names.js';
const MAX_CODE_SIZE = 50_000; // 50KB 상한

/** 공유 링크로 열 때 편집기 대신 실행 화면(극장 모드)부터 보여 주라는 표시. /s/ 짧은 주소와 같은 동작입니다. */
export const SHARE_RUN_VIEW = 'run';

/** 이름 규칙은 두 판의 서버와 같은 파일을 씁니다(server/shared/share-names.js). */
export { SHARE_NAME_PATTERN };

/** 이 브라우저에서 만든 공유 주소의 수정 열쇠. 같은 이름을 다시 고칠 때만 씁니다. */
const EDIT_KEYS_STORAGE = 'vpylab-share-edit-keys';

function readEditKeys() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(EDIT_KEYS_STORAGE) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function rememberEditKey(id, editKey) {
  if (!id || !editKey) return;
  try {
    const keys = readEditKeys();
    keys[id] = editKey;
    window.localStorage.setItem(EDIT_KEYS_STORAGE, JSON.stringify(keys));
  } catch { /* 사생활 보호 모드 등: 열쇠를 못 남겨도 링크는 동작합니다 */ }
}

/** 이 브라우저에서 만든 이름인지(고칠 수 있는지) */
export function hasEditKey(id) {
  if (!id) return false;
  const keys = readEditKeys();
  // 정한 이름은 소문자, 수업용 판 무작위 주소는 대소문자가 섞여 있어 그대로 먼저 찾습니다.
  return Boolean(keys[id] || keys[String(id).toLowerCase()]);
}

/**
 * 서버 없이 쓰는 공유 링크: 코드를 주소의 #code= 뒤에 압축해 담습니다.
 * 교실 LAN 모드처럼 공유 저장소가 없거나, 오픈소스 판 저장소가 응답하지 않을 때 사용하고, 여는 쪽은 decodeCodeFromURL이 읽습니다.
 * ?view=run이 붙어 있어 QR로 연 휴대폰에서도 코드가 아니라 실행 화면이 먼저 나옵니다.
 */
export function hashShareUrl(code, origin = window.location.origin) {
  return `${origin}/sandbox?view=${SHARE_RUN_VIEW}#code=${compressToEncodedURIComponent(code)}`;
}

async function postShare(body) {
  const res = await fetch(`${API_BASE}/api/share`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

/**
 * 코드를 서버 경유로 저장하고 짧은 URL 반환
 * 보안: anon key 직접 INSERT 대신 서버 rate-limit + 크기 검증
 * 오픈소스 판은 저장소가 응답하지 않으면 주소에 코드를 담은 링크(#code=)로 대신합니다(공유가 막히지 않게).
 * @param {string} code
 * @param {string} [title]
 * @returns {Promise<{ url: string|null, id?: string|null, error: string|null }>}
 */
export async function createShareLink(code, title = '제목 없음') {
  if (code.length > MAX_CODE_SIZE) {
    return { url: null, error: '코드가 너무 깁니다 (50KB 초과)' };
  }
  if (SHARE_BACKEND === 'none') return { url: hashShareUrl(code), id: null, error: null };

  try {
    const { res, data } = await postShare({ code, title });
    if (!res.ok || !data.url) {
      if (SHARE_BACKEND === 'pages') return { url: hashShareUrl(code), id: null, error: null };
      return { url: null, error: data.error || '공유 링크 생성 실패' };
    }
    if (data.editKey) rememberEditKey(data.id, data.editKey);
    return { url: `${window.location.origin}${data.url}`, id: data.id ?? null, error: null };
  } catch {
    if (SHARE_BACKEND === 'pages') return { url: hashShareUrl(code), id: null, error: null };
    return { url: null, error: '서버 연결 실패' };
  }
}

/**
 * 정한 이름으로 공유 주소 만들기(두 판 공통). 이 브라우저에서 만든 이름이면 내용을 지금 코드로 바꿉니다.
 * 오류는 화면에서 번역할 수 있게 코드(errorCode)로 돌려줍니다.
 * @returns {Promise<{ url: string|null, id: string|null, updated: boolean, errorCode: string|null }>}
 */
export async function claimShareName(code, title, rawName) {
  const checked = checkShareName(rawName);
  if (checked.error) return { url: null, id: null, updated: false, errorCode: checked.error };
  const name = checked.name;
  if (code.length > MAX_CODE_SIZE) return { url: null, id: null, updated: false, errorCode: 'code_too_large' };

  try {
    const editKey = readEditKeys()[name];
    if (editKey) {
      const res = await fetch(`${API_BASE}/api/share/${encodeURIComponent(name)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${editKey}` },
        body: JSON.stringify({ code, title }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) return { url: `${window.location.origin}${data.url}`, id: data.id, updated: true, errorCode: null };
      // 열쇠가 맞지 않거나 지워진 이름이면 새로 만들기를 시도합니다.
      if (res.status !== 403 && res.status !== 404) return { url: null, id: null, updated: false, errorCode: data.code || 'server_error' };
    }
    const { res, data } = await postShare({ code, title, name });
    if (!res.ok || !data.url) return { url: null, id: null, updated: false, errorCode: data.code || 'server_error' };
    // 이름을 모르는 예전 서버는 무작위 주소를 돌려줍니다. 정한 이름이 아니면 성공으로 보이지 않게 합니다.
    if (data.id !== name) return { url: null, id: null, updated: false, errorCode: 'server_error' };
    rememberEditKey(data.id, data.editKey);
    return { url: `${window.location.origin}${data.url}`, id: data.id, updated: false, errorCode: null };
  } catch {
    return { url: null, id: null, updated: false, errorCode: 'network' };
  }
}

/**
 * 공유 ID로 코드 조회
 * @param {string} shareId
 * @returns {Promise<{ code: string|null, title: string|null, error: string|null }>}
 */
export async function loadSharedCode(shareId) {
  if (SHARE_BACKEND === 'pages') {
    try {
      const res = await fetch(`${API_BASE}/api/share/${encodeURIComponent(shareId)}`);
      const data = await res.json().catch(() => ({}));
      if (res.ok && typeof data.code === 'string') return { code: data.code, title: data.title || null, error: null };
    } catch { /* 아래 안내로 */ }
    return { code: null, title: null, error: '공유 코드를 찾을 수 없습니다' };
  }

  const { data, error } = await supabase
    .from('vpylab_shares')
    .select('code, title')
    .eq('id', shareId)
    .single();

  if (error || !data) {
    return { code: null, title: null, error: '공유 코드를 찾을 수 없습니다' };
  }

  return { code: data.code, title: data.title, error: null };
}

/**
 * 코드 공유 URL을 클립보드에 복사
 * @param {string} code
 * @param {string} [title]
 * @returns {Promise<boolean>}
 */
export async function copyCodeLink(code, title) {
  const { url, error } = await createShareLink(code, title);
  if (error || !url) return false;

  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * base64url 해시 디코딩 (GitHub Pages fallback 링크용)
 * @param {string} value
 * @returns {string|null}
 */
function decodeBase64Url(value) {
  try {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    const binary = window.atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch (err) {
    console.warn('[Share] base64 URL 디코딩 실패:', err);
    return null;
  }
}

/**
 * URL 해시에서 코드 디코딩 (LZ-String/base64 하위 호환)
 * 기존 #code= 형식 링크와 Pages fallback #b64= 링크가 동작하도록 유지
 * @returns {{ code: string|null, isExternal: boolean }}
 */
export function decodeCodeFromURL() {
  const hash = window.location.hash;
  if (!hash || (!hash.startsWith('#code=') && !hash.startsWith('#b64='))) {
    return { code: null, isExternal: false };
  }

  try {
    const decoded = hash.startsWith('#b64=')
      ? decodeBase64Url(hash.slice(5))
      : decompressFromEncodedURIComponent(hash.slice(6));

    if (!decoded) {
      return { code: null, isExternal: false };
    }

    if (decoded.length > MAX_CODE_SIZE) {
      console.warn('[Share] 코드 크기 초과:', decoded.length);
      return { code: null, isExternal: false, error: 'tooLarge' };
    }

    return { code: decoded, isExternal: true };
  } catch (err) {
    console.warn('[Share] URL 디코딩 실패:', err);
    return { code: null, isExternal: false };
  }
}
