/**
 * GitHub 연동 갤러리의 목록 만들기(서버·DB 없음).
 *
 * topic `vpylab-gallery`가 붙은 공개 저장소를 GitHub 검색으로 찾고, 승인 파일에 있는 것만 공개 목록(gallery.json)에 넣습니다.
 * 승인되지 않은 것은 승인 대기 목록(pending.json, PENDING.md)에 따로 남기고, 차단한 것은 어디에도 넣지 않습니다.
 * 앱은 gallery.json만 읽습니다. 검색 결과에 어떤 저장소가 섞여도 승인 전에는 공개 목록에 들어가지 않습니다.
 *
 * 의존성 없이 Node의 fetch만 사용합니다. 네트워크와 시각은 주입받아 테스트합니다(gallery-index.test.mjs).
 * 실행 파일은 build-index.mjs이고, 주기 실행은 .github/workflows/gallery-index.yml이 합니다.
 */
import {
  GALLERY_INDEX_VERSION, GALLERY_TOPIC, MAX_GALLERY_ITEMS, MAX_THUMBNAIL_BYTES, PROJECT_TOPIC, THUMBNAIL_PATH,
  cleanTitle, htmlUrlOf, isGitHubLogin, isSafeBranch, pagesUrlOf, parseFullName, thumbnailUrlOf, validateGalleryEntry, validateGalleryIndex,
} from '../../server/shared/gallery-rules.js';

const API = 'https://api.github.com';
export const SEARCH_PAGE_SIZE = 100;
export const MAX_SEARCH_PAGES = 10; // GitHub 검색은 1,000건까지만 돌려줍니다.
export const MAX_PENDING_ITEMS = 500;
const THUMBNAIL_CHECKS_AT_ONCE = 4;

export class GalleryIndexError extends Error {
  constructor(message, { status = 0 } = {}) {
    super(message);
    this.name = 'GalleryIndexError';
    this.status = status;
  }
}

// ── 승인 파일 ────────────────────────────────────────────────

const APPROVE_WORDS = new Set(['approve', '승인']);
const BLOCK_WORDS = new Set(['block', '차단']);

