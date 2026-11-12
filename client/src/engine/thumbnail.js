/**
 * VPyLab — 3D 뷰포트 썸네일 캡처
 * Three.js renderer의 현재 프레임을 WebP/JPEG로 변환하고, 빈 화면이면 포스터로 대체할 수 있게 판정합니다.
 */

const CATEGORY_META = {
  CT: { label: '컴퓨팅', accent: '#4A6CF7', mark: 'CT' },
  CR: { label: '창작', accent: '#E84393', mark: 'CR' },
  MA: { label: '수학', accent: '#00CEC9', mark: 'MA' },
  SC: { label: '과학', accent: '#00B894', mark: 'SC' },
  AR: { label: '아트', accent: '#F0883E', mark: 'AR' },
  SN: { label: '사운드', accent: '#6C5CE7', mark: 'SN' },
  free: { label: '자유', accent: '#2563EB', mark: 'VP' },
};

function escapeSvg(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function wrapText(value, maxChars, maxLines) {
  const words = String(value || '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines = [];
  let current = '';

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars) {
      current = next;
      continue;
    }
    if (current) lines.push(current);
    current = word.length > maxChars ? `${word.slice(0, maxChars - 1)}…` : word;
    if (lines.length >= maxLines) break;
  }

  if (current && lines.length < maxLines) lines.push(current);
  if (lines.length === maxLines && words.join(' ').length > lines.join(' ').length) {
    lines[maxLines - 1] = `${lines[maxLines - 1].replace(/…$/, '').slice(0, maxChars - 1)}…`;
  }
  return lines;
}

function svgTextLines(lines, x, y, lineHeight, attrs = '') {
  return lines.map((line, index) => (
    `<text x="${x}" y="${y + index * lineHeight}" ${attrs}>${escapeSvg(line)}</text>`
  )).join('');
}

function codePreviewLines(code) {
  const source = String(code || '')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'))
    .slice(0, 4);
  return source.length > 0 ? source : ['from vpython import *', 'scene.background = color.white', 'sphere(color=color.cyan)'];
}

function lineWidth(line, index) {
  let hash = 0;
  for (let i = 0; i < line.length; i++) hash = (hash + line.charCodeAt(i) * (i + 3)) % 97;
  return 210 + ((hash + index * 29) % 190);
}

function webpOrJpeg(canvas, quality) {
  const webp = canvas.toDataURL('image/webp', quality);
  if (webp.startsWith('data:image/webp')) return webp;
  return canvas.toDataURL('image/jpeg', quality);
}

function waitForAnimationFrame() {
  if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
    return Promise.resolve();
  }
  return new Promise(resolve => window.requestAnimationFrame(resolve));
}

function isImageDataUseful(imageData) {
  const data = imageData.data || imageData;
  const total = data.length / 4;
  if (!total) return false;

  let visible = 0;
  let dark = 0;
  let bright = 0;
  let min = 255;
  let max = 0;
  let sum = 0;
  let sumSq = 0;
  let saturationSum = 0;

  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 8) continue;
    visible++;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const channelMax = Math.max(r, g, b);
    const channelMin = Math.min(r, g, b);
    const saturation = channelMax - channelMin;

    if (lum < 12) dark++;
    if (lum > 244) bright++;
    min = Math.min(min, lum);
    max = Math.max(max, lum);
    sum += lum;
    sumSq += lum * lum;
    saturationSum += saturation;
  }

  if (visible / total < 0.25) return false;
  const mean = sum / visible;
  const variance = sumSq / visible - mean * mean;
  const dynamicRange = max - min;
  const darkRatio = dark / visible;
  const brightRatio = bright / visible;
  const saturationMean = saturationSum / visible;

  if (dynamicRange < 10 && variance < 12) return false;
  if (darkRatio > 0.985 && dynamicRange < 35 && saturationMean < 14) return false;
  if (brightRatio > 0.985 && dynamicRange < 24) return false;
  return true;
}

