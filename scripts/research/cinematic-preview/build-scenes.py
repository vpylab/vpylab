"""실제 학생 코드를 실행해 두 렌더링 모드가 함께 쓸 입력을 만든다."""
import json
from pathlib import Path
import subprocess
import sys

HERE = Path(__file__).resolve().parent
RUNNER = HERE.parents[2] / "client/src/test/run-vpython.py"


def run(code, frames):
    cases = [{"id": "preview", "label": "preview", "rateLimit": frames, "code": code}]
    output = subprocess.check_output([sys.executable, RUNNER], input=json.dumps(cases).encode())
    result = json.loads(output)[0]
    if not result["ok"]:
        raise RuntimeError(result["error"])
    return result["commands"]


orbit = (HERE / "orbit.py").read_text()
keys = (HERE / "keys.py").read_text()
commands = run(orbit, 1440)
positions = [cmd["pos"] for cmd in commands if cmd["action"] == "update" and "pos" in cmd]
assert len(positions) == 2880
setup = keys.split("while True:", 1)[0]
key_commands = run(setup, 1)
notes = run(setup + "\nfor name in notes:\n    play_note(name, duration=0.7)", 1)
data = {
    "orbit": [cmd for cmd in commands if cmd["action"] == "create"],
    "frames": list(zip(positions[::2], positions[1::2])),
    "keys": [cmd for cmd in key_commands if cmd["action"] == "create"],
    "notes": [cmd for cmd in notes if cmd["action"] == "sound"],
    "source": [orbit, keys],
}
assert len(data["notes"]) == len(data["keys"]) == 5
(HERE / "scenes.json").write_text(json.dumps(data, separators=(",", ":")))