/** 'https://github.com/owner/repo', '@owner', 'owner/repo'를 { owner } 또는 { owner, repo }로 바꿉니다. 형식이 다르면 null. */
export function parseApprovalTarget(text) {
  let value = String(text || '').trim();
  value = value.replace(/^https?:\/\/(www\.)?github\.com\//i, '').replace(/\.git$/i, '').replace(/\/+$/, '').replace(/^@/, '');
  if (!value) return null;
  if (!value.includes('/')) return isGitHubLogin(value) ? { owner: value.toLowerCase() } : null;
  const parsed = parseFullName(value);
  return parsed ? { owner: parsed.owner.toLowerCase(), repo: parsed.repo.toLowerCase() } : null;
}

/**
 * 승인 파일(approvals.txt)을 읽습니다. 한 줄에 하나씩 적고 '#' 뒤는 메모입니다.
 *   approve @아이디            그 아이디가 올린 작품을 모두 싣습니다
 *   approve 아이디/저장소       작품 하나만 싣습니다(저장소 주소를 붙여 넣어도 됩니다)
 *   block @아이디 | block 아이디/저장소   싣지 않습니다(승인보다 우선)
 * 'approve' 대신 '승인', 'block' 대신 '차단'으로 적어도 됩니다.
 * 읽을 수 없는 줄은 승인으로 보지 않고 warnings에 남깁니다.
 */
export function parseApprovals(text) {
  const approvals = {
    approvedOwners: new Set(), approvedRepos: new Set(), blockedOwners: new Set(), blockedRepos: new Set(), warnings: [],
  };
  const lines = String(text ?? '').replace(/^\ufeff/, '').split(/\r?\n/);
  lines.forEach((raw, index) => {
    const line = raw.replace(/#.*$/, '').trim();
    if (!line) return;
    const [word, ...rest] = line.split(/\s+/);
    const approve = APPROVE_WORDS.has(word.toLowerCase());
    const block = BLOCK_WORDS.has(word.toLowerCase());
    const target = rest.length === 1 ? parseApprovalTarget(rest[0]) : null;
    if ((!approve && !block) || !target) {
      approvals.warnings.push({ line: index + 1, text: cleanTitle(raw).slice(0, 80) });
      return;
    }
    const key = target.repo ? `${target.owner}/${target.repo}` : target.owner;
    if (approve) (target.repo ? approvals.approvedRepos : approvals.approvedOwners).add(key);
    else (target.repo ? approvals.blockedRepos : approvals.blockedOwners).add(key);
  });
  return approvals;
}

/** 'approved' | 'pending' | 'blocked'. 차단이 승인보다 우선합니다. */
export function classifyEntry(entry, approvals) {
  const owner = entry.owner.toLowerCase();
  const fullName = entry.fullName.toLowerCase();
  if (approvals.blockedOwners.has(owner) || approvals.blockedRepos.has(fullName)) return 'blocked';
  if (approvals.approvedOwners.has(owner) || approvals.approvedRepos.has(fullName)) return 'approved';
  return 'pending';
}

// ── GitHub 읽기 ──────────────────────────────────────────────

function headersOf(token) {
  return {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'vpylab-gallery-index',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/** 오류 문구에는 상태 코드와 GitHub의 안내만 넣습니다. 토큰은 넣지 않습니다. */
async function getJson(fetchImpl, url, token) {
  let response;
  try {
    response = await fetchImpl(url, { headers: headersOf(token) });
  } catch {
    throw new GalleryIndexError('GitHub에 연결하지 못했습니다.');
  }
  let data = null;
  try { data = await response.json(); } catch { data = null; }
  if (!response.ok) {
    const message = typeof data?.message === 'string' ? cleanTitle(data.message).slice(0, 200) : '';
    throw new GalleryIndexError(`GitHub API ${response.status}${message ? `: ${message}` : ''}`, { status: response.status });
  }
  return data;
}

export function searchQuery(topic = GALLERY_TOPIC) {
  return `topic:${topic} topic:${PROJECT_TOPIC} is:public archived:false fork:true`;
}

/**
 * topic이 붙은 공개 저장소를 모두 읽습니다. 검색이 실패하거나 결과가 불완전하면 오류를 던져 목록을 바꾸지 않게 합니다
 * (일시적인 검색 오류로 실려 있던 작품이 한꺼번에 빠지지 않게).
 */
export async function searchGalleryRepos({ fetchImpl = globalThis.fetch, token = '', topic = GALLERY_TOPIC, maxPages = MAX_SEARCH_PAGES } = {}) {
  const repos = [];
  for (let page = 1; page <= maxPages; page += 1) {
    const url = `${API}/search/repositories?q=${encodeURIComponent(searchQuery(topic))}&sort=updated&order=desc&per_page=${SEARCH_PAGE_SIZE}&page=${page}`;
    const data = await getJson(fetchImpl, url, token);
    if (!data || !Array.isArray(data.items)) throw new GalleryIndexError('GitHub 검색 응답의 형식이 다릅니다.');
    if (data.incomplete_results) throw new GalleryIndexError('GitHub 검색 결과가 불완전합니다. 다음 실행에서 다시 시도합니다.');
    repos.push(...data.items);
    if (data.items.length < SEARCH_PAGE_SIZE || repos.length >= Number(data.total_count || 0)) break;
  }
  return repos;
}

/**
 * 검색 결과의 저장소 하나를 목록 항목으로 바꿉니다. 실을 수 없으면 null.
 * 공개 저장소이고, 보관·사용 중지 상태가 아니며, topic 두 개(vpylab-gallery, vpylab-project)가 모두 있어야 합니다.
 * 주소는 GitHub이 준 값을 옮기지 않고 저장소 이름에서 다시 만듭니다.
 */
export function toEntry(repo, { topic = GALLERY_TOPIC } = {}) {
  if (!repo || typeof repo !== 'object') return null;
  if (repo.private !== false || repo.archived || repo.disabled) return null;
  if (repo.visibility !== undefined && repo.visibility !== 'public') return null;
  const topics = Array.isArray(repo.topics) ? repo.topics : [];
  if (!topics.includes(topic) || !topics.includes(PROJECT_TOPIC)) return null;
  const target = parseFullName(repo.full_name);
  if (!target || repo.owner?.login !== target.owner || repo.name !== target.repo) return null;
  const entry = validateGalleryEntry({
    fullName: repo.full_name,
    title: cleanTitle(repo.description, target.repo),
    owner: target.owner,
    htmlUrl: htmlUrlOf(target.owner, target.repo),
    pagesUrl: repo.has_pages ? pagesUrlOf(target.owner, target.repo) : null,
    thumbnailUrl: null,
    stars: repo.stargazers_count,
    updatedAt: repo.pushed_at || repo.updated_at || null,
  });
  if (!entry) return null;
  return { entry, branch: isSafeBranch(repo.default_branch) ? repo.default_branch : null };
}

/**
 * 저장소에 미리보기 그림(thumbnail.jpg)이 있고 크기가 상한 안인지 확인해 주소를 돌려줍니다. 그림이 없으면(404) null.
 * 확인하지 못하면(연결 오류, 한도) 오류를 던집니다. 부르는 쪽(buildIndex)이 앞선 값을 두고 다음 실행에서 다시 확인합니다.
 */
export async function findThumbnail({ fetchImpl = globalThis.fetch, token = '', entry, branch }) {
  const target = parseFullName(entry.fullName);
  if (!target || !branch) return null;
  try {
    const url = `${API}/repos/${target.owner}/${target.repo}/contents/${THUMBNAIL_PATH}?ref=${encodeURIComponent(branch)}`;
    const file = await getJson(fetchImpl, url, token);
    if (file?.type !== 'file' || !Number.isInteger(file.size) || file.size <= 0 || file.size > MAX_THUMBNAIL_BYTES) return null;
    return thumbnailUrlOf(target.owner, target.repo, branch);
  } catch (error) {
    if (error instanceof GalleryIndexError && error.status === 404) return null;
    throw error;
  }
}

async function mapLimited(list, limit, worker) {
  const results = new Array(list.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, list.length) }, async () => {
    while (next < list.length) {
      const index = next;
      next += 1;
      results[index] = await worker(list[index], index);
    }
  }));
  return results;
}

const byUpdatedDesc = (a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')) || a.fullName.localeCompare(b.fullName);
const sameItems = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/**
 * 검색 결과와 승인 파일로 공개 목록과 승인 대기 목록을 만듭니다.
 * @param {object} options
 * @param {object[]} options.repos searchGalleryRepos의 결과
 * @param {ReturnType<typeof parseApprovals>} options.approvals
 * @param {object|null} [options.previous] 앞서 만든 gallery.json. 저장소가 그 뒤로 바뀌지 않았으면 미리보기 그림을 다시 확인하지 않습니다.
 * @param {object|null} [options.previousPending] 앞서 만든 pending.json
 * @param {(entry:object, branch:string|null) => Promise<string|null>} [options.checkThumbnail]
 * @param {() => Date} [options.now]
 */
export async function buildIndex({ repos, approvals, previous = null, previousPending = null, checkThumbnail = async () => null, now = () => new Date(), topic = GALLERY_TOPIC }) {
  const seen = new Set();
  const approved = [];
  const pending = [];
  const stats = { found: repos.length, approved: 0, pending: 0, blocked: 0, skipped: 0 };
  for (const repo of repos) {
    const converted = toEntry(repo, { topic });
    const key = converted?.entry.fullName.toLowerCase();
    if (!converted || seen.has(key)) { stats.skipped += 1; continue; }
    seen.add(key);
    const decision = classifyEntry(converted.entry, approvals);
    if (decision === 'blocked') stats.blocked += 1;
    else if (decision === 'approved') approved.push(converted);
    else pending.push(converted.entry);
  }

  approved.sort((a, b) => byUpdatedDesc(a.entry, b.entry));
  const listed = approved.slice(0, MAX_GALLERY_ITEMS);
  const before = new Map((validateGalleryIndex(previous)?.items || []).map((item) => [item.fullName.toLowerCase(), item]));
  const items = await mapLimited(listed, THUMBNAIL_CHECKS_AT_ONCE, async ({ entry, branch }) => {
    const old = before.get(entry.fullName.toLowerCase());
    // 저장소에 새 커밋이 없으면 그림도 그대로입니다.
    if (old && old.updatedAt === entry.updatedAt) return validateGalleryEntry({ ...entry, thumbnailUrl: old.thumbnailUrl });
    try {
      return validateGalleryEntry({ ...entry, thumbnailUrl: await checkThumbnail(entry, branch) });
    } catch {
      // 그림을 이번에 확인하지 못했습니다. 작품은 싣되 앞선 그림 주소와 앞선 시각을 적어 둡니다.
      // 시각이 저장소의 지금 시각과 다르므로 다음 실행이 그림을 다시 확인합니다(그림 없음으로 굳지 않습니다).
      return validateGalleryEntry({ ...entry, thumbnailUrl: old?.thumbnailUrl ?? null, updatedAt: old?.updatedAt ?? null });
    }
  });

  pending.sort(byUpdatedDesc);
  const pendingItems = pending.slice(0, MAX_PENDING_ITEMS).map(({ fullName, title, owner, htmlUrl, pagesUrl, updatedAt }) => ({ fullName, title, owner, htmlUrl, pagesUrl, updatedAt }));
  stats.approved = items.length;
  stats.pending = pendingItems.length;

  // 내용이 그대로면 만든 시각도 그대로 둡니다. 그러면 파일이 바뀌지 않아 목록 브랜치에 빈 커밋이 쌓이지 않습니다.
  const stamp = now().toISOString();
  const keep = (old, next) => (old && typeof old.generatedAt === 'string' && Array.isArray(old.items) && sameItems(old.items, next) ? old.generatedAt : stamp);
  return {
    gallery: { version: GALLERY_INDEX_VERSION, generatedAt: keep(previous, items), topic, items },
    pending: { version: GALLERY_INDEX_VERSION, generatedAt: keep(previousPending, pendingItems), topic, items: pendingItems },
    stats,
    warnings: approvals.warnings,
  };
}

// ── 승인 대기 목록(교사가 GitHub에서 읽는 글) ─────────────────

/** 마크다운에서 뜻을 갖는 문자를 무력화합니다. 저장소 설명은 누구나 적을 수 있는 글자입니다. */
export function escapeMarkdown(text) {
  return String(text).replace(/[\\`*_{}[\]()<>#+\-.!|~&@:/]/g, (char) => `\\${char}`);
}

/**
 * 승인 대기 목록(PENDING.md)의 글. 교사가 GitHub에서 읽습니다. 문구: docs/reference/solar/github-gallery-261112-solar.md(블록 21)
 * 승인 파일에 추가할 줄에는 검증한 저장소 이름만 들어갑니다.
 */
export const PENDING_TEXT = {
  title: '승인 대기 작품',
  intro: '이 표는 학생이 갤러리에 올렸지만 아직 승인되지 않은 작품의 목록입니다. 승인하는 방법은 저장소를 열어 내용을 확인한 뒤, 마지막 칸의 줄을 같은 브랜치의 approvals.txt에 추가하는 것입니다. 승인한 작품은 다음 목록 갱신 때 갤러리에 표시됩니다.',
  none: '승인을 기다리는 작품이 없습니다.',
  columns: ['작품', '올린 사람', '고친 날짜', '승인 파일에 추가할 줄'],
  warnings: '승인 파일에서 읽지 못한 줄',
  warningLine: (line, text) => `${line}번째 줄: ${text}`,
};

export function renderPendingMarkdown(pending, warnings = []) {
  const lines = [`# ${PENDING_TEXT.title}`, '', PENDING_TEXT.intro, ''];
  if (!pending.items.length) {
    lines.push(PENDING_TEXT.none, '');
  } else {
    lines.push(`| ${PENDING_TEXT.columns.join(' | ')} |`, '|---|---|---|---|');
    for (const item of pending.items) {
      const date = item.updatedAt ? item.updatedAt.slice(0, 10) : '';
      lines.push(`| [${escapeMarkdown(item.title)}](${item.htmlUrl}) | ${escapeMarkdown(item.owner)} | ${date} | \`approve ${item.fullName}\` |`);
    }
    lines.push('');
  }
  if (warnings.length) {
    lines.push(`## ${PENDING_TEXT.warnings}`, '');
    for (const warning of warnings) lines.push(`- ${escapeMarkdown(PENDING_TEXT.warningLine(warning.line, warning.text))}`);
    lines.push('');
  }
  return lines.join('\n');
}
