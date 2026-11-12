/**
 * GitHub 연동 갤러리의 목록 규칙. 목록을 만드는 스크립트(scripts/gallery/)와 목록을 읽는 앱(client/src/gallery/)이 함께 사용합니다.
 *
 * 목록 파일은 GitHub 검색 결과에서 만들어지고, 다른 학교가 자기 목록 주소를 넣을 수도 있습니다.
 * 그래서 만드는 쪽과 읽는 쪽이 같은 규칙으로 항목을 다시 검사합니다.
 *   - 제목과 아이디는 글자로만 다룹니다(제어 문자·방향 제어 문자 제거, 길이 제한).
 *   - 주소는 항목의 저장소 이름에서 다시 만든 값과 같을 때만 받아들입니다.
 *     https://github.com/<owner>/<repo> · https://<owner>.github.io/<repo>/ · https://raw.githubusercontent.com/<owner>/<repo>/<branch>/thumbnail.jpg
 * 의존성이 없는 순수 모듈입니다(브라우저와 Node에서 모두 동작).
 */

export const GALLERY_TOPIC = 'vpylab-gallery';
export const PROJECT_TOPIC = 'vpylab-project';
export const GALLERY_INDEX_VERSION = 1;
export const MAX_GALLERY_ITEMS = 500;
export const MAX_TITLE_LENGTH = 100;
export const THUMBNAIL_PATH = 'thumbnail.jpg';
export const MAX_THUMBNAIL_BYTES = 200 * 1024;

const OWNER_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;
const NAME_PATTERN = /^[A-Za-z0-9._-]{1,100}$/;

const isName = (value) => typeof value === 'string' && NAME_PATTERN.test(value) && value !== '.' && value !== '..';

export function isGitHubLogin(value) {
  return typeof value === 'string' && OWNER_PATTERN.test(value);
}

/** 'owner/repo'를 나눕니다. 형식이 다르면 null. */
export function parseFullName(fullName) {
  if (typeof fullName !== 'string') return null;
  const parts = fullName.split('/');
  if (parts.length !== 2 || !isGitHubLogin(parts[0]) || !isName(parts[1])) return null;
  return { owner: parts[0], repo: parts[1] };
}

/** 브랜치 이름은 주소에 넣어도 안전한 글자만 받습니다(빗금이 든 브랜치는 미리보기 그림을 싣지 않습니다). */
export function isSafeBranch(value) {
  return isName(value);
}

/** 한 줄 글자: 제어 문자, 줄바꿈, 글자 방향을 바꾸는 문자를 지우고 길이를 줄입니다. */
export function cleanTitle(value, fallback = '') {
  const text = typeof value === 'string' ? value : '';
  const cleaned = text
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2060-\u2069\ufeff]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return Array.from(cleaned).slice(0, MAX_TITLE_LENGTH).join('') || fallback;
}

export function htmlUrlOf(owner, repo) {
  return `https://github.com/${owner}/${repo}`;
}

export function pagesUrlOf(owner, repo) {
  return `https://${String(owner).toLowerCase()}.github.io/${repo}/`;
}

export function thumbnailUrlOf(owner, repo, branch) {
  return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${THUMBNAIL_PATH}`;
}

/**
 * 항목의 주소가 그 저장소의 주소인지 확인합니다.
 * @param {'html'|'pages'|'thumbnail'} kind
 * @param {string} url
 * @param {{owner:string, repo:string}} target
 */
export function isAllowedGalleryUrl(kind, url, target) {
  if (typeof url !== 'string' || !target || !isGitHubLogin(target.owner) || !isName(target.repo)) return false;
  const { owner, repo } = target;
  if (kind === 'html') return url === htmlUrlOf(owner, repo);
  if (kind === 'pages') return url === pagesUrlOf(owner, repo);
  if (kind === 'thumbnail') {
    const prefix = `https://raw.githubusercontent.com/${owner}/${repo}/`;
    const suffix = `/${THUMBNAIL_PATH}`;
    if (!url.startsWith(prefix) || !url.endsWith(suffix)) return false;
    return isSafeBranch(url.slice(prefix.length, url.length - suffix.length));
  }
  return false;
}

function cleanDate(value) {
  if (typeof value !== 'string' || value.length > 40) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

function cleanCount(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

/**
 * 목록 항목 하나를 검사해 필요한 값만 남긴 새 객체로 돌려줍니다. 받아들일 수 없으면 null.
 * 저장소 이름이 잘못됐거나 저장소 주소가 그 이름과 다르면 항목을 버립니다.
 * 게시 주소와 미리보기 그림 주소는 선택 값이라, 잘못됐으면 그 값만 비웁니다.
 */
export function validateGalleryEntry(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const target = parseFullName(raw.fullName);
  if (!target) return null;
  if (raw.owner !== target.owner) return null;
  if (!isAllowedGalleryUrl('html', raw.htmlUrl, target)) return null;
  return {
    fullName: `${target.owner}/${target.repo}`,
    title: cleanTitle(raw.title, target.repo),
    owner: target.owner,
    htmlUrl: htmlUrlOf(target.owner, target.repo),
    pagesUrl: isAllowedGalleryUrl('pages', raw.pagesUrl, target) ? raw.pagesUrl : null,
    thumbnailUrl: isAllowedGalleryUrl('thumbnail', raw.thumbnailUrl, target) ? raw.thumbnailUrl : null,
    stars: cleanCount(raw.stars),
    updatedAt: cleanDate(raw.updatedAt),
  };
}

/** 목록 파일 전체를 검사합니다. 형식이 다르면 null, 잘못된 항목은 버립니다. */
export function validateGalleryIndex(data) {
  if (!data || typeof data !== 'object' || data.version !== GALLERY_INDEX_VERSION || !Array.isArray(data.items)) return null;
  const seen = new Set();
  const items = [];
  for (const raw of data.items) {
    if (items.length >= MAX_GALLERY_ITEMS) break;
    const entry = validateGalleryEntry(raw);
    if (!entry) continue;
    const key = entry.fullName.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(entry);
  }
  return { version: GALLERY_INDEX_VERSION, generatedAt: cleanDate(data.generatedAt), items };
}

/**
 * 앱이 읽을 목록 주소로 받아들일 수 있는지. 본 앱의 CSP(connect-src)가 허용하는 두 가지만 받습니다.
 *   - https://raw.githubusercontent.com/… (저장소의 목록 브랜치)
 *   - 같은 출처의 경로(/로 시작, //는 제외)
 */
export function isAllowedIndexUrl(url) {
  if (typeof url !== 'string' || !url || /\s/.test(url)) return false;
  if (url.startsWith('/')) return !url.startsWith('//') && !url.includes('\\');
  return /^https:\/\/raw\.githubusercontent\.com\/[A-Za-z0-9-]+\/[A-Za-z0-9._-]+\/[A-Za-z0-9._/-]+\.json$/.test(url);
}
