import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  GalleryIndexError, buildIndex, classifyEntry, escapeMarkdown, findThumbnail, parseApprovalTarget, parseApprovals,
  renderPendingMarkdown, searchGalleryRepos, searchQuery, toEntry,
} from './gallery-index.mjs';
import { main, parseArgs } from './build-index.mjs';
import {
  MAX_THUMBNAIL_BYTES, cleanTitle, isAllowedGalleryUrl, isAllowedIndexUrl, parseFullName, validateGalleryEntry, validateGalleryIndex,
} from '../../server/shared/gallery-rules.js';

const NOW = new Date('2026-11-12T03:00:00Z');

function repoOf(fullName, extra = {}) {
  const [owner, name] = fullName.split('/');
  return {
    name,
    full_name: fullName,
    owner: { login: owner },
    private: false,
    visibility: 'public',
    archived: false,
    disabled: false,
    description: `${name} 작품`,
    html_url: `https://github.com/${fullName}`,
    topics: ['vpylab-gallery', 'vpylab-project'],
    has_pages: true,
    default_branch: 'main',
    stargazers_count: 3,
    pushed_at: '2026-11-10T01:02:03Z',
    updated_at: '2026-11-11T01:02:03Z',
    ...extra,
  };
}

function respond(status, body) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

/** api.github.com 흉내: 검색 결과와 저장소별 thumbnail.jpg 크기를 돌려줍니다. */
function fakeGitHub({ repos = [], thumbnails = {}, searchStatus = 200, incomplete = false } = {}) {
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    const parsed = new URL(url);
    calls.push({ url, path: parsed.pathname, headers: init.headers || {} });
    if (parsed.origin !== 'https://api.github.com') return respond(404, { message: 'Not Found' });
    if (parsed.pathname === '/search/repositories') {
      if (searchStatus !== 200) return respond(searchStatus, { message: 'API rate limit exceeded' });
      const page = Number(parsed.searchParams.get('page'));
      const perPage = Number(parsed.searchParams.get('per_page'));
      return respond(200, { total_count: repos.length, incomplete_results: incomplete, items: repos.slice((page - 1) * perPage, page * perPage) });
    }
    const match = parsed.pathname.match(/^\/repos\/([^/]+\/[^/]+)\/contents\/thumbnail\.jpg$/);
    if (match) {
      const size = thumbnails[match[1]];
      return size === undefined ? respond(404, { message: 'Not Found' }) : respond(200, { type: 'file', size });
    }
    return respond(404, { message: 'Not Found' });
  };
  return { fetchImpl, calls };
}

// ── 주소와 글자 규칙 ─────────────────────────────────────────

test('주소는 그 저장소의 github.com · github.io · raw.githubusercontent.com 주소만 받는다', () => {
  const target = { owner: 'Ada', repo: 'vpylab-solar-abc123' };
  assert.equal(isAllowedGalleryUrl('html', 'https://github.com/Ada/vpylab-solar-abc123', target), true);
  assert.equal(isAllowedGalleryUrl('pages', 'https://ada.github.io/vpylab-solar-abc123/', target), true);
  assert.equal(isAllowedGalleryUrl('thumbnail', 'https://raw.githubusercontent.com/Ada/vpylab-solar-abc123/main/thumbnail.jpg', target), true);

  for (const [kind, url] of [
    ['html', 'http://github.com/Ada/vpylab-solar-abc123'],
    ['html', 'https://github.com/Ada/other'],
    ['html', 'https://github.com.evil.example/Ada/vpylab-solar-abc123'],
    ['html', 'javascript:alert(1)'],
    ['html', 'https://github.com/Ada/vpylab-solar-abc123?tab=readme'],
    ['pages', 'https://evil.github.io/vpylab-solar-abc123/'],
    ['pages', 'https://ada.github.io.evil.example/vpylab-solar-abc123/'],
    ['pages', 'https://ada.github.io/vpylab-solar-abc123/../x/'],
    ['pages', 'data:text/html,<script>alert(1)</script>'],
    ['thumbnail', 'https://raw.githubusercontent.com/Eve/vpylab-solar-abc123/main/thumbnail.jpg'],
    ['thumbnail', 'https://raw.githubusercontent.com/Ada/vpylab-solar-abc123/main/other.jpg'],
    ['thumbnail', 'https://raw.githubusercontent.com/Ada/vpylab-solar-abc123/a/b/thumbnail.jpg'],
    ['thumbnail', 'https://raw.githubusercontent.com/Ada/vpylab-solar-abc123/../thumbnail.jpg'],
    ['thumbnail', 'https://example.com/thumbnail.jpg'],
    ['thumbnail', 'data:image/svg+xml,<svg onload=alert(1)>'],
    ['other', 'https://github.com/Ada/vpylab-solar-abc123'],
  ]) assert.equal(isAllowedGalleryUrl(kind, url, target), false, `${kind} ${url}`);

  assert.equal(isAllowedGalleryUrl('html', 'https://github.com/a/b', { owner: 'a/../x', repo: 'b' }), false);
  assert.equal(isAllowedGalleryUrl('html', 42, target), false);
});

