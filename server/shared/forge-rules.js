/**
 * GitHub 연동 대장간(모두의 모듈)의 목록 규칙. 목록을 만드는 스크립트(scripts/gallery/forge-index.mjs)와
 * 목록을 읽는 앱(client/src/forge/)이 함께 사용합니다.
 *
 * 구조
 *   - 학생은 자기 GitHub 계정의 공개 저장소 `vpylab-forge`에 모듈을 올립니다. 모듈 하나가 파일 하나입니다(modules/<모듈 ID>.py).
 *   - 파일은 대장간이 만든 파이썬 코드이고, 첫 줄(`# vpylab-forge:v1 <base64>`)에 모듈 자료(JSON)가 들어 있습니다.
 *   - 저장소에 topic `vpylab-forge`가 붙어 있고 교사가 승인한 것만 공개 목록(forge.json)에 들어갑니다.
 *
 * 목록 파일은 누구나 올린 파일에서 만들어지고, 다른 학교가 자기 목록 주소를 넣을 수도 있습니다.
 * 그래서 여기서는 크기와 겉모양만 검사하고, 모듈의 내용(레시피)은 앱이 대장간의 검사기(parseModuleFile)로 다시 검사합니다.
 * 의존성이 없는 순수 모듈입니다(브라우저와 Node에서 모두 동작).
 */
import { cleanTitle, isGitHubLogin, parseFullName } from './gallery-rules.js';

export const FORGE_TOPIC = 'vpylab-forge';
export const FORGE_REPO = 'vpylab-forge';
export const FORGE_DIR = 'modules';
export const FORGE_INDEX_VERSION = 1;
export const FORGE_MODULE_PREFIX = '# vpylab-forge:v1 ';
export const FORGE_MODULE_FORMAT = 'vpylab-forge';
export const MAX_FORGE_ITEMS = 300;
export const MAX_FORGE_MODULES_PER_REPO = 50;
/** 저장소의 모듈 파일(.py) 하나의 상한 */
export const MAX_FORGE_FILE_BYTES = 160 * 1024;
/** 목록에 싣는 모듈 자료(JSON) 하나의 상한. 제목·설명·참고 링크 8개를 모두 채워도 이 안에 들어옵니다. */
export const MAX_FORGE_MODULE_JSON_BYTES = 24 * 1024;
/** 목록 파일 전체의 상한. 앱은 이보다 큰 목록을 읽지 않습니다. */
export const MAX_FORGE_INDEX_BYTES = 2 * 1024 * 1024;

// 36자: 대장간이 만드는 모듈 ID(UUID)의 길이. 원본 표시 `gh:<아이디 39자>/<모듈 ID>`가 모듈의 출처 칸(80자)에 들어가야 합니다.
const ID_PATTERN = /^[A-Za-z0-9_-]{1,36}$/;
const SHA_PATTERN = /^[0-9a-f]{40,64}$/;

/** 저장소에 올릴 수 있는 모듈 ID인지. 파일 이름과 원본 표시(gh:아이디/모듈 ID)에 그대로 들어갑니다. */
export function isForgeModuleId(value) {
  return typeof value === 'string' && ID_PATTERN.test(value);
}

export function forgeFilePath(id) {
  return `${FORGE_DIR}/${id}.py`;
}

/** 'abc.py' → 'abc'. 모듈 파일 이름이 아니면 null. */
export function forgeIdOfFileName(name) {
  if (typeof name !== 'string' || !name.endsWith('.py')) return null;
  const id = name.slice(0, -3);
  return isForgeModuleId(id) ? id : null;
}

export function forgeRepoUrlOf(owner) {
  return `https://github.com/${owner}/${FORGE_REPO}`;
}

export function forgeFileUrlOf(owner, id) {
  return `${forgeRepoUrlOf(owner)}/blob/HEAD/${forgeFilePath(id)}`;
}

/** 다른 사람의 모듈을 가져와 고쳤을 때 모듈 안에 남기는 원본 표시: gh:<GitHub 아이디>/<모듈 ID> */
export function forgeSourceId(owner, id) {
  return `gh:${owner}/${id}`;
}

export function parseForgeSourceId(value) {
  if (typeof value !== 'string' || !value.startsWith('gh:')) return null;
  const parts = value.slice(3).split('/');
  if (parts.length !== 2 || !isGitHubLogin(parts[0]) || !isForgeModuleId(parts[1])) return null;
  return { owner: parts[0], id: parts[1] };
}

const byteLength = (text) => new TextEncoder().encode(text).length;

