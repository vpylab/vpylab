/**
 * 미션 채점 검증 — "시작 코드는 실패, 모범 답안은 통과"
 *
 * 각 미션의 starterCode와 solutionCode를 브라우저와 같은 경로로 처리한다.
 *   vpython-api.py 실행(CPython, src/test/run-vpython.py — Worker와 같이 ast 변환 뒤 모듈 수준 실행)
 *   → 커맨드 재생(command-replay.js) → 객체 레지스트리 → gradeMission()
 *
 * 한계: Pyodide 대신 CPython으로 실행하므로 Three.js 렌더링·오디오는 거치지 않고,
 * rate()/sleep()의 실제 대기 시간은 가상 시계로 대체한다 (실행 순서와 값은 같다).
 * python3가 없는 환경에서는 이 파일의 검사를 건너뛴다.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import missions from './missions';
import { hasPython, runPythonJobs } from '../test/python-runner';
import { applyCommandsToRegistry } from '../engine/command-replay';
import {
  clearRegistry, getSnapshot, getNoteHistory, getSoundHistory, getTrajectory,
} from '../engine/object-registry';
import { gradeMission, gradeB, gradeNotes } from '../engine/grading-engine';

const DUMP = Boolean(globalThis.process?.env?.VPY_DUMP);

/** 실행 결과를 레지스트리에 재생한 뒤 미션 기준으로 채점 */
function gradeRun(mission, run, code) {
  clearRegistry();
  applyCommandsToRegistry(run.commands);
  return gradeMission(mission, code);
}

function summarize(run) {
  clearRegistry();
  applyCommandsToRegistry(run.commands);
  const counts = {};
  for (const o of getSnapshot()) counts[o.type] = (counts[o.type] || 0) + 1;
  const fmt = v => (Array.isArray(v) ? `(${v.map(x => (typeof x === 'number' ? +x.toFixed(3) : x)).join(',')})` : (typeof v === 'number' ? +v.toFixed(3) : v));
  const lines = getSnapshot().slice(0, 8).map(o => {
    const p = o.props;
    return `    ${o.id} ${o.type} pos=${fmt(p.pos)} color=${fmt(p.color)} r=${fmt(p.radius)} size=${fmt(p.size)} axis=${fmt(p.axis)} em=${p.emissive} op=${fmt(p.opacity)} vis=${p.visible} hist=${o.historyLength}`;
  });
  return [
    `  counts=${JSON.stringify(counts)} notes=${getNoteHistory().map(n => `${n.name}:${n.duration}:${n.type}`).join(' ')} sounds=${getSoundHistory().map(s => `${s.kind}:${s.name}`).join(' ')}`,
    ...lines,
  ].join('\n');
}

const pythonAvailable = hasPython();

