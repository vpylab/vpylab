/**
 * VPyLab — 3D 뷰포트 썸네일 캡처
 * Three.js renderer의 현재 프레임을 WebP/JPEG로 변환합니다. 빈 화면이면 null을 돌려줍니다.
 */

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
