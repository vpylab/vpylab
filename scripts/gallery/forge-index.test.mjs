import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildForgeIndex, forgeSearchQuery, readForgeModules, renderForgePendingMarkdown } from './forge-index.mjs';
import { parseApprovals } from './gallery-index.mjs';
import { main } from './build-index.mjs';
import {
  FORGE_MODULE_PREFIX, MAX_FORGE_ITEMS, MAX_FORGE_MODULE_JSON_BYTES, checkForgeModule, forgeFilePath, forgeFileUrlOf, forgeIdOfFileName, forgeSourceId,
  isForgeModuleId, parseForgeSourceId, readForgeModuleHeader, toForgeRepo, validateForgeEntry, validateForgeIndex,
} from '../../server/shared/forge-rules.js';

const NOW = new Date('2026-11-12T03:00:00Z');
const SHA = (seed) => String(seed).repeat(40).slice(0, 40).replace(/[^0-9a-f]/g, 'a');

function moduleOf(id, extra = {}) {
  return { format: 'vpylab-forge', version: 1, id, title: `${id} 모듈`, description: '', recipe: { presetId: 'bell', params: {} }, source: null, references: [], ...extra };
}

const base64 = (text) => Buffer.from(text, 'utf8').toString('base64');
const fileOf = (module) => `${FORGE_MODULE_PREFIX}${base64(JSON.stringify(module))}\nfrom vpython import *\n\nsphere()\n`;

function repoOf(owner, extra = {}) {
  return {
    name: 'vpylab-forge',
    full_name: `${owner}/vpylab-forge`,
    owner: { login: owner },
    private: false,
    visibility: 'public',
    archived: false,
    disabled: false,
    description: 'VPyLab 대장간 모듈',
    topics: ['vpylab-forge'],
    default_branch: 'main',
    pushed_at: '2026-11-10T01:02:03Z',
    ...extra,
  };
}

function respond(status, body) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

/**
 * api.github.com 흉내. files: { 'ada': { 'bell-1.py': 파일 내용, ... } }
 * 파일의 sha는 내용에서 만듭니다(내용이 같으면 sha도 같습니다).
 */
function fakeGitHub({ repos = [], files = {}, failListing = new Set(), failBlobs = false, searchStatus = 200 } = {}) {
  const calls = [];
  const shaOf = (text) => {
    let hash = 0;
    for (const char of text) hash = (Math.imul(hash, 31) + char.charCodeAt(0)) >>> 0;
    return hash.toString(16).padStart(8, '0').repeat(5);
  };
  const fetchImpl = async (url) => {
    const parsed = new URL(url);
    calls.push(parsed.pathname + parsed.search);
    if (parsed.pathname === '/search/repositories') {
      if (searchStatus !== 200) return respond(searchStatus, { message: 'API rate limit exceeded' });
      const forge = parsed.searchParams.get('q').includes('topic:vpylab-forge');
      const items = repos.filter((repo) => repo.topics.includes('vpylab-forge') === forge);
      const page = Number(parsed.searchParams.get('page'));
      return respond(200, { total_count: items.length, incomplete_results: false, items: page === 1 ? items : [] });
    }
    let match = parsed.pathname.match(/^\/repos\/([^/]+)\/vpylab-forge\/contents\/modules$/);
    if (match) {
      const owner = match[1];
      if (failListing.has(owner)) return respond(500, { message: 'Server Error' });
      if (!files[owner]) return respond(404, { message: 'Not Found' });
      return respond(200, Object.entries(files[owner]).map(([name, text]) => (
        typeof text === 'string'
          ? { type: 'file', name, sha: shaOf(text), size: Buffer.byteLength(text) }
          : { type: 'dir', name, sha: shaOf(name), size: 0 }
      )));
    }
    match = parsed.pathname.match(/^\/repos\/([^/]+)\/vpylab-forge\/git\/blobs\/([0-9a-f]+)$/);
    if (match) {
      if (failBlobs) return respond(502, { message: 'Bad Gateway' });
      const text = Object.values(files[match[1]] || {}).find((value) => typeof value === 'string' && shaOf(value) === match[2]);
      if (text === undefined) return respond(404, { message: 'Not Found' });
      // GitHub는 base64를 60자마다 줄바꿈해 돌려줍니다.
      return respond(200, { encoding: 'base64', content: base64(text).replace(/(.{60})/g, '$1\n') });
    }
    return respond(404, { message: 'Not Found' });
  };
  return { fetchImpl, calls, shaOf };
}

