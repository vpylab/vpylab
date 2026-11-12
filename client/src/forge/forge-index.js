/**
 * GitHub 연동 대장간의 목록 읽기(오픈소스 판, 서버·DB 없음).
 *
 * 앱은 정적 목록 파일(forge.json) 하나만 읽습니다. GitHub API를 직접 부르지 않습니다.
 * 목록은 .github/workflows/gallery-index.yml이 주기적으로 만들고(scripts/gallery/forge-index.mjs),
 * 교사가 승인한 저장소의 모듈만 들어 있습니다.
 *
 * 읽은 목록은 만든 쪽과 같은 규칙(server/shared/forge-rules.js)으로 다시 검사하고,
 * 모듈의 내용은 대장간의 검사기(parseModuleFile)로 한 번 더 검사합니다(github-registry.js).
 */
import { FORGE_INDEX_URL } from '../lib/api-base.js';
import { isAllowedIndexUrl } from '../../../server/shared/gallery-rules.js';
import { MAX_FORGE_INDEX_BYTES, validateForgeIndex } from '../../../server/shared/forge-rules.js';

export const FORGE_FETCH_TIMEOUT_MS = 15_000;

/** reason: off(목록 주소 없음) · network · timeout · http · tooLarge · format */
export class ForgeLoadError extends Error {
  constructor(reason, { status = 0 } = {}) {
    super(`forge index: ${reason}`);
    this.name = 'ForgeLoadError';
    this.reason = reason;
    this.status = status;
  }
}

/**
 * 목록을 읽어 { items, generatedAt }를 돌려줍니다. 실패하면 ForgeLoadError를 던집니다.
 * @param {object} [options]
 * @param {string} [options.url]
 * @param {typeof fetch} [options.fetchImpl]
 * @param {number} [options.timeoutMs]
 */
export async function loadForgeIndex({
  url = FORGE_INDEX_URL,
  fetchImpl = (...args) => globalThis.fetch(...args),
  timeoutMs = FORGE_FETCH_TIMEOUT_MS,
} = {}) {
  if (!isAllowedIndexUrl(url)) throw new ForgeLoadError('off');
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  let text;
  try {
    // 로그인 정보나 쿠키를 보내지 않습니다. 목록은 누구나 읽는 공개 파일입니다.
    const response = await fetchImpl(url, { signal: controller?.signal, credentials: 'omit', headers: { Accept: 'application/json' } });
    if (!response.ok) throw new ForgeLoadError('http', { status: response.status });
    text = await response.text();
  } catch (error) {
    if (error instanceof ForgeLoadError) throw error;
    throw new ForgeLoadError(error?.name === 'AbortError' ? 'timeout' : 'network');
  } finally {
    clearTimeout(timer);
  }
  if (text.length > MAX_FORGE_INDEX_BYTES) throw new ForgeLoadError('tooLarge');
  let data;
  try { data = JSON.parse(text); } catch { throw new ForgeLoadError('format'); }
  const index = validateForgeIndex(data);
  if (!index) throw new ForgeLoadError('format');
  return index;
}
