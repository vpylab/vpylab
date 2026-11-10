#!/usr/bin/env node
// 학생 코드가 플랫폼 제공 코드에서 얼마나 멀어졌는지 분류하는 오프라인 연구 도구.
// Offline research tool: classifies student code by its distance from the
// starter/example code that VPyLab ships. See scripts/research/README.md.
//
// 이 파일은 앱 코드를 고치지 않고, 네트워크에 접속하지 않으며,
// 코드 본문과 작성자 이름을 출력하지 않습니다.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(HERE, '..', '..');
export const DATA_DIR = path.join(REPO_ROOT, 'client', 'src', 'data');
export const GALLERY_DIR = path.join(REPO_ROOT, 'client', 'public', 'projects', 'glowscript');

// ───────────────────────── 단계 정의 ─────────────────────────

export const STAGES = Object.freeze({
  empty: { rank: 0, ko: '빈 코드', en: 'Empty' },
  short: { rank: 0, ko: '판정 보류(너무 짧음)', en: 'Too short to judge' },
  unchanged: { rank: 1, ko: '그대로 실행', en: 'Run as provided' },
  tweak: { rank: 2, ko: '값 바꾸기', en: 'Change values' },
  remix: { rank: 3, ko: '구조 변형', en: 'Change structure' },
  original: { rank: 4, ko: '창작', en: 'Create' },
});
export const STAGE_ORDER = Object.freeze(['empty', 'short', 'unchanged', 'tweak', 'remix', 'original']);

// 잠정값입니다. 사람이 직접 코딩한 표본과 대조해 보정해야 합니다.
// PROVISIONAL: these thresholds are not validated. Calibrate them against a
// human-coded sample (two raters, agreement reported) before reporting results.
// CLI: --shingle-k, --remix-threshold.
export const SHINGLE_K = 5;
// nearest similarity >= 이 값이면 remix, 미만이면 original.
export const REMIX_MIN_SIMILARITY = 0.5;
// 이보다 짧은 문자열은 참조 프로그램으로 수집하지 않습니다(토큰 수 기준).
export const MIN_REF_TOKENS = 8;
// 흔한 조각(상용구) 제외: 참조 프로그램의 이 비율 이상에 나오는 조각은 유사도 계산에서 뺍니다.
// `from vpython import *`, `while True:` + `rate(...)`, `sphere(pos=vector(` 같은 조각은 누구의 코드에나 있어서
// 처음부터 직접 작성한 프로그램도 제공 코드와 비슷하다고 나오게 만듭니다. 잠정값입니다. CLI: --common-share.
export const COMMON_SHINGLE_SHARE = 0.03;
// 흔한 조각을 뺀 뒤 남은 조각이 이보다 적으면 remix/original을 판정하지 않고 short로 둡니다. 잠정값입니다.
export const MIN_DISTINCT_SHINGLES = 8;

// ───────────────────────── 토크나이저 ─────────────────────────

const ID_START = /[\p{ID_Start}_]/u;
const ID_CONTINUE = /[\p{ID_Continue}_]/u;
const STRING_PREFIX = /^(?:[rR][bBfF]?|[bBfFuU][rR]?)$/;
const OPERATORS = [
  '**=', '//=', '>>=', '<<=', '...', '!=', '==', '<=', '>=', '->', ':=', '+=', '-=', '*=', '/=',
  '%=', '&=', '|=', '^=', '@=', '**', '//', '<<', '>>',
];
export const NUM = 'NUM';
export const STR = 'STR';
export const NL = 'NL';

/**
 * 파이썬 소스를 토큰 배열로 나눕니다. 완전한 파서가 아닙니다.
 * - 주석과 빈 줄은 버립니다. 들여쓰기는 무시합니다.
 * - 문자열(삼중 따옴표, f/r/b 접두사 포함)은 토큰 하나입니다.
 * - 괄호 밖 논리 줄 끝마다 NL 토큰을 넣습니다.
 * @returns {{type:'id'|'num'|'str'|'op'|'nl', text:string}[]}
 */