test('저장소 이름과 제목은 글자로만 다룬다', () => {
  assert.deepEqual(parseFullName('ada/vpylab-solar'), { owner: 'ada', repo: 'vpylab-solar' });
  for (const bad of ['ada', 'ada/', '/repo', 'ada/repo/extra', 'ada/..', 'ada/.', '-ada/repo', 'ada/re po', 'ada/<b>', 'a'.repeat(40) + '/repo', null, 3]) {
    assert.equal(parseFullName(bad), null, String(bad));
  }
  assert.equal(cleanTitle('  태양계\n모형\u0000 \u202e뒤집기  '), '태양계 모형 뒤집기');
  assert.equal(cleanTitle('<img src=x onerror=alert(1)>'), '<img src=x onerror=alert(1)>'); // 글자 그대로 둡니다. 화면이 글자로만 그립니다.
  assert.equal(cleanTitle('', 'repo-name'), 'repo-name');
  assert.equal(cleanTitle(null, 'repo-name'), 'repo-name');
  assert.equal(Array.from(cleanTitle('가'.repeat(300))).length, 100);
});

test('목록 항목 검사: 잘못된 저장소는 버리고, 잘못된 선택 주소는 그 값만 비운다', () => {
  const good = {
    fullName: 'ada/solar', title: '태양계', owner: 'ada', htmlUrl: 'https://github.com/ada/solar',
    pagesUrl: 'https://ada.github.io/solar/', thumbnailUrl: 'https://raw.githubusercontent.com/ada/solar/main/thumbnail.jpg',
    stars: 4, updatedAt: '2026-11-10T01:02:03Z', extra: '버려지는 값',
  };
  assert.deepEqual(validateGalleryEntry(good), {
    fullName: 'ada/solar', title: '태양계', owner: 'ada', htmlUrl: 'https://github.com/ada/solar',
    pagesUrl: 'https://ada.github.io/solar/', thumbnailUrl: 'https://raw.githubusercontent.com/ada/solar/main/thumbnail.jpg',
    stars: 4, updatedAt: '2026-11-10T01:02:03.000Z',
  });
  assert.equal(validateGalleryEntry({ ...good, htmlUrl: 'https://evil.example/' }), null);
  assert.equal(validateGalleryEntry({ ...good, owner: 'eve' }), null);
  assert.equal(validateGalleryEntry({ ...good, fullName: 'ada/solar/x' }), null);
  assert.equal(validateGalleryEntry(null), null);
  const loose = validateGalleryEntry({ ...good, pagesUrl: 'https://evil.example/', thumbnailUrl: 'javascript:alert(1)', stars: -5, updatedAt: 'yesterday', title: 7 });
  assert.equal(loose.pagesUrl, null);
  assert.equal(loose.thumbnailUrl, null);
  assert.equal(loose.stars, 0);
  assert.equal(loose.updatedAt, null);
  assert.equal(loose.title, 'solar');

  assert.equal(validateGalleryIndex({ version: 2, items: [] }), null);
  assert.equal(validateGalleryIndex({ version: 1, items: 'x' }), null);
  const index = validateGalleryIndex({ version: 1, generatedAt: '2026-11-12T00:00:00Z', items: [good, { ...good, fullName: 'ADA/SOLAR', owner: 'ADA', htmlUrl: 'https://github.com/ADA/SOLAR' }, { fullName: 'x' }] });
  assert.equal(index.items.length, 1); // 대소문자만 다른 같은 저장소와 잘못된 항목은 빠집니다.
});

