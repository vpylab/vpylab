/**
 * 학생 코드 변환기 테스트 — student-code-transform.py
 *
 * 변환은 Worker 안의 Python(ast)이 맡는다. 이 테스트는 같은 파일을 CPython으로 실행해(src/test/run-transform.py)
 * 변환 결과(ast.unparse)와 경고를 보고, compile_student_code()로 컴파일한 코드를 가짜 rate/sleep/input/scene과
 * 함께 실제로 실행해 출력·대기 호출 순서·예외를 검사한다.
 * 구조 문제(D1·D2·D3), 대기 함수(B2·B3·C3), 검토에서 나온 재현 사례(이름 겹침·스코프·가림·언패킹·간접 호출·
 * 기본 인수·제너레이터식·클래스 본문)를 포함한다. python3가 없는 환경에서는 건너뛴다 (CI는 Python 3.12를 설치한다).
 */
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const RUNNER = path.resolve(globalThis.process?.cwd?.() ?? '.', 'src/test/run-transform.py');

function findPython() {
  for (const candidate of ['python3.12', 'python3']) {
    const probe = spawnSync(candidate, ['-c', 'import sys; assert sys.version_info >= (3, 9)'], { encoding: 'utf8' });
    if (probe.status === 0) return candidate;
  }
  return null;
}

const python = findPython();

/** 여러 코드를 한 번의 python 호출로 변환·실행한다 */
function runAll(jobs) {
  const proc = spawnSync(python, ['-I', RUNNER], { input: JSON.stringify(jobs), encoding: 'utf8', maxBuffer: 1 << 26 });
  if (proc.status !== 0) throw new Error(`run-transform.py 실패:\n${proc.stderr}`);
  return JSON.parse(proc.stdout);
}

const run = (code, inputs = []) => runAll([{ id: 't', code, inputs }])[0];
const lines = (code) => code.split('\n').map((line) => line.trim()).filter(Boolean);
const MAYBE = '__vpylab_rt__.maybe_await';

