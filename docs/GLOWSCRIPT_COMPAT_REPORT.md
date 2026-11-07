> 최신 상태는 [2026년 11월 6일 호환성 분석과 개선](COMPATIBILITY_AUDIT_2026-11-06.md)을 확인하세요. 아래 내용은 2026년 10월 29일 당시의 기록이며 현재 결함 목록이 아닙니다.

# GlowScript VPython 호환성 점검 보고서

- 작성: 2026-10-29
- 대상 코드: `main` @ `e9f12be` (PR #4·#5·#6·#7·#8 포함)
- 하네스: `scripts/compat/` (`npm run compat:check`, `npm run compat:browser`). 실행 방법은 [scripts/compat/README.md](../scripts/compat/README.md)에 있다.
- 자동 생성 전체 표: `scripts/compat/out/summary.md` (하네스를 다시 돌리면 갱신된다)

## 1. 요약

GlowScript VPython 코드 562개를 두 경로로 실행했다. 정적 하네스는 CPython 3.12에서 `vpython-api.py`를 js 스텁과 함께 실행해 Python 쪽 의미를 검사한다. 브라우저 하네스는 Playwright로 실제 `/sandbox`에서 코드를 실행해 오류·무반응·3D 메시 수를 기록한다. "즉시 수정 적용 시" 열은 한 줄짜리 수정들을 임시 심(`shim-quickfixes.py`)으로 덧씌웠을 때의 결과다. 첫 오류 뒤에 숨어 있던 다음 오류를 보기 위한 측정이며 앱 코드는 바꾸지 않았다.

| 출처 | 개수 | 정적 통과 | 정적 실패 | 제외 | 브라우저 통과 | 브라우저 실패 | 즉시 수정 적용 시 통과 |
|---|---|---|---|---|---|---|---|
| VPyLab 내장(예제·코스·미션) | 211 | 209 | 2 | 0 | 209 | 2 | 209 |
| 수업 관용구(직접 작성) | 114 | 57 | 57 | 0 | 58 | 56 | 90 |
| GlowScript 공식 예제 | 33 | 5 | 26 | 2 | 5 | 26 | 16 |
| GlowScript 문서 조각 | 169 | 75 | 76 | 18 | 78 | 73 | 95 |
| VPython 7 데모(vpython-jupyter) | 35 | 0 | 35 | 0 | 0 | 35 | 16 |
| **합계** | **562** | **346** | **196** | **20** | **350** | **192** | **426** |

"제외"는 문서에서 잘라 온 조각이 가정한 변수가 없어서 난 NameError(`fragment-undefined` 18개)와 jQuery를 섞은 Web VPython 전용 코드(`glowscript-only` 2개)다. VPyLab 문제가 아니므로 실패에서 뺐다. 브라우저 통과가 정적보다 4개 많은 것은 CPython이 `SyntaxWarning`·`RuntimeWarning`을 stderr로 내는 코드 4개를 정적 하네스가 경고로 분류하기 때문이다.

내장 콘텐츠 211개는 2개를 빼고 모두 통과했다(2.6절). 실패는 GlowScript에서 가져온 코드에 몰려 있고, 그 가운데 절반 이상이 한 줄로 고칠 수 있는 이름 누락이다. 한 줄 수정만 적용해도 통과가 346개에서 426개로 늘고, 공식 예제는 5개에서 16개로 늘어난다.

### 상위 10개 오류 (수업에서 만날 확률 순)

| 순위 | 문제 | 영향 받은 코드 수 | 심각도 | 수정 난이도 | 항목 |
|---|---|---|---|---|---|
| 1 | `from vpython import *` 뒤 `sin`·`cos`·`pi`·`sqrt`·`random()`을 바로 쓸 수 없다 | 13 | 상 | 한 줄 | A1·A2·A14 |
| 2 | 함수·메서드 안의 `rate()`가 `SyntaxError: 'await' outside async function` | 3 | 상 | 대 | D1 |
| 3 | `rate()`가 있는 프로그램에서 `global` 변수를 바꾸는 함수가 `NameError` | 3 | 상 | 중 | D2 |
| 4 | `scene.waitfor('click')`·`scene.pause()`가 기다리지 않고 `None`을 돌려준다 | 10 | 상 | 대 | B2·B3 |
| 5 | `canvas()`가 없다 | 36 | 상 | 중 | A3 |
| 6 | `scene.width = 800`이 `AttributeError`(setter 없음). 공식 예제 33개 중 18개가 이 줄에서 멈춘다 | 20 | 중 | 한 줄 | B1 |
| 7 | `shapes.*`·`paths.*`가 없어 `extrusion`을 쓸 수 없다 | 34 | 하 | 대 | A4 |
| 8 | `cylinder`·`cone`·`arrow`·`helix`·`compound`에 `length`가 없고, `sphere`·`cylinder`에 `size`가 없다 | 10 | 중 | 소 | B6·B7 |
| 9 | `curve.append(pos=, color=)`·dict 점·리스트 추가가 안 된다 | 8 | 중 | 소 | C1 |
| 10 | `compound.rotate()`·`compound.clone()`이 없다 | 3 | 중 | 중 | B10 |

그 밖에 `color.hsv_to_rgb`(4), `attach_trail`·`attach_light`(6), `rotate()`·`proj()` 함수형(7), `print_options`(5), `scene.mouse.ray`·`project`(5), `wtext`(1), `input()`(3)이 있다.

## 2. 오류 목록

심각도는 고등학교 정보 수업에서 학생이 만날 확률이다. 상은 첫 단원부터 만나는 것, 중은 단원 하나를 넘어가면 만나는 것, 하는 특정 주제에서만 만나는 것이다. 수정 난이도는 한 줄(즉시 수정 가능), 소(한 함수), 중(한 파일), 대(여러 파일이나 구조 변경)로 적었다. "영향"은 정적 하네스에서 이 오류로 멈춘 코드 수에 심 적용 뒤 드러난 수를 더한 값이다.

### 2.1 미지원 API (이름이 없음, NameError)

| # | 재현 코드 | 기대 동작 (GlowScript 문서) | 실제 결과 | 영향 | 심각도 | 난이도 | 비고 |
|---|---|---|---|---|---|---|---|
| A1 | `from vpython import *`<br>`print(sin(pi/2), cos(0), sqrt(4))` | `from vpython import *`가 `math` 함수 전체와 `pi`를 제공한다 ([mathfunct](https://www.glowscript.org/docs/VPythonDocs/mathfunct.html)) | `NameError: name 'sin' is not defined` | 13 | 상 | 한 줄 | 즉시 수정 가능. 워커의 vpython 모듈 등록에 `math` 이름을 더하면 된다. 공식 예제 AtomicSolid·GraphTest가 이것으로 멈춘다 |
| A2 | `from vpython import *`<br>`r = random()` | `random()`이 0~1 난수를 돌려준다 ([mathfunct](https://www.glowscript.org/docs/VPythonDocs/mathfunct.html)) | `NameError: name 'random' is not defined` | (A1에 포함) | 상 | 한 줄 | 즉시 수정 가능 (`from random import random`) |
| A3 | `scene = canvas(width=600, height=300)` | 새 캔버스를 만든다. 공식 예제와 VPython 7 데모 대부분이 첫 줄에서 호출한다 ([canvas](https://www.glowscript.org/docs/VPythonDocs/canvas.html)) | `NameError: name 'canvas' is not defined` | 36 | 상 | 중 | 데모 35개 중 29개가 첫 줄에서 멈춘다. 캔버스를 하나만 지원하더라도 `canvas(**kw)`가 인자를 `scene`에 적용하고 `scene`을 돌려주면 대부분 진행된다(심으로 확인: 데모 통과 0개→16개) |
| A4 | `extrusion(path=paths.circle(radius=2), shape=shapes.rectangle(width=0.4, height=0.2))` | 단면과 경로 생성기 ([shapes_and_paths](https://www.glowscript.org/docs/VPythonDocs/shapes_and_paths.html)) | `NameError: name 'shapes' is not defined` | 34 | 하 | 대 | `extrusion` 자체는 있으나 단면 생성기가 없어 실제로는 쓰기 어렵다. 공식 예제 Conch·Extrusions·MousePicking·Stonehenge가 여기서 멈춘다 |
| A5 | `w = wtext(text='초기값')`<br>`w.text = '변경됨'` | 캡션에 동적 텍스트 ([wtext](https://www.glowscript.org/docs/VPythonDocs/wtext.html)) | `NameError: name 'wtext' is not defined` | 1 | 중 | 중 | 슬라이더 값 표시에 거의 항상 함께 쓴다 |
| A6 | `rotate(v, angle=pi/2, axis=vector(0,0,1))`<br>`rotate(b, angle=0.1)` | 벡터·객체 회전 함수형 ([rotation](https://www.glowscript.org/docs/VPythonDocs/rotation.html)) | `NameError: name 'rotate' is not defined` | 3 | 중 | 소 | 메서드 `v.rotate()`·`obj.rotate()`는 있으므로 함수는 위임만 하면 된다 |
| A7 | `proj(a, b)`, `comp(a, b)`, `diff_angle(a, b)` | 벡터 함수형 ([vector](https://www.glowscript.org/docs/VPythonDocs/vector.html)) | `NameError` | 4 | 하 | 한 줄 | 즉시 수정 가능. 메서드가 이미 있으므로 `mag()`처럼 위임 |
| A8 | `attach_trail(ball, color=color.green, retain=100)`<br>`attach_trail(lambda: vector(t, t*t, 0))` | 궤적을 붙이고 `stop()/start()/clear()`가 있는 객체를 돌려준다. 함수 궤적도 된다 ([trail](https://www.glowscript.org/docs/VPythonDocs/trail.html)) | `NameError: name 'attach_trail' is not defined` | 2 | 중 | 소 | 메서드 `obj.attach_trail()`은 있다. 함수형과 `type=`·반환 객체가 없다 |
| A9 | `attach_light(ball, offset=vector(3,0,1), color=color.green)` | 객체를 따라다니는 광원 ([attach_light](https://www.glowscript.org/docs/VPythonDocs/attach_light.html)) | `NameError` | 4 | 하 | 중 | 공식 예제 BoxLightTest가 멈춘다 |
| A10 | `g = group()`<br>`box(group=g)`<br>`g.rotate(angle=0.3, axis=vector(0,1,0))` | 객체 묶기 ([group](https://www.glowscript.org/docs/VPythonDocs/group.html)) | `NameError: name 'group' is not defined` | 4 | 하 | 대 | `compound`와 달리 하위 객체를 나중에 바꿀 수 있는 묶음이다. 공식 예제 Car가 여기서 멈춘다 |
| A11 | `simple_sphere(radius=0.5)` | 삼각형 수가 적은 구 ([sphere](https://www.glowscript.org/docs/VPythonDocs/sphere.html)) | `NameError` | 1 | 하 | 한 줄 | 즉시 수정 가능: `simple_sphere = sphere` |
| A12 | `bumpmaps.wood`, `textures.wood_old`, `textures.rock` | 범프맵 프리셋과 문서에 있는 텍스처 이름 전부 ([texture](https://www.glowscript.org/docs/VPythonDocs/texture.html)) | `NameError: name 'bumpmaps'`, `AttributeError: 'wood_old'` | 3 | 하 | 소 | 공식 예제 Bumpmaps·Extrusions가 멈춘다. `textures`에는 `rock`·`wood_old`가 없고, 반대로 VPyLab 전용 이름(`galaxy`·`lava` 등)이 있다 |
| A13 | `print_options(digits=3)` | 벡터 출력 자릿수 ([print](https://www.glowscript.org/docs/VPythonDocs/print.html)) | `NameError` | 5 | 하 | 소 | 받기만 하고 무시해도 코드는 진행된다 |
| A14 | `arange(0, 1, 0.25)`, `clock()`, `msclock()`, `sign(x)`, `combin(5, 2)` | GlowScript 수학 함수 ([mathfunct](https://www.glowscript.org/docs/VPythonDocs/mathfunct.html)) | `NameError` | (A1에 포함) | 하 | 소 | A1과 함께 넣으면 된다 |
| A15 | `get_library(url)`, `read_local_file(...)`, `download(name, data)` | Web VPython 전용 파일 함수 ([file](https://www.glowscript.org/docs/VPythonDocs/file.html)) | `NameError` | 3 | 하 | - | 지원 대상이 아니다. 기록만 한다 |

### 2.2 미지원 속성·메서드 (AttributeError)

| # | 재현 코드 | 기대 동작 | 실제 결과 | 영향 | 심각도 | 난이도 | 비고 |
|---|---|---|---|---|---|---|---|
| B1 | `scene.width = 800`<br>`scene.height = 400` | 캔버스 크기 ([canvas](https://www.glowscript.org/docs/VPythonDocs/canvas.html)) | `AttributeError: property 'width' of '_Scene' object has no setter` | 20 | 중 | 한 줄 | 즉시 수정 가능. **공식 예제 33개 중 18개가 이 한 줄에서 멈춘다.** 값을 저장만 해도 뒤 코드는 진행된다. `scene.align`·`scene.resizable`도 같다 |
| B2 | `scene.pause()` | 클릭할 때까지 멈춘다 ([pause](https://www.glowscript.org/docs/VPythonDocs/pause.html)) | `AttributeError: '_Scene' object has no attribute 'pause'` | 7 | 상 | 대 | 비동기 대기가 필요하므로 전처리기가 `await`를 붙여야 한다. VPython 7 데모 Graphs가 멈춘다 |
| B3 | `ev = scene.waitfor('click')`<br>`print(ev.pos)` | 이벤트가 올 때까지 멈추고 이벤트 객체를 돌려준다 ([mouse](https://www.glowscript.org/docs/VPythonDocs/mouse.html)) | 안내문만 출력하고 `None`을 돌려줘 다음 줄에서 `AttributeError: 'NoneType' object has no attribute 'pos'` | 3 | 상 | 대 | "클릭하면 시작" 코드가 모두 깨진다. B2와 같은 구조다. `scene.waitfor('redraw')`도 바로 지나간다 |
| B4 | `v.norm()`<br>`b.pos.equals(vector(1,2,3))` | 단위 벡터 메서드·비교 ([vector](https://www.glowscript.org/docs/VPythonDocs/vector.html)) | `AttributeError: 'vector' object has no attribute 'norm'` | 3 | 중 | 한 줄 | 즉시 수정 가능. `norm = lambda self: self.hat`, `equals = __eq__` |
| B5 | `vector.random()` | 각 성분이 -1~1인 난수 벡터 | `AttributeError: type object 'vector' has no attribute 'random'` | 1 | 하 | 한 줄 | 즉시 수정 가능 |
| B6 | `c = cylinder(axis=vector(3,0,0))`<br>`print(c.length)`<br>`c.length = 5` | `cylinder`·`cone`·`arrow`·`helix`·`compound`·`text`에 `length`가 있고 `axis.mag`와 연동된다 ([cylinder](https://www.glowscript.org/docs/VPythonDocs/cylinder.html)) | `AttributeError: 'cylinder' object has no attribute 'length'` | 7 | 중 | 소 | `box`에만 구현돼 있다. 문서의 슬라이더 예제(`cone.length`)와 공식 예제 Gyroscope(`compound.length`)가 멈춘다 |
| B7 | `s = sphere(radius=2)`<br>`print(s.size)`<br>`cylinder().size` | `size == vector(4,4,4)`이고 `size`로 타원체도 된다 ([sphere](https://www.glowscript.org/docs/VPythonDocs/sphere.html)) | `AttributeError: 'sphere' object has no attribute 'size'` | 3 | 하 | 소 | 공식 예제 DoublePendulum이 `cylinder.size`에서 멈춘다 |
| B8 | `color.hsv_to_rgb(vector(0,1,1))`<br>`color.rgb_to_hsv(c)` | 색 변환 ([color](https://www.glowscript.org/docs/VPythonDocs/color.html)) | `AttributeError` | 4 | 중 | 소 | 무지개 색 애니메이션에서 자주 쓴다. `colorsys`로 몇 줄이면 된다 |
| B9 | `for o in scene.objects: o.visible = False` | 보이는 객체 목록 ([canvas](https://www.glowscript.org/docs/VPythonDocs/canvas.html)) | `AttributeError: '_Scene' object has no attribute 'objects'` | 2 | 하 | 소 | "모두 지우기" 관용구가 깨진다 |
| B10 | `c = compound([...])`<br>`c.rotate(angle=0.2, axis=vector(0,0,1))`<br>`c.clone(pos=...)` | compound도 일반 객체처럼 회전·복제 ([compound](https://www.glowscript.org/docs/VPythonDocs/compound.html)) | `AttributeError: 'compound' object has no attribute 'rotate'` | 3 | 중 | 중 | 로봇 팔·자동차처럼 부품을 묶어 돌리는 과제에서 바로 만난다. `extrusion.clone()`도 없다(공식 예제 ElectricMotor) |
| B11 | `scene.mouse.ray`, `scene.mouse.project(normal=...)`, `scene.mouse()` | 마우스 광선·평면 투영 ([mouse](https://www.glowscript.org/docs/VPythonDocs/mouse.html)) | `AttributeError`, `TypeError: '_MouseState' object is not callable` | 5 | 하 | 소 | 드래그로 물체 옮기기 예제가 쓴다 |
| B12 | `scene.camera.rotate(angle=, axis=, origin=)` | 카메라 회전 ([camera](https://www.glowscript.org/docs/VPythonDocs/camera.html)) | `AttributeError: '_Camera' object has no attribute 'rotate'` | 1 | 하 | 소 | PR #5 카메라 작업에서 빠진 메서드 |
| B13 | `w = winput(type='string')`<br>`print(w.text)`, `w.number` | 입력값 읽기 ([textinput](https://www.glowscript.org/docs/VPythonDocs/textinput.html)) | `AttributeError: 'winput' object has no attribute 'text'` | 1 | 하 | 소 | |
| B14 | `m = menu(choices=[...], selected='green')`<br>`m.selected`, `m.index` | 선택값·인덱스 ([menu](https://www.glowscript.org/docs/VPythonDocs/menu.html)) | `AttributeError: 'menu' object has no attribute 'selected'` | 1 | 하 | 소 | 핸들러로 넘어오는 객체에도 `.selected`가 없다 |
| B15 | `slider(pos=scene.caption_anchor)`, `scene.title_anchor` | 위젯 위치 지정 ([widgetPosition](https://www.glowscript.org/docs/VPythonDocs/widgetPosition.html)) | `AttributeError` | 1 | 하 | 소 | 받아서 무시하면 코드는 진행된다 |
| B16 | `mycanvas.select()`, `graph.get_selected()`, `scene.pixel_to_world` | 다중 캔버스·그래프 선택 | `AttributeError` | 3 | 하 | 소 | A3과 묶어서 처리할 항목이다 |
| B17 | `label(...).start()` | 공식 예제 BillboardingText가 쓰는 메서드 | `AttributeError: 'label' object has no attribute 'start'` | 2 | 하 | 소 | |
| B18 | `vertex(pos=..., texpos=vector(0,0,0))` | 텍스처 좌표 ([vertex](https://www.glowscript.org/docs/VPythonDocs/vertex.html)) | `TypeError: vertex.__init__() got an unexpected keyword argument 'texpos'` | 2 | 하 | 소 | 공식 예제 Rug가 멈춘다 |

### 2.3 인자·호출 형식 차이 (TypeError)

| # | 재현 코드 | 기대 동작 | 실제 결과 | 영향 | 심각도 | 난이도 | 비고 |
|---|---|---|---|---|---|---|---|
| C1 | `c.append(pos=vector(4,1,0), color=color.red)`<br>`c.append([v1, v2])`<br>`curve(pos=[{'pos': v, 'color': c}])`<br>`curve(v1, v2)` | 점마다 색·반지름을 줄 수 있고 리스트·dict·위치 인자도 받는다 ([curve](https://www.glowscript.org/docs/VPythonDocs/curve.html)) | `TypeError: curve.append() got an unexpected keyword argument 'color'`, dict를 주면 `ValueError: could not convert string to float: 'pos'`, 위치 인자는 `TypeError: curve.__init__() takes 1 positional argument` | 8 | 중 | 소 | `npoints`, `modify()`, `point()`도 없다. 공식 예제 RotatingCurve·RotatingPoints가 멈춘다 |
| C2 | `gc.plot(pos=(11, 121))`<br>`gc.plot(14, 196, 15, 225)` | `plot`의 네 가지 호출 형식 ([graph](https://www.glowscript.org/docs/VPythonDocs/graph.html)) | `TypeError: plot() got an unexpected keyword argument 'pos'` | 1 | 하 | 소 | `plot(x, y)`와 `plot([(x,y),...])`는 된다 |
| C3 | `input('이름: ')`, `input(prompt='...')` | Web VPython은 `input()`으로 팝업 입력을 받는다 ([textinput](https://www.glowscript.org/docs/VPythonDocs/textinput.html)) | 정적: `EOFError`. 브라우저: `OSError: [Errno 29] I/O error` | 3 | 중 | 중 | 워커에는 표준 입력이 없다. `winput`으로 안내하거나 `input()`을 위젯 대기로 바꿔야 한다 |
| C4 | `scatter3d(points, color=...)` | (VPyLab 자체 API) | `TypeError: scatter3d() got an unexpected keyword argument 'color'` | 1 | - | 한 줄 | 내장 코스 코드의 오류다. 2.6절 F2 |

### 2.4 실행 구조 (전처리기·비동기)

| # | 재현 코드 | 기대 동작 | 실제 결과 | 영향 | 심각도 | 난이도 | 비고 |
|---|---|---|---|---|---|---|---|
| D1 | `def step(n):`<br>`    for i in range(n):`<br>`        rate(50)`<br>`        ball.pos += v*dt`<br>`step(20)` | 함수 안에서 `rate()`를 호출해도 된다 ([rate](https://www.glowscript.org/docs/VPythonDocs/rate.html)) | `SyntaxError: 'await' outside async function`. 전처리기가 `rate(`를 `await rate(`로 바꾸지만 감싸는 `def`는 `async def`가 아니다 | 3 | **상** | 대 | 클래스 메서드 안의 `rate()`도 같다. 공식 예제 Bounce-Callbacks가 멈춘다. 코드를 함수로 나누라고 가르치는 순간 깨진다. 전처리기가 `rate`·`sleep`이 들어 있는 `def`를 `async def`로 바꾸고 그 함수의 호출 지점에도 `await`를 붙여야 한다 |
| D2 | `score = 0`<br>`def hit():`<br>`    global score`<br>`    score += 1`<br>`for i in range(3):`<br>`    rate(60)`<br>`    hit()` | `score == 3` | `NameError: name 'score' is not defined`. 전처리기가 프로그램 전체를 `async def __vpylab_main__()`으로 감싸므로 모듈 전역이 함수 지역이 되고, 안쪽 함수의 `global score`는 존재하지 않는 모듈 전역을 가리킨다 | 3 | **상** | 중 | `rate()`가 없는 프로그램에서는 정상이다. 공식 예제 Stars와 VPython 7 데모 Stars가 `global Stars`에서 멈춘다. 점수·충돌 횟수처럼 `global`로 세는 수업 코드가 모두 걸린다. Pyodide의 `runPythonAsync`는 최상위 `await`를 지원하므로 함수로 감싸지 않고 모듈 수준에서 `await rate()`를 쓰면 해결된다(import 끌어올리기도 필요 없어진다) |
| D3 | `import vpython as vp`<br>`vp.rate(30)` | 모듈 접두어로 호출해도 프레임 대기 | 전처리기가 `vp.rate(`를 못 찾아 코루틴을 만들고 버린다. `RuntimeWarning: coroutine 'rate' was never awaited`, 대기 없이 루프가 돈다 | 1 | 하 | 소 | 전처리 정규식이 점 앞 호출을 일부러 제외한다(`time.sleep` 오탐 방지). `vpython.rate`·`vp.rate`만 예외로 두면 된다 |
| D4 | `while True:`<br>`    n += 1`<br>`    b.pos = vector(n % 10, 0, 0)` | GlowScript는 `rate` 없는 무한 루프에서 브라우저가 멈춘다 | 정적: 시간 초과. 브라우저: 정지 버튼이 듣지 않고 10초 무응답 뒤 Worker 재시작(`hang`) | 1 | 중 | - | VPyLab은 10초 무응답 뒤 Worker를 재시작한다(`usePyodide`의 `ACTIVITY_TIMEOUT`). GlowScript보다 낫다. 다만 재시작 뒤 Pyodide를 다시 올리는 시간이 수업에서는 길게 느껴진다 |
| D5 | `f = lambda: rate(10)` | - | 전처리기 경고 "lambda 내부의 rate()은 await로 변환할 수 없습니다" 뒤 실행 | 1 | 하 | - | 정상 동작이다. 경고 문구가 안내된다 |

### 2.5 의미 차이 (실행은 되지만 결과가 다름)

| # | 재현 코드 | 기대 동작 | 실제 결과 | 심각도 | 난이도 | 비고 |
|---|---|---|---|---|---|---|
| E1 | `p = vector(1,1,1)`<br>`b = box(pos=p)`<br>`p.x = 5`<br>`print(b.pos.x)` | `1`. VPython 7의 `pos` setter는 `self._pos.value = value`로 성분을 복사한다 | `5`. 인자 벡터를 그대로 보관해 별칭이 된다 | 중 | 소 | 두 객체에 같은 벡터를 넘기고 하나만 움직이면 둘 다 움직인다. `_coerce_vector`는 복제본을 돌려주지만 `_GObject.__init__`의 `pos`에는 쓰이지 않는다 |
| E2 | `e = ellipsoid(length=2, height=1, width=3)`<br>`print(e.size)` | `<2, 1, 3>` ([ellipsoid](https://www.glowscript.org/docs/VPythonDocs/ellipsoid.html)) | `length`·`height`·`width` 인자를 `size`에 반영하지 않고 `<1, 1, 1>` | 하 | 소 | `box`와 같은 처리로 맞추면 된다 |
| E3 | `h = helix(axis=vector(3,0,0))`<br>`h.length = 2` | `axis.mag == 2` ([helix](https://www.glowscript.org/docs/VPythonDocs/helix.html)) | `length` 대입이 조용히 사용자 속성이 되어 `axis`가 바뀌지 않는다 | 하 | 소 | B6과 뿌리가 같다 |
| E4 | `sphere(pos=(1, 2, 3))` | GlowScript는 오류를 낸다 | VPyLab도 오류를 내지만 내부 구현이 드러나는 `AttributeError`다 | 하 | 소 | 오류 종류만 다르다. 벡터가 아니라는 안내가 더 낫다 |
| E5 | `t = text(text='Hello', depth=0.3)` | 두께가 있는 3D 글자 ([text](https://www.glowscript.org/docs/VPythonDocs/text.html)) | `text`가 `label`의 별칭이라 카메라를 향하는 2D 스프라이트가 그려진다. `t.length`·`depth` 없음 | 하 | 대 | 자동 판정으로는 통과로 나온다. 공식 예제 ScrollingText·BillboardingText가 이 차이에 걸린다 |
| E6 | `ball = sphere(make_trail=True, trail_type='points', interval=10, pps=15)` | 점 궤적·간격 ([trail](https://www.glowscript.org/docs/VPythonDocs/trail.html)) | 인자를 받아 `create` 커맨드에 싣지만 브릿지는 `trail_type`·`interval`·`pps`를 읽지 않는다(곡선 궤적으로 그린다) | 하 | 중 | 정적·브라우저 모두 통과로 나오므로 브릿지 코드를 읽어 확인했다 |
| E7 | `if k is 'a':` (문서 key·menu·radiobutton 예제) | GlowScript 문서 원문 | CPython 3.12 `SyntaxWarning: "is" with 'str' literal`. 실행은 된다 | - | - | GlowScript 문서 쪽 표기 문제다 |

### 2.6 VPyLab 내장 콘텐츠에서 발견한 오류 (GlowScript 호환과 무관)

| # | 위치 | 재현 | 결과 | 비고 |
|---|---|---|---|---|
| F1 | `client/src/data/courses.js` 코스 `beg-patterns` 2차시 | `for i in range(8): ... color=무지개[i]` | `IndexError: list index out of range`. `무지개`는 7색이다 | 즉시 수정 가능: `range(7)` 또는 `무지개[i % 7]` |
| F2 | `client/src/data/courses.js` 코스 `pro-toolkit` 9차시 | `scatter3d(points, color=...)` | `TypeError: scatter3d() got an unexpected keyword argument 'color'`. 인자 이름은 `colors`다 | 즉시 수정 가능 |

미션 starter·solution 코드 108개와 예제 57개는 모두 통과했다. 브라우저에서도 같은 2개만 실패했다.

### 2.7 정적 통과 · 브라우저 실패 (브릿지·실행 경로 쪽 문제)

정적으로 통과한 코드는 브라우저에서도 모두 통과했다. 브릿지가 모르는 커맨드 경고도 없었다.

### 2.8 진행 중이던 항목의 재실행 결과

이 대화에서 다른 세션이 고치던 항목이다. PR #5가 머지된 `main`으로 재실행했다.

| 항목 | 정적 | 브라우저 |
|---|---|---|
| `ball.pos.x += dx` 성분 변경 전파 (`idiom:vec-component-add`) | 통과 | 통과 (메시 1) |
| `box.size.x = 2`, `size.y`가 `height`에 반영 (`idiom:vec-size-component`, `idiom:attr-dynamic-size-from-length`) | 통과 | 통과 (메시 1) / 통과 (메시 1) |
| `color.gray(0.3)` (`idiom:attr-color-gray`) | 통과 | 통과 (메시 1) |
| `attach_arrow(ball, 'velocity', scale=)` (`idiom:attach-arrow`) | 통과 | 통과 (메시 3) |
| `scene.camera.pos/axis/follow` (`idiom:scene-camera`) | 통과 | 통과 (메시 1) |
| `scene.forward/range/center/up/fov` (`idiom:scene-forward-range-center`) | A1(`pi` 없음)로 멈춤. 심 적용 시 통과 | unsupported-api: NameError: name 'pi' is not defined |
| `scene.ambient`, `scene.lights = []` (`idiom:scene-ambient-lights`) | 통과 | 통과 (메시 0) |
| `scene.title/caption/append_to_caption` (`idiom:scene-title-caption`) | 통과 | 통과 (메시 0) |

## 3. GlowScript 공식 예제 33개

glowscript.org `GlowScriptDemos/Examples` 폴더의 Web VPython 프로그램 33개다. 첫 줄의 `Web VPython 3.2` 표식을 떼고 `from vpython import *`를 붙인 것 외에는 원문 그대로다. MatterAndInteractions와 ScrollingText는 jQuery를 섞은 Web VPython 전용 코드라 제외했다.

**정적 33개 중 통과 5개, 브라우저 33개 중 통과 5개, 즉시 수정 적용 시 통과 16개.**

| 예제 | 정적 | 브라우저 | 메시 수 | 첫 오류 | 즉시 수정 적용 시 (다음 오류) |
|---|---|---|---|---|---|
| [AtomicSolid-VPython](https://www.glowscript.org/#/user/GlowScriptDemos/folder/Examples/program/AtomicSolid-VPython) | 미지원 API(이름 없음) | 미지원 API(이름 없음) | 0 | NameError: name 'pi' is not defined | 통과 |
| [BillboardingText](https://www.glowscript.org/#/user/GlowScriptDemos/folder/Examples/program/BillboardingText) | 미지원 속성·메서드 | 미지원 속성·메서드 | 0 | AttributeError: 'label' object has no attribute 'start' | 미지원 속성·메서드: 'label' object has no attribute 'start' |
| [BinaryStar-VPython](https://www.glowscript.org/#/user/GlowScriptDemos/folder/Examples/program/BinaryStar-VPython) | 통과 | 통과 | 2 |  | 통과 |
| [Bounce-Callbacks-VPython](https://www.glowscript.org/#/user/GlowScriptDemos/folder/Examples/program/Bounce-Callbacks-VPython) | 실행 오류 | 실행 오류 | 0 | SyntaxError: 'await' outside async function (<student>, line 30) | 실행 오류: 'await' outside async function (<student>, line 30) |
| [Bounce-VPython](https://www.glowscript.org/#/user/GlowScriptDemos/folder/Examples/program/Bounce-VPython) | 통과 | 통과 | 6 |  | 통과 |
| [BoxLightTest](https://www.glowscript.org/#/user/GlowScriptDemos/folder/Examples/program/BoxLightTest) | 미지원 API(이름 없음) | 미지원 API(이름 없음) | 0 | NameError: name 'attach_light' is not defined | 통과 |
| [Bumpmaps-VPython](https://www.glowscript.org/#/user/GlowScriptDemos/folder/Examples/program/Bumpmaps-VPython) | 미지원 API(이름 없음) | 미지원 API(이름 없음) | 0 | NameError: name 'bumpmaps' is not defined | 통과 |
| [ButtonsSlidersMenus-VPython](https://www.glowscript.org/#/user/GlowScriptDemos/folder/Examples/program/ButtonsSlidersMenus-VPython) | 미지원 속성·메서드 | 미지원 속성·메서드 | 0 | AttributeError: property 'width' of '_Scene' object has no setter | 통과 |
| [CORS](https://www.glowscript.org/#/user/GlowScriptDemos/folder/Examples/program/CORS) | 통과 | 통과 | 1 |  | 통과 |
| [Car](https://www.glowscript.org/#/user/GlowScriptDemos/folder/Examples/program/Car) | 미지원 속성·메서드 | 미지원 속성·메서드 | 0 | AttributeError: property 'width' of '_Scene' object has no setter | 미지원 API(이름 없음): name 'group' is not defined |
| [Color-RGB-HSV-VPython](https://www.glowscript.org/#/user/GlowScriptDemos/folder/Examples/program/Color-RGB-HSV-VPython) | 미지원 속성·메서드 | 미지원 속성·메서드 | 0 | AttributeError: property 'width' of '_Scene' object has no setter | 통과 |
| [Conch](https://www.glowscript.org/#/user/GlowScriptDemos/folder/Examples/program/Conch) | 미지원 속성·메서드 | 미지원 속성·메서드 | 0 | AttributeError: property 'height' of '_Scene' object has no setter | 미지원 API(이름 없음): name 'shapes' is not defined |
| [DipoleElectricField](https://www.glowscript.org/#/user/GlowScriptDemos/folder/Examples/program/DipoleElectricField) | 통과 | 통과 | 2 |  | 통과 |
| [DoublePendulum-VPython](https://www.glowscript.org/#/user/GlowScriptDemos/folder/Examples/program/DoublePendulum-VPython) | 미지원 속성·메서드 | 미지원 속성·메서드 | 0 | AttributeError: property 'width' of '_Scene' object has no setter | 미지원 속성·메서드: 'cylinder' object has no attribute 'size' |
| [ElectricMotor](https://www.glowscript.org/#/user/GlowScriptDemos/folder/Examples/program/ElectricMotor) | 미지원 속성·메서드 | 미지원 속성·메서드 | 0 | AttributeError: property 'width' of '_Scene' object has no setter | 미지원 속성·메서드: 'extrusion' object has no attribute 'clone' |
| [Extrusions](https://www.glowscript.org/#/user/GlowScriptDemos/folder/Examples/program/Extrusions) | 미지원 속성·메서드 | 미지원 속성·메서드 | 0 | AttributeError: '_TexturePresets' object has no attribute 'wood_old' | 미지원 API(이름 없음): name 'shapes' is not defined |
| [GraphTest](https://www.glowscript.org/#/user/GlowScriptDemos/folder/Examples/program/GraphTest) | 미지원 API(이름 없음) | 미지원 API(이름 없음) | 0 | NameError: name 'cos' is not defined | 통과 |
| [Gyroscope-VPython](https://www.glowscript.org/#/user/GlowScriptDemos/folder/Examples/program/Gyroscope-VPython) | 미지원 속성·메서드 | 미지원 속성·메서드 | 0 | AttributeError: property 'width' of '_Scene' object has no setter | 미지원 속성·메서드: 'compound' object has no attribute 'length' |
| [HardSphereGas-VPython](https://www.glowscript.org/#/user/GlowScriptDemos/folder/Examples/program/HardSphereGas-VPython) | 미지원 API(이름 없음) | 미지원 API(이름 없음) | 0 | NameError: name 'canvas' is not defined | 통과 |
| [LaTexMathDisplay](https://www.glowscript.org/#/user/GlowScriptDemos/folder/Examples/program/LaTexMathDisplay) | 미지원 속성·메서드 | 미지원 속성·메서드 | 0 | AttributeError: property 'width' of '_Scene' object has no setter | 실행 오류: name 'MathJax' is not defined |
| [MatterAndInteractions](https://www.glowscript.org/#/user/GlowScriptDemos/folder/Examples/program/MatterAndInteractions) | Web VPython 전용(제외) | Web VPython 전용(제외) | 0 | SyntaxError: invalid syntax (<student>, line 114) | Web VPython 전용(제외): invalid syntax (<student>, line 114) |
| [MousePicking-VPython](https://www.glowscript.org/#/user/GlowScriptDemos/folder/Examples/program/MousePicking-VPython) | 미지원 속성·메서드 | 미지원 속성·메서드 | 0 | AttributeError: property 'width' of '_Scene' object has no setter | 미지원 API(이름 없음): name 'shapes' is not defined |
| [Plot3D](https://www.glowscript.org/#/user/GlowScriptDemos/folder/Examples/program/Plot3D) | 미지원 속성·메서드 | 미지원 속성·메서드 | 0 | AttributeError: property 'width' of '_Scene' object has no setter | 통과 |
| [RotatingCubes-VPython](https://www.glowscript.org/#/user/GlowScriptDemos/folder/Examples/program/RotatingCubes-VPython) | 통과 | 통과 | 1000 |  | 통과 |
| [RotatingCurve](https://www.glowscript.org/#/user/GlowScriptDemos/folder/Examples/program/RotatingCurve) | 미지원 속성·메서드 | 미지원 속성·메서드 | 0 | AttributeError: property 'width' of '_Scene' object has no setter | 미지원 인자·호출 형식: curve.__init__() takes 1 positional argument but 2 were given |
| [RotatingPoints](https://www.glowscript.org/#/user/GlowScriptDemos/folder/Examples/program/RotatingPoints) | 미지원 속성·메서드 | 미지원 속성·메서드 | 0 | AttributeError: property 'width' of '_Scene' object has no setter | 실행 오류: could not convert string to float: 'pos' |
| [Rug](https://www.glowscript.org/#/user/GlowScriptDemos/folder/Examples/program/Rug) | 미지원 속성·메서드 | 미지원 속성·메서드 | 0 | AttributeError: property 'width' of '_Scene' object has no setter | 미지원 인자·호출 형식: vertex.__init__() got an unexpected keyword argument 'texpos' |
| [ScrollingText](https://www.glowscript.org/#/user/GlowScriptDemos/folder/Examples/program/ScrollingText) | Web VPython 전용(제외) | Web VPython 전용(제외) | 0 | SyntaxError: invalid syntax (<student>, line 10) | Web VPython 전용(제외): invalid syntax (<student>, line 10) |
| [Stars-VPython](https://www.glowscript.org/#/user/GlowScriptDemos/folder/Examples/program/Stars-VPython) | 미지원 속성·메서드 | 미지원 속성·메서드 | 0 | AttributeError: property 'width' of '_Scene' object has no setter | 실행 오류: name 'Stars' is not defined |
| [Stonehenge-VPython](https://www.glowscript.org/#/user/GlowScriptDemos/folder/Examples/program/Stonehenge-VPython) | 미지원 속성·메서드 | 미지원 속성·메서드 | 0 | AttributeError: property 'width' of '_Scene' object has no setter | 미지원 API(이름 없음): name 'shapes' is not defined |
| [Textures-VPython](https://www.glowscript.org/#/user/GlowScriptDemos/folder/Examples/program/Textures-VPython) | 미지원 속성·메서드 | 미지원 속성·메서드 | 0 | AttributeError: property 'width' of '_Scene' object has no setter | 통과 |
| [Transparency](https://www.glowscript.org/#/user/GlowScriptDemos/folder/Examples/program/Transparency) | 미지원 속성·메서드 | 미지원 속성·메서드 | 0 | AttributeError: property 'width' of '_Scene' object has no setter | 통과 |
| [VPythonObjects-VPython](https://www.glowscript.org/#/user/GlowScriptDemos/folder/Examples/program/VPythonObjects-VPython) | 미지원 속성·메서드 | 미지원 속성·메서드 | 0 | AttributeError: property 'width' of '_Scene' object has no setter | 통과 |

즉시 수정으로도 남는 공식 예제 15개의 원인은 `shapes`(4), `global`+`rate`(1), 함수 안 `rate`(1), `group`(1), `cylinder.size`(1), `compound.length`(1), `extrusion.clone`(1), `curve` 호출 형식(2), `vertex(texpos=)`(1), `label.start()`(1), MathJax(1)이다.

## 4. 하네스 방법과 한계

- 정적 하네스는 코드마다 CPython 3.12 자식 프로세스에서 `vpython-api.py`를 로드하고, 워커와 같은 코드로 `vpython` 모듈을 등록한 뒤, 앱의 `code-preprocessor.js`로 전처리한 코드를 실행한다. `js` 모듈은 `postMessage`·`_popEvent`·`_getMousePos`·`_checkStopSignal` 등을 흉내 내는 스텁이다. `rate()`는 240회 또는 3초 뒤 정지 신호를 보내 `while True` 루프를 끝낸다.
- 브라우저 하네스는 Chromium(SwiftShader WebGL)에서 `/sandbox`를 열고 `Worker` 생성자를 가로채 메시지를 기록한다. Monaco 에디터에 코드를 넣고 실행 버튼을 눌러 `done`·`error`를 기다린다. 5초 안에 끝나지 않으면 정지 버튼을 누른다. 코드 하나가 끝나면 Python 전역을 스냅샷으로 되돌린다. 메시 수는 React fiber에서 Three.js 씬을 찾아 센다.
- 이벤트(마우스·키·위젯)는 실제로 발생시키지 않았다. 핸들러 등록과 `scene.mouse.pos` 같은 읽기만 검사했다.
- 자동 판정은 예외·무반응·메시 수만 본다. 그려진 모양이 GlowScript와 같은지는 보지 않는다. E5·E6처럼 코드를 읽어 보충한 항목만 적었다.
- 문서 조각 169개는 공통 서문(흔한 변수 정의)을 붙여 실행했다. 서문에 없는 변수를 가정한 조각 18개는 제외했다.

## 5. 즉시 수정 가능 항목 모음

한 줄 또는 몇 줄이면 되는 것이다. 이 보고서는 목록화가 목적이므로 고치지 않았다. `scripts/compat/shim-quickfixes.py`에 측정용 임시 구현이 있다(제품 품질이 아니다).

| 항목 | 수정 | 효과 |
|---|---|---|
| A1·A2·A14 | 워커의 `_vpython_names` 등록 뒤 `math`의 공개 이름, `random`, `arange`, `clock`, `msclock`, `sign`, `combin`, `print_options`를 vpython 모듈에 추가 | 코드 18개 통과 |
| B1 | `_Scene`에 `width`·`height`·`align`·`resizable` setter (값 저장) | 공식 예제 18개가 다음 줄로 진행 |
| A3 | `canvas(**kw)`: 인자를 `scene`에 적용하고 `scene`을 돌려줌 | 데모·예제 36개가 다음 줄로 진행 |
| B4·B5 | `vector.norm = lambda self: self.hat`, `vector.equals = vector.__eq__`, `vector.random` | 3개 |
| A6·A7 | `rotate()`, `proj()`, `comp()`, `diff_angle()` 함수형을 메서드에 위임 | 7개 |
| A11 | `simple_sphere = sphere` | 1개 |
| A12 | `textures.rock`·`wood_old` 등 문서 이름 보충, `bumpmaps` 프리셋 | 3개 |
| B6·B7 | `cylinder`·`cone`·`arrow`·`helix`에 `length` property, `sphere`에 `size` property | 10개 |
| B8 | `color.hsv_to_rgb`·`rgb_to_hsv` (`colorsys`) | 4개 |
| B9 | `_GObject.__init__`에서 `scene._objects`에 등록, `scene.objects` property | 2개 |
| B13·B14·B15 | `winput.text/number`, `menu.selected/index`, `scene.caption_anchor/title_anchor` | 3개 |
| C1 | `curve.append(pos=, color=, radius=)`, dict·리스트 점 | 8개 |
| F1·F2 | 코스 코드 두 곳 | 내장 코스 2개 |

## 6. 실행 구조 수정 뒤 재측정 (2026-10-30)

2.4절의 D1·D2·D3과 2.2절의 B2·B3, 2.3절의 C3을 고쳤다. 학생 코드 변환을 JS 정규식 전처리기 대신 Worker 안의 Python `ast`([client/src/engine/student-code-transform.py](../client/src/engine/student-code-transform.py))가 맡는다. 대기 함수(`rate`·`sleep`·`scene.pause`·`scene.waitfor`·`input`·`악기`)를 부르는 함수만 호출 그래프를 따라 `async def`로 바꾸고 호출에 `await`를 붙이며, 모듈 수준 코드는 함수로 감싸지 않고 최상위 `await`로 실행한다. 그래서 `global`이 동작하고 트레이스백 줄 번호가 학생 코드와 같다. 설계 비교와 남은 제약은 PR 본문과 [docs/VPYTHON_API.md](VPYTHON_API.md)의 "시뮬레이션 제어" 절에 있다.

### 정적 하네스 (562개, 같은 코퍼스)

| 출처 | 개수 | 정적 통과 (전 → 후) | 즉시 수정 적용 시 통과 (전 → 후) |
|---|---|---|---|
| VPyLab 내장 | 211 | 209 → 209 | 209 → 209 |
| 수업 관용구 | 114 | 57 → 65 | 90 → 98 |
| GlowScript 공식 예제 | 33 | 5 → 6 | 16 → 18 |
| GlowScript 문서 조각 | 169 | 75 → 82 | 95 → 102 |
| VPython 7 데모 | 35 | 0 → 0 | 16 → 17 |
| **합계** | **562** | **346 → 362** | **426 → 444** |

판정이 바뀐 항목은 모두 실패→통과이며 회귀는 없다. 바뀐 항목: `idiom:flow-rate-in-function`(D1), `idiom:flow-rate-in-method`(D1), `idiom:flow-global-called-in-loop`(D2), `idiom:flow-import-as`(D3), `idiom:event-waitfor-click`·`event-waitfor-keydown`(B3), `idiom:event-pause`(B2), `idiom:flow-input`(C3), `docs:mouse:line1`·`line5`, `docs:pause:line1`, `docs:userinput:pre1`·`line1`, `docs:textinput:pre1`·`line1`, `gsexample:Bounce-Callbacks-VPython`(D1, `rate(200, move)` 콜백 형식). 심 적용 시 `gsexample:Stars-VPython`과 `demos:Stars`(D2)도 통과한다. Stars는 심 없이는 여전히 B1(`scene.width` setter)에서 멈춘다.

검토(Codex·Argon 3-way) 뒤 변환기를 스코프별 심볼 테이블로 다시 썼다. 확정할 수 없는 호출(매개변수·첨자·호출 결과를 부르거나 수신자를 모르는 메서드 이름이 async 메서드 이름과 겹치는 경우)은 런타임 보조 `maybe_await`로 감싸 코루틴이면 기다리고 아니면 그대로 돌려준다. 같은 이름의 중첩 함수·생성기·다른 클래스 메서드를 따로 판단하고, 대입·매개변수로 가린 이름은 대기 함수로 보지 않으며, 튜플 언패킹 인스턴스·기본 인수·제너레이터식·클래스 본문을 다룬다. 런타임은 실행마다 새 학생 전역을 만들고, 본문이 끝난 뒤 들어온 이벤트의 핸들러 태스크도 끝날 때까지 실행 상태를 유지하며(하트비트·정지·입력 위젯 동작), `_StopExecution`을 BaseException으로 바꿔 학생의 `except:`가 정지를 삼키지 못하게 했고, 긴 `sleep()`을 0.5초 단위로 나눠 하트비트를 보내며, `rate(fps, callback)`은 양보하고 미완료 콜백 수를 제한한다. 2차 검토 뒤에는 모듈 수준 `global` 선언의 이름 해석 무한 루프를 고치고, 특수 메서드·property를 async로 바꾸지 않으며, 부모 클래스 메서드의 자식 재정의를 `maybe_await`로 기다리고, 본문 종료 뒤 이벤트 처리와 새 실행 전 정리를 try/finally·await로 묶었으며, `음표`·`화음`을 코루틴으로 통일하고, 하트비트 간격을 0.2초로 줄였다. 재측정 결과는 아래와 같다(변환기 재작성 전과 같은 수치).

PR #11(즉시 수정 묶음: 수학 이름·`scene.width`·`length`·`size`·색 변환)이 `main`에 먼저 들어가 이 수정과 합친 뒤 다시 재면 정적 통과는 **414**(내장 211, 관용구 94, 공식 예제 14, 문서 조각 95, 데모 0)이고 심 적용 시 **452**다. 공식 예제 Stars와 Bounce-Callbacks는 심 없이 통과한다. 합치기 전 결과와 비교해 통과에서 실패로 바뀐 항목은 없다. `scripts/compat/out/static-results.json`·`static-shim-results.json`은 합친 뒤의 결과다.

정적 하네스는 `scene.waitfor()`가 기다리는 이벤트를 js 스텁이 한 번 만들어 주고(`scene_bind` 커맨드의 `waiting` 표시로 구분), `input()`에는 `'42'`를 답한다.

### 브라우저 하네스 (공식 예제 33개 · 관용구 114개 부분 실행)

개발 서버(`/sandbox`)에서 Playwright로 공식 예제 33개와 관용구 114개를 다시 실행했다(`--filter gsexample:`, `--filter idiom:`). `stopped`는 하네스가 실행 시간 초과 뒤 정지 버튼으로 끝낸 것이며 `rate()` 무한 루프와 같은 판정이다.

| 출처 | 개수 | 통과 (전 → 후) | 판정이 바뀐 항목 |
|---|---|---|---|
| GlowScript 공식 예제 | 33 | 2 → 2 (+ `stopped` 3 → 4) | `Bounce-Callbacks-VPython`: error → stopped (메시 6개, `rate(200, move)` 콜백 애니메이션이 정지 버튼까지 돈다). `Stars-VPython`은 B1(`scene.width` setter)로 여전히 error |
| 수업 관용구 | 114 | 58 → 61 (+ `stopped` 0 → 4) | `flow-rate-in-function`·`flow-rate-in-method`·`flow-global-called-in-loop`: error → pass. `event-waitfor-click`·`event-waitfor-keydown`·`event-pause`·`flow-input`: error → stopped (이벤트·입력을 기다리다 정지) |

그 밖의 항목은 판정이 같다(회귀 없음).

브라우저 하네스는 클릭·키·입력을 만들어 주지 않으므로 `waitfor`·`pause`·`input()` 코드는 실행 시간 초과 뒤 정지로 끝난다. 실제 화면에서는 샌드박스에서 함수 안 `rate()`와 `global` 점수, `scene.waitfor('click')`·`scene.pause()`, `input()` 위젯, 대기 중 정지 버튼, 함수 안 오류의 줄 번호를 직접 실행해 확인했다(PR 본문).