test('앱이 읽을 목록 주소는 raw.githubusercontent.com과 같은 출처 경로만 받는다', () => {
  assert.equal(isAllowedIndexUrl('https://raw.githubusercontent.com/vpylab/vpylab/gallery-data/gallery.json'), true);
  assert.equal(isAllowedIndexUrl('/gallery/gallery.json'), true);
  for (const bad of ['', 'https://example.com/gallery.json', 'http://raw.githubusercontent.com/a/b/c/gallery.json', '//evil.example/gallery.json', 'https://raw.githubusercontent.com/a/b/c/gallery.json?x=1', 'https://raw.githubusercontent.com.evil.example/a/b/c/gallery.json', 'javascript:alert(1)', '/a b.json', null]) {
    assert.equal(isAllowedIndexUrl(bad), false, String(bad));
  }
});

// ── 승인 파일 ────────────────────────────────────────────────

test('승인 파일: 아이디·저장소·주소·한글 낱말을 읽고, 읽지 못한 줄은 승인으로 보지 않는다', () => {
  const approvals = parseApprovals([
    '\ufeff# 메모 줄',
    '',
    'approve @Teacher-Kim   # 담당 교사',
    'approve ada',
    '승인 Bob/vpylab-solar-abc123',
    'approve https://github.com/Carol/My.Repo/',
    'block @eve',
    '차단 mallory/bad-repo',
    'approve',
    'approve two words',
    'allow dave',
    'approve dave/../x',
    'approve *',
  ].join('\r\n'));
  assert.deepEqual([...approvals.approvedOwners].sort(), ['ada', 'teacher-kim']);
  assert.deepEqual([...approvals.approvedRepos].sort(), ['bob/vpylab-solar-abc123', 'carol/my.repo']);
  assert.deepEqual([...approvals.blockedOwners], ['eve']);
  assert.deepEqual([...approvals.blockedRepos], ['mallory/bad-repo']);
  assert.deepEqual(approvals.warnings.map((warning) => warning.line), [9, 10, 11, 12, 13]);

  assert.equal(parseApprovalTarget(''), null);
  assert.deepEqual(parseApprovalTarget('https://github.com/Ada'), { owner: 'ada' });
  assert.deepEqual(parseApprovalTarget('Ada/Repo.git'), { owner: 'ada', repo: 'repo' });
  assert.deepEqual(parseApprovals(null).approvedOwners.size, 0);
});

test('브랜치에 처음 넣는 승인 파일 양식은 아무것도 승인하지 않고, 읽지 못하는 줄도 없다', () => {
  const template = fs.readFileSync(new URL('./approvals.template.txt', import.meta.url), 'utf8');
  const approvals = parseApprovals(template);
  assert.equal(approvals.approvedOwners.size + approvals.approvedRepos.size + approvals.blockedOwners.size + approvals.blockedRepos.size, 0);
  assert.deepEqual(approvals.warnings, []);
  // 양식의 설명대로 적은 줄은 읽힙니다.
  const filled = parseApprovals(`${template}approve ada/solar\napprove @ada\nblock bob/moon\nblock @bob\n승인 https://github.com/carol/star\n차단 @dave\n`);
  assert.deepEqual(filled.warnings, []);
  assert.deepEqual([...filled.approvedRepos].sort(), ['ada/solar', 'carol/star']);
  assert.deepEqual([...filled.blockedOwners].sort(), ['bob', 'dave']);
});

test('차단은 승인보다 우선한다', () => {
  const approvals = parseApprovals('approve @ada\napprove bob/one\nblock ada/banned\nblock @bob');
  const entry = (fullName) => ({ fullName, owner: fullName.split('/')[0] });
  assert.equal(classifyEntry(entry('Ada/ok'), approvals), 'approved');
  assert.equal(classifyEntry(entry('ada/Banned'), approvals), 'blocked');
  assert.equal(classifyEntry(entry('bob/one'), approvals), 'blocked');
  assert.equal(classifyEntry(entry('carol/any'), approvals), 'pending');
});

