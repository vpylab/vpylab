/**
 * VPyLab 코스 데이터
 *
 * 코스 = 차시(lesson) 단위로 묶인 학습 트랙.
 * 입문·융합·튜토리얼 트랙. 코드 실습 또는 화면 절차를 안내하는 차시로 구성합니다.
 *
 * 스키마:
 *   id           : 코스 고유 ID (kebab-case)
 *   track        : 'beginner' | 'fusion' | 'tutorial'
 *   level        : 1~3 (1=완전 입문, 2=변수/반복까지, 3=시뮬/AI 포함)
 *   title.ko/en  : 코스명
 *   subject      : 융합 코스의 결합 교과 (입문은 '코딩')
 *   description  : 1~2문장 소개 (ko)
 *   targetGrade  : 추천 학년
 *   sessions     : 권장 차시 수
 *   icon         : 카드 아이콘(이모지)
 *   color        : Tailwind 색상 키 (UI 테두리)
 *   lessons      : Array<{ id, title, summary, code?, guide? }>
 */

import lightSoundCourse from './light-sound-course.js';
import githubProjectCourse from './github-project-course.js';

const courses = [
  lightSoundCourse,
  githubProjectCourse,
  // ════════════════════════════════════════════════════════
  // [입문 0] 처음 파이썬 — 소리와 빛으로 시작하기 (7단계, 1~2줄에서 시작)
  // ════════════════════════════════════════════════════════
  {
    id: 'beg-first-steps',
    track: 'beginner',
    level: 1,
    title: { ko: '처음 파이썬: 소리와 빛으로 시작', en: 'First Python: Start with Sound and Light' },
    subject: '코딩',
    description:
      '2줄짜리 소리 내기로 시작해, 주어진 코드에서 값 하나씩 바꿔 보며 빛·반복문·조건문·랜덤·리스트를 체험한다. 모든 코드는 15줄 이하.',
    targetGrade: '중1~고1',
    sessions: 7,
    icon: '🔔',
    color: 'amber',
    starlightTheme: 'amber',
    lessons: [
      {
        id: 'beg-first-steps-1',
        title: { ko: '1단계 소리 내기', en: 'Step 1: Make a Sound' },
        summary: '두 줄로 "도" 소리를 낸다. 따옴표 안의 음 이름만 "미"나 "솔5"로 바꿔 본다(5는 높은 옥타브).',
        code: `from vpython import *
음표("도")
`,
      },
      {
        id: 'beg-first-steps-2',
        title: { ko: '2단계 빛 켜기', en: 'Step 2: Turn on a Light' },
        summary: '기본 조명을 끄고 빨간 빛 하나로 회색 공을 비춘다. 색 이름(\'하늘\', \'노랑\', \'보라\')이나 pos의 첫 숫자(좌우)를 바꿔 어디가 밝아지는지 본다.',
        code: `from vpython import *
scene.lights = []
sphere(color=색상['회색'])
local_light(pos=vector(2, 2, 2), color=색상['빨강'], intensity=50)
효과음("coin")
`,
      },
      {
        id: 'beg-first-steps-3',
        title: { ko: '3단계 반복문: 무지개 계이름', en: 'Step 3: Loop the Rainbow Scale' },
        summary: 'for가 7번 돌며 공을 하나씩 놓고 계이름을 하나씩 낸다. i는 0부터 6까지 변한다. 0.3을 0.1이나 0.6으로 바꿔 연주 속도를 비교한다(7은 색과 글자 개수라 그대로 둔다).',
        code: `from vpython import *
for i in range(7):
    sphere(pos=vector(i - 3, 0, 0), radius=0.4, color=무지개[i])
    음표("도레미파솔라시"[i], 0.3)
효과음("levelup")
`,
      },
      {
        id: 'beg-first-steps-4',
        title: { ko: '4단계 조건문: 튀는 공', en: 'Step 4: If the Ball Hits the Floor' },
        summary: 'while로 공을 계속 떨어뜨리고, if로 바닥에 닿는 순간을 잡아 튀어 오르며 소리를 낸다. 0.3을 0.2나 0.5로 바꿔 튀는 높이를 비교한다. 끝나지 않는 프로그램이니 정지 버튼으로 멈춘다.',
        code: `from vpython import *
scene.range = 4
box(pos=vector(0, -3, 0), size=vector(6, 0.2, 3), color=색상['회색'])
공 = sphere(pos=vector(0, 3, 0), radius=0.5, color=색상['노랑'])
속도 = 0
while True:
    rate(60)
    속도 = 속도 - 0.01
    공.pos.y = 공.pos.y + 속도
    if 공.pos.y < -2.4:
        속도 = 0.3
        효과음("jump")
`,
      },
      {
        id: 'beg-first-steps-5',
        title: { ko: '5단계 랜덤: 별과 소리', en: 'Step 5: Random Stars and Sounds' },
        summary: 'random.uniform은 범위 안의 아무 수, random.choice는 목록에서 아무 하나를 고른다. 실행할 때마다 다른 밤하늘이 나온다. 30을 100으로 바꿔 본다.',
        code: `from vpython import *
import random
for i in range(30):
    x = random.uniform(-5, 5)
    y = random.uniform(-3, 3)
    sphere(pos=vector(x, y, 0), radius=0.2, color=random.choice(무지개))
    소리(random.randint(300, 900), 0.1)
    sleep(0.1)
`,
      },
      {
        id: 'beg-first-steps-6',
        title: { ko: '6단계 리스트: 멜로디 건반', en: 'Step 6: A Melody List on Keys' },
        summary: '멜로디는 음 이름 7개를 담은 리스트, 건반들은 상자 7개를 담은 리스트다. 번호 i로 둘을 같이 꺼낸다. 멜로디의 음을 바꿔 좋아하는 노래를 만든다(개수는 7개로 유지).',
        code: `from vpython import *
멜로디 = ["도", "미", "솔", "도5", "솔", "미", "도"]
건반들 = []
for i in range(7):
    건반 = box(pos=vector(i - 3, 0, 0), size=vector(0.9, 0.3, 2), color=색상['흰색'])
    건반들.append(건반)
for i in range(7):
    건반들[i].color = 무지개[i]
    음표(멜로디[i], 0.4)
    건반들[i].color = 색상['흰색']
`,
      },
      {
        id: 'beg-first-steps-7',
        title: { ko: '7단계 빛과 소리 쇼', en: 'Step 7: Light and Sound Show' },
        summary: '반 초마다(프레임 % 30 == 0) 랜덤 음을 내고, 그때 빛 색이 바뀌며 공이 커졌다가 줄어든다. 30을 15로 바꾸면 박자가 빨라진다. 멜로디는 4개로 유지한다.',
        code: `from vpython import *
import random
scene.lights = []
공 = sphere(radius=1, color=색상['회색'])
빛 = local_light(pos=vector(0, 2, 2), color=색상['보라'], intensity=60)
멜로디 = ["도", "미", "솔", "도5"]
for 프레임 in range(1, 601):
    rate(60)
    if 프레임 % 30 == 0:
        음번호 = random.randint(0, 3)
        play_note(멜로디[음번호], 0.4)
        빛.color = 무지개[음번호 * 2]
        공.radius = 1.4
    공.radius = 공.radius - (공.radius - 1) * 0.1
`,
      },
    ],
  },
  // ════════════════════════════════════════════════════════
  // [입문 1] 도형 친구들 만나기 — 첫 3D 객체와 좌표
  // ════════════════════════════════════════════════════════
  {
    id: 'beg-shapes',
    track: 'beginner',
    level: 1,
    title: { ko: '도형 친구들 만나기', en: 'Meet the 3D Shapes' },
    subject: '코딩',
    description:
      '코딩이 처음인 학생을 위한 첫 3D 코스. sphere·box·color로 5차시 만에 "내 캐릭터"를 만든다.',
    targetGrade: '중1~고1',
    sessions: 5,
    icon: '🟦',
    color: 'sky',
    starlightTheme: 'sky',
    lessons: [
      {
        id: 'beg-shapes-1',
        title: { ko: '첫 공 띄우기', en: 'First Sphere' },
        summary: 'sphere() 한 줄로 3D 구를 화면에 띄운다.',
        code: `from vpython import *

scene_background(색상['검정'])

# 빛나는 첫 공
공 = sphere(pos=vector(0, 0, 0), radius=1.0, color=색상['하늘'], emissive=True)
`,
      },
      {
        id: 'beg-shapes-2',
        title: { ko: '좌표의 비밀: x, y, z', en: 'Coordinates' },
        summary: 'pos=vector(x,y,z)로 객체를 옆·위·뒤로 이동한다.',
        code: `from vpython import *

scene_background(색상['검정'])

# 같은 공을 세 자리에 — x, y, z의 차이
sphere(pos=vector(-3, 0, 0), radius=0.6, color=색상['빨강'])
sphere(pos=vector(0, 2, 0), radius=0.6, color=색상['초록'])
sphere(pos=vector(0, 0, -3), radius=0.6, color=색상['파랑'])

label(pos=vector(-3, 1, 0), text='x = -3', height=14)
label(pos=vector(0, 3, 0), text='y = +2', height=14)
label(pos=vector(0, 1, -3), text='z = -3', height=14)
`,
      },
      {
        id: 'beg-shapes-3',
        title: { ko: '색깔과 크기 바꾸기', en: 'Color & Size' },
        summary: 'radius와 color 속성을 마음껏 바꿔 본다.',
        code: `from vpython import *

scene_background(색상['남색'])

큰공 = sphere(pos=vector(-2, 0, 0), radius=1.4, color=색상['주황'])
보통공 = sphere(pos=vector(0, 0, 0), radius=0.9, color=색상['연두'])
작은공 = sphere(pos=vector(2, 0, 0), radius=0.5, color=색상['분홍'])

# 박스도 같이 — size는 (가로, 세로, 깊이)
상자 = box(pos=vector(0, -2, 0), size=vector(5, 0.3, 1), color=색상['갈색'])
`,
      },
      {
        id: 'beg-shapes-4',
        title: { ko: '신호등 만들기', en: 'Traffic Light' },
        summary: '세 개의 sphere를 위·중·아래로 쌓아 신호등을 표현한다.',
        code: `from vpython import *

scene_background(색상['검정'])

# 신호등 기둥
기둥 = box(pos=vector(0, -2, 0), size=vector(0.4, 4, 0.4), color=색상['회색'])

# 위에서부터 빨강·노랑·초록
빨강 = sphere(pos=vector(0, 1.2, 0), radius=0.45, color=색상['빨강'], emissive=True)
노랑 = sphere(pos=vector(0, 0.2, 0), radius=0.45, color=색상['노랑'])
초록 = sphere(pos=vector(0, -0.8, 0), radius=0.45, color=색상['초록'])
`,
      },
      {
        id: 'beg-shapes-5',
        title: { ko: '내 캐릭터 만들기', en: 'My Character' },
        summary: '여러 도형을 조합해 자유 캐릭터 1개를 디자인한다.',
        code: `from vpython import *

scene_background(색상['하늘'])

# 눈사람 예시 — 학생이 자유롭게 변형
몸통 = sphere(pos=vector(0, -0.5, 0), radius=1.0, color=색상['흰색'])
머리 = sphere(pos=vector(0, 0.9, 0), radius=0.6, color=색상['흰색'])

왼눈 = sphere(pos=vector(-0.2, 1.0, 0.55), radius=0.07, color=색상['검정'])
오눈 = sphere(pos=vector(0.2, 1.0, 0.55), radius=0.07, color=색상['검정'])
코 = cone(pos=vector(0, 0.85, 0.55), axis=vector(0, 0, 0.4), radius=0.08, color=색상['주황'])

모자 = cylinder(pos=vector(0, 1.45, 0), axis=vector(0, 0.4, 0), radius=0.4, color=색상['검정'])
`,
      },
    ],
  },

  // ════════════════════════════════════════════════════════
  // [입문 2] 같은 모양 다른 위치 — for·리스트·clone
  // ════════════════════════════════════════════════════════
  {
    id: 'beg-patterns',
    track: 'beginner',
    level: 1,
    title: { ko: '같은 모양 다른 위치', en: 'Same Shape, Different Place' },
    subject: '코딩',
    description:
      'for 반복문과 리스트로 "같은 코드 다른 결과"를 만드는 두 번째 코스. 6차시.',
    targetGrade: '중1~고1',
    sessions: 6,
    icon: '🔁',
    color: 'emerald',
    starlightTheme: 'emerald',
    lessons: [
      {
        id: 'beg-patterns-1',
        title: { ko: 'for 5번 반복', en: 'for 5 Times' },
        summary: 'range(5)와 for로 같은 객체를 5개 만든다.',
        code: `from vpython import *

scene_background(색상['검정'])

for i in range(5):
    sphere(pos=vector(i * 1.2, 0, 0), radius=0.4, color=색상['하늘'])
`,
      },
      {
        id: 'beg-patterns-2',
        title: { ko: 'range와 인덱스', en: 'range and Index' },
        summary: '인덱스 i를 색·크기 계산에 사용한다.',
        code: `from vpython import *

scene_background(색상['검정'])

for i in range(7):
    크기 = 0.2 + i * 0.1
    높이 = i * 0.6
    sphere(pos=vector(0, 높이, 0), radius=크기, color=무지개[i])
`,
      },
      {
        id: 'beg-patterns-3',
        title: { ko: '리스트에 담기', en: 'Store in a List' },
        summary: '생성한 객체들을 리스트로 모아 한꺼번에 다룬다.',
        code: `from vpython import *

scene_background(색상['검정'])

공들 = []
for i in range(10):
    c = sphere(pos=vector(i - 5, 0, 0), radius=0.4, color=색상['흰색'])
    공들.append(c)

# 모든 공의 색을 한꺼번에 바꾸기
for c in 공들:
    c.color = 색상['보라']
`,
      },
      {
        id: 'beg-patterns-4',
        title: { ko: '체스판 만들기 (2중 for)', en: '2D Loop: Chessboard' },
        summary: 'for 안의 for로 격자 패턴을 만든다.',
        code: `from vpython import *

scene_background(색상['검정'])

for x in range(8):
    for z in range(8):
        # 짝수 칸 흰색, 홀수 칸 검은색
        if (x + z) % 2 == 0:
            칸색 = 색상['흰색']
        else:
            칸색 = 색상['검정']
        box(pos=vector(x - 3.5, 0, z - 3.5),
            size=vector(0.95, 0.1, 0.95),
            color=칸색)
`,
      },
      {
        id: 'beg-patterns-5',
        title: { ko: '나선 계단', en: 'Spiral Staircase' },
        summary: 'sin·cos로 원형 좌표를 계산해 나선 패턴을 만든다.',
        code: `from vpython import *
import math

scene_background(색상['검정'])

for i in range(40):
    각 = i * 0.4
    높이 = i * 0.15
    x = 3 * math.cos(각)
    z = 3 * math.sin(각)
    box(pos=vector(x, 높이, z),
        size=vector(0.8, 0.1, 0.4),
        color=무지개[i % 7])
`,
      },
      {
        id: 'beg-patterns-6',
        title: { ko: '자유 패턴 작품', en: 'Free Pattern' },
        summary: '배운 것을 조합해 나만의 패턴을 만든다 (정원·우주 함대 등).',
        code: `from vpython import *
import math

scene_background(색상['남색'])

# 꽃 정원 예시 — 줄기 + 꽃잎 6장
def 꽃(중심):
    cylinder(pos=중심, axis=vector(0, 1.2, 0), radius=0.05, color=색상['초록'])
    sphere(pos=중심 + vector(0, 1.2, 0), radius=0.18, color=색상['노랑'])
    for k in range(6):
        각 = k * math.pi / 3
        잎_pos = 중심 + vector(0.35 * math.cos(각), 1.2, 0.35 * math.sin(각))
        sphere(pos=잎_pos, radius=0.18, color=색상['분홍'])

for i in range(5):
    for j in range(5):
        꽃(vector(i * 1.4 - 2.8, 0, j * 1.4 - 2.8))
`,
      },
    ],
  },

  // ════════════════════════════════════════════════════════
  // [입문 3] 도레미로 만드는 첫 멜로디 — 음표·리스트·박자
  // ════════════════════════════════════════════════════════
  {
    id: 'beg-melody',
    track: 'beginner',
    level: 1,
    title: { ko: '도레미 첫 멜로디', en: 'Do-Re-Mi: First Melody' },
    subject: '코딩',
    description:
      '코드로 소리를 내는 5차시 입문 코스. 음표·리스트·박자로 짧은 곡 한 편을 작곡한다.',
    targetGrade: '중1~고1',
    sessions: 5,
    icon: '🎵',
    color: 'amber',
    starlightTheme: 'amber',
    lessons: [
      {
        id: 'beg-melody-1',
        title: { ko: '첫 음표 울리기', en: 'First Note' },
        summary: '음표("도4", 0.4)로 한 음을 들려준다.',
        code: `from vpython import *

# 가장 단순한 한 음
음표("도4", 0.5)
음표("미4", 0.5)
음표("솔4", 0.5)
음표("도5", 1.0)
`,
      },
      {
        id: 'beg-melody-2',
        title: { ko: '옥타브와 #샤프', en: 'Octave & Sharp' },
        summary: '같은 음이름이라도 옥타브가 다르면 다른 소리가 난다.',
        code: `from vpython import *

# 같은 도, 다른 옥타브
음표("도3", 0.4)
음표("도4", 0.4)
음표("도5", 0.4)

sleep(0.3)

# 반음(샤프)
음표("도4", 0.4)
음표("도#4", 0.4)
음표("레4", 0.4)
`,
      },
      {
        id: 'beg-melody-3',
        title: { ko: '리스트로 멜로디', en: 'Melody as a List' },
        summary: '음표 시퀀스를 리스트로 표현해 짧은 동요를 연주한다.',
        code: `from vpython import *

# 작은별 첫 두 마디
멜로디 = ["도4", "도4", "솔4", "솔4", "라4", "라4", "솔4"]
박자 = [0.4, 0.4, 0.4, 0.4, 0.4, 0.4, 0.8]

for n, t in zip(멜로디, 박자):
    음표(n, t)
`,
      },
      {
        id: 'beg-melody-4',
        title: { ko: '박자와 쉼표', en: 'Rhythm & Rest' },
        summary: 'sleep을 끼워 쉼표를 표현하고, for로 리듬 패턴을 반복한다.',
        code: `from vpython import *

# 8마디 단순 리듬: 도-도-솔, 쉬고 반복
패턴 = ["도4", "도4", "솔4"]

for 반복 in range(4):
    for n in 패턴:
        음표(n, 0.3)
    sleep(0.25)  # 마디 끝 쉼표
`,
      },
      {
        id: 'beg-melody-5',
        title: { ko: '소리에 그림 입히기', en: 'Sound + Visual' },
        summary: '음을 낼 때마다 화면에 막대를 쌓아 시각화한다.',
        code: `from vpython import *

scene_background(색상['검정'])

곡 = ["도4", "레4", "미4", "파4", "솔4", "라4", "시4", "도5"]

for i, n in enumerate(곡):
    높이 = 0.3 + i * 0.25
    box(pos=vector(i - 3.5, 높이 / 2, 0),
        size=vector(0.6, 높이, 0.6),
        color=무지개[i % 7])
    음표(n, 0.45)
`,
      },
    ],
  },

  // ════════════════════════════════════════════════════════
  // [융합 1] 수학 × 코딩 — 함수의 모양을 직접 만져보기
  // ════════════════════════════════════════════════════════
  {
    id: 'fus-math-functions',
    track: 'fusion',
    level: 2,
    title: { ko: '함수의 모양 (수학×코딩)', en: 'Functions Visualized' },
    subject: '수학',
    description:
      '함수의 매개변수가 그래프 모양에 어떻게 영향을 주는지 슬라이더로 직접 만져 본다. 6차시.',
    targetGrade: '고1 수학',
    sessions: 6,
    icon: '📈',
    color: 'indigo',
    starlightTheme: 'indigo',
    lessons: [
      {
        id: 'fus-math-1',
        title: { ko: '직선 그리기', en: 'Drawing a Line' },
        summary: 'gcurve.plot으로 y = 2x + 1을 그린다.',
        code: `from vpython import *

g = graph(title='y = 2x + 1', xtitle='x', ytitle='y', width=600, height=400)
선 = gcurve(color=color.blue)

for i in range(-50, 51):
    x = i * 0.1
    y = 2 * x + 1
    선.plot(x, y)
`,
      },
      {
        id: 'fus-math-2',
        title: { ko: '기울기 슬라이더', en: 'Slope Slider' },
        summary: 'slider로 a 값을 바꾸면 그래프가 실시간으로 변한다.',
        code: `from vpython import *

g = graph(title='y = a x + b', xtitle='x', ytitle='y',
          width=600, height=380, xmin=-5, xmax=5, ymin=-15, ymax=15)
선 = gcurve(color=color.red)

a = 1.0
b = 0.0

def 다시그리기():
    선.clear()
    for i in range(-50, 51):
        x = i * 0.1
        선.plot(x, a * x + b)

def on_a(s):
    global a
    a = s.value
    다시그리기()

def on_b(s):
    global b
    b = s.value
    다시그리기()

slider(text='기울기 a', min=-3, max=3, value=1.0, bind=on_a)
slider(text='절편 b', min=-3, max=3, value=0.0, bind=on_b)
다시그리기()
`,
      },
      {
        id: 'fus-math-3',
        title: { ko: '이차함수와 꼭짓점', en: 'Quadratic & Vertex' },
        summary: 'y = a(x-h)² + k의 a, h, k가 만드는 변화를 본다.',
        code: `from vpython import *

g = graph(title='y = a(x - h)^2 + k', xtitle='x', ytitle='y',
          width=600, height=400, xmin=-5, xmax=5, ymin=-5, ymax=20)
포물선 = gcurve(color=color.orange)
꼭짓점 = gdots(color=color.red)

a, h, k = 1.0, 0.0, 0.0

def 다시():
    포물선.clear()
    꼭짓점.clear()
    for i in range(-50, 51):
        x = i * 0.1
        포물선.plot(x, a * (x - h) ** 2 + k)
    꼭짓점.plot(h, k)

def fa(s):
    global a; a = s.value; 다시()
def fh(s):
    global h; h = s.value; 다시()
def fk(s):
    global k; k = s.value; 다시()

slider(text='폭 a', min=-2, max=2, value=1.0, bind=fa)
slider(text='좌우 h', min=-3, max=3, value=0.0, bind=fh)
slider(text='상하 k', min=-3, max=3, value=0.0, bind=fk)
다시()
`,
      },
      {
        id: 'fus-math-4',
        title: { ko: '사인 파동', en: 'Sine Wave' },
        summary: 'sin 함수로 진동을 그리고, 주기 2π를 눈으로 본다.',
        code: `from vpython import *
import math

g = graph(title='y = sin(x)', xtitle='x (rad)', ytitle='y', width=600, height=380)
파 = gcurve(color=color.cyan)

for i in range(0, 700):
    x = i * 0.01
    파.plot(x, math.sin(x))
`,
      },
      {
        id: 'fus-math-5',
        title: { ko: '진폭·주기·위상', en: 'A · ω · φ' },
        summary: 'y = A sin(ωx + φ) — 세 변수를 슬라이더로 분해한다.',
        code: `from vpython import *
import math

g = graph(title='y = A sin(w x + p)', xtitle='x', ytitle='y',
          width=600, height=380, xmin=0, xmax=7, ymin=-3.2, ymax=3.2)
파 = gcurve(color=color.magenta)

A, w, p = 1.0, 1.0, 0.0

def 다시():
    파.clear()
    for i in range(0, 700):
        x = i * 0.01
        파.plot(x, A * math.sin(w * x + p))

def fA(s):
    global A; A = s.value; 다시()
def fw(s):
    global w; w = s.value; 다시()
def fp(s):
    global p; p = s.value; 다시()

slider(text='진폭 A', min=0.1, max=3, value=1.0, bind=fA)
slider(text='각속도 w', min=0.1, max=5, value=1.0, bind=fw)
slider(text='위상 p', min=-3.14, max=3.14, value=0.0, bind=fp)
다시()
`,
      },
      {
        id: 'fus-math-6',
        title: { ko: '3D로 확장: 헬릭스', en: '3D Helix' },
        summary: '매개변수 곡선 (cos t, t, sin t)로 3D 나선을 그린다.',
        code: `from vpython import *
import math

scene_background(색상['검정'])

선 = curve(color=color.yellow, radius=0.04)
for i in range(0, 600):
    t = i * 0.05
    x = 2 * math.cos(t)
    y = t * 0.3 - 4
    z = 2 * math.sin(t)
    선.append(vector(x, y, z))
`,
      },
    ],
  },

  // ════════════════════════════════════════════════════════
  // [융합 2] 과학 × 코딩 — 뉴턴 실험실
  // ════════════════════════════════════════════════════════
  {
    id: 'fus-sci-newton',
    track: 'fusion',
    level: 2,
    title: { ko: '뉴턴 실험실 (과학×코딩)', en: 'Newton Lab' },
    subject: '통합과학·물리',
    description:
      '등속·낙하·포물선·진자·궤도를 시뮬레이션으로 직접 재현하며 운동법칙을 익힌다. 7차시.',
    targetGrade: '고1 통합과학',
    sessions: 7,
    icon: '🪐',
    color: 'rose',
    starlightTheme: 'rose',
    lessons: [
      {
        id: 'fus-sci-1',
        title: { ko: '시간을 잘게 — 등속운동', en: 'Discrete Time: Uniform Motion' },
        summary: 'rate(60)으로 시간을 60등분해 등속 운동을 만든다.',
        code: `from vpython import *

scene_background(색상['검정'])
scene.range = 6

공 = sphere(pos=vector(-5, 0, 0), radius=0.3, color=색상['하늘'], make_trail=True)
v = vector(2, 0, 0)
dt = 0.02

t = 0
while t < 5:
    rate(60)
    공.pos = 공.pos + v * dt
    t = t + dt
`,
      },
      {
        id: 'fus-sci-2',
        title: { ko: '자유낙하', en: 'Free Fall' },
        summary: '중력가속도 g = 9.8을 적용해 속도가 점점 빨라진다.',
        code: `from vpython import *

scene_background(색상['검정'])
바닥 = box(pos=vector(0, -5, 0), size=vector(10, 0.2, 4), color=색상['갈색'])

공 = sphere(pos=vector(0, 4, 0), radius=0.3, color=색상['빨강'], make_trail=True)
v = vector(0, 0, 0)
g = vector(0, -9.8, 0)
dt = 0.02

while 공.pos.y > -4.5:
    rate(60)
    v = v + g * dt
    공.pos = 공.pos + v * dt
`,
      },
      {
        id: 'fus-sci-3',
        title: { ko: '포물선 운동', en: 'Projectile Motion' },
        summary: '초속 + 각도 조합으로 포물선 궤적을 그린다.',
        code: `from vpython import *
import math

scene_background(색상['검정'])
바닥 = box(pos=vector(0, -3, 0), size=vector(20, 0.2, 4), color=색상['갈색'])

각도 = 60          # 도
초속 = 9.0
rad = math.radians(각도)

공 = sphere(pos=vector(-8, -2.8, 0), radius=0.25, color=색상['주황'], make_trail=True)
v = vector(초속 * math.cos(rad), 초속 * math.sin(rad), 0)
g = vector(0, -9.8, 0)
dt = 0.02

while 공.pos.y > -2.9 or v.y > 0:
    rate(60)
    v = v + g * dt
    공.pos = 공.pos + v * dt
`,
      },
      {
        id: 'fus-sci-4',
        title: { ko: '탄성 충돌', en: 'Elastic Collision' },
        summary: '벽에 부딪히면 속도 부호가 바뀐다.',
        code: `from vpython import *

scene_background(색상['검정'])
왼벽 = box(pos=vector(-6, 0, 0), size=vector(0.2, 4, 4), color=색상['회색'])
오벽 = box(pos=vector(6, 0, 0), size=vector(0.2, 4, 4), color=색상['회색'])

공 = sphere(pos=vector(0, 0, 0), radius=0.4, color=색상['하늘'], make_trail=True)
v = vector(3.0, 0, 0)
dt = 0.02

t = 0
while t < 8:
    rate(60)
    공.pos = 공.pos + v * dt
    if 공.pos.x > 5.6 or 공.pos.x < -5.6:
        v = vector(-v.x, v.y, v.z)
    t = t + dt
`,
      },
      {
        id: 'fus-sci-5',
        title: { ko: '단진자', en: 'Pendulum' },
        summary: '각도 식 d²θ/dt² = -(g/L)·sin θ로 진자를 흔든다.',
        code: `from vpython import *
import math

scene_background(색상['검정'])

축 = sphere(pos=vector(0, 3, 0), radius=0.1, color=색상['회색'])
공 = sphere(pos=vector(2, 1, 0), radius=0.3, color=색상['노랑'], make_trail=True)
줄 = curve(color=색상['흰색'])

L = 2.0
g = 9.8
세타 = math.radians(45)
오메가 = 0.0
dt = 0.02

t = 0
while t < 12:
    rate(60)
    알파 = -(g / L) * math.sin(세타)
    오메가 = 오메가 + 알파 * dt
    세타 = 세타 + 오메가 * dt
    공.pos = vector(L * math.sin(세타), 3 - L * math.cos(세타), 0)
    줄.clear()
    줄.append(vector(0, 3, 0))
    줄.append(공.pos)
    t = t + dt
`,
      },
      {
        id: 'fus-sci-6',
        title: { ko: '행성 궤도', en: 'Orbit' },
        summary: '뉴턴 만유인력 F = GMm/r²로 행성을 돌린다.',
        code: `from vpython import *

scene_background(색상['검정'])
scene.range = 5
태양 = sphere(pos=vector(0, 0, 0), radius=0.5, color=색상['노랑'], emissive=True)

행성 = sphere(pos=vector(4, 0, 0), radius=0.18, color=색상['하늘'], make_trail=True)
v = vector(0, 0, 1.6)

GM = 12.0
dt = 0.01

t = 0
while t < 20:
    rate(80)
    r = 행성.pos
    거리 = mag(r)
    가속도 = -(GM / 거리 ** 3) * r
    v = v + 가속도 * dt
    행성.pos = 행성.pos + v * dt
    t = t + dt
`,
      },
      {
        id: 'fus-sci-7',
        title: { ko: 'v-t 그래프', en: 'Velocity-Time Plot' },
        summary: '낙하 운동의 v-t 그래프를 자동 생성한다.',
        code: `from vpython import *

g_chart = graph(title='v-t (free fall)', xtitle='t (s)', ytitle='v (m/s)',
                width=600, height=380)
선 = gcurve(color=color.red)

g = 9.8
v = 0.0
dt = 0.05
t = 0.0
while t < 3.0:
    v = v + (-g) * dt
    선.plot(t, v)
    t = t + dt
`,
      },
    ],
  },

  // ════════════════════════════════════════════════════════
  // [융합 3] 미술 × 코딩 — 알고리즘이 그리는 디지털 아트
  // ════════════════════════════════════════════════════════
  {
    id: 'fus-art-generative',
    track: 'fusion',
    level: 2,
    title: { ko: '디지털 아트 (미술×코딩)', en: 'Generative Digital Art' },
    subject: '미술·STEAM',
    description:
      '색채·반복·무작위·음악반응을 결합한 절차적 생성 미술 6차시.',
    targetGrade: '중3~고2',
    sessions: 6,
    icon: '🎨',
    color: 'teal',
    starlightTheme: 'teal',
    lessons: [
      {
        id: 'fus-art-1',
        title: { ko: '색의 좌표 — 무지개', en: 'Color Coordinates' },
        summary: '무지개[]와 파스텔[]로 색의 흐름을 본다.',
        code: `from vpython import *

scene_background(색상['검정'])

# 무지개 7색 줄
for i in range(7):
    sphere(pos=vector(i - 3, 1, 0), radius=0.4, color=무지개[i])

# 파스텔 색 줄
for i, c in enumerate(파스텔):
    sphere(pos=vector(i - len(파스텔)/2, -1, 0), radius=0.4, color=c)
`,
      },
      {
        id: 'fus-art-2',
        title: { ko: '점·선·면', en: 'Dot · Line · Surface' },
        summary: 'points·curve·triangle로 가장 단순한 그래픽을 만든다.',
        code: `from vpython import *
import math

scene_background(색상['남색'])

# 원형 점 100개
점들 = points(color=색상['흰색'], radius=4)
for i in range(100):
    각 = i * 2 * math.pi / 100
    점들.append(pos=vector(2 * math.cos(각), 2 * math.sin(각), 0))

# 별 모양 선
별 = curve(color=색상['노랑'], radius=0.03)
for i in range(11):
    각 = i * 4 * math.pi / 5
    r = 1.0 if i % 2 == 0 else 0.4
    별.append(vector(r * math.cos(각) - 4, r * math.sin(각), 0))
`,
      },
      {
        id: 'fus-art-3',
        title: { ko: '절차적 패턴', en: 'Procedural Pattern' },
        summary: '같은 알고리즘이 i 값에 따라 다른 형태를 만든다.',
        code: `from vpython import *
import math

scene_background(색상['검정'])

# 황금각으로 해바라기 씨 배치
황금각 = math.radians(137.5)
for i in range(200):
    r = 0.15 * math.sqrt(i)
    각 = i * 황금각
    x = r * math.cos(각)
    y = r * math.sin(각)
    sphere(pos=vector(x, y, 0), radius=0.07, color=무지개[i % 7])
`,
      },
      {
        id: 'fus-art-4',
        title: { ko: '파티클 — 별·눈·불꽃', en: 'Particles' },
        summary: '무작위 위치·색의 작은 객체 다수로 분위기를 만든다.',
        code: `from vpython import *
import random

scene_background(vector(0.02, 0.02, 0.08))

# 별빛 200개
for i in range(200):
    x = random.uniform(-8, 8)
    y = random.uniform(-5, 5)
    z = random.uniform(-3, 3)
    크기 = random.uniform(0.02, 0.08)
    sphere(pos=vector(x, y, z), radius=크기,
           color=색상['흰색'], emissive=True)

# 색 안개 — 따뜻한 색 50개
for i in range(50):
    sphere(pos=vector(random.uniform(-5, 5),
                       random.uniform(-3, 3),
                       random.uniform(-2, 2)),
           radius=0.5,
           color=random.choice(따뜻한색),
           opacity=0.15)
`,
      },
      {
        id: 'fus-art-5',
        title: { ko: '무작위와 규칙의 균형', en: 'Random Meets Rule' },
        summary: '격자(규칙) 위에 색만 무작위로 — 두 힘의 조화.',
        code: `from vpython import *
import random

scene_background(색상['검정'])

for x in range(10):
    for y in range(10):
        높이 = random.uniform(0.2, 1.5)
        box(pos=vector(x - 4.5, 높이 / 2, y - 4.5),
            size=vector(0.8, 높이, 0.8),
            color=random.choice(파스텔))
`,
      },
      {
        id: 'fus-art-6',
        title: { ko: '음악 반응형 비주얼', en: 'Music-Reactive Visual' },
        summary: '음을 낼 때마다 막대 색·높이가 변한다.',
        code: `from vpython import *

scene_background(색상['검정'])

곡 = ["도4", "미4", "솔4", "도5", "솔4", "미4", "도4"]
막대들 = []
for i in range(len(곡)):
    b = box(pos=vector(i - 3, 0.5, 0), size=vector(0.6, 1, 0.6),
            color=색상['회색'])
    막대들.append(b)

for i, n in enumerate(곡):
    # 해당 막대를 키우고 색 입히기
    막대들[i].size = vector(0.6, 2.5, 0.6)
    막대들[i].pos = vector(i - 3, 1.25, 0)
    막대들[i].color = 무지개[i % 7]
    음표(n, 0.5)
    막대들[i].size = vector(0.6, 1, 0.6)
    막대들[i].pos = vector(i - 3, 0.5, 0)
`,
      },
    ],
  },

  // ════════════════════════════════════════════════════════
  // [튜토리얼] VPyLab 베이스라인 툴킷 — 내 프로젝트의 시작 코드 모음
  // ════════════════════════════════════════════════════════
  {
    id: 'pro-toolkit',
    track: 'tutorial',
    level: 3,
    title: { ko: 'VPyLab 베이스라인 툴킷', en: 'VPyLab Baseline Toolkit' },
    subject: '프로젝트 베이스라인',
    description:
      'VPyLab의 12개 영역(3D 객체·벡터·색·변환·곡선·라벨·2D그래프·3D차트·사운드·입력·UI·흐름)을 짧은 베이스라인 코드 11개로 한 바퀴 돈다. 자기 프로젝트 시작 시 복붙해 쓰는 시드 모음.',
    targetGrade: '고2~고3 / 동아리·개인 프로젝트',
    sessions: 11,
    icon: '🧰',
    color: 'slate',
    starlightTheme: 'slate',
    lessons: [
      {
        id: 'pro-toolkit-1',
        title: { ko: '빈 캔버스와 rate 루프', en: 'Empty Canvas + rate Loop' },
        summary: '모든 프로젝트의 첫 골격 — 배경·시야·시간 루프.',
        code: `from vpython import *

scene_background(색상['검정'])    # ★ 배경 색
scene.title = '내 프로젝트'        # ★ 제목
scene.range = 6                    # ★ 시야 거리

t = 0
while t < 5:                       # ★ 종료 시간(초)
    rate(60)
    t = t + 0.02
`,
      },
      {
        id: 'pro-toolkit-2',
        title: { ko: '첫 3D 객체 3종', en: 'First 3D Objects' },
        summary: 'sphere/box/cylinder를 한 줄씩 세 개.',
        code: `from vpython import *

scene_background(색상['검정'])

sphere(pos=vector(-2, 0, 0), radius=0.7, color=색상['하늘'])           # ★ 위치, 크기, 색
box(pos=vector(0, 0, 0), size=vector(1.2, 1.2, 1.2), color=색상['주황'])
cylinder(pos=vector(2, -0.6, 0), axis=vector(0, 1.2, 0),
         radius=0.4, color=색상['연두'])
`,
      },
      {
        id: 'pro-toolkit-3',
        title: { ko: '색과 조명', en: 'Color & Light' },
        summary: '배경 + local_light + distant_light로 분위기 조성.',
        code: `from vpython import *

scene_background(vector(0.02, 0.02, 0.08))            # ★ 어두운 배경
local_light(pos=vector(2, 3, 2), color=색상['노랑'])   # ★ 광원 위치·색
distant_light(direction=vector(-1, -1, -1), color=색상['파랑'])

sphere(pos=vector(-1, 0, 0), radius=0.6, color=색상['빨강'], emissive=True)
sphere(pos=vector(1, 0, 0), radius=0.6, color=색상['초록'])
`,
      },
      {
        id: 'pro-toolkit-4',
        title: { ko: '벡터로 위치 계산', en: 'Vectors Drive Motion' },
        summary: 'pos·velocity·gravity 벡터 합으로 운동 시뮬.',
        code: `from vpython import *

scene_background(색상['검정'])
scene.range = 5
공 = sphere(pos=vector(-3, 3, 0), radius=0.3,
            color=색상['주황'], make_trail=True)

속도 = vector(2, 3, 0)              # ★ 초기 속도
중력 = vector(0, -9.8, 0)
dt = 0.02

t = 0
while t < 1.5:                       # ★ 시뮬 시간
    rate(60)
    속도 = 속도 + 중력 * dt
    공.pos = 공.pos + 속도 * dt
    t = t + dt
`,
      },
      {
        id: 'pro-toolkit-5',
        title: { ko: '회전과 궤적', en: 'Rotate & Trail' },
        summary: '.rotate(origin=...) + make_trail로 공전 궤적.',
        code: `from vpython import *

scene_background(색상['검정'])
scene.range = 4
sphere(pos=vector(0, 0, 0), radius=0.3, color=색상['노랑'], emissive=True)
행성 = sphere(pos=vector(3, 0, 0), radius=0.2,
              color=색상['하늘'], make_trail=True)

t = 0
while t < 8:
    rate(60)
    행성.rotate(angle=0.03,                      # ★ 공전 속도
                axis=vector(0, 1, 0),             # ★ 공전 축
                origin=vector(0, 0, 0))
    t = t + 0.02
`,
      },
      {
        id: 'pro-toolkit-6',
        title: { ko: '곡선과 점', en: 'Curve & Points' },
        summary: 'curve.append/points.append로 함수·자취 누적.',
        code: `from vpython import *
import math

scene_background(색상['검정'])

선 = curve(color=색상['노랑'], radius=0.04)
점들 = points(color=색상['분홍'], radius=5)

for i in range(0, 400):
    t = i * 0.05
    y = math.sin(t) * 2              # ★ 그릴 함수
    선.append(vector(t - 10, y, 0))
    if i % 20 == 0:
        점들.append(pos=vector(t - 10, y, 0))
`,
      },
      {
        id: 'pro-toolkit-7',
        title: { ko: '라벨과 compound', en: 'Label & Compound' },
        summary: 'compound로 부품 묶기 + label로 설명 붙이기.',
        code: `from vpython import *

scene_background(색상['검정'])

몸 = box(pos=vector(0, 0, 0), size=vector(2, 0.5, 1), color=색상['빨강'])
지붕 = pyramid(pos=vector(0, 0.6, 0),
               size=vector(2.2, 1, 1.2),
               axis=vector(0, 1, 0), color=색상['갈색'])

집 = compound([몸, 지붕])             # ★ 묶을 부품 목록

label(pos=vector(0, 2, 0), text='내 집', height=20, color=색상['흰색'])
`,
      },
      {
        id: 'pro-toolkit-8',
        title: { ko: '2D 그래프 (gcurve)', en: '2D Plot' },
        summary: 'graph + gcurve.plot으로 시뮬 결과 가시화.',
        code: `from vpython import *
import math

g = graph(title='베이스라인: y = sin(x)',
          xtitle='x', ytitle='y',
          width=600, height=380)
선 = gcurve(color=color.cyan)

t = 0
while t < 6.28:                      # ★ x축 범위
    선.plot(t, math.sin(t))          # ★ 그릴 함수
    t = t + 0.05
`,
      },
      {
        id: 'pro-toolkit-9',
        title: { ko: '3D 차트로 데이터 시각화', en: '3D Charts' },
        summary: 'scatter3d로 리스트를 즉시 3D 시각화.',
        code: `from vpython import *
import random

scene_background(색상['검정'])

x = [random.uniform(-3, 3) for i in range(50)]
y = [random.uniform(-3, 3) for i in range(50)]   # ★ 데이터 소스
z = [random.uniform(-3, 3) for i in range(50)]

scatter3d(x, y, z, color=색상['하늘'])
`,
      },
      {
        id: 'pro-toolkit-10',
        title: { ko: '사운드 한 줄로', en: 'Sound in One Line' },
        summary: '음표·화음·효과음 — 3가지 호출 형식.',
        code: `from vpython import *

음표("도4", 0.3)                     # ★ 음 이름, 길이

화음(["도4", "미4", "솔4"], 0.8)     # ★ 화음 구성

효과음('coin')                        # ★ 효과음 이름

for n in ["도4", "미4", "솔4", "도5"]:
    음표(n, 0.25)
`,
      },
      {
        id: 'pro-toolkit-11',
        title: { ko: '입력과 UI 위젯', en: 'Input & Widgets' },
        summary: 'slider + scene.bind 키보드 — 인터랙션 베이스라인.',
        code: `from vpython import *

scene_background(색상['검정'])
공 = sphere(pos=vector(0, 0, 0), radius=0.4, color=색상['하늘'])

def 크기바꾸기(s):
    공.radius = s.value              # ★ 어떤 속성을 바꿀지

slider(text='크기', min=0.1, max=2.0, value=0.4, bind=크기바꾸기)

def 키눌림(evt):
    이동 = 0.2                       # ★ 이동량
    if evt.key == 'left':
        공.pos = 공.pos + vector(-이동, 0, 0)
    elif evt.key == 'right':
        공.pos = 공.pos + vector(이동, 0, 0)
    elif evt.key == 'up':
        공.pos = 공.pos + vector(0, 이동, 0)
    elif evt.key == 'down':
        공.pos = 공.pos + vector(0, -이동, 0)

scene.bind('keydown', 키눌림)
`,
      },
    ],
  },
];

// ── 헬퍼 ──────────────────────────────────────────────
export function getCoursesByTrack(track) {
  return courses.filter((c) => c.track === track);
}

export function getCourseById(id) {
  return courses.find((c) => c.id === id);
}

export function getLesson(courseId, lessonId) {
  const c = getCourseById(courseId);
  if (!c) return null;
  return c.lessons.find((l) => l.id === lessonId) || null;
}

export const COURSE_TRACKS = {
  beginner: { ko: '입문 트랙', en: 'Beginner', color: 'sky' },
  fusion: { ko: '융합 트랙', en: 'Fusion', color: 'violet' },
};

export default courses;
export { courses };
