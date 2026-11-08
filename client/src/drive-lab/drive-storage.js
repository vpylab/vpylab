// 구글 드라이브 저장 어댑터 (drive.file 범위)
//
// 브라우저가 구글 API와 직접 통신합니다. VPyLab 운영 서버는 학생 코드를 받지 않습니다.
// 다른 저장소(예: OneDrive)를 붙일 수 있도록 아래 메서드 이름을 저장소 어댑터의 약속으로 둡니다.
//   list() · create() · open() · save() · revisions() · revisionContent() · trash()

const API = 'https://www.googleapis.com/drive/v3';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3';
const FOLDER_MIME = 'application/vnd.google-apps.folder';
const CODE_MIME = 'text/x-python';
const FILE_FIELDS = 'id,name,mimeType,modifiedTime,version,headRevisionId,appProperties,trashed,size';
/** 앱이 만든 폴더 표식. 학생이 폴더를 옮기거나 이름을 바꿔도 같은 폴더를 찾습니다. */
const ROOT_MARK = { key: 'vpylabRoot', value: '1' };

export const DEFAULT_FOLDER_NAME = 'VPyLab';
export const MAX_CODE_BYTES = 100 * 1024; // 기존 서버 상한(server/routes/projects.js)과 같게 둡니다.
export const MAX_LIST_PAGES = 10; // 목록은 최대 1,000개까지 읽습니다.
export const DEFAULT_TIMEOUT_MS = 20_000;

export class DriveError extends Error {
  constructor(message, { status = 0, reason = 'unknown', detail = null } = {}) {
    super(message);
    this.name = 'DriveError';
    this.status = status;
    this.reason = reason;
    this.detail = detail;
  }
}

/** 구글 API 오류 응답을 화면에서 구분할 수 있는 이유로 바꿉니다. */
export function classifyError(status, body) {
  const reasons = (body?.error?.errors || []).map((e) => e.reason).filter(Boolean);
  const message = body?.error?.message || '';
  if (status === 401) return 'auth';
  if (status === 429) return 'rate';
  if (status === 403) {
    // 저장 공간 부족(storageQuotaExceeded)은 기다려도 풀리지 않으므로 속도 제한보다 먼저 가립니다.
    if (reasons.some((r) => /storageQuotaExceeded/i.test(r))) return 'storageFull';
    if (reasons.some((r) => /rateLimit|userRateLimitExceeded|quotaExceeded/i.test(r))) return 'rate';
    if (/rate limit/i.test(message)) return 'rate';
    if (reasons.some((r) => /domainPolicy|accessNotConfigured|appNotInstalled/i.test(r))) return 'policy';
    if (reasons.some((r) => /insufficientPermissions|insufficientFilePermissions|appNotAuthorizedToFile/i.test(r))) return 'scope';
    return 'forbidden';
  }
  if (status === 404) return 'notFound';
  if (status === 412) return 'precondition';
  if (status >= 500) return 'server';
  return 'unknown';
}

const RETRYABLE = new Set(['rate', 'server']);

/** 지수 백오프 대기 시간: min(2^n초 + 무작위 1초 이내, 상한) */
export function backoffDelay(attempt, random = Math.random, maxMs = 32_000) {
  return Math.min(2 ** attempt * 1000 + Math.floor(random() * 1000), maxMs);
}

/** Retry-After 헤더(초 또는 HTTP 날짜)를 밀리초로 바꿉니다. 없거나 이상하면 null. */
export function retryAfterMs(value, now = Date.now()) {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(seconds * 1000, 60_000);
  const date = Date.parse(value);
  if (Number.isNaN(date)) return null;
  return Math.max(0, Math.min(date - now, 60_000));
}