// ── 검색 결과 → 항목 ─────────────────────────────────────────

test('보관·비공개·사용 중지 저장소와 topic이 빠진 저장소는 싣지 않는다', () => {
  assert.equal(toEntry(repoOf('ada/solar')).entry.fullName, 'ada/solar');
  assert.equal(toEntry(repoOf('ada/solar', { archived: true })), null);
  assert.equal(toEntry(repoOf('ada/solar', { private: true })), null);
  assert.equal(toEntry(repoOf('ada/solar', { private: undefined })), null);
  assert.equal(toEntry(repoOf('ada/solar', { visibility: 'internal' })), null);
  assert.equal(toEntry(repoOf('ada/solar', { disabled: true })), null);
  assert.equal(toEntry(repoOf('ada/solar', { topics: ['vpylab-gallery'] })), null);
  assert.equal(toEntry(repoOf('ada/solar', { topics: ['vpylab-project'] })), null);
  assert.equal(toEntry(repoOf('ada/solar', { topics: undefined })), null);
  assert.equal(toEntry(repoOf('ada/solar', { owner: { login: 'eve' } })), null);
  assert.equal(toEntry(repoOf('ada/solar', { name: 'other' })), null);
  assert.equal(toEntry(null), null);
});

test('항목의 주소는 GitHub이 준 값을 옮기지 않고 저장소 이름에서 만든다', () => {
  const { entry, branch } = toEntry(repoOf('Ada/solar', {
    html_url: 'https://evil.example/phish',
    homepage: 'https://evil.example/',
    description: '태양계 <script>alert(1)</script>\n둘째 줄',
    stargazers_count: 12,
  }));
  assert.deepEqual(entry, {
    fullName: 'Ada/solar',
    title: '태양계 <script>alert(1)</script> 둘째 줄',
    owner: 'Ada',
    htmlUrl: 'https://github.com/Ada/solar',
    pagesUrl: 'https://ada.github.io/solar/',
    thumbnailUrl: null,
    stars: 12,
    updatedAt: '2026-11-10T01:02:03.000Z',
  });
  assert.equal(branch, 'main');
  assert.equal(toEntry(repoOf('ada/solar', { has_pages: false })).entry.pagesUrl, null);
  assert.equal(toEntry(repoOf('ada/solar', { default_branch: 'feature/x' })).branch, null);
  assert.equal(toEntry(repoOf('ada/solar', { description: null })).entry.title, 'solar');
});

test('검색: 여러 쪽을 읽고, 토큰은 Authorization 머리글에만 넣는다', async () => {
  const repos = Array.from({ length: 230 }, (_, i) => repoOf(`ada/work-${i}`));
  const github = fakeGitHub({ repos });
  const found = await searchGalleryRepos({ fetchImpl: github.fetchImpl, token: 'secret-token' });
  assert.equal(found.length, 230);
  assert.equal(github.calls.length, 3);
  for (const call of github.calls) {
    assert.equal(call.headers.Authorization, 'Bearer secret-token');
    assert.equal(call.url.includes('secret-token'), false);
  }
  assert.equal(new URL(github.calls[0].url).searchParams.get('q'), searchQuery());
  assert.match(searchQuery(), /topic:vpylab-gallery topic:vpylab-project is:public archived:false/);

  const anonymous = fakeGitHub({ repos: [] });
  await searchGalleryRepos({ fetchImpl: anonymous.fetchImpl });
  assert.equal('Authorization' in anonymous.calls[0].headers, false);
});

test('검색이 실패하거나 불완전하면 오류를 던지고, 오류에 토큰을 넣지 않는다', async () => {
  await assert.rejects(searchGalleryRepos({ fetchImpl: fakeGitHub({ searchStatus: 403 }).fetchImpl, token: 'secret-token' }), (error) => {
    assert.ok(error instanceof GalleryIndexError);
    assert.equal(error.status, 403);
    assert.equal(error.message.includes('secret-token'), false);
    return true;
  });
  await assert.rejects(searchGalleryRepos({ fetchImpl: fakeGitHub({ repos: [repoOf('ada/solar')], incomplete: true }).fetchImpl }), GalleryIndexError);
  await assert.rejects(searchGalleryRepos({ fetchImpl: async () => { throw new TypeError('fetch failed: secret-token'); }, token: 'secret-token' }), (error) => !error.message.includes('secret-token'));
});