describe.skipIf(!pythonAvailable)('미션 채점: 시작 코드 실패 · 모범 답안 통과', { timeout: 60_000 }, () => {
  /** @type {Map<string, object>} */
  let runs;

  beforeAll(() => {
    const jobs = [];
    for (const mission of missions) {
      jobs.push({ id: mission.id, label: 'starter', code: mission.starterCode });
      jobs.push({ id: mission.id, label: 'solution', code: mission.solutionCode });
    }
    runs = runPythonJobs(jobs);
  }, 120_000);

  it('모든 시작 코드와 모범 답안이 오류 없이 끝까지 실행된다', () => {
    for (const mission of missions) {
      for (const label of ['starter', 'solution']) {
        const run = runs.get(`${mission.id}:${label}`);
        expect(run, `${mission.id} ${label} 실행 결과 없음`).toBeDefined();
        expect(run.error, `${mission.id} ${label} 실행 오류: ${run.error}`).toBeNull();
        expect(run.stopped, `${mission.id} ${label} 실행이 한도를 넘어 중단됨`).toBe(false);
      }
    }
  });

  it('CT-10은 += 풀이도 같은 좌표로 채점하고 반대로 이동하면 실패한다', () => {
    const mission = missions.find(item => item.id === 'CT-10');
    const original = mission.solutionCode;
    const cases = ['+=', '-='].map(operator => ({
      id: mission.id, label: operator,
      code: original.replace('불빛들[i].pos = 불빛들[i].pos +', `불빛들[i].pos ${operator}`),
    }));
    const variants = runPythonJobs(cases);
    for (const { label, code } of cases) {
      const run = variants.get(`CT-10:${label}`);
      expect(run.error).toBeNull();
      expect(gradeRun(mission, run, code).passed).toBe(label === '+=');
      if (label === '+=') {
        expect(getSnapshot().filter(obj => obj.type === 'sphere').map(obj => obj.props.pos))
          .toEqual([[-1, 0.3, 0], [0, 0.6, 0], [1, 0.9, 0]]);
      }
    }
  });

  it('실행형(run) 미션은 모두 조건식 또는 코드 검사를 가진다', () => {
    for (const mission of missions.filter(m => m.gradeType === 'run')) {
      const hasRule = (mission.assertions?.length > 0) || (mission.codeChecks?.length > 0);
      expect(hasRule, `${mission.id}: 실행만 하면 통과하는 미션`).toBe(true);
    }
  });

  it.each(missions.map(m => [m.id, m]))('%s — 시작 코드는 실패하고 모범 답안은 통과한다', (id, mission) => {
    const starterRun = runs.get(`${id}:starter`);
    const solutionRun = runs.get(`${id}:solution`);

    const starterResult = gradeRun(mission, starterRun, mission.starterCode);
    if (DUMP) {
      console.log(`\n=== ${id} [starter] passed=${starterResult.passed} score=${starterResult.score}\n${summarize(starterRun)}`);
    }
    const solutionResult = gradeRun(mission, solutionRun, mission.solutionCode);
    if (DUMP) {
      console.log(`=== ${id} [solution] passed=${solutionResult.passed} score=${solutionResult.score}\n${summarize(solutionRun)}`);
    }

    const failed = (result) => (result.results || []).filter(r => !r.passed).map(r => r.message).join(' / ') || result.message;
    expect(starterResult.passed, `${id} 시작 코드가 그대로 통과함`).toBe(false);
    expect(solutionResult.passed, `${id} 모범 답안이 실패함: ${failed(solutionResult)}`).toBe(true);
  });
});

describe.skipIf(!pythonAvailable)('채점 엔진 B(궤적)·notes(음표)가 실제 실행 결과로 동작한다', { timeout: 60_000 }, () => {
  it('gradeB: 같은 운동은 통과하고 다른 속도는 실패한다', () => {
    const base = `from vpython import *
공 = sphere(pos=vector(-3, 0, 0), radius=0.25)
속도 = vector(SPEED, 0, 0)
for step in range(40):
    rate(30)
    공.pos = 공.pos + 속도 * 0.05
`;
    const runs = runPythonJobs([
      { id: 'ref', label: 'a', code: base.replace('SPEED', '1.5') },
      { id: 'same', label: 'a', code: base.replace('SPEED', '1.5') },
      { id: 'fast', label: 'a', code: base.replace('SPEED', '3.0') },
    ]);

    clearRegistry();
    applyCommandsToRegistry(runs.get('ref:a').commands);
    const reference = getTrajectory('obj_1').positions;
    expect(reference.length).toBe(40);

    clearRegistry();
    applyCommandsToRegistry(runs.get('same:a').commands);
    expect(gradeB('obj_1', reference, 0.9).passed).toBe(true);

    clearRegistry();
    applyCommandsToRegistry(runs.get('fast:a').commands);
    const fast = gradeB('obj_1', reference, 0.9);
    expect(fast.passed).toBe(false);
    expect(fast.similarity).toBeLessThan(0.9);
  });

  it('gradeNotes: 음표()·악기()로 재생한 멜로디를 순서대로 비교한다', () => {
    const runs = runPythonJobs([
      { id: 'melody', label: 'a', code: 'from vpython import *\n음표("도4", 0.2)\n악기("피아노", "미4", 0.2)\n음표("솔4", 0.2)\n' },
      { id: 'wrong', label: 'a', code: 'from vpython import *\n음표("도4", 0.2)\n음표("레4", 0.2)\n' },
    ]);

    clearRegistry();
    applyCommandsToRegistry(runs.get('melody:a').commands);
    expect(getNoteHistory().map(n => n.name)).toEqual(['C4', 'E4', 'G4']);
    expect(gradeNotes(['C4', 'E4', 'G4']).passed).toBe(true);

    clearRegistry();
    applyCommandsToRegistry(runs.get('wrong:a').commands);
    const wrong = gradeNotes(['C4', 'E4', 'G4']);
    expect(wrong.passed).toBe(false);
    expect(wrong.matched).toBe(1);
  });
});