export function tokenize(source) {
  const src = String(source ?? '').replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  const tokens = [];
  let depth = 0;
  let i = 0;
  const n = src.length;
  const pushNewline = () => {
    if (depth === 0 && tokens.length && tokens[tokens.length - 1].type !== 'nl') tokens.push({ type: 'nl', text: NL });
  };
  const readString = (start, quoteAt) => {
    const q = src[quoteAt];
    const triple = src.startsWith(q.repeat(3), quoteAt);
    let j = quoteAt + (triple ? 3 : 1);
    while (j < n) {
      if (src[j] === '\\') { j += 2; continue; }
      if (triple) {
        if (src.startsWith(q.repeat(3), j)) { j += 3; break; }
      } else if (src[j] === q) { j += 1; break; } else if (src[j] === '\n') break; // 닫히지 않은 문자열은 줄 끝까지
      j += 1;
    }
    j = Math.min(j, n);
    tokens.push({ type: 'str', text: src.slice(start, j) });
    return j;
  };
  while (i < n) {
    const c = src[i];
    if (c === '\n') { pushNewline(); i += 1; continue; }
    if (c === ' ' || c === '\t' || c === '\f') { i += 1; continue; }
    if (c === '\\' && src[i + 1] === '\n') { i += 2; continue; }
    if (c === '#') { while (i < n && src[i] !== '\n') i += 1; continue; }
    if (c === '"' || c === "'") { i = readString(i, i); continue; }
    if (ID_START.test(c)) {
      let j = i + 1;
      while (j < n) {
        const cp = String.fromCodePoint(src.codePointAt(j));
        if (!ID_CONTINUE.test(cp)) break;
        j += cp.length;
      }
      const word = src.slice(i, j);
      if ((src[j] === '"' || src[j] === "'") && STRING_PREFIX.test(word)) { i = readString(i, j); continue; }
      tokens.push({ type: 'id', text: word.normalize('NFC') });
      i = j;
      continue;
    }
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1] || ''))) {
      const m = /^(?:0[xX][0-9a-fA-F_]+|0[bB][01_]+|0[oO][0-7_]+|(?:[0-9][0-9_]*)?\.?[0-9_]*(?:[eE][+-]?[0-9_]+)?[jJ]?)/.exec(src.slice(i, i + 80));
      const len = Math.max(1, m ? m[0].length : 1);
      tokens.push({ type: 'num', text: src.slice(i, i + len) });
      i += len;
      continue;
    }
    const op = OPERATORS.find((o) => src.startsWith(o, i)) || String.fromCodePoint(src.codePointAt(i));
    if ('([{'.includes(op)) depth += 1;
    else if (')]}'.includes(op)) depth = Math.max(0, depth - 1);
    if (op === ';') { pushNewline(); i += 1; continue; }
    tokens.push({ type: 'op', text: op });
    i += op.length;
  }
  while (tokens.length && tokens[tokens.length - 1].type === 'nl') tokens.pop();
  return tokens;
}

/** exact 보기: 토큰 글자를 그대로 둔 배열. */
export const exactTokens = (tokens) => tokens.map((t) => t.text);
/** masked 보기: 숫자와 문자열 리터럴을 NUM, STR로 바꾼 배열. */
export const maskedTokens = (tokens) => tokens.map((t) => (t.type === 'num' ? NUM : t.type === 'str' ? STR : t.text));

export const ID = 'ID';

/**
 * 프로그램이 스스로 정한 이름(변수, 함수, 매개변수, 반복 변수)을 찾습니다.
 * 완전한 구문 분석이 아니라 토큰 순서만 봅니다: 줄 처음의 `이름 =`, `for 이름[, 이름] in`, `def 이름(매개변수…)`, `as 이름`.
 * 호출 안의 `pos=` 같은 키워드 인자는 줄 처음이 아니므로 포함되지 않습니다.
 */
export function definedNames(tokens) {
  const names = new Set();
  const isId = (t) => t && t.type === 'id';
  for (let i = 0; i < tokens.length; i += 1) {
    const t = tokens[i];
    const prev = tokens[i - 1];
    const next = tokens[i + 1];
    const lineStart = !prev || prev.type === 'nl';
    if (isId(t) && lineStart && next && next.type === 'op' && next.text === '=') names.add(t.text);
    if (isId(t) && t.text === 'for') {
      for (let j = i + 1; j < tokens.length && !(isId(tokens[j]) && tokens[j].text === 'in') && tokens[j].type !== 'nl'; j += 1) {
        if (isId(tokens[j])) names.add(tokens[j].text);
      }
    }
    if (isId(t) && t.text === 'def' && isId(next)) {
      names.add(next.text);
      let depth = 0;
      for (let j = i + 2; j < tokens.length && tokens[j].type !== 'nl'; j += 1) {
        const u = tokens[j];
        if (u.type === 'op' && u.text === '(') depth += 1;
        else if (u.type === 'op' && u.text === ')') { depth -= 1; if (depth <= 0) break; }
        else if (depth === 1 && isId(u)) {
          const before = tokens[j - 1];
          if (before.type === 'op' && (before.text === '(' || before.text === ',' || before.text === '*' || before.text === '**')) names.add(u.text);
        }
      }
    }
    if (isId(t) && t.text === 'as' && isId(next)) names.add(next.text);
  }
  return names;
}