describe.skipIf(!python)('학생 코드 변환기 — 기본 변환', { timeout: 60_000 }, () => {
  it('rate()·sleep()·악기()·input()을 await로 바꾸고 모듈 수준에 둔다 (함수로 감싸지 않는다)', () => {
    const r = run('rate(30)\nsleep(1)\n악기("피아노", "도")\nname = input("이름: ")\nprint(name)', ['송']);
    expect(lines(r.code)).toEqual(['await rate(30)', 'await sleep(1)', "await 악기('피아노', '도')", "name = await input('이름: ')", 'print(name)']);
    expect(r.code).not.toContain('async def __vpylab_main__');
    expect(r.warnings).toEqual([]);
    expect(r.error).toBeNull();
    expect(r.log).toEqual(['rate(30)', 'sleep(1)', '악기', "input('이름: ')='송'"]);
    expect(r.stdout).toBe('송\n');
  });

  it('import 문은 제자리에 남고 줄 순서가 바뀌지 않는다', () => {
    const { code } = run('ball = sphere()\nimport math\nwhile True:\n    rate(30)\n    break');
    expect(lines(code)).toEqual(['ball = sphere()', 'import math', 'while True:', 'await rate(30)', 'break']);
  });

  it('이미 await가 있으면 중복하지 않는다', () => {
    const r = run('await rate(30)\nasync def f():\n    await sleep(1)\nf()');
    expect(r.code).not.toContain('await await');
    expect(r.code).toContain('await f()');
    expect(r.error).toBeNull();
    expect(r.log).toEqual(['rate(30)', 'sleep(1)']);
  });

  it('문자열·주석 안의 rate()는 건드리지 않는다', () => {
    const r = run('print("rate(30)")  # rate(30)\nx = """\nrate(1)\n"""\nprint(\'sleep(1)\')');
    expect(r.code).not.toContain('await');
    expect(r.log).toEqual([]);
  });

  it('표준 time.sleep만 대기 경로에 연결하고 다른 이름은 보존한다', () => {
    const { code } = run('import time\ntime.sleep(0)\ndef generate(n):\n    return n\ngenerate(10)\n내악기 = print\n내악기(1)\nsleep(1)');
    expect(code).toContain('sleep_dispatch(time.sleep)(0)');
    expect(code).toContain('\ngenerate(10)');
    expect(code).toContain('내악기(1)');
    expect(code).toContain('await sleep(1)');
    expect(code).not.toContain('await time.sleep');
  });

  it('표준 대기의 별칭·최소 시간·이름을 가리는 사용자 함수를 보존한다', () => {
    const result = run(`import time as clock
from time import sleep as pause
start = clock.monotonic()
clock.sleep(.015)
wait = pause
wait(.015)
assert clock.monotonic() - start >= .030
def pause(value):
    return value + 1
def example(clock):
    return clock.sleep(3)
class Clock:
    def sleep(self, value):
        return value * 2
print(pause(3), example(Clock()))
try:
    wait(-1)
except ValueError:
    print("negative")`);
    expect(result.error).toBeNull();
    expect(result.stdout).toBe('4 6\nnegative\n');
  });

  it('rate/sleep가 없는 코드는 그대로다', () => {
    expect(run('x = 1\nprint(x)').code).toBe('x = 1\nprint(x)');
    expect(run('').code).toBe('');
  });

  it('모듈 별칭(vp.rate)과 이름 별칭(from vpython import sleep as zz)도 인식한다 (D3)', () => {
    const { code } = run('import vpython as vp\nfrom vpython import sleep as zz\nvp.rate(30)\nvp.scene.pause()\nzz(1)');
    expect(code).toContain('await vp.rate(30)');
    expect(code).toContain('await vp.scene.pause()');
    expect(code).toContain('await zz(1)');
  });

  it('SyntaxError는 학생 파일 이름과 줄 번호로 올라온다', () => {
    const r = run('x = (\ny = 2');
    expect(r.error).toContain('SyntaxError');
    expect(r.error).toContain('line 1');
    expect(r.error).toContain('<student>');
  });

  it('실행 오류의 줄 번호가 학생 코드 줄 번호와 같다', () => {
    const r = run('def f():\n    rate(1)\n    return 1 / 0\nf()');
    expect(r.error).toBe('ZeroDivisionError: division by zero');
    expect(r.errorLine).toBe(3);
  });
});

