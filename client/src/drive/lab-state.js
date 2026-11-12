// 구글 드라이브 저장의 브라우저 보관 상태: 기기 ID와 저장 전 초안. 모두 이 브라우저의 localStorage에만 둡니다.
// 키 앞머리(vpylab-drivelab)는 처음 만든 때의 이름입니다. 이미 보관된 초안을 읽어야 하므로 바꾸지 않습니다.

const PREFIX = 'vpylab-drivelab';

function read(storage, key, fallback) {
  try {
    const raw = storage.getItem(`${PREFIX}:${key}`);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(storage, key, value) {
  try {
    storage.setItem(`${PREFIX}:${key}`, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function deviceId(storage, random = Math.random) {
  const existing = read(storage, 'device', null);
  if (existing) return existing;
  const id = `기기-${Math.floor(random() * 36 ** 4).toString(36).padStart(4, '0')}`;
  write(storage, 'device', id);
  return id;
}


/**
 * 저장 전 초안: 토큰 만료나 네트워크 오류로 저장이 실패해도 코드가 사라지지 않게 합니다.
 * 공용 PC에서 학생끼리 섞이지 않도록 계정(sub)별로 나눠 둡니다. 로그인 전에는 'anon'.
 */
const draftKey = (scope, fileId) => `draft:${scope || 'anon'}:${fileId || 'new'}`;
export function saveDraft(storage, scope, fileId, draft) {
  return write(storage, draftKey(scope, fileId), { ...draft, at: new Date().toISOString() });
}
export const loadDraft = (storage, scope, fileId) => read(storage, draftKey(scope, fileId), null);
export function clearDraft(storage, scope, fileId) {
  try { storage.removeItem(`${PREFIX}:${draftKey(scope, fileId)}`); } catch { /* 무시 */ }
}
/** 한 계정의 초안 목록: [{ fileId, draft }]. 새 코드 초안의 fileId는 'new-…'입니다. */
export function listDrafts(storage, scope) {
  const prefix = `${PREFIX}:draft:${scope || 'anon'}:`;
  const found = [];
  let length = 0;
  try { length = storage.length; } catch { return found; }
  for (let i = 0; i < length; i += 1) {
    // 한 항목이 깨져도 나머지 초안은 읽습니다.
    try {
      const key = storage.key(i);
      if (!key || !key.startsWith(prefix)) continue;
      const draft = JSON.parse(storage.getItem(key));
      if (draft && typeof draft.code === 'string') found.push({ fileId: key.slice(prefix.length), draft });
    } catch { /* 깨진 항목은 건너뜁니다(페이지를 열 때 정리됩니다) */ }
  }
  return found.sort((a, b) => String(b.draft.at || '').localeCompare(String(a.draft.at || '')));
}

/**
 * 한 파일의 초안 목록. 파일 초안 이름은 `<파일ID>@<탭ID>`(탭마다 따로)이고, 예전 형식 `<파일ID>`도 함께 찾습니다.
 */
export function fileDrafts(storage, scope, fileId) {
  return listDrafts(storage, scope).filter((d) => d.fileId === fileId || d.fileId.startsWith(`${fileId}@`));
}


export const DRAFT_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

/** 오래된 초안을 지웁니다. 공용 PC에 남은 초안이 쌓이지 않게 페이지를 열 때 실행합니다. */
export function purgeOldDrafts(storage, maxAgeMs = DRAFT_MAX_AGE_MS, now = Date.now()) {
  const prefix = `${PREFIX}:draft:`;
  let removed = 0;
  try {
    const old = [];
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (!key || !key.startsWith(prefix)) continue;
      let at = NaN;
      try { at = Date.parse(JSON.parse(storage.getItem(key))?.at); } catch { /* 깨진 초안은 지웁니다 */ }
      if (!(now - at < maxAgeMs)) old.push(key);
    }
    for (const key of old) { storage.removeItem(key); removed += 1; }
  } catch { /* 무시 */ }
  return removed;
}

/** 한 계정의 초안을 모두 지웁니다(로그아웃할 때). 지운 개수를 돌려줍니다. */
export function clearDrafts(storage, scope) {
  const prefix = `${PREFIX}:draft:${scope || 'anon'}:`;
  let removed = 0;
  try {
    const keys = [];
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (key && key.startsWith(prefix)) keys.push(key);
    }
    for (const key of keys) { storage.removeItem(key); removed += 1; }
  } catch { /* 무시 */ }
  return removed;
}
