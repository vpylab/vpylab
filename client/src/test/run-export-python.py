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


async def fire_events(namespace, events, commands):
    """HTML의 JavaScript가 넘기는 것과 같은 모양으로 키·마우스 이벤트를 보낸다.
    고른 물체는 "pick": "@이름"처럼 학생 코드의 변수 이름으로 적을 수 있다."""
    for event in events:
        if event['type'] == 'key':
            namespace['_key_event'](event['name'], event['key'])
        else:
            payload = dict(event['payload'])
            pick = payload.get('pick')
            if isinstance(pick, str) and pick.startswith('@'):
                payload['pick'] = namespace['_student_globals'][pick[1:]]._id
            namespace['_mouse_event'](json.dumps(payload))
        # 처리기 안의 rate()까지 끝나도록 이벤트 루프를 넉넉히 돌린다.
        for _ in range(event.get('ticks', 20)):
            await original_sleep(0)
        commands.append({'action': 'event_done', 'event': event.get('label', event['type'])})


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
        namespace['_student_globals'] = student
        result = eval(compiled, student)
        if inspect.isawaitable(result):
            asyncio.run(result)
        namespace['_send_commands']()
        if job.get('events'):
            asyncio.run(fire_events(namespace, job['events'], commands))
    except Exception as exc:
        error = f'{type(exc).__name__}: {exc}'
    results.append({'id': job['id'], 'error': error, 'commands': commands, 'batchEnds': batch_ends})
json.dump(results, sys.stdout, ensure_ascii=False)