test('미리보기 그림: 있고 200KB 이하일 때만 주소를 싣는다', async () => {
  const entry = toEntry(repoOf('ada/solar')).entry;
  const check = (thumbnails, branch = 'main') => findThumbnail({ fetchImpl: fakeGitHub({ thumbnails }).fetchImpl, entry, branch });
  assert.equal(await check({ 'ada/solar': 50_000 }), 'https://raw.githubusercontent.com/ada/solar/main/thumbnail.jpg');
  assert.equal(await check({ 'ada/solar': MAX_THUMBNAIL_BYTES }), 'https://raw.githubusercontent.com/ada/solar/main/thumbnail.jpg');
  assert.equal(await check({ 'ada/solar': MAX_THUMBNAIL_BYTES + 1 }), null);
  assert.equal(await check({ 'ada/solar': 0 }), null);
  assert.equal(await check({}), null);
  assert.equal(await check({ 'ada/solar': 50_000 }, null), null);
  assert.equal(await findThumbnail({ fetchImpl: async () => { throw new Error('offline'); }, entry, branch: 'main' }), null);
});

// ── 목록 만들기 ──────────────────────────────────────────────

test('승인 전에는 어떤 저장소도 공개 목록에 들어가지 않는다', async () => {
  // 검색 결과에는 topic만 붙이면 누구나 들어올 수 있습니다. 악의적인 저장소가 섞여 있는 상황입니다.
  const repos = [
    repoOf('eve/vpylab-phishing', { description: '무료 아이템 받기 https://evil.example', stargazers_count: 9999 }),
    repoOf('mallory/looks-official', { description: 'VPyLab 공식 작품' }),
    repoOf('ada/solar'),
  ];
  const nothingApproved = await buildIndex({ repos, approvals: parseApprovals(''), now: () => NOW });
  assert.deepEqual(nothingApproved.gallery.items, []);
  assert.deepEqual(nothingApproved.pending.items.map((item) => item.fullName).sort(), ['ada/solar', 'eve/vpylab-phishing', 'mallory/looks-official']);

  const oneApproved = await buildIndex({ repos, approvals: parseApprovals('approve ada/solar\nblock @eve'), now: () => NOW });
  assert.deepEqual(oneApproved.gallery.items.map((item) => item.fullName), ['ada/solar']);
  assert.deepEqual(oneApproved.pending.items.map((item) => item.fullName), ['mallory/looks-official']);
  assert.deepEqual(oneApproved.stats, { found: 3, approved: 1, pending: 1, blocked: 1, skipped: 0 });
  // 승인 파일을 읽지 못한 줄은 승인이 아닙니다.
  const typo = await buildIndex({ repos, approvals: parseApprovals('aprove ada/solar\napprove ada / solar'), now: () => NOW });
  assert.deepEqual(typo.gallery.items, []);
  assert.equal(typo.warnings.length, 2);
});

test('공개 목록 항목은 필요한 값만 담고, 승인 대기 목록에는 그림 주소와 스타 수를 넣지 않는다', async () => {
  const repos = [repoOf('ada/solar', { token: 'x', owner: { login: 'ada', email: 'ada@example.com', id: 7 } }), repoOf('bob/waiting')];
  const result = await buildIndex({
    repos,
    approvals: parseApprovals('approve @ada'),
    checkThumbnail: async (entry, branch) => `https://raw.githubusercontent.com/${entry.fullName}/${branch}/thumbnail.jpg`,
    now: () => NOW,
  });
  assert.deepEqual(result.gallery, {
    version: 1,
    generatedAt: NOW.toISOString(),
    topic: 'vpylab-gallery',
    items: [{
      fullName: 'ada/solar', title: 'solar 작품', owner: 'ada', htmlUrl: 'https://github.com/ada/solar',
      pagesUrl: 'https://ada.github.io/solar/', thumbnailUrl: 'https://raw.githubusercontent.com/ada/solar/main/thumbnail.jpg',
      stars: 3, updatedAt: '2026-11-10T01:02:03.000Z',
    }],
  });
  assert.deepEqual(Object.keys(result.pending.items[0]), ['fullName', 'title', 'owner', 'htmlUrl', 'pagesUrl', 'updatedAt']);
  assert.equal(JSON.stringify(result).includes('example.com'), false);
});

