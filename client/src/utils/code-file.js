/**
 * 코드 파일 열기와 내려받기 (로그인 없이 작품을 보관하는 방법).
 *
 * 받는 파일
 *   - .py: 내용을 그대로 코드로 읽습니다.
 *   - .html: VPyLab이 내보낸 실행 파일(server/utils/standalone-template.js). 그 안에 Base64로 든 학생 코드를 꺼냅니다.
 *     파일을 실행하거나 화면에 그리지 않고 글자로만 읽습니다.
 *
 * 내보낸 HTML의 코드 위치는 아래 SOURCE_PATTERN 한 줄입니다. 템플릿의 그 줄을 바꾸면
 * code-file.test.js의 왕복 시험이 실패합니다.
 */
import { compressToEncodedURIComponent } from 'lz-string';

/** 드라이브 저장과 같은 상한(바이트) */
export const MAX_CODE_BYTES = 100 * 1024;
/** 읽기 전에 거르는 파일 크기. 내보낸 HTML은 실행기를 포함해 수백 KB입니다. */
export const MAX_FILE_BYTES = 4 * 1024 * 1024;
/** 주소에 코드를 담는 링크의 상한(share.js의 공유 상한과 같음) */
const MAX_LINK_CODE_SIZE = 50_000;

const SOURCE_PATTERN = /const code = decodeURIComponent\(escape\(atob\('([A-Za-z0-9+/=]*)'\)\)\);/;

export class CodeFileError extends Error {
  /** @param {'type' | 'tooLarge' | 'notVpylab' | 'broken' | 'read'} reason */
  constructor(reason) {
    super(reason);
    this.name = 'CodeFileError';
    this.reason = reason;
  }
}

/** 사유별 안내. 화면에서 ui()로 번역합니다. */
export const CODE_FILE_REASON_TEXT = {
  type: '열 수 없는 파일입니다. 파이썬 파일(.py)이나 VPyLab에서 내려받은 HTML 파일을 고르십시오.',
  tooLarge: '파일이 너무 커서 열 수 없습니다. 코드는 100KB까지 열 수 있습니다.',
  notVpylab: '이 HTML 파일에서 VPyLab 코드를 찾지 못했습니다. VPyLab에서 내려받은 파일인지 확인하십시오.',
  broken: '파일 내용이 손상되어 코드를 읽지 못했습니다.',
  read: '파일을 읽지 못했습니다. 다시 시도하십시오.',
};

const byteLength = (text) => new TextEncoder().encode(text).length;

function decodeBase64Utf8(value) {
  try {
    const binary = atob(value);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new CodeFileError('broken');
  }
}

/** 파일 이름으로 종류를 정합니다. */
export function codeFileKind(name = '') {
  const lower = String(name).toLowerCase();
  if (lower.endsWith('.py')) return 'py';
  if (lower.endsWith('.html') || lower.endsWith('.htm')) return 'html';
  return null;
}

/**
 * 파일 내용에서 코드를 꺼냅니다.
 * @param {string} text 파일 내용
 * @param {string} name 파일 이름
 * @returns {{ code: string, kind: 'py' | 'html', title: string }}
 */
export function extractCodeFromText(text, name = '') {
  const kind = codeFileKind(name);
  if (!kind) throw new CodeFileError('type');
  if (typeof text !== 'string') throw new CodeFileError('read');
  let code;
  if (kind === 'py') {
    // 메모장 등이 붙이는 BOM은 파이썬 코드가 아니므로 뺍니다.
    code = text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text;
  } else {
    const match = SOURCE_PATTERN.exec(text);
    if (!match) throw new CodeFileError('notVpylab');
    code = decodeBase64Utf8(match[1]);
  }
  if (byteLength(code) > MAX_CODE_BYTES) throw new CodeFileError('tooLarge');
  const title = String(name).replace(/\.(py|html?)$/i, '').slice(0, 80);
  return { code, kind, title };
}

/**
 * 사용자가 고른 파일을 읽어 코드를 돌려줍니다.
 * @param {File} file
 */
export async function readCodeFile(file) {
  if (!file || !codeFileKind(file.name)) throw new CodeFileError('type');
  if (file.size > MAX_FILE_BYTES) throw new CodeFileError('tooLarge');
  let text;
  try {
    text = await file.text();
  } catch {
    throw new CodeFileError('read');
  }
  return extractCodeFromText(text, file.name);
}

/** 작품 제목을 파일 이름으로 바꿉니다. 운영체제가 받지 않는 글자를 빼고 길이를 줄입니다. */
export function codeFileBaseName(title, fallback = 'vpylab') {
  const cleaned = String(title || '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f<>:"/\\|?*]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\.+|\.+$/g, '')
    .slice(0, 60)
    .trim();
  return cleaned || fallback;
}

/**
 * 내보낸 HTML에 넣을 "VPyLab에서 열기" 주소. 편집 화면으로 열리도록 실행 화면 표시(?view=run)는 붙이지 않습니다.
 * 코드가 길어 주소에 담을 수 없으면 빈 문자열입니다(그때는 "파일 열기"로 엽니다).
 */
export function openInVpylabUrl(code, origin = window.location.origin) {
  if (typeof code !== 'string' || !code || code.length > MAX_LINK_CODE_SIZE) return '';
  return `${origin}/sandbox#code=${compressToEncodedURIComponent(code)}`;
}

/** 코드를 .py 파일로 내려받습니다. */
export function downloadPython(code, filename = 'vpylab.py', doc = document) {
  const blob = new Blob([code], { type: 'text/x-python;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = doc.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