// ── 규칙 ─────────────────────────────────────────────────────

test('모듈 ID와 파일 이름, 원본 표시', () => {
  assert.equal(isForgeModuleId('3f2c1a9e-0b7d-4c55-9a10-ffeeddccbbaa'), true);
  for (const bad of ['', 'a/b', '..', 'a.b', 'x'.repeat(41), 'a b', null]) assert.equal(isForgeModuleId(bad), false);
  assert.equal(forgeFilePath('bell-1'), 'modules/bell-1.py');
  assert.equal(forgeIdOfFileName('bell-1.py'), 'bell-1');
  for (const bad of ['bell-1.txt', '.py', 'a/b.py', '../x.py', 'README.md']) assert.equal(forgeIdOfFileName(bad), null);
  assert.equal(forgeSourceId('ada', 'bell-1'), 'gh:ada/bell-1');
  assert.deepEqual(parseForgeSourceId('gh:ada/bell-1'), { owner: 'ada', id: 'bell-1' });
  for (const bad of ['ada/bell-1', 'gh:ada', 'gh:ada/b/c', 'gh:-ada/x', 'gh:ada/a b', 42]) assert.equal(parseForgeSourceId(bad), null);
  assert.equal(forgeFileUrlOf('ada', 'bell-1'), 'https://github.com/ada/vpylab-forge/blob/HEAD/modules/bell-1.py');
});

test('모듈 파일의 첫 줄에서 모듈 자료를 꺼낸다', () => {
  const module = moduleOf('bell-1', { title: '맑은 종 🔔' });
  assert.deepEqual(readForgeModuleHeader(fileOf(module), { id: 'bell-1' }), module);
  // 파일 이름과 모듈 ID가 다르면 받지 않습니다(다른 모듈의 파일을 이름만 바꿔 올린 경우).
  assert.equal(readForgeModuleHeader(fileOf(module), { id: 'other' }), null);
  assert.equal(readForgeModuleHeader('from vpython import *\n'), null);
  assert.equal(readForgeModuleHeader(`${FORGE_MODULE_PREFIX}not base64!\n`), null);
  assert.equal(readForgeModuleHeader(`${FORGE_MODULE_PREFIX}${base64('{"format":"other"}')}\n`), null);
  assert.equal(readForgeModuleHeader(`${FORGE_MODULE_PREFIX}${base64('[1,2]')}\n`), null);
  assert.equal(readForgeModuleHeader(fileOf(moduleOf('big', { description: 'x'.repeat(MAX_FORGE_MODULE_JSON_BYTES) }))), null);
  assert.equal(readForgeModuleHeader(null), null);
});

test('모듈 자료의 겉모양 검사', () => {
  assert.ok(checkForgeModule(moduleOf('a')));
  assert.equal(checkForgeModule({ ...moduleOf('a'), version: 2 }), null);
  assert.equal(checkForgeModule({ ...moduleOf('a'), title: 3 }), null);
  assert.equal(checkForgeModule({ ...moduleOf('a'), recipe: null }), null);
  assert.equal(checkForgeModule({ ...moduleOf('a'), id: '../a' }), null);
  assert.equal(checkForgeModule([moduleOf('a')]), null);
});

