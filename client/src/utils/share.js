/**
 * VPyLab — 코드 공유 유틸리티
 * 짧은 URL 방식 (/s/abc12345) + LZ-String/base64 해시 하위 호환
 */

import { supabase } from '../lib/supabase';
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';

import { API_BASE, SERVER_FEATURES } from '../lib/api-base.js';
const MAX_CODE_SIZE = 50_000; // 50KB 상한

/**
 * 서버 없이 쓰는 공유 링크: 코드를 주소의 #code= 뒤에 압축해 담습니다.
 * 오픈소스 판·교실 LAN 모드처럼 공유 서버가 없을 때 사용하고, 여는 쪽은 decodeCodeFromURL이 읽습니다.
 */
export function hashShareUrl(code, origin = window.location.origin) {
  return `${origin}/sandbox#code=${compressToEncodedURIComponent(code)}`;
}

/**
 * 코드를 서버 경유로 저장하고 짧은 URL 반환
 * 보안: anon key 직접 INSERT 대신 서버 rate-limit + 크기 검증
 * @param {string} code
 * @param {string} [title]
 * @returns {Promise<{ url: string|null, error: string|null }>}
 */
export async function createShareLink(code, title = '제목 없음') {
  if (code.length > MAX_CODE_SIZE) {
    return { url: null, error: '코드가 너무 깁니다 (50KB 초과)' };
  }
  // 공유 서버가 없는 판에서는 서버에 저장하지 않고 주소에 코드를 담습니다(예전에는 /api/share가 405로 실패).
  if (!SERVER_FEATURES) return { url: hashShareUrl(code), error: null };

  try {
    const res = await fetch(`${API_BASE}/api/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, title }),
    });
    const data = await res.json();

    if (!res.ok) {
      return { url: null, error: data.error || '공유 링크 생성 실패' };
    }

    const url = `${window.location.origin}${data.url}`;
    return { url, error: null };
  } catch {
    return { url: null, error: '서버 연결 실패' };
  }
}

/**
 * 공유 ID로 코드 조회
 * @param {string} shareId
 * @returns {Promise<{ code: string|null, title: string|null, error: string|null }>}
 */
export async function loadSharedCode(shareId) {
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