describe.skipIf(!python)('D1 — 함수·메서드 안의 rate()', { timeout: 60_000 }, () => {
  it('rate()가 든 def를 async def로 바꾸고 호출에 await를 붙인다', () => {
    const r = run('def step(n):\n    for i in range(n):\n        rate(50)\nstep(2)\nprint("ok")');
    expect(r.code).toContain('async def step(n):');
    expect(r.code).toContain('await rate(50)');
    expect(r.code).toContain('await step(2)');
    expect(r.warnings).toEqual([]);
    expect(r.log).toEqual(['rate(50)', 'rate(50)']);
    expect(r.stdout).toBe('ok\n');
  });

  it('호출 그래프를 따라 전파한다 — rate()를 부르는 함수를 부르는 함수도 async', () => {
    const r = run('def wait():\n    sleep(1)\ndef twice():\n    wait()\n    wait()\ndef nothing():\n    return 1\ntwice()\nprint(nothing())');
    expect(r.code).toContain('async def wait():');
    expect(r.code).toContain('async def twice():');
    expect(r.code).toContain('await wait()');
    expect(r.code).toContain('await twice()');
    expect(r.code).toContain('\ndef nothing():');
    expect(r.code).toContain('print(nothing())');
    expect(r.log).toEqual(['sleep(1)', 'sleep(1)']);
    expect(r.stdout).toBe('1\n');
  });

  it('중첩 함수도 바꾼다', () => {
    const r = run('def outer():\n    def inner():\n        sleep(1)\n    inner()\n    return 1\nprint(outer())');
    expect(r.code).toContain('async def outer():');
    expect(r.code).toContain('async def inner():');
    expect(r.code).toContain('await inner()');
    expect(r.stdout).toBe('1\n');
  });

  it('클래스 메서드: self·인스턴스 변수는 확정 await, 동기 메서드는 그대로', () => {
    const source = [
      'class Ball:',
      '    def __init__(self):',
      '        self.n = 0',
      '    def step(self):',
      '        rate(60)',
      '        self.helper()',
      '    def helper(self):',
      '        self.n += 1',
      '    def run(self):',
      '        self.step()',
      'b = Ball()',
      'b.run()',
      'print(b.n)',
    ].join('\n');
    const r = run(source);
    expect(r.code).toContain('async def step(self):');
    expect(r.code).toContain('async def run(self):');
    expect(r.code).toContain('await self.step()');
    expect(r.code).toContain('await b.run()');
    expect(r.code).toContain('\n    def helper(self):');
    expect(r.code).toContain('self.helper()');
    expect(r.code).not.toContain('await self.helper');
    expect(r.stdout).toBe('1\n');
  });

  it('재귀와 rate(fps, callback) 형식(공식 예제 Bounce-Callbacks)을 처리한다', () => {
    const { code } = run('n = 0\ndef move():\n    global n\n    n += 1\n    if n < 3:\n        rate(200, move)\nmove()\nprint(n)');
    expect(code).toContain('async def move():');
    expect(code).toContain('await rate(200, move)');
    expect(code).toContain('await move()');
  });

  it('데코레이터로 등록한 핸들러도 async가 된다', () => {
    const { code } = run("@scene.bind('click')\ndef on_click(ev):\n    rate(10)");
    expect(code).toContain("@scene.bind('click')\nasync def on_click(ev):");
  });

  it('lambda 안의 rate()는 바꾸지 않고 경고한다', () => {
    const r = run('f = lambda: rate(10)\nprint("ok")');
    expect(r.code).toContain('lambda: rate(10)');
    expect(r.warnings).toHaveLength(1);
    expect(r.warnings[0]).toContain('lambda');
    expect(r.warnings[0]).toContain('1번 줄');
  });

  it('yield가 있는 함수와 __init__ 안의 rate()는 바꾸지 못하고 경고한다', () => {
    const gen = run('def gen():\n    for i in range(3):\n        rate(1)\n        yield i');
    expect(gen.code).toContain('def gen():');
    expect(gen.code).not.toContain('async def');
    expect(gen.warnings[0]).toContain('yield');
    const init = run('class A:\n    def __init__(self):\n        rate(1)');
    expect(init.code).not.toContain('async def');
    expect(init.warnings[0]).toContain('__init__');
  });
});

describe.skipIf(!python)('D2 — 모듈 전역과 global 선언', { timeout: 60_000 }, () => {
  it('프로그램을 함수로 감싸지 않으므로 global을 쓰는 함수가 동작한다', () => {
    const r = run('score = 0\ndef hit():\n    global score\n    score += 1\nfor i in range(3):\n    rate(60)\n    hit()\nprint(score)');
    expect(lines(r.code).slice(0, 4)).toEqual(['score = 0', 'def hit():', 'global score', 'score += 1']);
    expect(r.stdout).toBe('3\n');
  });
});