test('목록 항목과 목록 파일의 검사: 주소는 다시 만들고, 잘못된 항목과 겹친 항목은 버린다', () => {
  const entry = validateForgeEntry({ owner: 'ada', id: 'bell-1', sha: SHA('1'), updatedAt: '2026-11-10T01:02:03Z', fileUrl: 'https://evil.example/x', module: moduleOf('bell-1') });
  assert.equal(entry.fileUrl, 'https://github.com/ada/vpylab-forge/blob/HEAD/modules/bell-1.py');
  assert.equal(entry.updatedAt, '2026-11-10T01:02:03.000Z');
  assert.equal(validateForgeEntry({ owner: 'ada', id: 'bell-1', module: moduleOf('other') }), null);
  assert.equal(validateForgeEntry({ owner: 'a/b', id: 'bell-1', module: moduleOf('bell-1') }), null);
  assert.equal(validateForgeEntry({ owner: 'ada', id: 'bell-1', sha: 'zz', module: moduleOf('bell-1') }).sha, null);

  const index = validateForgeIndex({
    version: 1,
    generatedAt: '2026-11-12T03:00:00Z',
    items: [
      { owner: 'ada', id: 'a', module: moduleOf('a') },
      { owner: 'ADA', id: 'a', module: moduleOf('a') },
      { owner: 'ada', id: 'b', module: { format: 'x' } },
      'text',
      { owner: 'bob', id: 'a', module: moduleOf('a') },
    ],
  });
  assert.deepEqual(index.items.map((item) => `${item.owner}/${item.id}`), ['ada/a', 'bob/a']);
  assert.equal(validateForgeIndex({ version: 2, items: [] }), null);
  assert.equal(validateForgeIndex(null), null);
  const many = Array.from({ length: MAX_FORGE_ITEMS + 5 }, (_, i) => ({ owner: 'ada', id: `m${i}`, module: moduleOf(`m${i}`) }));
  assert.equal(validateForgeIndex({ version: 1, items: many }).items.length, MAX_FORGE_ITEMS);
});

test('대장간 저장소: 이름과 topic이 맞는 공개 저장소만 받는다', () => {
  assert.deepEqual(toForgeRepo(repoOf('ada')), {
    fullName: 'ada/vpylab-forge', owner: 'ada', title: 'VPyLab 대장간 모듈', htmlUrl: 'https://github.com/ada/vpylab-forge', updatedAt: '2026-11-10T01:02:03.000Z', branch: 'main',
  });
  assert.equal(toForgeRepo(repoOf('ada', { name: 'other', full_name: 'ada/other' })), null);
  assert.equal(toForgeRepo(repoOf('ada', { topics: ['vpylab-gallery'] })), null);
  assert.equal(toForgeRepo(repoOf('ada', { private: true })), null);
  assert.equal(toForgeRepo(repoOf('ada', { archived: true })), null);
  assert.equal(toForgeRepo(repoOf('ada', { owner: { login: 'eve' } })), null);
  assert.equal(toForgeRepo(repoOf('ada', { default_branch: 'a b' })), null);
  assert.ok(forgeSearchQuery().includes('topic:vpylab-forge') && forgeSearchQuery().includes('is:public'));
});

// ── 저장소 읽기 ──────────────────────────────────────────────

test('저장소의 모듈 파일을 읽고, 대장간 모듈이 아닌 파일은 건너뛴다', async () => {
  const github = fakeGitHub({ files: { ada: {
    'bell-1.py': fileOf(moduleOf('bell-1')),
    'renamed.py': fileOf(moduleOf('bell-1')), // 파일 이름과 모듈 ID가 다릅니다
    'plain.py': 'print("hi")\n',
    'notes.md': '# memo',
    sub: { dir: true },
  } } });
  const entries = await readForgeModules({ fetchImpl: github.fetchImpl, repo: toForgeRepo(repoOf('ada')) });
  assert.deepEqual(entries.map((item) => item.id), ['bell-1']);
  assert.equal(entries[0].owner, 'ada');
  assert.equal(entries[0].updatedAt, '2026-11-10T01:02:03.000Z');
  assert.equal(entries[0].module.title, 'bell-1 모듈');
});

test('내용이 그대로인 파일은 다시 읽지 않고 앞선 시각을 그대로 둔다', async () => {
  const files = { ada: { 'a.py': fileOf(moduleOf('a')), 'b.py': fileOf(moduleOf('b')) } };
  const first = fakeGitHub({ files });
  const repo = toForgeRepo(repoOf('ada'));
  const before = await readForgeModules({ fetchImpl: first.fetchImpl, repo });
  assert.equal(first.calls.filter((call) => call.includes('/git/blobs/')).length, 2);

  files.ada['b.py'] = fileOf(moduleOf('b', { title: '고친 모듈' }));
  const second = fakeGitHub({ files });
  const previous = new Map(before.map((item) => [`ada/${item.id}`, item]));
  const later = toForgeRepo(repoOf('ada', { pushed_at: '2026-11-11T09:00:00Z' }));
  const after = await readForgeModules({ fetchImpl: second.fetchImpl, repo: later, previous });
  assert.equal(second.calls.filter((call) => call.includes('/git/blobs/')).length, 1);
  assert.deepEqual(after.map((item) => [item.id, item.updatedAt, item.module.title]), [
    ['a', '2026-11-10T01:02:03.000Z', 'a 모듈'],
    ['b', '2026-11-11T09:00:00.000Z', '고친 모듈'],
  ]);
});