/**
 * Three.js renderer에서 현재 프레임을 캡처
 * @param {HTMLCanvasElement} canvas - renderer.domElement
 * @param {number} maxWidth - 최대 너비 (기본 800)
 * @param {number} quality - 이미지 품질 0~1 (기본 0.82)
 * @param {'auto'|'jpeg'} format - 'jpeg'이면 항상 JPEG로 만듭니다(GitHub 갤러리의 thumbnail.jpg). 기본은 WebP, 안 되면 JPEG.
 * @returns {string|null} data URL 문자열. 빈 화면이면 null.
 */
export function captureThumbnail(canvas, maxWidth = 800, quality = 0.82, format = 'auto') {
  if (!canvas || !canvas.width || !canvas.height) return null;

  const targetWidth = Math.min(maxWidth, canvas.width);
  const targetHeight = Math.round(targetWidth * 9 / 16);
  const sourceRatio = canvas.width / canvas.height;
  const targetRatio = targetWidth / targetHeight;
  let sx = 0;
  let sy = 0;
  let sw = canvas.width;
  let sh = canvas.height;

  if (sourceRatio > targetRatio) {
    sw = Math.round(canvas.height * targetRatio);
    sx = Math.round((canvas.width - sw) / 2);
  } else if (sourceRatio < targetRatio) {
    sh = Math.round(canvas.width / targetRatio);
    sy = Math.round((canvas.height - sh) / 2);
  }

  const offscreen = document.createElement('canvas');
  offscreen.width = targetWidth;
  offscreen.height = targetHeight;
  const ctx = offscreen.getContext('2d');
  if (!ctx) return null;

  try {
    ctx.drawImage(canvas, sx, sy, sw, sh, 0, 0, targetWidth, targetHeight);
    const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
    if (!isImageDataUseful(imageData)) return null;
    if (format === 'jpeg') {
      const jpeg = offscreen.toDataURL('image/jpeg', quality);
      return jpeg.startsWith('data:image/jpeg') ? jpeg : null;
    }
    return webpOrJpeg(offscreen, quality);
  } catch {
    return null;
  }
}

export async function captureSceneThumbnail(scene, maxWidth = 800, quality = 0.82) {
  const renderer = scene?._renderer;
  const camera = scene?._camera || scene?._cameraSystem?.camera;
  const canvas = renderer?.domElement;
  if (!scene || !renderer || !camera || !canvas) return null;

  try {
    scene.updateMatrixWorld?.(true);
    camera.updateMatrixWorld?.(true);
    renderer.render(scene, camera);
    await waitForAnimationFrame();
    renderer.render(scene, camera);
  } catch {
    return captureThumbnail(canvas, maxWidth, quality);
  }

  return captureThumbnail(canvas, maxWidth, quality);
}

