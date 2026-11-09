import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('실제 Python 음향 API는 한국어 변화음과 숫자·음 이름 화음을 같은 주파수로 전송한다', () => {
  const filename = fileURLToPath(new URL('../../client/src/engine/vpython-api.py', import.meta.url));
  const program = `
import asyncio, json, math, runpy, sys, types
messages = []
sys.modules['js'] = types.SimpleNamespace(postMessage=messages.append, _getCurrentRunId=lambda: 1)
api = runpy.run_path(sys.argv[1])
resolve = api['_resolve_note_name']
for raw, expected in [('도', 'C4'), ('도4', 'C4'), ('도#', 'C#4'), ('도#4', 'C#4'), ('솔#5', 'G#5'), ('레b3', 'Db3'), ('F#', 'F#4'), ('Bb3', 'Bb3')]:
    assert resolve(raw) == expected, raw
api['play_note']('솔#5', 0)
asyncio.run(api['화음'](['도4', '미4', '솔4'], 0))  # 화음은 대기형이라 기다려야 소리 명령을 보낸다
api['play_chord']([440, '라', 'C#4', '레b4'], 0)
api['play_chord']([261.63, 329.63, 392], 0)
api['_send_commands']()
commands = [cmd for msg in messages for cmd in json.loads(msg)['commands'] if cmd.get('action') == 'sound']
assert commands[0]['name'] == 'G#5'
for actual, expected in zip(commands[1]['frequencies'], [261.625565, 329.627557, 391.995436]):
    assert math.isclose(actual, expected, abs_tol=0.00001)
mixed = commands[2]['frequencies']
assert mixed[:2] == [440, 440] and math.isclose(mixed[2], mixed[3])
assert commands[3]['frequencies'] == [261.63, 329.63, 392]
for invalid in ['없는음', 'C4#4', 'A4junk']:
    try:
        api['play_chord']([invalid], 0)
    except ValueError:
        pass
    else:
        raise AssertionError(invalid)
`;
  const result = spawnSync('python3', ['-', filename], { input: program, encoding: 'utf8', timeout: 10_000 });
  assert.equal(result.status, 0, result.stderr || result.error?.message);
});