test('미리보기 그림 확인이 이상한 주소를 돌려줘도 싣지 않는다', async () => {
  const result = await buildIndex({
    repos: [repoOf('ada/solar')], approvals: parseApprovals('approve @ada'), now: () => NOW,
    checkThumbnail: async () => 'https://evil.example/tracker.gif',
  });
  assert.equal(result.gallery.items[0].thumbnailUrl, null);
});

test('승인을 빼거나 저장소가 보관·삭제되면 다음 목록에서 빠진다', async () => {
  const approvals = parseApprovals('approve @ada');
  const first = await buildIndex({ repos: [repoOf('ada/solar'), repoOf('ada/moon')], approvals, now: () => NOW });
  assert.equal(first.gallery.items.length, 2);
  const second = await buildIndex({
    repos: [repoOf('ada/solar', { archived: true })], // moon은 삭제·비공개가 되어 검색에 나오지 않습니다.
    approvals, previous: first.gallery, now: () => NOW,
  });
  assert.deepEqual(second.gallery.items, []);
  const third = await buildIndex({ repos: [repoOf('ada/solar'), repoOf('ada/moon')], approvals: parseApprovals(''), previous: first.gallery, now: () => NOW });
  assert.deepEqual(third.gallery.items, []);
});

test('바뀌지 않은 저장소는 그림을 다시 확인하지 않고, 내용이 그대로면 만든 시각도 그대로다', async () => {
  const approvals = parseApprovals('approve @ada');
  let checks = 0;
  const checkThumbnail = async (entry, branch) => { checks += 1; return `https://raw.githubusercontent.com/${entry.fullName}/${branch}/thumbnail.jpg`; };
  const repos = [repoOf('ada/solar'), repoOf('ada/moon', { pushed_at: '2026-11-11T00:00:00Z' })];
  const first = await buildIndex({ repos, approvals, checkThumbnail, now: () => NOW });
  assert.equal(checks, 2);
  assert.deepEqual(first.gallery.items.map((item) => item.fullName), ['ada/moon', 'ada/solar']); // 최근에 고친 순서

  const later = new Date('2026-11-12T03:30:00Z');
  const second = await buildIndex({ repos, approvals, checkThumbnail, previous: first.gallery, previousPending: first.pending, now: () => later });
  assert.equal(checks, 2);
  assert.deepEqual(second.gallery, first.gallery);
  assert.deepEqual(second.pending, first.pending);

  const pushed = [repoOf('ada/solar', { pushed_at: '2026-11-12T02:00:00Z' }), repos[1]];
  const third = await buildIndex({ repos: pushed, approvals, checkThumbnail, previous: first.gallery, now: () => later });
  assert.equal(checks, 3);
  assert.equal(third.gallery.generatedAt, later.toISOString());
});

test('같은 저장소가 검색에 두 번 나와도 한 번만 싣는다', async () => {
  const result = await buildIndex({ repos: [repoOf('ada/solar'), repoOf('Ada/Solar')], approvals: parseApprovals('approve @ada'), now: () => NOW });
  assert.equal(result.gallery.items.length, 1);
  assert.equal(result.stats.skipped, 1);
});

// ── 승인 대기 목록 글 ────────────────────────────────────────

