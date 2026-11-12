/**
 * GitHub 연동 대장간(모두의 모듈)의 목록 만들기(서버·DB 없음).
 *
 * topic `vpylab-forge`가 붙은 공개 저장소 `<아이디>/vpylab-forge`를 GitHub 검색으로 찾고,
 * 승인 파일에 있는 저장소의 모듈 파일(modules/<모듈 ID>.py)만 읽어 공개 목록(forge.json)에 넣습니다.
 * 승인되지 않은 저장소는 승인 대기 목록(forge-pending.json, PENDING.md)에 따로 남기고, 차단한 것은 어디에도 넣지 않습니다.
 * 승인 파일(approvals.txt)은 갤러리와 함께 사용합니다. `approve @아이디`는 그 학생의 작품과 모듈을 모두 싣습니다.
 *
 * 목록에는 모듈 자료(JSON)를 함께 넣습니다. 앱이 목록 파일 하나만 읽고 GitHub API를 부르지 않게 하려는 것입니다
 * (학교는 한 IP를 함께 사용해 로그인하지 않은 요청의 한도에 걸리기 쉽습니다).
 * 여기서는 크기와 겉모양만 검사합니다. 모듈의 내용은 앱이 대장간의 검사기로 다시 검사합니다(server/shared/forge-rules.js).
 *
 * 의존성 없이 Node의 fetch만 사용합니다. 네트워크와 시각은 주입받아 테스트합니다(forge-index.test.mjs).
 */
import {
  FORGE_DIR, FORGE_INDEX_VERSION, FORGE_REPO, FORGE_TOPIC, MAX_FORGE_FILE_BYTES, MAX_FORGE_INDEX_BYTES, MAX_FORGE_ITEMS, MAX_FORGE_MODULES_PER_REPO,
  forgeIdOfFileName, forgeKeyOf, readForgeModuleHeader, toForgeRepo, validateForgeEntry, validateForgeIndex,
} from '../../server/shared/forge-rules.js';
import { GalleryIndexError, MAX_PENDING_ITEMS, classifyEntry, escapeMarkdown, getJson, mapLimited } from './gallery-index.mjs';

const API = 'https://api.github.com';
const REPOS_AT_ONCE = 4;
const FILES_AT_ONCE = 4;
/** 목록 파일은 앱의 상한보다 넉넉히 작게 만듭니다. */
const INDEX_BYTES_BUDGET = Math.floor(MAX_FORGE_INDEX_BYTES * 0.75);

export function forgeSearchQuery() {
  return `topic:${FORGE_TOPIC} is:public archived:false fork:true`;
}

