// 실제 Supabase RLS·GitHub API를 사용하는 검증. --write로 지정한 새 fixture만 만들고 정리합니다.
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';
import { runInNewContext } from 'node:vm';
import { once } from 'node:events';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
if (!args.includes('--write')) {
  console.log('실제 검증: --write [--credentials-root 프로젝트경로] [--api 운영API주소]');
  console.log('새 테스트 계정/프로젝트와 공개 GitHub 저장소를 만듭니다. 계정과 DB fixture는 정리하고 저장소는 검토용으로 남깁니다.');
  process.exit(0);
}
const option = name => args.includes(name) ? args[args.indexOf(name) + 1] : null;
const credentialsRoot = resolve(option('--credentials-root') || root);
const existingTestRepo = option('--repo');
if (existingTestRepo) assert(/^greatsong\/vpylab-github-check-\d{8}-[a-f0-9]{6}$/.test(existingTestRepo), '이 도구가 만든 전용 검증 저장소만 재사용할 수 있습니다.');
const requireServer = createRequire(join(root, 'server/package.json'));
const { createClient } = requireServer('@supabase/supabase-js');
const dotenv = requireServer('dotenv');
const config = dotenv.parse(await readFile(join(credentialsRoot, 'server/.env')));
const publicConfig = dotenv.parse(await readFile(join(root, 'client/.env.production')));
assert(config.SUPABASE_URL && config.SUPABASE_SERVICE_ROLE_KEY, 'Supabase 설정이 필요합니다.');
process.env.SUPABASE_URL = config.SUPABASE_URL;
process.env.SUPABASE_SERVICE_ROLE_KEY = config.SUPABASE_SERVICE_ROLE_KEY;
const clientOptions = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, clientOptions);
const token = execFileSync('gh', ['auth', 'token', '--user', 'greatsong'], { encoding: 'utf8' }).trim();
const runId = `vpylab-github-check-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${randomBytes(3).toString('hex')}`;
const report = { runId, checks: [], repository: null, cleanup: [] };
const users = [];
let server;
let api = option('--api');
const checked = (name, detail = null) => {
  report.checks.push({ name, status: 'passed', detail });
  console.log(`PASS ${name}`);
};
const unwrap = ({ data, error }) => { if (error) throw new Error(error.message); return data; };
const github = async path => {
  const response = await fetch(`https://api.github.com/${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
    signal: AbortSignal.timeout(25_000),
  });
  if (!response.ok) throw new Error(`GitHub 조회 실패: ${response.status} ${path}`);
  return response.json();
};
async function identity(label) {
  const password = randomBytes(30).toString('base64url');
  const email = `${runId}-${label}@example.invalid`;
  const { user } = unwrap(await admin.auth.admin.createUser({ email, password, email_confirm: true }));
  users.push(user.id);
  const client = createClient(config.SUPABASE_URL, publicConfig.VITE_SUPABASE_ANON_KEY, clientOptions);
  const { session } = unwrap(await client.auth.signInWithPassword({ email, password }));
  return { client, id: user.id, accessToken: session.access_token };
}
async function request(path, who, body, expected = 200) {
  const response = await fetch(`${api}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(who ? { Authorization: `Bearer ${who.accessToken}` } : {}) },
    body: JSON.stringify(body), signal: AbortSignal.timeout(120_000),
  });
  const data = await response.json();
  assert.equal(response.status, expected, `${path}: ${JSON.stringify(data)}`);
  return data;
}
async function loadHtmlGenerator() {
  const { generateStandaloneHTML } = await import(pathToFileURL(join(root, 'shared/standalone-template.js')));
  const transform = await readFile(join(root, 'client/src/engine/student-code-transform.py'), 'utf8');
  return (code, title) => generateStandaloneHTML(code, title, {}, transform);
}