export function escapeQuery(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

export function byteLength(text) {
  return new TextEncoder().encode(text).length;
}

/** 코드 내용의 SHA-256(16진수). 같은 내용을 두 기기가 저장한 경우를 충돌로 보지 않기 위해 사용합니다. */
export async function contentHash(text) {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function multipartBody(metadata, content, boundary) {
  return [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify(metadata),
    `--${boundary}`,
    `Content-Type: ${CODE_MIME}; charset=UTF-8`,
    '',
    content,
    `--${boundary}--`,
    '',
  ].join('\r\n');
}

/** 코드 안에 같은 문자열이 없는 multipart 경계를 고릅니다. */
export function pickBoundary(content, random = Math.random) {
  for (let i = 0; i < 10; i += 1) {
    const boundary = `vpylab-${Math.floor(random() * 1e12).toString(36)}-${i}`;
    if (!content.includes(boundary)) return boundary;
  }
  throw new DriveError('업로드 경계를 만들지 못했습니다.', { reason: 'unknown' });
}

/** 파일 이름 정리: 경로 구분자와 제어 문자를 지우고 .py를 붙입니다. */
export function normalizeFileName(name) {
  // 제어 문자는 드라이브 파일 이름에서 지웁니다(의도한 제어 문자 범위).
  // eslint-disable-next-line no-control-regex
  const cleaned = String(name || '').replace(/[\\/\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120) || '이름 없음';
  return cleaned.toLowerCase().endsWith('.py') ? cleaned : `${cleaned}.py`;
}

/**
 * @param {object} options
 * @param {() => Promise<string>|string} options.getToken 유효한 액세스 토큰을 돌려줍니다. 없으면 오류를 던집니다.
 * @param {typeof fetch} [options.fetchImpl]
 * @param {(ms:number) => Promise<void>} [options.sleep]
 * @param {(entry:object) => void} [options.onRequest] 요청마다 기록(방법·종류·상태·걸린 시간)을 받습니다.
 * @param {number} [options.maxRetries]
 * @param {number} [options.timeoutMs] 응답이 없는 요청을 끊는 시간
 * @param {string} [options.folderName]
 * @param {() => number} [options.random]
 */
export function createDriveStorage({
  getToken,
  fetchImpl = (...args) => globalThis.fetch(...args),
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  onRequest = () => {},
  maxRetries = 4,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  folderName = DEFAULT_FOLDER_NAME,
  random = Math.random,
} = {}) {
  let folderPromise = null;

  /**
   * 구글 API 요청 한 번. 시간 제한은 응답 본문을 다 읽을 때까지 걸립니다.
   * retry=false인 요청(파일 만들기)은 5xx·속도 제한에서 다시 보내지 않고 호출한 쪽이 판단합니다.
   */
  async function request(kind, url, init = {}, { raw = false, retry = true } = {}) {
    for (let attempt = 0; ; attempt += 1) {
      const token = await getToken();
      const started = performance.now();
      const controller = typeof AbortController === 'function' ? new AbortController() : null;
      const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
      let status = 0;
      let outcome;
      try {
        const response = await fetchImpl(url, {
          ...init,
          signal: controller?.signal,
          headers: { ...(init.headers || {}), Authorization: `Bearer ${token}` },
        });
        status = response.status;
        if (response.ok) {
          const value = response.status === 204 ? null : await (raw ? response.text() : response.json());
          outcome = { ok: true, value };
        } else {
          let body = null;
          try { body = await response.json(); } catch (error) { if (error?.name === 'AbortError') throw error; }
          outcome = { ok: false, body, retryAfter: response.headers?.get?.('Retry-After') };
        }
      } catch (error) {
        const timedOut = error?.name === 'AbortError';
        onRequest({ kind, method: init.method || 'GET', status: 0, ms: Math.round(performance.now() - started), attempt });
        // 쓰기 요청은 서버에 반영됐는지 알 수 없으므로 다시 보내지 않습니다. 화면이 버전 확인으로 이어 갑니다.
        throw new DriveError(timedOut ? '구글 응답이 너무 늦습니다.' : '네트워크 연결에 실패했습니다.', {
          reason: timedOut ? 'timeout' : 'network', detail: String(error?.message || error),
        });
      } finally {
        clearTimeout(timer);
      }
      onRequest({ kind, method: init.method || 'GET', status, ms: Math.round(performance.now() - started), attempt });
      if (outcome.ok) return outcome.value;
      const reason = classifyError(status, outcome.body);
      if (retry && RETRYABLE.has(reason) && attempt < maxRetries) {
        await sleep(retryAfterMs(outcome.retryAfter) ?? backoffDelay(attempt, random));
        continue;
      }
      throw new DriveError(outcome.body?.error?.message || `드라이브 요청 실패 (${status})`, {
        status, reason, detail: outcome.body,
      });
    }
  }

  async function findMarked(key, value, fields = 'files(id,name,createdTime)') {
    const q = `trashed=false and appProperties has { key='${escapeQuery(key)}' and value='${escapeQuery(value)}' }`;
    const found = await request('file.findMarked', `${API}/files?${new URLSearchParams({
      q, spaces: 'drive', fields, orderBy: 'createdTime', pageSize: '10',
    })}`);
    return found.files || [];
  }

  async function findOrCreateFolder() {
    const existing = (await findMarked(ROOT_MARK.key, ROOT_MARK.value)).filter((f) => !f.mimeType || f.mimeType === FOLDER_MIME);
    if (existing.length) return existing[0].id;
    const created = await request('folder.create', `${API}/files?fields=id`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: folderName, mimeType: FOLDER_MIME, appProperties: { [ROOT_MARK.key]: ROOT_MARK.value } }),
    });
    // 두 기기가 처음에 동시에 폴더를 만들었으면 가장 먼저 만든 폴더로 맞추고, 내가 만든 빈 폴더는 휴지통으로 옮깁니다.
    try {
      const all = await findMarked(ROOT_MARK.key, ROOT_MARK.value);
      if (all.length && all[0].id !== created.id) {
        await request('folder.trashDuplicate', `${API}/files/${encodeURIComponent(created.id)}?fields=id`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trashed: true }),
        }).catch(() => {});
        return all[0].id;
      }
    } catch { /* 확인 실패는 무시하고 내가 만든 폴더를 씁니다. */ }
    return created.id;
  }

  function ensureFolder() {
    if (!folderPromise) {
      folderPromise = findOrCreateFolder().catch((error) => {
        folderPromise = null;
        throw error;
      });
    }
    return folderPromise;
  }

  async function getMeta(id) {
    return request('file.meta', `${API}/files/${encodeURIComponent(id)}?fields=${FILE_FIELDS}`);
  }

  async function getContent(id) {
    return request('file.content', `${API}/files/${encodeURIComponent(id)}?alt=media`, {}, { raw: true });
  }

  async function getRevisionContent(id, revisionId) {
    return request(
      'file.revisionContent',
      `${API}/files/${encodeURIComponent(id)}/revisions/${encodeURIComponent(revisionId)}?alt=media`,
      {},
      { raw: true },
    );
  }

  /** 메타데이터와 같은 버전의 내용을 읽습니다. 버전 기록으로 받지 못하면 현재 내용을 받습니다. */
  async function contentOf(meta) {
    if (meta.headRevisionId) {
      try { return await getRevisionContent(meta.id, meta.headRevisionId); } catch (error) {
        if (!(error instanceof DriveError) || !['notFound', 'forbidden', 'scope'].includes(error.reason)) throw error;
      }
    }
    return getContent(meta.id);
  }

  async function listRevisionIds(id) {
    const ids = [];
    let pageToken = '';
    for (let page = 0; page < MAX_LIST_PAGES; page += 1) {
      const params = new URLSearchParams({ fields: 'nextPageToken,revisions(id)', pageSize: '200' });
      if (pageToken) params.set('pageToken', pageToken);
      const result = await request('file.revisionIds', `${API}/files/${encodeURIComponent(id)}/revisions?${params}`);
      ids.push(...(result.revisions || []).map((r) => r.id));
      pageToken = result.nextPageToken || '';
      if (!pageToken) break;
    }
    return ids;
  }

  function checkSize(code) {
    if (byteLength(code) > MAX_CODE_BYTES) {
      throw new DriveError('코드가 100KB를 넘습니다.', { reason: 'tooLarge' });
    }
  }

  async function upload(kind, url, method, metadata, code, options) {
    const boundary = pickBoundary(code, random);
    return request(kind, url, {
      method,
      headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
      body: multipartBody(metadata, code, boundary),
    }, options);
  }

  return {
    kind: 'google-drive',
    ensureFolder,

    /** 폴더 안의 파일 목록. 1,000개를 넘으면 truncated=true로 알립니다. */
    async list() {
      const parent = await ensureFolder();
      const files = [];
      let pageToken = '';
      for (let page = 0; page < MAX_LIST_PAGES; page += 1) {
        const params = new URLSearchParams({
          q: `'${escapeQuery(parent)}' in parents and trashed=false and mimeType!='${FOLDER_MIME}'`,
          spaces: 'drive',
          orderBy: 'modifiedTime desc',
          pageSize: '100',
          fields: `nextPageToken,files(${FILE_FIELDS})`,
        });
        if (pageToken) params.set('pageToken', pageToken);
        const result = await request('file.list', `${API}/files?${params}`);
        files.push(...(result.files || []));
        pageToken = result.nextPageToken || '';
        if (!pageToken) break;
      }
      return { files, truncated: Boolean(pageToken) };
    },

    /**
     * 새 파일을 만듭니다. 만들기 요청은 자동으로 다시 보내지 않습니다.
     * 5xx·속도 제한·시간 초과 뒤에는 만들기 표식(vpylabCreateId)으로 이미 만들어졌는지 확인하고, 없을 때만 다시 보냅니다.
     */
    async create({ name, code, deviceId }) {
      checkSize(code);
      const parent = await ensureFolder();
      const createId = `${Date.now().toString(36)}-${Math.floor(random() * 1e12).toString(36)}`;
      const metadata = {
        name: normalizeFileName(name),
        parents: [parent],
        mimeType: CODE_MIME,
        appProperties: { vpylabDevice: deviceId || '', vpylabHash: await contentHash(code), vpylabCreateId: createId },
      };
      const url = `${UPLOAD}/files?uploadType=multipart&fields=${FILE_FIELDS}`;
      for (let attempt = 0; ; attempt += 1) {
        try {
          return await upload('file.create', url, 'POST', metadata, code, { retry: false });
        } catch (error) {
          const uncertain = error instanceof DriveError && ['rate', 'server', 'timeout', 'network'].includes(error.reason);
          if (!uncertain || attempt >= maxRetries) throw error;
          if (error.reason !== 'rate') {
            const already = await findMarked('vpylabCreateId', createId, `files(${FILE_FIELDS})`).catch(() => []);
            if (already.length) return already[0];
          }
          await sleep(backoffDelay(attempt, random));
        }
      }
    },

    /** 메타데이터와 그 버전의 내용을 함께 읽습니다. 둘이 같은 버전이라 다음 저장의 충돌 판정이 정확합니다. */
    async open(id) {
      const meta = await getMeta(id);
      const code = await contentOf(meta);
      return { meta, code };
    },

    /**
     * 기준 버전(baseVersion)과 드라이브의 현재 버전이 다르면 내용을 직접 비교합니다.
     *   - 드라이브 내용이 내 코드와 같으면 unchanged
     *   - 드라이브 내용이 기준 내용 가운데 하나와 같으면 그대로 저장합니다.
     *     기준 내용: 연 때의 내용(baseCode), 시간 초과로 결과를 모르는 지난 저장 시도(attemptedCodes)
     *     이름 변경처럼 내용은 그대로이고 버전만 오른 경우, 내 지난 저장이 실제로는 반영된 경우가 여기에 해당합니다.
     *   - 그 밖에는 conflict. 기준 내용을 모르면(초안 복원) 항상 conflict입니다.
     * 쓰기는 자동으로 다시 보내지 않습니다. 서버 오류·시간 초과 뒤에는 실제로 반영됐는지 확인하고, 아니면 한 번 더 보냅니다.
     * 드라이브 v3에는 조건부 쓰기가 없어 확인과 쓰기 사이에 짧은 틈이 남습니다.
     * 그래서 쓴 뒤 버전 기록을 보고, 내 버전 바로 앞이 확인했던 버전이 아니면 overwritten으로 알립니다.
     */
    async save({ id, code, baseVersion, baseCode, attemptedCodes = [], deviceId, force = false, expectVersion = null, verify = true }) {
      checkSize(code);
      if (force && expectVersion == null) {
        throw new DriveError('덮어쓰기에는 사용자가 본 버전(expectVersion)이 필요합니다.', { reason: 'unknown' });
      }
      const hash = await contentHash(code);
      const current = await getMeta(id);
      // 덮어쓰기(force)는 사용자가 충돌 화면에서 본 버전(expectVersion)일 때만 합니다. 그 뒤 또 저장됐으면 다시 충돌로 보여 줍니다.
      if (force && String(current.version) !== String(expectVersion)) {
        return { status: 'conflict', remote: { meta: current, code: await contentOf(current) } };
      }
      if (!force && String(current.version) !== String(baseVersion)) {
        const remoteCode = await contentOf(current);
        if (remoteCode === code) return { status: 'unchanged', meta: current };
        const accepted = [baseCode, ...attemptedCodes].filter((c) => typeof c === 'string');
        if (!accepted.includes(remoteCode)) {
          return { status: 'conflict', remote: { meta: current, code: remoteCode } };
        }
      }
      const url = `${UPLOAD}/files/${encodeURIComponent(id)}?uploadType=multipart&fields=${FILE_FIELDS}`;
      const metadata = { appProperties: { vpylabDevice: deviceId || '', vpylabHash: hash } };
      let meta = null;
      for (let attempt = 0; !meta; attempt += 1) {
        try {
          meta = await upload('file.save', url, 'PATCH', metadata, code, { retry: false });
        } catch (error) {
          const uncertain = error instanceof DriveError && ['rate', 'server', 'timeout', 'network'].includes(error.reason);
          if (!uncertain || attempt >= Math.min(maxRetries, 2)) throw error;
          if (error.reason !== 'rate') {
            // 응답만 잃고 쓰기는 반영됐을 수 있습니다. 같은 내용이 새 버전으로 올라가 있으면 다시 보내지 않습니다.
            const after = await getMeta(id).catch(() => null);
            if (after && after.headRevisionId !== current.headRevisionId && after.appProperties?.vpylabHash === hash) {
              meta = after;
              break;
            }
            // 그사이 다른 기기가 저장했다면 다시 보내지 않고 충돌로 돌려줍니다.
            if (after && String(after.version) !== String(current.version)) {
              const remoteCode = await contentOf(after);
              if (remoteCode === code) return { status: 'unchanged', meta: after };
              return { status: 'conflict', remote: { meta: after, code: remoteCode } };
            }
          }
          await sleep(backoffDelay(attempt, random));
        }
      }
      if (!verify || !current.headRevisionId || !meta.headRevisionId) return { status: 'saved', meta, verified: false, overwritten: null };
      let overwritten = null;
      try {
        const ids = await listRevisionIds(id);
        const mine = ids.lastIndexOf(meta.headRevisionId);
        const previous = mine > 0 ? ids[mine - 1] : null;
        // 버전 기록이 정리되어 확인했던 버전이 사라진 경우는 판단하지 않습니다.
        if (previous && previous !== current.headRevisionId && ids.includes(current.headRevisionId)) {
          overwritten = { revisionId: previous };
        }
      } catch {
        return { status: 'saved', meta, verified: false, overwritten: null };
      }
      return { status: 'saved', meta, verified: true, overwritten };
    },

    async revisions(id) {
      const revisions = [];
      let pageToken = '';
      for (let page = 0; page < MAX_LIST_PAGES; page += 1) {
        const params = new URLSearchParams({
          fields: 'nextPageToken,revisions(id,modifiedTime,size,keepForever,lastModifyingUser(displayName))',
          pageSize: '200',
        });
        if (pageToken) params.set('pageToken', pageToken);
        const result = await request('file.revisions', `${API}/files/${encodeURIComponent(id)}/revisions?${params}`);
        revisions.push(...(result.revisions || []));
        pageToken = result.nextPageToken || '';
        if (!pageToken) break;
      }
      return revisions;
    },

    revisionContent: getRevisionContent,

    async trash(id) {
      return request('file.trash', `${API}/files/${encodeURIComponent(id)}?fields=id,trashed`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trashed: true }),
      });
    },
  };
}
