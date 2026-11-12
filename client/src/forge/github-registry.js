/**
 * GitHub 연동 대장간의 모두의 모듈(오픈소스 판, 서버·DB 없음). 수업용 판의 registry.js(Supabase)를 대신합니다.
 *
 *   - 모두의 모듈 목록: 정적 목록 파일(forge.json) 하나를 읽습니다. 로그인하지 않아도 보고 가져올 수 있습니다.
 *   - 가져오기: 네트워크 요청 없이 이 브라우저의 보관함에 사본을 만들고, 원본을 `gh:<GitHub 아이디>/<모듈 ID>`로 기록합니다.
 *   - 공개 등록과 공개 내리기: GitHub에 연결한 학생의 저장소 `<아이디>/vpylab-forge`에 파일을 올리거나 지웁니다.
 *     모두의 모듈에 실리는 것은 교사가 그 저장소를 승인한 뒤입니다(scripts/gallery/forge-index.mjs).
 *
 * GitHub 연결 코드(client/src/github/)는 필요할 때만 불러옵니다. 목록 보기와 가져오기에는 필요하지 않습니다.
 * 목록과 저장소에서 읽은 모듈은 대장간의 검사기(parseModuleFile, moduleFromPublishedCode)를 통과한 것만 사용합니다.
 */
import { makeForgeModule, moduleFromPublishedCode, moduleProgram, parseModuleFile } from './modules.js';
import { loadForgeIndex } from './forge-index.js';
import { FORGE_GITHUB_TEXT } from './forge-text.js';
import { forgeFileUrlOf, forgeKeyOf, forgeSourceId, isForgeModuleId, parseForgeSourceId, readForgeModuleHeader } from '../../../server/shared/forge-rules.js';

const loadSession = () => import('../github/githubSession.js');

/**
 * GitHub의 실패 까닭 가운데 대장간에서도 그대로 맞는 안내만 사용합니다.
 * 나머지 문구는 팀 프로젝트의 저장을 설명하므로(예: "코드는 편집기에 남아 있습니다") 대장간의 문구로 바꿉니다.
 */
const SHARED_REASONS = new Set(['forgeRepo', 'rate', 'server', 'forbidden', 'twoFactor']);
const failureText = (reasons, reason, fallback) => (SHARED_REASONS.has(reason) && reasons[reason] ? reasons[reason] : fallback);

/** 검사한 모듈에 화면에 필요한 값(만든 사람, 파일 주소)을 붙입니다. */
function listed(module, owner) {
  return { ...module, recordId: null, author: owner, ownerId: owner, fileUrl: forgeFileUrlOf(owner, module.id), published: true };
}

/**
 * 모두의 모듈 목록. 대장간의 검사기를 통과하지 못한 항목은 버립니다.
 * @returns {Promise<{modules: object[], hasMore: false, keys: Set<string>}>} keys는 목록에 실린 모듈(아이디/모듈 ID)
 */
export async function fetchPublicForgeModules({ load = loadForgeIndex } = {}) {
  let index;
  try {
    index = await load();
  } catch {
    throw new Error(FORGE_GITHUB_TEXT.loadFailed);
  }
  const modules = [];
  for (const entry of index.items) {
    try {
      modules.push({ ...listed(parseModuleFile(JSON.stringify(entry.module)), entry.owner), publicListing: true, updatedAt: entry.updatedAt });
    } catch { /* 이 앱의 대장간이 읽을 수 없는 모듈입니다. */ }
  }
  return { modules, hasMore: false, keys: new Set(modules.map((module) => forgeKeyOf(module.ownerId, module.id))) };
}

/** 모두의 모듈 하나를 내 작업대로 가져옵니다. 새 모듈 ID를 만들고 원본을 기록합니다. 네트워크 요청은 없습니다. */
export function forkPublicForgeModule(module) {
  return makeForgeModule(module.recipe, {
    title: `${module.title} · 내 포크`,
    description: module.description,
    source: { id: forgeSourceId(module.ownerId, module.id), title: module.title, author: module.author },
    references: module.references,
  });
}

