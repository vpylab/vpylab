import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createFakeGoogle, memoryStorage } from '../../drive-lab/fake-google.js';
import { configureDrive } from '../../drive/driveSession.js';
import { createFakeGitHub } from '../../github/fake-github.js';
import { configureGitHub } from '../../github/githubSession.js';
import DriveDialog from '../drive/DriveDialog.jsx';
import GitHubProjectDialog from '../github/GitHubProjectDialog.jsx';

/**
 * 애드온 규칙(docs/SCOPE.md 5번): 그 자리 안내를 사용할 수 없어도 대화상자의 저장·연결은 그대로 동작해야 합니다.
 * 여기서는 안내가 그려지다가 오류를 내는 경우를 흉내 냅니다(불러오지 못하는 경우는 help.test.jsx).
 */
const helpRenders = vi.hoisted(() => ({ count: 0 }));
vi.mock('./DialogHelp.jsx', () => ({
  default: () => {
    helpRenders.count += 1;
    throw new Error('안내를 그리지 못함');
  },
}));

let google;
beforeEach(() => {
  helpRenders.count = 0;
  vi.spyOn(console, 'error').mockImplementation(() => {});
  google = createFakeGoogle();
  configureDrive({ clientId: 'test-client', gis: google.gis, fetchImpl: google.fetchImpl, storage: memoryStorage() });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('그 자리 안내를 사용할 수 없을 때', () => {
  it('구글 드라이브 저장 창: 안내가 오류를 내도 로그인하고 저장한다', async () => {
    const onSaved = vi.fn();
    const { baseElement } = render(<DriveDialog mode="save" getCode={() => 'sphere()'} defaultName="공 튀기기" onSaved={onSaved} onClose={() => {}} />);
    const signIn = await screen.findByTestId('drive-sign-in');
    await waitFor(() => expect(helpRenders.count).toBeGreaterThan(0));
    expect(baseElement.querySelector('.vh-help')).toBeNull();
    fireEvent.click(signIn);
    await waitFor(() => expect(screen.getByTestId('drive-account')).toHaveTextContent('a@school.example'));
    fireEvent.click(await screen.findByTestId('drive-save-new'));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ status: 'created' })));
    expect([...google.state.files.values()].find((file) => file.name === '공 튀기기.py').content).toBe('sphere()');
  });

  it('GitHub 팀 프로젝트 창: 안내가 오류를 내도 연결하고 프로젝트를 만든다', async () => {
    const github = createFakeGitHub({ tokens: { 'token-ada': 'ada' } });
    configureGitHub({
      clientId: 'client-1',
      fetchImpl: github.fetchImpl,
      storage: memoryStorage(),
      origin: 'https://vpylab.example',
      login: () => ({ promise: Promise.resolve({ accessToken: 'token-ada', scope: 'public_repo,repo:invite' }), cancel: () => {}, url: '', state: 's' }),
      apiOptions: { sleep: async () => {} },
      buildHtml: (code) => `<html>${code}</html>`,
      openUrl: () => 'https://vpylab.example/sandbox#code=x',
    });
    const onSaved = vi.fn();
    const { baseElement } = render(<GitHubProjectDialog mode="projects" getCode={() => 'sphere()'} onSaved={onSaved} onClose={() => {}} />);
    await waitFor(() => expect(helpRenders.count).toBeGreaterThan(0));
    fireEvent.click(screen.getByTestId('github-connect'));
    await waitFor(() => expect(screen.getByTestId('github-account')).toHaveTextContent('ada'));
    fireEvent.change(screen.getByTestId('github-project-title'), { target: { value: '공 튀기기' } });
    fireEvent.click(screen.getByTestId('github-create'));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ status: 'created' })));
    expect(baseElement.querySelector('.vh-help')).toBeNull();
  });
});
