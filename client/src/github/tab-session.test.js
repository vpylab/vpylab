import { describe, expect, it } from 'vitest';
import { GITHUB_SESSION_KEY } from './githubSession.js';
import { GITHUB_TAB_SESSION_KEY, clearProjectDraft, readProjectDraft, storedGitHubProject, writeProjectDraft } from './tab-session.js';

function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return { getItem: (k) => (data.has(k) ? data.get(k) : null), setItem: (k, v) => { data.set(k, String(v)); }, removeItem: (k) => { data.delete(k); } };
}

describe('탭에 남은 GitHub 세션 확인', () => {
  it('애드온 스토어와 같은 키를 사용한다', () => {
    expect(GITHUB_TAB_SESSION_KEY).toBe(GITHUB_SESSION_KEY);
  });

  it('열어 둔 프로젝트가 있을 때만 저장소 이름을 돌려준다', () => {
    expect(storedGitHubProject(memoryStorage())).toBeNull();
    expect(storedGitHubProject(memoryStorage({ [GITHUB_TAB_SESSION_KEY]: JSON.stringify({ account: { login: 'ada' }, project: null }) }))).toBeNull();
    expect(storedGitHubProject(memoryStorage({ [GITHUB_TAB_SESSION_KEY]: JSON.stringify({ account: { login: 'ada' }, project: { fullName: 'ada/solar' } }) }))).toBe('ada/solar');
    expect(storedGitHubProject(memoryStorage({ [GITHUB_TAB_SESSION_KEY]: '{깨진 값' }))).toBeNull();
    expect(storedGitHubProject({ getItem() { throw new Error('막힘'); } })).toBeNull();
  });

  it('프로젝트 초안은 같은 프로젝트에만 돌려주고, 지우면 사라진다', () => {
    const storage = memoryStorage();
    expect(writeProjectDraft('ada/solar', 'box()', storage)).toBe(true);
    expect(readProjectDraft('ada/solar', storage)).toBe('box()');
    expect(readProjectDraft('ada/other', storage)).toBeNull();
    clearProjectDraft(storage);
    expect(readProjectDraft('ada/solar', storage)).toBeNull();
    const broken = { getItem() { throw new Error('막힘'); }, setItem() { throw new Error('가득 참'); }, removeItem() { throw new Error('막힘'); } };
    expect(writeProjectDraft('ada/solar', 'box()', broken)).toBe(false);
    expect(readProjectDraft('ada/solar', broken)).toBeNull();
    expect(() => clearProjectDraft(broken)).not.toThrow();
  });
});
