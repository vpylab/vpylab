import { describe, it, expect, vi } from 'vitest';
import {
  createDriveStorage, classifyError, backoffDelay, retryAfterMs, multipartBody, pickBoundary, normalizeFileName,
  escapeQuery, contentHash, DriveError, uniqueFileName,
} from './drive-storage.js';

function json(status, body, headers = {}) {
  return {
    ok: status >= 200 && status < 300, status,
    headers: { get: (k) => headers[k] ?? null },
    json: async () => body, text: async () => JSON.stringify(body),
  };
}
function text(status, body) {
  return { ok: status >= 200 && status < 300, status, headers: { get: () => null }, json: async () => { throw new Error('not json'); }, text: async () => body };
}

/** 요청 순서대로 응답을 돌려주는 가짜 fetch */
function scripted(responses) {
  const calls = [];
  const fetchImpl = vi.fn(async (url, init = {}) => {
    calls.push({ url: String(url), init });
    const next = responses.shift();
    if (!next) throw new Error(`예상하지 못한 요청: ${url}`);
    return typeof next === 'function' ? next(url, init) : next;
  });
  return { fetchImpl, calls };
}

const base = (fetchImpl, extra = {}) => createDriveStorage({
  getToken: () => 'tok', fetchImpl, sleep: async () => {}, random: () => 0, ...extra,
});
const q = (call) => new URL(call.url).searchParams.get('q');

describe('classifyError', () => {
  it('구글 오류를 화면용 이유로 나눈다', () => {
    expect(classifyError(401, {})).toBe('auth');
    expect(classifyError(429, {})).toBe('rate');
    expect(classifyError(403, { error: { errors: [{ reason: 'userRateLimitExceeded' }] } })).toBe('rate');
    expect(classifyError(403, { error: { errors: [{ reason: 'insufficientPermissions' }] } })).toBe('scope');
    expect(classifyError(403, { error: { errors: [{ reason: 'domainPolicy' }] } })).toBe('policy');
    expect(classifyError(403, { error: { errors: [{ reason: 'storageQuotaExceeded' }] } })).toBe('storageFull');
    expect(classifyError(403, { error: { errors: [{ reason: 'somethingElse' }] } })).toBe('forbidden');
    expect(classifyError(404, {})).toBe('notFound');
    expect(classifyError(503, {})).toBe('server');
  });
});

