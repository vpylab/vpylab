import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { memoryStorage } from '../../drive-lab/fake-google.js';
import { createFakeGitHub } from '../../github/fake-github.js';
import { configureGitHub, useGitHubStore } from '../../github/githubSession.js';
import { GITHUB_TAB_DRAFT_KEY, readProjectDraft, writeProjectDraft } from '../../github/tab-session.js';
import AddonBoundary from '../shared/AddonBoundary.jsx';
import GitHubAddon from './GitHubAddon.jsx';

let github;
let tabStore;
const store = useGitHubStore.getState;

function configure() {
  configureGitHub({
    clientId: 'client-1',
    fetchImpl: github.fetchImpl,
    storage: tabStore,
    origin: 'https://vpylab.example',
    login: () => ({ promise: Promise.resolve({ accessToken: 'token-ada', scope: 'public_repo,repo:invite' }), cancel: () => {}, url: '', state: 's' }),
    apiOptions: { sleep: async () => {} },
    buildHtml: (code) => `<html>${code}</html>`,
    openUrl: () => 'https://vpylab.example/sandbox#code=x',
  });
}

/** 연결하고 프로젝트를 만든 뒤, 같은 탭을 새로 고친 상태(스토어는 비고 탭 저장소는 그대로)로 만듭니다. */
async function reloadedWithProject(code = 'v1') {
  await store().connect();
  const created = await store().createProject({ title: '공 튀기기', code });
  configure();
  return created.project.fullName;
}

function renderAddon(props = {}) {
  const controlRef = { current: null };
  const handlers = { onReady: vi.fn(), onProjectChange: vi.fn(), onRestore: vi.fn(), onLoaded: vi.fn(), onSaved: vi.fn() };
  const view = render(
    <GitHubAddon controlRef={controlRef} code={props.code ?? 'v1'} getCode={() => props.code ?? 'v1'} defaultTitle="내 작품" shouldRestore={() => props.restore ?? true} {...handlers} />,
  );
  return { controlRef, handlers, view };
}

beforeEach(() => {
  github = createFakeGitHub({ tokens: { 'token-ada': 'ada' } });
  tabStore = memoryStorage();
  window.sessionStorage.removeItem(GITHUB_TAB_DRAFT_KEY);
  configure();
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('GitHubAddon (만들기 화면과 애드온의 연결 지점)', () => {
  it('준비되면 조작 함수를 내주고, 열라고 하면 대화상자를 보인다', async () => {
    const { controlRef, handlers } = renderAddon();
    expect(handlers.onReady).toHaveBeenCalledTimes(1);
    expect(controlRef.current.hasProject()).toBe(false);
    expect(controlRef.current.isDirty('아무 코드')).toBe(false);
    expect(screen.queryByRole('dialog')).toBeNull();
    act(() => controlRef.current.open('projects'));
    expect(screen.getByRole('dialog', { name: 'GitHub 팀 프로젝트' })).toBeInTheDocument();
  });

  it('화면에서 사라지면 조작 함수를 거둔다', () => {
    const { controlRef, view } = renderAddon();
    view.unmount();
    expect(controlRef.current).toBeNull();
  });

  it('새로 고침 뒤: 열어 두었던 프로젝트의 저장하지 않은 변경을 편집기에 돌려준다', async () => {
    const fullName = await reloadedWithProject('v1');
    writeProjectDraft(fullName, 'v1 + 내 변경');
    const { controlRef, handlers } = renderAddon();
    await waitFor(() => expect(handlers.onRestore).toHaveBeenCalledTimes(1));
    expect(handlers.onRestore).toHaveBeenCalledWith({ code: 'v1 + 내 변경', baseline: 'v1', title: '공 튀기기', restoredDraft: true });
    expect(handlers.onProjectChange).toHaveBeenLastCalledWith({ fullName, title: '공 튀기기' });
    expect(controlRef.current.hasProject()).toBe(true);
    expect(controlRef.current.isDirty('v1 + 내 변경')).toBe(true);
  });

  it('새로 고침 뒤: 변경이 없었으면 저장된 코드를 그대로 돌려준다', async () => {
    await reloadedWithProject('v1');
    const { handlers } = renderAddon();
    await waitFor(() => expect(handlers.onRestore).toHaveBeenCalledTimes(1));
    expect(handlers.onRestore).toHaveBeenCalledWith({ code: 'v1', baseline: 'v1', title: '공 튀기기', restoredDraft: false });
  });

  it('다른 코드로 들어온 화면에서는 프로젝트 연결을 끊고 편집기를 건드리지 않는다', async () => {
    const fullName = await reloadedWithProject('v1');
    writeProjectDraft(fullName, '내 변경');
    const { controlRef, handlers } = renderAddon({ restore: false });
    expect(handlers.onRestore).not.toHaveBeenCalled();
    expect(controlRef.current.hasProject()).toBe(false);
    expect(store().account.login).toBe('ada'); // 연결은 유지
    expect(readProjectDraft(fullName)).toBeNull();
    expect(handlers.onProjectChange).toHaveBeenLastCalledWith(null);
  });

  it('저장하지 않은 편집 내용을 탭 저장소에 남기고, 저장한 코드와 같아지면 지운다', async () => {
    const fullName = await reloadedWithProject('v1');
    vi.useFakeTimers();
    const { view, controlRef, handlers } = renderAddon({ code: 'v1' });
    const rerender = (code) => view.rerender(
      <GitHubAddon controlRef={controlRef} code={code} getCode={() => code} defaultTitle="내 작품" shouldRestore={() => true} {...handlers} />,
    );
    rerender('v1 편집 중');
    act(() => { vi.advanceTimersByTime(900); });
    expect(readProjectDraft(fullName)).toBe('v1 편집 중');
    rerender('v1');
    act(() => { vi.advanceTimersByTime(900); });
    expect(readProjectDraft(fullName)).toBeNull();
  });

  it('연결을 끊으면 초안도 지운다', async () => {
    const fullName = await reloadedWithProject('v1');
    const { controlRef, handlers } = renderAddon();
    await waitFor(() => expect(handlers.onRestore).toHaveBeenCalled());
    writeProjectDraft(fullName, '편집 중');
    act(() => controlRef.current.detach());
    expect(controlRef.current.hasProject()).toBe(false);
    expect(readProjectDraft(fullName)).toBeNull();
  });
});

describe('AddonBoundary (애드온을 사용할 수 없을 때)', () => {
  it('애드온이 오류를 내도 바깥 화면은 그대로이고, 한 번 알린다', () => {
    const Broken = () => { throw new Error('애드온을 불러오지 못함'); };
    const onError = vi.fn();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <div>
        <button type="button">실행</button>
        <AddonBoundary onError={onError}><Broken /></AddonBoundary>
      </div>,
    );
    expect(screen.getByRole('button', { name: '실행' })).toBeInTheDocument();
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('오류가 없으면 애드온을 그대로 보인다', () => {
    render(<AddonBoundary><p>애드온</p></AddonBoundary>);
    expect(screen.getByText('애드온')).toBeInTheDocument();
  });
});
