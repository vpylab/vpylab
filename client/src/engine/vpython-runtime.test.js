/**
 * 실행 런타임(vpython-api.py의 _vpylab_run·rate·sleep·태스크) 테스트
 *
 * 실제 vpython-api.py를 CPython으로 실행한다(src/test/run-vpython.py). 대기는 가상 시계로 대체하고,
 * rate() 호출이 한도를 넘으면 정지 버튼을 누른 것처럼 중단 신호를 보낸다.
 * 검토 항목: 정지 신호를 삼키지 못함(BaseException), rate 콜백 형식의 양보·상한, 실행 종료 때 태스크 정리,
 * 핸들러·콜백 오류의 구조화 보고, 긴 대기의 하트비트, 실행마다 새 전역.
 */
import { describe, it, expect } from 'vitest';
import { hasPython, runPythonJobs } from '../test/python-runner';

const pythonAvailable = hasPython();
const one = (code, extra = {}) => runPythonJobs([{ id: 'r', label: 'a', code, ...extra }]).get('r:a');

describe.skipIf(!pythonAvailable)('학생 코드 실행 런타임', { timeout: 60_000 }, () => {
  it('한 구의 위치와 색은 독립적이고 교체된 벡터는 화면을 갱신하지 않는다', () => {
    const run = one(`from vpython import *
b = sphere(pos=vec(1,0,0))
p = b.pos
b.color = p
b.pos = b.pos
p.y = 0.5
assert b.color == vec(1,0,0) and b.pos is p
b.color.z = 0.25
assert p.z == 0
b.pos = b.color
p.x = 8
assert b.pos == vec(1,0,0.25)
`);
    expect(run.error).toBeNull();
    const updates = run.commands.filter(command => command.action === 'update');
    const expected = [
      { color: [1, 0, 0] },
      { pos: [1, 0, 0] },
      { pos: [1, 0.5, 0] },
      { color: [1, 0, 0.25] },
      { pos: [1, 0, 0.25] },
    ];
    expect(updates).toEqual(expected.map(props => ({ action: 'update', id: 'obj_1', ...props })));
  });

  it('학생의 except Exception:이 정지 신호를 삼키지 못한다 (_StopExecution은 BaseException)', () => {
    const r = one('from vpython import *\nn = 0\nwhile True:\n    try:\n        rate(1000)\n        n += 1\n    except Exception:\n        pass\n', { rateLimit: 300 });
    expect(r.stopped).toBe(true);
    expect(r.error).toBeNull();
  });

  it('while True: rate(60, tick) 콜백 형식도 양보하므로 정지 신호가 듣고 콜백이 돈다', () => {
    const r = one('from vpython import *\nk = 0\ndef tick():\n    global k\n    k += 1\nwhile True:\n    rate(60, tick)\n', { rateLimit: 300 });
    expect(r.stopped).toBe(true);
    expect(r.pendingTasks).toBe(0);
  });

  it('rate(fps, callback)은 바로 돌아오고 콜백은 뒤에 돈다 — 모듈 코드가 끝나도 남은 콜백을 기다린다', () => {
    const r = one('from vpython import *\nn = 0\ndef move():\n    global n\n    n += 1\n    print("move", n)\n    if n < 3:\n        rate(100, move)\nmove()\nprint("after")\n');
    expect(r.ok).toBe(true);
    expect(r.stdout).toBe('move 1\nafter\nmove 2\nmove 3\n');
    expect(r.pendingTasks).toBe(0);
  });

  it('콜백 안의 오류는 트레이스백 그대로 실행 오류로 올라온다', () => {
    const r = one('from vpython import *\ndef bad():\n    return 1 / 0\nrate(100, bad)\nprint("tail")\n');
    expect(r.ok).toBe(false);
    expect(r.error).toBe('ZeroDivisionError: division by zero');
    expect(r.pendingTasks).toBe(0);
  });

  it('본문이 오류로 끝나도 남은 태스크를 정리하고 다음 실행은 깨끗하게 시작한다', () => {
    const runs = runPythonJobs([
      { id: 'first', label: 'a', code: 'from vpython import *\ndef cb():\n    sleep(5)\nrate(100, cb)\nraise ValueError("x")\n' },
      { id: 'second', label: 'a', code: 'from vpython import *\nprint("ok")\n' },
    ]);
    expect(runs.get('first:a').error).toBe('ValueError: x');
    expect(runs.get('first:a').pendingTasks).toBe(0);
    expect(runs.get('second:a').ok).toBe(true);
    expect(runs.get('second:a').stdout).toBe('ok\n');
  });

  it('긴 sleep()도 0.2초마다 하트비트를 보낸다 (정지 확인 750ms보다 짧게)', () => {
    const r = one('from vpython import *\nsleep(15)\n');
    expect(r.ok).toBe(true);
    expect(r.heartbeats).toBeGreaterThanOrEqual(74);
  });

  it('콜백 태스크 안에서 다시 rate(fps, cb)를 예약해도 상한에 걸려 교착하지 않는다', () => {
    const source = [
      'from vpython import *',
      'done = 0',
      'class Obj:',
      '    def __init__(self):',
      '        self.n = 0',
      '    def tick(self):',
      '        global done',
      '        self.n += 1',
      '        if self.n < 3:',
      '            rate(200, self.tick)',
      '        else:',
      '            done += 1',
      'objs = [Obj() for i in range(70)]',
      'for o in objs:',
      '    rate(200, o.tick)',
      'print("scheduled")',
    ].join('\n');
    const r = one(source);
    expect(r.ok).toBe(true);
    expect(r.stdout).toBe('scheduled\n');
    expect(r.pendingTasks).toBe(0);
  });

  it('음표()·화음()은 코루틴이라 변환기가 기다리고 하트비트를 보낸다', () => {
    const r = one('from vpython import *\n음표("도4", 1)\n화음([262, 330], 1)\nprint("ok")\n');
    expect(r.ok).toBe(true);
    expect(r.stdout).toBe('ok\n');
    expect(r.heartbeats).toBeGreaterThanOrEqual(8);
  });

  it('실행마다 새 전역이라 내부 이름을 덮어써도 다음 실행이 깨지지 않고, 이전 실행의 변수도 남지 않는다', () => {
    const runs = runPythonJobs([
      { id: 'a', label: 'x', code: 'from vpython import *\n_reset_runtime_state = 0\n_send_commands = None\nleak = 1\nrate = 3\n' },
      { id: 'b', label: 'x', code: 'from vpython import *\nprint("leak" in globals())\nrate(100)\nprint("ran")\n' },
    ]);
    expect(runs.get('a:x').ok).toBe(true);
    expect(runs.get('b:x').ok).toBe(true);
    expect(runs.get('b:x').stdout).toBe('False\nran\n');
  });

  it('from vpython import *가 없어도 API 이름을 쓸 수 있다 (이전과 같은 동작)', () => {
    const r = one('b = box()\nrate(100)\nprint(type(b).__name__)\n');
    expect(r.ok).toBe(true);
    expect(r.stdout).toBe('box\n');
  });

  it('변환기 경고는 warning 메시지로 온다', () => {
    const r = one('from vpython import *\nf = lambda: rate(10)\n');
    expect(r.warnings).toHaveLength(1);
    expect(r.warnings[0]).toContain('lambda');
  });
});
