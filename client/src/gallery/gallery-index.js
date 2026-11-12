/**
 * GitHub 연동 갤러리의 목록 읽기(오픈소스 판, 서버·DB 없음).
 *
 * 앱은 정적 목록 파일(gallery.json) 하나만 읽습니다. GitHub 검색을 직접 부르지 않습니다.
 * 학교는 한 IP를 함께 사용해 검색 한도에 걸리기 쉽고, 검색 결과를 그대로 보이면 승인 단계를 둘 수 없기 때문입니다.
 * 목록은 .github/workflows/gallery-index.yml이 주기적으로 만들고(scripts/gallery/), 교사가 승인한 작품만 들어 있습니다.
 *
 * 읽은 목록은 만든 쪽과 같은 규칙(server/shared/gallery-rules.js)으로 다시 검사합니다.
 * 다른 학교가 자기 목록 주소를 넣을 수 있으므로 파일 내용을 믿지 않습니다.
 */
import { GALLERY_INDEX_URL } from '../lib/api-base.js';
import { isAllowedIndexUrl, validateGalleryIndex } from '../../../server/shared/gallery-rules.js';

export const GALLERY_FETCH_TIMEOUT_MS = 15_000;
export const MAX_INDEX_BYTES = 2 * 1024 * 1024;

/** reason: off(목록 주소 없음) · network · timeout · http · tooLarge · format */
export class GalleryLoadError extends Error {
  constructor(reason, { status = 0 } = {}) {
    super(`gallery index: ${reason}`);
    this.name = 'GalleryLoadError';
    this.reason = reason;
    this.status = status;
  }
}

/**
 * 목록을 읽어 { items, generatedAt }를 돌려줍니다. 실패하면 GalleryLoadError를 던집니다.
 * @param {object} [options]
 * @param {string} [options.url]
 * @param {typeof fetch} [options.fetchImpl]
 * @param {number} [options.timeoutMs]
 */
export async function loadGalleryIndex({
  url = GALLERY_INDEX_URL,
  fetchImpl = (...args) => globalThis.fetch(...args),
  timeoutMs = GALLERY_FETCH_TIMEOUT_MS,
} = {}) {
  if (!isAllowedIndexUrl(url)) throw new GalleryLoadError('off');
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  let response;
  let text;
  try {
    // 로그인 정보나 쿠키를 보내지 않습니다. 목록은 누구나 읽는 공개 파일입니다.
    response = await fetchImpl(url, { signal: controller?.signal, credentials: 'omit', headers: { Accept: 'application/json' } });
    if (!response.ok) throw new GalleryLoadError('http', { status: response.status });
    text = await response.text();
  } catch (error) {
    if (error instanceof GalleryLoadError) throw error;
    throw new GalleryLoadError(error?.name === 'AbortError' ? 'timeout' : 'network');
  } finally {
    clearTimeout(timer);
  }
  if (text.length > MAX_INDEX_BYTES) throw new GalleryLoadError('tooLarge');
  let data;
  try { data = JSON.parse(text); } catch { throw new GalleryLoadError('format'); }
  const index = validateGalleryIndex(data);
  if (!index) throw new GalleryLoadError('format');
  return index;
}