describe('보조 함수', () => {
  it('백오프는 2^n초에 무작위 1초 이내를 더하고 상한을 지킨다', () => {
    expect(backoffDelay(0, () => 0)).toBe(1000);
    expect(backoffDelay(3, () => 0.5)).toBe(8500);
    expect(backoffDelay(10, () => 0)).toBe(32_000);
  });
  it('Retry-After는 초와 날짜를 모두 읽고 60초로 자른다', () => {
    expect(retryAfterMs('3')).toBe(3000);
    expect(retryAfterMs('999')).toBe(60_000);
    expect(retryAfterMs(new Date(10_000).toUTCString(), 5_000)).toBe(5000);
    expect(retryAfterMs('soon')).toBeNull();
    expect(retryAfterMs(null)).toBeNull();
  });
  it('검색어의 따옴표와 역슬래시를 이스케이프한다', () => {
    expect(escapeQuery("a'b\\c")).toBe("a\\'b\\\\c");
  });
  it('multipart 본문에 메타데이터와 코드를 담는다', () => {
    const body = multipartBody({ name: 'a.py' }, 'print(1)', 'B');
    expect(body).toContain('--B\r\nContent-Type: application/json');
    expect(body).toContain('{"name":"a.py"}');
    expect(body).toContain('print(1)\r\n--B--');
  });
  it('코드에 들어 있는 문자열은 경계로 쓰지 않는다', () => {
    const first = pickBoundary('', () => 0);
    const second = pickBoundary(`x ${first} y`, () => 0);
    expect(second).not.toBe(first);
  });
  it('파일 이름의 경로 문자와 제어 문자를 지우고 .py를 붙인다', () => {
    expect(normalizeFileName('a/b\\c')).toBe('a b c.py');
    expect(normalizeFileName('공.PY')).toBe('공.PY');
    expect(normalizeFileName('  ')).toBe('이름 없음.py');
    expect(normalizeFileName('x'.repeat(300))).toHaveLength(123);
  });
  it('같은 이름이 있으면 번호를 붙인다(대소문자 무시)', () => {
    expect(uniqueFileName('첫 실험', ['다른.py'])).toBe('첫 실험.py');
    expect(uniqueFileName('첫 실험', ['첫 실험.py'])).toBe('첫 실험 (2).py');
    expect(uniqueFileName('첫 실험.py', ['첫 실험.py', '첫 실험 (2).py'])).toBe('첫 실험 (3).py');
    expect(uniqueFileName('Ball', ['ball.py'])).toBe('Ball (2).py');
  });

  it('같은 내용은 같은 해시를 낸다', async () => {
    expect(await contentHash('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
});

describe('폴더와 목록', () => {
  it('표식으로 폴더를 찾고, 없으면 표식을 달아 만든다', async () => {
    const { fetchImpl, calls } = scripted([
      json(200, { files: [] }), json(200, { id: 'F1' }), json(200, { files: [{ id: 'F1' }] }), json(200, { files: [{ id: 'a' }] }),
    ]);
    const drive = base(fetchImpl);
    expect(await drive.list()).toEqual({ files: [{ id: 'a' }], truncated: false });
    expect(q(calls[0])).toContain("appProperties has { key='vpylabRoot' and value='1' }");
    expect(q(calls[0])).not.toContain("'root' in parents");
    expect(JSON.parse(calls[1].init.body)).toEqual({ name: 'VPyLab', mimeType: 'application/vnd.google-apps.folder', appProperties: { vpylabRoot: '1' } });
    expect(q(calls[3])).toContain("'F1' in parents");
    expect(calls[0].init.headers.Authorization).toBe('Bearer tok');
  });

  it('두 기기가 동시에 폴더를 만들었으면 먼저 만든 폴더로 맞추고 내 빈 폴더는 휴지통으로 옮긴다', async () => {
    const { fetchImpl, calls } = scripted([
      json(200, { files: [] }), json(200, { id: 'mine' }), json(200, { files: [{ id: 'early' }, { id: 'mine' }] }), json(200, { id: 'mine', trashed: true }),
    ]);
    expect(await base(fetchImpl).ensureFolder()).toBe('early');
    expect(calls[3].url).toContain('/files/mine');
    expect(JSON.parse(calls[3].init.body)).toEqual({ trashed: true });
  });

  it('폴더 확인을 동시에 여러 번 불러도 한 번만 만든다', async () => {
    const { fetchImpl, calls } = scripted([json(200, { files: [] }), json(200, { id: 'F1' }), json(200, { files: [{ id: 'F1' }] })]);
    const drive = base(fetchImpl);
    const [a, b] = await Promise.all([drive.ensureFolder(), drive.ensureFolder()]);
    expect(a).toBe('F1');
    expect(b).toBe('F1');
    expect(calls).toHaveLength(3);
  });

  it('폴더 확인이 실패하면 다음에 다시 시도한다', async () => {
    const { fetchImpl } = scripted([json(404, {}), json(200, { files: [{ id: 'F2' }] })]);
    const drive = base(fetchImpl);
    await expect(drive.ensureFolder()).rejects.toMatchObject({ reason: 'notFound' });
    expect(await drive.ensureFolder()).toBe('F2');
  });

  it('표식 폴더가 휴지통에만 있으면 새 폴더를 만들지 않고 folderTrashed로 멈춘다', async () => {
    const { fetchImpl, calls } = scripted([json(200, { files: [{ id: 'old', mimeType: 'application/vnd.google-apps.folder', trashed: true }] })]);
    await expect(base(fetchImpl).list()).rejects.toMatchObject({ reason: 'folderTrashed', detail: { folderId: 'old' } });
    expect(calls.some((c) => c.init.method === 'POST')).toBe(false);
  });

  it('기억해 둔 폴더가 그사이 휴지통으로 가면 목록과 새 파일 만들기를 멈춘다', async () => {
    const { fetchImpl, calls } = scripted([
      json(200, { files: [{ id: 'root', mimeType: 'application/vnd.google-apps.folder' }] }),
      json(200, { files: [] }),
      json(200, { id: 'root', trashed: true }),
      json(200, { files: [{ id: 'root', mimeType: 'application/vnd.google-apps.folder', trashed: true }] }),
    ]);
    const drive = base(fetchImpl);
    await drive.list();
    await expect(drive.create({ name: 'a', code: 'x' })).rejects.toMatchObject({ reason: 'folderTrashed' });
    await expect(drive.list()).rejects.toMatchObject({ reason: 'folderTrashed' });
    expect(calls.some((c) => c.url.includes('/upload/'))).toBe(false);
  });

  it('되살리기는 휴지통의 표식 폴더를 꺼내고 다음 목록에서 그 폴더를 쓴다', async () => {
    const { fetchImpl, calls } = scripted([
      json(200, { files: [{ id: 'root', mimeType: 'application/vnd.google-apps.folder', trashed: true }] }),
      json(200, { id: 'root', trashed: false }),
      json(200, { files: [{ id: 'root', mimeType: 'application/vnd.google-apps.folder' }] }),
      json(200, { files: [{ id: 'f1' }] }),
    ]);
    const drive = base(fetchImpl);
    expect(await drive.restoreFolder()).toBe('root');
    expect(JSON.parse(calls[1].init.body)).toEqual({ trashed: false });
    expect((await drive.list()).files).toHaveLength(1);
  });

  it('기억해 둔 폴더를 찾을 수 없으면(다른 계정 등) 이 계정의 폴더를 다시 찾는다', async () => {
    const { fetchImpl } = scripted([
      json(200, { files: [{ id: 'a-root', mimeType: 'application/vnd.google-apps.folder' }] }),
      json(200, { files: [] }),
      json(404, {}),
      json(200, { files: [{ id: 'b-root', mimeType: 'application/vnd.google-apps.folder' }] }),
      json(200, { files: [{ id: 'b1' }] }),
    ]);
    const drive = base(fetchImpl);
    await drive.list();
    expect((await drive.list()).files).toEqual([{ id: 'b1' }]);
  });

  it('목록은 다음 페이지 토큰을 따라 끝까지 읽는다', async () => {
    const { fetchImpl, calls } = scripted([
      json(200, { files: [{ id: 'F' }] }),
      json(200, { files: [{ id: '1' }], nextPageToken: 'p2' }),
      json(200, { files: [{ id: '2' }] }),
    ]);
    const result = await base(fetchImpl).list();
    expect(result.files.map((f) => f.id)).toEqual(['1', '2']);
    expect(result.truncated).toBe(false);
    expect(new URL(calls[2].url).searchParams.get('pageToken')).toBe('p2');
  });

  it('1,000개(10쪽)를 넘으면 truncated로 알린다', async () => {
    const pages = Array.from({ length: 10 }, (_, i) => json(200, { files: [{ id: String(i) }], nextPageToken: `p${i + 1}` }));
    const { fetchImpl } = scripted([json(200, { files: [{ id: 'F' }] }), ...pages]);
    const result = await base(fetchImpl).list();
    expect(result.files).toHaveLength(10);
    expect(result.truncated).toBe(true);
  });

  it('버전 기록도 페이지를 따라 읽는다', async () => {
    const { fetchImpl } = scripted([json(200, { revisions: [{ id: 'r1' }], nextPageToken: 't' }), json(200, { revisions: [{ id: 'r2' }] })]);
    expect((await base(fetchImpl).revisions('x')).map((r) => r.id)).toEqual(['r1', 'r2']);
  });
});

describe('만들기와 열기', () => {
  it('새 파일은 폴더 안에 .py로 만들고 해시와 만들기 표식을 기록한다', async () => {
    const { fetchImpl, calls } = scripted([json(200, { files: [{ id: 'F1' }] }), json(200, { id: 'n1', version: '1' })]);
    const meta = await base(fetchImpl).create({ name: '공', code: 'print(1)', deviceId: '기기-a' });
    expect(meta.id).toBe('n1');
    expect(calls[1].url).toContain('/upload/drive/v3/files?uploadType=multipart');
    expect(calls[1].init.body).toContain('"name":"공.py"');
    expect(calls[1].init.body).toContain('"parents":["F1"]');
    expect(calls[1].init.body).toContain('"vpylabDevice":"기기-a"');
    expect(calls[1].init.body).toMatch(/"vpylabCreateId":"[^"]+"/);
  });

  it('만들기가 5xx로 실패했지만 실제로 만들어졌으면 다시 보내지 않고 그 파일을 돌려준다', async () => {
    const { fetchImpl, calls } = scripted([
      json(200, { files: [{ id: 'F1' }] }), json(503, {}), json(200, { files: [{ id: 'made', version: '1' }] }),
    ]);
    const meta = await base(fetchImpl).create({ name: 'a', code: 'x' });
    expect(meta.id).toBe('made');
    expect(calls.filter((c) => c.init.method === 'POST')).toHaveLength(1);
    expect(q(calls[2])).toMatch(/key='vpylabCreateId' and value='[^']+'/);
  });

  it('만들기가 5xx로 실패하고 만들어지지 않았으면 한 번 더 보낸다', async () => {
    const { fetchImpl, calls } = scripted([
      json(200, { files: [{ id: 'F1' }] }), json(503, {}), json(200, { files: [] }), json(200, { id: 'n2', version: '1' }),
    ]);
    expect((await base(fetchImpl).create({ name: 'a', code: 'x' })).id).toBe('n2');
    expect(calls.filter((c) => c.init.method === 'POST')).toHaveLength(2);
  });

  it('열 때는 메타데이터를 먼저 읽고, 그 버전(headRevisionId)의 내용을 받는다', async () => {
    const { fetchImpl, calls } = scripted([json(200, { id: 'x', version: '3', headRevisionId: 'h3' }), text(200, 'code at h3')]);
    const result = await base(fetchImpl).open('x');
    expect(result.code).toBe('code at h3');
    expect(calls[0].url).toContain('fields=');
    expect(calls[1].url).toContain('/files/x/revisions/h3?alt=media');
  });

  it('버전 내용을 받지 못하면 현재 내용으로 대신한다', async () => {
    const { fetchImpl, calls } = scripted([json(200, { id: 'x', version: '3', headRevisionId: 'h3' }), json(404, {}), text(200, 'current')]);
    expect((await base(fetchImpl).open('x')).code).toBe('current');
    expect(calls[2].url).toContain('/files/x?alt=media');
  });
});

describe('저장', () => {
  it('기준 버전이 같으면 저장하고 덮어쓰기가 없었음을 확인한다', async () => {
    const { fetchImpl, calls } = scripted([
      json(200, { id: 'x', version: '5', headRevisionId: 'h5', appProperties: {} }),
      json(200, { id: 'x', version: '6', headRevisionId: 'h6' }),
      json(200, { revisions: [{ id: 'h4' }, { id: 'h5' }, { id: 'h6' }] }),
    ]);
    const result = await base(fetchImpl).save({ id: 'x', code: 'new', baseVersion: '5', deviceId: 'd' });
    expect(result).toMatchObject({ status: 'saved', verified: true, overwritten: null, meta: { version: '6' } });
    expect(calls[1].init.method).toBe('PATCH');
  });

  it('확인과 쓰기 사이에 다른 기기가 저장했으면 overwritten으로 알린다', async () => {
    const { fetchImpl } = scripted([
      json(200, { id: 'x', version: '5', headRevisionId: 'h5', appProperties: {} }),
      json(200, { id: 'x', version: '7', headRevisionId: 'h7' }),
      json(200, { revisions: [{ id: 'h5' }, { id: 'h6' }, { id: 'h7' }] }),
    ]);
    const result = await base(fetchImpl).save({ id: 'x', code: 'new', baseVersion: '5' });
    expect(result.overwritten).toEqual({ revisionId: 'h6' });
  });

  it('덮어쓰기 확인이 실패해도 저장 자체는 성공으로 둔다', async () => {
    const { fetchImpl } = scripted([
      json(200, { id: 'x', version: '5', headRevisionId: 'h5' }),
      json(200, { id: 'x', version: '6', headRevisionId: 'h6' }),
      json(404, {}),
    ]);
    const result = await base(fetchImpl).save({ id: 'x', code: 'new', baseVersion: '5' });
    expect(result).toMatchObject({ status: 'saved', verified: false });
  });

  it('기준 버전이 다르고 내용도 바뀌었으면 저장하지 않고 드라이브 내용을 돌려준다', async () => {
    const { fetchImpl, calls } = scripted([
      json(200, { id: 'x', version: '7', appProperties: { vpylabHash: 'other' } }),
      text(200, 'remote code'),
    ]);
    const result = await base(fetchImpl).save({ id: 'x', code: 'mine', baseVersion: '5', baseCode: 'base' });
    expect(result.status).toBe('conflict');
    expect(result.remote.code).toBe('remote code');
    expect(calls.some((c) => c.init.method === 'PATCH')).toBe(false);
  });

  it('버전이 달라도 드라이브 내용이 내 코드와 같으면 unchanged (해시 표식은 믿지 않고 내용을 비교)', async () => {
    const { fetchImpl } = scripted([json(200, { id: 'x', version: '9', appProperties: { vpylabHash: 'stale' } }), text(200, 'same')]);
    const result = await base(fetchImpl).save({ id: 'x', code: 'same', baseVersion: '5', baseCode: 'base' });
    expect(result.status).toBe('unchanged');
  });

  it('해시 표식이 같아도 실제 내용이 다르면 충돌로 본다', async () => {
    const hash = await contentHash('mine');
    const { fetchImpl } = scripted([json(200, { id: 'x', version: '9', appProperties: { vpylabHash: hash } }), text(200, 'replaced on web')]);
    const result = await base(fetchImpl).save({ id: 'x', code: 'mine', baseVersion: '5', baseCode: 'base' });
    expect(result.status).toBe('conflict');
  });

  it('이름 변경처럼 내용은 그대로이고 버전만 올랐으면 충돌 없이 저장한다', async () => {
    const { fetchImpl, calls } = scripted([
      json(200, { id: 'x', version: '6', headRevisionId: 'h5' }),
      text(200, 'base'),
      json(200, { id: 'x', version: '7', headRevisionId: 'h7' }),
      json(200, { revisions: [{ id: 'h5' }, { id: 'h7' }] }),
    ]);
    const result = await base(fetchImpl).save({ id: 'x', code: 'mine', baseVersion: '5', baseCode: 'base' });
    expect(result).toMatchObject({ status: 'saved', overwritten: null });
    expect(calls[2].init.method).toBe('PATCH');
  });

  it('시간 초과로 결과를 몰랐던 내 지난 저장이 반영돼 있으면 충돌 없이 저장한다', async () => {
    const { fetchImpl, calls } = scripted([
      json(200, { id: 'x', version: '6', headRevisionId: 'h6' }),
      text(200, 'my timed-out attempt'),
      json(200, { id: 'x', version: '7', headRevisionId: 'h7' }),
      json(200, { revisions: [{ id: 'h6' }, { id: 'h7' }] }),
    ]);
    const result = await base(fetchImpl).save({ id: 'x', code: 'kept editing', baseVersion: '5', baseCode: 'base', attemptedCodes: ['my timed-out attempt'] });
    expect(result.status).toBe('saved');
    expect(calls[2].init.method).toBe('PATCH');
  });

  it('쓰기가 5xx로 실패했지만 실제로 반영됐으면 다시 보내지 않는다', async () => {
    const hash = await contentHash('new');
    const { fetchImpl, calls } = scripted([
      json(200, { id: 'x', version: '5', headRevisionId: 'h5' }),
      json(503, {}),
      json(200, { id: 'x', version: '6', headRevisionId: 'h6', appProperties: { vpylabHash: hash } }),
      json(200, { revisions: [{ id: 'h5' }, { id: 'h6' }] }),
    ]);
    const result = await base(fetchImpl).save({ id: 'x', code: 'new', baseVersion: '5', baseCode: 'base' });
    expect(result).toMatchObject({ status: 'saved', overwritten: null, meta: { headRevisionId: 'h6' } });
    expect(calls.filter((c) => c.init.method === 'PATCH')).toHaveLength(1);
  });

  it('쓰기가 5xx로 실패하고 반영되지 않았으면 한 번 더 보낸다', async () => {
    const { fetchImpl, calls } = scripted([
      json(200, { id: 'x', version: '5', headRevisionId: 'h5' }),
      json(503, {}),
      json(200, { id: 'x', version: '5', headRevisionId: 'h5' }),
      json(200, { id: 'x', version: '6', headRevisionId: 'h6' }),
      json(200, { revisions: [{ id: 'h5' }, { id: 'h6' }] }),
    ]);
    const result = await base(fetchImpl).save({ id: 'x', code: 'new', baseVersion: '5', baseCode: 'base' });
    expect(result.status).toBe('saved');
    expect(calls.filter((c) => c.init.method === 'PATCH')).toHaveLength(2);
  });

  it('쓰기가 401이면 다시 보내지 않고 auth 오류를 낸다', async () => {
    const { fetchImpl, calls } = scripted([json(200, { id: 'x', version: '5', headRevisionId: 'h5' }), json(401, {})]);
    await expect(base(fetchImpl).save({ id: 'x', code: 'new', baseVersion: '5' })).rejects.toMatchObject({ reason: 'auth' });
    expect(calls.filter((c) => c.init.method === 'PATCH')).toHaveLength(1);
  });

  it('기준 내용을 모르면(초안 복원 등) 버전이 다를 때 항상 충돌로 본다', async () => {
    const { fetchImpl } = scripted([json(200, { id: 'x', version: '6' }), text(200, 'base')]);
    const result = await base(fetchImpl).save({ id: 'x', code: 'mine', baseVersion: '5' });
    expect(result.status).toBe('conflict');
  });

  it('force이면 버전이 달라도 덮어쓴다', async () => {
    const { fetchImpl, calls } = scripted([
      json(200, { id: 'x', version: '8', headRevisionId: 'h8' }),
      json(200, { id: 'x', version: '9', headRevisionId: 'h9' }),
      json(200, { revisions: [{ id: 'h8' }, { id: 'h9' }] }),
    ]);
    const result = await base(fetchImpl).save({ id: 'x', code: 'mine', baseVersion: '5', force: true, expectVersion: '8' });
    expect(result).toMatchObject({ status: 'saved', overwritten: null });
    expect(calls[1].init.method).toBe('PATCH');
  });

  it('덮어쓰기에 본 버전을 넘기지 않으면 요청을 보내지 않는다', async () => {
    const fetchImpl = vi.fn();
    await expect(base(fetchImpl).save({ id: 'x', code: 'mine', baseVersion: '5', force: true })).rejects.toThrow('expectVersion');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('덮어쓰기는 본 버전(expectVersion)과 다르면 하지 않고 충돌을 돌려준다', async () => {
    const { fetchImpl, calls } = scripted([json(200, { id: 'x', version: '9' }), text(200, 'third device')]);
    const result = await base(fetchImpl).save({ id: 'x', code: 'mine', baseVersion: '5', force: true, expectVersion: '8' });
    expect(result).toMatchObject({ status: 'conflict', remote: { code: 'third device' } });
    expect(calls.some((c) => c.init.method === 'PATCH')).toBe(false);
  });

  it('다시 보내기 전에 다른 기기가 저장했으면 보내지 않고 충돌을 돌려준다', async () => {
    const { fetchImpl, calls } = scripted([
      json(200, { id: 'x', version: '5', headRevisionId: 'h5' }),
      json(503, {}),
      json(200, { id: 'x', version: '6', headRevisionId: 'h6', appProperties: { vpylabHash: 'someone else' } }),
      text(200, 'other device'),
    ]);
    const result = await base(fetchImpl).save({ id: 'x', code: 'new', baseVersion: '5', baseCode: 'base' });
    expect(result).toMatchObject({ status: 'conflict', remote: { code: 'other device' } });
    expect(calls.filter((c) => c.init.method === 'PATCH')).toHaveLength(1);
  });

  it('쓰기 실패 뒤 version 숫자만 오르고 내용(headRevisionId)이 그대로면 충돌로 보지 않고 다시 보낸다', async () => {
    // 드라이브는 저장 몇 초 뒤 내용 변경 없이 version을 올리기도 합니다(실측 2026-11-08).
    const { fetchImpl, calls } = scripted([
      json(200, { id: 'x', version: '5', headRevisionId: 'h5' }),
      () => { throw new TypeError('Failed to fetch'); },
      json(200, { id: 'x', version: '6', headRevisionId: 'h5' }),
      json(200, { id: 'x', version: '7', headRevisionId: 'h7' }),
      json(200, { revisions: [{ id: 'h5' }, { id: 'h7' }] }),
    ]);
    const result = await base(fetchImpl).save({ id: 'x', code: 'new', baseVersion: '5', baseCode: 'base' });
    expect(result).toMatchObject({ status: 'saved', overwritten: null });
    expect(calls.filter((c) => c.init.method === 'PATCH')).toHaveLength(2);
  });

  it('덮어쓰기는 본 뒤 version 숫자만 올랐고 내용 버전(headRevisionId)이 같으면 그대로 덮어쓴다', async () => {
    const { fetchImpl, calls } = scripted([
      json(200, { id: 'x', version: '9', headRevisionId: 'h8' }),
      json(200, { id: 'x', version: '10', headRevisionId: 'h10' }),
      json(200, { revisions: [{ id: 'h8' }, { id: 'h10' }] }),
    ]);
    const result = await base(fetchImpl).save({ id: 'x', code: 'mine', baseVersion: '5', force: true, expectVersion: '8', expectRevisionId: 'h8' });
    expect(result).toMatchObject({ status: 'saved' });
    expect(calls[1].init.method).toBe('PATCH');
  });

  it('덮어쓰기는 본 뒤 내용 버전이 바뀌었으면 하지 않는다', async () => {
    const { fetchImpl, calls } = scripted([json(200, { id: 'x', version: '9', headRevisionId: 'h9' }), text(200, 'third device')]);
    const result = await base(fetchImpl).save({ id: 'x', code: 'mine', baseVersion: '5', force: true, expectVersion: '9', expectRevisionId: 'h8' });
    expect(result.status).toBe('conflict');
    expect(calls.some((c) => c.init.method === 'PATCH')).toBe(false);
  });

  it('휴지통에 있는 파일에는 저장하지 않고 trashed 오류를 낸다', async () => {
    const { fetchImpl, calls } = scripted([json(200, { id: 'x', version: '5', headRevisionId: 'h5', trashed: true })]);
    await expect(base(fetchImpl).save({ id: 'x', code: 'new', baseVersion: '5', baseCode: 'base' })).rejects.toMatchObject({ reason: 'trashed' });
    expect(calls.some((c) => c.init.method === 'PATCH')).toBe(false);
  });

  it('휴지통에 있는 파일은 열지 않는다(오래된 목록)', async () => {
    const { fetchImpl } = scripted([json(200, { id: 'x', version: '5', trashed: true })]);
    await expect(base(fetchImpl).open('x')).rejects.toMatchObject({ reason: 'trashed' });
  });

  it('100KB를 넘는 코드는 보내지 않는다', async () => {
    const fetchImpl = vi.fn();
    await expect(base(fetchImpl).save({ id: 'x', code: 'a'.repeat(100 * 1024 + 1), baseVersion: '1' }))
      .rejects.toBeInstanceOf(DriveError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe('재시도와 실패', () => {
  it('429와 5xx는 백오프 후 다시 시도한다', async () => {
    const sleep = vi.fn(async () => {});
    const { fetchImpl } = scripted([json(429, {}), json(503, {}), json(200, { files: [{ id: 'F' }] })]);
    expect(await base(fetchImpl, { sleep }).ensureFolder()).toBe('F');
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  it('Retry-After가 있으면 그 시간만큼 기다린다', async () => {
    const sleep = vi.fn(async () => {});
    const { fetchImpl } = scripted([json(429, {}, { 'Retry-After': '7' }), json(200, { files: [{ id: 'F' }] })]);
    await base(fetchImpl, { sleep }).ensureFolder();
    expect(sleep).toHaveBeenCalledWith(7000);
  });

  it('재시도 상한을 넘으면 rate 오류를 낸다', async () => {
    const { fetchImpl } = scripted([json(429, {}), json(429, {}), json(429, {})]);
    await expect(base(fetchImpl, { maxRetries: 2 }).ensureFolder()).rejects.toMatchObject({ reason: 'rate' });
  });

  it('401은 다시 시도하지 않고 auth 오류를 낸다', async () => {
    const { fetchImpl, calls } = scripted([json(401, { error: { message: 'Invalid Credentials' } })]);
    await expect(base(fetchImpl).ensureFolder()).rejects.toMatchObject({ reason: 'auth', status: 401 });
    expect(calls).toHaveLength(1);
  });

  it('응답 본문을 읽다가 멈춰도 시간 제한으로 끊는다', async () => {
    const fetchImpl = vi.fn(async (url, init) => ({
      ok: true, status: 200, headers: { get: () => null },
      json: () => new Promise((_, reject) => {
        init.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
      }),
    }));
    await expect(base(fetchImpl, { timeoutMs: 10 }).ensureFolder()).rejects.toMatchObject({ reason: 'timeout' });
  });

  it('응답이 없으면 시간 제한 뒤 timeout 오류를 내고 다시 보내지 않는다', async () => {
    const fetchImpl = vi.fn((url, init) => new Promise((_, reject) => {
      init.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
    }));
    await expect(base(fetchImpl, { timeoutMs: 10 }).ensureFolder()).rejects.toMatchObject({ reason: 'timeout' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('네트워크 오류는 network로 알린다', async () => {
    const fetchImpl = vi.fn(async () => { throw new TypeError('Failed to fetch'); });
    await expect(base(fetchImpl).ensureFolder()).rejects.toMatchObject({ reason: 'network' });
  });

  it('토큰이 없으면 요청을 보내지 않는다', async () => {
    const fetchImpl = vi.fn();
    const drive = createDriveStorage({ getToken: () => { throw new Error('need auth'); }, fetchImpl });
    await expect(drive.ensureFolder()).rejects.toThrow('need auth');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('요청마다 기록을 남긴다', async () => {
    const onRequest = vi.fn();
    const { fetchImpl } = scripted([json(200, { files: [{ id: 'F' }] })]);
    await base(fetchImpl, { onRequest }).ensureFolder();
    expect(onRequest).toHaveBeenCalledWith(expect.objectContaining({ kind: 'file.findMarked', status: 200, attempt: 0 }));
  });
});

describe('작품 영상 이어 올리기', () => {
  const MB = 1024 * 1024;
  const video = (bytes) => new Blob([new Uint8Array(bytes)], { type: 'video/mp4;codecs=avc1' });
  const folders = () => [json(200, { files: [{ id: 'root' }] }), json(200, { files: [{ id: 'videos' }] })];
  const session = () => json(200, {}, { Location: 'https://upload.example/session-1' });
  const resume = (lastByte) => json(308, null, lastByte == null ? {} : { Range: `bytes=0-${lastByte}` });
  const done = () => json(200, { id: 'v1', name: 'a.mp4', webViewLink: 'https://drive.example/v1' });

  it('Range 헤더에서 다음 위치를 읽고, 없으면 기본값을 쓴다', async () => {
    const { nextUploadOffset } = await import('./drive-storage.js');
    expect(nextUploadOffset('bytes=0-2097151', 7)).toBe(2097152);
    expect(nextUploadOffset(null, 7)).toBe(7);
  });

  it('영상 폴더를 찾아 세션을 열고, 2MB 조각으로 나누어 보내며 진행률을 알린다', async () => {
    const { fetchImpl, calls } = scripted([...folders(), session(), resume(2 * MB - 1), resume(4 * MB - 1), done()]);
    const progress = [];
    const file = await base(fetchImpl).uploadVideo({ blob: video(5 * MB), name: 'a/b.mp4', onProgress: (sent, total) => progress.push([sent, total]) });
    expect(file.webViewLink).toBe('https://drive.example/v1');
    expect(q(calls[1])).toContain("'root' in parents");
    expect(q(calls[1])).toContain("key='vpylabVideos'");
    expect(calls[2].url).toContain('uploadType=resumable');
    expect(calls[2].init.headers).toMatchObject({ Authorization: 'Bearer tok', 'X-Upload-Content-Type': 'video/mp4', 'X-Upload-Content-Length': String(5 * MB) });
    expect(JSON.parse(calls[2].init.body)).toMatchObject({ name: 'a_b.mp4', parents: ['videos'], mimeType: 'video/mp4' });
    expect(calls.slice(3).map((c) => c.init.headers['Content-Range'])).toEqual([
      `bytes 0-${2 * MB - 1}/${5 * MB}`, `bytes ${2 * MB}-${4 * MB - 1}/${5 * MB}`, `bytes ${4 * MB}-${5 * MB - 1}/${5 * MB}`,
    ]);
    expect(calls[3].url).toBe('https://upload.example/session-1');
    expect(calls[3].init.headers.Authorization).toBeUndefined();
    expect(calls[3].init.body.size).toBe(2 * MB);
    expect(progress).toEqual([[0, 5 * MB], [2 * MB, 5 * MB], [4 * MB, 5 * MB], [5 * MB, 5 * MB]]);
  });

  it('영상 폴더가 없으면 VPyLab 폴더 안에 만든다', async () => {
    const { fetchImpl, calls } = scripted([json(200, { files: [{ id: 'root' }] }), json(200, { files: [] }), json(200, { id: 'new-videos' }), session(), done()]);
    await base(fetchImpl).uploadVideo({ blob: video(10), name: 'a.mp4' });
    expect(JSON.parse(calls[2].init.body)).toMatchObject({ name: '영상', parents: ['root'], appProperties: { vpylabVideos: '1' } });
    expect(JSON.parse(calls[3].init.body).parents).toEqual(['new-videos']);
  });

  it('조각을 보내다 연결이 끊기면 받은 위치를 물어 그 뒤부터 다시 보낸다', async () => {
    const { fetchImpl, calls } = scripted([
      ...folders(), session(),
      () => { throw new TypeError('Failed to fetch'); }, // 첫 조각 실패
      resume(MB - 1), // 상태 확인: 1MB까지 받음
      resume(3 * MB - 1), done(),
    ]);
    const file = await base(fetchImpl).uploadVideo({ blob: video(4 * MB), name: 'a.mp4' });
    expect(file.id).toBe('v1');
    expect(calls[4].init.headers['Content-Range']).toBe(`bytes */${4 * MB}`);
    expect(calls[5].init.headers['Content-Range']).toBe(`bytes ${MB}-${3 * MB - 1}/${4 * MB}`);
  });

  it('응답만 잃고 실제로는 다 올라간 경우 상태 확인에서 끝낸다', async () => {
    const { fetchImpl, calls } = scripted([...folders(), session(), json(503, {}), done()]);
    expect((await base(fetchImpl).uploadVideo({ blob: video(10), name: 'a.mp4' })).id).toBe('v1');
    expect(calls).toHaveLength(5);
  });

  it('계속 실패하면 정해진 횟수 뒤에 멈추고, 만료된 세션과 큰 영상·빈 영상은 바로 거부한다', async () => {
    const failing = scripted([...folders(), session(), ...Array.from({ length: 6 }, () => () => { throw new TypeError('offline'); })]);
    await expect(base(failing.fetchImpl, { maxRetries: 1 }).uploadVideo({ blob: video(10), name: 'a.mp4' })).rejects.toMatchObject({ reason: 'network' });
    expect(failing.calls).toHaveLength(6); // 조각, 상태 확인, 조각 다시, 그리고 멈춤

    const expired = scripted([...folders(), session(), json(404, {})]);
    await expect(base(expired.fetchImpl).uploadVideo({ blob: video(10), name: 'a.mp4' })).rejects.toMatchObject({ reason: 'uploadExpired' });

    const none = scripted([]);
    await expect(base(none.fetchImpl).uploadVideo({ blob: { size: 31 * MB }, name: 'a.mp4' })).rejects.toMatchObject({ reason: 'videoTooLarge' });
    await expect(base(none.fetchImpl).uploadVideo({ blob: video(0), name: 'a.mp4' })).rejects.toBeInstanceOf(DriveError);
    expect(none.calls).toHaveLength(0);
  });

  it('세션 열기의 권한 오류는 다시 보내지 않고 그대로 알린다', async () => {
    const { fetchImpl, calls } = scripted([...folders(), json(401, { error: { message: 'expired' } })]);
    await expect(base(fetchImpl).uploadVideo({ blob: video(10), name: 'a.mp4' })).rejects.toMatchObject({ reason: 'auth' });
    expect(calls).toHaveLength(3);
  });
});
