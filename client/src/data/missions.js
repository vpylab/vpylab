/**
 * VPyLab 리뉴얼 미션 데이터 (확장형)
 *
 * 설계 원칙:
 * - CT: 컴퓨팅 사고력을 정확히 확인하는 채점형 코어
 * - CR/MA/SC: 정답보다 관찰과 변형을 돕는 튜토리얼형 예제
 * - AR/SN: 음악과 미디어아트를 가장 풍부하게 경험하는 창작형 튜토리얼
 * - 모든 학생용 Python 예제는 한글 API를 먼저 보여주고, 필요한 곳에 영어 API를 병기
 */

import physicalMissions from './physical-missions.js';

const text = (ko, en) => ({ ko, en });

// ── 실행형(run) 미션 조건식 도우미 (DSL은 grading-engine.js 머리 주석 참조) ──
const count = (type, operator, value, message) => ({ type, property: 'count', operator, value, message });
const prop = (type, property, operator, value, extra = {}) => ({ type, property, operator, value, ...extra });
const anyOf = (message, ...options) => ({ anyOf: options, message });
const rateCheck = { pattern: 'rate\\s*\\(', minCount: 1, message: 'rate()로 애니메이션 속도를 조절하세요' };
const sleepCheck = { pattern: 'sleep\\s*\\(', minCount: 1, message: 'sleep()으로 장면 사이를 기다리세요' };

function tutorialMission(data) {
  return {
    ...data,
    gradeType: 'run',
    assertions: data.assertions || [],
    solutionCode: data.solutionCode || data.starterCode,
  };
}