export function createPosterThumbnail({
  title = 'VPyLab 작품',
  description = '',
  category = 'free',
  code = '',
  repo = '',
  author = '',
} = {}) {
  const meta = CATEGORY_META[category] || CATEGORY_META.free;
  const titleLines = wrapText(title, 18, 2);
  const descLines = wrapText(description || '코드로 만든 3D Python 프로젝트', 34, 2);
  const codeLines = codePreviewLines(code);
  const repoText = repo ? `GitHub · ${repo}` : 'VPyLab Gallery';
  const authorText = author ? `by ${author}` : meta.label;

  const codeRows = codeLines.map((line, index) => {
    const y = 382 + index * 29;
    const width = lineWidth(line, index);
    return `
      <rect x="92" y="${y - 16}" width="${width}" height="8" fill="#D8DEE9"/>
      <text x="92" y="${y}" fill="#5A5B6A" font-family="JetBrains Mono, ui-monospace, monospace" font-size="13" font-weight="700">${escapeSvg(line.slice(0, 44))}</text>
    `;
  }).join('');

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
      <defs>
        <pattern id="dots" width="24" height="24" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.2" fill="${meta.accent}" opacity="0.23"/>
        </pattern>
        <linearGradient id="scene" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="${meta.accent}" stop-opacity="0.2"/>
          <stop offset="1" stop-color="#FFFFFF" stop-opacity="0.95"/>
        </linearGradient>
      </defs>
      <rect width="960" height="540" fill="#F8FAFC"/>
      <rect width="960" height="540" fill="url(#dots)"/>
      <rect x="0" y="0" width="14" height="540" fill="${meta.accent}"/>
      <rect x="64" y="58" width="118" height="34" fill="#FFFFFF" stroke="#E5E7EB"/>
      <text x="86" y="80" fill="${meta.accent}" font-family="JetBrains Mono, ui-monospace, monospace" font-size="13" font-weight="800">${escapeSvg(meta.label)}</text>
      <text x="64" y="128" fill="#111827" font-family="Satoshi, Apple SD Gothic Neo, Malgun Gothic, Noto Sans KR, system-ui, sans-serif" font-size="54" font-weight="900">${escapeSvg(titleLines[0] || 'VPyLab 작품')}</text>
      ${titleLines[1] ? `<text x="64" y="190" fill="#111827" font-family="Satoshi, Apple SD Gothic Neo, Malgun Gothic, Noto Sans KR, system-ui, sans-serif" font-size="54" font-weight="900">${escapeSvg(titleLines[1])}</text>` : ''}
      ${svgTextLines(descLines, 66, titleLines[1] ? 238 : 196, 28, 'fill="#5A5B6A" font-family="DM Sans, Apple SD Gothic Neo, Malgun Gothic, Noto Sans KR, system-ui, sans-serif" font-size="20" font-weight="600"')}
      <text x="66" y="315" fill="#2563EB" font-family="JetBrains Mono, ui-monospace, monospace" font-size="14" font-weight="800">${escapeSvg(repoText)}</text>
      <rect x="64" y="344" width="494" height="138" fill="#FFFFFF" stroke="#E5E7EB"/>
      <circle cx="86" cy="367" r="5" fill="#FF6B6B"/>
      <circle cx="104" cy="367" r="5" fill="#FDCB6E"/>
      <circle cx="122" cy="367" r="5" fill="#00B894"/>
      ${codeRows}
      <rect x="620" y="86" width="270" height="270" fill="url(#scene)" stroke="#E5E7EB"/>
      <path d="M660 254 C706 196 787 196 836 254" fill="none" stroke="${meta.accent}" stroke-width="8" opacity="0.26"/>
      <path d="M690 300 L758 250 L832 297 L764 346 Z" fill="#FFFFFF" stroke="${meta.accent}" stroke-width="8"/>
      <path d="M758 250 L758 178 L832 224 L832 297" fill="none" stroke="${meta.accent}" stroke-width="8" opacity="0.86"/>
      <circle cx="694" cy="216" r="34" fill="${meta.accent}" opacity="0.9"/>
      <circle cx="824" cy="168" r="18" fill="#00CEC9" opacity="0.9"/>
      <text x="686" y="424" fill="#111827" font-family="Satoshi, Apple SD Gothic Neo, Malgun Gothic, Noto Sans KR, system-ui, sans-serif" font-size="76" font-weight="900">${escapeSvg(meta.mark)}</text>
      <text x="66" y="510" fill="#9394A5" font-family="DM Sans, Apple SD Gothic Neo, Malgun Gothic, Noto Sans KR, system-ui, sans-serif" font-size="16" font-weight="700">${escapeSvg(authorText)}</text>
      <text x="790" y="510" fill="#9394A5" font-family="JetBrains Mono, ui-monospace, monospace" font-size="14" font-weight="800">Open Source</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function isThumbnailUsable(src) {
  if (!src) return Promise.resolve(false);
  if (src.startsWith('data:image/svg+xml')) return Promise.resolve(true);
  if (typeof window === 'undefined' || typeof document === 'undefined' || typeof Image === 'undefined') {
    return Promise.resolve(true);
  }

  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const w = 96;
      const h = 54;
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(true);
        return;
      }
      try {
        ctx.drawImage(img, 0, 0, w, h);
        resolve(isImageDataUseful(ctx.getImageData(0, 0, w, h)));
      } catch {
        resolve(true);
      }
    };
    img.onerror = () => resolve(false);
    img.src = src;
  });
}
