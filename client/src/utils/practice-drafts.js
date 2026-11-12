const PREFIX = 'vpylab:practice:v1:';
const INDEX = `${PREFIX}index`;
const MAX_CODE_BYTES = 50 * 1024;
const MAX_CONTEXTS = 24;
const storageOf = storage => storage || globalThis.sessionStorage;
const keyOf = context => `${PREFIX}guest:${encodeURIComponent(context)}`;

// 이 탭의 연습 초안입니다. 드라이브 파일·팀 프로젝트의 저장과는 별도로 보관합니다.
export function readPracticeDraft(context, storage) {
  if (!context) return null;
  try {
    const data = JSON.parse(storageOf(storage).getItem(keyOf(context)) || 'null');
    if (data?.version !== 1 || typeof data.code !== 'string' || new TextEncoder().encode(data.code).length > MAX_CODE_BYTES) return null;
    return data.code;
  } catch { return null; }
}

export function writePracticeDraft(context, code, baseline, storage) {
  if (!context) return true;
  try {
    const target = storageOf(storage), key = keyOf(context);
    if (code === baseline) { target.removeItem(key); return true; }
    if (typeof code !== 'string' || new TextEncoder().encode(code).length > MAX_CODE_BYTES) return false;
    const raw = JSON.parse(target.getItem(INDEX) || '[]');
    const keys = Array.isArray(raw) ? raw.filter(value => typeof value === 'string' && value.startsWith(PREFIX) && value !== key) : [];
    keys.push(key);
    while (keys.length > MAX_CONTEXTS) target.removeItem(keys.shift());
    target.setItem(key, JSON.stringify({version:1,code,savedAt:Date.now()}));
    target.setItem(INDEX, JSON.stringify(keys));
    return true;
  } catch { return false; }
}