test('modules 폴더가 없으면 빈 목록이고, 읽기에 실패하면 오류를 던진다', async () => {
  const repo = toForgeRepo(repoOf('ada'));
  assert.deepEqual(await readForgeModules({ fetchImpl: fakeGitHub().fetchImpl, repo }), []);
  await assert.rejects(readForgeModules({ fetchImpl: fakeGitHub({ files: { ada: {} }, failListing: new Set(['ada']) }).fetchImpl, repo }));
  await assert.rejects(readForgeModules({ fetchImpl: fakeGitHub({ files: { ada: { 'a.py': fileOf(moduleOf('a')) } }, failBlobs: true }).fetchImpl, repo }));
});

// ── 목록 만들기 ──────────────────────────────────────────────

const reader = (github) => (repo, old) => readForgeModules({ fetchImpl: github.fetchImpl, repo, previous: old });

test('승인된 저장소의 모듈만 공개 목록에 넣고, 나머지는 승인 대기와 차단으로 나눈다', async () => {
  const github = fakeGitHub({ files: {
    ada: { 'a.py': fileOf(moduleOf('a')) },
    bob: { 'b.py': fileOf(moduleOf('b')) },
    eve: { 'e.py': fileOf(moduleOf('e')) },
  } });
  const repos = [repoOf('ada'), repoOf('bob'), repoOf('eve'), repoOf('ada'), { name: 'broken' }];
  const approvals = parseApprovals('approve @ada\nblock eve/vpylab-forge\n');
  const result = await buildForgeIndex({ repos, approvals, readModules: reader(github), now: () => NOW });
  assert.deepEqual(result.forge.items, [{ owner: 'ada', id: 'a', sha: github.shaOf(fileOf(moduleOf('a'))), updatedAt: '2026-11-10T01:02:03.000Z', module: moduleOf('a') }]);
  assert.equal(result.forge.generatedAt, NOW.toISOString());
  assert.deepEqual(result.pending.items, [{ fullName: 'bob/vpylab-forge', title: 'VPyLab 대장간 모듈', owner: 'bob', htmlUrl: 'https://github.com/bob/vpylab-forge', updatedAt: '2026-11-10T01:02:03.000Z' }]);
  assert.deepEqual(result.stats, { found: 5, repos: 1, modules: 1, pending: 1, blocked: 1, skipped: 2, kept: 0 });
  // 승인되지 않은 저장소의 파일은 읽지 않습니다.
  assert.equal(github.calls.some((call) => call.includes('/repos/bob/') || call.includes('/repos/eve/')), false);
});

test('저장소 하나를 읽지 못하면 그 저장소의 앞선 모듈을 그대로 둔다', async () => {
  const files = { ada: { 'a.py': fileOf(moduleOf('a')) }, bob: { 'b.py': fileOf(moduleOf('b')) } };
  const approvals = parseApprovals('approve @ada\napprove @bob\n');
  const repos = [repoOf('ada'), repoOf('bob')];
  const first = await buildForgeIndex({ repos, approvals, readModules: reader(fakeGitHub({ files })), now: () => NOW });
  assert.equal(first.forge.items.length, 2);

  // bob이 새로 푸시했는데 이번 실행에서 bob의 저장소를 읽지 못했습니다.
  const pushed = [repoOf('ada'), repoOf('bob', { pushed_at: '2026-11-11T09:00:00Z' })];
  files.bob['b2.py'] = fileOf(moduleOf('b2'));
  const broken = fakeGitHub({ files, failListing: new Set(['bob']) });
  const second = await buildForgeIndex({ repos: pushed, approvals, previous: first.forge, previousPending: first.pending, readModules: reader(broken), now: () => new Date('2026-11-12T04:00:00Z') });
  assert.deepEqual(second.forge.items, first.forge.items);
  assert.equal(second.stats.kept, 1);
  // 내용이 그대로면 만든 시각도 그대로입니다.
  assert.equal(second.forge.generatedAt, first.forge.generatedAt);
  assert.equal(second.pending.generatedAt, first.pending.generatedAt);
  // 읽지 못한 저장소는 읽은 시각을 적지 않아 다음 실행이 다시 읽습니다.
  assert.deepEqual(second.forge.repos, { ada: '2026-11-10T01:02:03.000Z' });
  const third = await buildForgeIndex({ repos: pushed, approvals, previous: second.forge, readModules: reader(fakeGitHub({ files })), now: () => NOW });
  assert.deepEqual(third.forge.items.map((item) => `${item.owner}/${item.id}`).sort(), ['ada/a', 'bob/b', 'bob/b2']);
  assert.deepEqual(third.forge.repos, { ada: '2026-11-10T01:02:03.000Z', bob: '2026-11-11T09:00:00.000Z' });
});