function decodeBase64Utf8(text) {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

/**
 * 모듈 자료의 겉모양을 검사합니다. 받아들일 수 없으면 null.
 * 레시피의 값은 여기서 보지 않습니다. 앱이 대장간의 검사기로 다시 검사해, 통과한 것만 화면에 보입니다.
 */
export function checkForgeModule(raw, { id } = {}) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  if (raw.format !== FORGE_MODULE_FORMAT || raw.version !== 1) return null;
  if (!isForgeModuleId(raw.id) || (id !== undefined && raw.id !== id)) return null;
  if (typeof raw.title !== 'string' || !raw.recipe || typeof raw.recipe !== 'object') return null;
  let size;
  try { size = byteLength(JSON.stringify(raw)); } catch { return null; }
  if (size > MAX_FORGE_MODULE_JSON_BYTES) return null;
  return raw;
}

/**
 * 모듈 파일(.py)의 첫 줄에서 모듈 자료를 꺼냅니다. 대장간이 만든 파일이 아니거나 파일 이름과 모듈 ID가 다르면 null.
 * @param {string} code 파일 내용
 * @param {{id?: string}} [expected] 파일 이름에서 읽은 모듈 ID
 */
export function readForgeModuleHeader(code, expected = {}) {
  if (typeof code !== 'string' || !code.startsWith(FORGE_MODULE_PREFIX)) return null;
  if (code.length > MAX_FORGE_FILE_BYTES) return null;
  const header = code.split('\n', 1)[0].slice(FORGE_MODULE_PREFIX.length).trim();
  if (!header || header.length > Math.ceil((MAX_FORGE_MODULE_JSON_BYTES * 4) / 3) + 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(header)) return null;
  try {
    return checkForgeModule(JSON.parse(decodeBase64Utf8(header)), expected);
  } catch {
    return null;
  }
}

function cleanDate(value) {
  if (typeof value !== 'string' || value.length > 40) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

/** 목록에서 모듈 하나를 구별하는 값(대소문자를 가리지 않는 아이디 + 모듈 ID) */
export function forgeKeyOf(owner, id) {
  return `${String(owner).toLowerCase()}/${id}`;
}

/**
 * 목록 항목 하나를 검사해 필요한 값만 남긴 새 객체로 돌려줍니다. 받아들일 수 없으면 null.
 * 주소는 목록에 적힌 값을 옮기지 않고 아이디와 모듈 ID에서 다시 만듭니다.
 */
export function validateForgeEntry(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (!isGitHubLogin(raw.owner) || !isForgeModuleId(raw.id)) return null;
  const module = checkForgeModule(raw.module, { id: raw.id });
  if (!module) return null;
  return {
    owner: raw.owner,
    id: raw.id,
    sha: typeof raw.sha === 'string' && SHA_PATTERN.test(raw.sha) ? raw.sha : null,
    fileUrl: forgeFileUrlOf(raw.owner, raw.id),
    updatedAt: cleanDate(raw.updatedAt),
    module,
  };
}

/** 목록 파일 전체를 검사합니다. 형식이 다르면 null, 잘못된 항목은 버립니다. */
export function validateForgeIndex(data) {
  if (!data || typeof data !== 'object' || data.version !== FORGE_INDEX_VERSION || !Array.isArray(data.items)) return null;
  const seen = new Set();
  const items = [];
  for (const raw of data.items) {
    if (items.length >= MAX_FORGE_ITEMS) break;
    const entry = validateForgeEntry(raw);
    if (!entry) continue;
    const key = forgeKeyOf(entry.owner, entry.id);
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(entry);
  }
  return { version: FORGE_INDEX_VERSION, generatedAt: cleanDate(data.generatedAt), items };
}

/**
 * 검색 결과의 저장소가 대장간 저장소인지 확인해 필요한 값만 돌려줍니다. 아니면 null.
 * 공개 저장소이고, 보관·사용 중지 상태가 아니며, 이름이 `vpylab-forge`이고 topic `vpylab-forge`가 있어야 합니다.
 */
export function toForgeRepo(repo) {
  if (!repo || typeof repo !== 'object') return null;
  if (repo.private !== false || repo.archived || repo.disabled) return null;
  if (repo.visibility !== undefined && repo.visibility !== 'public') return null;
  if (!Array.isArray(repo.topics) || !repo.topics.includes(FORGE_TOPIC)) return null;
  const target = parseFullName(repo.full_name);
  if (!target || repo.owner?.login !== target.owner || repo.name !== target.repo || target.repo !== FORGE_REPO) return null;
  const branch = typeof repo.default_branch === 'string' && /^[A-Za-z0-9._-]{1,100}$/.test(repo.default_branch) ? repo.default_branch : null;
  if (!branch) return null;
  return {
    fullName: `${target.owner}/${target.repo}`,
    owner: target.owner,
    title: cleanTitle(repo.description, target.repo),
    htmlUrl: forgeRepoUrlOf(target.owner),
    updatedAt: cleanDate(repo.pushed_at || repo.updated_at || null),
    branch,
  };
}
