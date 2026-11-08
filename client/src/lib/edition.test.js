import { describe, it, expect, vi, afterEach } from 'vitest';

async function load(env) {
  vi.resetModules();
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
  return import('./api-base.js');
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('판(edition) 설정', () => {
  it('기본은 수업용 판이고 서버 기능을 켠다', async () => {
    const m = await load({ VITE_EDITION: '', VITE_LAN_MODE: '', VITE_API_URL: 'https://api.example' });
    expect(m.EDITION).toBe('classroom');
    expect(m.SERVER_FEATURES).toBe(true);
    expect(m.API_BASE).toBe('https://api.example');
  });

  it('오픈소스 판은 운영 서버 주소가 있어도 쓰지 않고 서버 기능을 끈다', async () => {
    const m = await load({ VITE_EDITION: 'open', VITE_API_URL: 'https://vpylab-server-production.up.railway.app' });
    expect(m.EDITION).toBe('open');
    expect(m.SERVER_FEATURES).toBe(false);
    expect(m.API_BASE).toBe('');
  });

  it('LAN 모드도 서버 기능을 끈다', async () => {
    const m = await load({ VITE_EDITION: '', VITE_LAN_MODE: '1', VITE_API_URL: '' });
    expect(m.SERVER_FEATURES).toBe(false);
  });

  it('오픈소스 판은 환경변수에 Supabase 값이 있어도 연결하지 않는다', async () => {
    vi.resetModules();
    vi.stubEnv('VITE_EDITION', 'open');
    vi.stubEnv('VITE_SUPABASE_URL', 'https://real-project.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'sb_publishable_example');
    const created = [];
    vi.doMock('@supabase/supabase-js', () => ({ createClient: (url, key) => { created.push({ url, key }); return {}; } }));
    await import('./supabase.js');
    expect(created).toEqual([{ url: 'https://no-supabase.invalid', key: 'open-edition-no-supabase' }]);
    vi.doUnmock('@supabase/supabase-js');
  });
});
