// 7개 vpylab-* 프로젝트를 GitHub Pages 단일 repo용으로 빌드하여
// 통합 dist 디렉토리(/tmp/vpylab-textbook-out)에 합친다.
//
// 출력 구조:
//   /tmp/vpylab-textbook-out/
//     index.html             ← 7 코스 허브
//     beg-shapes/            ← 각 코스의 Astro Starlight 빌드 결과
//     beg-patterns/
//     ...
//     pro-toolkit/
//
// basePath = "/vpylab-textbook/<courseId>/"
// 즉 GitHub Pages 도메인은 https://greatsong.github.io/vpylab-textbook/<courseId>/
//
// 실행: node scripts/build_pages_site.mjs
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { cp, mkdir, readFile, rm, writeFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { projectDir } from './project-paths.mjs';

const EDUFLOW_DEPLOY = projectDir('eduflow-deploy');
const { generateStarlightProject } = await import(pathToFileURL(join(EDUFLOW_DEPLOY, 'server/services/starlightGenerator.js')).href);

const PROJECTS_ROOT = join(EDUFLOW_DEPLOY, 'projects');
const CACHE_NM = join(EDUFLOW_DEPLOY, 'server/services/starlight-cache/node_modules');
const OUT_DIR = '/tmp/vpylab-textbook-out';
const REPO_NAME = 'vpylab-textbook';
const BASE_DOMAIN = 'https://greatsong.github.io';

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: 'inherit', ...opts });
    p.on('error', reject);
    p.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`${cmd} exit ${code}`)));
  });
}

function courseIdFromProjectId(pid) {
  return pid.replace(/^vpylab-/, '');
}

async function buildOne(projectId) {
  const t0 = Date.now();
  const projectPath = join(PROJECTS_ROOT, projectId);
  const cfg = JSON.parse(await readFile(join(projectPath, 'config.json'), 'utf-8'));
  const courseId = courseIdFromProjectId(projectId);
  const basePath = `/${REPO_NAME}/${courseId}/`;
  const colorTheme = cfg.deployment?.colorTheme || 'sky';
  const title = cfg.title || projectId;

  console.log(`\n══ ${courseId} (${colorTheme}) basePath=${basePath} ══`);
  const res = await generateStarlightProject({
    projectPath,
    siteName: title,
    creator: cfg.author || '석리송',
    colorTheme,
    basePath,
  });

  // astro.config: site URL 명시 + base 치환
  const cfgPath = join(res.buildDir, 'astro.config.mjs');
  let astroCfg = await readFile(cfgPath, 'utf-8');
  astroCfg = astroCfg.replace(/^\s*site:\s*'__SITE__',?\s*\n/m, `  site: '${BASE_DOMAIN}',\n`);
  astroCfg = astroCfg.replaceAll('__BASE__', basePath);
  await writeFile(cfgPath, astroCfg, 'utf-8');

  const nm = join(res.buildDir, 'node_modules');
  await mkdir(nm, { recursive: true });
  await run('cp', ['-RP', CACHE_NM + '/.', nm + '/']);

  await run('npx', ['astro', 'build'], { cwd: res.buildDir, shell: true });

  const dist = join(res.buildDir, 'dist');
  if (!existsSync(dist)) throw new Error('dist/ 없음');

  const target = join(OUT_DIR, courseId);
  await rm(target, { recursive: true, force: true });
  await cp(dist, target, { recursive: true });
  await rm(res.buildDir, { recursive: true, force: true });

  const dt = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`  ✓ ${dt}s → ${target}`);
  return { courseId, projectId, title, colorTheme, seconds: parseFloat(dt) };
}

