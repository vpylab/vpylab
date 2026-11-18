/**
 * 임베드(iframe) 주소와 코드.
 * /embed/:id 는 갤러리 작품(uuid) 또는 공유 코드(nanoid 8자)를 3D 화면만으로 보여 줍니다.
 */
export const PUBLIC_ORIGIN = 'https://vpylab.vercel.app';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isGalleryId(id) {
  return UUID.test(String(id || ''));
}

/** 작품을 만든 배포의 저장소에서 같은 ID를 읽습니다. */
export function shareOrigin() {
  return typeof window === 'undefined' ? PUBLIC_ORIGIN : window.location.origin;
}

/** 작품·공유 코드의 일반 페이지 주소 (/gallery/:id 또는 /s/:id) */
export function workUrl(id, origin = shareOrigin()) {
  const path = isGalleryId(id) ? `/gallery/${id}` : `/s/${encodeURIComponent(id)}`;
  return `${origin}${path}`;
}

export function embedUrl(id, origin = shareOrigin()) {
  return `${origin}/embed/${encodeURIComponent(id)}`;
}

export function embedCode(id, { width = 800, height = 500, origin } = {}) {
  return `<iframe src="${embedUrl(id, origin)}" width="${width}" height="${height}" allow="autoplay; fullscreen" loading="lazy" title="VPyLab"></iframe>`;
}

export async function copyEmbedCode(id, options) {
  try {
    await navigator.clipboard.writeText(embedCode(id, options));
    return true;
  } catch {
    return false;
  }
}
