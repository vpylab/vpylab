import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { runInNewContext } from 'node:vm';
import { generateStandaloneHTML } from './export-html.js';
import { generateStandaloneHTML as generateShared } from './standalone-template.js';
import course from '../../client/src/data/light-sound-course.js';

const editorTransform = readFileSync(new URL('../../client/src/engine/student-code-transform.py', import.meta.url), 'utf8');
const embeddedTransform = page => {
  const expression = page.match(/const transformSrc = decodeURIComponent\(escape\(atob\('[A-Za-z0-9+/=]+'\)\)\);/);
  assert(expression);
  return runInNewContext(`${expression[0]}\ntransformSrc`, { atob });
};

function requirePython(t) {
  if (!spawnSync('python3', ['--version']).error) return true;
  assert(!process.env.CI, 'CI에는 Python 실행 환경이 필요합니다.');
  t.skip('Python 실행 환경 없음');
  return false;
}
test('서버에 패키징한 학생 코드 변환기는 편집기와 같은 원본이다', () => {
  assert.equal(readFileSync(new URL('./student-code-transform.py', import.meta.url), 'utf8'), editorTransform);
});

test('서버와 브라우저의 공유 HTML은 같은 템플릿과 변환기를 사용한다', () => {
  const code = course.lessons[0].code;
  const options = { repoUrl: 'https://github.com/example/test', openInVpylabUrl: 'https://vpylab.vercel.app/sandbox' };
  assert.equal(generateStandaloneHTML(code, '소리 검증', options), generateShared(code, '소리 검증', options, editorTransform));
});

test('HTML에 삽입한 변환기는 백슬래시·백틱·템플릿·script 종료 문자열도 보존한다', () => {
  const transform = editorTransform + '\n# \\ ` ${value} </script> 한글\n';
  assert.equal(embeddedTransform(generateShared('', '검증', {}, transform)), transform);
});

test('HTML의 실제 JavaScript가 넘기는 Python 실행 문자열과 콘솔 줄바꿈이 유효하다', t => {
  if (!requirePython(t)) return;
  const page = generateStandaloneHTML(course.lessons[0].code);
  const runner = page.match(/const runner = \[[\s\S]*?\]\.join\([^;]*\);/);
  assert(runner);
  const actualRunner = runInNewContext(`${runner[0]}\nrunner`);
  const consoleExpression = [...page.matchAll(/await pyodide\.runPythonAsync\((`[\s\S]*?`)\);/g)]
    .find(match => match[1].includes('class _ConsoleWriter:'));
  assert(consoleExpression);
  const actualConsole = runInNewContext(consoleExpression[1]);
  const verify = `import sys, json, ast
payload = json.load(sys.stdin)
compile(payload['runner'], '<html-runner>', 'exec', flags=ast.PyCF_ALLOW_TOP_LEVEL_AWAIT)
original = sys.stdout
lines = []
namespace = {'_js_log': lines.append}
exec(payload['console'], namespace)
print('첫 줄')
print('둘째 줄')
sys.stdout.flush()
sys.stdout = original
print(json.dumps(lines, ensure_ascii=False))
`;
  const result = spawnSync('python3', ['-I', '-c', verify], {
    input: JSON.stringify({ runner: actualRunner, console: actualConsole }), encoding: 'utf8', timeout: 15000,
  });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), ['첫 줄', '둘째 줄']);
});

