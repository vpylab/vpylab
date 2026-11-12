import { describe, expect, it } from 'vitest';
import { SANDBOX_DRAFT_MAX_AGE_MS, SANDBOX_DRAFT_MAX_BYTES, clearSandboxDraft, readSandboxDraft, writeSandboxDraft } from './sandbox-draft';

function memoryStorage() {
  const data = new Map();
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => { data.set(key, String(value)); },
    removeItem: (key) => { data.delete(key); },
    size: () => data.size,
  };
}

describe('자유 코딩 초안', () => {
  it('남긴 코드를 그대로 돌려준다', () => {
    const storage = memoryStorage();
    expect(readSandboxDraft(storage)).toBeNull();
    expect(writeSandboxDraft('sphere()\n# 한글 🙂', storage, 1000)).toBe(true);
    expect(readSandboxDraft(storage, 2000)).toBe('sphere()\n# 한글 🙂');
  });

  it('14일이 지난 초안은 지우고 돌려주지 않는다', () => {
    const storage = memoryStorage();
    writeSandboxDraft('box()', storage, 0);
    expect(readSandboxDraft(storage, SANDBOX_DRAFT_MAX_AGE_MS)).toBe('box()');
    expect(readSandboxDraft(storage, SANDBOX_DRAFT_MAX_AGE_MS + 1)).toBeNull();
    expect(storage.size()).toBe(0);
  });

  it('상한을 넘는 코드는 남기지 않고 앞의 초안을 유지한다', () => {
    const storage = memoryStorage();
    writeSandboxDraft('box()', storage, 0);
    expect(writeSandboxDraft('가'.repeat(SANDBOX_DRAFT_MAX_BYTES), storage, 1)).toBe(false);
    expect(readSandboxDraft(storage, 2)).toBe('box()');
  });

  it('손상된 값과 저장소 오류에서 멈추지 않는다', () => {
    const storage = memoryStorage();
    storage.setItem('vpylab:sandbox:draft:v1', '{깨진 값');
    expect(readSandboxDraft(storage)).toBeNull();
    storage.setItem('vpylab:sandbox:draft:v1', JSON.stringify({ version: 1, code: 5, savedAt: 1 }));
    expect(readSandboxDraft(storage, 2)).toBeNull();
    const broken = { getItem() { throw new Error('막힘'); }, setItem() { throw new Error('가득 참'); }, removeItem() { throw new Error('막힘'); } };
    expect(readSandboxDraft(broken)).toBeNull();
    expect(writeSandboxDraft('box()', broken)).toBe(false);
    expect(() => clearSandboxDraft(broken)).not.toThrow();
  });

  it('지우면 사라진다', () => {
    const storage = memoryStorage();
    writeSandboxDraft('box()', storage, 0);
    clearSandboxDraft(storage);
    expect(readSandboxDraft(storage, 1)).toBeNull();
  });
});