function decodeBlob(blob) {
  if (blob?.encoding !== 'base64' || typeof blob.content !== 'string') return null;
  try {
    const binary = atob(blob.content.replace(/\s+/g, ''));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

/** 목록 파일에 적는 모양(주소는 앱이 다시 만들므로 적지 않습니다) */
const stored = ({ owner, id, sha, updatedAt, module }) => ({ owner, id, sha, updatedAt, module });

/**
 * 저장소 하나의 모듈 파일을 읽어 목록 항목으로 돌려줍니다. 폴더가 없으면 빈 목록입니다.
 * 파일 내용이 앞서 읽은 것과 같으면(sha) 다시 읽지 않습니다. 대장간 모듈이 아닌 파일은 건너뜁니다.
 * 폴더나 파일을 읽지 못하면(연결 오류, 한도) 오류를 던집니다. 부르는 쪽이 앞서 만든 항목을 그대로 둡니다.
 * @param {object} options
 * @param {ReturnType<typeof toForgeRepo>} options.repo
 * @param {Map<string, object>} [options.previous] 이 저장소의 앞선 항목(forgeKeyOf → 항목)
 */
export async function readForgeModules({ fetchImpl = globalThis.fetch, token = '', repo, previous = new Map() }) {
  const base = `${API}/repos/${repo.owner}/${FORGE_REPO}`;
  let listing;
  try {
    listing = await getJson(fetchImpl, `${base}/contents/${FORGE_DIR}?ref=${encodeURIComponent(repo.branch)}`, token);
  } catch (error) {
    if (error instanceof GalleryIndexError && error.status === 404) return [];
    throw error;
  }
  if (!Array.isArray(listing)) return [];
  const files = listing
    .filter((file) => file?.type === 'file' && forgeIdOfFileName(file.name) && typeof file.sha === 'string'
      && Number.isInteger(file.size) && file.size > 0 && file.size <= MAX_FORGE_FILE_BYTES)
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, MAX_FORGE_MODULES_PER_REPO);
  const entries = await mapLimited(files, FILES_AT_ONCE, async (file) => {
    const id = forgeIdOfFileName(file.name);
    const old = previous.get(forgeKeyOf(repo.owner, id));
    if (old && old.sha === file.sha) return old;
    const blob = await getJson(fetchImpl, `${base}/git/blobs/${encodeURIComponent(file.sha)}`, token);
    const module = readForgeModuleHeader(decodeBlob(blob), { id });
    if (!module) return null;
    // 파일마다 커밋 시각을 따로 읽지 않습니다. 새로 보이거나 바뀐 파일에는 저장소의 마지막 푸시 시각을 적습니다.
    return validateForgeEntry({ owner: repo.owner, id, sha: file.sha, updatedAt: repo.updatedAt, module });
  });
  return entries.filter(Boolean);
}

const byUpdatedDesc = (a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''))
  || a.owner.localeCompare(b.owner) || a.id.localeCompare(b.id);
const sameItems = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/**
 * 검색 결과와 승인 파일로 대장간 공개 목록과 승인 대기 목록을 만듭니다.
 * @param {object} options
 * @param {object[]} options.repos GitHub 검색 결과
 * @param {object} options.approvals parseApprovals의 결과(갤러리와 같은 승인 파일)
 * @param {object|null} [options.previous] 앞서 만든 forge.json
 * @param {object|null} [options.previousPending] 앞서 만든 forge-pending.json
 * @param {(repo:object, previous:Map<string,object>) => Promise<object[]>} [options.readModules]
 * @param {() => Date} [options.now]
 */