try {
  if (!api) {
    const express = requireServer('express');
    const app = express();
    app.use(express.json({ limit: '2mb' }));
    app.use('/api/projects', (await import(pathToFileURL(join(root, 'server/routes/projects.js')))).default);
    app.use('/api/sync', (await import(pathToFileURL(join(root, 'server/routes/sync.js')))).default);
    app.use('/api/publish', (await import(pathToFileURL(join(root, 'server/routes/publish.js')))).default);
    server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    api = `http://127.0.0.1:${server.address().port}`;
  }
  report.api = api;
  const title = 'VPyLab GitHub 검증 작품';
  const codeA = 'from vpython import *\nsphere(color=color.yellow, radius=0.6)\n음표("도", 0.1)\nprint("VPYLAB_GITHUB_A")';
  const codeB = codeA.replace('color.yellow', 'color.blue').replace('GITHUB_A', 'GITHUB_B');
  const html = await loadHtmlGenerator();
  const exportedApi = html(codeA, title).match(/const vpythonApi = (`[\s\S]*?`);/);
  assert(exportedApi);
  const preflight = spawnSync('python3', ['-I', join(root, 'client/src/test/run-export-python.py')], {
    input: JSON.stringify({ api: runInNewContext(exportedApi[1]),
      transform: await readFile(join(root, 'client/src/engine/student-code-transform.py'), 'utf8'),
      jobs: [{ id: 'A', code: codeA }, { id: 'B', code: codeB }] }) + '\n',
    encoding: 'utf8', timeout: 15000,
  });
  assert.equal(preflight.status, 0, preflight.stderr);
  const preflightResults = JSON.parse(preflight.stdout.trim().split('\n').at(-1));
  for (const result of preflightResults) {
    assert.equal(result.error, null, JSON.stringify(result));
    assert(result.commands.some(command => command.action === 'sound'), '소리 명령이 실행돼야 합니다.');
    assert(result.commands.some(command => command.action === 'create' && command.type === 'sphere'), '구 생성 명령이 실행돼야 합니다.');
  }
  assert(!preflight.stderr.includes('was never awaited'), preflight.stderr);
  checked('GitHub에 쓰기 전 검증 작품 A·B를 실제 Python API로 선실행');
  const owner = await identity('owner');
  const viewer = await identity('viewer');
  const project = unwrap(await owner.client.from('vpylab_projects').insert({ title, owner_id: owner.id }).select().single());
  const codeRow = unwrap(await owner.client.from('vpylab_saved_code').insert({ title, user_id: owner.id, project_id: project.id, code: codeA }).select().single());
  const revision = async (code, message) => unwrap(await owner.client.from('vpylab_code_revisions').insert({
    code_id: codeRow.id, project_id: project.id, author_id: owner.id, message, code_snapshot: code, code_size: code.length, source: 'manual',
  }).select().single());
  const first = await revision(codeA, 'A 저장');
  checked('실제 사용자 JWT와 RLS로 프로젝트·코드·이력 생성');
  await request('/api/projects/setup', null, { title, code: codeA, githubToken: token }, 401);
  checked('비로그인 GitHub 쓰기 거부');
  let setup;
  if (existingTestRepo) {
    const readme = await github(`repos/${existingTestRepo}/contents/README.md`);
    assert(Buffer.from(readme.content, 'base64').toString('utf8').startsWith(`# ${title}`));
    setup = { repoFullName: existingTestRepo, repoUrl: `https://github.com/${existingTestRepo}`, pagesUrl: `https://greatsong.github.io/${existingTestRepo.split('/')[1]}/` };
  } else {
    setup = await request('/api/projects/setup', owner, { title, code: codeA, htmlContent: html(codeA, title), githubToken: token, repoName: runId, authorLabel: 'VPyLab 검증' });
    assert.equal(setup.repoFullName, `greatsong/${runId}`);
  }
  report.repository = setup.repoFullName;
  report.repoUrl = setup.repoUrl;
  report.pagesUrl = setup.pagesUrl;
  unwrap(await owner.client.from('vpylab_projects').update({ github_repo: setup.repoFullName }).eq('id', project.id));
  unwrap(await owner.client.from('vpylab_saved_code').update({ github_repo: setup.repoFullName }).eq('id', codeRow.id));
  checked(existingTestRepo ? '이전 실행에서 만든 전용 검증 저장소 재사용' : '새 공개 테스트 저장소와 초기 커밋 생성', { commit: setup.pageCommitSha, pagesActivated: setup.pagesActivated, warning: setup.pagesWarning });
  const content = async path => {
    const file = await github(`repos/${setup.repoFullName}/contents/${path}?ref=main`);
    return Buffer.from(file.content, 'base64').toString('utf8');
  };
  if (existingTestRepo) {
    const prior = await content('main.py');
    const withoutImport = codeA.replace('from vpython import *\n', '');
    assert([codeA, withoutImport, withoutImport.replace('음표("도", 0.1)', 'note("C4", 0.1)')].includes(prior), '전용 fixture가 예상한 코드와 달라 중단합니다.');
    await request('/api/projects/commit', owner, { projectId: project.id, codeId: codeRow.id, revisionId: first.id,
      repoFullName: setup.repoFullName, title, code: codeA, htmlContent: html(codeA, title), githubToken: token,
      authorLabel: 'VPyLab 검증', message: '검증 초기 A 저장' });
  }
  assert.equal(await content('main.py'), codeA);
  const publishedHtml = await content('index.html');
  assert(publishedHtml.includes(Buffer.from(codeA).toString('base64')));
  assert(publishedHtml.includes('__vpylab_transform_source__'), '서버가 최신 학생 코드 변환기를 Pages에 포함해야 합니다.');
  assert((await content('README.md')).includes('vpylab.vercel.app'));
  checked('main.py·독립 HTML의 코드·README 링크 일치');
  const access = await request('/api/projects/access', owner, { repoFullName: setup.repoFullName, githubToken: token });
  assert(access.canPush);
  checked('실제 GitHub 토큰의 저장소 쓰기 권한 확인');
  unwrap(await viewer.client.rpc('vpylab_join_project_by_invite', { p_invite_code: project.invite_code }));
  const viewerMembership = unwrap(await owner.client.from('vpylab_project_members').update({ role: 'viewer' })
    .eq('project_id', project.id).eq('user_id', viewer.id).select().single());
  assert.equal(viewerMembership.role, 'viewer');
  checked('실제 초대 코드 합류와 소유자의 viewer 역할 변경');
  const payload = code => ({ projectId: project.id, codeId: codeRow.id, repoFullName: setup.repoFullName, title, code, htmlContent: html(code, title), githubToken: token, authorLabel: 'VPyLab 검증' });
  const denied = await request('/api/projects/commit', viewer, payload(codeB), 403);
  assert.equal(denied.code, 'project_read_only');
  checked('실제 viewer가 GitHub 쓰기 토큰을 갖고도 쓰기 거부');
  const missingMember = await request('/api/projects/commit', viewer, { ...payload(codeB), projectId: undefined }, 403);
  assert.equal(missingMember.code, 'project_read_only');
  checked('projectId 생략 시에도 저장소 역조회로 권한 검사');
  await request('/api/projects/commit', owner, { ...payload(codeB), repoFullName: 'greatsong/unrelated-test-repository' }, 403);
  checked('다른 저장소로 요청 대상을 바꾸는 시도 거부');
  const badToken = await request('/api/projects/access', owner, { repoFullName: setup.repoFullName, githubToken: 'invalid-test-token' }, 401);
  assert.equal(badToken.code, 'github_auth_required');
  checked('만료·잘못된 GitHub 인증 거부');
  await new Promise(resolve => setTimeout(resolve, 1000));
  const savedB = unwrap(await owner.client.rpc('vpylab_save_project_code', {
    p_code_id: codeRow.id, p_project_id: project.id, p_client_save_id: randomUUID(),
    p_expected_code: codeA, p_code: codeB, p_title: title, p_message: 'B 저장', p_source: 'manual',
  }));
  const second = savedB.revision;
  const pushed = await request('/api/projects/commit', owner, { ...payload(codeB), revisionId: second.id, message: '검증 B 저장' });
  assert(pushed.commitSha);
  assert.equal(await content('main.py'), codeB);
  assert((await content('index.html')).includes(Buffer.from(codeB).toString('base64')));
  checked('B 저장: main.py와 Pages HTML을 같은 커밋으로 반영', { commit: pushed.commitSha });
  const stale = await request('/api/projects/commit', owner, { ...payload(codeA), revisionId: first.id, message: '이전 A 지연 요청' });
  assert.equal(stale.staleRevision, true);
  assert.equal(await content('main.py'), codeB);
  checked('늦게 도착한 이전 A 저장이 최신 B를 덮어쓰지 않음');
  await new Promise(resolve => setTimeout(resolve, 1000));
  const restoredSave = unwrap(await owner.client.rpc('vpylab_save_project_code', {
    p_code_id: codeRow.id, p_project_id: project.id, p_client_save_id: randomUUID(),
    p_expected_code: codeB, p_code: codeA, p_title: title, p_message: 'A 복원', p_source: 'restore',
  }));
  const restored = restoredSave.revision;
  const restorePush = await request('/api/projects/commit', owner, { ...payload(codeA), revisionId: restored.id, message: '검증 A 복원' });
  assert.equal(await content('main.py'), codeA);
  assert((await content('history.md')).includes('검증 A 복원'));
  checked('새 복원 이력의 A를 GitHub에 반영하고 history.md 누적');
  report.pagesUrl = restorePush.pagesUrl;
  const record = await request('/api/projects/commit', owner, {
    ...payload(codeB), recordOnly: true, updateIndex: false, message: '검증 회고',
    voyageEntry: { localDate: new Date().toISOString().slice(0, 10), localTime: '12:00', tzOffset: -540,
      kind: 'detailed', title: 'GitHub 검증 회고', did: '코드 A와 B를 비교하고 복원을 확인했습니다.', next: '실행 결과 확인' },
  });
  assert(record.voyageEntry?.path);
  assert.equal(await content('main.py'), codeA);
  checked('기록만 남기기는 main.py를 덮어쓰지 않음', { path: record.voyageEntry.path });
  await request('/api/projects/setup', owner, { title, code: codeA, githubToken: token, repoName: setup.repoFullName.split('/')[1] }, 409);
  assert.equal(await content('main.py'), codeA);
  checked('중복 저장소 이름은 기존 코드를 덮어쓰지 않고 거부');
  let pageReady = false;
  for (let attempt = 0; attempt < 18; attempt++) {
    const url = new URL(report.pagesUrl);
    url.searchParams.set('verify', String(Date.now()));
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
      const text = await response.text();
      if (response.ok && text.includes('__vpylab_transform_source__') && text.includes(Buffer.from(codeA).toString('base64'))) {
        pageReady = true;
        report.pagesVerifiedUrl = url.toString();
        break;
      }
    } catch { /* Pages 배포 중에는 다음 읽기 요청에서 확인합니다. */ }
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  assert(pageReady, '최신 코드와 실행기를 포함한 Pages 배포 확인이 끝나지 않았습니다.');
  checked('실제 공개 Pages HTTP에서 최신 코드와 학생 코드 변환기 포함 확인');
  if (args.includes('--two-accounts')) {
    const { verifyGithubPeers } = await import('./verify-github-peers.mjs');
    await verifyGithubPeers({ owner, peer: viewer, token, api, request, checked, report,
      repo: setup.repoFullName, project, codeRow, codeA, codeB });
  }
  report.status = 'passed';
} catch (error) {
  report.status = 'failed';
  report.error = error.message;
  process.exitCode = 1;
  console.error(`검증 실패: ${error.message}`);
} finally {
  for (const userId of users.reverse()) {
    const { error } = await admin.auth.admin.deleteUser(userId);
    report.cleanup.push({ fixture: 'synthetic-user', status: error ? 'failed' : 'removed' });
    if (error) { console.error('합성 테스트 계정 정리 실패'); process.exitCode = 1; }
  }
  if (server) await new Promise(resolve => server.close(resolve));
  const directory = join(root, 'docs/collaboration');
  await mkdir(directory, { recursive: true });
  const destination = join(directory, `${runId}.json`);
  await writeFile(destination, JSON.stringify(report, null, 2) + '\n');
  console.log(`검증 기록: ${destination}`);
  if (report.repoUrl) console.log(`검토용 저장소: ${report.repoUrl}`);
}
