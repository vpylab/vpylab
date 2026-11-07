/**
 * Cloudflare Pages 설정 만들기: vercel.json의 헤더·리디렉션을 Cloudflare 형식(_headers, _redirects)으로 바꿉니다.
 * 헤더 규칙은 vercel.json 한 곳에서만 고칩니다(코드 하나, 배포 둘).
 *
 * 사용: node scripts/cloudflare-pages.mjs <출력 폴더> [--edition open|classroom]
 *
 * 바꾸는 규칙
 *   - Vercel 경로 '/assets/(.*)' → Cloudflare '/assets/*'
 *   - 부정 전방탐색이 든 전체 규칙 '/((?!assets/|…).*)' → '/*' (가장 먼저 씀)
 *   - Cloudflare는 겹치는 규칙의 헤더를 합칩니다. 그래서 구체적인 규칙은 전체 규칙의 헤더를 '! 이름'으로 떼어 낸 뒤 자기 값을 씁니다.
 *   - 오픈소스 판(open)은 CSP에서 Supabase·Railway 주소를 뺍니다. 운영 서버와 DB에 연결하지 않기 때문입니다.
 *   - SPA 대체(index.html)는 Cloudflare가 404.html이 없을 때 자동으로 하므로 rewrite는 옮기지 않습니다.
 *   - Cloudflare는 '/x.html'을 '/x'로 넘기고 '/x'에서 그 파일을 줍니다(깔끔한 주소). 그래서
 *     '.html' 경로의 헤더는 확장자 없는 경로에도 걸고, '/x → /x.html' 리디렉션은 옮기지 않습니다(서로 넘기는 무한 반복이 됨).
 *     공유·갤러리 미리보기 카드 함수(/s/:id, /gallery/:id → /api/og)는 Vercel 함수라 옮기지 않습니다.
 *   - Vercel은 SPA rewrite에서 빼 둔 폴더(assets/, pyodide/ 등)의 없는 파일에 404를 줍니다. Cloudflare는 그런 요청에도
 *     index.html을 200으로 주고, 그 폴더의 1년 캐시 헤더까지 붙습니다. 그래서 그 폴더마다 404.html을 넣어
 *     가장 가까운 404.html이 404로 나가게 합니다. 맨 위 404.html은 만들지 않으므로 SPA 대체는 그대로입니다.
 */
import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const MAX_RULES = 100; // Cloudflare _headers 규칙 수 한도
const MAX_LINE = 2000; // 한 줄 길이 한도

export function toCloudflarePath(source) {
  if (source.includes('(?!')) return '/*';
  if (!/[()[\]?+|\\]/.test(source.replace('(.*)', ''))) return source.replace('(.*)', '*');
  throw new Error(`Cloudflare 경로로 바꿀 수 없는 규칙입니다: ${source}`);
}

const SERVER_HOST = /^(https:\/\/\*\.supabase\.co|wss:\/\/\*\.supabase\.co|https:\/\/[^ ]*railway\.app)$/;

/** 오픈소스 판 CSP: connect-src 등에서 운영 서버·DB 주소를 뺍니다. */
export function openEditionCsp(value) {
  return value.split(';').map((directive) => {
    const parts = directive.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '';
    return parts.filter((token, i) => i === 0 || !SERVER_HOST.test(token)).join(' ');
  }).filter(Boolean).join('; ');
}

export function buildCloudflareConfig(vercel, { edition = 'classroom' } = {}) {
  const rules = (vercel.headers || []).flatMap((rule) => {
    const path = toCloudflarePath(rule.source);
    const pretty = path.endsWith('.html') && path !== '/index.html' ? [{ path: path.slice(0, -'.html'.length), headers: rule.headers }] : [];
    return [{ path, headers: rule.headers }, ...pretty];
  });
  const catchAll = rules.filter((r) => r.path === '/*');
  if (catchAll.length > 1) throw new Error('전체 경로 규칙이 둘 이상입니다.');
  const ordered = [...catchAll, ...rules.filter((r) => r.path !== '/*')];
  const globalKeys = new Set((catchAll[0]?.headers || []).map((h) => h.key.toLowerCase()));

  const lines = [];
  for (const rule of ordered) {
    lines.push(rule.path);
    if (rule.path !== '/*') {
      for (const key of globalKeys) {
        const original = catchAll[0].headers.find((h) => h.key.toLowerCase() === key).key;
        lines.push(`  ! ${original}`);
      }
    }
    for (const { key, value } of rule.headers) {
      const v = edition === 'open' && key.toLowerCase() === 'content-security-policy' ? openEditionCsp(value) : value;
      lines.push(`  ${key}: ${v}`);
    }
  }
  if (ordered.length > MAX_RULES) throw new Error(`_headers 규칙이 ${MAX_RULES}개를 넘습니다.`);
  const tooLong = lines.find((l) => l.length > MAX_LINE);
  if (tooLong) throw new Error(`_headers 한 줄이 ${MAX_LINE}자를 넘습니다: ${tooLong.slice(0, 60)}…`);

  const redirects = (vercel.redirects || []).filter((r) => r.destination !== `${r.source}.html`).map((r) => {
    if (/[():*]/.test(r.source)) throw new Error(`Cloudflare 리디렉션으로 바꿀 수 없습니다: ${r.source}`);
    return `${r.source} ${r.destination} ${r.permanent ? 301 : 302}`;
  });

  return { headers: `${lines.join('\n')}\n`, redirects: `${redirects.join('\n')}\n` };
}

/** SPA rewrite에서 뺀 폴더 이름들(예: assets, pyodide). 이 폴더의 없는 파일은 index.html이 아니라 404여야 합니다. */
export function spaExcludedDirs(vercel) {
  const spa = (vercel.rewrites || []).find((r) => r.destination === '/index.html' && r.source.includes('(?!'));
  if (!spa) return [];
  const inner = spa.source.match(/\(\?!([^)]*)\)/)?.[1] || '';
  return inner.split('|').filter((part) => /^[\w-]+\/$/.test(part)).map((part) => part.slice(0, -1));
}

export const NOT_FOUND_HTML = '<!doctype html><meta charset="utf-8"><title>404</title><p>파일을 찾을 수 없습니다.</p>\n';

function main() {
  const args = process.argv.slice(2);
  const outDir = resolve(args[0] || 'dist');
  const editionIndex = args.indexOf('--edition');
  const edition = editionIndex >= 0 ? args[editionIndex + 1] : 'classroom';
  const clientRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const vercel = JSON.parse(readFileSync(resolve(clientRoot, '../vercel.json'), 'utf8'));
  if (existsSync(resolve(outDir, '404.html'))) {
    throw new Error('404.html이 있으면 Cloudflare가 SPA 대체를 하지 않습니다.');
  }
  const { headers, redirects } = buildCloudflareConfig(vercel, { edition });
  writeFileSync(resolve(outDir, '_headers'), headers);
  writeFileSync(resolve(outDir, '_redirects'), redirects);
  for (const dir of spaExcludedDirs(vercel)) {
    const target = resolve(outDir, dir);
    if (existsSync(target) && statSync(target).isDirectory()) writeFileSync(resolve(target, '404.html'), NOT_FOUND_HTML);
  }
  console.log(`Cloudflare 설정을 만들었습니다: ${outDir}/_headers, _redirects (판: ${edition})`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