export async function buildForgeIndex({ repos, approvals, previous = null, previousPending = null, readModules = async () => [], now = () => new Date() }) {
  const seen = new Set();
  const approved = [];
  const pending = [];
  const stats = { found: repos.length, repos: 0, modules: 0, pending: 0, blocked: 0, skipped: 0, kept: 0 };
  for (const raw of repos) {
    const repo = toForgeRepo(raw);
    const key = repo?.fullName.toLowerCase();
    if (!repo || seen.has(key)) { stats.skipped += 1; continue; }
    seen.add(key);
    const decision = classifyEntry(repo, approvals);
    if (decision === 'blocked') stats.blocked += 1;
    else if (decision === 'approved') approved.push(repo);
    else pending.push(repo);
  }

  const before = new Map();
  for (const item of validateForgeIndex(previous)?.items || []) {
    const owner = item.owner.toLowerCase();
    if (!before.has(owner)) before.set(owner, new Map());
    before.get(owner).set(forgeKeyOf(item.owner, item.id), item);
  }

  // 저장소별로 마지막으로 읽은 때의 푸시 시각. 그 뒤로 푸시가 없으면 파일이 그대로이므로 GitHub에 다시 묻지 않습니다
  // (예약 실행마다 승인된 저장소 수만큼 요청하지 않게).
  const stamps = previous && typeof previous.repos === 'object' && previous.repos ? previous.repos : {};
  const repoStamps = {};
  const lists = await mapLimited(approved, REPOS_AT_ONCE, async (repo) => {
    const owner = repo.owner.toLowerCase();
    const old = before.get(owner) || new Map();
    if (repo.updatedAt && stamps[owner] === repo.updatedAt) {
      repoStamps[owner] = repo.updatedAt;
      return [...old.values()];
    }
    try {
      const entries = await readModules(repo, old);
      if (repo.updatedAt) repoStamps[owner] = repo.updatedAt;
      return entries;
    } catch {
      // 이 저장소를 이번에 읽지 못했습니다. 실려 있던 모듈을 그대로 두고, 읽은 시각을 적지 않아 다음 실행이 다시 읽게 합니다.
      stats.kept += 1;
      return [...old.values()];
    }
  });
  stats.repos = approved.length;

  const all = lists.flat().map((item) => validateForgeEntry(item)).filter(Boolean).sort(byUpdatedDesc);
  const items = [];
  let bytes = 0;
  for (const item of all) {
    if (items.length >= MAX_FORGE_ITEMS) break;
    const row = stored(item);
    const size = Buffer.byteLength(JSON.stringify(row), 'utf8') + 8;
    if (bytes + size > INDEX_BYTES_BUDGET) break;
    bytes += size;
    items.push(row);
  }
  stats.modules = items.length;

  pending.sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')) || a.fullName.localeCompare(b.fullName));
  const pendingItems = pending.slice(0, MAX_PENDING_ITEMS).map(({ fullName, title, owner, htmlUrl, updatedAt }) => ({ fullName, title, owner, htmlUrl, updatedAt }));
  stats.pending = pendingItems.length;

  // 내용이 그대로면 만든 시각도 그대로 둡니다. 그러면 파일이 바뀌지 않아 목록 브랜치에 빈 커밋이 쌓이지 않습니다.
  const stamp = now().toISOString();
  const keep = (old, next) => (old && typeof old.generatedAt === 'string' && Array.isArray(old.items) && sameItems(old.items, next) ? old.generatedAt : stamp);
  return {
    forge: {
      version: FORGE_INDEX_VERSION, generatedAt: keep(previous, items), topic: FORGE_TOPIC, items,
      repos: Object.fromEntries(Object.entries(repoStamps).sort(([a], [b]) => a.localeCompare(b))),
    },
    pending: { version: FORGE_INDEX_VERSION, generatedAt: keep(previousPending, pendingItems), topic: FORGE_TOPIC, items: pendingItems },
    stats,
  };
}

/** 승인 대기 목록(PENDING.md)에 덧붙이는 대장간 부분. 교사가 GitHub에서 읽습니다. 문구: docs/reference/solar/forge-github-261112-solar.md(블록 17) */
export const FORGE_PENDING_TEXT = {
  title: '승인 대기 대장간 저장소',
  intro: '이 표는 학생이 대장간 모듈을 공개했지만 아직 승인되지 않은 저장소의 목록입니다. 승인하는 방법은 저장소의 modules 폴더를 열어 모듈의 이름과 설명을 확인한 뒤 표의 마지막 칸에 있는 줄을 같은 브랜치의 approvals.txt에 추가하는 것입니다. 승인은 저장소 단위이므로 승인한 저장소에 학생이 나중에 올리는 모듈도 모두의 모듈에 표시됩니다.',
  none: '승인을 기다리는 대장간 저장소가 없습니다.',
  columns: ['저장소', '올린 사람', '고친 날짜', '승인 파일에 추가할 줄'],
};

export function renderForgePendingMarkdown(pending) {
  const lines = [`## ${FORGE_PENDING_TEXT.title}`, '', FORGE_PENDING_TEXT.intro, ''];
  if (!pending.items.length) {
    lines.push(FORGE_PENDING_TEXT.none, '');
    return lines.join('\n');
  }
  lines.push(`| ${FORGE_PENDING_TEXT.columns.join(' | ')} |`, '|---|---|---|---|');
  for (const item of pending.items) {
    const date = item.updatedAt ? item.updatedAt.slice(0, 10) : '';
    lines.push(`| [${escapeMarkdown(item.fullName)}](${item.htmlUrl}/tree/HEAD/${FORGE_DIR}) | ${escapeMarkdown(item.owner)} | ${date} | \`approve ${item.fullName}\` |`);
  }
  lines.push('');
  return lines.join('\n');
}
