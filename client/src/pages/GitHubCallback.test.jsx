import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GITHUB_OAUTH_CHANNEL, GITHUB_OAUTH_MESSAGE } from '../github/github-oauth.js';
import GitHubCallback from './GitHubCallback.jsx';

let posted;
let closed;
let originalChannel;

beforeEach(() => {
  vi.useFakeTimers();
  posted = [];
  closed = 0;
  originalChannel = globalThis.BroadcastChannel;
  globalThis.BroadcastChannel = class {
    constructor(name) { this.name = name; }
    postMessage(data) { posted.push({ name: this.name, data }); }
    close() {}
  };
  vi.spyOn(window, 'close').mockImplementation(() => { closed += 1; });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  globalThis.BroadcastChannel = originalChannel;
  window.history.replaceState(null, '', '/');
});

describe('GitHubCallback', () => {
  it('code와 state를 채널로 보내고, 주소에서 지운 뒤 창을 닫는다', () => {
    window.history.replaceState(null, '', '/github/callback?code=abc123&state=st-1');
    render(<GitHubCallback />);
    expect(posted).toEqual([{ name: GITHUB_OAUTH_CHANNEL, data: { type: GITHUB_OAUTH_MESSAGE, code: 'abc123', state: 'st-1', error: '', errorDescription: '' } }]);
    expect(window.location.search).toBe('');
    expect(window.location.pathname).toBe('/github/callback');
    expect(closed).toBe(0);
    vi.advanceTimersByTime(200);
    expect(closed).toBe(1);
    // 창이 닫히지 않는 브라우저에서는 안내가 남는다
    expect(screen.getByRole('status')).toHaveTextContent('이 창을 닫아도 됩니다');
  });

  it('GitHub가 오류를 돌려주면 오류를 보내고 다시 연결하라고 안내한다', () => {
    window.history.replaceState(null, '', '/github/callback?error=access_denied&state=st-2');
    render(<GitHubCallback />);
    expect(posted[0].data).toMatchObject({ error: 'access_denied', state: 'st-2', code: '' });
    expect(screen.getByRole('status')).toHaveTextContent('GitHub 연결을 마치지 못했습니다');
    expect(window.location.search).toBe('');
  });

  it('보낼 값이 없으면(직접 연 경우) 아무것도 보내지 않고 창도 닫지 않는다', () => {
    window.history.replaceState(null, '', '/github/callback');
    render(<GitHubCallback />);
    vi.advanceTimersByTime(1000);
    expect(posted).toEqual([]);
    expect(closed).toBe(0);
    expect(screen.getByTestId('github-callback')).toBeInTheDocument();
  });

  it('BroadcastChannel을 사용할 수 없어도 화면이 깨지지 않는다', () => {
    globalThis.BroadcastChannel = undefined;
    window.history.replaceState(null, '', '/github/callback?code=abc&state=st');
    render(<GitHubCallback />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(window.location.search).toBe('');
  });
});