test('푸시가 없는 저장소는 GitHub에 다시 묻지 않는다', async () => {
  const files = { ada: { 'a.py': fileOf(moduleOf('a')) }, bob: { 'b.py': fileOf(moduleOf('b')) } };
  const approvals = parseApprovals('approve @ada\napprove @bob\n');
  const repos = [repoOf('ada'), repoOf('bob')];
  const first = await buildForgeIndex({ repos, approvals, readModules: reader(fakeGitHub({ files })), now: () => NOW });
  const github = fakeGitHub({ files });
  const second = await buildForgeIndex({ repos, approvals, previous: first.forge, readModules: reader(github), now: () => new Date('2026-11-12T04:00:00Z') });
  assert.deepEqual(github.calls, []);
  assert.deepEqual(second.forge, first.forge);
  // 한 저장소만 푸시했으면 그 저장소만 읽습니다.
  const pushed = [repoOf('ada'), repoOf('bob', { pushed_at: '2026-11-11T09:00:00Z' })];
  await buildForgeIndex({ repos: pushed, approvals, previous: first.forge, readModules: reader(github), now: () => NOW });
  assert.equal(github.calls.some((call) => call.includes('/repos/ada/')), false);
  assert.equal(github.calls.some((call) => call.includes('/repos/bob/')), true);
  // 승인되었지만 모듈이 없던 저장소도 푸시가 없으면 다시 읽지 않습니다.
  const empty = await buildForgeIndex({ repos: [repoOf('cy')], approvals: parseApprovals('approve @cy'), readModules: reader(fakeGitHub()), now: () => NOW });
  assert.deepEqual(empty.forge.repos, { cy: '2026-11-10T01:02:03.000Z' });
  const quiet = fakeGitHub();
  await buildForgeIndex({ repos: [repoOf('cy')], approvals: parseApprovals('approve @cy'), previous: empty.forge, readModules: reader(quiet), now: () => NOW });
  assert.deepEqual(quiet.calls, []);
});

test('승인을 빼거나 파일을 지우면 다음 목록에서 빠진다', async () => {
  const files = { ada: { 'a.py': fileOf(moduleOf('a')), 'b.py': fileOf(moduleOf('b')) } };
  const repos = [repoOf('ada')];
  const first = await buildForgeIndex({ repos, approvals: parseApprovals('approve @ada'), readModules: reader(fakeGitHub({ files })), now: () => NOW });
  assert.equal(first.forge.items.length, 2);
  delete files.ada['b.py'];
  const pushed = [repoOf('ada', { pushed_at: '2026-11-11T09:00:00Z' })]; // 파일을 지운 커밋
  const second = await buildForgeIndex({ repos: pushed, approvals: parseApprovals('approve @ada'), previous: first.forge, readModules: reader(fakeGitHub({ files })), now: () => NOW });
  assert.deepEqual(second.forge.items.map((item) => item.id), ['a']);
  const third = await buildForgeIndex({ repos: pushed, approvals: parseApprovals(''), previous: second.forge, readModules: reader(fakeGitHub({ files })), now: () => NOW });
  assert.deepEqual(third.forge.items, []);
  assert.deepEqual(third.forge.repos, {});
  assert.deepEqual(third.pending.items.map((item) => item.fullName), ['ada/vpylab-forge']);
  // 다시 승인하면 푸시가 없어도 저장소를 읽어 싣습니다(읽은 시각이 남아 있지 않습니다).
  const fourth = await buildForgeIndex({ repos: pushed, approvals: parseApprovals('approve @ada'), previous: third.forge, readModules: reader(fakeGitHub({ files })), now: () => NOW });
  assert.deepEqual(fourth.forge.items.map((item) => item.id), ['a']);
});