describe.skipIf(!python)('B2·B3·C3 — scene.pause()·scene.waitfor()·input()', { timeout: 60_000 }, () => {
  it('scene.waitfor와 scene.pause 호출에 await를 붙이고, 그 안에 든 함수도 async로 바꾼다', () => {
    const r = run("ev = scene.waitfor('click')\nprint(ev.pos)\nscene.pause()\ndef wait_key():\n    return scene.waitfor('keydown')\nk = wait_key()\nprint(k.key)");
    expect(r.code).toContain("ev = await scene.waitfor('click')");
    expect(r.code).toContain('await scene.pause()');
    expect(r.code).toContain('async def wait_key():');
    expect(r.code).toContain("return await scene.waitfor('keydown')");
    expect(r.code).toContain('k = await wait_key()');
    expect(r.log).toEqual(["waitfor(click)", 'pause', "waitfor(click)", "waitfor(keydown)"]);
    expect(r.stdout).toBe('(1, 2, 0)\na\n');
  });

  it('scene을 다른 이름에 담거나 canvas()로 만들어도 기다리고, 모르는 객체의 pause()는 런타임 보조로 넘긴다', () => {
    const r = run("s = scene\ns.pause()\nc = canvas()\nc.waitfor('click')\nclass Player:\n    def pause(self):\n        return 'paused'\nplayer = Player()\nprint(player.pause())");
    expect(r.code).toContain('await s.pause()');
    expect(r.code).toContain(`await ${MAYBE}(c.waitfor('click'))`);
    expect(r.code).toContain('print(player.pause())');
    expect(r.error).toBeNull();
    expect(r.stdout).toBe('paused\n');
  });

  it('input()은 키워드 인자 형식도 await를 붙이고, 함수 안이면 그 함수를 async로 바꾼다', () => {
    const r = run("def ask():\n    return int(input(prompt='나이: '))\nage = ask()\nprint(age + 1)", ['17']);
    expect(r.code).toContain('async def ask():');
    expect(r.code).toContain("return int(await input(prompt='나이: '))");
    expect(r.code).toContain('age = await ask()');
    expect(r.stdout).toBe('18\n');
  });
});

