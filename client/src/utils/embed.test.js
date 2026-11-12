import { describe, expect, it } from 'vitest';
import { embedCode, embedUrl, workUrl } from './embed';

describe('임베드 주소와 코드', () => {
  it('공유 코드의 일반 주소는 /s/:id 다', () => {
    expect(workUrl('abc12345', 'https://vpylab.example')).toBe('https://vpylab.example/s/abc12345');
    expect(workUrl('abc12345')).toBe(`${window.location.origin}/s/abc12345`);
  });

  it('임베드 코드는 지금 열려 있는 사이트의 /embed/:id 를 가리키는 iframe이다', () => {
    expect(embedUrl('abc12345')).toBe(`${window.location.origin}/embed/abc12345`);
    expect(embedUrl('abc12345', 'https://vpylab.example')).toBe('https://vpylab.example/embed/abc12345');
    expect(embedCode('abc12345'))
      .toBe(`<iframe src="${window.location.origin}/embed/abc12345" width="800" height="500" allow="autoplay; fullscreen" loading="lazy" title="VPyLab"></iframe>`);
    // 주소에 들어갈 수 없는 글자는 이스케이프한다
    expect(embedUrl('a"b', 'https://x')).toBe('https://x/embed/a%22b');
  });
});