test('공개 목록은 개수 상한을 넘지 않는다', async () => {
  const modules = Array.from({ length: MAX_FORGE_ITEMS + 20 }, (_, i) => validateForgeEntry({ owner: `user${i}`, id: 'm', sha: SHA('a'), updatedAt: '2026-11-10T01:02:03Z', module: moduleOf('m') }));
  const repos = modules.map((item) => repoOf(item.owner));
  const approvals = parseApprovals(modules.map((item) => `approve @${item.owner}`).join('\n'));
  const result = await buildForgeIndex({ repos, approvals, readModules: async (repo) => modules.filter((item) => item.owner === repo.owner), now: () => NOW });
  assert.equal(result.forge.items.length, MAX_FORGE_ITEMS);
});

test('승인 대기 목록의 대장간 부분', () => {
  const markdown = renderForgePendingMarkdown({ items: [{ fullName: 'bob/vpylab-forge', title: 'x', owner: 'bob', htmlUrl: 'https://github.com/bob/vpylab-forge', updatedAt: '2026-11-10T01:02:03.000Z' }] });
  assert.ok(markdown.includes('`approve bob/vpylab-forge`'));
  assert.ok(markdown.includes('(https://github.com/bob/vpylab-forge/tree/HEAD/modules)'));
  assert.ok(renderForgePendingMarkdown({ items: [] }).includes('승인을 기다리는 대장간 저장소가 없습니다.'));
});

// ── 실행 파일 ────────────────────────────────────────────────

test('실행 파일: 대장간 목록 파일을 함께 쓰고, 바뀐 것이 없으면 그대로 둔다', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vpylab-forge-'));
  try {
    const approvalsFile = path.join(dir, 'approvals.txt');
    fs.writeFileSync(approvalsFile, 'approve @ada\n');
    const out = path.join(dir, 'out');
    const lines = [];
    const io = { log: (text) => lines.push(text), error: (text) => lines.push(text) };
    const github = fakeGitHub({ repos: [repoOf('ada'), repoOf('bob')], files: { ada: { 'a.py': fileOf(moduleOf('a')) }, bob: { 'b.py': fileOf(moduleOf('b')) } } });
    assert.equal(await main(['--approvals', approvalsFile, '--out', out, '--previous', out], { env: { GITHUB_TOKEN: 'secret-token' }, fetchImpl: github.fetchImpl, io, now: () => NOW }), 0);
    const forge = JSON.parse(fs.readFileSync(path.join(out, 'forge.json'), 'utf8'));
    assert.deepEqual(forge.items.map((item) => `${item.owner}/${item.id}`), ['ada/a']);
    assert.ok(validateForgeIndex(forge));
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(out, 'forge-pending.json'), 'utf8')).items.map((item) => item.fullName), ['bob/vpylab-forge']);
    assert.ok(fs.readFileSync(path.join(out, 'PENDING.md'), 'utf8').includes('approve bob/vpylab-forge'));
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(out, 'gallery.json'), 'utf8')).items, []);
    assert.equal(lines.join('\n').includes('secret-token'), false);
    assert.ok(lines.some((line) => line.startsWith('대장간:') && line.includes('공개 모듈 1개')));

    const before = fs.readFileSync(path.join(out, 'forge.json'), 'utf8');
    const blobCalls = github.calls.filter((call) => call.includes('/git/blobs/')).length;
    assert.equal(await main(['--approvals', approvalsFile, '--out', out, '--previous', out], { env: {}, fetchImpl: github.fetchImpl, io, now: () => new Date('2026-11-12T04:00:00Z') }), 0);
    assert.equal(fs.readFileSync(path.join(out, 'forge.json'), 'utf8'), before);
    assert.equal(github.calls.filter((call) => call.includes('/git/blobs/')).length, blobCalls);

    // 검색 실패: 앞서 만든 목록을 건드리지 않습니다.
    assert.equal(await main(['--approvals', approvalsFile, '--out', out], { env: {}, fetchImpl: fakeGitHub({ searchStatus: 403 }).fetchImpl, io, now: () => NOW }), 1);
    assert.equal(fs.readFileSync(path.join(out, 'forge.json'), 'utf8'), before);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
