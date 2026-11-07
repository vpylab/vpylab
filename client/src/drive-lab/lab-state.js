// 실험 페이지의 로컬 상태: 기기 ID, 저장 전 초안, 실험 체크리스트, 보고서
// 모두 이 브라우저의 localStorage에만 둡니다.

const PREFIX = 'vpylab-drivelab';

export const CHECKLIST = [
  { id: 'A1', group: '계정', title: '학생 계정 승인', how: '실제 학생 계정으로 로그인합니다. 승인 화면, 관리자 차단 화면, 드라이브 권한 체크 상자가 보였는지 적습니다.' },
  { id: 'A2', group: '계정', title: '교사 계정 승인', how: '교사 계정으로 같은 과정을 거칩니다.' },
  { id: 'A3', group: '계정', title: '드라이브 권한만 빼고 승인', how: '승인 화면에서 드라이브 체크를 끄고 승인합니다. 페이지가 빠진 권한을 안내하는지 봅니다.' },
  { id: 'B1', group: '저장', title: '새 파일 저장과 다시 열기', how: '새 파일을 만들고 저장한 뒤 새로 고침해 다시 엽니다. drive.google.com의 VPyLab 폴더에도 보이는지 확인합니다.' },
  { id: 'B2', group: '저장', title: '다른 기기에서 열기', how: '다른 브라우저 프로필이나 다른 컴퓨터에서 같은 계정으로 열어 내용이 같은지 봅니다.' },
  { id: 'B3', group: '저장', title: '두 기기 충돌 감지', how: '두 곳에서 같은 파일을 연 뒤 한쪽을 저장하고, 다른 쪽에서 다른 내용을 저장합니다. 충돌 안내가 나와야 합니다.' },
  { id: 'B4', group: '저장', title: '버전 기록 보기', how: '여러 번 저장한 뒤 버전 기록에서 이전 내용을 불러옵니다.' },
  { id: 'C1', group: '토큰', title: '만료 흉내 후 저장', how: '"만료 흉내"를 누르고 코드를 고쳐 저장합니다. 초안이 남고, 다시 승인한 뒤 저장되는지 봅니다.' },
  { id: 'C2', group: '토큰', title: '실제 1시간 뒤 저장', how: '승인 후 1시간 넘게 두었다가 저장합니다. 수업 한 차시를 넘기는 상황입니다.' },
  { id: 'C3', group: '토큰', title: '권한 철회 후 동작', how: '"권한 철회"를 누른 뒤 저장해 봅니다. 다시 승인하면 기존 파일이 보이는지 확인합니다.' },
  { id: 'D1', group: '개인정보', title: '연결된 출처 확인', how: '"연결된 출처"에 구글 주소와 이 페이지 주소만 있는지 봅니다. VPyLab 운영 서버나 Supabase가 없어야 합니다.' },
  { id: 'D2', group: '개인정보', title: '접근 범위 확인', how: 'drive.google.com에서 직접 만든 다른 파일이 목록에 나오지 않는지 봅니다(drive.file 범위).' },
  { id: 'E1', group: '부하', title: '연속 저장 측정', how: '"연속 저장"으로 30회 저장해 평균 시간과 오류를 기록합니다. 여러 학생이 동시에 하면 학교 공유 IP 상황을 흉내 낼 수 있습니다.' },
];

export const RESULT_LABELS = { '': '미실시', pass: '통과', fail: '실패', partial: '일부' };

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

export const loadClientId = (storage) => read(storage, 'clientId', '');
export const saveClientId = (storage, value) => write(storage, 'clientId', value.trim());

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
  try {
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (!key || !key.startsWith(prefix)) continue;
      const draft = JSON.parse(storage.getItem(key));
      if (draft) found.push({ fileId: key.slice(prefix.length), draft });
    }
  } catch { /* 무시 */ }
  return found.sort((a, b) => String(b.draft.at || '').localeCompare(String(a.draft.at || '')));
}

