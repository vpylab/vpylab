#!/usr/bin/env node
/**
 * 갤러리 목록 만들기 실행 파일.
 *
 *   node scripts/gallery/build-index.mjs --approvals <approvals.txt> --out <폴더> [--previous <폴더>] [--dry-run]
 *
 * <폴더>에 gallery.json(앱이 읽는 공개 목록), pending.json과 PENDING.md(승인 대기 목록)를 씁니다.
 * --previous 폴더에 앞서 만든 gallery.json·pending.json이 있으면 바뀐 저장소의 미리보기 그림만 다시 확인합니다.
 * --dry-run은 파일을 쓰지 않고 결과 요약만 출력합니다.
 * 환경 변수 GITHUB_TOKEN이 있으면 GitHub 요청에 사용합니다(읽기만 합니다). 토큰은 출력하지 않습니다.
 * GitHub 검색이 실패하면 아무 파일도 쓰지 않고 1로 끝납니다. 앞서 만든 목록이 그대로 남습니다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildIndex, findThumbnail, parseApprovals, renderPendingMarkdown, searchGalleryRepos } from './gallery-index.mjs';

export function parseArgs(argv) {
  const options = { approvals: '', out: '', previous: '', dryRun: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--approvals' || arg === '--out' || arg === '--previous') {
      const value = argv[i + 1];
      if (!value || value.startsWith('--')) throw new Error(`${arg} 뒤에 경로가 필요합니다.`);
      options[arg.slice(2)] = value;
      i += 1;
    } else {
      throw new Error(`알 수 없는 옵션입니다: ${arg}`);
    }
  }
  if (!options.dryRun && !options.out) throw new Error('--out <폴더>가 필요합니다(또는 --dry-run).');
  return options;
}

function readText(file) {
  try { return fs.readFileSync(file, 'utf8'); } catch { return null; }
}

function readJson(file) {
  const text = readText(file);
  if (text === null) return null;
  try { return JSON.parse(text); } catch { return null; }
}

export async function main(argv, { env = process.env, fetchImpl = globalThis.fetch, io = console, now = () => new Date() } = {}) {
  let options;
  try { options = parseArgs(argv); } catch (error) { io.error(error.message); return 2; }

  const approvalsText = options.approvals ? readText(options.approvals) : null;
  if (options.approvals && approvalsText === null) io.error(`승인 파일을 읽지 못했습니다(${options.approvals}). 모든 작품을 승인 대기로 둡니다.`);
  const approvals = parseApprovals(approvalsText ?? '');
  const token = String(env.GITHUB_TOKEN || '').trim();
  const previous = options.previous ? readJson(path.join(options.previous, 'gallery.json')) : null;
  const previousPending = options.previous ? readJson(path.join(options.previous, 'pending.json')) : null;

  let result;
  try {
    const repos = await searchGalleryRepos({ fetchImpl, token });
    result = await buildIndex({
      repos, approvals, previous, previousPending, now,
      checkThumbnail: (entry, branch) => findThumbnail({ fetchImpl, token, entry, branch }),
    });
  } catch (error) {
    io.error(`목록을 만들지 못했습니다: ${error.message}`);
    return 1;
  }

  const { stats, warnings } = result;
  io.log(`검색 ${stats.found}건 · 공개 목록 ${stats.approved}건 · 승인 대기 ${stats.pending}건 · 차단 ${stats.blocked}건 · 제외 ${stats.skipped}건`);
  for (const warning of warnings) io.error(`승인 파일 ${warning.line}번째 줄을 읽지 못했습니다: ${warning.text}`);

  const pendingMarkdown = renderPendingMarkdown(result.pending, warnings);
  if (options.dryRun) {
    io.log(JSON.stringify({ gallery: result.gallery, pending: result.pending }, null, 2));
    return 0;
  }
  fs.mkdirSync(options.out, { recursive: true });
  fs.writeFileSync(path.join(options.out, 'gallery.json'), `${JSON.stringify(result.gallery, null, 2)}\n`);
  fs.writeFileSync(path.join(options.out, 'pending.json'), `${JSON.stringify(result.pending, null, 2)}\n`);
  fs.writeFileSync(path.join(options.out, 'PENDING.md'), pendingMarkdown);
  if (env.GITHUB_STEP_SUMMARY) {
    try { fs.appendFileSync(env.GITHUB_STEP_SUMMARY, `${pendingMarkdown}\n`); } catch { /* 요약을 쓰지 못해도 목록은 만들어졌습니다. */ }
  }
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(fs.realpathSync(process.argv[1])).href) {
  process.exitCode = await main(process.argv.slice(2));
}
