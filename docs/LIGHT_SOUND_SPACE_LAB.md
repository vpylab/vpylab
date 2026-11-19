# 빛·소리·우주 미니 실험실 · Light, sound and space

[한국어로 만들기 열기](https://vpylab.vercel.app/sandbox?lang=ko) · [Open Create in English](https://vpylab.vercel.app/sandbox?lang=en)

학생은 예제 하나를 복사해 **만들기 → 실행**을 누르세요. 휴대폰에서는 **화면** 탭에서 관찰하고 **코드** 탭으로 돌아와 값 하나를 바꿔 다시 실행하세요. 교사는 먼저 결과를 예상하게 하고, 바꾸기 전후의 차이를 학생 자신의 말로 설명하게 해 주세요. 소리는 모형의 사건이나 측정값을 알려 주는 신호입니다.

Paste one example into **Create**, then press **Run**. On a phone, observe it in the **Screen** tab, then return to **Code**. For a first lesson, predict the result, change one value and run it again. Ask students what changed and what stayed the same. Sounds represent events or measurements in the model.

[7번 한영 25분 활동지와 공통 시각 모델 · Bilingual worksheet and shared visual model](../client/public/projects/light-sound-lab/duet.html)

수업 사이트에서는 7번의 활동지 링크를 누르세요. 실습은 현재 호스트에서 열립니다. / On the lesson site, use the worksheet link under activity 7. Its practice opens on the same host.

## 약 5줄 · First observations

### 1. 어느 쪽이 낮일까? · Which side is day?

왼쪽에서 빛을 비춥니다. `-3`을 `3`으로 바꾸기 전에 밝아질 쪽을 짚어 보세요. / Point to the side that will be lit when you move the light from x = −3 to x = 3.

```python
from vpython import *
scene.lights = []
scene.ambient = color.gray(0.08)
local_light(pos=vector(-3, 1, 2), color=color.white, intensity=40)
sphere(radius=1, color=color.cyan)
```

[바로 실행 · Run][run-1]

### 2. 별의 두 음 · A star plays two notes

별 하나에서 두 음이 차례로 들립니다. 두 번째 음을 `"C4"`로 바꾸면 같은 높이일까요? / The star plays two notes in order. Set the second note to C4 and listen for the difference.

```python
from vpython import *
sphere(color=color.orange, emissive=True)
for note in ["C4", "G4"]:
    play_note_and_wait(note, 0.5)
```

[바로 실행 · Run][run-2]

### 3. 지구를 감싸는 지도 · Wrap a map around Earth

웹의 평면 지도가 구에 감깁니다. 드래그해 반대편 대륙을 찾아보세요. 학교 네트워크에서 그림이 차단되면 마지막 줄의 `texture=url`을 `texture=textures.earth`로 바꾸세요. / Drag to find another continent. If the image host is blocked at school, use the built-in Earth texture in the last line.

```python
from vpython import *
url = "https://raw.githubusercontent.com/mrdoob/three.js/r170/examples/textures/planets/earth_atmos_2048.jpg"
scene.background = color.black
scene.range = 1.65
distant_light(direction=vector(-0.2, -0.1, -1), color=color.white, intensity=5)
sphere(radius=1, color=color.white, texture=url, shininess=0)
```

[바로 실행 · Run][run-3]

외부 그림에는 공유 페이지 대신 이미지 파일의 HTTPS 주소가 필요합니다. 이미지 서버가 다른 사이트에서의 사용(CORS)을 허용하고, 실행 사이트의 보안 정책에서도 허용한 주소여야 합니다. / Use an HTTPS link to the image file. The image host must permit cross-origin use, and the VPyLab deployment must allow that host. [Three.js example texture, r170](https://github.com/mrdoob/three.js/blob/r170/examples/textures/planets/earth_atmos_2048.jpg)

## 약 10줄 · Change one relationship

### 4. 별 앞을 지나는 행성 · A planet crosses a star

작은 행성이 별빛 일부를 가립니다. 행성 반지름을 0.2에서 0.4로 키우면 별에서 가려지는 부분은 어떻게 될까요? / Predict how doubling the planet’s radius changes the patch of starlight it blocks.

```python
from vpython import *
scene.range = 2.6
scene.forward = vector(0, 0, -1)
star = sphere(radius=1, color=color.orange, emissive=True)
planet = sphere(radius=0.2, color=color.gray(0.12))
for step in range(121):
    rate(30)
    x = -2 + step / 30
    planet.pos = vector(x, 0, 1.4)
```

[바로 실행 · Run][run-4]

### 5. 빛으로 읽는 멜로디 · Read a melody in light

음이 높아질수록 더 높은 곳에 빛이 켜집니다. 음 목록만 거꾸로 쓰면 마지막 불빛과 마지막 음은 각각 어떻게 될까요? / Reverse just the list of notes. Predict where the last light appears and which pitch you hear.

```python
from vpython import *
notes = ["C4", "E4", "G4"]
for i, note in enumerate(notes):
    lamp = sphere(pos=vector(i - 1, i / 2, 0), radius=0.25)
    lamp.color = color.yellow
    lamp.emissive = True
    play_note_and_wait(note, 0.6)
    lamp.emissive = False
    lamp.color = color.gray(0.3)
```

[바로 실행 · Run][run-5]

### 6. 달의 거리로 듣는 음높이 · Turn distance into pitch

이 모형은 지구와 위성이 멀어질수록 높은 음을 냅니다. `100`을 `50`으로 줄이면 화면 속 거리와 음 사이 간격은 각각 어떻게 변할까요? / Distance sets pitch. Halve the multiplier from 100 to 50. Compare the spacing you see with the pitch changes you hear.

```python
from vpython import *
scene.range = 5
earth = sphere(pos=vector(-2, 0, 0), texture=textures.earth)
moon = sphere(radius=0.25, color=color.gray(0.8))
for distance in [2, 3, 4, 3, 2]:
    moon.pos = earth.pos + vector(distance, 0, 0)
    frequency = 200 + 100 * distance
    play_sound(frequency, 0.35)
    sleep(0.5)
```

[바로 실행 · Run][run-6]

## 약 20줄 · Model, listen and explain

### 7. 두 행성의 합주 · Two orbital rhythms

두 행성이 오른쪽 기준점을 지날 때 각자 한 음을 냅니다. 주기가 2박과 3박이면 출발 후 몇 박 만에 다시 함께 울릴까요? 3을 4로 바꾸어 비교하세요. / Each planet plays a note at the right-hand marker. For periods of two and three beats, predict the next shared beat. Then change three to four.

```python
from vpython import *
scene.range = 3.2
sphere(radius=0.38, color=color.orange, emissive=True)
periods = [2, 3]
notes = ["C4", "G4"]
radii = [1.4, 2.4]
planets = []
for radius in radii:
    ring(radius=radius, thickness=0.012, axis=vector(0, 0, 1))
    sphere(pos=vector(radius, 0, 0), radius=0.07, color=color.white)
    planets.append(sphere(radius=0.19, color=color.cyan))
for frame in range(241):
    rate(20)
    for i, planet in enumerate(planets):
        lap = periods[i] * 20
        angle = 2 * pi * (frame % lap) / lap
        planet.pos = radii[i] * vector(cos(angle), sin(angle), 0)
        if frame % lap == 0:
            play_note(notes[i], 0.3)
```

[바로 실행 · Run][run-7]

### 8. 빛점으로 보는 메아리 · An echo you can follow

수중 음파가 반사되어 돌아오는 과정을 빛점으로 표시합니다. 벽까지의 거리를 3에서 4로 바꾸세요. 출발음과 도착음 사이가 왜 길어질까요? / A dot traces a sound pulse in water. Move the wall from three to four units away. Explain the change in the delay between the two notes.

```python
from vpython import *
distance = 3
scene.range = 5
start = vector(-2, 0, 0)
sender = box(pos=start, size=vector(0.2, 1, 0.6), color=color.cyan)
wall = box(pos=start + vector(distance, 0, 0), size=vector(0.1, 2, 0.8))
pulse = sphere(pos=start, radius=0.15, color=color.yellow, emissive=True)
steps = distance * 20
play_note("C4", 0.18)
for tick in range(2 * steps + 1):
    rate(30)
    path = tick if tick <= steps else 2 * steps - tick
    pulse.pos = start + vector(path / 20, 0, 0)
    if tick == steps:
        wall.color = color.orange
    if tick == 2 * steps:
        sender.emissive = True
        play_note("G4", 0.45)
```

[바로 실행 · Run][run-8]

### 9. 펄서의 등대 신호 · The pulsar lighthouse

펄서의 회전하는 빔이 오른쪽 관측자를 향할 때만 수신기를 밝히고 소리를 냅니다. `ticks_per_turn`을 절반으로 줄이면 같은 시간 동안 신호를 몇 번 받을까요? / A receiver lights up and beeps as the rotating beam sweeps past it. Halve the ticks per turn and predict how the number of pulses changes.

```python
from vpython import *
scene.range = 3.4
star = sphere(radius=0.35, color=color.white, emissive=True)
beam = arrow(pos=star.pos, axis=vector(2, 0, 0), color=color.cyan)
receiver = sphere(pos=vector(2.6, 0, 0), radius=0.2)
ticks_per_turn = 60
for tick in range(181):
    rate(30)
    phase = tick % ticks_per_turn
    angle = 2 * pi * phase / ticks_per_turn
    beam.axis = 2 * vector(cos(angle), sin(angle), 0)
    if phase == 0:
        receiver.color = color.yellow
        receiver.emissive = True
        play_note("A4", 0.18)
    elif phase == 5:
        receiver.emissive = False
        receiver.color = color.gray(0.4)
```

[바로 실행 · Run][run-9]

**교사용 관찰 기준 · Teacher check.** 4번은 정면에서, 행성이 별 안쪽에 완전히 들어온 순간을 비교하세요. 반지름이 두 배이면 가리는 면적은 네 배입니다. 7번은 출발을 0박으로 세면 2·3박 주기는 6박, 2·4박 주기는 4박에 다시 만납니다. 8번의 음파는 왕복하므로 거리와 지연이 비례합니다. 9번은 빔이 한 번 돌 때 한 번의 신호를 받습니다.

In 4, compare the silhouettes from the front when the planet is entirely inside the star’s disk. Doubling radius quadruples the blocked area. In 7, count departure as beat zero. The next shared beats are six and four respectively. In 8, the pulse travels to the wall and back, so the delay scales with distance. In 9, the receiver registers one pulse per rotation.

[run-1]: https://vpylab.vercel.app/sandbox?view=run#b64=ZnJvbSB2cHl0aG9uIGltcG9ydCAqCnNjZW5lLmxpZ2h0cyA9IFtdCnNjZW5lLmFtYmllbnQgPSBjb2xvci5ncmF5KDAuMDgpCmxvY2FsX2xpZ2h0KHBvcz12ZWN0b3IoLTMsIDEsIDIpLCBjb2xvcj1jb2xvci53aGl0ZSwgaW50ZW5zaXR5PTQwKQpzcGhlcmUocmFkaXVzPTEsIGNvbG9yPWNvbG9yLmN5YW4p
[run-2]: https://vpylab.vercel.app/sandbox?view=run#b64=ZnJvbSB2cHl0aG9uIGltcG9ydCAqCnNwaGVyZShjb2xvcj1jb2xvci5vcmFuZ2UsIGVtaXNzaXZlPVRydWUpCmZvciBub3RlIGluIFsiQzQiLCAiRzQiXToKICAgIHBsYXlfbm90ZV9hbmRfd2FpdChub3RlLCAwLjUp
[run-3]: https://vpylab.vercel.app/sandbox?view=run#b64=ZnJvbSB2cHl0aG9uIGltcG9ydCAqCnVybCA9ICJodHRwczovL3Jhdy5naXRodWJ1c2VyY29udGVudC5jb20vbXJkb29iL3RocmVlLmpzL3IxNzAvZXhhbXBsZXMvdGV4dHVyZXMvcGxhbmV0cy9lYXJ0aF9hdG1vc18yMDQ4LmpwZyIKc2NlbmUuYmFja2dyb3VuZCA9IGNvbG9yLmJsYWNrCnNjZW5lLnJhbmdlID0gMS42NQpkaXN0YW50X2xpZ2h0KGRpcmVjdGlvbj12ZWN0b3IoLTAuMiwgLTAuMSwgLTEpLCBjb2xvcj1jb2xvci53aGl0ZSwgaW50ZW5zaXR5PTUpCnNwaGVyZShyYWRpdXM9MSwgY29sb3I9Y29sb3Iud2hpdGUsIHRleHR1cmU9dXJsLCBzaGluaW5lc3M9MCk
[run-4]: https://vpylab.vercel.app/sandbox?view=run#b64=ZnJvbSB2cHl0aG9uIGltcG9ydCAqCnNjZW5lLnJhbmdlID0gMi42CnNjZW5lLmZvcndhcmQgPSB2ZWN0b3IoMCwgMCwgLTEpCnN0YXIgPSBzcGhlcmUocmFkaXVzPTEsIGNvbG9yPWNvbG9yLm9yYW5nZSwgZW1pc3NpdmU9VHJ1ZSkKcGxhbmV0ID0gc3BoZXJlKHJhZGl1cz0wLjIsIGNvbG9yPWNvbG9yLmdyYXkoMC4xMikpCmZvciBzdGVwIGluIHJhbmdlKDEyMSk6CiAgICByYXRlKDMwKQogICAgeCA9IC0yICsgc3RlcCAvIDMwCiAgICBwbGFuZXQucG9zID0gdmVjdG9yKHgsIDAsIDEuNCk
[run-5]: https://vpylab.vercel.app/sandbox?view=run#b64=ZnJvbSB2cHl0aG9uIGltcG9ydCAqCm5vdGVzID0gWyJDNCIsICJFNCIsICJHNCJdCmZvciBpLCBub3RlIGluIGVudW1lcmF0ZShub3Rlcyk6CiAgICBsYW1wID0gc3BoZXJlKHBvcz12ZWN0b3IoaSAtIDEsIGkgLyAyLCAwKSwgcmFkaXVzPTAuMjUpCiAgICBsYW1wLmNvbG9yID0gY29sb3IueWVsbG93CiAgICBsYW1wLmVtaXNzaXZlID0gVHJ1ZQogICAgcGxheV9ub3RlX2FuZF93YWl0KG5vdGUsIDAuNikKICAgIGxhbXAuZW1pc3NpdmUgPSBGYWxzZQogICAgbGFtcC5jb2xvciA9IGNvbG9yLmdyYXkoMC4zKQ
[run-6]: https://vpylab.vercel.app/sandbox?view=run#b64=ZnJvbSB2cHl0aG9uIGltcG9ydCAqCnNjZW5lLnJhbmdlID0gNQplYXJ0aCA9IHNwaGVyZShwb3M9dmVjdG9yKC0yLCAwLCAwKSwgdGV4dHVyZT10ZXh0dXJlcy5lYXJ0aCkKbW9vbiA9IHNwaGVyZShyYWRpdXM9MC4yNSwgY29sb3I9Y29sb3IuZ3JheSgwLjgpKQpmb3IgZGlzdGFuY2UgaW4gWzIsIDMsIDQsIDMsIDJdOgogICAgbW9vbi5wb3MgPSBlYXJ0aC5wb3MgKyB2ZWN0b3IoZGlzdGFuY2UsIDAsIDApCiAgICBmcmVxdWVuY3kgPSAyMDAgKyAxMDAgKiBkaXN0YW5jZQogICAgcGxheV9zb3VuZChmcmVxdWVuY3ksIDAuMzUpCiAgICBzbGVlcCgwLjUp
[run-7]: https://vpylab.vercel.app/sandbox?view=run#b64=ZnJvbSB2cHl0aG9uIGltcG9ydCAqCnNjZW5lLnJhbmdlID0gMy4yCnNwaGVyZShyYWRpdXM9MC4zOCwgY29sb3I9Y29sb3Iub3JhbmdlLCBlbWlzc2l2ZT1UcnVlKQpwZXJpb2RzID0gWzIsIDNdCm5vdGVzID0gWyJDNCIsICJHNCJdCnJhZGlpID0gWzEuNCwgMi40XQpwbGFuZXRzID0gW10KZm9yIHJhZGl1cyBpbiByYWRpaToKICAgIHJpbmcocmFkaXVzPXJhZGl1cywgdGhpY2tuZXNzPTAuMDEyLCBheGlzPXZlY3RvcigwLCAwLCAxKSkKICAgIHNwaGVyZShwb3M9dmVjdG9yKHJhZGl1cywgMCwgMCksIHJhZGl1cz0wLjA3LCBjb2xvcj1jb2xvci53aGl0ZSkKICAgIHBsYW5ldHMuYXBwZW5kKHNwaGVyZShyYWRpdXM9MC4xOSwgY29sb3I9Y29sb3IuY3lhbikpCmZvciBmcmFtZSBpbiByYW5nZSgyNDEpOgogICAgcmF0ZSgyMCkKICAgIGZvciBpLCBwbGFuZXQgaW4gZW51bWVyYXRlKHBsYW5ldHMpOgogICAgICAgIGxhcCA9IHBlcmlvZHNbaV0gKiAyMAogICAgICAgIGFuZ2xlID0gMiAqIHBpICogKGZyYW1lICUgbGFwKSAvIGxhcAogICAgICAgIHBsYW5ldC5wb3MgPSByYWRpaVtpXSAqIHZlY3Rvcihjb3MoYW5nbGUpLCBzaW4oYW5nbGUpLCAwKQogICAgICAgIGlmIGZyYW1lICUgbGFwID09IDA6CiAgICAgICAgICAgIHBsYXlfbm90ZShub3Rlc1tpXSwgMC4zKQ
[run-8]: https://vpylab.vercel.app/sandbox?view=run#b64=ZnJvbSB2cHl0aG9uIGltcG9ydCAqCmRpc3RhbmNlID0gMwpzY2VuZS5yYW5nZSA9IDUKc3RhcnQgPSB2ZWN0b3IoLTIsIDAsIDApCnNlbmRlciA9IGJveChwb3M9c3RhcnQsIHNpemU9dmVjdG9yKDAuMiwgMSwgMC42KSwgY29sb3I9Y29sb3IuY3lhbikKd2FsbCA9IGJveChwb3M9c3RhcnQgKyB2ZWN0b3IoZGlzdGFuY2UsIDAsIDApLCBzaXplPXZlY3RvcigwLjEsIDIsIDAuOCkpCnB1bHNlID0gc3BoZXJlKHBvcz1zdGFydCwgcmFkaXVzPTAuMTUsIGNvbG9yPWNvbG9yLnllbGxvdywgZW1pc3NpdmU9VHJ1ZSkKc3RlcHMgPSBkaXN0YW5jZSAqIDIwCnBsYXlfbm90ZSgiQzQiLCAwLjE4KQpmb3IgdGljayBpbiByYW5nZSgyICogc3RlcHMgKyAxKToKICAgIHJhdGUoMzApCiAgICBwYXRoID0gdGljayBpZiB0aWNrIDw9IHN0ZXBzIGVsc2UgMiAqIHN0ZXBzIC0gdGljawogICAgcHVsc2UucG9zID0gc3RhcnQgKyB2ZWN0b3IocGF0aCAvIDIwLCAwLCAwKQogICAgaWYgdGljayA9PSBzdGVwczoKICAgICAgICB3YWxsLmNvbG9yID0gY29sb3Iub3JhbmdlCiAgICBpZiB0aWNrID09IDIgKiBzdGVwczoKICAgICAgICBzZW5kZXIuZW1pc3NpdmUgPSBUcnVlCiAgICAgICAgcGxheV9ub3RlKCJHNCIsIDAuNDUp
[run-9]: https://vpylab.vercel.app/sandbox?view=run#b64=ZnJvbSB2cHl0aG9uIGltcG9ydCAqCnNjZW5lLnJhbmdlID0gMy40CnN0YXIgPSBzcGhlcmUocmFkaXVzPTAuMzUsIGNvbG9yPWNvbG9yLndoaXRlLCBlbWlzc2l2ZT1UcnVlKQpiZWFtID0gYXJyb3cocG9zPXN0YXIucG9zLCBheGlzPXZlY3RvcigyLCAwLCAwKSwgY29sb3I9Y29sb3IuY3lhbikKcmVjZWl2ZXIgPSBzcGhlcmUocG9zPXZlY3RvcigyLjYsIDAsIDApLCByYWRpdXM9MC4yKQp0aWNrc19wZXJfdHVybiA9IDYwCmZvciB0aWNrIGluIHJhbmdlKDE4MSk6CiAgICByYXRlKDMwKQogICAgcGhhc2UgPSB0aWNrICUgdGlja3NfcGVyX3R1cm4KICAgIGFuZ2xlID0gMiAqIHBpICogcGhhc2UgLyB0aWNrc19wZXJfdHVybgogICAgYmVhbS5heGlzID0gMiAqIHZlY3Rvcihjb3MoYW5nbGUpLCBzaW4oYW5nbGUpLCAwKQogICAgaWYgcGhhc2UgPT0gMDoKICAgICAgICByZWNlaXZlci5jb2xvciA9IGNvbG9yLnllbGxvdwogICAgICAgIHJlY2VpdmVyLmVtaXNzaXZlID0gVHJ1ZQogICAgICAgIHBsYXlfbm90ZSgiQTQiLCAwLjE4KQogICAgZWxpZiBwaGFzZSA9PSA1OgogICAgICAgIHJlY2VpdmVyLmVtaXNzaXZlID0gRmFsc2UKICAgICAgICByZWNlaXZlci5jb2xvciA9IGNvbG9yLmdyYXkoMC40KQ

### 7번 파일럿의 실행 확인 · Activity 7 runtime checks

Web VPython 3.2 공식 실행기에서 활동지의 시각 코드만 실행했습니다. 두 행성의 첫 동시 귀환은 (2,3)에서 6박, (2,4)에서 4박, (3,4)에서 12박이었습니다. Web VPython에는 소리 재생 API가 없습니다. VPyLab 편집기에서만 소리 행을 더해 C4와 G4의 Web Audio 시작을 측정했습니다.

The official Web VPython 3.2 browser runner displayed the shared visual model. After departure the first joint return was beat 6 for (2,3), beat 4 for (2,4) and beat 12 for (3,4). The sound extension ran separately in VPyLab. With periods (2,3) through beat 12 inclusive, the oscillator started seven C4s and five G4s. The captions used position markers I and O and remained usable with sound off.

7번 영상 → 활동지 → 실습 → 코드 보기 → 도구를 Chromium 터치 모사 390×844·667×320과 WebKit 터치 모사 320×568에서 확인했습니다. 활동지를 200% 글자 크기로 읽고 키보드로 귀환 기록을 펼쳤습니다. 실물 iPhone·iPad, 학교 기기, 보조공학 사용자 및 학급 단위 학습효과는 별도 확인 대상입니다.

The activity 7 video, worksheet, practice, code and tools paths were exercised on emulated touch screens in Chromium at 390×844 and 667×320 and WebKit at 320×568. Worksheet text was enlarged to 200% and the transcript opened with the keyboard. Physical device performance, assistive-technology user experience and learning outcomes require separate evaluation in schools.