// ── 허브 페이지 생성 ────────────────────────────────────
function hubHtml(courses) {
  // 색 매핑(Starlight 팔레트) — 단색+보더 미니멀
  const ACCENT = {
    sky: '#0EA5E9', emerald: '#10B981', amber: '#F59E0B',
    indigo: '#4F46E5', rose: '#E11D48', teal: '#0D9488',
    slate: '#64748B', blue: '#2563EB',
  };
  const ICON = {
    'beg-shapes': '🟦', 'beg-patterns': '🔁', 'beg-melody': '🎵',
    'fus-math-functions': '📈', 'fus-sci-newton': '🪐',
    'fus-art-generative': '🎨', 'pro-toolkit': '🧰',
  };
  const TRACK = {
    'beg-shapes': '입문', 'beg-patterns': '입문', 'beg-melody': '입문',
    'fus-math-functions': '융합', 'fus-sci-newton': '융합',
    'fus-art-generative': '융합', 'pro-toolkit': '튜토리얼',
  };

  const cards = courses.map((c) => {
    const accent = ACCENT[c.colorTheme] || '#0EA5E9';
    const icon = ICON[c.courseId] || '📘';
    const track = TRACK[c.courseId] || '코스';
    return `
    <a class="card" href="./${c.courseId}/" style="--accent: ${accent}">
      <div class="icon">${icon}</div>
      <div class="meta">${track}</div>
      <h2>${c.title}</h2>
    </a>`;
  }).join('\n');

  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>VPyLab 교재 — 7개 코스</title>
<style>
  *{box-sizing:border-box}
  body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#fafafa;color:#1e293b;}
  header{padding:48px 24px 8px;max-width:960px;margin:0 auto;}
  header h1{font-size:28px;margin:0 0 8px;}
  header p{margin:0;color:#64748b;font-size:14px;line-height:1.6;}
  main{max-width:960px;margin:0 auto;padding:24px;}
  .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px;}
  .card{display:block;text-decoration:none;color:inherit;background:#fff;border:2px solid var(--accent);border-radius:12px;padding:20px;transition:transform .15s ease;}
  .card:hover{transform:translateY(-2px);}
  .icon{font-size:32px;line-height:1;margin-bottom:8px;}
  .meta{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--accent);}
  .card h2{font-size:16px;margin:4px 0 0;}
  footer{max-width:960px;margin:32px auto 64px;padding:0 24px;color:#94a3b8;font-size:12px;}
  footer a{color:#64748b;}
</style>
</head>
<body>
<header>
  <h1>VPyLab 교재</h1>
  <p>VPyLab 학습 코스의 교사용 이론 교재 7권. 각 코스는 VPyLab 실습과 한 짝으로 운영됩니다.</p>
</header>
<main>
  <div class="grid">
    ${cards}
  </div>
</main>
<footer>
  <p>제작: 석리송 · 실습 환경 <a href="https://vpylab.pages.dev/">VPyLab</a></p>
</footer>
</body>
</html>`;
}

// ── 메인 ────────────────────────────────────────────────
const allDirs = (await readdir(PROJECTS_ROOT, { withFileTypes: true }))
  .filter((d) => d.isDirectory() && d.name.startsWith('vpylab-'))
  .map((d) => d.name)
  .sort();

await rm(OUT_DIR, { recursive: true, force: true });
await mkdir(OUT_DIR, { recursive: true });

console.log(`총 ${allDirs.length}개 코스 빌드 → ${OUT_DIR}`);
const results = [];
const failures = [];
for (const id of allDirs) {
  try {
    results.push(await buildOne(id));
  } catch (e) {
    console.error(`✗ ${id}: ${e.message}`);
    failures.push({ id, error: e.message });
  }
}

// 트랙 순서로 정렬 (입문 → 융합 → 튜토리얼)
const TRACK_ORDER = ['beg-shapes', 'beg-patterns', 'beg-melody',
  'fus-math-functions', 'fus-sci-newton', 'fus-art-generative', 'pro-toolkit'];
results.sort((a, b) => TRACK_ORDER.indexOf(a.courseId) - TRACK_ORDER.indexOf(b.courseId));

await writeFile(join(OUT_DIR, 'index.html'), hubHtml(results), 'utf-8');
await writeFile(join(OUT_DIR, '.nojekyll'), '', 'utf-8');

console.log('\n══════ 요약 ══════');
for (const r of results) console.log(`  ✓ ${r.courseId} ${r.seconds}s`);
for (const f of failures) console.log(`  ✗ ${f.id} — ${f.error}`);
console.log(`\n허브: ${OUT_DIR}/index.html`);
console.log(`각 코스: ${OUT_DIR}/<courseId>/`);
process.exit(failures.length > 0 ? 1 : 0);