/**
 * 한 파일의 초안 목록. 파일 초안 이름은 `<파일ID>@<탭ID>`(탭마다 따로)이고, 예전 형식 `<파일ID>`도 함께 찾습니다.
 */
export function fileDrafts(storage, scope, fileId) {
  return listDrafts(storage, scope).filter((d) => d.fileId === fileId || d.fileId.startsWith(`${fileId}@`));
}

/** 한 파일의 초안을 모두 지웁니다(파일을 휴지통으로 옮길 때). */
export function clearFileDrafts(storage, scope, fileId) {
  for (const { fileId: key } of fileDrafts(storage, scope, fileId)) clearDraft(storage, scope, key);
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

export const loadResults = (storage) => read(storage, 'results', {});
export const saveResults = (storage, results) => write(storage, 'results', results);

/** 페이지가 연결한 출처 목록. 운영 서버로 학생 데이터가 가지 않는다는 근거로 사용합니다. */
export function contactedOrigins(entries, pageOrigin) {
  const origins = new Map();
  for (const entry of entries) {
    let origin;
    try { origin = new URL(entry.name).origin; } catch { continue; }
    if (origin === 'null') continue;
    origins.set(origin, (origins.get(origin) || 0) + 1);
  }
  return [...origins.entries()]
    .map(([origin, count]) => ({ origin, count, kind: originKind(origin, pageOrigin) }))
    .sort((a, b) => a.origin.localeCompare(b.origin));
}

export function originKind(origin, pageOrigin) {
  if (origin === pageOrigin) return 'page';
  const host = new URL(origin).hostname;
  if (host === 'accounts.google.com' || host.endsWith('.googleapis.com') || host.endsWith('.gstatic.com') || host.endsWith('.googleusercontent.com')) return 'google';
  return 'other';
}

export function summarizeTimings(entries) {
  const ok = entries.filter((e) => e.status >= 200 && e.status < 300);
  if (!ok.length) return null;
  const sorted = ok.map((e) => e.ms).sort((a, b) => a - b);
  const pick = (p) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
  return {
    count: ok.length,
    errors: entries.length - ok.length,
    avg: Math.round(sorted.reduce((a, b) => a + b, 0) / sorted.length),
    p50: pick(0.5),
    p95: pick(0.95),
    max: sorted[sorted.length - 1],
  };
}

/** 사용자에게 돌려받을 보고서. 이메일 대신 도메인만 적습니다. */
export function buildReport({ results, account, device, origins, timings, burst, userAgent, now = new Date() }) {
  const lines = [
    '# VPyLab 드라이브 저장 실험 보고서',
    `- 일시: ${now.toISOString()}`,
    `- 기기: ${device}`,
    `- 계정 도메인: ${account?.hd || (account?.email ? account.email.split('@')[1] : '(로그인 안 함)')}`,
    `- 브라우저: ${userAgent}`,
    '',
    '## 체크리스트',
  ];
  for (const item of CHECKLIST) {
    const r = results[item.id] || {};
    lines.push(`- ${item.id} ${item.title}: ${RESULT_LABELS[r.result || '']}${r.note ? ` · ${r.note}` : ''}`);
  }
  lines.push('', '## 연결된 출처');
  for (const o of origins) lines.push(`- ${o.origin} (${o.kind}, ${o.count}회)`);
  if (timings) {
    lines.push('', '## 드라이브 요청 시간');
    lines.push(`- 성공 ${timings.count}회, 실패 ${timings.errors}회, 평균 ${timings.avg}ms, 중앙값 ${timings.p50}ms, 95% ${timings.p95}ms, 최대 ${timings.max}ms`);
  }
  if (burst) {
    lines.push('', '## 연속 저장');
    lines.push(`- ${burst.done}/${burst.total}회 저장, 평균 ${burst.avg}ms, 최대 ${burst.max}ms, 오류 ${burst.errors}회${burst.lastError ? ` (${burst.lastError})` : ''}`);
  }
  return lines.join('\n');
}
