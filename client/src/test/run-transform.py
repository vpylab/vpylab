#!/usr/bin/env python3
"""
학생 코드 변환기(student-code-transform.py) 테스트 실행기.

표준 입력으로 JSON 배열 [{ "id": str, "code": str, "inputs": [str, ...] }]을 받아 코드마다
  1. 변환 결과를 문자열(ast.unparse)로,
  2. compile_student_code()로 컴파일해 가짜 rate/sleep/악기/input/scene과 함께 실제로 실행한 결과
     (stdout, 대기 호출 기록, 예외)
를 JSON 배열로 돌려준다. 실제 API 대신 가짜 대기 함수를 쓰므로 변환의 의미(어디에 await가 붙고
어떤 함수가 async가 되는지)만 검사한다. 런타임 동작은 run-vpython.py(실제 vpython-api.py)로 검사한다.
"""
import asyncio
import contextlib
import inspect
import io
import json
import sys
import traceback
import types
from pathlib import Path

TRANSFORM_PATH = Path(__file__).resolve().parents[1] / 'engine' / 'student-code-transform.py'

transform = types.ModuleType('_vpylab_transform')
exec(compile(TRANSFORM_PATH.read_text(encoding='utf-8'), str(TRANSFORM_PATH), 'exec'), transform.__dict__)


def make_namespace(log, inputs):
    """가짜 대기 함수가 든 학생 전역"""
    answers = iter(inputs)

    async def rate(fps, callback=None):
        log.append(f'rate({fps})')
        await asyncio.sleep(0)
        if callback is not None:
            result = callback()
            if inspect.iscoroutine(result):
                await result

    async def sleep(seconds):
        log.append(f'sleep({seconds})')
        await asyncio.sleep(0)

    async def 악기(*args, **kwargs):
        log.append('악기')
        await asyncio.sleep(0)

    async def 음표(*args, **kwargs):
        log.append('음표')
        await asyncio.sleep(0)

    async def 화음(*args, **kwargs):
        log.append('화음')
        await asyncio.sleep(0)

    async def input(prompt=''):
        value = next(answers, '')
        log.append(f'input({prompt!r})={value!r}')
        return value

    class Scene:
        async def waitfor(self, names):
            log.append(f'waitfor({names})')
            return types.SimpleNamespace(event=names, pos=(1, 2, 0), key='a')

        async def pause(self, text=''):
            log.append('pause')
            return await self.waitfor('click')

        def bind(self, names, handler=None):
            if handler is None:
                return lambda fn: fn
            return None

    def sphere(**kwargs):
        return types.SimpleNamespace(pos=(0, 0, 0), **kwargs)

    namespace = {
        '__name__': '__main__',
        'rate': rate, 'sleep': sleep, '악기': 악기, '음표': 음표, '화음': 화음, 'input': input,
        'scene': Scene(), 'canvas': lambda **kw: Scene(),
        'vector': lambda x=0, y=0, z=0: (x, y, z), 'sphere': sphere, 'box': sphere,
        transform.RUNTIME_NAME: types.SimpleNamespace(maybe_await=transform.maybe_await, sleep_dispatch=transform.make_sleep_dispatch(asyncio.sleep)),
    }
    return namespace


def run_one(job):
    code_text = job.get('code', '')
    result = {'id': job.get('id'), 'code': None, 'warnings': [], 'stdout': '', 'log': [], 'error': None}
    try:
        result['code'], result['warnings'] = transform.unparse_student_code(code_text)
        code_obj, _ = transform.compile_student_code(code_text, '<student>')
    except SyntaxError as exc:
        result['error'] = f'SyntaxError: {exc.msg} (line {exc.lineno}, file {exc.filename})'
        return result
    log = []
    namespace = make_namespace(log, job.get('inputs', []))
    stdout = io.StringIO()

    async def main():
        value = eval(code_obj, namespace)
        if inspect.iscoroutine(value):
            await value

    try:
        with contextlib.redirect_stdout(stdout):
            asyncio.run(asyncio.wait_for(main(), timeout=5))
    except BaseException as exc:  # noqa: BLE001 — 학생 코드의 모든 오류를 보고한다
        tb = traceback.extract_tb(exc.__traceback__)
        student = [f for f in tb if f.filename == '<student>']
        result['error'] = f'{type(exc).__name__}: {exc}'
        result['errorLine'] = student[-1].lineno if student else None
    result['stdout'] = stdout.getvalue()
    result['log'] = log
    return result


def main():
    jobs = json.loads(sys.stdin.read() or '[]')
    sys.stdout.write(json.dumps([run_one(job) for job in jobs], ensure_ascii=False))


if __name__ == '__main__':
    main()