/** 모듈의 원본 표시가 GitHub의 모듈이면 그 파일의 주소를 돌려줍니다. 아니면 null. */
export function forgeSourceUrl(source) {
  const parsed = parseForgeSourceId(source?.id);
  return parsed ? forgeFileUrlOf(parsed.owner, parsed.id) : null;
}

/** GitHub에 올릴 때의 모듈 ID. 파일 이름으로 사용할 수 없는 ID는 새로 만듭니다. */
function publishableId(module) {
  return isForgeModuleId(module.id) && !module.id.startsWith('builtin-') ? module.id : crypto.randomUUID();
}

/** 이 탭이 GitHub에 연결되어 있으면 그 GitHub 아이디, 아니면 null. GitHub에 요청하지 않습니다. */
export async function forgeLogin({ session = loadSession } = {}) {
  const { useGitHubStore } = await session();
  useGitHubStore.getState().restore();
  const { account, needsReauth } = useGitHubStore.getState();
  return account && !needsReauth ? account.login : null;
}

/**
 * 이 탭이 GitHub에 연결되어 있으면 내 저장소에 올린 모듈을 읽습니다. 연결이 없으면 null.
 * @returns {Promise<{login: string, modules: object[]}|null>}
 */
export async function fetchOwnForgeModules({ session = loadSession } = {}) {
  const { useGitHubStore } = await session();
  useGitHubStore.getState().restore();
  const result = await useGitHubStore.getState().forgeMine();
  if (result.status === 'disconnected' || result.status === 'stale') return null;
  if (result.status !== 'ok') throw new Error(FORGE_GITHUB_TEXT.ownLoadFailed);
  // 목록을 만드는 스크립트와 같은 방법(첫 줄의 모듈 자료)으로 읽습니다. 본문 코드가 지금의 생성 코드와 달라도
  // (앱이 바뀌었거나 손으로 고친 경우) 내 모듈로 보여야 공개를 내릴 수 있습니다. 화면과 실행에는 레시피에서 다시 만든 코드를 사용합니다.
  const modules = result.items.flatMap((item) => {
    const raw = readForgeModuleHeader(item.code, { id: item.id });
    if (!raw) return [];
    try { return [listed(parseModuleFile(JSON.stringify(raw)), result.login)]; } catch { return []; }
  });
  return { login: result.login, modules };
}

/**
 * 모듈을 내 GitHub 저장소에 올립니다. GitHub에 연결된 탭에서만 동작합니다.
 * @returns {Promise<{module: object, changed: boolean, fresh: boolean}>}
 */
export async function publishForgeModule(input, { session = loadSession } = {}) {
  let module;
  let code;
  try {
    module = makeForgeModule(input.recipe, { ...input, id: publishableId(input), recordId: null });
    code = moduleProgram(module);
  } catch {
    throw new Error(FORGE_GITHUB_TEXT.invalid);
  }
  if (!moduleFromPublishedCode(code)) throw new Error(FORGE_GITHUB_TEXT.invalid);
  const { useGitHubStore, GITHUB_REASON_TEXT } = await session();
  useGitHubStore.getState().restore();
  const result = await useGitHubStore.getState().forgePublish({ id: module.id, code, title: module.title });
  if (result.status === 'disconnected' || result.status === 'stale') throw new Error(FORGE_GITHUB_TEXT.disconnected);
  if (result.status !== 'ok') throw new Error(failureText(GITHUB_REASON_TEXT, result.reason, FORGE_GITHUB_TEXT.publishFailed));
  return { module: listed(module, result.login), changed: result.changed, fresh: result.fresh };
}

/** 내 GitHub 저장소에서 모듈 파일을 지워 공개를 내립니다. */
export async function unpublishForgeModule(id, { session = loadSession } = {}) {
  const { useGitHubStore, GITHUB_REASON_TEXT } = await session();
  useGitHubStore.getState().restore();
  const result = await useGitHubStore.getState().forgeUnpublish(id);
  if (result.status === 'disconnected' || result.status === 'stale') throw new Error(FORGE_GITHUB_TEXT.disconnected);
  if (result.status !== 'ok') throw new Error(failureText(GITHUB_REASON_TEXT, result.reason, FORGE_GITHUB_TEXT.unpublishFailed));
  return id;
}
