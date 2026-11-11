/**
 * GitHub 팀 프로젝트 애드온의 GitHub API 모듈 (오픈소스 판).
 *
 * 브라우저가 api.github.com을 직접 호출합니다. VPyLab 운영 서버와 DB는 거치지 않습니다.
 * 수업용 판의 서버(server/routes/projects.js)가 실전에서 다듬은 동작을 옮겨 적었습니다.
 *   - 새 저장소의 첫 커밋: 준비가 늦는 저장소 재시도, 빈 저장소는 Contents API로 첫 파일을 만든 뒤 맞춤
 *   - 저장: 파일 여러 개를 한 커밋으로 올리고, 브랜치(ref) 갱신이 충돌하면 강제로 밀지 않음
 *   - GitHub Pages 켜기 재시도, 2단계 인증 요구 구분, 저장소·사용자 이름 검증
 * Supabase(로그인, vpylab_* 테이블)와 관련된 부분은 옮기지 않았습니다.
 *
 * 프로젝트 = 공개 저장소 하나. topic `vpylab-project`가 붙은 저장소를 VPyLab 프로젝트로 봅니다.
 * 이 모듈은 fetch와 토큰을 주입받는 순수 모듈이며 화면 상태를 갖지 않습니다.
 */

const API = 'https://api.github.com';

export const PROJECT_TOPIC = 'vpylab-project';
export const MAX_CODE_BYTES = 100 * 1024; // 서버 상한(server/routes/projects.js)과 같습니다.
export const MAX_HISTORY_BYTES = 256 * 1024;
export const MAX_HTML_BYTES = 1024 * 1024;
export const DEFAULT_TIMEOUT_MS = 20_000;
export const PAGES_TIMEOUT_MS = 8_000;
/** 읽기 요청만 네트워크 오류·5xx에서 다시 보냅니다. 쓰기는 아래 세 가지 경우에만 다시 시도합니다. */
export const READ_RETRY_DELAYS_MS = [400, 1200];
export const COMMIT_RETRY_DELAYS_MS = [200, 500, 1200];
export const REPO_READY_RETRY_DELAYS_MS = [500, 1500, 3000, 5000];
export const PAGES_ENABLE_RETRY_DELAYS_MS = [0, 1000, 2500, 5000, 9000];
export const MAX_LIST_PAGES = 5; // 저장소 목록은 최대 500개까지 읽습니다.
const MAX_INVITATION_LOOKUPS = 20;

/**
 * reason: auth(401, 토큰 무효) · forbidden · twoFactor · notFound · rate · conflict · network · timeout ·
 *         tooLarge · invalidName · readOnly(쓰기 권한 없음) · empty(빈 코드) · rejected(422) · server(5xx) · unknown
 * detail: 같은 reason 안에서 경우를 나누는 짧은 표시(예: invalidName의 'repo' | 'username' | 'taken').
 */
export class GitHubError extends Error {
  constructor(message, { status = 0, reason = 'unknown', detail = '', githubErrors = null } = {}) {
    super(message);
    this.name = 'GitHubError';
    this.status = status;
    this.reason = reason;
    this.detail = detail;
    this.githubErrors = githubErrors;
  }
}

// ── 글자·이름 도우미 ─────────────────────────────────────────

export function byteLength(text) {
  return new TextEncoder().encode(String(text)).length;
}

