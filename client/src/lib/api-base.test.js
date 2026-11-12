import { describe, it, expect, vi, afterEach } from 'vitest';

const INDEX = 'https://raw.githubusercontent.com/vpylab/vpylab/gallery-data';
const OFF = { VITE_GOOGLE_CLIENT_ID: '', VITE_GITHUB_CLIENT_ID: '', VITE_GALLERY_INDEX_URL: '', VITE_FORGE_INDEX_URL: '' };

async function load(env = {}) {
  vi.resetModules();
  for (const [key, value] of Object.entries({ ...OFF, ...env })) vi.stubEnv(key, value);
  return import('./api-base.js');
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('배포 설정', () => {
  it('아무 값도 없으면 선택 기능이 모두 꺼진다', async () => {
    const m = await load();
    expect(m).toMatchObject({ DRIVE_SAVE: false, GITHUB_ADDON: false, TEAM_PROJECTS: false, GITHUB_GALLERY: false, GITHUB_FORGE: false, FORGE_REGISTRY: 'none' });
    expect(m.GALLERY_INDEX_URL).toBe('');
    expect(m.FORGE_INDEX_URL).toBe('');
  });

  it('구글 클라이언트 ID가 있으면 드라이브 저장이, GitHub 클라이언트 ID가 있으면 팀 프로젝트가 켜진다', async () => {
    expect(await load({ VITE_GOOGLE_CLIENT_ID: ' google-id ' })).toMatchObject({ DRIVE_SAVE: true, GITHUB_ADDON: false, TEAM_PROJECTS: false });
    expect(await load({ VITE_GITHUB_CLIENT_ID: 'github-id' })).toMatchObject({ DRIVE_SAVE: false, GITHUB_ADDON: true, TEAM_PROJECTS: true });
  });

  it('대장간의 모두의 모듈은 허용된 목록 주소가 있을 때만 GitHub 방식으로 켜진다', async () => {
    expect(await load({ VITE_FORGE_INDEX_URL: `${INDEX}/forge.json` })).toMatchObject({ GITHUB_FORGE: true, FORGE_REGISTRY: 'github', FORGE_INDEX_URL: `${INDEX}/forge.json` });
    expect(await load({ VITE_FORGE_INDEX_URL: '/forge.json' })).toMatchObject({ GITHUB_FORGE: true, FORGE_REGISTRY: 'github' });
    expect(await load({ VITE_FORGE_INDEX_URL: 'https://example.com/forge.json' })).toMatchObject({ GITHUB_FORGE: false, FORGE_REGISTRY: 'none', FORGE_INDEX_URL: '' });
  });

  it('배포 설정은 선택 기능을 켜는 값뿐이다(운영 서버 주소나 판 구분이 없다)', async () => {
    const m = await load();
    expect(Object.keys(m).sort()).toEqual(['DRIVE_SAVE', 'FORGE_INDEX_URL', 'FORGE_REGISTRY', 'GALLERY_INDEX_URL', 'GITHUB_ADDON', 'GITHUB_FORGE', 'GITHUB_GALLERY', 'TEAM_PROJECTS']);
  });
});