test('승인 대기 목록의 제목은 마크다운으로 해석되지 않게 적는다', () => {
  const markdown = renderPendingMarkdown({
    items: [{ fullName: 'eve/x', title: '[클릭](https://evil.example) | <img src=x> `코드`', owner: 'eve', htmlUrl: 'https://github.com/eve/x', pagesUrl: null, updatedAt: '2026-11-10T01:02:03.000Z' }],
  }, [{ line: 3, text: 'aprove ada' }]);
  assert.ok(markdown.includes('`approve eve/x`'));
  assert.ok(markdown.includes('(https://github.com/eve/x)'));
  assert.equal(markdown.includes('](https://evil.example)'), false);
  assert.ok(markdown.includes('\\<img'));
  assert.equal(/[^\\]<img/.test(markdown), false);
  assert.ok(markdown.includes('2026-11-10'));
  assert.ok(markdown.includes('3번째 줄'));
  assert.equal(escapeMarkdown('a|b'), 'a\\|b');
  assert.ok(renderPendingMarkdown({ items: [] }).includes('승인을 기다리는 작품이 없습니다.'));
});

// ── 실행 파일 ────────────────────────────────────────────────

test('실행 파일: 목록 파일 세 개를 쓰고, 검색이 실패하면 아무것도 쓰지 않는다', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vpylab-gallery-'));
  try {
    const approvalsFile = path.join(dir, 'approvals.txt');
    fs.writeFileSync(approvalsFile, 'approve @ada\naprove bob\n');
    const out = path.join(dir, 'out');
    const lines = [];
    const io = { log: (text) => lines.push(text), error: (text) => lines.push(text) };
    const github = fakeGitHub({ repos: [repoOf('ada/solar'), repoOf('bob/waiting')], thumbnails: { 'ada/solar': 1234 } });
    const code = await main(['--approvals', approvalsFile, '--out', out, '--previous', out], { env: { GITHUB_TOKEN: 'secret-token' }, fetchImpl: github.fetchImpl, io, now: () => NOW });
    assert.equal(code, 0);
    const gallery = JSON.parse(fs.readFileSync(path.join(out, 'gallery.json'), 'utf8'));
    assert.deepEqual(gallery.items.map((item) => item.fullName), ['ada/solar']);
    assert.equal(gallery.items[0].thumbnailUrl, 'https://raw.githubusercontent.com/ada/solar/main/thumbnail.jpg');
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(out, 'pending.json'), 'utf8')).items.map((item) => item.fullName), ['bob/waiting']);
    assert.ok(fs.readFileSync(path.join(out, 'PENDING.md'), 'utf8').includes('approve bob/waiting'));
    assert.equal(lines.join('\n').includes('secret-token'), false);
    assert.ok(lines.some((line) => line.includes('2번째 줄')));

    // 두 번째 실행: 바뀐 것이 없으면 파일이 그대로입니다(목록 브랜치에 커밋이 생기지 않습니다).
    const before = fs.readFileSync(path.join(out, 'gallery.json'), 'utf8');
    assert.equal(await main(['--approvals', approvalsFile, '--out', out, '--previous', out], { env: {}, fetchImpl: github.fetchImpl, io, now: () => new Date('2026-11-12T04:00:00Z') }), 0);
    assert.equal(fs.readFileSync(path.join(out, 'gallery.json'), 'utf8'), before);

    // 검색 실패: 앞서 만든 목록을 건드리지 않습니다.
    const failed = await main(['--approvals', approvalsFile, '--out', out], { env: {}, fetchImpl: fakeGitHub({ searchStatus: 403 }).fetchImpl, io, now: () => NOW });
    assert.equal(failed, 1);
    assert.equal(fs.readFileSync(path.join(out, 'gallery.json'), 'utf8'), before);

    // 승인 파일이 없으면 모두 승인 대기입니다.
    const empty = path.join(dir, 'empty');
    assert.equal(await main(['--approvals', path.join(dir, 'missing.txt'), '--out', empty], { env: {}, fetchImpl: github.fetchImpl, io, now: () => NOW }), 0);
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(empty, 'gallery.json'), 'utf8')).items, []);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('실행 파일의 옵션', () => {
  assert.deepEqual(parseArgs(['--approvals', 'a.txt', '--out', 'o', '--previous', 'p']), { approvals: 'a.txt', out: 'o', previous: 'p', dryRun: false });
  assert.equal(parseArgs(['--dry-run']).dryRun, true);
  assert.throws(() => parseArgs([]));
  assert.throws(() => parseArgs(['--out']));
  assert.throws(() => parseArgs(['--nope']));
});
