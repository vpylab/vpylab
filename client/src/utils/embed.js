/**
 * 임베드(iframe) 주소와 코드.
 * /embed/:id 는 짧은 공유 주소(/s/:id)의 코드를 3D 화면만으로 보여 줍니다.
 */

/** 임베드 주소는 지금 열려 있는 사이트의 출처로 만듭니다. */
export function shareOrigin() {
  return window.location.origin;
}

/** 공유 코드의 일반 페이지 주소 (/s/:id) */
export function workUrl(id, origin = shareOrigin()) {
  return `${origin}/s/${encodeURIComponent(id)}`;
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
