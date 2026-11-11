import { describe, expect, it } from 'vitest';
import { decompressFromEncodedURIComponent } from 'lz-string';
import { generateStandaloneHTML } from './export-html';
import { CodeFileError, MAX_CODE_BYTES, MAX_FILE_BYTES, codeFileBaseName, codeFileKind, extractCodeFromText, openInVpylabUrl, readCodeFile } from './code-file';

const reasonOf = (run) => {
  try { run(); } catch (error) { return error instanceof CodeFileError ? error.reason : `다른 오류: ${error.message}`; }
  return '오류 없음';
};

const SAMPLE = '# 구슬 🙂\nfrom vpython import *\nball = sphere(color=color.red)\nprint("</script>", \'따옴표\', `백틱`, "\\\\n")\n';

describe('코드 파일 열기', () => {
  it('파이썬 파일은 내용을 그대로 읽고 BOM만 뺀다', () => {
    const result = extractCodeFromText(String.fromCharCode(0xFEFF) + SAMPLE, '내 작품.PY');
    expect(result).toEqual({ code: SAMPLE, kind: 'py', title: '내 작품' });
    expect(extractCodeFromText('a = 1\r\n', 'a.py').code).toBe('a = 1\r\n');
  });

  it('VPyLab이 내보낸 HTML에서 같은 코드를 꺼낸다', () => {
    const html = generateStandaloneHTML(SAMPLE, '<b>제목</b>');
    const result = extractCodeFromText(html, '구슬.html');
    expect(result.code).toBe(SAMPLE);
    expect(result.kind).toBe('html');
    expect(result.title).toBe('구슬');
  });

  it('빈 코드로 내보낸 HTML도 연다', () => {
    expect(extractCodeFromText(generateStandaloneHTML('', '빈 작품'), 'empty.htm').code).toBe('');
  });

  it('다른 HTML, 다른 확장자, 손상된 파일을 사유로 구분한다', () => {
    expect(reasonOf(() => extractCodeFromText('<html><body>안녕하세요</body></html>', 'page.html'))).toBe('notVpylab');
    expect(reasonOf(() => extractCodeFromText('print(1)', 'note.txt'))).toBe('type');
    expect(reasonOf(() => extractCodeFromText('print(1)', ''))).toBe('type');
    // Base64로는 풀리지만 UTF-8이 아닌 값
    expect(reasonOf(() => extractCodeFromText("const code = decodeURIComponent(escape(atob('/w==')));", 'x.html'))).toBe('broken');
    expect(reasonOf(() => extractCodeFromText("const code = decodeURIComponent(escape(atob('a')));", 'x.html'))).toBe('broken');
  });

  it('코드가 상한을 넘으면 열지 않는다', () => {
    expect(extractCodeFromText('a'.repeat(MAX_CODE_BYTES), 'big.py').code).toHaveLength(MAX_CODE_BYTES);
    expect(reasonOf(() => extractCodeFromText('a'.repeat(MAX_CODE_BYTES + 1), 'big.py'))).toBe('tooLarge');
    expect(reasonOf(() => extractCodeFromText('가'.repeat(MAX_CODE_BYTES / 2), 'big.py'))).toBe('tooLarge');
  });

  it('고른 파일을 읽기 전에 종류와 크기를 확인한다', async () => {
    const file = (name, text, size) => ({ name, size: size ?? text.length, text: async () => text });
    await expect(readCodeFile(file('a.py', 'box()'))).resolves.toMatchObject({ code: 'box()', kind: 'py' });
    await expect(readCodeFile(file('a.exe', 'box()'))).rejects.toMatchObject({ reason: 'type' });
    await expect(readCodeFile(file('a.py', 'box()', MAX_FILE_BYTES + 1))).rejects.toMatchObject({ reason: 'tooLarge' });
    await expect(readCodeFile({ name: 'a.py', size: 1, text: async () => { throw new Error('읽기 실패'); } })).rejects.toMatchObject({ reason: 'read' });
    await expect(readCodeFile(null)).rejects.toMatchObject({ reason: 'type' });
  });
});

describe('파일 이름과 다시 여는 주소', () => {
  it('파일 종류를 확장자로 정한다', () => {
    expect(codeFileKind('a.py')).toBe('py');
    expect(codeFileKind('a.HTML')).toBe('html');
    expect(codeFileKind('a.htm')).toBe('html');
    expect(codeFileKind('a.py.txt')).toBeNull();
  });

  it('제목을 파일 이름으로 바꾼다', () => {
    expect(codeFileBaseName('  태양계: 지구/달 <3>  ')).toBe('태양계 지구 달 3');
    expect(codeFileBaseName('...')).toBe('vpylab');
    expect(codeFileBaseName('')).toBe('vpylab');
    expect(codeFileBaseName('줄\n바꿈\t탭')).toBe('줄 바꿈 탭');
    expect(codeFileBaseName('가'.repeat(100))).toHaveLength(60);
  });

  it('다시 여는 주소는 편집 화면으로 열리고 같은 코드를 담는다', () => {
    const url = openInVpylabUrl(SAMPLE, 'https://example.org');
    expect(url.startsWith('https://example.org/sandbox#code=')).toBe(true);
    expect(url).not.toContain('view=run');
    expect(decompressFromEncodedURIComponent(url.split('#code=')[1])).toBe(SAMPLE);
  });

  it('주소에 담을 수 없는 길이면 주소를 만들지 않는다', () => {
    expect(openInVpylabUrl('a'.repeat(50_001), 'https://example.org')).toBe('');
    expect(openInVpylabUrl('', 'https://example.org')).toBe('');
  });
});
