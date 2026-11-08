// 테스트 전용: GIS 토큰 클라이언트와 드라이브 API를 메모리로 흉내 냅니다. 앱 코드에서는 불러오지 않습니다.

function ok(body) {
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  return { ok: true, status: 200, headers: { get: () => null }, json: async () => JSON.parse(text), text: async () => text };
}
function fail(status, body = {}) {
  return { ok: false, status, headers: { get: () => null }, json: async () => body, text: async () => JSON.stringify(body) };
}

function parseMultipart(body) {
  const parts = body.split(/\r\n--[^\r\n]+/);
  const meta = JSON.parse(parts[0].split('\r\n\r\n')[1]);
  const content = parts[1].split('\r\n\r\n').slice(1).join('\r\n\r\n');
  return { meta, content };
}

export function createFakeGoogle({ accounts = [{ sub: 'subA', email: 'a@school.example', hd: 'school.example' }] } = {}) {
  const state = {
    files: new Map(), // id -> { id, name, version, headRevisionId, appProperties, content, revs, trashed, folder }
    tokens: new Map(), // token -> account
    accountQueue: [...accounts],
    lastAccount: accounts[0],
    requests: [],
    seq: 0,
  };
  const pub = (file) => {
    const meta = { ...file };
    delete meta.content;
    delete meta.revs;
    return meta;
  };

  const gis = {
    accounts: {
      oauth2: {
        initTokenClient: (config) => ({
          requestAccessToken: (options) => {
            state.requests.push(options);
            const account = state.accountQueue.length ? state.accountQueue.shift() : state.lastAccount;
            state.lastAccount = account;
            const token = `tok-${(state.seq += 1)}`;
            state.tokens.set(token, account);
            queueMicrotask(() => config.callback({
              access_token: token, expires_in: 3599,
              scope: 'openid https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/drive.file',
            }));
          },
        }),
        revoke: (token, done) => { state.tokens.delete(token); done(); },
      },
    },
  };

  function addFile({ id, name, content, owner = 'subA' }) {
    const rev = `${id}-r1`;
    state.files.set(id, { id, name, version: '1', headRevisionId: rev, appProperties: {}, content, revs: [{ id: rev, content }], owner, modifiedTime: new Date(0).toISOString() });
  }

  async function fetchImpl(url, init = {}) {
    const u = new URL(String(url));
    const method = init.method || 'GET';
    const token = (init.headers?.Authorization || '').replace('Bearer ', '');
    const account = state.tokens.get(token);
    if (!account) return fail(401, { error: { message: 'Invalid Credentials' } });
    if (u.pathname === '/oauth2/v3/userinfo') return ok({ sub: account.sub, email: account.email, hd: account.hd });
    const mine = [...state.files.values()].filter((f) => f.owner === account.sub);

    if (u.pathname === '/drive/v3/files' && method === 'GET') {
      const q = u.searchParams.get('q') || '';
      if (q.includes("key='vpylabRoot'")) return ok({ files: mine.filter((f) => f.folder).map(pub) });
      const created = q.match(/key='vpylabCreateId' and value='([^']+)'/);
      if (created) return ok({ files: mine.filter((f) => f.appProperties?.vpylabCreateId === created[1]).map(pub) });
      return ok({ files: mine.filter((f) => !f.folder && !f.trashed).map(pub) });
    }
    if (u.pathname === '/drive/v3/files' && method === 'POST') {
      const id = `folder-${account.sub}`;
      state.files.set(id, { id, folder: true, owner: account.sub, name: 'VPyLab' });
      return ok({ id });
    }
    if (u.pathname === '/upload/drive/v3/files' && method === 'POST') {
      const { meta, content } = parseMultipart(init.body);
      const id = `f${state.files.size + 1}`;
      const rev = `${id}-r1`;
      state.files.set(id, { id, name: meta.name, version: '1', headRevisionId: rev, appProperties: meta.appProperties, content, revs: [{ id: rev, content }], owner: account.sub, modifiedTime: new Date().toISOString() });
      return ok(pub(state.files.get(id)));
    }
    const upload = u.pathname.match(/^\/upload\/drive\/v3\/files\/([\w-]+)$/);
    if (upload && method === 'PATCH') {
      const file = state.files.get(upload[1]);
      const { meta, content } = parseMultipart(init.body);
      const rev = `${file.id}-r${file.revs.length + 1}`;
      Object.assign(file, { content, version: String(Number(file.version) + 1), headRevisionId: rev, appProperties: meta.appProperties });
      file.revs.push({ id: rev, content });
      return ok(pub(file));
    }
    const m = u.pathname.match(/^\/drive\/v3\/files\/([\w-]+)(\/revisions)?(?:\/([\w-]+))?$/);
    if (m) {
      const file = state.files.get(m[1]);
      if (!file || file.owner !== account.sub) return fail(404);
      if (m[2] && m[3]) return ok(file.revs.find((r) => r.id === m[3]).content);
      if (m[2]) return ok({ revisions: file.revs.map((r) => ({ id: r.id, modifiedTime: new Date(0).toISOString() })) });
      if (method === 'PATCH') { file.trashed = true; return ok({ id: file.id, trashed: true }); }
      if (u.searchParams.get('alt') === 'media') return ok(file.content);
      return ok(pub(file));
    }
    return fail(404);
  }

  /** 다른 기기가 저장한 것처럼 드라이브 내용을 바꿉니다. */
  function remoteSave(id, content) {
    const file = state.files.get(id);
    const rev = `${id}-r${file.revs.length + 1}`;
    Object.assign(file, { content, version: String(Number(file.version) + 1), headRevisionId: rev, appProperties: { vpylabDevice: '다른 기기' } });
    file.revs.push({ id: rev, content });
  }

  return { gis, fetchImpl, state, addFile, remoteSave };
}

export function memoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)); },
    removeItem: (k) => { map.delete(k); },
    key: (i) => [...map.keys()][i] ?? null,
    get length() { return map.size; },
    dump: () => Object.fromEntries(map),
  };
}