const missions = [
  // ═══════════════════════════════════════════
  // CT: Computational Thinking (정확 채점형 코어)
  // ═══════════════════════════════════════════
  {
    id: 'CT-1',
    category: 'CT',
    level: 1,
    title: text('첫 3D 객체: 빛나는 행성', 'First 3D Object: Glowing Planet'),
    description: text(
      'sphere()로 구를 만들고, 기본 반지름 1보다 크게 만든 뒤 파랑 성분이 있는 색과 빛남(emissive)을 지정합니다.',
      'Create a sphere, make it larger than the default radius 1, then set a color with some blue and emissive glow.',
    ),
    gradeType: 'A',
    starterCode: `from vpython import *

scene_background(색상['검정'])

# 목표: 빛나는 행성 하나를 만드세요.
# 채점 기준:
# 1. sphere()로 구를 만듭니다.
# 2. radius를 기본값 1보다 크게 만듭니다. 예: radius=1.2
# 3. color에는 파랑 성분이 있는 색을 씁니다. 예: 색상['보라'], 색상['파랑'], 색상['하늘']
# 4. emissive=True로 스스로 빛나게 만듭니다.

# 여기에 코드를 작성하세요.
`,
    solutionCode: `from vpython import *

scene_background(색상['검정'])

행성 = sphere(
    pos=vector(0, 0, 0),
    radius=1.2,
    color=색상['보라'],
    emissive=True
)
`,
    assertions: [
      { type: 'sphere', property: 'radius', operator: '>', value: 1 },
      { type: 'sphere', property: 'emissive', operator: '==', value: true },
      { type: 'sphere', property: 'color.b', operator: '>', value: 0.3 },
    ],
    hints: [
      text('sphere()는 3D 구를 만듭니다.', 'sphere() creates a 3D sphere.'),
      text('기본 반지름은 1이므로 radius=1.2처럼 1보다 크게 지정하세요.', 'The default radius is 1, so set a value larger than 1 such as radius=1.2.'),
      text("색상['보라']나 색상['파랑']처럼 파랑 성분이 있는 색을 고르세요.", "Choose a color with some blue, such as 색상['보라'] or 색상['파랑']."),
      text("emissive=True를 넣으면 행성이 스스로 빛납니다.", 'Add emissive=True to make it glow.'),
    ],
  },
  {
    id: 'CT-2',
    category: 'CT',
    level: 1,
    title: text('상태 바꾸기: 신호등', 'Changing State: Traffic Light'),
    description: text(
      '변수에 담긴 객체의 color와 emissive 속성을 바꾸며 순차 실행을 연습합니다.',
      'Practice sequential execution by changing an object variable’s color and emissive state.',
    ),
    gradeType: 'A',
    starterCode: `from vpython import *

box(pos=vector(0, 1.5, 0), size=vector(1.2, 3.5, 0.4), color=색상['회색'])

빨강 = sphere(pos=vector(0, 2.5, 0.25), radius=0.35, color=vector(0.25, 0, 0))
노랑 = sphere(pos=vector(0, 1.5, 0.25), radius=0.35, color=vector(0.25, 0.25, 0))
초록 = sphere(pos=vector(0, 0.5, 0.25), radius=0.35, color=vector(0, 0.25, 0))

빨강.color = color.red
빨강.emissive = True
sleep(0.5)

빨강.color = vector(0.25, 0, 0)
빨강.emissive = False

# 목표 1: 노란불을 켜고 잠시 기다리세요.


# 목표 2: 노란불을 끄고 초록불을 켜세요.


print("신호등 완성")
`,
    solutionCode: `from vpython import *

box(pos=vector(0, 1.5, 0), size=vector(1.2, 3.5, 0.4), color=색상['회색'])

빨강 = sphere(pos=vector(0, 2.5, 0.25), radius=0.35, color=vector(0.25, 0, 0))
노랑 = sphere(pos=vector(0, 1.5, 0.25), radius=0.35, color=vector(0.25, 0.25, 0))
초록 = sphere(pos=vector(0, 0.5, 0.25), radius=0.35, color=vector(0, 0.25, 0))

빨강.color = color.red
빨강.emissive = True
sleep(0.5)

빨강.color = vector(0.25, 0, 0)
빨강.emissive = False
노랑.color = color.yellow
노랑.emissive = True
sleep(0.5)

노랑.color = vector(0.25, 0.25, 0)
노랑.emissive = False
초록.color = color.green
초록.emissive = True

print("신호등 완성")
`,
    assertions: [
      { type: 'sphere', property: 'color.g', operator: '==', value: 1, tolerance: 0.01, index: 2 },
      { type: 'sphere', property: 'emissive', operator: '==', value: true, index: 2 },
      { type: 'sphere', property: 'emissive', operator: '==', value: false, index: 1 },
    ],
    hints: [
      text('노랑.color = color.yellow로 노란불을 켭니다.', 'Use 노랑.color = color.yellow to turn on yellow.'),
      text('빛남은 노랑.emissive = True처럼 바꿉니다.', 'Change glow with 노랑.emissive = True.'),
      text('마지막 상태는 초록불만 켜진 상태여야 합니다.', 'The final state should leave only green glowing.'),
    ],
  },
  {
    id: 'CT-3',
    category: 'CT',
    level: 2,
    title: text('함수로 스탬프 찍기', 'Stamp with a Function'),
    description: text(
      'def로 함수를 만들고, 같은 모양을 다른 위치에 여러 번 배치합니다.',
      'Define a reusable function and place the same shape in multiple positions.',
    ),
    gradeType: 'A',
    starterCode: `from vpython import *

def 스탬프(x, z, 색):
    sphere(pos=vector(x, 0, z), radius=0.35, color=색, emissive=True)
    ring(pos=vector(x, 0, z), axis=vector(0, 1, 0), radius=0.55, thickness=0.04, color=색)

# 첫 번째 스탬프
스탬프(0, 0, 색상['하늘'])

# 목표: 위치와 색을 바꾸어 스탬프를 두 번 더 호출하세요.
`,
    solutionCode: `from vpython import *

def 스탬프(x, z, 색):
    sphere(pos=vector(x, 0, z), radius=0.35, color=색, emissive=True)
    ring(pos=vector(x, 0, z), axis=vector(0, 1, 0), radius=0.55, thickness=0.04, color=색)

스탬프(0, 0, 색상['하늘'])
스탬프(-2, 1.5, 색상['분홍'])
스탬프(2, -1.5, 색상['노랑'])
`,
    assertions: [
      { type: 'sphere', property: 'emissive', operator: '==', value: true, index: 0 },
      { type: 'sphere', property: 'pos.x', operator: '<', value: 0, index: 1 },
      { type: 'sphere', property: 'pos.x', operator: '>', value: 0, index: 2 },
    ],
    codeChecks: [
      { pattern: 'def\\s+스탬프\\s*\\(', minCount: 1, message: '스탬프() 함수를 정의하세요' },
      { pattern: '스탬프\\s*\\(', minCount: 4, message: '스탬프()를 세 번 호출하세요' },
    ],
    hints: [
      text('함수 정의 1번, 호출 3번이면 코드가 훨씬 짧아집니다.', 'One function definition and three calls keep the code short.'),
      text('스탬프(-2, 1.5, 색상[\'분홍\'])처럼 호출하세요.', 'Call it like 스탬프(-2, 1.5, 색상[\'분홍\']).'),
    ],
  },
  {
    id: 'CT-4',
    category: 'CT',
    level: 2,
    title: text('조건문으로 색 고르기', 'Choose Colors with Conditions'),
    description: text(
      'if/elif/else로 높이에 따라 색을 고르고, 반복문으로 12층 탑을 만듭니다.',
      'Use if/elif/else to choose colors by height and build a 12-level tower with a loop.',
    ),
    gradeType: 'A',
    starterCode: `from vpython import *

def 층색(i):
    if i < 4:
        return 색상['파랑']
    elif i < 8:
        return 색상['초록']
    else:
        return 색상['노랑']

for i in range(12):
    y = i * 0.5
    색 = 층색(i)
    # 목표: y 높이에 구를 하나씩 쌓으세요.
`,
    solutionCode: `from vpython import *

def 층색(i):
    if i < 4:
        return 색상['파랑']
    elif i < 8:
        return 색상['초록']
    else:
        return 색상['노랑']

for i in range(12):
    y = i * 0.5
    색 = 층색(i)
    sphere(pos=vector(0, y, 0), radius=0.25, color=색)
`,
    assertions: [
      { type: 'sphere', property: 'pos.y', operator: 'approx', value: 0, index: 0 },
      { type: 'sphere', property: 'color.g', operator: '==', value: 1, tolerance: 0.01, index: 5 },
      { type: 'sphere', property: 'pos.y', operator: 'approx', value: 5.5, index: 11 },
    ],
    codeChecks: [
      { pattern: 'if\\s+', minCount: 1, message: 'if 조건문을 사용하세요' },
      { pattern: 'for\\s+.*range\\s*\\(', minCount: 1, message: 'for range 반복문을 사용하세요' },
    ],
    hints: [
      text('sphere(pos=vector(0, y, 0), color=색)로 쌓으면 됩니다.', 'Use sphere(pos=vector(0, y, 0), color=색).'),
      text('i가 커질수록 y도 커지도록 연결하세요.', 'Make y grow as i grows.'),
    ],
  },
  {
    id: 'CT-5',
    category: 'CT',
    level: 3,
    title: text('리스트로 움직임 업데이트', 'Update Motion with Lists'),
    description: text(
      '객체와 속도를 리스트에 저장하고, 반복문 안에서 모든 객체의 위치를 갱신합니다.',
      'Store objects and velocities in lists, then update every object in a loop.',
    ),
    gradeType: 'A',
    starterCode: `from vpython import *

불빛들 = []
속도들 = []

for i in range(5):
    x = -4 + i * 2
    불빛 = sphere(pos=vector(x, 0, 0), radius=0.18, color=무지개[i], emissive=True, make_trail=True)
    불빛들.append(불빛)
    속도들.append(vector(0, i + 1, 0))

dt = 0.05

for step in range(20):
    rate(30)
    for i in range(len(불빛들)):
        # 목표: i번째 불빛의 위치를 i번째 속도만큼 업데이트하세요.
        pass
`,
    solutionCode: `from vpython import *

불빛들 = []
속도들 = []

for i in range(5):
    x = -4 + i * 2
    불빛 = sphere(pos=vector(x, 0, 0), radius=0.18, color=무지개[i], emissive=True, make_trail=True)
    불빛들.append(불빛)
    속도들.append(vector(0, i + 1, 0))

dt = 0.05

for step in range(20):
    rate(30)
    for i in range(len(불빛들)):
        불빛들[i].pos = 불빛들[i].pos + 속도들[i] * dt
`,
    assertions: [
      { type: 'sphere', property: 'pos.y', operator: '>', value: 0.9, index: 0 },
      { type: 'sphere', property: 'pos.y', operator: '>', value: 4.5, index: 4 },
    ],
    codeChecks: [
      { pattern: '\\.append\\s*\\(', minCount: 2, message: '객체와 속도를 리스트에 append하세요' },
      { pattern: '\\.pos\\s*=', minCount: 1, message: '리스트 속 객체의 pos를 업데이트하세요' },
    ],
    hints: [
      text('불빛들[i]는 i번째 객체, 속도들[i]는 i번째 속도입니다.', '불빛들[i] is the i-th object; 속도들[i] is the i-th velocity.'),
      text('위치 업데이트 공식은 새 위치 = 현재 위치 + 속도 * dt 입니다.', 'Motion update: new position = current position + velocity * dt.'),
    ],
  },
  {
    id: 'CT-6',
    category: 'CT',
    level: 1,
    title: text('변수로 행성 조절하기', 'Control a Planet with Variables'),
    description: text(
      '숫자, 색, 위치를 변수로 먼저 정하고 그 변수를 sphere()에 넣는 연습입니다.',
      'Practice setting number, color, and position variables before passing them to sphere().',
    ),
    gradeType: 'A',
    starterCode: `from vpython import *

scene_background(색상['검정'])

# 목표: 아래 세 변수만 바꿔서 조건에 맞는 행성을 만드세요.
크기 = 0.4
행성색 = 색상['회색']
위치 = vector(0, 0, 0)

행성 = sphere(pos=위치, radius=크기, color=행성색, emissive=True)

# 통과 조건: 크기 1 이상, x 위치 2, 파란빛이 있는 색
`,
    solutionCode: `from vpython import *

scene_background(색상['검정'])

크기 = 1.2
행성색 = 색상['하늘']
위치 = vector(2, 0, 0)

행성 = sphere(pos=위치, radius=크기, color=행성색, emissive=True)
`,
    assertions: [
      { type: 'sphere', property: 'radius', operator: '>=', value: 1 },
      { type: 'sphere', property: 'pos.x', operator: '==', value: 2 },
      { type: 'sphere', property: 'color.b', operator: '>', value: 0.8 },
    ],
    hints: [
      text('도형을 직접 고치기 전에 변수를 먼저 고치면 코드가 읽기 쉬워집니다.', 'Changing variables first makes code easier to read.'),
      text('위치는 vector(2, 0, 0)처럼 x, y, z를 함께 씁니다.', 'Use vector(2, 0, 0) for x, y, z position.'),
      text("색상['하늘']은 파란빛이 강한 색입니다.", "색상['하늘'] has a strong blue component."),
    ],
  },
  {
    id: 'CT-7',
    category: 'CT',
    level: 1,
    title: text('반복문으로 조명 줄 세우기', 'Line Up Lights with a Loop'),
    description: text(
      'for range의 숫자와 위치 공식을 조금 고쳐 같은 패턴을 여러 번 만듭니다.',
      'Adjust a for-range count and position formula to repeat a pattern.',
    ),
    gradeType: 'A',
    starterCode: `from vpython import *

scene_background(색상['검정'])

# 목표: 조명 6개가 x=-2.5부터 x=2.5까지 한 줄로 놓이게 만드세요.
# 지금은 3개만 만들어집니다.
for i in range(3):
    x = -2.5 + i * 1
    sphere(pos=vector(x, 0, 0), radius=0.18, color=무지개[i % 7], emissive=True)
`,
    solutionCode: `from vpython import *

scene_background(색상['검정'])

for i in range(6):
    x = -2.5 + i * 1
    sphere(pos=vector(x, 0, 0), radius=0.18, color=무지개[i % 7], emissive=True)
`,
    assertions: [
      { type: 'sphere', property: 'pos.x', operator: 'approx', value: -2.5, index: 0 },
      { type: 'sphere', property: 'pos.x', operator: 'approx', value: 2.5, index: 5 },
    ],
    codeChecks: [
      { pattern: 'range\\s*\\(\\s*6\\s*\\)', minCount: 1, message: 'range(6)으로 조명 6개를 만드세요' },
    ],
    hints: [
      text('range(3)은 0, 1, 2 세 번 반복합니다.', 'range(3) repeats three times: 0, 1, 2.'),
      text('6개가 필요하면 range 안의 숫자를 바꾸면 됩니다.', 'If you need six objects, change the number inside range.'),
      text('마지막 i는 5가 되므로 x = -2.5 + 5 * 1 입니다.', 'The last i is 5, so x = -2.5 + 5 * 1.'),
    ],
  },
  {
    id: 'CT-8',
    category: 'CT',
    level: 2,
    title: text('매개변수로 버튼 찍기', 'Stamp Buttons with Parameters'),
    description: text(
      '함수의 매개변수 x와 색을 실제 도형 속성에 연결하는 연습입니다.',
      'Practice connecting function parameters x and color to actual object properties.',
    ),
    gradeType: 'A',
    starterCode: `from vpython import *

def 버튼(x, 색):
    # 목표: x와 색 매개변수가 실제 버튼에 반영되게 고치세요.
    sphere(pos=vector(0, 0, 0), radius=0.25, color=색상['회색'], emissive=True)

버튼(-2, 색상['빨강'])
버튼(0, 색상['노랑'])
버튼(2, 색상['초록'])
`,
    solutionCode: `from vpython import *

def 버튼(x, 색):
    sphere(pos=vector(x, 0, 0), radius=0.25, color=색, emissive=True)

버튼(-2, 색상['빨강'])
버튼(0, 색상['노랑'])
버튼(2, 색상['초록'])
`,
    assertions: [
      { type: 'sphere', property: 'pos.x', operator: '<', value: -1, index: 0 },
      { type: 'sphere', property: 'color.r', operator: '==', value: 1, index: 0 },
      { type: 'sphere', property: 'pos.x', operator: '>', value: 1, index: 2 },
      { type: 'sphere', property: 'color.g', operator: '==', value: 1, tolerance: 0.01, index: 2 },
    ],
    codeChecks: [
      { pattern: 'pos\\s*=\\s*vector\\s*\\(\\s*x\\s*,', minCount: 1, message: 'x 매개변수를 위치에 사용하세요' },
      { pattern: 'color\\s*=\\s*색\\s*[,)]', minCount: 1, message: '색 매개변수를 color에 사용하세요' },
    ],
    hints: [
      text('매개변수는 함수 안에서 변수처럼 사용할 수 있습니다.', 'Parameters can be used like variables inside a function.'),
      text('vector(x, 0, 0)으로 버튼마다 다른 x 위치를 줄 수 있습니다.', 'Use vector(x, 0, 0) to give each button a different x position.'),
      text('color=색이라고 쓰면 호출할 때 넣은 색이 적용됩니다.', 'color=색 applies the color passed into the function call.'),
    ],
  },
  {
    id: 'CT-9',
    category: 'CT',
    level: 2,
    title: text('조건문으로 온도 색 정하기', 'Choose Temperature Colors with Conditions'),
    description: text(
      'if/elif/else로 온도 값에 따라 차가움, 적당함, 뜨거움을 색으로 표현합니다.',
      'Use if/elif/else to represent cold, mild, and hot temperatures with colors.',
    ),
    gradeType: 'A',
    starterCode: `from vpython import *

def 온도색(온도):
    # 목표: 20보다 낮으면 파랑, 30보다 낮으면 노랑, 나머지는 빨강을 반환하세요.
    if 온도 < 20:
        return 색상['회색']
    elif 온도 < 30:
        return 색상['회색']
    else:
        return 색상['회색']

온도들 = [15, 24, 34]

for i in range(len(온도들)):
    sphere(pos=vector(-1 + i, 0, 0), radius=0.25, color=온도색(온도들[i]), emissive=True)
`,
    solutionCode: `from vpython import *

def 온도색(온도):
    if 온도 < 20:
        return 색상['파랑']
    elif 온도 < 30:
        return 색상['노랑']
    else:
        return 색상['빨강']

온도들 = [15, 24, 34]

for i in range(len(온도들)):
    sphere(pos=vector(-1 + i, 0, 0), radius=0.25, color=온도색(온도들[i]), emissive=True)
`,
    assertions: [
      { type: 'sphere', property: 'color.b', operator: '==', value: 1, index: 0 },
      { type: 'sphere', property: 'color.r', operator: '==', value: 1, index: 1 },
      { type: 'sphere', property: 'color.r', operator: '==', value: 1, index: 2 },
      { type: 'sphere', property: 'color.g', operator: '==', value: 0, index: 2 },
    ],
    codeChecks: [
      { pattern: 'elif\\s+', minCount: 1, message: 'elif로 중간 조건을 표현하세요' },
      { pattern: 'else\\s*:', minCount: 1, message: 'else로 나머지 경우를 처리하세요' },
    ],
    hints: [
      text('조건은 위에서 아래로 검사됩니다.', 'Conditions are checked from top to bottom.'),
      text('15는 첫 조건, 24는 두 번째 조건, 34는 else로 가야 합니다.', '15 should use the first condition, 24 the second, and 34 the else branch.'),
      text("노랑은 r과 g가 모두 1이고, 빨강은 r만 1입니다.", 'Yellow has r and g at 1; red has only r at 1.'),
    ],
  },
  {
    id: 'CT-10',
    category: 'CT',
    level: 2,
    title: text('두 리스트 연결하기', 'Connect Two Lists'),
    description: text(
      '객체 리스트와 이동량 리스트를 같은 인덱스로 연결해 한 번에 위치를 업데이트합니다.',
      'Use the same index to connect an object list and a movement list, then update positions.',
    ),
    gradeType: 'A',
    starterCode: `from vpython import *

불빛들 = []
이동량들 = [vector(0, 0.3, 0), vector(0, 0.6, 0), vector(0, 0.9, 0)]

for i in range(3):
    불빛 = sphere(pos=vector(-1 + i, 0, 0), radius=0.2, color=무지개[i], emissive=True)
    불빛들.append(불빛)

for i in range(len(불빛들)):
    # 목표: i번째 불빛을 i번째 이동량만큼 위로 옮기세요.
    pass
`,
    solutionCode: `from vpython import *

불빛들 = []
이동량들 = [vector(0, 0.3, 0), vector(0, 0.6, 0), vector(0, 0.9, 0)]

for i in range(3):
    불빛 = sphere(pos=vector(-1 + i, 0, 0), radius=0.2, color=무지개[i], emissive=True)
    불빛들.append(불빛)

for i in range(len(불빛들)):
    불빛들[i].pos = 불빛들[i].pos + 이동량들[i]
`,
    assertions: [
      { type: 'sphere', property: 'pos.y', operator: '>', value: 0.25, index: 0 },
      { type: 'sphere', property: 'pos.y', operator: '>', value: 0.55, index: 1 },
      { type: 'sphere', property: 'pos.y', operator: '>', value: 0.85, index: 2 },
    ],
    codeChecks: [
      { pattern: '불빛들\\s*\\[\\s*i\\s*\\]\\.pos\\s*=', minCount: 1, message: '불빛들[i].pos를 업데이트하세요' },
      { pattern: '이동량들\\s*\\[\\s*i\\s*\\]', minCount: 1, message: '이동량들[i]를 사용하세요' },
    ],
    hints: [
      text('두 리스트의 같은 번호끼리 한 쌍이라고 생각하세요.', 'Think of matching indexes in the two lists as pairs.'),
      text('불빛들[i].pos는 i번째 불빛의 위치입니다.', '불빛들[i].pos is the position of the i-th light.'),
      text('현재 위치에 이동량들[i]를 더하면 됩니다.', 'Add 이동량들[i] to the current position.'),
    ],
  },
  {
    id: 'CT-11',
    category: 'CT',
    level: 2,
    title: text('for와 리스트로 색 꺼내기', 'Use for with a List'),
    description: text(
      '색 리스트에서 i번째 색을 꺼내 구슬에 적용하며 for와 list 인덱스를 연결합니다.',
      'Connect a for loop with list indexing by applying the i-th color to each sphere.',
    ),
    gradeType: 'A',
    starterCode: `from vpython import *

색들 = [색상['빨강'], 색상['노랑'], 색상['파랑'], 색상['초록']]

for i in range(len(색들)):
    x = -1.5 + i
    # 목표: 모든 구슬이 회색이 아니라 색들[i]의 색을 갖게 하세요.
    sphere(pos=vector(x, 0, 0), radius=0.22, color=색상['회색'], emissive=True)
`,
    solutionCode: `from vpython import *

색들 = [색상['빨강'], 색상['노랑'], 색상['파랑'], 색상['초록']]

for i in range(len(색들)):
    x = -1.5 + i
    sphere(pos=vector(x, 0, 0), radius=0.22, color=색들[i], emissive=True)
`,
    assertions: [
      { type: 'sphere', property: 'color.r', operator: '==', value: 1, index: 0 },
      { type: 'sphere', property: 'color.b', operator: '==', value: 1, index: 2 },
      { type: 'sphere', property: 'color.g', operator: '==', value: 1, tolerance: 0.01, index: 3 },
    ],
    codeChecks: [
      { pattern: '색들\\s*\\[\\s*i\\s*\\]', minCount: 1, message: '색들[i]로 리스트에서 색을 꺼내세요' },
    ],
    hints: [
      text('i는 반복할 때마다 0, 1, 2, 3으로 바뀝니다.', 'i changes to 0, 1, 2, 3 during the loop.'),
      text('색들[i]는 현재 번호에 맞는 색을 꺼냅니다.', '색들[i] gets the color for the current index.'),
      text('color=색들[i]처럼 color 자리에 넣으면 됩니다.', 'Put it in the color slot: color=색들[i].'),
    ],
  },
  {
    id: 'CT-12',
    category: 'CT',
    level: 2,
    title: text('if 두 개: 조건을 각각 적용하기', 'Two if Statements: Apply Conditions Separately'),
    description: text(
      '서로 독립적인 if 두 개가 모두 실행될 수 있음을 확인합니다.',
      'See that two independent if statements can both run.',
    ),
    gradeType: 'A',
    starterCode: `from vpython import *

x = 1
y = 1

점 = sphere(pos=vector(x, y, 0), radius=0.2, color=색상['회색'])

# 목표: x가 양수이면 빨간색으로 바꾸세요.
if x > 0:
    pass

# 목표: y가 양수이면 크기를 0.45로 키우세요.
if y > 0:
    pass
`,
    solutionCode: `from vpython import *

x = 1
y = 1

점 = sphere(pos=vector(x, y, 0), radius=0.2, color=색상['회색'])

if x > 0:
    점.color = 색상['빨강']

if y > 0:
    점.radius = 0.45
`,
    assertions: [
      { type: 'sphere', property: 'color.r', operator: '==', value: 1 },
      { type: 'sphere', property: 'radius', operator: '>=', value: 0.45 },
    ],
    codeChecks: [
      { pattern: '\\bif\\s+', minCount: 2, message: '독립적인 if 두 개를 사용하세요' },
    ],
    hints: [
      text('if 두 개는 둘 다 참이면 둘 다 실행됩니다.', 'Two if statements both run when both conditions are true.'),
      text('첫 if 안에서는 색을 바꾸고, 둘째 if 안에서는 크기를 바꿉니다.', 'Change color in the first if and size in the second.'),
    ],
  },
  {
    id: 'CT-13',
    category: 'CT',
    level: 2,
    title: text('if else: 둘 중 하나 고르기', 'if else: Choose One of Two'),
    description: text(
      '조건이 참일 때와 거짓일 때 중 정확히 한 가지 길만 실행되는 구조를 연습합니다.',
      'Practice a structure where exactly one of two paths runs.',
    ),
    gradeType: 'A',
    starterCode: `from vpython import *

점수 = 75
결과 = sphere(pos=vector(0, 0, 0), radius=0.3, color=색상['회색'])

# 목표: 점수가 60 이상이면 초록, 아니면 빨강으로 표시하세요.
if 점수 >= 60:
    pass
else:
    pass
`,
    solutionCode: `from vpython import *

점수 = 75
결과 = sphere(pos=vector(0, 0, 0), radius=0.3, color=색상['회색'])

if 점수 >= 60:
    결과.color = 색상['초록']
else:
    결과.color = 색상['빨강']
`,
    assertions: [
      { type: 'sphere', property: 'color.g', operator: '==', value: 1, tolerance: 0.01 },
      { type: 'sphere', property: 'color.r', operator: '==', value: 0 },
    ],
    codeChecks: [
      { pattern: 'else\\s*:', minCount: 1, message: 'else로 나머지 경우를 처리하세요' },
    ],
    hints: [
      text('if가 참이면 else 안쪽은 실행되지 않습니다.', 'When if is true, the else block does not run.'),
      text("초록은 색상['초록'], 빨강은 색상['빨강']입니다.", "Green is 색상['초록']; red is 색상['빨강']."),
    ],
  },
  {
    id: 'CT-14',
    category: 'CT',
    level: 2,
    title: text('if elif else: 세 단계 속도 배지', 'if elif else: Three-Speed Badge'),
    description: text(
      '느림, 보통, 빠름 세 단계 중 하나를 고르는 조건문을 완성합니다.',
      'Complete a conditional that chooses one of slow, medium, and fast.',
    ),
    gradeType: 'A',
    starterCode: `from vpython import *

속도 = 7
배지 = sphere(pos=vector(0, 0, 0), radius=0.3, color=색상['회색'], emissive=True)

# 목표: 속도 < 3 파랑, 속도 < 8 노랑, 나머지 빨강
if 속도 < 3:
    배지.color = 색상['회색']
elif 속도 < 8:
    배지.color = 색상['회색']
else:
    배지.color = 색상['회색']
`,
    solutionCode: `from vpython import *

속도 = 7
배지 = sphere(pos=vector(0, 0, 0), radius=0.3, color=색상['회색'], emissive=True)

if 속도 < 3:
    배지.color = 색상['파랑']
elif 속도 < 8:
    배지.color = 색상['노랑']
else:
    배지.color = 색상['빨강']
`,
    assertions: [
      { type: 'sphere', property: 'color.r', operator: '==', value: 1 },
      { type: 'sphere', property: 'color.g', operator: '==', value: 1 },
      { type: 'sphere', property: 'color.b', operator: '==', value: 0 },
    ],
    codeChecks: [
      { pattern: 'elif\\s+', minCount: 1, message: 'elif로 중간 단계를 표현하세요' },
      { pattern: 'else\\s*:', minCount: 1, message: 'else로 마지막 단계를 처리하세요' },
    ],
    hints: [
      text('속도 7은 첫 조건은 거짓, 두 번째 조건은 참입니다.', 'Speed 7 fails the first condition and passes the second.'),
      text('elif는 앞 조건이 거짓일 때만 검사됩니다.', 'elif is checked only if earlier conditions were false.'),
    ],
  },
  {
    id: 'CT-15',
    category: 'CT',
    level: 2,
    title: text('if elif elif else: 네 단계 레벨', 'if elif elif else: Four-Level Badge'),
    description: text(
      '조건이 네 갈래로 나뉘는 구조를 완성해 점수에 맞는 레벨 색을 만듭니다.',
      'Complete a four-branch conditional to choose a level color by score.',
    ),
    gradeType: 'A',
    starterCode: `from vpython import *

점수 = 92
레벨 = sphere(pos=vector(0, 0, 0), radius=0.35, color=색상['회색'], emissive=True)

# 목표: 40 미만 회색, 70 미만 파랑, 90 미만 보라, 나머지 금색
if 점수 < 40:
    레벨.color = 색상['회색']
elif 점수 < 70:
    레벨.color = 색상['회색']
elif 점수 < 90:
    레벨.color = 색상['회색']
else:
    레벨.color = 색상['회색']
`,
    solutionCode: `from vpython import *

점수 = 92
레벨 = sphere(pos=vector(0, 0, 0), radius=0.35, color=색상['회색'], emissive=True)

if 점수 < 40:
    레벨.color = 색상['회색']
elif 점수 < 70:
    레벨.color = 색상['파랑']
elif 점수 < 90:
    레벨.color = 색상['보라']
else:
    레벨.color = 색상['금색']
`,
    assertions: [
      { type: 'sphere', property: 'color.r', operator: '==', value: 1 },
      { type: 'sphere', property: 'color.g', operator: '>', value: 0.8 },
      { type: 'sphere', property: 'color.b', operator: '==', value: 0 },
    ],
    codeChecks: [
      { pattern: 'elif\\s+', minCount: 2, message: 'elif를 두 번 사용해 네 단계를 만드세요' },
      { pattern: 'else\\s*:', minCount: 1, message: 'else로 최고 단계를 처리하세요' },
    ],
    hints: [
      text('점수 92는 앞의 세 조건을 모두 지나 else로 갑니다.', 'Score 92 skips the first three conditions and reaches else.'),
      text("금색은 색상['금색'] 또는 색상['금']으로 쓸 수 있습니다.", "Gold can be written as 색상['금색'] or 색상['금']."),
    ],
  },
  {
    id: 'CT-16',
    category: 'CT',
    level: 2,
    title: text('list append: 만든 객체 모으기', 'list append: Collect Created Objects'),
    description: text(
      '반복문에서 만든 객체를 리스트에 append한 뒤, 리스트를 사용해 한 번 더 조작합니다.',
      'Append created objects into a list, then use the list to modify them again.',
    ),
    gradeType: 'A',
    starterCode: `from vpython import *

구슬들 = []

for i in range(4):
    구슬 = sphere(pos=vector(-1.5 + i, 0, 0), radius=0.2, color=무지개[i], emissive=True)
    # 목표: 만든 구슬을 구슬들 리스트에 추가하세요.
    pass

for i in range(len(구슬들)):
    구슬들[i].pos = 구슬들[i].pos + vector(0, 1, 0)
`,
    solutionCode: `from vpython import *

구슬들 = []

for i in range(4):
    구슬 = sphere(pos=vector(-1.5 + i, 0, 0), radius=0.2, color=무지개[i], emissive=True)
    구슬들.append(구슬)

for i in range(len(구슬들)):
    구슬들[i].pos = 구슬들[i].pos + vector(0, 1, 0)
`,
    assertions: [
      { type: 'sphere', property: 'pos.y', operator: '==', value: 1, index: 0 },
      { type: 'sphere', property: 'pos.y', operator: '==', value: 1, index: 3 },
    ],
    codeChecks: [
      { pattern: '구슬들\\.append\\s*\\(\\s*구슬\\s*\\)', minCount: 1, message: '구슬들.append(구슬)을 사용하세요' },
    ],
    hints: [
      text('append는 리스트 맨 뒤에 새 값을 넣습니다.', 'append adds a new value to the end of a list.'),
      text('리스트에 넣어야 두 번째 반복문에서 다시 찾을 수 있습니다.', 'You must store objects in the list to use them in the second loop.'),
    ],
  },
  {
    id: 'CT-17',
    category: 'CT',
    level: 2,
    title: text('random으로 별 흩뿌리기', 'Scatter Stars with random'),
    description: text(
      'random.uniform과 random.choice를 사용해 위치와 색이 조금씩 다른 별을 만듭니다.',
      'Use random.uniform and random.choice to create stars with varied positions and colors.',
    ),
    gradeType: 'A',
    starterCode: `from vpython import *
import random

scene_background(색상['검정'])
random.seed(7)

for i in range(5):
    # 목표: x를 random.uniform(-2, 2)로 정하고, 색을 random.choice(무지개)로 고르세요.
    x = 0
    별색 = 색상['회색']
    sphere(pos=vector(x, 0, 0), radius=0.12, color=별색, emissive=True)
`,
    solutionCode: `from vpython import *
import random

scene_background(색상['검정'])
random.seed(7)

for i in range(5):
    x = random.uniform(-2, 2)
    별색 = random.choice(무지개)
    sphere(pos=vector(x, 0, 0), radius=0.12, color=별색, emissive=True)
`,
    assertions: [
      { type: 'sphere', property: 'pos.x', operator: '!=', value: 0, index: 0 },
      { type: 'sphere', property: 'pos.x', operator: '!=', value: 0, index: 4 },
    ],
    codeChecks: [
      { pattern: 'random\\.uniform\\s*\\(', minCount: 1, message: 'random.uniform()으로 랜덤 위치를 만드세요' },
      { pattern: 'random\\.choice\\s*\\(', minCount: 1, message: 'random.choice()로 랜덤 색을 고르세요' },
    ],
    hints: [
      text('random.uniform(-2, 2)는 -2와 2 사이의 실수를 만듭니다.', 'random.uniform(-2, 2) creates a float between -2 and 2.'),
      text('random.choice(무지개)는 무지개 리스트에서 하나를 고릅니다.', 'random.choice(무지개) picks one item from the rainbow list.'),
      text('random.seed(7)은 수업에서 같은 결과를 보기 위한 장치입니다.', 'random.seed(7) keeps results reproducible in class.'),
    ],
  },

  // ═══════════════════════════════════════════
  // CR: Creative Gallery (튜토리얼형 창작)
  // ═══════════════════════════════════════════
  tutorialMission({
    id: 'CR-1',
    category: 'CR',
    level: 1,
    title: text('갤러리 씨앗: 나만의 캐릭터', 'Gallery Seed: Your Character'),
    description: text(
      '완성된 캐릭터 예제를 실행하고 색, 표정, 장식을 바꿔 리믹스합니다.',
      'Run a finished character example, then remix its colors, face, and accessories.',
    ),
    starterCode: `from vpython import *

scene_background(색상['하늘'])

몸 = sphere(pos=vector(0, 0.6, 0), radius=0.9, color=색상['민트'])
머리 = sphere(pos=vector(0, 1.8, 0), radius=0.55, color=색상['살구'])

sphere(pos=vector(-0.18, 1.95, 0.5), radius=0.06, color=색상['검정'])
sphere(pos=vector(0.18, 1.95, 0.5), radius=0.06, color=색상['검정'])
ring(pos=vector(0, 1.72, 0.53), axis=vector(0, 0, 1), radius=0.18, thickness=0.025, color=색상['분홍'])

# 바꿔보기: 몸 색, 눈 위치, 입 모양, 장식 색을 바꿔보세요.
효과음("levelup")
print("캐릭터 리믹스 시작!")
`,
    solutionCode: `from vpython import *

scene_background(색상['하늘'])

몸 = sphere(pos=vector(0, 0.6, 0), radius=0.9, color=색상['보라'])
머리 = sphere(pos=vector(0, 1.8, 0), radius=0.55, color=색상['살구'])

sphere(pos=vector(-0.18, 1.95, 0.5), radius=0.06, color=색상['검정'])
sphere(pos=vector(0.18, 1.95, 0.5), radius=0.06, color=색상['검정'])
ring(pos=vector(0, 1.72, 0.53), axis=vector(0, 0, 1), radius=0.18, thickness=0.025, color=색상['분홍'])
sphere(pos=vector(0, 0.7, 0.85), radius=0.08, color=색상['노랑'])  # 장식 추가

# 바꿔보기: 몸 색, 눈 위치, 입 모양, 장식 색을 바꿔보세요.
효과음("levelup")
print("캐릭터 리믹스 시작!")
`,
    assertions: [
      count('sphere', '>=', 4, text('sphere로 몸·머리·눈을 만듭니다 (4개 이상)', 'Build body, head and eyes with at least 4 spheres')),
      count('ring', '>=', 1, text('ring 장식을 남겨 둡니다', 'Keep a ring accessory')),
      anyOf(text('리믹스: 장식 sphere를 추가하거나 몸 색 또는 ring 색을 바꿉니다', 'Remix: add a sphere, or change the body or ring color'),
        count('sphere', '>=', 5),
        prop('sphere', 'color', '!=', [0.6, 1, 0.8], { tolerance: 0.01 }),
        prop('ring', 'color', '!=', [1, 0.75, 0.8], { tolerance: 0.01 }),
      ),
    ],
    hints: [
      text('색상[\'민트\']를 색상[\'보라\']처럼 바꾸면 분위기가 달라집니다.', 'Change 색상[\'민트\'] to 색상[\'보라\'] to shift the mood.'),
      text('작은 sphere를 추가하면 단추, 보석, 점무늬가 됩니다.', 'Add small spheres for buttons, gems, or dots.'),
    ],
  }),
  tutorialMission({
    id: 'CR-2',
    category: 'CR',
    level: 1,
    title: text('블록으로 만드는 작은 방', 'A Tiny Room from Blocks'),
    description: text(
      'box의 pos와 size를 바꾸며 책상, 창문, 침대를 배치하는 공간 구성 튜토리얼입니다.',
      'Use box positions and sizes to arrange a desk, window, and bed in a tiny room.',
    ),
    starterCode: `from vpython import *

scene_background(색상['아이보리'])

# 바닥과 벽
box(pos=vector(0, -0.05, 0), size=vector(7, 0.1, 6), color=색상['베이지'])
box(pos=vector(0, 1.5, -3), size=vector(7, 3, 0.1), color=색상['하늘'])

# 가구
box(pos=vector(-2, 0.35, 0.8), size=vector(2, 0.4, 1.2), color=색상['라벤더'])
box(pos=vector(1.8, 0.5, 1), size=vector(1.3, 1, 0.7), color=색상['갈색'])
box(pos=vector(0, 1.8, -2.9), size=vector(1.5, 1, 0.08), color=색상['노랑'])

# 바꿔보기: 가구 위치를 바꾸거나 작은 소품을 추가하세요.
print("작은 방 완성")
`,
    solutionCode: `from vpython import *

scene_background(색상['아이보리'])

# 바닥과 벽
box(pos=vector(0, -0.05, 0), size=vector(7, 0.1, 6), color=색상['베이지'])
box(pos=vector(0, 1.5, -3), size=vector(7, 3, 0.1), color=색상['하늘'])

# 가구
box(pos=vector(-2, 0.35, 0.8), size=vector(2, 0.4, 1.2), color=색상['라벤더'])
box(pos=vector(1.8, 0.5, 1), size=vector(1.3, 1, 0.7), color=색상['갈색'])
box(pos=vector(0, 1.8, -2.9), size=vector(1.5, 1, 0.08), color=색상['노랑'])
box(pos=vector(-2, 0.75, 0.8), size=vector(0.3, 0.4, 0.3), color=색상['금색'])  # 책상 위 소품

# 바꿔보기: 가구 위치를 바꾸거나 작은 소품을 추가하세요.
print("작은 방 완성")
`,
    assertions: [
      count('box', '>=', 6, text('소품 box를 하나 이상 추가합니다 (box 6개 이상)', 'Add at least one prop box (6 or more boxes)')),
      prop('box', 'size.y', '<', 0.5, { match: 'any', message: text('얇은 바닥 box(size.y < 0.5)를 유지합니다', 'Keep a thin floor box (size.y < 0.5)') }),
    ],
    hints: [
      text('size=vector(가로, 세로, 깊이)입니다.', 'size=vector(width, height, depth).'),
      text('pos의 x를 바꾸면 왼쪽과 오른쪽으로 이동합니다.', 'Change pos.x to move left and right.'),
    ],
  }),
  tutorialMission({
    id: 'CR-3',
    category: 'CR',
    level: 2,
    title: text('복합 객체 리믹스', 'Compound Object Remix'),
    description: text(
      '여러 도형을 compound로 묶고 한 번에 움직이는 리믹스 구조를 배웁니다.',
      'Group shapes with compound and move the whole remix as one object.',
    ),
    starterCode: `from vpython import *

몸통 = box(pos=vector(0, 0, 0), size=vector(1.4, 0.6, 0.8), color=색상['하늘'])
머리 = sphere(pos=vector(0.9, 0.25, 0), radius=0.35, color=색상['분홍'])
꼬리 = cone(pos=vector(-0.8, 0, 0), axis=vector(-0.7, 0.2, 0), radius=0.25, color=색상['보라'])

생명체 = compound([몸통, 머리, 꼬리], pos=vector(0, 1, 0))

for i in range(40):
    rate(30)
    생명체.pos = vector(-2 + i * 0.1, 1, 0)

# 바꿔보기: 머리 색, 꼬리 방향, 이동 경로를 바꿔보세요.
print("복합 객체 리믹스 완료")
`,
    solutionCode: `from vpython import *

몸통 = box(pos=vector(0, 0, 0), size=vector(1.4, 0.6, 0.8), color=색상['하늘'])
머리 = sphere(pos=vector(0.9, 0.25, 0), radius=0.35, color=색상['노랑'])
꼬리 = cone(pos=vector(-0.8, 0, 0), axis=vector(-0.7, 0.2, 0), radius=0.25, color=색상['보라'])

생명체 = compound([몸통, 머리, 꼬리], pos=vector(0, 1, 0))

for i in range(40):
    rate(30)
    생명체.pos = vector(-2 + i * 0.1, 1 + i * 0.02, 0)

# 바꿔보기: 머리 색, 꼬리 방향, 이동 경로를 바꿔보세요.
print("복합 객체 리믹스 완료")
`,
    assertions: [
      count('compound', '>=', 1, text('compound([...])로 도형을 하나로 묶습니다', 'Group the shapes with compound([...])')),
      prop('compound', 'historyLength', '>=', 10, { message: text('반복문에서 생명체.pos를 바꿔 움직입니다 (10회 이상)', 'Move the compound by changing its pos in a loop (10+ times)') }),
      anyOf(text('리믹스: 머리 색, 꼬리 방향, 이동 경로 중 하나를 바꿉니다', 'Remix: change the head color, tail direction, or path'),
        prop('sphere', 'color', '!=', [1, 0.75, 0.8], { tolerance: 0.01 }),
        prop('cone', 'axis', '!=', [-0.7, 0.2, 0], { tolerance: 0.01 }),
        prop('compound', 'pos.y', '!=', 1, { tolerance: 0.01 }),
      ),
    ],
    codeChecks: [{ pattern: 'compound\\s*\\(', minCount: 1, message: 'compound()로 도형을 묶으세요' }, rateCheck],
    hints: [
      text('compound([...])는 여러 도형을 하나처럼 움직이게 합니다.', 'compound([...]) lets multiple shapes move as one.'),
      text('생명체.pos를 바꾸면 묶인 도형 전체가 움직입니다.', 'Changing 생명체.pos moves the whole group.'),
    ],
  }),
  tutorialMission({
    id: 'CR-4',
    category: 'CR',
    level: 2,
    title: text('빛으로 분위기 만들기', 'Set the Mood with Lights'),
    description: text(
      'local_light와 distant_light를 사용해 작품의 분위기를 바꾸는 조명 튜토리얼입니다.',
      'Use local_light and distant_light to change the mood of a scene.',
    ),
    starterCode: `from vpython import *

scene_background(색상['검정'])

sphere(pos=vector(0, 0.7, 0), radius=0.7, color=색상['은색'])
ring(pos=vector(0, 0.7, 0), axis=vector(0, 1, 0), radius=1.2, thickness=0.04, color=색상['금색'])

local_light(pos=vector(-2, 3, 2), color=색상['분홍'], intensity=1.5)
distant_light(direction=vector(1, -1, -0.5), color=색상['하늘'], intensity=0.8)

# 바꿔보기: 조명 위치와 색을 바꾸면 같은 물체도 전혀 다르게 보입니다.
print("조명 무대 완성")
`,
    solutionCode: `from vpython import *

scene_background(색상['검정'])

sphere(pos=vector(0, 0.7, 0), radius=0.7, color=색상['은색'])
ring(pos=vector(0, 0.7, 0), axis=vector(0, 1, 0), radius=1.2, thickness=0.04, color=색상['금색'])

local_light(pos=vector(2, 3, 2), color=색상['노랑'], intensity=1.5)
local_light(pos=vector(-2, 1, 2), color=색상['보라'], intensity=1.0)
distant_light(direction=vector(1, -1, -0.5), color=색상['하늘'], intensity=0.8)

# 바꿔보기: 조명 위치와 색을 바꾸면 같은 물체도 전혀 다르게 보입니다.
print("조명 무대 완성")
`,
    assertions: [
      count('local_light', '>=', 1, text('local_light를 하나 이상 둡니다', 'Use at least one local_light')),
      count('distant_light', '>=', 1, text('distant_light를 하나 이상 둡니다', 'Use at least one distant_light')),
      anyOf(text('조명 색이나 위치를 바꾸거나 조명을 추가합니다', 'Change a light color or position, or add a light'),
        prop('local_light', 'color', '!=', [1, 0.75, 0.8], { tolerance: 0.01 }),
        prop('local_light', 'pos', '!=', [-2, 3, 2], { tolerance: 0.01 }),
        prop('distant_light', 'color', '!=', [0.53, 0.81, 0.92], { tolerance: 0.01 }),
        count('local_light', '>=', 2),
      ),
    ],
    hints: [
      text('local_light는 가까운 전구처럼 특정 위치에서 빛납니다.', 'local_light behaves like a nearby bulb.'),
      text('distant_light는 태양빛처럼 한 방향에서 옵니다.', 'distant_light acts like sunlight from one direction.'),
    ],
  }),
  tutorialMission({
    id: 'CR-5',
    category: 'CR',
    level: 2,
    title: text('오픈소스 리믹스 카드', 'Open Source Remix Card'),
    description: text(
      '원작 아이디어를 바탕으로 색, 모양, 설명을 바꾸는 갤러리 제출용 리믹스 연습입니다.',
      'Practice remixing colors, shapes, and descriptions before sharing to the gallery.',
    ),
    starterCode: `from vpython import *
import math

scene_background(색상['남색'])

# 원작 아이디어: 세 개의 행성이 춤추는 장면
행성들 = []
for i in range(3):
    행성 = sphere(pos=vector(-2 + i * 2, 0, 0), radius=0.45 + i * 0.1, color=파스텔[i], emissive=True)
    행성들.append(행성)

for step in range(60):
    rate(30)
    for i in range(len(행성들)):
        x = -2 + i * 2
        y = 0.4 * math.sin(step * 0.1 + i)
        행성들[i].pos = vector(x, y, 0)

# 바꿔보기: 원작 설명을 남기고, 색/움직임/개수를 내 스타일로 바꾸세요.
print("리믹스 포인트: 색, 리듬, 개수")
`,
    solutionCode: `from vpython import *
import math

scene_background(색상['남색'])

# 원작 아이디어: 세 개의 행성이 춤추는 장면
행성들 = []
for i in range(5):
    행성 = sphere(pos=vector(-4 + i * 2, 0, 0), radius=0.45 + i * 0.1, color=무지개[i], emissive=True)
    행성들.append(행성)

for step in range(60):
    rate(30)
    for i in range(len(행성들)):
        x = -4 + i * 2
        y = 0.4 * math.sin(step * 0.1 + i)
        행성들[i].pos = vector(x, y, 0)

# 바꿔보기: 원작 설명을 남기고, 색/움직임/개수를 내 스타일로 바꾸세요.
print("리믹스 포인트: 색, 리듬, 개수")
`,
    assertions: [
      count('sphere', '>=', 3, text('행성 sphere가 3개 이상입니다', 'At least 3 planet spheres')),
      prop('sphere', 'historyLength', '>=', 10, { match: 'any', message: text('행성이 반복문 안에서 움직입니다', 'Planets move inside the loop') }),
      anyOf(text('리믹스: 행성 수를 늘리거나 색을 바꿉니다', 'Remix: add planets or change colors'),
        count('sphere', '>=', 4),
        prop('sphere', 'color', '!=', [1, 0.7, 0.7], { tolerance: 0.01 }),
      ),
    ],
    codeChecks: [rateCheck],
    hints: [
      text('리믹스할 때는 원작의 어떤 점을 바꿨는지 설명해 주세요.', 'When remixing, describe what you changed from the original.'),
      text('행성 수를 3에서 5로 늘려도 좋은 변형입니다.', 'Changing the planet count from 3 to 5 is a good remix.'),
    ],
  }),

  // ═══════════════════════════════════════════
  // MA: Math Exploration (튜토리얼형 탐구)
  // ═══════════════════════════════════════════
  tutorialMission({
    id: 'MA-1',
    category: 'MA',
    level: 1,
    title: text('좌표 산책', 'Coordinate Walk'),
    description: text(
      'x, y, z 좌표가 3D 공간에서 어떤 방향을 뜻하는지 직접 관찰합니다.',
      'Observe what x, y, and z mean in 3D space.',
    ),
    starterCode: `from vpython import *

scene_background(색상['검정'])

colors = [색상['빨강'], 색상['초록'], 색상['파랑']]
positions = [vector(2, 0, 0), vector(0, 2, 0), vector(0, 0, 2)]

sphere(pos=vector(0, 0, 0), radius=0.18, color=색상['흰색'], emissive=True)

for i in range(3):
    arrow(pos=vector(0, 0, 0), axis=positions[i], shaftwidth=0.05, color=colors[i])
    sphere(pos=positions[i], radius=0.18, color=colors[i], emissive=True)

# 바꿔보기: positions의 숫자를 바꿔 좌표 방향을 관찰하세요.
print("빨강=x, 초록=y, 파랑=z")
`,
    solutionCode: `from vpython import *

scene_background(색상['검정'])

colors = [색상['빨강'], 색상['초록'], 색상['파랑']]
positions = [vector(3, 0, 0), vector(0, 1.5, 0), vector(0, 0, 2.5)]

sphere(pos=vector(0, 0, 0), radius=0.18, color=색상['흰색'], emissive=True)

for i in range(3):
    arrow(pos=vector(0, 0, 0), axis=positions[i], shaftwidth=0.05, color=colors[i])
    sphere(pos=positions[i], radius=0.18, color=colors[i], emissive=True)

# 바꿔보기: positions의 숫자를 바꿔 좌표 방향을 관찰하세요.
print("빨강=x, 초록=y, 파랑=z")
`,
    assertions: [
      count('arrow', '>=', 3, text('x, y, z 방향 arrow가 3개 있습니다', 'Three arrows for x, y, z')),
      count('sphere', '>=', 4, text('원점과 세 축 끝에 sphere가 있습니다', 'Spheres at the origin and three axis ends')),
      anyOf(text('positions의 숫자를 바꿔 화살표 길이를 다르게 합니다', 'Change the numbers in positions so an arrow length changes'),
        prop('arrow', 'axis', '!=', [2, 0, 0], { index: 0, tolerance: 0.01 }),
        prop('arrow', 'axis', '!=', [0, 2, 0], { index: 1, tolerance: 0.01 }),
        prop('arrow', 'axis', '!=', [0, 0, 2], { index: 2, tolerance: 0.01 }),
      ),
    ],
    hints: [
      text('vector(2, 0, 0)은 x 방향으로 2만큼 이동합니다.', 'vector(2, 0, 0) moves 2 units in x.'),
      text('색과 위치를 연결해 보며 축을 익히세요.', 'Connect colors and positions to learn axes.'),
    ],
  }),
  tutorialMission({
    id: 'MA-2',
    category: 'MA',
    level: 1,
    title: text('정다각형 생성기', 'Regular Polygon Generator'),
    description: text(
      '꼭짓점 수를 바꾸며 원 위의 점들이 삼각형, 육각형, 십이각형이 되는 모습을 봅니다.',
      'Change the number of vertices and watch points form polygons on a circle.',
    ),
    starterCode: `from vpython import *
import math

꼭짓점수 = 6
반지름 = 2.5

for i in range(꼭짓점수):
    각도 = 2 * math.pi * i / 꼭짓점수
    x = 반지름 * math.cos(각도)
    z = 반지름 * math.sin(각도)
    sphere(pos=vector(x, 0, z), radius=0.2, color=무지개[i % 7], emissive=True)

# 바꿔보기: 꼭짓점수를 3, 5, 8, 12로 바꿔보세요.
print("정다각형 생성 완료")
`,
    solutionCode: `from vpython import *
import math

꼭짓점수 = 8
반지름 = 2.5

for i in range(꼭짓점수):
    각도 = 2 * math.pi * i / 꼭짓점수
    x = 반지름 * math.cos(각도)
    z = 반지름 * math.sin(각도)
    sphere(pos=vector(x, 0, z), radius=0.2, color=무지개[i % 7], emissive=True)

# 바꿔보기: 꼭짓점수를 3, 5, 8, 12로 바꿔보세요.
print("정다각형 생성 완료")
`,
    assertions: [
      count('sphere', '>=', 3, text('꼭짓점이 3개 이상입니다', 'At least 3 vertices')),
      count('sphere', '!=', 6, text('꼭짓점수를 6에서 다른 값으로 바꿉니다', 'Change 꼭짓점수 from 6 to another value')),
      prop('sphere', 'pos.mag', '>', 0.5, { match: 'all', message: text('모든 점이 원 위에 놓입니다', 'All points lie on the circle') }),
    ],
    hints: [
      text('math.cos와 math.sin은 원 위의 좌표를 만들 때 자주 씁니다.', 'math.cos and math.sin are common for circular positions.'),
      text('꼭짓점수가 커질수록 원에 가까워집니다.', 'More vertices make the shape closer to a circle.'),
    ],
  }),
  tutorialMission({
    id: 'MA-3',
    category: 'MA',
    level: 2,
    title: text('사인파 리본', 'Sine Wave Ribbon'),
    description: text(
      'sin 함수의 진폭과 주기를 바꾸며 파동의 모양을 눈으로 확인합니다.',
      'Change amplitude and frequency to see how a sine wave changes.',
    ),
    starterCode: `from vpython import *
import math

진폭 = 1.0
주기 = 1.2

for i in range(40):
    x = -4 + i * 0.2
    y = 진폭 * math.sin(x * 주기)
    sphere(pos=vector(x, y, 0), radius=0.09, color=파스텔[i % len(파스텔)], emissive=True)

# 바꿔보기: 진폭과 주기를 바꾸고 리본 모양을 비교하세요.
print("사인파 리본 완성")
`,
    solutionCode: `from vpython import *
import math

진폭 = 1.6
주기 = 2.0

for i in range(40):
    x = -4 + i * 0.2
    y = 진폭 * math.sin(x * 주기)
    sphere(pos=vector(x, y, 0), radius=0.09, color=파스텔[i % len(파스텔)], emissive=True)

# 바꿔보기: 진폭과 주기를 바꾸고 리본 모양을 비교하세요.
print("사인파 리본 완성")
`,
    assertions: [
      count('sphere', '>=', 20, text('리본 점이 20개 이상입니다', 'At least 20 ribbon points')),
      anyOf(text('진폭을 바꿉니다 (1보다 크게 또는 0.7보다 작게)', 'Change the amplitude (above 1 or below 0.7)'),
        prop('sphere', 'pos.y', '>', 1.05, { match: 'any' }),
        prop('sphere', 'pos.y', 'between', [-0.7, 0.7], { match: 'all' }),
      ),
    ],
    hints: [
      text('진폭은 위아래 높이를 바꿉니다.', 'Amplitude changes height.'),
      text('주기는 물결이 얼마나 촘촘한지 바꿉니다.', 'Frequency changes how tight the wave is.'),
    ],
  }),
  tutorialMission({
    id: 'MA-4',
    category: 'MA',
    level: 2,
    title: text('함수 지형 만들기', 'Function Terrain'),
    description: text(
      'z = sin(x) * cos(y) 형태의 함수를 구슬 지형으로 표현합니다.',
      'Visualize a function terrain with a grid of spheres.',
    ),
    starterCode: `from vpython import *
import math

for ix in range(13):
    for iz in range(13):
        x = (ix - 6) * 0.45
        z = (iz - 6) * 0.45
        y = math.sin(x * 2) * math.cos(z * 2)
        색번호 = int((y + 1) * 3) % len(무지개)
        sphere(pos=vector(x, y, z), radius=0.08, color=무지개[색번호])

# 바꿔보기: x * 2, z * 2의 숫자를 바꿔 지형을 바꿔보세요.
print("함수 지형 완성")
`,
    solutionCode: `from vpython import *
import math

for ix in range(13):
    for iz in range(13):
        x = (ix - 6) * 0.45
        z = (iz - 6) * 0.45
        y = math.sin(x * 3) * math.cos(z * 1.5)
        색번호 = int((y + 1) * 3) % len(무지개)
        sphere(pos=vector(x, y, z), radius=0.08, color=무지개[색번호])

# 바꿔보기: x * 2, z * 2의 숫자를 바꿔 지형을 바꿔보세요.
print("함수 지형 완성")
`,
    assertions: [
      count('sphere', '>=', 100, text('격자 구슬이 100개 이상입니다', 'At least 100 grid spheres')),
      prop('sphere', 'pos.y', 'between', [-3, 3], { match: 'all', message: text('지형 높이가 -3~3 범위입니다', 'Terrain height stays within -3..3') }),
      anyOf(text('y 공식의 숫자(x * 2, z * 2)를 바꿔 지형을 바꿉니다', 'Change the numbers in the y formula'),
        prop('sphere', 'pos.y', '!=', 0.4905, { index: 0, tolerance: 0.01 }),
        count('sphere', '!=', 169),
      ),
    ],
    hints: [
      text('이중 for문은 격자 모양을 만들 때 편합니다.', 'Nested loops are useful for grids.'),
      text('y 공식이 지형의 높이를 결정합니다.', 'The y formula controls terrain height.'),
    ],
  }),
  tutorialMission({
    id: 'MA-5',
    category: 'MA',
    level: 2,
    title: text('피보나치 꽃밭', 'Fibonacci Garden'),
    description: text(
      '황금각을 조금씩 바꾸며 씨앗 배열이 어떻게 달라지는지 관찰합니다.',
      'Change the golden angle and observe how seed patterns shift.',
    ),
    starterCode: `from vpython import *
import math

황금각 = 137.5

for i in range(90):
    r = 0.08 * math.sqrt(i)
    angle = math.radians(i * 황금각)
    x = r * math.cos(angle)
    z = r * math.sin(angle)
    sphere(pos=vector(x, 0, z), radius=0.055, color=파스텔[i % len(파스텔)], emissive=True)

# 바꿔보기: 황금각을 120, 137.5, 150으로 바꿔보세요.
print("피보나치 꽃밭 완성")
`,
    solutionCode: `from vpython import *
import math

황금각 = 150

for i in range(90):
    r = 0.08 * math.sqrt(i)
    angle = math.radians(i * 황금각)
    x = r * math.cos(angle)
    z = r * math.sin(angle)
    sphere(pos=vector(x, 0, z), radius=0.055, color=파스텔[i % len(파스텔)], emissive=True)

# 바꿔보기: 황금각을 120, 137.5, 150으로 바꿔보세요.
print("피보나치 꽃밭 완성")
`,
    assertions: [
      count('sphere', '>=', 30, text('씨앗이 30개 이상입니다', 'At least 30 seeds')),
      anyOf(text('황금각을 137.5에서 다른 값으로 바꿉니다', 'Change 황금각 from 137.5'),
        prop('sphere', 'pos.x', '!=', -0.059, { index: 1, tolerance: 0.003 }),
        count('sphere', '!=', 90),
      ),
    ],
    hints: [
      text('sqrt(i)는 바깥으로 갈수록 간격이 너무 벌어지지 않게 해줍니다.', 'sqrt(i) keeps outer spacing from growing too quickly.'),
      text('각도 하나만 바꿔도 패턴이 크게 달라집니다.', 'Changing one angle can dramatically change the pattern.'),
    ],
  }),

  // ═══════════════════════════════════════════
  // SC: Science Lab (튜토리얼형 실험)
  // ═══════════════════════════════════════════
  tutorialMission({
    id: 'SC-1',
    category: 'SC',
    level: 1,
    title: text('속도 실험실', 'Velocity Lab'),
    description: text(
      '속도 값을 바꾸며 물체가 같은 시간 동안 얼마나 이동하는지 관찰합니다.',
      'Change velocity and observe how far an object moves in the same time.',
    ),
    starterCode: `from vpython import *

공 = sphere(pos=vector(-3, 0, 0), radius=0.25, color=색상['하늘'], make_trail=True)
속도 = vector(1.5, 0, 0)
dt = 0.05

for step in range(80):
    rate(30)
    공.pos = 공.pos + 속도 * dt

# 바꿔보기: 속도의 x 값을 0.5, 2.0, -1.0으로 바꿔보세요.
print("속도 실험 완료")
`,
    solutionCode: `from vpython import *

공 = sphere(pos=vector(-3, 0, 0), radius=0.25, color=색상['하늘'], make_trail=True)
속도 = vector(2.0, 0, 0)
dt = 0.05

for step in range(80):
    rate(30)
    공.pos = 공.pos + 속도 * dt

# 바꿔보기: 속도의 x 값을 0.5, 2.0, -1.0으로 바꿔보세요.
print("속도 실험 완료")
`,
    assertions: [
      prop('sphere', 'historyLength', '>=', 20, { message: text('공이 반복문에서 움직입니다 (20회 이상)', 'The ball moves in the loop (20+ steps)') }),
      prop('sphere', 'pos.x', '!=', 3, { tolerance: 0.05, message: text('속도의 x 값을 바꿔 도착 위치를 바꿉니다', 'Change the x velocity so the ball ends elsewhere') }),
    ],
    codeChecks: [rateCheck],
    hints: [
      text('속도가 클수록 같은 시간에 더 멀리 갑니다.', 'Higher velocity means farther movement in the same time.'),
      text('속도가 음수이면 반대 방향으로 움직입니다.', 'Negative velocity moves the other way.'),
    ],
  }),
  tutorialMission({
    id: 'SC-2',
    category: 'SC',
    level: 1,
    title: text('다른 행성의 중력', 'Gravity on Other Worlds'),
    description: text(
      '달, 지구, 목성의 중력 값을 비교하며 낙하 속도가 어떻게 달라지는지 봅니다.',
      'Compare gravity on the Moon, Earth, and Jupiter by watching falling objects.',
    ),
    starterCode: `from vpython import *

이름들 = ["달", "지구", "목성"]
중력들 = [1.6, 9.8, 24.8]
공들 = []
속도들 = []

for i in range(3):
    x = -2 + i * 2
    공 = sphere(pos=vector(x, 3, 0), radius=0.18, color=무지개[i], make_trail=True)
    공들.append(공)
    속도들.append(vector(0, 0, 0))

dt = 0.02
for step in range(80):
    rate(40)
    for i in range(3):
        속도들[i] = 속도들[i] + vector(0, -중력들[i], 0) * dt
        새위치 = 공들[i].pos + 속도들[i] * dt
        if 새위치.y < 0:
            새위치 = vector(공들[i].pos.x, 0, 0)
        공들[i].pos = 새위치

# 바꿔보기: 중력들 숫자를 바꿔 새로운 행성을 만들어 보세요.
print("중력 비교 완료")
`,
    solutionCode: `from vpython import *

이름들 = ["달", "지구", "목성", "화성"]
중력들 = [1.6, 9.8, 24.8, 3.7]
공들 = []
속도들 = []

for i in range(4):
    x = -3 + i * 2
    공 = sphere(pos=vector(x, 3, 0), radius=0.18, color=무지개[i], make_trail=True)
    공들.append(공)
    속도들.append(vector(0, 0, 0))

dt = 0.02
for step in range(80):
    rate(40)
    for i in range(4):
        속도들[i] = 속도들[i] + vector(0, -중력들[i], 0) * dt
        새위치 = 공들[i].pos + 속도들[i] * dt
        if 새위치.y < 0:
            새위치 = vector(공들[i].pos.x, 0, 0)
        공들[i].pos = 새위치

# 바꿔보기: 중력들 숫자를 바꿔 새로운 행성을 만들어 보세요.
print("중력 비교 완료")
`,
    assertions: [
      count('sphere', '>=', 3, text('공이 3개 이상 떨어집니다', 'At least 3 falling balls')),
      prop('sphere', 'historyLength', '>=', 20, { match: 'all', message: text('모든 공이 반복문에서 움직입니다', 'Every ball moves in the loop') }),
      anyOf(text('중력들 숫자를 바꾸거나 행성을 추가합니다', 'Change a gravity value or add a world'),
        count('sphere', '>=', 4),
        prop('sphere', 'pos.y', '!=', 0.926, { index: 0, tolerance: 0.02 }),
        prop('sphere', 'pos.y', '>', 0.05, { index: 1 }),
      ),
    ],
    codeChecks: [rateCheck],
    hints: [
      text('중력이 클수록 아래 방향 속도가 빨리 커집니다.', 'Stronger gravity increases downward velocity faster.'),
      text('숫자를 바꿔 가상의 행성을 만들 수 있습니다.', 'You can invent a world by changing the numbers.'),
    ],
  }),
  tutorialMission({
    id: 'SC-3',
    category: 'SC',
    level: 2,
    title: text('튕기는 공 실험', 'Bouncing Ball Lab'),
    description: text(
      '반발 계수를 바꾸며 공이 얼마나 높이 다시 튀는지 관찰합니다.',
      'Change the bounce coefficient and observe rebound height.',
    ),
    starterCode: `from vpython import *

box(pos=vector(0, -0.05, 0), size=vector(6, 0.1, 3), color=색상['회색'])
공 = sphere(pos=vector(0, 3, 0), radius=0.25, color=색상['분홍'], make_trail=True)

속도 = vector(0, 0, 0)
중력 = vector(0, -9.8, 0)
반발 = 0.75
dt = 0.02

for step in range(160):
    rate(50)
    속도 = 속도 + 중력 * dt
    공.pos = 공.pos + 속도 * dt
    if 공.pos.y < 0.25:
        공.pos = vector(공.pos.x, 0.25, 공.pos.z)
        속도 = vector(속도.x, -속도.y * 반발, 속도.z)
        효과음("jump")

# 바꿔보기: 반발을 0.3, 0.75, 1.0으로 바꿔보세요.
print("튕김 실험 완료")
`,
    solutionCode: `from vpython import *

box(pos=vector(0, -0.05, 0), size=vector(6, 0.1, 3), color=색상['회색'])
공 = sphere(pos=vector(0, 3, 0), radius=0.25, color=색상['분홍'], make_trail=True)

속도 = vector(0, 0, 0)
중력 = vector(0, -9.8, 0)
반발 = 0.5
dt = 0.02

for step in range(160):
    rate(50)
    속도 = 속도 + 중력 * dt
    공.pos = 공.pos + 속도 * dt
    if 공.pos.y < 0.25:
        공.pos = vector(공.pos.x, 0.25, 공.pos.z)
        속도 = vector(속도.x, -속도.y * 반발, 속도.z)
        효과음("jump")

# 바꿔보기: 반발을 0.3, 0.75, 1.0으로 바꿔보세요.
print("튕김 실험 완료")
`,
    assertions: [
      count('box', '>=', 1, text('바닥 box가 있습니다', 'A floor box exists')),
      prop('sphere', 'historyLength', '>=', 50, { message: text('공이 반복문에서 움직입니다 (50회 이상)', 'The ball moves in the loop (50+ steps)') }),
      count('sfx', '>=', 1, text('바닥에 닿을 때 효과음이 납니다', 'A sound effect plays on bounce')),
      prop('sphere', 'pos.y', '!=', 0.269, { tolerance: 0.01, message: text('반발 값을 바꿔 튀는 높이를 바꿉니다', 'Change the bounce coefficient') }),
    ],
    codeChecks: [rateCheck],
    hints: [
      text('반발이 1에 가까우면 에너지를 덜 잃습니다.', 'A coefficient near 1 loses less energy.'),
      text('바닥 아래로 내려가면 위치를 다시 올려 안정화합니다.', 'Clamp the ball back above the floor for stability.'),
    ],
  }),
  tutorialMission({
    id: 'SC-4',
    category: 'SC',
    level: 2,
    title: text('용수철 느낌 실험', 'Spring Feeling Lab'),
    description: text(
      '복원력과 감쇠를 바꾸며 흔들림이 어떻게 잦아드는지 봅니다.',
      'Change restoring force and damping to see how oscillation fades.',
    ),
    starterCode: `from vpython import *

고정점 = sphere(pos=vector(0, 2.5, 0), radius=0.15, color=색상['검정'])
추 = sphere(pos=vector(0, 0.5, 0), radius=0.25, color=색상['노랑'], make_trail=True)
arrow(pos=고정점.pos, axis=vector(0, -2, 0), shaftwidth=0.04, color=색상['회색'])

속도 = vector(0, 0, 0)
평형점 = 0.8
k = 8
감쇠 = 0.96
dt = 0.02

for step in range(180):
    rate(50)
    늘어남 = 추.pos.y - 평형점
    힘 = vector(0, -k * 늘어남, 0)
    속도 = (속도 + 힘 * dt) * 감쇠
    추.pos = 추.pos + 속도 * dt

# 바꿔보기: k와 감쇠를 바꾸며 진동을 비교하세요.
print("용수철 실험 완료")
`,
    solutionCode: `from vpython import *

고정점 = sphere(pos=vector(0, 2.5, 0), radius=0.15, color=색상['검정'])
추 = sphere(pos=vector(0, 0.5, 0), radius=0.25, color=색상['노랑'], make_trail=True)
arrow(pos=고정점.pos, axis=vector(0, -2, 0), shaftwidth=0.04, color=색상['회색'])

속도 = vector(0, 0, 0)
평형점 = 0.8
k = 15
감쇠 = 0.9
dt = 0.02

for step in range(180):
    rate(50)
    늘어남 = 추.pos.y - 평형점
    힘 = vector(0, -k * 늘어남, 0)
    속도 = (속도 + 힘 * dt) * 감쇠
    추.pos = 추.pos + 속도 * dt

# 바꿔보기: k와 감쇠를 바꾸며 진동을 비교하세요.
print("용수철 실험 완료")
`,
    assertions: [
      count('sphere', '>=', 2, text('고정점과 추가 있습니다', 'Anchor and bob spheres exist')),
      count('arrow', '>=', 1, text('용수철을 arrow로 표현합니다', 'The spring is drawn with an arrow')),
      prop('sphere', 'historyLength', '>=', 50, { index: 1, message: text('추가 반복문에서 움직입니다 (50회 이상)', 'The bob moves in the loop (50+ steps)') }),
      prop('sphere', 'history.max.pos.y', '!=', 0.888, { index: 1, tolerance: 0.01, message: text('k 또는 감쇠를 바꿔 추가 올라가는 최고 높이를 바꿉니다', 'Change k or the damping so the bob peaks at a different height') }),
    ],
    codeChecks: [rateCheck],
    hints: [
      text('k가 클수록 더 강하게 되돌아오려 합니다.', 'Larger k pulls back more strongly.'),
      text('감쇠가 작을수록 흔들림이 빨리 줄어듭니다.', 'Smaller damping makes oscillation fade faster.'),
    ],
  }),
  tutorialMission({
    id: 'SC-5',
    category: 'SC',
    level: 2,
    title: text('궤도 실험실', 'Orbit Lab'),
    description: text(
      '초기 속도를 바꾸며 충돌, 공전, 탈출에 가까운 움직임을 관찰합니다.',
      'Change initial velocity and observe paths like collision, orbit, or escape.',
    ),
    starterCode: `from vpython import *

scene_background(색상['검정'])

태양 = sphere(pos=vector(0, 0, 0), radius=0.45, color=색상['노랑'], emissive=True)
행성 = sphere(pos=vector(2.5, 0, 0), radius=0.18, color=색상['하늘'], make_trail=True)

속도 = vector(0, 1.3, 0)
G = 4
dt = 0.02

for step in range(260):
    rate(60)
    방향 = 태양.pos - 행성.pos
    거리 = max(방향.mag, 0.4)
    가속도 = 방향.hat * (G / (거리 * 거리))
    속도 = 속도 + 가속도 * dt
    행성.pos = 행성.pos + 속도 * dt

# 바꿔보기: 속도의 y 값을 0.7, 1.3, 1.8로 바꿔보세요.
print("궤도 실험 완료")
`,
    solutionCode: `from vpython import *

scene_background(색상['검정'])

태양 = sphere(pos=vector(0, 0, 0), radius=0.45, color=색상['노랑'], emissive=True)
행성 = sphere(pos=vector(2.5, 0, 0), radius=0.18, color=색상['하늘'], make_trail=True)

속도 = vector(0, 1.8, 0)
G = 4
dt = 0.02

for step in range(260):
    rate(60)
    방향 = 태양.pos - 행성.pos
    거리 = max(방향.mag, 0.4)
    가속도 = 방향.hat * (G / (거리 * 거리))
    속도 = 속도 + 가속도 * dt
    행성.pos = 행성.pos + 속도 * dt

# 바꿔보기: 속도의 y 값을 0.7, 1.3, 1.8로 바꿔보세요.
print("궤도 실험 완료")
`,
    assertions: [
      count('sphere', '>=', 2, text('태양과 행성이 있습니다', 'Sun and planet exist')),
      prop('sphere', 'historyLength', '>=', 100, { index: 1, message: text('행성이 반복문에서 움직입니다 (100회 이상)', 'The planet moves in the loop (100+ steps)') }),
      prop('sphere', 'pos.x', '!=', -2.208, { index: 1, tolerance: 0.05, message: text('속도의 y 값을 바꿔 궤도를 바꿉니다', 'Change the y velocity to change the orbit') }),
    ],
    codeChecks: [rateCheck],
    hints: [
      text('초기 속도가 너무 작으면 태양 쪽으로 떨어집니다.', 'Too little initial velocity falls toward the sun.'),
      text('속도가 커지면 더 넓은 궤도나 탈출에 가까워집니다.', 'More velocity creates wider or escape-like paths.'),
    ],
  }),

  // ═══════════════════════════════════════════
  // AR: Media Art (음악/시각 창작 강화)
  // ═══════════════════════════════════════════
  tutorialMission({
    id: 'AR-1',
    category: 'AR',
    level: 1,
    title: text('파스텔 숨쉬는 구름', 'Breathing Pastel Cloud'),
    description: text(
      '파스텔 색과 opacity를 사용해 천천히 숨 쉬는 듯한 미디어아트를 만듭니다.',
      'Use pastel colors and opacity to create a gently breathing media artwork.',
    ),
    starterCode: `from vpython import *
import math

scene_background(색상['남색'])

구름 = []
for i in range(24):
    x = -3 + (i % 8) * 0.85
    y = 1 + (i // 8) * 0.45
    s = sphere(pos=vector(x, y, 0), radius=0.28, color=파스텔[i % len(파스텔)], opacity=0.65, emissive=True)
    구름.append(s)

for step in range(100):
    rate(40)
    숨 = 0.5 + 0.5 * math.sin(step * 0.08)
    for i in range(len(구름)):
        구름[i].opacity = 0.35 + 숨 * 0.55
        구름[i].radius = 0.22 + 숨 * 0.08

# 바꿔보기: 파스텔 대신 무지개를 써보거나 숨 속도를 바꿔보세요.
print("숨쉬는 구름 완성")
`,
    solutionCode: `from vpython import *
import math

scene_background(색상['남색'])

구름 = []
for i in range(24):
    x = -3 + (i % 8) * 0.85
    y = 1 + (i // 8) * 0.45
    s = sphere(pos=vector(x, y, 0), radius=0.28, color=무지개[i % 7], opacity=0.65, emissive=True)
    구름.append(s)

for step in range(100):
    rate(40)
    숨 = 0.5 + 0.5 * math.sin(step * 0.05)
    for i in range(len(구름)):
        구름[i].opacity = 0.35 + 숨 * 0.55
        구름[i].radius = 0.22 + 숨 * 0.08

# 바꿔보기: 파스텔 대신 무지개를 써보거나 숨 속도를 바꿔보세요.
print("숨쉬는 구름 완성")
`,
    assertions: [
      count('sphere', '>=', 10, text('구름 구슬이 10개 이상입니다', 'At least 10 cloud spheres')),
      prop('sphere', 'opacity', '<', 1, { match: 'all', message: text('opacity로 반투명하게 만듭니다', 'Spheres are translucent (opacity < 1)') }),
      anyOf(text('색 팔레트를 바꾸거나 숨 속도·구슬 수를 바꿉니다', 'Change the palette, the breathing speed, or the sphere count'),
        prop('sphere', 'color', 'in', [[1, 0, 0], [1, 0.6, 0], [1, 1, 0], [0, 1, 0], [0, 1, 1], [0, 0, 1], [0.4, 0.2, 0.6]], { match: 'any', tolerance: 0.01 }),
        count('sphere', '!=', 24),
        prop('sphere', 'radius', '!=', 0.2999, { index: 0, tolerance: 0.005 }),
      ),
    ],
    codeChecks: [rateCheck],
    hints: [
      text('opacity는 투명도를 조절합니다.', 'opacity controls transparency.'),
      text('sin을 쓰면 부드럽게 반복되는 움직임을 만들 수 있습니다.', 'sin creates smooth repeated motion.'),
    ],
  }),
  tutorialMission({
    id: 'AR-2',
    category: 'AR',
    level: 1,
    title: text('무지개 파동 바닥', 'Rainbow Wave Floor'),
    description: text(
      '격자 구슬을 위아래로 움직여 물결치는 무지개 바닥을 만듭니다.',
      'Animate a grid of spheres into a rippling rainbow floor.',
    ),
    starterCode: `from vpython import *
import math

구슬들 = []
크기 = 9

for x칸 in range(크기):
    for z칸 in range(크기):
        x = (x칸 - 4) * 0.45
        z = (z칸 - 4) * 0.45
        s = sphere(pos=vector(x, 0, z), radius=0.12, color=무지개[(x칸 + z칸) % 7], emissive=True)
        구슬들.append(s)

for step in range(90):
    rate(45)
    for i in range(len(구슬들)):
        p = 구슬들[i].pos
        y = 0.35 * math.sin(step * 0.12 + p.x * 2 + p.z * 2)
        구슬들[i].pos = vector(p.x, y, p.z)

# 바꿔보기: 0.35를 바꾸면 파도의 높이가 바뀝니다.
print("무지개 파동 완성")
`,
    solutionCode: `from vpython import *
import math

구슬들 = []
크기 = 9

for x칸 in range(크기):
    for z칸 in range(크기):
        x = (x칸 - 4) * 0.45
        z = (z칸 - 4) * 0.45
        s = sphere(pos=vector(x, 0, z), radius=0.12, color=무지개[(x칸 + z칸) % 7], emissive=True)
        구슬들.append(s)

for step in range(90):
    rate(45)
    for i in range(len(구슬들)):
        p = 구슬들[i].pos
        y = 0.6 * math.sin(step * 0.12 + p.x * 2 + p.z * 2)
        구슬들[i].pos = vector(p.x, y, p.z)

# 바꿔보기: 0.35를 바꾸면 파도의 높이가 바뀝니다.
print("무지개 파동 완성")
`,
    assertions: [
      count('sphere', '>=', 25, text('격자 구슬이 25개 이상입니다', 'At least 25 grid spheres')),
      prop('sphere', 'historyLength', '>=', 20, { match: 'any', message: text('구슬이 반복문에서 위아래로 움직입니다', 'Spheres move up and down in the loop') }),
      anyOf(text('파도 높이(0.35)나 격자 크기를 바꿉니다', 'Change the wave height (0.35) or the grid size'),
        prop('sphere', 'pos.y', '>', 0.36, { match: 'any' }),
        prop('sphere', 'pos.y', '<', -0.36, { match: 'any' }),
        prop('sphere', 'pos.y', 'between', [-0.2, 0.2], { match: 'all' }),
        count('sphere', '!=', 81),
      ),
    ],
    codeChecks: [rateCheck],
    hints: [
      text('격자는 이중 반복문으로 만들 수 있습니다.', 'Use nested loops to create grids.'),
      text('p.x와 p.z를 공식에 넣으면 위치마다 다른 높이가 됩니다.', 'Using p.x and p.z gives each point a different height.'),
    ],
  }),
  tutorialMission({
    id: 'AR-3',
    category: 'AR',
    level: 2,
    title: text('별자리 생성기', 'Constellation Generator'),
    description: text(
      '랜덤 위치의 별과 은은한 빛으로 나만의 밤하늘을 만듭니다.',
      'Create a personal night sky with randomly placed stars and soft glow.',
    ),
    starterCode: `from vpython import *
import random

scene_background(색상['검정'])

for i in range(120):
    x = random.uniform(-5, 5)
    y = random.uniform(-1, 4)
    z = random.uniform(-3, 3)
    크기 = random.uniform(0.025, 0.08)
    별색 = random.choice([색상['흰색'], 색상['하늘'], 색상['노랑']])
    sphere(pos=vector(x, y, z), radius=크기, color=별색, emissive=True)

for i in range(5):
    sphere(pos=vector(-2 + i, 2 + random.uniform(-0.4, 0.4), 0), radius=0.09, color=색상['분홍'], emissive=True)

# 바꿔보기: 별 개수, 색 목록, 큰 별 위치를 바꿔 별자리를 만드세요.
print("별자리 생성 완료")
`,
    solutionCode: `from vpython import *
import random

scene_background(색상['검정'])

for i in range(150):
    x = random.uniform(-5, 5)
    y = random.uniform(-1, 4)
    z = random.uniform(-3, 3)
    크기 = random.uniform(0.025, 0.08)
    별색 = random.choice([색상['흰색'], 색상['하늘'], 색상['노랑']])
    sphere(pos=vector(x, y, z), radius=크기, color=별색, emissive=True)

for i in range(7):
    sphere(pos=vector(-3 + i, 2 + random.uniform(-0.4, 0.4), 0), radius=0.09, color=색상['분홍'], emissive=True)

# 바꿔보기: 별 개수, 색 목록, 큰 별 위치를 바꿔 별자리를 만드세요.
print("별자리 생성 완료")
`,
    assertions: [
      count('sphere', '>=', 20, text('별이 20개 이상입니다', 'At least 20 stars')),
      prop('sphere', 'emissive', '==', true, { match: 'all', message: text('모든 별이 emissive로 빛납니다', 'Every star glows (emissive)') }),
      anyOf(text('별 개수, 큰 별 수, 별 크기 중 하나를 바꿉니다', 'Change the star count, the number of big stars, or star size'),
        count('sphere', '!=', 125),
        prop('sphere', 'color', '==', [1, 0.75, 0.8], { match: 'count', minCount: 6, tolerance: 0.01 }),
        prop('sphere', 'radius', '>', 0.1, { match: 'any' }),
      ),
    ],
    hints: [
      text('random.uniform(a, b)는 a와 b 사이의 랜덤 숫자를 만듭니다.', 'random.uniform(a, b) makes a random number between a and b.'),
      text('큰 별 몇 개를 의도적으로 배치하면 별자리처럼 보입니다.', 'A few intentional large stars make a constellation.'),
    ],
  }),
  tutorialMission({
    id: 'AR-4',
    category: 'AR',
    level: 2,
    title: text('음악 조명 무대', 'Music Light Stage'),
    description: text(
      '배경음악, 효과음, 조명 색 변화를 연결해 작은 공연 무대를 만듭니다.',
      'Combine BGM, sound effects, and changing lights into a small performance stage.',
    ),
    starterCode: `from vpython import *

scene_background(색상['검정'])
배경음악("adventure")

무대 = box(pos=vector(0, -0.1, 0), size=vector(5, 0.2, 3), color=색상['보라'])
공 = sphere(pos=vector(0, 0.8, 0), radius=0.45, color=색상['하늘'], emissive=True)
빛 = local_light(pos=vector(0, 3, 2), color=색상['분홍'], intensity=1.4)

for i in range(7):
    rate(2)
    공.color = 무지개[i]
    빛.color = 무지개[(i + 2) % 7]
    효과음("select")

배경음악정지()
효과음("success")

# 바꿔보기: adventure 대신 peaceful을 넣거나 색 순서를 바꿔보세요.
print("음악 조명 무대 완료")
`,
    solutionCode: `from vpython import *

scene_background(색상['검정'])
배경음악("peaceful")

무대 = box(pos=vector(0, -0.1, 0), size=vector(5, 0.2, 3), color=색상['보라'])
공 = sphere(pos=vector(0, 0.8, 0), radius=0.45, color=색상['하늘'], emissive=True)
빛 = local_light(pos=vector(0, 3, 2), color=색상['분홍'], intensity=1.4)

for i in range(7):
    rate(2)
    공.color = 무지개[6 - i]
    빛.color = 무지개[(i + 2) % 7]
    효과음("select")

배경음악정지()
효과음("success")

# 바꿔보기: adventure 대신 peaceful을 넣거나 색 순서를 바꿔보세요.
print("음악 조명 무대 완료")
`,
    assertions: [
      count('box', '>=', 1, text('무대 box가 있습니다', 'A stage box exists')),
      count('sphere', '>=', 1, text('공 sphere가 있습니다', 'A ball sphere exists')),
      count('local_light', '>=', 1, text('조명 local_light가 있습니다', 'A local_light exists')),
      count('sfx', '>=', 2, text('장면 전환과 마무리에 효과음을 씁니다 (2회 이상)', 'Sound effects for transitions and the finale (2+)')),
      anyOf(text('색 순서를 바꾸거나 배경음악을 peaceful로 바꿉니다', 'Change the color order or switch the BGM to peaceful'),
        prop('sphere', 'color', '!=', [0.4, 0.2, 0.6], { tolerance: 0.01 }),
        prop('local_light', 'color', '!=', [1, 0.6, 0], { tolerance: 0.01 }),
        prop('bgm', 'name', '!=', 'adventure', { match: 'any' }),
      ),
    ],
    codeChecks: [{ pattern: '배경음악\\s*\\(|bgm\\s*\\(|start_bgm\\s*\\(', minCount: 1, message: '배경음악()으로 분위기를 깔아 주세요' }, { pattern: '배경음악정지\\s*\\(|stop_bgm\\s*\\(', minCount: 1, message: '배경음악정지()로 마무리하세요' }, rateCheck],
    hints: [
      text('배경음악()은 분위기를 깔고, 효과음()은 장면 전환을 강조합니다.', '배경음악() sets mood; 효과음() highlights transitions.'),
      text('조명 색과 물체 색을 같이 바꾸면 무대처럼 보입니다.', 'Changing light and object colors together feels stage-like.'),
    ],
  }),
  tutorialMission({
    id: 'AR-5',
    category: 'AR',
    level: 3,
    title: text('나만의 VJ 루프', 'Your Own VJ Loop'),
    description: text(
      '반복되는 색, 크기, 위치 변화를 조합해 갤러리에 올릴 수 있는 짧은 영상 루프를 만듭니다.',
      'Combine looping changes in color, size, and position into a gallery-ready visual loop.',
    ),
    starterCode: `from vpython import *
import math

scene_background(색상['검정'])

점들 = []
for i in range(36):
    angle = 2 * math.pi * i / 36
    x = 2 * math.cos(angle)
    z = 2 * math.sin(angle)
    점 = sphere(pos=vector(x, 0, z), radius=0.12, color=무지개[i % 7], emissive=True)
    점들.append(점)

for step in range(120):
    rate(60)
    for i in range(len(점들)):
        angle = 2 * math.pi * i / len(점들)
        pulse = 0.5 + 0.5 * math.sin(step * 0.08 + i * 0.3)
        r = 1.5 + pulse * 1.0
        점들[i].pos = vector(r * math.cos(angle), pulse, r * math.sin(angle))
        점들[i].radius = 0.08 + pulse * 0.08
        점들[i].color = 무지개[(i + step // 12) % 7]

# 바꿔보기: 점 개수, pulse 속도, 색 순서를 바꿔 나만의 루프로 만드세요.
print("VJ 루프 완성")
`,
    solutionCode: `from vpython import *
import math

scene_background(색상['검정'])

점들 = []
for i in range(48):
    angle = 2 * math.pi * i / 48
    x = 2 * math.cos(angle)
    z = 2 * math.sin(angle)
    점 = sphere(pos=vector(x, 0, z), radius=0.12, color=무지개[i % 7], emissive=True)
    점들.append(점)

for step in range(120):
    rate(60)
    for i in range(len(점들)):
        angle = 2 * math.pi * i / len(점들)
        pulse = 0.5 + 0.5 * math.sin(step * 0.12 + i * 0.3)
        r = 1.5 + pulse * 1.0
        점들[i].pos = vector(r * math.cos(angle), pulse, r * math.sin(angle))
        점들[i].radius = 0.08 + pulse * 0.08
        점들[i].color = 무지개[(i + step // 12) % 7]

# 바꿔보기: 점 개수, pulse 속도, 색 순서를 바꿔 나만의 루프로 만드세요.
print("VJ 루프 완성")
`,
    assertions: [
      count('sphere', '>=', 12, text('점이 12개 이상입니다', 'At least 12 points')),
      prop('sphere', 'historyLength', '>=', 50, { match: 'any', message: text('점이 반복문에서 움직입니다 (50회 이상)', 'Points move in the loop (50+ steps)') }),
      anyOf(text('점 개수나 pulse 속도를 바꿉니다', 'Change the point count or the pulse speed'),
        count('sphere', '!=', 36),
        prop('sphere', 'radius', '!=', 0.1169, { index: 0, tolerance: 0.003 }),
      ),
    ],
    codeChecks: [rateCheck],
    hints: [
      text('짧고 반복되는 움직임은 갤러리에서 보기 좋은 작품이 됩니다.', 'Short repeating motion works well as gallery art.'),
      text('점 개수를 늘리면 더 촘촘한 패턴이 됩니다.', 'More points create a denser pattern.'),
    ],
  }),

  // ═══════════════════════════════════════════
  // SN: Music Coding (음악 예제 강화)
  // ═══════════════════════════════════════════
  tutorialMission({
    id: 'SN-1',
    category: 'SN',
    level: 1,
    title: text('세 음으로 알림음 만들기', 'Three-Note Notification'),
    description: text(
      '음표()로 짧은 알림음을 만들고, 소리에 맞춰 구슬이 켜지는 모습을 봅니다.',
      'Create a short notification with 음표() and watch spheres light up with sound.',
    ),
    starterCode: `from vpython import *

노트들 = ["도4", "미4", "솔4"]
구슬들 = []

for i in range(3):
    구슬 = sphere(pos=vector(-1 + i, 0, 0), radius=0.25, color=색상['회색'])
    구슬들.append(구슬)

for i in range(3):
    구슬들[i].color = 무지개[i]
    구슬들[i].emissive = True
    음표(노트들[i], 0.35)
    구슬들[i].emissive = False

# 바꿔보기: 노트들을 ["솔4", "미4", "도4"]처럼 바꿔보세요.
print("알림음 완성")
`,
    solutionCode: `from vpython import *

노트들 = ["솔4", "미4", "도4"]
구슬들 = []

for i in range(3):
    구슬 = sphere(pos=vector(-1 + i, 0, 0), radius=0.25, color=색상['회색'])
    구슬들.append(구슬)

for i in range(3):
    구슬들[i].color = 무지개[i]
    구슬들[i].emissive = True
    음표(노트들[i], 0.35)
    구슬들[i].emissive = False

# 바꿔보기: 노트들을 ["솔4", "미4", "도4"]처럼 바꿔보세요.
print("알림음 완성")
`,
    assertions: [
      count('sphere', '>=', 3, text('구슬이 3개 있습니다', 'Three spheres')),
      count('note', '>=', 3, text('음표()로 3음 이상 재생합니다', 'Play at least 3 notes with 음표()')),
      anyOf(text('노트들의 순서나 음을 바꿔 새 알림음을 만듭니다', 'Change the note order or pitches'),
        prop('note', 'name', '!=', 'C4', { index: 0 }),
        prop('note', 'name', '!=', 'E4', { index: 1 }),
        prop('note', 'name', '!=', 'G4', { index: 2 }),
        count('note', '>=', 4),
      ),
    ],
    hints: [
      text('음표("도4", 0.35)는 도 음을 0.35초 재생합니다.', '음표("도4", 0.35) plays Do for 0.35 seconds.'),
      text('리스트 순서를 바꾸면 멜로디가 달라집니다.', 'Changing list order changes the melody.'),
    ],
  }),
  tutorialMission({
    id: 'SN-2',
    category: 'SN',
    level: 1,
    title: text('리듬 패턴 메이커', 'Rhythm Pattern Maker'),
    description: text(
      '리스트에 담긴 길이를 바꾸며 같은 음도 전혀 다른 리듬이 되는 것을 듣습니다.',
      'Change durations in a list and hear how one note becomes different rhythms.',
    ),
    starterCode: `from vpython import *

리듬 = [0.2, 0.2, 0.4, 0.2, 0.6]

for i in range(len(리듬)):
    sphere(pos=vector(-2 + i, 0, 0), radius=0.16 + 리듬[i] * 0.15, color=파스텔[i % len(파스텔)], emissive=True)
    악기("피아노", "도4", 리듬[i])
    sleep(0.05)

# 바꿔보기: 리듬 숫자를 바꾸거나 악기를 "칩튠"으로 바꿔보세요.
print("리듬 패턴 완성")
`,
    solutionCode: `from vpython import *

리듬 = [0.15, 0.15, 0.3, 0.15, 0.6, 0.3]

for i in range(len(리듬)):
    sphere(pos=vector(-2 + i, 0, 0), radius=0.16 + 리듬[i] * 0.15, color=파스텔[i % len(파스텔)], emissive=True)
    악기("칩튠", "도4", 리듬[i])
    sleep(0.05)

# 바꿔보기: 리듬 숫자를 바꾸거나 악기를 "칩튠"으로 바꿔보세요.
print("리듬 패턴 완성")
`,
    assertions: [
      count('note', '>=', 4, text('리듬 음이 4개 이상입니다', 'At least 4 rhythm notes')),
      prop('note', 'duration', '>=', 2, { match: 'distinct', message: text('길이가 다른 음이 섞여 있습니다', 'Notes have at least two different durations') }),
      anyOf(text('리듬 숫자를 바꾸거나 악기를 바꿉니다', 'Change the rhythm numbers or the instrument'),
        prop('note', 'duration', '!=', 0.4, { index: 2, tolerance: 0.001 }),
        prop('note', 'duration', '!=', 0.6, { index: 4, tolerance: 0.001 }),
        count('note', '!=', 5),
        prop('note', 'type', '!=', 'triangle', { match: 'any' }),
      ),
    ],
    hints: [
      text('짧은 숫자는 짧은 소리, 긴 숫자는 긴 소리입니다.', 'Small numbers make short sounds; large numbers make long sounds.'),
      text('악기("칩튠", "도4", 0.2)처럼 악기 이름을 바꿔보세요.', 'Try 악기("칩튠", "도4", 0.2).'),
    ],
  }),
  tutorialMission({
    id: 'SN-3',
    category: 'SN',
    level: 2,
    title: text('화음 분위기 바꾸기', 'Change a Chord’s Mood'),
    description: text(
      '화음()과 음계/높은음계를 사용해 밝고 어두운 느낌을 비교합니다.',
      'Use 화음() with scales to compare bright and darker chord moods.',
    ),
    starterCode: `from vpython import *

scene_background(색상['남색'])

for i in range(3):
    sphere(pos=vector(-1 + i, 0, 0), radius=0.25, color=무지개[i], emissive=True)

# 밝은 느낌: 도-미-솔
화음([음계['도'], 음계['미'], 음계['솔']], 1.0)
sleep(0.3)

# 높은 느낌: 높은 도-미-솔
화음([높은음계['도'], 높은음계['미'], 높은음계['솔']], 1.0)

# 바꿔보기: 미를 레로 바꾸면 느낌이 어떻게 달라질까요?
print("화음 비교 완료")
`,
    solutionCode: `from vpython import *

scene_background(색상['남색'])

for i in range(3):
    sphere(pos=vector(-1 + i, 0, 0), radius=0.25, color=무지개[i], emissive=True)

# 밝은 느낌: 도-미-솔
화음([음계['도'], 음계['레'], 음계['솔']], 1.0)
sleep(0.3)

# 높은 느낌: 높은 도-미-솔
화음([높은음계['도'], 높은음계['미'], 높은음계['솔']], 1.0)
sleep(0.3)
화음([음계['라'], 높은음계['도'], 높은음계['미']], 1.2)

# 바꿔보기: 미를 레로 바꾸면 느낌이 어떻게 달라질까요?
print("화음 비교 완료")
`,
    assertions: [
      count('sphere', '>=', 3, text('구슬이 3개 있습니다', 'Three spheres')),
      count('note', '>=', 2, text('화음()을 2번 이상 연주합니다', 'Play at least 2 chords with 화음()')),
      anyOf(text('화음의 음을 바꾸거나 화음을 추가합니다', 'Change a chord note or add a chord'),
        prop('note', 'name', '!=', 'C4+E4+G4', { index: 0 }),
        prop('note', 'name', '!=', 'C5+E5+G5', { index: 1 }),
        count('note', '>=', 3),
      ),
    ],
    hints: [
      text('화음()은 여러 주파수를 동시에 재생합니다.', '화음() plays multiple frequencies at once.'),
      text('음계[\'도\']처럼 한글 이름으로 음을 고를 수 있습니다.', 'Pick notes with Korean names like 음계[\'도\'].'),
    ],
  }),
  tutorialMission({
    id: 'SN-4',
    category: 'SN',
    level: 2,
    title: text('게임 효과음 스토리보드', 'Game SFX Storyboard'),
    description: text(
      '점프, 코인, 성공 효과음을 장면 변화와 연결해 작은 게임 순간을 만듭니다.',
      'Connect jump, coin, and success sound effects to tiny game moments.',
    ),
    starterCode: `from vpython import *
import math

플레이어 = sphere(pos=vector(-2, 0, 0), radius=0.25, color=색상['하늘'], emissive=True)
코인 = ring(pos=vector(0, 0.7, 0), axis=vector(0, 1, 0), radius=0.35, thickness=0.06, color=색상['금색'])
목표 = box(pos=vector(2, 0.2, 0), size=vector(0.4, 0.4, 0.4), color=색상['초록'])

효과음("jump")
for step in range(20):
    rate(30)
    x = -2 + step * 0.1
    y = 0.8 * math.sin(step / 20 * math.pi)
    플레이어.pos = vector(x, y, 0)

효과음("coin")
코인.visible = False

for step in range(20):
    rate(30)
    플레이어.pos = vector(step * 0.1, 0, 0)

효과음("success")
목표.emissive = True

# 바꿔보기: 효과음 이름과 플레이어 색을 바꿔 장면을 다시 연출하세요.
print("효과음 스토리보드 완료")
`,
    solutionCode: `from vpython import *
import math

플레이어 = sphere(pos=vector(-2, 0, 0), radius=0.25, color=색상['노랑'], emissive=True)
코인 = ring(pos=vector(0, 0.7, 0), axis=vector(0, 1, 0), radius=0.35, thickness=0.06, color=색상['금색'])
목표 = box(pos=vector(2, 0.2, 0), size=vector(0.4, 0.4, 0.4), color=색상['초록'])

효과음("jump")
for step in range(20):
    rate(30)
    x = -2 + step * 0.1
    y = 0.8 * math.sin(step / 20 * math.pi)
    플레이어.pos = vector(x, y, 0)

효과음("powerup")
코인.visible = False

for step in range(20):
    rate(30)
    플레이어.pos = vector(step * 0.1, 0, 0)

효과음("success")
목표.emissive = True

# 바꿔보기: 효과음 이름과 플레이어 색을 바꿔 장면을 다시 연출하세요.
print("효과음 스토리보드 완료")
`,
    assertions: [
      count('sphere', '>=', 1, text('플레이어 sphere가 있습니다', 'A player sphere exists')),
      count('ring', '>=', 1, text('코인 ring이 있습니다', 'A coin ring exists')),
      count('box', '>=', 1, text('목표 box가 있습니다', 'A goal box exists')),
      prop('sphere', 'historyLength', '>=', 20, { message: text('플레이어가 반복문에서 움직입니다 (20회 이상)', 'The player moves in the loop (20+ steps)') }),
      prop('ring', 'visible', '==', false, { message: text('코인을 먹으면 ring이 사라집니다 (visible = False)', 'The coin disappears when collected') }),
      prop('box', 'emissive', '==', true, { message: text('목표에 닿으면 box가 빛납니다 (emissive = True)', 'The goal glows when reached') }),
      count('sfx', '>=', 3, text('점프·코인·성공 순간에 효과음이 납니다 (3회 이상)', 'Sound effects for jump, coin, and success (3+)')),
      anyOf(text('플레이어 색이나 효과음 이름을 바꿉니다', 'Change the player color or a sound effect name'),
        prop('sphere', 'color', '!=', [0.53, 0.81, 0.92], { tolerance: 0.01 }),
        prop('sfx', 'name', 'not_in', ['jump', 'coin', 'success'], { match: 'any' }),
      ),
    ],
    codeChecks: [rateCheck],
    hints: [
      text('효과음("coin")은 코인을 먹는 순간에 어울립니다.', '효과음("coin") fits the moment of collecting a coin.'),
      text('소리와 화면 변화가 같은 위치에 있으면 장면이 더 또렷합니다.', 'Sound and visual changes together make the scene clearer.'),
    ],
  }),
  tutorialMission({
    id: 'SN-5',
    category: 'SN',
    level: 3,
    title: text('BGM 위에 멜로디 얹기', 'Melody over BGM'),
    description: text(
      '배경음악을 깔고 짧은 멜로디와 빛나는 시각화를 얹는 음악 코딩 예제입니다.',
      'Layer a short melody and glowing visuals over background music.',
    ),
    starterCode: `from vpython import *

scene_background(색상['검정'])
배경음악("peaceful")

멜로디 = ["도4", "미4", "솔4", "도5"]
구슬들 = []

for i in range(len(멜로디)):
    구슬 = sphere(pos=vector(-1.5 + i, 0, 0), radius=0.22, color=파스텔[i], emissive=False)
    구슬들.append(구슬)

for i in range(len(멜로디)):
    구슬들[i].emissive = True
    구슬들[i].radius = 0.36
    악기("플루트", 멜로디[i], 0.45)
    구슬들[i].radius = 0.22
    구슬들[i].emissive = False

화음([음계['도'], 음계['미'], 음계['솔']], 1.2)
배경음악정지()

# 바꿔보기: 멜로디 리스트와 악기를 바꿔 나만의 엔딩을 만드세요.
print("BGM 멜로디 완성")
`,
    solutionCode: `from vpython import *

scene_background(색상['검정'])
배경음악("peaceful")

멜로디 = ["미4", "솔4", "라4", "도5", "미5"]
구슬들 = []

for i in range(len(멜로디)):
    구슬 = sphere(pos=vector(-1.5 + i, 0, 0), radius=0.22, color=파스텔[i], emissive=False)
    구슬들.append(구슬)

for i in range(len(멜로디)):
    구슬들[i].emissive = True
    구슬들[i].radius = 0.36
    악기("기타", 멜로디[i], 0.45)
    구슬들[i].radius = 0.22
    구슬들[i].emissive = False

화음([음계['도'], 음계['미'], 음계['솔']], 1.2)
배경음악정지()

# 바꿔보기: 멜로디 리스트와 악기를 바꿔 나만의 엔딩을 만드세요.
print("BGM 멜로디 완성")
`,
    assertions: [
      count('sphere', '>=', 4, text('멜로디마다 구슬이 있습니다 (4개 이상)', 'A sphere per melody note (4+)')),
      count('bgm', '>=', 1, text('배경음악()을 재생합니다', 'Background music plays')),
      count('note', '>=', 5, text('멜로디 4음과 마무리 화음을 연주합니다 (5개 이상)', 'Four melody notes plus a final chord (5+)')),
      anyOf(text('멜로디나 악기를 바꿔 나만의 엔딩을 만듭니다', 'Change the melody or the instrument'),
        prop('note', 'name', '!=', 'C4', { index: 0 }),
        prop('note', 'name', '!=', 'E4', { index: 1 }),
        prop('note', 'name', '!=', 'G4', { index: 2 }),
        prop('note', 'name', '!=', 'C5', { index: 3 }),
        count('note', '>=', 6),
        prop('note', 'type', '!=', 'sine', { index: 0 }),
      ),
    ],
    codeChecks: [{ pattern: '배경음악정지\\s*\\(|stop_bgm\\s*\\(', minCount: 1, message: '배경음악정지()로 깔끔하게 끝내세요' }],
    hints: [
      text('배경음악은 분위기, 멜로디는 이야기의 흐름을 만듭니다.', 'BGM sets mood; melody gives the scene a storyline.'),
      text('마지막에 배경음악정지()를 호출하면 깔끔하게 끝납니다.', 'Call 배경음악정지() at the end for a clean finish.'),
    ],
  }),
  tutorialMission({
    id: 'AR-6',
    category: 'AR',
    level: 1,
    title: text('빛나는 타이포 패턴', 'Glowing Typographic Pattern'),
    description: text(
      '글자처럼 보이는 점 배열을 만들고 색과 간격을 바꾸며 픽셀아트 감각을 익힙니다.',
      'Build a letter-like dot pattern and remix color and spacing like pixel art.',
    ),
    starterCode: `from vpython import *

scene_background(색상['검정'])

패턴 = [
    "101",
    "101",
    "111",
    "101",
    "101",
]

for y in range(len(패턴)):
    for x in range(len(패턴[y])):
        if 패턴[y][x] == "1":
            sphere(
                pos=vector(x * 0.45 - 0.45, 2 - y * 0.45, 0),
                radius=0.14,
                color=파스텔[(x + y) % len(파스텔)],
                emissive=True
            )

# 바꿔보기: 패턴의 0과 1을 바꿔 나만의 글자나 아이콘을 만드세요.
print("빛나는 타이포 패턴 완성")
`,
    solutionCode: `from vpython import *

scene_background(색상['검정'])

패턴 = [
    "111",
    "010",
    "010",
    "010",
    "010",
]

for y in range(len(패턴)):
    for x in range(len(패턴[y])):
        if 패턴[y][x] == "1":
            sphere(
                pos=vector(x * 0.45 - 0.45, 2 - y * 0.45, 0),
                radius=0.14,
                color=파스텔[(x + y) % len(파스텔)],
                emissive=True
            )

# 바꿔보기: 패턴의 0과 1을 바꿔 나만의 글자나 아이콘을 만드세요.
print("빛나는 타이포 패턴 완성")
`,
    assertions: [
      count('sphere', '>=', 5, text('점이 5개 이상입니다', 'At least 5 dots')),
      prop('sphere', 'emissive', '==', true, { match: 'all', message: text('모든 점이 emissive로 빛납니다', 'Every dot glows (emissive)') }),
      anyOf(text('패턴의 0과 1을 바꿔 다른 글자나 아이콘을 만듭니다', 'Edit the 0s and 1s to make another letter or icon'),
        count('sphere', '!=', 11),
        prop('sphere', 'pos.x', '!=', 0.45, { index: 1, tolerance: 0.01 }),
        prop('sphere', 'pos.x', '!=', -0.45, { index: 2, tolerance: 0.01 }),
      ),
    ],
    hints: [
      text('문자열의 "1"을 점으로 해석하면 픽셀아트처럼 만들 수 있습니다.', 'Treating "1" as a dot creates pixel-art-like patterns.'),
      text('패턴 배열을 바꾸는 것이 곧 디자인 편집입니다.', 'Editing the pattern list is the design tool here.'),
    ],
  }),
  tutorialMission({
    id: 'AR-7',
    category: 'AR',
    level: 2,
    title: text('오디오 리액티브처럼 보이는 막대', 'Audio-Reactive Style Bars'),
    description: text(
      '실제 분석은 아니지만 리듬 데이터처럼 보이는 숫자로 움직이는 막대를 만듭니다.',
      'Create moving bars from rhythm-like numbers, a friendly first step toward audio-reactive visuals.',
    ),
    starterCode: `from vpython import *

scene_background(색상['검정'])
배경음악("adventure")

막대들 = []
높이들 = [0.4, 1.2, 0.8, 1.8, 0.6, 1.4, 1.0]

for i in range(len(높이들)):
    b = box(pos=vector(-3 + i, 높이들[i] / 2, 0), size=vector(0.5, 높이들[i], 0.5), color=무지개[i], emissive=True)
    막대들.append(b)

for step in range(80):
    rate(20)
    for i in range(len(막대들)):
        h = 0.4 + ((step + i * 3) % 12) * 0.12
        막대들[i].size = vector(0.5, h, 0.5)
        막대들[i].pos = vector(-3 + i, h / 2, 0)

배경음악정지()

# 바꿔보기: 높이들 숫자와 색 순서를 바꿔 나만의 비주얼라이저를 만드세요.
print("리듬 막대 완성")
`,
    solutionCode: `from vpython import *

scene_background(색상['검정'])
배경음악("adventure")

막대들 = []
높이들 = [0.4, 1.2, 0.8, 1.8, 0.6, 1.4, 1.0, 1.6, 0.9]

for i in range(len(높이들)):
    b = box(pos=vector(-4 + i, 높이들[i] / 2, 0), size=vector(0.5, 높이들[i], 0.5), color=파스텔[i % len(파스텔)], emissive=True)
    막대들.append(b)

for step in range(80):
    rate(20)
    for i in range(len(막대들)):
        h = 0.4 + ((step + i * 3) % 12) * 0.12
        막대들[i].size = vector(0.5, h, 0.5)
        막대들[i].pos = vector(-4 + i, h / 2, 0)

배경음악정지()

# 바꿔보기: 높이들 숫자와 색 순서를 바꿔 나만의 비주얼라이저를 만드세요.
print("리듬 막대 완성")
`,
    assertions: [
      count('box', '>=', 3, text('막대 box가 3개 이상입니다', 'At least 3 bar boxes')),
      prop('box', 'historyLength', '>=', 20, { match: 'any', message: text('막대가 반복문에서 움직입니다 (20회 이상)', 'Bars move in the loop (20+ steps)') }),
      anyOf(text('막대 개수나 색 순서를 바꿉니다', 'Change the bar count or the color order'),
        count('box', '!=', 7),
        prop('box', 'color', '!=', [1, 0, 0], { index: 0, tolerance: 0.01 }),
        prop('box', 'color', '!=', [1, 0.6, 0], { index: 1, tolerance: 0.01 }),
      ),
    ],
    codeChecks: [rateCheck],
    hints: [
      text('막대 높이를 바꾸려면 size.y와 pos.y를 함께 바꾸면 안정적입니다.', 'Change both size.y and pos.y to resize bars cleanly.'),
      text('숫자 리스트는 음악의 세기처럼 상상해 볼 수 있습니다.', 'You can imagine the number list as sound intensity.'),
    ],
  }),
  tutorialMission({
    id: 'AR-8',
    category: 'AR',
    level: 2,
    title: text('입자 붓질', 'Particle Brush Stroke'),
    description: text(
      '작은 구슬을 연속으로 배치해 붓질 같은 흔적을 만들고 색의 흐름을 설계합니다.',
      'Place small spheres in sequence to create a brush stroke with flowing color.',
    ),
    starterCode: `from vpython import *
import math

scene_background(색상['아이보리'])

for i in range(90):
    t = i * 0.12
    x = -4 + i * 0.09
    y = math.sin(t) * 0.8
    z = math.cos(t * 0.7) * 0.4
    sphere(pos=vector(x, y, z), radius=0.06 + 0.03 * math.sin(t), color=파스텔[i % len(파스텔)], opacity=0.8)

# 바꿔보기: sin, cos 앞의 숫자를 바꿔 붓질의 흔들림을 바꿔보세요.
print("입자 붓질 완성")
`,
    solutionCode: `from vpython import *
import math

scene_background(색상['아이보리'])

for i in range(90):
    t = i * 0.12
    x = -4 + i * 0.09
    y = math.sin(t) * 1.4
    z = math.cos(t * 0.7) * 0.4
    sphere(pos=vector(x, y, z), radius=0.06 + 0.03 * math.sin(t), color=파스텔[i % len(파스텔)], opacity=0.8)

# 바꿔보기: sin, cos 앞의 숫자를 바꿔 붓질의 흔들림을 바꿔보세요.
print("입자 붓질 완성")
`,
    assertions: [
      count('sphere', '>=', 30, text('붓질 점이 30개 이상입니다', 'At least 30 stroke dots')),
      prop('sphere', 'opacity', '<', 1, { match: 'all', message: text('점이 반투명합니다 (opacity < 1)', 'Dots are translucent (opacity < 1)') }),
      anyOf(text('sin, cos 앞의 숫자를 바꿔 붓질의 흔들림을 바꿉니다', 'Change the numbers multiplying sin and cos'),
        count('sphere', '!=', 90),
        prop('sphere', 'pos.y', '>', 0.85, { match: 'any' }),
        prop('sphere', 'pos.y', '<', -0.85, { match: 'any' }),
        prop('sphere', 'pos.z', '>', 0.45, { match: 'any' }),
        prop('sphere', 'pos.z', '<', -0.45, { match: 'any' }),
        prop('sphere', 'pos.y', 'between', [-0.5, 0.5], { match: 'all' }),
      ),
    ],
    hints: [
      text('연속된 작은 점은 선처럼 보입니다.', 'Many small dots in sequence look like a line.'),
      text('수식의 숫자 하나만 바꿔도 붓질의 성격이 달라집니다.', 'Changing one number in a formula changes the stroke.'),
    ],
  }),
  tutorialMission({
    id: 'AR-9',
    category: 'AR',
    level: 3,
    title: text('장면 전환 루프', 'Scene Transition Loop'),
    description: text(
      '색상 팔레트와 조명 위치를 단계적으로 바꾸며 짧은 공연 장면을 만듭니다.',
      'Step through palettes and light positions to create a short performance loop.',
    ),
    starterCode: `from vpython import *

scene_background(색상['검정'])

중심 = sphere(pos=vector(0, 0.8, 0), radius=0.6, color=색상['흰색'], emissive=True)
빛 = local_light(pos=vector(0, 3, 2), color=색상['흰색'], intensity=1.2)

팔레트 = [색상['분홍'], 색상['하늘'], 색상['노랑'], 색상['민트']]

for scene in range(len(팔레트)):
    중심.color = 팔레트[scene]
    빛.color = 팔레트[(scene + 1) % len(팔레트)]
    빛.pos = vector(-2 + scene * 1.3, 3, 2)
    효과음("select")
    sleep(0.35)

# 바꿔보기: 팔레트 순서와 sleep 시간을 바꿔 다른 연출을 만드세요.
print("장면 전환 루프 완성")
`,
    solutionCode: `from vpython import *

scene_background(색상['검정'])

중심 = sphere(pos=vector(0, 0.8, 0), radius=0.6, color=색상['흰색'], emissive=True)
빛 = local_light(pos=vector(0, 3, 2), color=색상['흰색'], intensity=1.2)

팔레트 = [색상['노랑'], 색상['민트'], 색상['분홍'], 색상['하늘'], 색상['보라']]

for scene in range(len(팔레트)):
    중심.color = 팔레트[scene]
    빛.color = 팔레트[(scene + 1) % len(팔레트)]
    빛.pos = vector(-2 + scene * 1.3, 3, 2)
    효과음("select")
    sleep(0.35)

# 바꿔보기: 팔레트 순서와 sleep 시간을 바꿔 다른 연출을 만드세요.
print("장면 전환 루프 완성")
`,
    assertions: [
      count('sphere', '>=', 1, text('중심 sphere가 있습니다', 'A center sphere exists')),
      count('local_light', '>=', 1, text('조명 local_light가 있습니다', 'A local_light exists')),
      prop('local_light', 'historyLength', '>=', 3, { message: text('장면마다 조명 위치를 바꿉니다 (3회 이상)', 'The light moves each scene (3+ times)') }),
      count('sfx', '>=', 3, text('장면 전환마다 효과음을 냅니다 (3회 이상)', 'A sound effect per scene (3+)')),
      anyOf(text('팔레트 순서나 조명 이동 경로를 바꿉니다', 'Change the palette order or the light path'),
        prop('sphere', 'color', '!=', [0.6, 1, 0.8], { tolerance: 0.01 }),
        prop('local_light', 'color', '!=', [1, 0.75, 0.8], { tolerance: 0.01 }),
        prop('local_light', 'pos.x', '!=', 1.9, { tolerance: 0.01 }),
      ),
    ],
    codeChecks: [sleepCheck, { pattern: '효과음\\s*\\(|sfx\\s*\\(', minCount: 1, message: '효과음()으로 장면 전환을 알리세요' }],
    hints: [
      text('팔레트 리스트는 공연의 장면 순서가 됩니다.', 'The palette list becomes the order of scenes.'),
      text('조명 위치를 바꾸면 같은 물체도 다르게 보입니다.', 'Moving the light changes the same object dramatically.'),
    ],
  }),
  tutorialMission({
    id: 'MA-6',
    category: 'MA',
    level: 2,
    title: text('데이터 조각 공원', 'Data Sculpture Park'),
    description: text(
      '숫자 리스트를 3D 막대 조각으로 바꾸며 데이터 시각화의 첫 감각을 익힙니다.',
      'Turn a number list into 3D bar sculptures as a first taste of data visualization.',
    ),
    starterCode: `from vpython import *

데이터 = [3, 1, 4, 1, 5, 9, 2]

for i in range(len(데이터)):
    h = 데이터[i] * 0.25
    box(pos=vector(-3 + i, h / 2, 0), size=vector(0.45, h, 0.45), color=무지개[i % 7])

# 바꿔보기: 데이터 숫자를 내가 좋아하는 숫자나 날씨 데이터로 바꿔보세요.
print("데이터 조각 공원 완성")
`,
    solutionCode: `from vpython import *

데이터 = [2, 5, 7, 3, 6, 8, 4, 1]

for i in range(len(데이터)):
    h = 데이터[i] * 0.25
    box(pos=vector(-3 + i, h / 2, 0), size=vector(0.45, h, 0.45), color=무지개[i % 7])

# 바꿔보기: 데이터 숫자를 내가 좋아하는 숫자나 날씨 데이터로 바꿔보세요.
print("데이터 조각 공원 완성")
`,
    assertions: [
      count('box', '>=', 3, text('막대 box가 3개 이상입니다', 'At least 3 bar boxes')),
      prop('box', 'size.y', '>=', 2, { match: 'distinct', message: text('막대 높이가 데이터에 따라 달라집니다', 'Bar heights differ with the data') }),
      anyOf(text('데이터 숫자를 내 데이터로 바꿉니다', 'Replace the data with your own numbers'),
        count('box', '!=', 7),
        prop('box', 'size.y', '!=', 0.75, { index: 0, tolerance: 0.01 }),
        prop('box', 'size.y', '!=', 2.25, { index: 5, tolerance: 0.01 }),
      ),
    ],
    hints: [
      text('숫자가 클수록 막대가 높아집니다.', 'Larger numbers make taller bars.'),
      text('데이터를 그림으로 바꾸는 것이 시각화의 시작입니다.', 'Visualization starts by turning data into images.'),
    ],
  }),
  tutorialMission({
    id: 'MA-7',
    category: 'MA',
    level: 2,
    title: text('확률 구름', 'Probability Cloud'),
    description: text(
      '랜덤 숫자로 점을 뿌리고, 분포가 어떤 모양을 만드는지 관찰합니다.',
      'Scatter points with random numbers and observe the shape of a distribution.',
    ),
    starterCode: `from vpython import *
import random

scene_background(색상['검정'])

for i in range(180):
    x = random.uniform(-2.5, 2.5)
    y = random.uniform(-1.5, 1.5)
    z = random.uniform(-1.5, 1.5)
    sphere(pos=vector(x, y, z), radius=0.035, color=파스텔[i % len(파스텔)], opacity=0.65)

# 바꿔보기: uniform 범위를 바꾸면 구름 모양이 납작하거나 길어집니다.
print("확률 구름 완성")
`,
    solutionCode: `from vpython import *
import random

scene_background(색상['검정'])

for i in range(180):
    x = random.uniform(-4, 4)
    y = random.uniform(-0.6, 0.6)
    z = random.uniform(-1.5, 1.5)
    sphere(pos=vector(x, y, z), radius=0.035, color=파스텔[i % len(파스텔)], opacity=0.65)

# 바꿔보기: uniform 범위를 바꾸면 구름 모양이 납작하거나 길어집니다.
print("확률 구름 완성")
`,
    assertions: [
      count('sphere', '>=', 50, text('점이 50개 이상입니다', 'At least 50 points')),
      anyOf(text('uniform 범위를 바꿔 구름 모양을 바꿉니다', 'Change a uniform range to reshape the cloud'),
        prop('sphere', 'pos.x', '>', 2.6, { match: 'any' }),
        prop('sphere', 'pos.x', '<', -2.6, { match: 'any' }),
        prop('sphere', 'pos.y', '>', 1.6, { match: 'any' }),
        prop('sphere', 'pos.y', '<', -1.6, { match: 'any' }),
        prop('sphere', 'pos.z', '>', 1.6, { match: 'any' }),
        prop('sphere', 'pos.z', '<', -1.6, { match: 'any' }),
        prop('sphere', 'pos.x', 'between', [-1.5, 1.5], { match: 'all' }),
        prop('sphere', 'pos.y', 'between', [-0.8, 0.8], { match: 'all' }),
        prop('sphere', 'pos.z', 'between', [-0.8, 0.8], { match: 'all' }),
      ),
    ],
    hints: [
      text('random.uniform(-2.5, 2.5)는 범위 안의 랜덤 값을 만듭니다.', 'random.uniform(-2.5, 2.5) creates a random value in that range.'),
      text('범위가 넓은 축일수록 구름도 그 방향으로 길어집니다.', 'The cloud stretches along axes with wider ranges.'),
    ],
  }),
  tutorialMission({
    id: 'SC-6',
    category: 'SC',
    level: 2,
    title: text('감염 확산 미니 모델', 'Mini Spread Model'),
    description: text(
      '주변으로 색이 퍼지는 간단한 모델을 통해 시뮬레이션이 무엇인지 느껴봅니다.',
      'Feel what simulation means with a simple color spread model.',
    ),
    starterCode: `from vpython import *

칸들 = []
for i in range(11):
    색 = 색상['분홍'] if i == 5 else 색상['하늘']
    칸 = sphere(pos=vector(-5 + i, 0, 0), radius=0.22, color=색, emissive=(i == 5))
    칸들.append(칸)

for step in range(5):
    sleep(0.4)
    왼쪽 = 5 - step - 1
    오른쪽 = 5 + step + 1
    if 왼쪽 >= 0:
        칸들[왼쪽].color = 색상['분홍']
        칸들[왼쪽].emissive = True
    if 오른쪽 < len(칸들):
        칸들[오른쪽].color = 색상['분홍']
        칸들[오른쪽].emissive = True

# 바꿔보기: 시작 위치와 sleep 시간을 바꿔 확산 속도를 비교하세요.
print("확산 모델 완성")
`,
    solutionCode: `from vpython import *

시작 = 2
칸들 = []
for i in range(11):
    색 = 색상['분홍'] if i == 시작 else 색상['하늘']
    칸 = sphere(pos=vector(-5 + i, 0, 0), radius=0.22, color=색, emissive=(i == 시작))
    칸들.append(칸)

for step in range(5):
    sleep(0.4)
    왼쪽 = 시작 - step - 1
    오른쪽 = 시작 + step + 1
    if 왼쪽 >= 0:
        칸들[왼쪽].color = 색상['분홍']
        칸들[왼쪽].emissive = True
    if 오른쪽 < len(칸들):
        칸들[오른쪽].color = 색상['분홍']
        칸들[오른쪽].emissive = True

# 바꿔보기: 시작 위치와 sleep 시간을 바꿔 확산 속도를 비교하세요.
print("확산 모델 완성")
`,
    assertions: [
      count('sphere', '>=', 5, text('칸 sphere가 5개 이상입니다', 'At least 5 cell spheres')),
      prop('sphere', 'color', '==', [1, 0.75, 0.8], { match: 'count', minCount: 5, tolerance: 0.01, message: text('분홍으로 바뀐 칸이 5개 이상입니다 (확산)', 'At least 5 cells turned pink (spread)') }),
      prop('sphere', 'emissive', '==', true, { match: 'count', minCount: 5, message: text('감염된 칸은 emissive로 빛납니다', 'Infected cells glow (emissive)') }),
      anyOf(text('시작 위치를 바꿔 확산이 닿지 않는 칸을 남기거나 칸 수를 바꿉니다', 'Move the start so some cells stay sky blue, or change the cell count'),
        count('sphere', '!=', 11),
        prop('sphere', 'color', '==', [0.53, 0.81, 0.92], { match: 'any', tolerance: 0.01 }),
      ),
    ],
    hints: [
      text('시뮬레이션은 현실을 단순한 규칙으로 흉내 내는 방법입니다.', 'A simulation imitates reality with simplified rules.'),
      text('규칙 하나를 바꾸면 전체 결과가 달라집니다.', 'Changing one rule changes the whole result.'),
    ],
  }),
  tutorialMission({
    id: 'SN-6',
    category: 'SN',
    level: 1,
    title: text('악기 바꿔 듣기', 'Try Different Instruments'),
    description: text(
      '같은 멜로디를 여러 악기로 들어 보며 음색의 차이를 느낍니다.',
      'Hear the same melody with different instruments and notice timbre.',
    ),
    starterCode: `from vpython import *

악기들 = ["피아노", "플루트", "칩튠", "기타"]
멜로디 = ["도4", "미4", "솔4"]

for i in range(len(악기들)):
    sphere(pos=vector(-1.5 + i, 0, 0), radius=0.22, color=무지개[i], emissive=True)
    for note_name in 멜로디:
        악기(악기들[i], note_name, 0.22)
    sleep(0.15)

# 바꿔보기: 악기 순서나 멜로디를 바꿔보세요.
print("악기 비교 완료")
`,
    solutionCode: `from vpython import *

악기들 = ["칩튠", "피아노", "플루트", "기타"]
멜로디 = ["도4", "레4", "미4", "파4"]

for i in range(len(악기들)):
    sphere(pos=vector(-1.5 + i, 0, 0), radius=0.22, color=무지개[i], emissive=True)
    for note_name in 멜로디:
        악기(악기들[i], note_name, 0.22)
    sleep(0.15)

# 바꿔보기: 악기 순서나 멜로디를 바꿔보세요.
print("악기 비교 완료")
`,
    assertions: [
      count('note', '>=', 6, text('여러 악기로 멜로디를 연주합니다 (6음 이상)', 'The melody plays on several instruments (6+ notes)')),
      prop('note', 'type', '>=', 2, { match: 'distinct', message: text('음색이 다른 악기가 2종 이상입니다', 'At least two different timbres') }),
      anyOf(text('악기 순서나 멜로디를 바꿉니다', 'Change the instrument order or the melody'),
        prop('note', 'name', '!=', 'C4', { index: 0 }),
        prop('note', 'name', '!=', 'E4', { index: 1 }),
        prop('note', 'name', '!=', 'G4', { index: 2 }),
        prop('note', 'type', '!=', 'triangle', { index: 0 }),
        count('note', '!=', 12),
      ),
    ],
    hints: [
      text('악기 이름만 바꿔도 같은 음이 다르게 들립니다.', 'Changing only the instrument changes the sound color.'),
      text('멜로디 리스트를 바꾸면 모든 악기가 새 멜로디를 연주합니다.', 'Change the melody list and every instrument plays it.'),
    ],
  }),
  tutorialMission({
    id: 'SN-7',
    category: 'SN',
    level: 2,
    title: text('콜 앤 리스폰스', 'Call and Response'),
    description: text(
      '한 소절을 들려주고 다른 소절로 대답하는 음악 대화 구조를 만듭니다.',
      'Build a musical conversation: one phrase calls, another responds.',
    ),
    starterCode: `from vpython import *

질문 = ["도4", "레4", "미4"]
대답 = ["미4", "레4", "도4"]

for n in 질문:
    음표(n, 0.25)
sleep(0.25)
효과음("select")
for n in 대답:
    음표(n, 0.25)

for i in range(6):
    색 = 색상['하늘'] if i < 3 else 색상['분홍']
    sphere(pos=vector(-2.5 + i, 0, 0), radius=0.18, color=색, emissive=True)

# 바꿔보기: 질문과 대답 리스트를 바꿔 나만의 음악 대화를 만드세요.
print("콜 앤 리스폰스 완성")
`,
    solutionCode: `from vpython import *

질문 = ["도4", "미4", "솔4"]
대답 = ["솔4", "미4", "도4"]

for n in 질문:
    음표(n, 0.25)
sleep(0.25)
효과음("select")
for n in 대답:
    음표(n, 0.25)

for i in range(6):
    색 = 색상['하늘'] if i < 3 else 색상['분홍']
    sphere(pos=vector(-2.5 + i, 0, 0), radius=0.18, color=색, emissive=True)

# 바꿔보기: 질문과 대답 리스트를 바꿔 나만의 음악 대화를 만드세요.
print("콜 앤 리스폰스 완성")
`,
    assertions: [
      count('note', '>=', 6, text('질문 3음과 대답 3음을 연주합니다', 'Three call notes and three response notes')),
      count('sfx', '>=', 1, text('질문과 대답 사이에 효과음을 넣습니다', 'A sound effect between call and response')),
      count('sphere', '>=', 6, text('음마다 구슬이 있습니다 (6개 이상)', 'A sphere per note (6+)')),
      anyOf(text('질문과 대답 리스트를 바꿉니다', 'Change the call and response lists'),
        prop('note', 'name', '!=', 'C4', { index: 0 }),
        prop('note', 'name', '!=', 'D4', { index: 1 }),
        prop('note', 'name', '!=', 'E4', { index: 2 }),
        prop('note', 'name', '!=', 'E4', { index: 3 }),
        prop('note', 'name', '!=', 'D4', { index: 4 }),
        prop('note', 'name', '!=', 'C4', { index: 5 }),
        count('note', '!=', 6),
      ),
    ],
    hints: [
      text('음악에서도 질문과 대답처럼 들리는 구조를 만들 수 있습니다.', 'Music can feel like question and answer.'),
      text('두 리스트의 방향을 반대로 하면 거울 같은 느낌이 납니다.', 'Reversing the lists creates a mirror-like phrase.'),
    ],
  }),
  tutorialMission({
    id: 'SN-8',
    category: 'SN',
    level: 2,
    title: text('드럼머신 흉내내기', 'Tiny Drum Machine'),
    description: text(
      '효과음을 리듬 칸에 배치해 간단한 드럼머신처럼 연주합니다.',
      'Place sound effects on rhythm slots like a tiny drum machine.',
    ),
    starterCode: `from vpython import *

패턴 = ["jump", "coin", "jump", "powerup", "jump", "coin", "explosion", "success"]

for i in range(len(패턴)):
    sphere(pos=vector(-3.5 + i, 0, 0), radius=0.16, color=무지개[i % 7], emissive=True)
    효과음(패턴[i])
    sleep(0.18)

# 바꿔보기: 패턴의 효과음 이름과 sleep 길이를 바꿔 리듬을 만드세요.
print("드럼머신 패턴 완성")
`,
    solutionCode: `from vpython import *

패턴 = ["laser", "coin", "laser", "select", "jump", "coin", "warning", "success"]

for i in range(len(패턴)):
    sphere(pos=vector(-3.5 + i, 0, 0), radius=0.16, color=무지개[i % 7], emissive=True)
    효과음(패턴[i])
    sleep(0.18)

# 바꿔보기: 패턴의 효과음 이름과 sleep 길이를 바꿔 리듬을 만드세요.
print("드럼머신 패턴 완성")
`,
    assertions: [
      count('sfx', '>=', 6, text('효과음을 6번 이상 배치합니다', 'Place at least 6 sound effects')),
      count('sphere', '>=', 6, text('칸마다 구슬이 있습니다 (6개 이상)', 'A sphere per slot (6+)')),
      anyOf(text('패턴의 효과음 이름을 바꿉니다', 'Change the sound effect names in the pattern'),
        count('sfx', '!=', 8),
        prop('sfx', 'name', '!=', 'jump', { index: 0 }),
        prop('sfx', 'name', '!=', 'coin', { index: 1 }),
        prop('sfx', 'name', 'not_in', ['jump', 'coin', 'powerup', 'explosion', 'success'], { match: 'any' }),
      ),
    ],
    codeChecks: [sleepCheck],
    hints: [
      text('효과음도 리듬 재료가 될 수 있습니다.', 'Sound effects can be rhythm material too.'),
      text('sleep 시간이 짧으면 빠른 리듬, 길면 느린 리듬이 됩니다.', 'Short sleep makes a fast rhythm; long sleep makes a slow one.'),
    ],
  }),
  tutorialMission({
    id: 'SN-9',
    category: 'SN',
    level: 3,
    title: text('멜로디를 색으로 번역하기', 'Translate Melody into Color'),
    description: text(
      '음 높이를 색과 위치에 연결해 듣는 음악을 보는 패턴으로 바꿉니다.',
      'Map pitch to color and position so a melody becomes visible.',
    ),
    starterCode: `from vpython import *

멜로디 = ["도4", "레4", "미4", "솔4", "미4", "레4", "도4"]
높이 = {
    "도4": 0,
    "레4": 0.3,
    "미4": 0.6,
    "파4": 0.9,
    "솔4": 1.2,
}

for i in range(len(멜로디)):
    n = 멜로디[i]
    y = 높이[n]
    sphere(pos=vector(-3 + i, y, 0), radius=0.18, color=무지개[i % 7], emissive=True)
    음표(n, 0.28)

# 바꿔보기: 멜로디와 높이 사전을 바꿔 다른 그림을 만들어 보세요.
print("멜로디 색 번역 완료")
`,
    solutionCode: `from vpython import *

멜로디 = ["도4", "미4", "솔4", "라4", "솔4", "미4", "도4"]
높이 = {
    "도4": 0,
    "레4": 0.3,
    "미4": 0.6,
    "파4": 0.9,
    "솔4": 1.2,
    "라4": 1.5,
}

for i in range(len(멜로디)):
    n = 멜로디[i]
    y = 높이[n]
    sphere(pos=vector(-3 + i, y, 0), radius=0.18, color=무지개[i % 7], emissive=True)
    음표(n, 0.28)

# 바꿔보기: 멜로디와 높이 사전을 바꿔 다른 그림을 만들어 보세요.
print("멜로디 색 번역 완료")
`,
    assertions: [
      count('note', '>=', 5, text('멜로디가 5음 이상입니다', 'At least 5 melody notes')),
      count('sphere', '>=', 5, text('음마다 구슬이 있습니다 (5개 이상)', 'A sphere per note (5+)')),
      prop('sphere', 'pos.y', '>=', 3, { match: 'distinct', message: text('음 높이에 따라 구슬 높이가 3단계 이상 다릅니다', 'Sphere heights differ by pitch (3+ levels)') }),
      anyOf(text('멜로디나 높이 사전을 바꿉니다', 'Change the melody or the height dictionary'),
        prop('note', 'name', '!=', 'C4', { index: 0 }),
        prop('note', 'name', '!=', 'D4', { index: 1 }),
        prop('note', 'name', '!=', 'E4', { index: 2 }),
        prop('note', 'name', '!=', 'G4', { index: 3 }),
        count('note', '!=', 7),
        prop('sphere', 'pos.y', '>', 1.25, { match: 'any' }),
      ),
    ],
    hints: [
      text('사전(dictionary)은 이름과 값을 연결합니다.', 'A dictionary connects names to values.'),
      text('음 높이를 y 좌표로 바꾸면 멜로디 선처럼 보입니다.', 'Mapping pitch to y makes the melody look like a line.'),
    ],
  }),
  tutorialMission({
    id: 'SN-10',
    category: 'SN',
    level: 3,
    title: text('나만의 짧은 사운드 로고', 'Your Short Sound Logo'),
    description: text(
      '브랜드 로고처럼 기억에 남는 3초짜리 소리와 빛 장면을 만듭니다.',
      'Create a memorable three-second sound-and-light logo.',
    ),
    starterCode: `from vpython import *

scene_background(색상['검정'])

로고 = sphere(pos=vector(0, 0, 0), radius=0.5, color=색상['민트'], emissive=True)

악기("플루트", "도5", 0.25)
로고.radius = 0.75
악기("플루트", "솔4", 0.25)
로고.color = 색상['분홍']
악기("플루트", "도5", 0.45)
화음([높은음계['도'], 높은음계['미'], 높은음계['솔']], 0.8)

효과음("success")

# 바꿔보기: 세 음, 색 변화, 마지막 화음을 바꿔 나만의 사운드 로고를 만드세요.
print("사운드 로고 완성")
`,
    solutionCode: `from vpython import *

scene_background(색상['검정'])

로고 = sphere(pos=vector(0, 0, 0), radius=0.5, color=색상['민트'], emissive=True)

악기("플루트", "미5", 0.25)
로고.radius = 0.75
악기("플루트", "솔4", 0.25)
로고.color = 색상['노랑']
악기("플루트", "도5", 0.45)
화음([높은음계['도'], 높은음계['미'], 높은음계['솔']], 0.8)

효과음("success")

# 바꿔보기: 세 음, 색 변화, 마지막 화음을 바꿔 나만의 사운드 로고를 만드세요.
print("사운드 로고 완성")
`,
    assertions: [
      count('sphere', '>=', 1, text('로고 sphere가 있습니다', 'A logo sphere exists')),
      count('note', '>=', 4, text('세 음과 마무리 화음을 연주합니다 (4개 이상)', 'Three notes plus a final chord (4+)')),
      count('sfx', '>=', 1, text('마지막에 효과음을 냅니다', 'A sound effect at the end')),
      anyOf(text('세 음, 색 변화, 마지막 화음 중 하나를 바꿉니다', 'Change the three notes, the color change, or the final chord'),
        prop('note', 'name', '!=', 'C5', { index: 0 }),
        prop('note', 'name', '!=', 'G4', { index: 1 }),
        prop('note', 'name', '!=', 'C5', { index: 2 }),
        prop('note', 'name', '!=', 'C5+E5+G5', { index: 3 }),
        prop('sphere', 'color', '!=', [1, 0.75, 0.8], { tolerance: 0.01 }),
      ),
    ],
    hints: [
      text('짧은 소리일수록 반복되는 특징이 중요합니다.', 'Short sound logos need memorable repetition.'),
      text('마지막 화음은 장면의 마침표처럼 들립니다.', 'The final chord works like punctuation.'),
    ],
  }),

  // ═══════════════════════════════════════════
  // PC: 피지컬 컴퓨팅 시뮬레이션 (시범) — physical-missions.js
  // ═══════════════════════════════════════════
  ...physicalMissions,
];