test('서버가 생성한 Pages HTML에서 한국어·영어 대기형 소리가 실제 발생한다', t => {
  if (!requirePython(t)) return;
  const page = generateStandaloneHTML(course.lessons[0].code);
  const api = page.match(/const vpythonApi = (`[\s\S]*?`);/);
  assert(api);
  const runner = page.match(/const runner = \[[\s\S]*?\]\.join\([^;]*\);/);
  assert(runner);
  const moduleSetup = [...page.matchAll(/await pyodide\.runPythonAsync\((`[\s\S]*?`)\);/g)]
    .find(match => match[1].includes('vpython_module ='));
  assert(moduleSetup);
  const transform = embeddedTransform(page);
  assert.equal(transform, editorTransform);
  // 별도 학생 실행 헬퍼 대신 HTML의 모듈 등록·runner·변환기를 그대로 실행합니다.
  const verify = `import asyncio, ast, json, sys
payload = json.loads(sys.stdin.readline())
original_sleep = asyncio.sleep
async def fast_sleep(seconds, result=None):
    await original_sleep(0)
    return result
asyncio.sleep = fast_sleep
results = []
for job in payload['jobs']:
    commands = []
    namespace = {'__name__': '__export_api__', '__vpylab_source__': job['code'],
        '__vpylab_transform_source__': payload['transform'],
        '_js_process_batch': lambda message: commands.extend(json.loads(message)['commands'])}
    error = None
    try:
        exec(compile(payload['api'], '<html-api>', 'exec'), namespace)
        exec(compile(payload['moduleSetup'], '<html-module>', 'exec'), namespace)
        compiled = compile(payload['runner'], '<html-runner>', 'exec', flags=ast.PyCF_ALLOW_TOP_LEVEL_AWAIT)
        asyncio.run(eval(compiled, namespace))
        namespace['_send_commands']()
    except Exception as exc:
        error = f'{type(exc).__name__}: {exc}'
    results.append({'id': job['id'], 'error': error, 'commands': commands})
print(json.dumps(results, ensure_ascii=False))
`;
  const result = spawnSync('python3', ['-I', '-c', verify], {
    input: JSON.stringify({ api: runInNewContext(api[1]), transform,
      runner: runInNewContext(`${runner[0]}\nrunner`), moduleSetup: runInNewContext(moduleSetup[1]),
      jobs: [...course.lessons.map(lesson => ({ id: lesson.id, code: lesson.code })), {id:'english-wait', code:'from vpython import *\nplay_note_and_wait("C4", 0.2)'}] }) + '\n',
    encoding: 'utf8', timeout: 15000, maxBuffer: 16 * 1024 * 1024,
  });
  assert.equal(result.status, 0, result.stderr);
  assert(!result.stderr.includes('was never awaited'), result.stderr);
  const jobs = JSON.parse(result.stdout.trim().split('\n').at(-1));
  assert.equal(jobs.length, 9);
  for (const job of jobs) assert.equal(job.error, null, JSON.stringify(job));
  assert(jobs[0].commands.some(command => command.action === 'sound'));
  assert(jobs.at(-1).commands.some(command => command.action === 'sound' && command.name === 'C4'));
});

test('공유 HTML의 위치 벡터는 입력을 공유하지 않고 저장한 참조의 연속 수정도 화면 명령으로 보낸다', t => {
  if (!requirePython(t)) return;
  const expression = generateStandaloneHTML('').match(/const vpythonApi = (`[\s\S]*?`);/);
  assert(expression);
  const verify = `import sys, json
commands=[]
namespace={'_js_process_batch':lambda message:commands.extend(json.loads(message)['commands']),
 '_js_compound_bounds':lambda ids:json.dumps({'center':[0,0,0],'size':[1,1,1]})}
exec(json.load(sys.stdin)['api'],namespace)
exec('''
origin=vector(3,0,0)
a=compound([sphere()],pos=origin)
b=compound([sphere()],pos=origin)
origin.x=9
assert a.pos.x==3 and b.pos.x==3
p=a.pos
p.x=1
p.y=2
assert a.pos==vector(1,2,0)
a.pos=vector(7,8,9)
p.z=6
assert a.pos==vector(7,8,9)
a.color=a.pos
old_color=a.color
a.color=vector(1,0,0)
old_color.z=0.25
assert a.color==vector(1,0,0) and a.pos==vector(7,8,9)
s=sphere(pos=origin)
q=s.pos
q.x=4
q.y=5
assert s.pos==vector(4,5,0) and origin==vector(9,0,0)
s.color=s.pos
q.y=0.5
assert s.color==vector(4,5,0)
s.color.z=0.25
assert s.pos==vector(4,0.5,0)
_send_commands()
''',namespace)
assert [c for c in commands if c.get('id')==namespace['a']._id and 'pos' in c and c['action']=='update'][-1]['pos']==[7,8,9]
assert [c['color'] for c in commands if c.get('id')==namespace['a']._id and c['action']=='update' and 'color' in c]==[[7,8,9],[1,0,0]]
assert [c for c in commands if c.get('id')==namespace['s']._id and c['action']=='update'][-2:]==[
 {'action':'update','id':namespace['s']._id,'pos':[4,0.5,0]},
 {'action':'update','id':namespace['s']._id,'color':[4,5,0.25]}]
print('POSITION_REFERENCES_OK')
`;
  const result=spawnSync('python3',['-I','-c',verify],{input:JSON.stringify({api:runInNewContext(expression[1])}),encoding:'utf8',timeout:15000});
  assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/POSITION_REFERENCES_OK/);
});
