"""독립 실행 HTML에 실제 포함된 Python API로 교재 코드를 실행합니다."""
import asyncio
import inspect
import json
import sys
import types

# 한 줄 JSON을 읽어 입력 파이프 전체가 닫힐 때까지 기다리지 않습니다.
payload = json.loads(sys.stdin.readline())
transform = types.ModuleType('_vpylab_transform')
exec(compile(payload['transform'], '<export-transform>', 'exec'), transform.__dict__)
original_sleep = asyncio.sleep


async def fast_sleep(seconds, result=None):
    await original_sleep(0)
    return result


results = []
for job in payload['jobs']:
    commands = []
    batch_ends = []
    asyncio.sleep = original_sleep if job.get('realTime') else fast_sleep

    def collect_batch(message):
        commands.extend(json.loads(message)['commands'])
        if job.get('realTime'):
            batch_ends.append(len(commands))

    namespace = {'__name__': '__export_api__', '_js_process_batch': collect_batch}
    error = None
    try:
        exec(compile(payload['api'], '<export-api>', 'exec'), namespace)
        module = types.ModuleType('vpython')
        for name, value in namespace.items():
            if not name.startswith('_'):
                setattr(module, name, value)
        sys.modules['vpython'] = module
        transform.sleep_dispatch = transform.make_sleep_dispatch(namespace['sleep'])
        compiled, _ = transform.compile_student_code(job['code'], '<student>')
        student = {name: value for name, value in namespace.items() if not name.startswith('_')}
        student.update({'__name__': '__main__', transform.RUNTIME_NAME: transform})
        result = eval(compiled, student)
        if inspect.isawaitable(result):
            asyncio.run(result)
        namespace['_send_commands']()
    except Exception as exc:
        error = f'{type(exc).__name__}: {exc}'
    results.append({'id': job['id'], 'error': error, 'commands': commands, 'batchEnds': batch_ends})
json.dump(results, sys.stdout, ensure_ascii=False)