/** renamed 보기: masked 보기에서 프로그램이 스스로 정한 이름까지 ID로 바꾼 배열. 변수 이름만 바꾼 코드를 같은 구조로 봅니다. */
export function renamedTokens(tokens) {
  const names = definedNames(tokens);
  return tokens.map((t) => (t.type === 'num' ? NUM : t.type === 'str' ? STR : t.type === 'id' && names.has(t.text) ? ID : t.text));
}

const SEP = '\u0001';
const keyOf = (arr) => arr.join(SEP);

/** k-그램 집합. 토큰이 k개보다 적으면 전체를 하나의 조각으로 봅니다. */
export function shingles(tokenTexts, k = SHINGLE_K) {
  const out = new Set();
  if (!tokenTexts.length) return out;
  if (tokenTexts.length <= k) { out.add(keyOf(tokenTexts)); return out; }
  for (let i = 0; i + k <= tokenTexts.length; i += 1) out.add(keyOf(tokenTexts.slice(i, i + k)));
  return out;
}

/** 프로그램 하나를 비교용 형태로 바꿉니다. */
export function analyze(code, k = SHINGLE_K) {
  const tokens = tokenize(code);
  const exact = exactTokens(tokens);
  const masked = maskedTokens(tokens);
  return {
    tokenCount: tokens.filter((t) => t.type !== 'nl').length,
    exactKey: keyOf(exact),
    maskedKey: keyOf(masked),
    shingles: shingles(masked, k),
    renamedShingles: shingles(renamedTokens(tokens), k),
  };
}

// ───────────────────────── 참조 말뭉치 ─────────────────────────

