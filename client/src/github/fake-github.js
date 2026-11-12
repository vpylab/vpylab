// 테스트 전용: api.github.com을 메모리로 흉내 냅니다. 앱 코드에서는 불러오지 않습니다.
// 저장소·커밋·tree·브랜치(ref)·협업자·초대·Pages를 실제 API와 같은 주소와 응답 모양으로 다룹니다.

const encode = (text) => {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  // 실제 API처럼 60자마다 줄을 바꿉니다.
  return btoa(binary).replace(/(.{60})/g, '$1\n');
};
const decode = (content) => new TextDecoder().decode(Uint8Array.from(atob(content.replace(/\s/g, '')), (c) => c.charCodeAt(0)));

function respond(status, body, headers = {}) {
  const text = body === undefined || body === null ? '' : JSON.stringify(body);
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => headers[String(name).toLowerCase()] ?? null },
    text: async () => text,
    json: async () => JSON.parse(text),
  };
}

/**
 * @param {object} [options]
 * @param {Record<string, string>} [options.tokens] 토큰 → GitHub 아이디
 */
export function createFakeGitHub({ tokens = { 'token-ada': 'ada' } } = {}) {
  const state = {
    tokens: new Map(Object.entries(tokens)),
    repos: new Map(), // 소문자 fullName → repo
    userInvitations: [], // { id, repoKey, invitee, inviter, expired }
    log: [], // { method, path, login }
    starred: new Set(), // '아이디 소유자/저장소'(소문자)
    failures: [], // { method, test, status, body, times, network, hang }
    seq: 0,
    /** 빈 저장소에서 tree 만들기를 409로 거절할지(실제 GitHub의 동작) */
    emptyTreeFails: true,
    /** 초대 응답의 저장소 정보에 topics를 넣을지 */
    invitationTopics: true,
    pagesForbidden: false,
  };
  const nextId = (prefix) => `${prefix}${(++state.seq).toString(16).padStart(6, '0')}`;
  const keyOf = (owner, name) => `${owner}/${name}`.toLowerCase();

  function permissionsOf(repo, login) {
    const admin = repo.owner === login;
    const push = admin || repo.collaborators.has(login);
    return { admin, maintain: admin, push, triage: push, pull: true };
  }

  function publicRepo(repo, login) {
    return {
      id: repo.id,
      name: repo.name,
      full_name: `${repo.owner}/${repo.name}`,
      owner: { login: repo.owner },
      private: false,
      html_url: `https://github.com/${repo.owner}/${repo.name}`,
      description: repo.description,
      topics: [...repo.topics],
      has_pages: repo.pages !== null,
      default_branch: 'main',
      // 스타 수: 흉내가 시작할 때의 수(repo.stars)에 이 흉내에서 누른 스타를 더합니다.
      stargazers_count: (repo.stars || 0) + [...state.starred].filter((key) => key.endsWith(` ${keyOf(repo.owner, repo.name)}`)).length,
      pushed_at: repo.pushedAt,
      updated_at: repo.pushedAt,
      permissions: permissionsOf(repo, login),
    };
  }

  function addCommit(repo, { files, parents, message, login }) {
    const sha = nextId('c');
    const treeSha = nextId('t');
    repo.trees.set(treeSha, new Map(files));
    repo.commits.set(sha, { sha, tree: treeSha, parents, message, login, date: new Date(Date.UTC(2026, 10, 12, 0, 0, state.seq)).toISOString() });
    return sha;
  }

  const filesAt = (repo, commitSha) => repo.trees.get(repo.commits.get(commitSha)?.tree) || new Map();

  function createRepo(owner, name, { description = '', topics = [], files = null } = {}) {
    const repo = {
      id: ++state.seq, owner, name, description, topics: new Set(topics), collaborators: new Set(), invitations: [],
      commits: new Map(), trees: new Map(), head: null, pages: null, pushedAt: '2026-11-12T00:00:00Z',
    };
    state.repos.set(keyOf(owner, name), repo);
    if (files) repo.head = addCommit(repo, { files: Object.entries(files), parents: [], message: 'init', login: owner });
    return repo;
  }

  /** 팀원이 다른 곳에서 저장한 상황을 만듭니다. */
  function remoteCommit(fullName, files, { login = 'teammate', message = 'teammate save' } = {}) {
    const repo = state.repos.get(fullName.toLowerCase());
    const merged = new Map(repo.head ? filesAt(repo, repo.head) : []);
    for (const [path, content] of Object.entries(files)) merged.set(path, content);
    repo.head = addCommit(repo, { files: [...merged], parents: repo.head ? [repo.head] : [], message, login });
    return repo.head;
  }

  /** 다음 요청 가운데 조건에 맞는 것을 실패시킵니다. */
  function failNext({ method = null, test, status = 500, body = { message: 'Server Error' }, times = 1, network = false, hang = false }) {
    state.failures.push({ method, test, status, body, times, network, hang });
  }

  const empty = () => respond(409, { message: 'Git Repository is empty.' });
  const notFound = () => respond(404, { message: 'Not Found' });

  function route(method, path, query, body, login) {
    let m;
    if (path === '/user' && method === 'GET') return respond(200, { login, name: `${login} 이름`, avatar_url: `https://avatars.githubusercontent.com/${login}` });

    if (path === '/user/repos' && method === 'GET') {
      const mine = [...state.repos.values()].filter((repo) => repo.owner === login || repo.collaborators.has(login));
      const page = Number(query.get('page') || 1);
      const perPage = Number(query.get('per_page') || 30);
      return respond(200, mine.slice((page - 1) * perPage, page * perPage).map((repo) => publicRepo(repo, login)));
    }
    if (path === '/user/repos' && method === 'POST') {
      if (!/^[A-Za-z0-9._-]{1,100}$/.test(body.name) || state.repos.has(keyOf(login, body.name))) {
        return respond(422, { message: 'Repository creation failed.', errors: [{ message: 'name already exists on this account' }] });
      }
      return respond(201, publicRepo(createRepo(login, body.name, { description: body.description }), login));
    }

    let star;
    if ((star = path.match(/^\/user\/starred\/([^/]+)\/([^/]+)$/))) {
      if (!state.repos.has(keyOf(star[1], star[2]))) return notFound();
      const key = `${login} ${keyOf(star[1], star[2])}`;
      if (method === 'GET') return state.starred.has(key) ? respond(204) : notFound();
      if (method === 'PUT') { state.starred.add(key); return respond(204); }
      if (method === 'DELETE') { state.starred.delete(key); return respond(204); }
    }

    if (path === '/user/repository_invitations' && method === 'GET') {
      return respond(200, state.userInvitations.filter((inv) => inv.invitee === login).map((inv) => {
        const repo = state.repos.get(inv.repoKey);
        const repository = publicRepo(repo, login);
        if (!state.invitationTopics) delete repository.topics;
        return { id: inv.id, repository, invitee: { login }, inviter: { login: inv.inviter }, permissions: 'write', created_at: '2026-11-12T00:00:00Z', expired: inv.expired };
      }));
    }
    if ((m = path.match(/^\/user\/repository_invitations\/(\d+)$/)) && method === 'PATCH') {
      const index = state.userInvitations.findIndex((inv) => inv.id === Number(m[1]) && inv.invitee === login);
      if (index < 0) return notFound();
      const [inv] = state.userInvitations.splice(index, 1);
      const repo = state.repos.get(inv.repoKey);
      repo.collaborators.add(login);
      repo.invitations = repo.invitations.filter((item) => item.id !== inv.id);
      return respond(204);
    }

    m = path.match(/^\/repos\/([^/]+)\/([^/]+)(\/.*)?$/);
    if (!m) return notFound();
    const repo = state.repos.get(keyOf(m[1], m[2]));
    if (!repo) return notFound();
    const rest = m[3] || '';
    const perms = permissionsOf(repo, login);

    if (rest === '' && method === 'GET') return respond(200, publicRepo(repo, login));

    if (rest === '/git/ref/heads/main' && method === 'GET') {
      return repo.head ? respond(200, { ref: 'refs/heads/main', object: { sha: repo.head } }) : empty();
    }
    let sub;
    if ((sub = rest.match(/^\/git\/commits\/(\w+)$/)) && method === 'GET') {
      const commit = repo.commits.get(sub[1]);
      return commit ? respond(200, { sha: commit.sha, tree: { sha: commit.tree } }) : notFound();
    }
    if (rest === '/git/trees' && method === 'POST') {
      if (!perms.push) return respond(403, { message: 'Resource not accessible' });
      if (!repo.head && state.emptyTreeFails) return empty();
      const files = new Map(body.base_tree ? repo.trees.get(body.base_tree) : []);
      for (const item of body.tree) files.set(item.path, item.content);
      const sha = nextId('t');
      repo.trees.set(sha, files);
      return respond(201, { sha });
    }
    if (rest === '/git/commits' && method === 'POST') {
      if (!perms.push) return respond(403, { message: 'Resource not accessible' });
      const sha = nextId('c');
      repo.commits.set(sha, { sha, tree: body.tree, parents: body.parents, message: body.message, login, date: new Date(Date.UTC(2026, 10, 12, 0, 0, state.seq)).toISOString() });
      return respond(201, { sha });
    }
    if (rest === '/git/refs/heads/main' && method === 'PATCH') {
      const commit = repo.commits.get(body.sha);
      if (!commit) return respond(422, { message: 'Object does not exist' });
      if (commit.parents[0] !== repo.head && !body.force) return respond(422, { message: 'Update is not a fast forward' });
      repo.head = body.sha;
      return respond(200, { object: { sha: repo.head } });
    }
    if (rest === '/git/refs' && method === 'POST') {
      if (repo.head) return respond(422, { message: 'Reference already exists' });
      repo.head = body.sha;
      return respond(201, { object: { sha: repo.head } });
    }

    if ((sub = rest.match(/^\/contents\/(.+)$/))) {
      const filePath = decodeURIComponent(sub[1]);
      if (method === 'GET') {
        const asked = query.get('ref');
        const ref = !asked || asked === 'main' ? repo.head : asked; // 브랜치 이름으로도 읽습니다.
        if (!ref || !repo.commits.has(ref)) return repo.head ? notFound() : respond(404, { message: 'This repository is empty.' });
        const files = filesAt(repo, ref);
        return files.has(filePath)
          ? respond(200, { sha: nextId('b'), encoding: 'base64', content: encode(files.get(filePath)) })
          : notFound();
      }
      if (method === 'PUT') {
        if (!perms.push) return respond(403, { message: 'Resource not accessible' });
        const files = new Map(repo.head ? filesAt(repo, repo.head) : []);
        // 실제 API처럼 이미 있는 파일을 바꿀 때는 그 파일의 sha가 있어야 합니다.
        if (files.has(filePath) && !body.sha) return respond(422, { message: 'Invalid request. "sha" wasn\'t supplied.' });
        files.set(filePath, decode(body.content));
        const parent = repo.head;
        repo.head = addCommit(repo, { files: [...files], parents: parent ? [parent] : [], message: body.message, login });
        return respond(201, { commit: { sha: repo.head, parents: parent ? [{ sha: parent }] : [] } });
      }
    }

    if (rest === '/topics' && method === 'PUT') {
      if (!perms.admin) return respond(403, { message: 'Must have admin rights to Repository.' });
      repo.topics = new Set(body.names);
      return respond(200, { names: body.names });
    }

    if (rest === '/pages' && method === 'GET') {
      if (state.pagesForbidden) return respond(403, { message: 'Resource not accessible by integration' });
      return repo.pages ? respond(200, { status: 'built', source: repo.pages }) : notFound();
    }
    if (rest === '/pages' && method === 'POST') {
      if (state.pagesForbidden || !perms.admin) return respond(403, { message: 'Resource not accessible by integration' });
      repo.pages = body.source;
      return respond(201, { status: 'building', source: repo.pages });
    }
    if (rest === '/pages/builds' && method === 'POST') return respond(201, { status: 'queued' });

    if (rest === '/commits' && method === 'GET') {
      if (!repo.head) return empty();
      const list = [];
      for (let sha = repo.head; sha && list.length < Number(query.get('per_page') || 30); sha = repo.commits.get(sha).parents[0]) {
        const commit = repo.commits.get(sha);
        list.push({ sha, author: { login: commit.login }, commit: { message: commit.message, author: { name: commit.login, date: commit.date } } });
      }
      return respond(200, list);
    }

    if (rest === '/collaborators' && method === 'GET') {
      if (!perms.push) return respond(403, { message: 'Must have push access to view repository collaborators.' });
      return respond(200, [repo.owner, ...repo.collaborators].map((name) => ({
        login: name, role_name: name === repo.owner ? 'admin' : 'write', permissions: permissionsOf(repo, name),
      })));
    }
    if ((sub = rest.match(/^\/collaborators\/([^/]+)$/)) && method === 'PUT') {
      if (!perms.admin) return respond(403, { message: 'Must have admin rights to Repository.' });
      const invitee = decodeURIComponent(sub[1]);
      if (invitee === 'ghost') return notFound();
      if (repo.collaborators.has(invitee) || invitee === repo.owner) return respond(204);
      if (repo.invitations.some((item) => item.invitee === invitee)) return respond(422, { message: 'Validation Failed' });
      const invitation = { id: ++state.seq, invitee, inviter: login, expired: false };
      repo.invitations.push(invitation);
      state.userInvitations.push({ ...invitation, repoKey: keyOf(repo.owner, repo.name) });
      return respond(201, { id: invitation.id, html_url: `https://github.com/${repo.owner}/${repo.name}/invitations` });
    }
    if (rest === '/invitations' && method === 'GET') {
      if (!perms.admin) return respond(403, { message: 'Must have admin rights to Repository.' });
      return respond(200, repo.invitations.map((item) => ({
        id: item.id, invitee: { login: item.invitee }, inviter: { login: item.inviter }, permissions: 'write', created_at: '2026-11-12T00:00:00Z', expired: item.expired,
      })));
    }
    if ((sub = rest.match(/^\/invitations\/(\d+)$/)) && method === 'DELETE') {
      if (!perms.admin) return respond(403, { message: 'Must have admin rights to Repository.' });
      const id = Number(sub[1]);
      if (!repo.invitations.some((item) => item.id === id)) return notFound();
      repo.invitations = repo.invitations.filter((item) => item.id !== id);
      state.userInvitations = state.userInvitations.filter((item) => item.id !== id);
      return respond(204);
    }
    return notFound();
  }

  async function fetchImpl(url, init = {}) {
    const parsed = new URL(url);
    const method = init.method || 'GET';
    const path = parsed.pathname;
    const auth = init.headers?.Authorization || '';
    const login = state.tokens.get(auth.replace(/^Bearer /, '')) || null;
    const body = init.body ? JSON.parse(init.body) : {};
    state.log.push({ method, path, login, cache: init.cache || null, body });

    const failure = state.failures.find((item) => (!item.method || item.method === method) && item.test.test(path) && item.times > 0);
    if (failure) {
      failure.times -= 1;
      if (failure.network) throw new TypeError('Failed to fetch');
      if (failure.hang) {
        return new Promise((resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
        });
      }
      return respond(failure.status, failure.body);
    }
    if (parsed.origin !== 'https://api.github.com') return respond(404, { message: 'Not Found' });
    if (!login) return respond(401, { message: 'Bad credentials' });
    return route(method, path, parsed.searchParams, body, login);
  }

  return {
    state,
    fetchImpl,
    createRepo,
    remoteCommit,
    failNext,
    repo: (fullName) => state.repos.get(fullName.toLowerCase()),
    /** 저장소의 최신 파일 내용 */
    file: (fullName, path) => {
      const repo = state.repos.get(fullName.toLowerCase());
      return repo?.head ? filesAt(repo, repo.head).get(path) : undefined;
    },
    /** 토큰을 무효로 만듭니다(만료·연결 해제). */
    revoke: (token) => state.tokens.delete(token),
    calls: (method, test) => state.log.filter((entry) => entry.method === method && test.test(entry.path)),
  };
}