export function encodeBase64Utf8(text) {
  const bytes = new TextEncoder().encode(String(text));
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

export function decodeBase64Utf8(content) {
  const binary = atob(String(content || '').replace(/\s+/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

async function sha1Hex(text) {
  const digest = await globalThis.crypto.subtle.digest('SHA-1', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

function asciiSlug(value, maxLength) {
  return String(value)
    .normalize('NFKD')
    .toLowerCase()
    // eslint-disable-next-line no-control-regex
    .replace(/[^\x00-\x7F]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, maxLength)
    .replace(/-$/g, '');
}

/** 제목에서 저장소 이름을 만듭니다. 한글 제목은 영어 글자가 남지 않으므로 제목 해시 6자를 붙여 구분합니다. */
export async function sanitizeRepoName(title) {
  const rawTitle = String(title || 'project');
  const base = asciiSlug(rawTitle, 32) || 'project';
  return `${base}-${(await sha1Hex(rawTitle)).slice(0, 6)}`;
}

/** 사용자가 직접 입력한 저장소 이름: 영어 소문자·숫자·하이픈만 남깁니다. 남는 글자가 없으면 빈 문자열. */
export function normalizeRepoNameInput(name) {
  return asciiSlug(name || '', 50);
}

export function sanitizeGithubUsername(username) {
  const trimmed = String(username || '').trim().replace(/^@/, '');
  return /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/.test(trimmed) ? trimmed : '';
}

export function parseRepoFullName(fullName) {
  if (!fullName || typeof fullName !== 'string') return null;
  const match = fullName.match(/^([A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?)\/([A-Za-z0-9._-]{1,100})$/);
  return match ? { owner: match[1], repo: match[2] } : null;
}

export function pagesUrlOf(owner, repo) {
  return `https://${String(owner).toLowerCase()}.github.io/${repo}/`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** 한 줄 글자: 제어 문자와 줄바꿈을 지우고 길이를 줄입니다(저장소 설명, 커밋 메시지 첫 줄). */
function oneLine(value, maxLength) {
  // eslint-disable-next-line no-control-regex
  return String(value ?? '').replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

/** 기록 글자: 마크다운 제목 표시(#)를 지워 history.md의 구조가 깨지지 않게 합니다. */
export function sanitizeRecordText(value, maxLength = 500) {
  if (typeof value !== 'string') return '';
  return value.replace(/^[ \t]*#{1,6}\s+/gm, '').replace(/\s*\n\s*/g, ' ').slice(0, maxLength).trim();
}

/** 선택 기록 세 칸(한 일·막힌 점·다음 할 일)을 정리합니다. 모두 비었으면 null. */
export function cleanRecord(record) {
  if (!record || typeof record !== 'object') return null;
  const cleaned = {
    did: sanitizeRecordText(record.did),
    blocker: sanitizeRecordText(record.blocker),
    next: sanitizeRecordText(record.next),
  };
  return cleaned.did || cleaned.blocker || cleaned.next ? cleaned : null;
}

const pad = (n) => String(n).padStart(2, '0');
/** 기록에 적는 시각. 팀원이 같은 교실에 있으므로 저장한 사람의 현지 시각으로 적습니다. */
export function formatLocalTimestamp(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// ── 저장소에 넣는 파일 내용 ───────────────────────────────────

export function generateReadme({ title, owner, repo }) {
  return `# ${oneLine(title, 200) || repo}

VPyLab에서 만든 3D 파이썬 프로젝트입니다.

## 바로 가기

- [실행 화면(GitHub Pages)](${pagesUrlOf(owner, repo)})
- [저장소](https://github.com/${owner}/${repo})

프로젝트를 만든 직후에는 실행 화면이 준비되는 데 1~2분이 걸립니다.

## 파일

- \`main.py\`: 최신 코드입니다. 저장할 때마다 바뀝니다.
- \`history.md\`: 저장한 시각, 메시지, 작성자를 기록합니다.
- \`index.html\`: 실행 화면입니다. 저장할 때마다 새로 만듭니다.

## 저장 기록

[Commits](https://github.com/${owner}/${repo}/commits)에서 저장할 때마다 바뀐 내용을 확인할 수 있습니다.

VPyLab은 파이썬으로 3D 장면을 만드는 교육용 도구입니다.
`;
}

const HISTORY_HEADER = '# 저장 기록\n\n';

function historySection(entry, now) {
  const record = cleanRecord(entry.record);
  const lines = [`## ${formatLocalTimestamp(now)}`, ''];
  lines.push(`- 메시지: ${oneLine(entry.message, 200) || '저장'}`);
  lines.push(`- 작성자: ${oneLine(entry.author, 60) || '익명'}`);
  if (record?.did) lines.push(`- 한 일: ${record.did}`);
  if (record?.blocker) lines.push(`- 막힌 점: ${record.blocker}`);
  if (record?.next) lines.push(`- 다음 할 일: ${record.next}`);
  if (Number.isFinite(entry.codeLines)) {
    const delta = Number.isFinite(entry.lineDelta) ? ` (${entry.lineDelta >= 0 ? '+' : ''}${entry.lineDelta})` : '';
    lines.push(`- 코드: ${entry.codeLines}줄${delta}`);
  }
  return `${lines.join('\n')}\n`;
}

export function generateInitialHistory(title, author, now = new Date()) {
  const name = oneLine(title, 100).replace(/`/g, "'");
  return `${HISTORY_HEADER}\`${name}\` 프로젝트를 저장한 기록입니다. 새 기록이 위에 추가됩니다.

---

${historySection({ message: '프로젝트 시작', author }, now)}`;
}

/** history.md에 새 기록을 끼웁니다(최신이 위). 파일이 너무 커지면 오래된 절반을 버립니다. */
export function appendHistorySection(previous, entry, now = new Date()) {
  let prev = typeof previous === 'string' && previous ? previous : HISTORY_HEADER;
  if (prev.length > MAX_HISTORY_BYTES) prev = prev.slice(0, Math.floor(MAX_HISTORY_BYTES / 2));
  const section = `${historySection(entry, now)}\n`;
  if (!prev.startsWith('# ')) return section + prev;
  const index = prev.indexOf('---\n');
  if (index >= 0) return `${prev.slice(0, index + 4)}\n${section}${prev.slice(index + 4).replace(/^\n+/, '')}`;
  return `${prev.replace(/\n*$/, '\n')}\n---\n\n${section}`;
}

/** 실행형 HTML을 만들지 못했을 때 쓰는 정적 화면(코드와 링크만 보여 줍니다). */
export function generateFallbackHtml({ title, code, owner, repo, openUrl }) {
  const safeOpenUrl = typeof openUrl === 'string' && /^https?:\/\//.test(openUrl) ? openUrl : '';
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} | VPyLab</title>
  <style>
    *{box-sizing:border-box}
    body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;max-width:760px;margin:32px auto;padding:0 20px;color:#0f172a;line-height:1.6;background:#fafafa}
    h1{margin:0 0 8px;font-size:1.8rem}
    .muted{color:#64748b}
    .actions{margin:20px 0;display:flex;gap:12px;flex-wrap:wrap}
    .btn{display:inline-flex;align-items:center;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600;font-size:0.95rem;background:#fff;color:#0969da;border:1px solid #d0d7de}
    .btn--primary{background:#2da44e;color:#fff;border-color:#2da44e}
    pre{background:#0d1117;color:#e6edf3;border-radius:10px;padding:18px;overflow:auto;font-size:0.9rem;line-height:1.5}
    code{font-family:'JetBrains Mono','SF Mono',Menlo,monospace}
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p class="muted">VPyLab에서 만든 3D 파이썬 프로젝트입니다.</p>
  <div class="actions">
    ${safeOpenUrl ? `<a class="btn btn--primary" href="${escapeHtml(safeOpenUrl)}" target="_blank" rel="noopener">VPyLab에서 이 코드 열기</a>` : ''}
    <a class="btn" href="https://github.com/${owner}/${repo}" target="_blank" rel="noopener">GitHub 저장소</a>
    <a class="btn" href="https://github.com/${owner}/${repo}/commits" target="_blank" rel="noopener">저장 기록</a>
  </div>
  <h2>코드</h2>
  <pre><code>${escapeHtml(code)}</code></pre>
</body>
</html>
`;
}

// ── 오류 분류 ────────────────────────────────────────────────

export function isTwoFactorRequired(message, githubErrors) {
  const text = [
    message,
    ...(Array.isArray(githubErrors) ? githubErrors.map((item) => `${item?.message || ''} ${item?.code || ''}`) : []),
  ].filter(Boolean).join(' ');
  return /two[-\s]?factor|2FA|2-factor|2단계 인증|2요소 인증|enable two-factor|restricted from account actions/i.test(text);
}

export function classifyGitHubError(status, body, headers) {
  const message = String(body?.message || '');
  if (status === 401) return 'auth';
  if (status === 429) return 'rate';
  if (status === 403) {
    if (isTwoFactorRequired(message, body?.errors)) return 'twoFactor';
    if (headers?.get?.('x-ratelimit-remaining') === '0' || /rate limit|abuse detection/i.test(message)) return 'rate';
    return 'forbidden';
  }
  if (status === 404) return 'notFound';
  if (status === 409) return 'conflict';
  if (status === 413) return 'tooLarge';
  if (status === 422) return 'rejected';
  if (status >= 500) return 'server';
  return 'unknown';
}

/** 새 저장소는 GitHub 안에서 준비가 늦을 수 있습니다. 아래 신호는 잠시 뒤 다시 시도합니다. */
export function isRepoStillPreparing(error) {
  if (!error) return false;
  if (error.status === 404 || error.status === 409) return true;
  const message = String(error.message || '').toLowerCase();
  if (message.includes('git repository is empty') || message.includes('repository is empty')) return true;
  return error.status === 422 && message.includes('reference');
}

function isEmptyRepoError(error) {
  const message = String(error?.message || '').toLowerCase();
  return error?.status === 404 || error?.status === 409
    || message.includes('git repository is empty') || message.includes('repository is empty');
}

function isRefConflict(error) {
  return error?.status === 409 || (error?.status === 422 && /fast.?forward|reference update failed/i.test(error.message || ''));
}

function isRetryablePagesError(error) {
  if (error?.detail === 'pagesSourceMismatch') return false;
  const text = [
    error?.message,
    ...(Array.isArray(error?.githubErrors) ? error.githubErrors.map((item) => `${item?.message || ''} ${item?.code || ''}`) : []),
  ].filter(Boolean).join(' ').toLowerCase();
  if ([404, 409, 422, 503, 504].includes(error?.status)) return true;
  return /not ready|not yet|pending|building|repository is empty|git repository is empty|pages is not enabled|page build/i.test(text);
}

/** Pages를 켜지 못한 까닭: auth · twoFactor · forbidden · sourceMismatch · pending */
export function pagesWarningOf(error) {
  if (!error) return null;
  if (error.detail === 'pagesSourceMismatch') return 'sourceMismatch';
  if (error.reason === 'auth') return 'auth';
  if (error.reason === 'twoFactor') return 'twoFactor';
  if (error.status === 403) return 'forbidden';
  return 'pending';
}

// ── API ──────────────────────────────────────────────────────

/**
 * @param {object} options
 * @param {() => Promise<string>|string} options.getToken GitHub 액세스 토큰. 없으면 빈 값을 돌려주거나 오류를 던집니다.
 * @param {typeof fetch} [options.fetchImpl]
 * @param {(ms:number) => Promise<void>} [options.sleep]
 * @param {() => Date} [options.now]
 * @param {() => string} [options.randomSuffix] 저장소 이름이 겹칠 때 붙이는 6자
 * @param {number} [options.timeoutMs]
 */
export function createGitHubApi({
  getToken,
  fetchImpl = (...args) => globalThis.fetch(...args),
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  now = () => new Date(),
  randomSuffix = () => globalThis.crypto.randomUUID().slice(0, 6),
  timeoutMs = DEFAULT_TIMEOUT_MS,
} = {}) {
  /** GitHub 요청 한 번. 시간 제한은 응답 본문을 다 읽을 때까지 걸립니다. 토큰은 오류에 넣지 않습니다. */
  async function requestOnce(url, { method, body, limitMs }) {
    let token = '';
    try { token = await getToken(); } catch { token = ''; }
    if (!token) throw new GitHubError('GitHub 연결이 필요합니다.', { status: 401, reason: 'auth' });
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), limitMs) : null;
    let response;
    let text;
    try {
      response = await fetchImpl(url, {
        method,
        signal: controller?.signal,
        // 브라우저가 api.github.com 응답을 60초 동안 기억하면 브랜치의 최신 커밋을 잘못 읽습니다.
        ...(method === 'GET' ? { cache: 'no-store' } : {}),
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      text = await response.text();
    } catch (error) {
      const timedOut = error?.name === 'AbortError';
      throw new GitHubError(timedOut ? 'GitHub 응답이 너무 늦습니다.' : '네트워크 연결에 실패했습니다.', {
        reason: timedOut ? 'timeout' : 'network',
      });
    } finally {
      clearTimeout(timer);
    }
    let data = {};
    if (text) {
      try { data = JSON.parse(text); } catch { data = { message: text.slice(0, 200) }; }
    }
    if (!response.ok) {
      throw new GitHubError(data?.message || `GitHub API ${response.status}`, {
        status: response.status,
        reason: classifyGitHubError(response.status, data, response.headers),
        githubErrors: Array.isArray(data?.errors) ? data.errors : null,
      });
    }
    return data;
  }

  async function request(path, { method = 'GET', body, limitMs = timeoutMs, retry = method === 'GET' } = {}) {
    const delays = retry ? READ_RETRY_DELAYS_MS : [];
    for (let attempt = 0; ; attempt += 1) {
      try {
        return await requestOnce(`${API}${path}`, { method, body, limitMs });
      } catch (error) {
        const retryable = error instanceof GitHubError && (error.reason === 'network' || error.reason === 'server');
        if (!retryable || attempt >= delays.length) throw error;
        await sleep(delays[attempt]);
      }
    }
  }

  function parse(fullName) {
    const parsed = parseRepoFullName(fullName);
    if (!parsed) throw new GitHubError('저장소 이름이 올바르지 않습니다.', { status: 400, reason: 'invalidName', detail: 'fullName' });
    return parsed;
  }

  function assertCode(code) {
    if (typeof code !== 'string' || !code.trim()) throw new GitHubError('코드가 비어 있습니다.', { status: 400, reason: 'empty' });
    if (byteLength(code) > MAX_CODE_BYTES) throw new GitHubError('코드가 100KB를 넘습니다.', { status: 413, reason: 'tooLarge', detail: 'code' });
  }

  function toProject(info, login) {
    const owner = info.owner?.login || String(info.full_name || '').split('/')[0];
    const repo = info.name;
    const permissions = info.permissions || {};
    return {
      fullName: info.full_name || `${owner}/${repo}`,
      owner,
      repo,
      title: oneLine(info.description, 350) || repo,
      htmlUrl: `https://github.com/${owner}/${repo}`,
      pagesUrl: info.has_pages ? pagesUrlOf(owner, repo) : null,
      updatedAt: info.pushed_at || info.updated_at || null,
      canPush: Boolean(permissions.admin || permissions.maintain || permissions.push),
      canAdmin: Boolean(permissions.admin),
      isOwner: Boolean(login) && String(owner).toLowerCase() === String(login).toLowerCase(),
      defaultBranch: info.default_branch || 'main',
    };
  }

  const isProjectRepo = (info) => Array.isArray(info?.topics) && info.topics.includes(PROJECT_TOPIC);

  async function me() {
    const user = await request('/user');
    return { login: user.login, name: user.name || '', avatarUrl: user.avatar_url || '' };
  }

  async function getBranchHeadSha(owner, repo, branch, { allowEmpty = false } = {}) {
    try {
      const ref = await request(`/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(branch)}`);
      return ref.object?.sha || null;
    } catch (error) {
      if (allowEmpty && isEmptyRepoError(error)) return null;
      throw error;
    }
  }

  async function getCommitTreeSha(owner, repo, commitSha) {
    const commit = await request(`/repos/${owner}/${repo}/git/commits/${encodeURIComponent(commitSha)}`);
    return commit.tree?.sha || null;
  }

  /** 파일을 읽어 { sha, text }를 돌려줍니다. 없으면 null. */
  async function getContentsFile(owner, repo, path, ref) {
    try {
      const file = await request(`/repos/${owner}/${repo}/contents/${path.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(ref)}`);
      return { sha: file.sha, text: decodeBase64Utf8(file.content) };
    } catch (error) {
      if (error.status === 404) return null;
      throw error;
    }
  }

  const treeOf = (files, baseTreeSha) => ({
    ...(baseTreeSha ? { base_tree: baseTreeSha } : {}),
    tree: files.map((file) => ({ path: file.path, mode: '100644', type: 'blob', content: file.content })),
  });
  const post = (path, body, extra = {}) => request(path, { method: 'POST', body, ...extra });

  /** 파일 여러 개를 headSha 위에 한 커밋으로 올립니다. 브랜치를 강제로 밀지 않으므로 그사이 다른 커밋이 생기면 실패합니다. */
  async function commitFilesAtomic(owner, repo, files, message, branch, headSha) {
    const baseTreeSha = await getCommitTreeSha(owner, repo, headSha);
    const tree = await post(`/repos/${owner}/${repo}/git/trees`, treeOf(files, baseTreeSha));
    const commit = await post(`/repos/${owner}/${repo}/git/commits`, { message, tree: tree.sha, parents: [headSha] });
    await request(`/repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(branch)}`, {
      method: 'PATCH', body: { sha: commit.sha, force: false },
    });
    return commit.sha;
  }

  async function bootstrapEmptyRepoWithContents(owner, repo, file, message) {
    const result = await request(`/repos/${owner}/${repo}/contents/${encodeURIComponent(file.path)}`, {
      method: 'PUT', body: { message, content: encodeBase64Utf8(file.content) },
    });
    return result.commit?.sha || null;
  }

  async function createInitialCommitOnce(owner, repo, files, message, branch) {
    let parentSha = null;
    let baseTreeSha = null;
    try {
      parentSha = await getBranchHeadSha(owner, repo, branch);
      if (parentSha) baseTreeSha = await getCommitTreeSha(owner, repo, parentSha);
    } catch (error) {
      if (!isEmptyRepoError(error)) throw error;
    }

    let tree;
    try {
      tree = await post(`/repos/${owner}/${repo}/git/trees`, treeOf(files, baseTreeSha));
    } catch (error) {
      if (parentSha || !isRepoStillPreparing(error)) throw error;
      // 완전히 빈 공개 저장소는 Git Data API의 tree 만들기도 409로 거절할 수 있습니다.
      // Contents API로 첫 파일을 만들어 브랜치를 세운 뒤 나머지 파일을 맞춥니다.
      parentSha = await bootstrapEmptyRepoWithContents(owner, repo, files[0], `${message} (bootstrap)`);
      if (!parentSha) throw error;
      if (files.length === 1) return parentSha;
      baseTreeSha = await getCommitTreeSha(owner, repo, parentSha);
      tree = await post(`/repos/${owner}/${repo}/git/trees`, treeOf(files, baseTreeSha));
    }

    const commit = await post(`/repos/${owner}/${repo}/git/commits`, {
      message, tree: tree.sha, parents: parentSha ? [parentSha] : [],
    });
    if (parentSha) {
      await request(`/repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(branch)}`, {
        method: 'PATCH', body: { sha: commit.sha, force: false },
      });
    } else {
      await post(`/repos/${owner}/${repo}/git/refs`, { ref: `refs/heads/${branch}`, sha: commit.sha });
    }
    return commit.sha;
  }

  async function createInitialCommit(owner, repo, files, message, branch = 'main') {
    for (let attempt = 0; ; attempt += 1) {
      try {
        return await createInitialCommitOnce(owner, repo, files, message, branch);
      } catch (error) {
        if (!isRepoStillPreparing(error) || attempt >= REPO_READY_RETRY_DELAYS_MS.length) throw error;
        await sleep(REPO_READY_RETRY_DELAYS_MS[attempt]);
      }
    }
  }

  /** 저장소 이름: 기본 이름, -2·-3·-4, 마지막은 무작위 6자. 직접 정한 이름은 대체 이름을 쓰지 않습니다. */
  async function createUniqueRepo(baseName, description, { allowFallbackNames = true } = {}) {
    const names = allowFallbackNames
      ? [baseName, `${baseName}-2`, `${baseName}-3`, `${baseName}-4`, `${baseName}-${randomSuffix()}`]
      : [baseName];
    let lastError = null;
    for (const name of names) {
      try {
        return await post('/user/repos', {
          name,
          description,
          auto_init: false,
          has_issues: true,
          has_wiki: false,
          private: false, // GitHub Pages를 무료 계정에서 사용하려면 공개 저장소여야 합니다.
        });
      } catch (error) {
        lastError = error;
        if (error.status !== 422) throw error;
        if (!allowFallbackNames) {
          throw new GitHubError('이미 있거나 만들 수 없는 저장소 이름입니다.', { status: 422, reason: 'invalidName', detail: 'taken' });
        }
        // 422는 같은 이름이 있거나 이름 검증 실패입니다. 다음 후보로 넘어갑니다.
      }
    }
    throw lastError || new GitHubError('저장소를 만들지 못했습니다.');
  }

  async function ensurePagesEnabledOnce(owner, repo, branch) {
    try {
      const page = await request(`/repos/${owner}/${repo}/pages`, { limitMs: PAGES_TIMEOUT_MS, retry: false });
      if (page.source && (page.source.branch !== branch || page.source.path !== '/')) {
        throw new GitHubError('GitHub Pages의 브랜치 또는 폴더 설정이 다릅니다.', { status: 409, reason: 'conflict', detail: 'pagesSourceMismatch' });
      }
      return { active: true, status: page.status || null };
    } catch (error) {
      if (error.status !== 404) throw error;
      const page = await post(`/repos/${owner}/${repo}/pages`, { source: { branch, path: '/' } }, { limitMs: PAGES_TIMEOUT_MS });
      return { active: true, status: page.status || 'building' };
    }
  }

  async function ensurePagesEnabled(owner, repo, branch, delays = PAGES_ENABLE_RETRY_DELAYS_MS) {
    for (let attempt = 0; ; attempt += 1) {
      if (delays[attempt]) await sleep(delays[attempt]);
      try {
        return await ensurePagesEnabledOnce(owner, repo, branch);
      } catch (error) {
        if (attempt >= delays.length - 1 || !isRetryablePagesError(error)) throw error;
      }
    }
  }

  /** 일부 설정에서는 수동 빌드 요청이 거절됩니다. 거절되어도 저장은 성공이므로 무시합니다. */
  async function requestPagesBuild(owner, repo) {
    try {
      await request(`/repos/${owner}/${repo}/pages/builds`, { method: 'POST', limitMs: PAGES_TIMEOUT_MS });
      return true;
    } catch {
      return false;
    }
  }

  /** Pages를 켭니다. 실패해도 오류를 던지지 않고 까닭만 돌려줍니다. */
  async function turnOnPages(owner, repo, branch, delays) {
    try {
      await ensurePagesEnabled(owner, repo, branch, delays);
      await requestPagesBuild(owner, repo);
      return { pagesUrl: pagesUrlOf(owner, repo), pagesWarning: null };
    } catch (error) {
      return { pagesUrl: null, pagesWarning: pagesWarningOf(error) };
    }
  }

  async function resolveHtml(html, context) {
    let value = null;
    try {
      value = typeof html === 'function' ? await html(context) : html;
    } catch {
      value = null; // 실행형 HTML을 만들지 못하면 정적 화면으로 대신합니다.
    }
    if (typeof value !== 'string' || !value.trim()) value = generateFallbackHtml(context);
    if (byteLength(value) > MAX_HTML_BYTES) {
      throw new GitHubError('실행 화면 HTML이 1MB를 넘습니다.', { status: 413, reason: 'tooLarge', detail: 'html' });
    }
    return value;
  }

  const htmlContext = ({ owner, repo, title, code, openUrl }) => ({
    owner, repo, title, code, openUrl,
    fullName: `${owner}/${repo}`,
    repoUrl: `https://github.com/${owner}/${repo}`,
    pagesUrl: pagesUrlOf(owner, repo),
  });

  function commitMessageOf(message, record) {
    const first = oneLine(message, 200) || '저장';
    const cleaned = cleanRecord(record);
    if (!cleaned) return first;
    const lines = [first, ''];
    if (cleaned.did) lines.push(`한 일: ${cleaned.did}`);
    if (cleaned.blocker) lines.push(`막힌 점: ${cleaned.blocker}`);
    if (cleaned.next) lines.push(`다음 할 일: ${cleaned.next}`);
    return lines.join('\n');
  }

  async function listPaged(path) {
    const items = [];
    for (let page = 1; page <= MAX_LIST_PAGES; page += 1) {
      const batch = await request(`${path}${path.includes('?') ? '&' : '?'}per_page=100&page=${page}`);
      if (!Array.isArray(batch)) break;
      items.push(...batch);
      if (batch.length < 100) break;
    }
    return items;
  }

  return {
    me,

    /** 내가 소유하거나 협업자인 공개 저장소 가운데 VPyLab 프로젝트(topic)인 것. 최근에 바뀐 순서. */
    async listProjects() {
      const [user, repos] = await Promise.all([
        me(),
        listPaged('/user/repos?affiliation=owner%2Ccollaborator&visibility=public&sort=updated'),
      ]);
      return repos.filter(isProjectRepo).map((info) => toProject(info, user.login));
    },

    /**
     * 공개 저장소를 만들고 첫 커밋(main.py, README.md, history.md, index.html)을 올린 뒤 topic을 붙이고 Pages를 켭니다.
     * html은 문자열이거나 ({ owner, repo, fullName, repoUrl, pagesUrl, title, code, openUrl }) => 문자열 함수입니다.
     * 저장소를 만든 뒤 실패하면 오류의 fullName에 만들어진 저장소 이름이 들어 있습니다.
     */
    async createProject({ title, code, html, repoName, openUrl } = {}) {
      const cleanTitle = oneLine(title, 200);
      if (!cleanTitle) throw new GitHubError('제목이 필요합니다.', { status: 400, reason: 'invalidName', detail: 'title' });
      assertCode(code);
      const hasCustomName = typeof repoName === 'string' && repoName.trim().length > 0;
      const customName = hasCustomName ? normalizeRepoNameInput(repoName) : '';
      if (hasCustomName && !customName) {
        throw new GitHubError('저장소 이름은 영어 소문자, 숫자, 하이픈(-)으로 입력해야 합니다.', { status: 400, reason: 'invalidName', detail: 'repo' });
      }

      const user = await me();
      const owner = user.login;
      const baseName = customName || `vpylab-${await sanitizeRepoName(cleanTitle)}`;
      const created = await createUniqueRepo(baseName, cleanTitle.slice(0, 350), { allowFallbackNames: !hasCustomName });
      const repo = created.name;
      const branch = 'main';

      try {
        const page = await resolveHtml(html, htmlContext({ owner, repo, title: cleanTitle, code, openUrl }));
        const headSha = await createInitialCommit(owner, repo, [
          { path: 'main.py', content: code },
          { path: 'README.md', content: generateReadme({ title: cleanTitle, owner, repo }) },
          { path: 'history.md', content: generateInitialHistory(cleanTitle, owner, now()) },
          { path: 'index.html', content: page },
        ], `프로젝트 시작: ${cleanTitle}`, branch);

        // topic이 없으면 프로젝트 목록에 나타나지 않습니다. 실패해도 저장소와 코드는 남아 있으므로 경고만 돌려줍니다.
        let topicWarning = false;
        try {
          await request(`/repos/${owner}/${repo}/topics`, { method: 'PUT', body: { names: [PROJECT_TOPIC] } });
        } catch (error) {
          if (error.reason === 'auth') throw error;
          topicWarning = true;
        }

        const pages = await turnOnPages(owner, repo, branch);
        const project = {
          ...toProject({ ...created, permissions: created.permissions || { admin: true, push: true, pull: true }, description: cleanTitle }, owner),
          pagesUrl: pages.pagesUrl,
        };
        return {
          project,
          headSha,
          ...(pages.pagesWarning ? { pagesWarning: pages.pagesWarning } : {}),
          ...(topicWarning ? { topicWarning: true } : {}),
        };
      } catch (error) {
        if (error instanceof GitHubError) error.fullName = `${owner}/${repo}`;
        throw error;
      }
    },

    /** 프로젝트의 최신 코드. main.py가 없으면 code는 빈 문자열, missingMain은 true입니다. */
    async readProject(fullName) {
      const { owner, repo } = parse(fullName);
      const [user, info] = await Promise.all([me(), request(`/repos/${owner}/${repo}`)]);
      const project = toProject(info, user.login);
      const headSha = await getBranchHeadSha(project.owner, project.repo, project.defaultBranch, { allowEmpty: true });
      const file = headSha ? await getContentsFile(project.owner, project.repo, 'main.py', headSha) : null;
      return { code: file?.text ?? '', missingMain: !file, headSha, project };
    },

    /**
     * main.py·index.html·history.md를 한 커밋으로 저장합니다.
     *   - 원격의 최신 커밋이 baseSha와 다르면 쓰지 않고 { status: 'conflict', remote: { headSha, code } }를 돌려줍니다.
     *   - force: true면 최신 커밋 위에 내 코드로 새 커밋을 만듭니다. 브랜치를 강제로 밀지는 않습니다.
     *   - ownCodes: 결과를 모르는 내 저장 시도(시간 초과 등)의 코드. 원격이 그 코드와 같으면 내 저장으로 봅니다.
     *   - pages: true면 저장 뒤 GitHub Pages가 켜져 있는지 확인하고 꺼져 있으면 켭니다.
     */
    async commit({
      fullName, code, html, message, record, baseSha, force = false, title, openUrl, author, ownCodes = [], pages = false, codeLines, lineDelta,
    } = {}) {
      const { owner, repo } = parse(fullName);
      assertCode(code);
      const info = await request(`/repos/${owner}/${repo}`);
      if (String(info.full_name || '').toLowerCase() !== fullName.toLowerCase()) {
        throw new GitHubError('저장소 이름이 바뀌었습니다.', { status: 409, reason: 'notFound', detail: 'moved' });
      }
      const permissions = info.permissions || {};
      if (!(permissions.admin || permissions.maintain || permissions.push)) {
        throw new GitHubError('이 저장소에 저장할 권한이 없습니다.', { status: 403, reason: 'readOnly' });
      }
      const branch = info.default_branch || 'main';
      const projectTitle = oneLine(title, 200) || oneLine(info.description, 200) || repo;
      const authorLabel = author || (await me()).login;
      // 실행 화면은 충돌이 아닌 것을 확인한 뒤에 한 번만 만듭니다.
      let page = null;
      const pageHtml = async () => {
        if (page === null) page = await resolveHtml(html, htmlContext({ owner, repo, title: projectTitle, code, openUrl }));
        return page;
      };
      const commitMessage = commitMessageOf(message, record);
      const commitUrlOf = (sha) => `https://github.com/${owner}/${repo}/commit/${sha}`;
      const finish = async (headSha) => {
        const result = { status: 'saved', headSha, commitUrl: commitUrlOf(headSha) };
        if (!pages) return result;
        const turned = await turnOnPages(owner, repo, branch, [0]);
        return { ...result, pagesUrl: turned.pagesUrl, ...(turned.pagesWarning ? { pagesWarning: turned.pagesWarning } : {}) };
      };

      for (let attempt = 0; ; attempt += 1) {
        const headSha = await getBranchHeadSha(owner, repo, branch, { allowEmpty: true });
        if (!headSha) {
          // 첫 커밋에 실패해 비어 있는 저장소: 처음 파일을 모두 올려 되살립니다.
          const sha = await createInitialCommit(owner, repo, [
            { path: 'main.py', content: code },
            { path: 'README.md', content: generateReadme({ title: projectTitle, owner, repo }) },
            { path: 'history.md', content: generateInitialHistory(projectTitle, authorLabel, now()) },
            { path: 'index.html', content: await pageHtml() },
          ], commitMessage, branch);
          return finish(sha);
        }

        if (!force && headSha !== baseSha) {
          const remote = await getContentsFile(owner, repo, 'main.py', headSha);
          const remoteCode = remote?.text ?? '';
          if (remoteCode === code) return { status: 'saved', headSha, commitUrl: commitUrlOf(headSha), alreadySaved: true };
          if (!ownCodes.includes(remoteCode)) return { status: 'conflict', remote: { headSha, code: remoteCode } };
        }

        const history = await getContentsFile(owner, repo, 'history.md', headSha);
        const files = [
          { path: 'main.py', content: code },
          { path: 'index.html', content: await pageHtml() },
          { path: 'history.md', content: appendHistorySection(history?.text, { message, author: authorLabel, record, codeLines, lineDelta }, now()) },
        ];
        try {
          return await finish(await commitFilesAtomic(owner, repo, files, commitMessage, branch, headSha));
        } catch (error) {
          if (!isRefConflict(error)) throw error;
          // 읽는 사이 팀원의 커밋이 생겼습니다. 최신 커밋을 다시 읽어 충돌로 알리거나(force 아님) 그 위에 다시 만듭니다.
          if (attempt >= COMMIT_RETRY_DELAYS_MS.length) {
            throw new GitHubError('동시에 저장하는 팀원이 있어 저장하지 못했습니다.', { status: 409, reason: 'conflict' });
          }
          await sleep(COMMIT_RETRY_DELAYS_MS[attempt]);
        }
      }
    },

    /** 최근 커밋. 빈 저장소면 빈 배열. */
    async history(fullName, { limit = 10 } = {}) {
      const { owner, repo } = parse(fullName);
      const perPage = Math.max(1, Math.min(100, Number(limit) || 10));
      let commits;
      try {
        commits = await request(`/repos/${owner}/${repo}/commits?per_page=${perPage}`);
      } catch (error) {
        if (error.status === 409) return [];
        throw error;
      }
      return (Array.isArray(commits) ? commits : []).map((item) => ({
        sha: item.sha,
        message: item.commit?.message || '',
        author: item.author?.login || item.commit?.author?.name || '',
        date: item.commit?.author?.date || item.commit?.committer?.date || null,
        url: `https://github.com/${owner}/${repo}/commit/${item.sha}`,
      }));
    },

    async collaborators(fullName) {
      const { owner, repo } = parse(fullName);
      const users = await request(`/repos/${owner}/${repo}/collaborators?per_page=100`);
      return (Array.isArray(users) ? users : []).map((user) => ({
        login: user.login,
        role: user.role_name || (user.permissions?.admin ? 'admin' : user.permissions?.push ? 'write' : 'read'),
        isOwner: String(user.login).toLowerCase() === owner.toLowerCase(),
      }));
    },

    /** GitHub 아이디로 팀원을 초대합니다(쓰기 권한). 저장소 관리자만 할 수 있습니다. */
    async invite(fullName, username) {
      const { owner, repo } = parse(fullName);
      const safe = sanitizeGithubUsername(username);
      if (!safe) throw new GitHubError('GitHub 아이디가 올바르지 않습니다.', { status: 400, reason: 'invalidName', detail: 'username' });
      const info = await request(`/repos/${owner}/${repo}`);
      if (!info.permissions?.admin) {
        throw new GitHubError('팀원 초대는 저장소 관리자만 할 수 있습니다.', { status: 403, reason: 'forbidden', detail: 'adminRequired' });
      }
      try {
        const invitation = await request(`/repos/${owner}/${repo}/collaborators/${encodeURIComponent(safe)}`, {
          method: 'PUT', body: { permission: 'push' },
        });
        return { username: safe, invitationId: invitation.id ?? null, alreadyCollaborator: !invitation.id && !invitation.html_url };
      } catch (error) {
        if (error.status === 404) error.detail = 'user';
        if (error.status === 422) error.detail = 'invite';
        throw error;
      }
    },

    /** 저장소가 보낸 초대 가운데 아직 수락하지 않은 것. 저장소 관리자만 볼 수 있습니다. */
    async pendingInvitations(fullName) {
      const { owner, repo } = parse(fullName);
      const invitations = await request(`/repos/${owner}/${repo}/invitations?per_page=100`);
      return (Array.isArray(invitations) ? invitations : []).map((item) => ({
        id: item.id,
        invitee: item.invitee?.login || null,
        inviter: item.inviter?.login || null,
        permissions: item.permissions || null,
        createdAt: item.created_at || null,
        expired: Boolean(item.expired),
      }));
    },

    async cancelInvitation(fullName, id) {
      const { owner, repo } = parse(fullName);
      const invitationId = Number(id);
      if (!Number.isInteger(invitationId) || invitationId <= 0) {
        throw new GitHubError('초대 번호가 올바르지 않습니다.', { status: 400, reason: 'notFound', detail: 'invitation' });
      }
      try {
        await request(`/repos/${owner}/${repo}/invitations/${invitationId}`, { method: 'DELETE' });
      } catch (error) {
        if (error.status === 404) error.detail = 'invitation';
        throw error;
      }
      return { cancelled: invitationId };
    },

    /** 내가 받은 초대 가운데 VPyLab 프로젝트(topic)로 보이는 것. 만료된 초대는 뺍니다. */
    async myInvitations() {
      const invitations = await request('/user/repository_invitations?per_page=100');
      const open = (Array.isArray(invitations) ? invitations : []).filter((item) => !item.expired && item.repository?.full_name);
      let lookups = 0;
      const checked = await Promise.all(open.map(async (item) => {
        let repository = item.repository;
        // 초대 응답의 저장소 정보에 topic이 빠져 있으면 저장소를 한 번 읽어 확인합니다(공개 저장소).
        if (!Array.isArray(repository.topics) && parseRepoFullName(repository.full_name) && lookups < MAX_INVITATION_LOOKUPS) {
          lookups += 1;
          try { repository = await request(`/repos/${repository.full_name}`); } catch { return null; }
        }
        if (!isProjectRepo(repository)) return null;
        const owner = repository.owner?.login || repository.full_name.split('/')[0];
        return {
          id: item.id,
          fullName: repository.full_name,
          owner,
          repo: repository.name,
          title: oneLine(repository.description, 350) || repository.name,
          inviter: item.inviter?.login || null,
          htmlUrl: `https://github.com/${owner}/${repository.name}`,
          createdAt: item.created_at || null,
        };
      }));
      return checked.filter(Boolean);
    },

    async acceptInvitation(id) {
      const invitationId = Number(id);
      if (!Number.isInteger(invitationId) || invitationId <= 0) {
        throw new GitHubError('초대 번호가 올바르지 않습니다.', { status: 400, reason: 'notFound', detail: 'invitation' });
      }
      try {
        await request(`/user/repository_invitations/${invitationId}`, { method: 'PATCH' });
      } catch (error) {
        if (error.status === 404) error.detail = 'invitation';
        throw error;
      }
      return { accepted: invitationId };
    },
  };
}