const PY_LINE = /^\s*(?:from\s+[\w.]+\s+import\b|import\s+\w+|def\s+\w+\s*\(|(?:for|while|if)\s.+:|[\w.]+\s*=\s*.+|[\w.]+\(.*\)?)\s*$/mu;

/** 파이썬 프로그램으로 보이는 문자열인지 판단합니다. */
export function looksLikePython(text, key = '') {
  if (typeof text !== 'string' || text.length < 8 || text.length > 400_000) return false;
  if (/signature/i.test(key)) return false; // API 서명은 프로그램이 아닙니다.
  const codeKey = /code/i.test(key);
  if (!codeKey && !text.includes('\n')) return false;
  if (!/[(=]/.test(text) && !/\bimport\b/.test(text)) return false;
  return codeKey || PY_LINE.test(text);
}

/** 값 안을 깊이 돌며 파이썬 코드 문자열을 찾습니다. */
export function harvestStrings(value, label) {
  const found = [];
  const seen = new Set();
  const walk = (v, key, ids, trail, depth) => {
    if (typeof v === 'string') {
      if (looksLikePython(v, key)) found.push({ ref: [label, ids.join('/') || trail.slice(0, 3).join('.'), key].filter(Boolean).join(':'), key, code: v });
      return;
    }
    if (!v || typeof v !== 'object' || depth > 14 || seen.has(v)) return;
    seen.add(v);
    if (Array.isArray(v)) { v.forEach((x, idx) => walk(x, key, ids, [...trail, String(idx)], depth + 1)); return; }
    const nextIds = typeof v.id === 'string' || typeof v.id === 'number' ? [...ids, String(v.id)] : ids;
    for (const [k, x] of Object.entries(v)) {
      // {ko, en} 같은 언어별 객체는 상위 키 이름을 이어 붙입니다.
      const childKey = /^(ko|en|ja|zh)$/.test(k) && key ? `${key}.${k}` : k;
      walk(x, childKey, nextIds, [...trail, k], depth + 1);
    }
  };
  walk(value, '', [], [], 0);
  return found;
}

function candidateIds(mod) {
  const ids = new Set();
  for (const v of Object.values(mod)) {
    if (Array.isArray(v)) for (const item of v) if (item && typeof item.id === 'string') ids.add(item.id);
  }
  return [...ids].slice(0, 200);
}

/** 모듈 하나에서 코드 문자열을 수집합니다. 이름이 Code로 끝나는 순수 함수는 id와 언어를 넣어 호출합니다. */
export function harvestModule(mod, label) {
  const found = [];
  for (const [name, value] of Object.entries(mod)) {
    if (typeof value === 'function') {
      if (!/Code$/.test(name)) continue;
      const args = [[], ['ko'], ['en'], ...candidateIds(mod).map((id) => [id])];
      for (const a of args) {
        try {
          const out = value(...a);
          if (typeof out === 'string' && looksLikePython(out, name)) found.push({ ref: `${label}:${name}(${a.join(',')})`, key: name, code: out });
        } catch { /* 인자가 맞지 않는 함수는 건너뜁니다. */ }
      }
      continue;
    }
    const sub = name === 'default' ? label : `${label}.${name}`;
    for (const item of harvestStrings(value, sub)) found.push(item);
  }
  return found;
}

/**
 * 참조 말뭉치를 만듭니다. items: [{ref, module, key, code}]
 * 토큰이 완전히 같은 중복은 먼저 나온 것만 남깁니다.
 */
export function buildCorpus(items, { k = SHINGLE_K, minTokens = MIN_REF_TOKENS, commonShare = COMMON_SHINGLE_SHARE } = {}) {
  const refs = [];
  const byExact = new Map();
  const byMasked = new Map();
  const allShingles = new Set();
  for (const item of items) {
    const a = analyze(item.code, k);
    if (a.tokenCount < minTokens || byExact.has(a.exactKey)) continue;
    const ref = { ref: item.ref, module: item.module || item.ref.split(/[:.]/)[0], tokenCount: a.tokenCount, exactKey: a.exactKey, maskedKey: a.maskedKey, shingles: a.shingles, renamedShingles: a.renamedShingles };
    refs.push(ref);
    byExact.set(a.exactKey, ref);
    if (!byMasked.has(a.maskedKey)) byMasked.set(a.maskedKey, ref);
    for (const s of a.shingles) allShingles.add(s);
  }
  // 조각마다 몇 개의 참조에 나오는지 세어 흔한 조각을 정합니다(참조가 적은 시험용 말뭉치에서는 최소 3개).
  const commonMin = Math.max(3, Math.ceil(refs.length * commonShare));
  const commonOf = (field) => {
    const frequency = new Map();
    for (const ref of refs) for (const s of ref[field]) frequency.set(s, (frequency.get(s) || 0) + 1);
    const common = new Set();
    for (const [s, count] of frequency) if (count >= commonMin) common.add(s);
    return common;
  };
  return { refs, byExact, byMasked, allShingles, commonShingles: commonOf('shingles'), commonRenamedShingles: commonOf('renamedShingles'), k };
}

function readPyFolder(dir, label) {
  const abs = path.resolve(dir);
  return fs.readdirSync(abs).filter((f) => f.toLowerCase().endsWith('.py')).sort()
    .map((f) => ({ ref: `${label}:${f.replace(/\.py$/i, '')}`, module: label, key: 'file', code: fs.readFileSync(path.join(abs, f), 'utf8') }));
}

/**
 * 앱이 제공하는 코드를 모두 모읍니다.
 * @returns {Promise<{items:object[], modules:{module:string,found:number}[], skipped:{module:string,reason:string}[]}>}
 */
export async function harvestAppReferences({ dataDir = DATA_DIR, galleryDir = GALLERY_DIR, gallery = true, solutions = true, extraRef = [] } = {}) {
  const items = [];
  const modules = [];
  const skipped = [];
  const files = fs.readdirSync(dataDir).filter((f) => /\.(js|mjs)$/.test(f) && !/\.test\./.test(f)).sort();
  for (const file of files) {
    const label = file.replace(/\.(js|mjs)$/, '');
    try {
      const mod = await import(pathToFileURL(path.join(dataDir, file)).href);
      let found = harvestModule(mod, label).map((x) => ({ ...x, module: label }));
      if (!solutions) found = found.filter((x) => !/solution/i.test(x.key));
      modules.push({ module: label, found: found.length });
      items.push(...found);
    } catch (error) {
      skipped.push({ module: label, reason: String(error?.message || error).split('\n')[0].slice(0, 160) });
    }
  }
  if (gallery && fs.existsSync(galleryDir)) {
    // 갤러리 프로젝트(공개 GlowScript 프로젝트)도 앱이 제공하는 코드입니다.
    const label = 'gallery';
    let found = 0;
    for (const file of fs.readdirSync(galleryDir).filter((f) => f.endsWith('.json')).sort()) {
      try {
        const json = JSON.parse(fs.readFileSync(path.join(galleryDir, file), 'utf8'));
        for (const key of ['code', 'source']) {
          if (typeof json[key] === 'string' && json[key].trim()) { items.push({ ref: `${label}:${file.replace(/\.json$/, '')}:${key}`, module: label, key, code: json[key] }); found += 1; }
        }
      } catch (error) {
        skipped.push({ module: `${label}/${file}`, reason: String(error?.message || error).slice(0, 160) });
      }
    }
    modules.push({ module: label, found });
  }
  for (const dir of extraRef) {
    const found = readPyFolder(dir, 'extra');
    modules.push({ module: `extra(${path.basename(path.resolve(dir))})`, found: found.length });
    items.push(...found);
  }
  return { items, modules, skipped };
}

// ───────────────────────── 분류 ─────────────────────────

/*
 * 유사도는 "포함 비율(containment)"을 사용합니다.
 *   similarity = |학생 조각 ∩ 참조 조각| / |학생 조각|
 * 자카드 대신 포함 비율을 고른 이유:
 * 참조 코드의 길이는 몇 줄에서 수백 줄까지 다릅니다. 자카드는 두 집합의 크기 차이에 민감해서,
 * 학생이 긴 예제의 일부만 남기고 지운 경우 자신이 만든 것이 없어도 유사도가 낮게 나옵니다.
 * 포함 비율은 "학생 코드 가운데 제공 코드에서 온 부분의 비율"로 읽을 수 있어 연구 질문과 맞습니다.
 * 단점: 아주 짧은 학생 코드는 여러 참조에 모두 포함되어 값이 1에 가깝습니다. 동점은 자카드로 가릅니다.
 */
export function containment(studentShingles, refShingles) {
  if (!studentShingles.size) return 0;
  let hit = 0;
  for (const s of studentShingles) if (refShingles.has(s)) hit += 1;
  return hit / studentShingles.size;
}

/**
 * 프로그램 하나를 분류합니다.
 * @returns {{stage:string, nearestRef:string, similarity:number, novelShare:number, tokenCount:number}}
 */
export function classify(code, corpus, { remixThreshold = REMIX_MIN_SIMILARITY, minDistinct = MIN_DISTINCT_SHINGLES } = {}) {
  const a = analyze(code, corpus.k);
  if (a.tokenCount === 0) return { stage: 'empty', nearestRef: '', similarity: 0, novelShare: 0, tokenCount: 0 };
  let novel = 0;
  for (const s of a.shingles) if (!corpus.allShingles.has(s)) novel += 1;
  const novelShare = novel / a.shingles.size;

  const exactHit = corpus.byExact.get(a.exactKey);
  if (exactHit) return { stage: 'unchanged', nearestRef: exactHit.ref, similarity: 1, novelShare: 0, tokenCount: a.tokenCount };
  const maskedHit = corpus.byMasked.get(a.maskedKey);
  if (maskedHit) return { stage: 'tweak', nearestRef: maskedHit.ref, similarity: 1, novelShare: 0, tokenCount: a.tokenCount };

  // 흔한 조각(상용구)을 뺀 학생 조각만으로 가장 가까운 참조를 찾습니다.
  // 두 보기에서 각각 찾고 더 높은 쪽을 사용합니다: masked(숫자·문자열만 가림)와 renamed(스스로 정한 이름도 가림).
  // renamed 보기가 없으면 변수 이름만 바꾼 코드가 창작으로 분류됩니다.
  const nearest = (studentShingles, common, field) => {
    const distinctSet = new Set();
    for (const s of studentShingles) if (!common.has(s)) distinctSet.add(s);
    let ref = null;
    let sim = -1;
    let jac = -1;
    for (const candidate of corpus.refs) {
      let hit = 0;
      for (const s of distinctSet) if (candidate[field].has(s)) hit += 1;
      if (!hit) continue;
      const candidateSim = hit / distinctSet.size;
      const candidateJac = hit / (distinctSet.size + candidate[field].size - hit);
      if (candidateSim > sim || (candidateSim === sim && candidateJac > jac)) { ref = candidate; sim = candidateSim; jac = candidateJac; }
    }
    return { ref, sim: ref ? sim : 0, size: distinctSet.size };
  };
  const byMaskedView = nearest(a.shingles, corpus.commonShingles || new Set(), 'shingles');
  const byRenamedView = nearest(a.renamedShingles, corpus.commonRenamedShingles || new Set(), 'renamedShingles');
  const chosen = byRenamedView.sim > byMaskedView.sim ? byRenamedView : byMaskedView;
  const best = chosen.ref;
  const bestSim = chosen.sim;
  const distinct = { size: Math.min(byMaskedView.size, byRenamedView.size) };
  const similarity = best ? bestSim : 0;
  // 고유한 조각이 너무 적으면 비율이 우연에 좌우되므로 판정하지 않습니다.
  if (distinct.size < minDistinct) {
    return { stage: 'short', nearestRef: best ? best.ref : '', similarity, novelShare, tokenCount: a.tokenCount };
  }
  return {
    stage: similarity >= remixThreshold ? 'remix' : 'original',
    nearestRef: best ? best.ref : '',
    similarity,
    novelShare,
    tokenCount: a.tokenCount,
  };
}

// ───────────────────────── 개인정보 ─────────────────────────

/** 솔트를 넣은 짧은 해시(HMAC-SHA256 앞 12자리). 원래 값을 되돌릴 수 없습니다. */
export function hashAuthor(author, salt) {
  if (!salt) throw new Error('작성자 정보가 있으면 --salt가 필요합니다. / --salt is required when authors are present.');
  return crypto.createHmac('sha256', String(salt)).update(String(author).normalize('NFC').trim()).digest('hex').slice(0, 12);
}

// ───────────────────────── 실행 ─────────────────────────

const round = (x) => Math.round(x * 1000) / 1000;

/**
 * 제출물 배열을 분류합니다. 결과 행에는 코드 본문과 작성자 이름이 없습니다.
 * @param {{id:string, author?:string, code:string, savedAt?:string}[]} submissions
 */
export function classifyAll(submissions, corpus, { salt = '', remixThreshold = REMIX_MIN_SIMILARITY, hashIds = false } = {}) {
  const hasAuthor = submissions.some((s) => s.author != null && String(s.author).trim() !== '');
  if ((hasAuthor || hashIds) && !salt) throw new Error('작성자 정보가 있으면 --salt가 필요합니다. / --salt is required when authors are present (or with --hash-ids).');
  return submissions.map((s, index) => {
    const r = classify(s.code, corpus, { remixThreshold });
    const rawId = s.id != null && String(s.id) !== '' ? String(s.id) : String(index + 1);
    return {
      id: hashIds ? hashAuthor(`id:${rawId}`, salt) : rawId,
      author_hash: s.author != null && String(s.author).trim() !== '' ? hashAuthor(s.author, salt) : '',
      stage: r.stage,
      nearest_ref: r.nearestRef,
      similarity: round(r.similarity),
      novel_share: round(r.novelShare),
      token_count: r.tokenCount,
    };
  });
}

export function summarize(rows, settings = {}) {
  const pct = (count, total) => (total ? Math.round((count / total) * 1000) / 10 : 0);
  const stageCounts = Object.fromEntries(STAGE_ORDER.map((s) => [s, 0]));
  for (const r of rows) stageCounts[r.stage] += 1;
  const best = new Map();
  for (const r of rows) {
    if (!r.author_hash) continue;
    const prev = best.get(r.author_hash);
    if (!prev || STAGES[r.stage].rank > STAGES[prev].rank) best.set(r.author_hash, r.stage);
  }
  const authorCounts = Object.fromEntries(STAGE_ORDER.map((s) => [s, 0]));
  for (const stage of best.values()) authorCounts[stage] += 1;
  const table = (counts, total) => STAGE_ORDER.map((stage) => ({ stage, ko: STAGES[stage].ko, en: STAGES[stage].en, count: counts[stage], percent: pct(counts[stage], total) }));
  return {
    provisional: true,
    note: 'Thresholds are provisional and not validated against human coding.',
    settings,
    programs: { total: rows.length, byStage: table(stageCounts, rows.length) },
    authors: { total: best.size, withoutAuthor: rows.filter((r) => !r.author_hash).length, byHighestStage: table(authorCounts, best.size) },
  };
}

export const CSV_COLUMNS = ['id', 'author_hash', 'stage', 'nearest_ref', 'similarity', 'novel_share', 'token_count'];
const csvCell = (v) => {
  let s = String(v ?? '');
  if (/^[=+\-@\t]/.test(s) && Number.isNaN(Number(s))) s = `'${s}`; // 스프레드시트 수식 주입 방지
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
export function toCsv(rows) {
  return [CSV_COLUMNS.join(','), ...rows.map((r) => CSV_COLUMNS.map((c) => csvCell(r[c])).join(','))].join('\n') + '\n';
}

export function formatSummary(summary) {
  const lines = [];
  const block = (title, total, list) => {
    lines.push(`${title} (n=${total})`);
    for (const row of list) lines.push(`  ${row.stage.padEnd(10)} ${String(row.count).padStart(6)}  ${row.percent.toFixed(1).padStart(5)}%  ${row.ko} / ${row.en}`);
  };
  block('프로그램별 단계 / Programs by stage', summary.programs.total, summary.programs.byStage);
  if (summary.authors.total) {
    lines.push('');
    block('학생별 최고 단계 / Highest stage reached per author', summary.authors.total, summary.authors.byHighestStage);
    if (summary.authors.withoutAuthor) lines.push(`  (작성자 없는 프로그램 ${summary.authors.withoutAuthor}개는 학생별 집계에서 뺐습니다.)`);
  }
  lines.push('', '주의: 임계값은 잠정값입니다. 사람이 코딩한 표본으로 보정하기 전에는 결과를 보고하지 마십시오.',
    'Note: thresholds are provisional; calibrate against human coding before reporting.');
  return lines.join('\n');
}

export function parseArgs(argv) {
  const opts = { extraRef: [], gallery: true, solutions: true, hashIds: false, listRefs: false, help: false };
  const value = (i, flag) => {
    if (i + 1 >= argv.length) throw new Error(`${flag} 뒤에 값이 필요합니다.`);
    return argv[i + 1];
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--dir') opts.dir = value(i++, a);
    else if (a === '--json') opts.json = value(i++, a);
    else if (a === '--extra-ref') opts.extraRef.push(value(i++, a));
    else if (a === '--salt') opts.salt = value(i++, a);
    else if (a === '--out') opts.out = value(i++, a);
    else if (a === '--summary-json') opts.summaryJson = value(i++, a);
    else if (a === '--remix-threshold') opts.remixThreshold = Number(value(i++, a));
    else if (a === '--common-share') opts.commonShare = Number(value(i++, a));
    else if (a === '--shingle-k') opts.k = Number(value(i++, a));
    else if (a === '--no-gallery') opts.gallery = false;
    else if (a === '--no-solutions') opts.solutions = false;
    else if (a === '--hash-ids') opts.hashIds = true;
    else if (a === '--list-refs') opts.listRefs = true;
    else if (a === '--help' || a === '-h') opts.help = true;
    else throw new Error(`알 수 없는 옵션: ${a}`);
  }
  if (opts.remixThreshold != null && !(opts.remixThreshold >= 0 && opts.remixThreshold <= 1)) throw new Error('--remix-threshold는 0과 1 사이여야 합니다.');
  if (opts.k != null && !(Number.isInteger(opts.k) && opts.k >= 2 && opts.k <= 12)) throw new Error('--shingle-k는 2~12의 정수여야 합니다.');
  return opts;
}

export function readSubmissions(opts) {
  if (opts.dir) {
    const abs = path.resolve(opts.dir);
    return fs.readdirSync(abs).filter((f) => f.toLowerCase().endsWith('.py')).sort()
      .map((f) => ({ id: f.replace(/\.py$/i, ''), code: fs.readFileSync(path.join(abs, f), 'utf8') }));
  }
  const data = JSON.parse(fs.readFileSync(path.resolve(opts.json), 'utf8'));
  if (!Array.isArray(data)) throw new Error('--json 파일은 { id, author?, code, savedAt? } 배열이어야 합니다.');
  return data.map((row, i) => {
    if (!row || typeof row.code !== 'string') throw new Error(`--json ${i + 1}번째 항목에 code 문자열이 없습니다.`);
    return { id: row.id, author: row.author, code: row.code, savedAt: row.savedAt };
  });
}

const HELP = `creation-stage — 제공 코드에서 멀어진 정도로 학생 코드를 분류합니다 (오프라인).

  node scripts/research/creation-stage.mjs --list-refs
  node scripts/research/creation-stage.mjs --dir <.py 폴더> --out result.csv
  node scripts/research/creation-stage.mjs --json <파일> --salt <비밀 문자열> --out result.csv --summary-json summary.json

  --dir <folder>          .py 파일 폴더 (파일 이름 = id)
  --json <file>           [{ id, author?, code, savedAt? }] 배열
  --extra-ref <folder>    참조 코드 추가 (.py, 여러 번 사용 가능)
  --salt <text>           author가 있으면 필수. 작성자 해시에 사용
  --hash-ids              id도 해시로 출력 (--salt 필요)
  --out <file.csv>        프로그램별 결과
  --summary-json <file>   요약
  --remix-threshold <0-1> 기본 ${REMIX_MIN_SIMILARITY} (잠정값)
  --shingle-k <n>         기본 ${SHINGLE_K} (잠정값)
  --common-share <0-1>    이 비율 이상의 참조에 나오는 조각은 흔한 조각으로 보고 뺍니다. 기본 ${COMMON_SHINGLE_SHARE} (잠정값)
  --no-solutions          미션 모범 답안(solutionCode)을 참조에서 제외
  --no-gallery            갤러리 프로젝트를 참조에서 제외
  --list-refs             모듈별 참조 프로그램 수와 건너뛴 모듈 출력
`;

export async function main(argv, io = { log: console.log, error: console.error }) {
  let opts;
  try { opts = parseArgs(argv); } catch (error) { io.error(error.message); return 2; }
  if (opts.help || (!opts.listRefs && !opts.dir && !opts.json)) { io.log(HELP); return opts.help ? 0 : 2; }
  if (opts.dir && opts.json) { io.error('--dir과 --json 가운데 하나만 사용하십시오.'); return 2; }

  // 작성자 정보가 있는데 솔트가 없으면 참조를 읽기 전에 멈춥니다.
  let submissions = [];
  if (!opts.listRefs) {
    try {
      submissions = readSubmissions(opts);
      const hasAuthor = submissions.some((s) => s.author != null && String(s.author).trim() !== '');
      if ((hasAuthor || opts.hashIds) && !opts.salt) {
        io.error('작성자 정보가 있으면 --salt가 필요합니다. 실행을 멈춥니다. / --salt is required when authors are present.');
        return 2;
      }
    } catch (error) { io.error(`입력을 읽지 못했습니다: ${error.message}`); return 2; }
  }

  const k = opts.k ?? SHINGLE_K;
  const remixThreshold = opts.remixThreshold ?? REMIX_MIN_SIMILARITY;
  let harvest;
  try { harvest = await harvestAppReferences({ gallery: opts.gallery, solutions: opts.solutions, extraRef: opts.extraRef }); } catch (error) { io.error(`참조 코드를 읽지 못했습니다: ${error.message}`); return 2; }
  const commonShare = opts.commonShare ?? COMMON_SHINGLE_SHARE;
  if (!(commonShare > 0 && commonShare <= 1)) throw new Error('--common-share는 0보다 크고 1 이하여야 합니다.');
  const corpus = buildCorpus(harvest.items, { k, commonShare });

  if (opts.listRefs) {
    const unique = new Map();
    for (const ref of corpus.refs) unique.set(ref.module, (unique.get(ref.module) || 0) + 1);
    io.log('모듈별 참조 프로그램 / Reference programs per module');
    io.log('  module                     found  unique');
    for (const m of harvest.modules) {
      const key = m.module.startsWith('extra(') ? 'extra' : m.module;
      io.log(`  ${m.module.padEnd(24)} ${String(m.found).padStart(7)} ${String(unique.get(key) || 0).padStart(7)}`);
    }
    io.log(`  합계 / total: found ${harvest.items.length}, unique ${corpus.refs.length} (토큰 ${MIN_REF_TOKENS}개 미만과 중복 제외)`);
    io.log(`건너뛴 모듈 / Skipped modules: ${harvest.skipped.length ? '' : '없음 / none'}`);
    for (const s of harvest.skipped) io.log(`  ${s.module}: ${s.reason}`);
    return 0;
  }

  const rows = classifyAll(submissions, corpus, { salt: opts.salt, remixThreshold, hashIds: opts.hashIds });
  const summary = summarize(rows, {
    shingleK: k, remixThreshold, commonShare, commonShingles: corpus.commonShingles.size, minDistinctShingles: MIN_DISTINCT_SHINGLES, references: corpus.refs.length, solutionsIncluded: opts.solutions, galleryIncluded: opts.gallery,
    extraRefFolders: opts.extraRef.length, skippedModules: harvest.skipped.map((s) => s.module),
  });
  if (opts.out) fs.writeFileSync(path.resolve(opts.out), toCsv(rows));
  if (opts.summaryJson) fs.writeFileSync(path.resolve(opts.summaryJson), JSON.stringify(summary, null, 2) + '\n');
  io.log(`참조 프로그램 ${corpus.refs.length}개, k=${k}, remix 임계값=${remixThreshold}${harvest.skipped.length ? `, 건너뛴 모듈 ${harvest.skipped.length}개` : ''}`);
  io.log(formatSummary(summary));
  if (opts.out) io.log(`\nCSV: ${path.resolve(opts.out)}`);
  if (opts.summaryJson) io.log(`요약 JSON: ${path.resolve(opts.summaryJson)}`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(fs.realpathSync(process.argv[1])).href) {
  process.exitCode = await main(process.argv.slice(2));
}