describe.skipIf(!python)('검토 재현 사례 — 이름 겹침·스코프·가림·간접 호출', { timeout: 60_000 }, () => {
  it('1. 사용자 메서드 이름이 내장 메서드와 같아도 수신자를 모르는 호출은 런타임 보조로 기다린다', () => {
    const source = [
      'class Ball:',
      '    def __init__(self):',
      '        self.n = 0',
      '    def update(self):',
      '        rate(60)',
      '        self.n += 1',
      'balls = [Ball(), Ball()]',
      'for b in balls:',
      '    b.update()',
      'balls[0].update()',
      'class Game:',
      '    def __init__(self):',
      '        self.ball = Ball()',
      '    def tick(self):',
      '        self.ball.update()',
      'g = Game()',
      'g.tick()',
      'print(balls[0].n, balls[1].n, g.ball.n)',
    ].join('\n');
    const r = run(source);
    expect(r.code).toContain(`await ${MAYBE}(b.update())`);
    expect(r.code).toContain(`await ${MAYBE}(balls[0].update())`);
    expect(r.code).toContain(`await ${MAYBE}(self.ball.update())`);
    expect(r.code).toContain('await g.tick()');
    expect(r.error).toBeNull();
    expect(r.log).toEqual(['rate(60)', 'rate(60)', 'rate(60)', 'rate(60)']);
    expect(r.stdout).toBe('2 1 1\n');
  });

  it('2. 같은 이름의 다른 객체(random.choice, 지역 dict.update)는 깨지지 않는다', () => {
    const source = [
      'import random',
      'class P:',
      '    def choice(self):',
      '        sleep(1)',
      '    def update(self):',
      '        rate(1)',
      'x = random.choice([7])',
      'p = P()',
      'def other():',
      '    p = {}',
      '    p.update({"a": 1})',
      '    return p',
      'print(x, other())',
      'p.update()',
      'print("done")',
    ].join('\n');
    const r = run(source);
    expect(r.code).toContain('x = random.choice([7])');
    expect(r.code).not.toContain('await random.choice');
    expect(r.code).toContain(`await ${MAYBE}(p.update({'a': 1}))`);
    expect(r.code).toContain('\nawait p.update()');
    expect(r.error).toBeNull();
    expect(r.stdout).toBe("7 {'a': 1}\ndone\n");
  });

  it('3. 같은 이름의 중첩 함수·생성기·다른 클래스 메서드는 따로 판단한다', () => {
    const source = [
      'def f():',
      '    for i in range(2):',
      '        yield i',
      'def outer():',
      '    def f():',
      '        rate(1)',
      '    f()',
      'outer()',
      'class A:',
      '    def step(self):',
      '        yield 1',
      'class Ball:',
      '    def step(self):',
      '        rate(1)',
      'b = Ball()',
      'b.step()',
      'print(list(f()), list(A().step()))',
    ].join('\n');
    const r = run(source);
    expect(r.code).toMatch(/^def f\(\):/m);
    expect(r.code).toContain('    async def f():');
    expect(r.code).toContain('    await f()');
    expect(r.code).toContain('    def step(self):\n        yield 1');
    expect(r.code).toContain('    async def step(self):\n        await rate(1)');
    expect(r.code).toContain('await b.step()');
    expect(r.warnings).toEqual([]);
    expect(r.error).toBeNull();
    expect(r.stdout).toBe('[0, 1] [1]\n');
  });

  it('4. 대입·매개변수로 가린 이름은 대기 함수로 보지 않는다', () => {
    const r = run('rate = lambda n: 7\nprint(rate(1))\ndef g(sleep):\n    return sleep(1)\nprint(g(lambda n: n + 1))');
    expect(r.code).toContain('print(rate(1))');
    expect(r.code).toContain(`await ${MAYBE}(sleep(1))`);
    expect(r.error).toBeNull();
    expect(r.stdout).toBe('7\n2\n');
  });

  it('5. 튜플 언패킹 인스턴스·변수에 담은 함수·호출 결과·딕셔너리 디스패치·고차 함수 매개변수', () => {
    const source = [
      'class Player:',
      '    def update(self):',
      '        rate(1)',
      'p1, p2 = Player(), Player()',
      'p1.update()',
      'def move():',
      '    rate(2)',
      'f = move',
      'f()',
      'def make():',
      '    return move',
      'make()()',
      'actions = {"m": move}',
      'actions["m"]()',
      'def run(fn):',
      '    fn()',
      'run(move)',
      'print("ok")',
    ].join('\n');
    const r = run(source);
    expect(r.code).toContain('await p1.update()');
    expect(r.code).toContain('\nawait f()');
    expect(r.code).toContain(`await ${MAYBE}(make()())`);
    expect(r.code).toContain(`await ${MAYBE}(actions['m']())`);
    expect(r.code).toContain(`await ${MAYBE}(fn())`);
    expect(r.code).toContain('await run(move)');
    expect(r.error).toBeNull();
    expect(r.log).toEqual(['rate(1)', 'rate(2)', 'rate(2)', 'rate(2)', 'rate(2)']);
    expect(r.stdout).toBe('ok\n');
  });

  it('6. 중첩 함수의 기본 인수는 바깥 스코프에서 기다린다', () => {
    const r = run('def outer():\n    def f(x=input("x")):\n        return x\n    return f()\nprint(outer())', ['v']);
    expect(r.code).toContain('async def outer():');
    expect(r.code).toContain("async def f(x=await input('x')):");
    expect(r.error).toBeNull();
    expect(r.stdout).toBe('v\n');
  });

  it('7. 제너레이터식 안의 대기 함수는 경고하고, 리스트 컴프리헨션은 기다린다', () => {
    const r = run('ys = [sleep(0) for i in range(2)]\nprint(len(ys))\nxs = list(sleep(0) for i in range(2))');
    expect(r.code).toContain('ys = [await sleep(0) for i in range(2)]');
    expect(r.code).toContain('xs = list((sleep(0) for i in range(2)))');
    expect(r.warnings[0]).toContain('제너레이터식');
    expect(r.stdout).toBe('2\n');
  });

  it('8. 클래스 본문 수준의 대기 함수는 경고한다', () => {
    const r = run('class K:\n    rate(1)\n    x = 2');
    expect(r.warnings[0]).toContain('클래스 본문');
  });

  it('2차-1. 모듈 수준의 global 선언이 있어도 이름 해석이 끝나고 호출을 기다린다', () => {
    const r = run('global rate\nrate(60)\nglobal x\nx = 1\ndef f():\n    global x\n    x += 1\n    rate(1)\nf()\nprint(x)');
    expect(r.code).toContain('await rate(60)');
    expect(r.code).toContain('async def f():');
    expect(r.error).toBeNull();
    expect(r.stdout).toBe('2\n');
  });

  it('2차-5. 특수 메서드·property는 async로 바꾸지 않고 경고한다', () => {
    const source = [
      'class V:',
      '    def fmt(self, v):',
      '        rate(1)',
      '        return str(v)',
      '    def __str__(self):',
      '        return "V"',
      '    def __eq__(self, o):',
      '        return self.fmt(0) == o',
      '    @property',
      '    def size(self):',
      '        sleep(1)',
      '        return 1',
      'print(V())',
    ].join('\n');
    const r = run(source);
    expect(r.code).toContain('    def __eq__(self, o):');
    expect(r.code).toContain('    def size(self):');
    expect(r.code).not.toContain('async def __eq__');
    expect(r.code).not.toContain('async def size');
    expect(r.warnings.some((w) => w.includes('__eq__'))).toBe(true);
    expect(r.warnings.some((w) => w.includes('size'))).toBe(true);
    expect(r.stdout).toBe('V\n');
  });

  it('2차-6. 부모 클래스의 동기 메서드도 자식이 대기 메서드로 재정의했으면 런타임 보조로 기다린다', () => {
    const r = run('class Base:\n    def step(self):\n        return "base"\nclass Kid(Base):\n    def step(self):\n        rate(1)\n        return "kid"\nb = Base()\nprint(b.step())\nk = Kid()\nprint(k.step())\nfor o in [b, k]:\n    print(o.step())');
    expect(r.code).toContain(`print(await ${MAYBE}(b.step()))`);
    expect(r.code).toContain('print(await k.step())');
    expect(r.error).toBeNull();
    expect(r.stdout).toBe('base\nkid\nbase\nkid\n');
  });

  it('2차-7. lambda·제너레이터식 안의 미확정 호출도 경고한다', () => {
    const r = run('class B:\n    def update(self):\n        rate(1)\nb = B()\nscene.bind("click", lambda e: b.update())\nf = lambda fn: fn()\ng = list(h() for h in [])');
    expect(r.warnings.some((w) => w.includes('5번 줄') && w.includes('b.update()'))).toBe(true);
    expect(r.warnings.some((w) => w.includes('6번 줄') && w.includes('fn()'))).toBe(true);
    expect(r.warnings.some((w) => w.includes('7번 줄') && w.includes('제너레이터식'))).toBe(true);
  });

  it('2차-10. 런타임 보조는 Future 같은 awaitable도 기다리고, async generator는 진단한다', () => {
    const r = run('import asyncio\ndef make():\n    loop = asyncio.get_event_loop()\n    f = loop.create_future()\n    f.set_result(5)\n    return f\ndef call(fn):\n    return fn()\nprint(call(make))\nasync def agen():\n    yield 1\nlist(call(agen))');
    expect(r.stdout).toBe('5\n');
    expect(r.error).toContain('TypeError');
    expect(r.error).toContain('제너레이터');
  });

  it('음표()·화음()도 대기 함수다', () => {
    const r = run('음표("도4", 0.2)\n화음([1, 2], 0.3)\ndef melody():\n    음표("미4")\nmelody()');
    expect(r.code).toContain("await 음표('도4', 0.2)");
    expect(r.code).toContain('async def melody():');
    expect(r.log).toEqual(['음표', '화음', '음표']);
  });

  it('vec = vector 같은 별칭과 다른 모듈의 함수 별칭은 동기로 본다', () => {
    const r = run('vec = vector\nv = vec(1, 2, 3)\nfrom random import choice\nc = choice([5])\nprint(v, c)');
    expect(r.code).not.toContain('await');
    expect(r.stdout).toBe('(1, 2, 3) 5\n');
  });
});