export default missions;

/**
 * 카테고리 메타 정보
 */
export const categories = {
  CT: {
    id: 'CT',
    title: { ko: '컴퓨팅 사고', en: 'Computational Thinking' },
    icon: '🧠',
    color: '#4A90D9',
  },
  CR: {
    id: 'CR',
    title: { ko: '창작 갤러리', en: 'Creative Gallery' },
    icon: '🎨',
    color: '#D94A8C',
  },
  MA: {
    id: 'MA',
    title: { ko: '수학 탐구', en: 'Math Exploration' },
    icon: '📐',
    color: '#4AD99A',
  },
  SC: {
    id: 'SC',
    title: { ko: '과학 실험실', en: 'Science Lab' },
    icon: '🔬',
    color: '#D9A44A',
  },
  AR: {
    id: 'AR',
    title: { ko: '미디어 아트', en: 'Media Art' },
    icon: '🎭',
    color: '#9A4AD9',
  },
  SN: {
    id: 'SN',
    title: { ko: '음악 코딩', en: 'Music Coding' },
    icon: '🎵',
    color: '#D9694A',
  },
  PC: {
    id: 'PC',
    title: { ko: '피지컬 컴퓨팅', en: 'Physical Computing' },
    icon: '🔌',
    color: '#3FA7A0',
  },
};

/**
 * 특정 카테고리의 미션 목록
 */
export function getMissionsByCategory(categoryId) {
  return missions.filter(m => m.category === categoryId);
}

/**
 * ID로 미션 조회
 */
export function getMissionById(id) {
  return missions.find(m => m.id === id);
}
