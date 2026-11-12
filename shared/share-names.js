/**
 * 짧은 공유 주소(/s/<이름>)의 이름 규칙. 한 곳에서만 고칩니다(코드 하나, 배포 둘).
 *   - 오픈소스 판: cloudflare/share-core.js(Cloudflare Pages 함수 + D1)
 *   - 수업용 판: server/routes/share.js(Railway Express + Supabase)
 *   - 화면: client/src/utils/share.js(보내기 전 검사)
 *
 * 규칙: 영어 소문자·숫자·하이픈(-) 3~30자, 하이픈으로 시작·끝 금지, 하이픈 두 개 연속 금지. 먼저 정한 사람이 씁니다.
 */

export const SHARE_NAME_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,28})[a-z0-9]$/;

/** 시스템 경로나 사칭에 쓰일 수 있는 이름 */
export const RESERVED_NAMES = new Set([
  'admin', 'administrator', 'api', 'app', 'assets', 'about', 'blog', 'docs', 'drive-lab', 'edit', 'embed', 'error',
  'gallery', 'help', 'home', 'index', 'login', 'logout', 'new', 'null', 'official', 'privacy', 'pyodide', 'root',
  'sandbox', 'security', 'settings', 'share', 'signin', 'signup', 'staff', 'support', 'system', 'teacher', 'terms',
  'undefined', 'vpylab', 'vpylab-official', 'www',
]);

/** 이름에 들어가면 안 되는 말(영어·한국어 로마자 표기). 학교에서 쓰는 서비스라 보수적으로 막습니다. */
export const BLOCKED_WORDS = [
  'fuck', 'shit', 'bitch', 'cunt', 'dick', 'pussy', 'porn', 'sex', 'nigg', 'fag', 'rape', 'whore', 'slut',
  'sibal', 'ssibal', 'shibal', 'sibbal', 'ssibbal', 'gaesaekki', 'gaesaeki', 'gaeseki', 'byungsin', 'byeongsin',
  'jiral', 'jiraal', 'bozi', 'tlqkf', 'qudtls', 'rotorl',
];

/** 화면과 서버가 같은 문구를 쓰도록 오류 코드별 안내를 둡니다. 문구: docs/reference/solar/short-share-261109-solar.md */
export const SHARE_NAME_MESSAGES = Object.freeze({
  name_invalid: '이름이 규칙에 맞지 않습니다. 이름은 영어 소문자, 숫자, 하이픈(-)으로 3~30자여야 하며, 하이픈으로 시작하거나 끝날 수 없습니다.',
  name_reserved: '이 이름은 사용할 수 없습니다. 다른 이름을 정하십시오.',
  name_blocked: '이 이름은 사용할 수 없습니다. 다른 이름을 정하십시오.',
  name_taken: '이미 다른 사람이 사용하는 이름입니다. 다른 이름을 정하십시오.',
});

/**
 * 이름을 정규화하고 검사합니다.
 * @returns {{ name: string } | { error: 'name_invalid' | 'name_reserved' | 'name_blocked' }}
 */
export function checkShareName(raw) {
  const name = String(raw ?? '').trim().toLowerCase();
  if (!SHARE_NAME_PATTERN.test(name) || name.includes('--')) return { error: 'name_invalid' };
  if (RESERVED_NAMES.has(name)) return { error: 'name_reserved' };
  const flat = name.replace(/-/g, '');
  if (BLOCKED_WORDS.some((word) => flat.includes(word))) return { error: 'name_blocked' };
  return { name };
}
