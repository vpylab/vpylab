/**
 * 만들기 화면의 자유 코딩 초안 (로그인하지 않은 상태).
 *
 * 탭을 닫거나 브라우저가 꺼져도 마지막 코드가 남도록 이 브라우저의 localStorage에 둡니다.
 * 학습 자료에서 연 연습 코드(utils/practice-drafts.js)는 탭 단위로 그대로 둡니다. 공용 컴퓨터에서
 * 다음 학생이 같은 차시를 열었을 때 앞 학생의 코드가 나오지 않게 하기 위해서입니다.
 * 구글 드라이브에 로그인한 뒤의 초안은 drive/driveSession.js가 계정별로 따로 보관합니다.
 */
const KEY = 'vpylab:sandbox:draft:v1';
export const SANDBOX_DRAFT_MAX_BYTES = 100 * 1024;
export const SANDBOX_DRAFT_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

function storageOf(storage) {
  if (storage) return storage;
  try { return globalThis.localStorage; } catch { return null; }
}

/** 남아 있는 초안 코드. 없거나 14일이 지났으면 null */
export function readSandboxDraft(storage, now = Date.now()) {
  const target = storageOf(storage);
  if (!target) return null;
  try {
    const data = JSON.parse(target.getItem(KEY) || 'null');
    if (data?.version !== 1 || typeof data.code !== 'string' || !data.code) return null;
    if (new TextEncoder().encode(data.code).length > SANDBOX_DRAFT_MAX_BYTES) return null;
    if (!Number.isFinite(data.savedAt) || now - data.savedAt > SANDBOX_DRAFT_MAX_AGE_MS) {
      target.removeItem(KEY);
      return null;
    }
    return data.code;
  } catch { return null; }
}

/** 초안을 남깁니다. 남기지 못하면 false */
export function writeSandboxDraft(code, storage, now = Date.now()) {
  const target = storageOf(storage);
  if (!target) return false;
  try {
    if (typeof code !== 'string' || new TextEncoder().encode(code).length > SANDBOX_DRAFT_MAX_BYTES) return false;
    target.setItem(KEY, JSON.stringify({ version: 1, code, savedAt: now }));
    return true;
  } catch { return false; }
}

export function clearSandboxDraft(storage) {
  try { storageOf(storage)?.removeItem(KEY); } catch { /* 저장소를 쓸 수 없는 환경 */ }
}
