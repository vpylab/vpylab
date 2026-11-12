/**
 * VPyLab 대표 예제 20선
 * 코드는 쉽지만 아이디어가 뛰어난 영감을 주는 예제들
 */
import { eclipseViewsCode } from './eclipse-views.js';

const EXAMPLES = [
  // ═══════════════════════════════════════
  // 🌌 우주/자연 (6개)
  // ═══════════════════════════════════════
  {
    id: 'solar-system',
    title: '태양계',
    thumbnail: '🪐',
    category: 'space',
    level: 2,
    description: '태양 주위를 도는 8개 행성. 크기와 속도가 모두 다릅니다.',
    tags: ['animation', 'trail', 'trigonometry'],
    code: `from vpython import *
import math

# 태양
sun = sphere(pos=vector(0,0,0), radius=0.8, color=color.yellow)
local_light(pos=vector(0,0,0), color=color.yellow, intensity=2)
scene_background(vector(0.02, 0.02, 0.05))
scene.range = 10   # 가장 먼 행성의 궤도까지 보이는 범위

# 행성 데이터: [이름, 거리, 크기, 색, 속도]
planets_data = [
    [1.5, 0.1, color.gray, 4.0],    # 수성
    [2.2, 0.15, color.orange, 3.0],  # 금성
    [3.0, 0.16, color.cyan, 2.5],    # 지구
    [3.8, 0.12, color.red, 2.0],     # 화성
    [5.2, 0.4, color.orange, 1.2],   # 목성
    [6.5, 0.35, color.gold, 0.9],    # 토성
    [7.8, 0.25, color.skyblue, 0.6], # 천왕성
    [9.0, 0.24, color.blue, 0.4],    # 해왕성
]

planets = []
for dist, size, col, speed in planets_data:
    p = sphere(radius=size, color=col, make_trail=True, trail_color=col)
    p.dist = dist
    p.speed = speed
    p.angle = 0
    planets.append(p)

# 궤도 애니메이션
t = 0
while True:
    rate(60)
    t += 0.02
    for p in planets:
        p.angle += p.speed * 0.02
        p.pos = vector(p.dist * math.cos(p.angle), 0, p.dist * math.sin(p.angle))
`
  },
  {
    id: 'shooting-stars',
    title: '별똥별',
    thumbnail: '🌠',
    category: 'space',
    level: 1,
    description: '밤하늘에서 떨어지는 유성우. 떨어질 때마다 효과음이 납니다.',
    tags: ['random', 'trail', 'sfx'],
    code: `from vpython import *
import random

scene_background(vector(0.02, 0.02, 0.08))

# 배경 별 만들기
for i in range(100):
    x = random.uniform(-10, 10)
    y = random.uniform(-5, 8)
    z = random.uniform(-5, 5)
    sphere(pos=vector(x, y, z), radius=0.03, color=color.white)

# 별똥별 떨어뜨리기
while True:
    rate(30)

    # 가끔 별똥별 생성
    if random.random() < 0.15:
        x = random.uniform(-8, 8)
        star = sphere(
            pos=vector(x, 7, 0),
            radius=0.08,
            color=color.yellow,
            make_trail=True,
            trail_color=color.orange
        )
        play_sfx('laser')

        # 떨어지는 애니메이션
        for i in range(40):
            rate(60)
            star.pos.y -= 0.3
            star.pos.x += 0.15
            star.radius *= 0.97
            if star.pos.y < -5:
                break
        star.visible = False
`
  },
  {
    id: 'dna-helix',
    title: 'DNA 이중나선',
    thumbnail: '🧬',
    category: 'space',
    level: 2,
    description: '생명의 설계도, DNA의 아름다운 이중나선 구조를 3D로 표현합니다.',
    tags: ['biology', 'trigonometry', 'structure'],
    code: `from vpython import *
import math

scene_background(vector(0.05, 0.05, 0.1))

# DNA 이중나선 생성
colors1 = [color.cyan, color.blue, color.skyblue]
colors2 = [color.red, color.orange, color.pink]
radius = 1.5
step = 0.15
turns = 4

for i in range(int(turns * 40)):
    angle = i * 0.15
    y = i * step - (turns * 40 * step / 2)

    # 가닥 1
    x1 = radius * math.cos(angle)
    z1 = radius * math.sin(angle)
    sphere(pos=vector(x1, y, z1), radius=0.12, color=colors1[i % 3])

    # 가닥 2 (반대편)
    x2 = radius * math.cos(angle + math.pi)
    z2 = radius * math.sin(angle + math.pi)
    sphere(pos=vector(x2, y, z2), radius=0.12, color=colors2[i % 3])

    # 염기쌍 연결 (5개마다)
    if i % 5 == 0:
        cylinder(
            pos=vector(x1, y, z1),
            axis=vector(x2 - x1, 0, z2 - z1),
            radius=0.04,
            color=color.white,
            opacity=0.5
        )

print("DNA 이중나선 완성!")
`
  },
  {
    id: 'galaxy',
    title: '은하수',
    thumbnail: '🌀',
    category: 'space',
    level: 2,
    description: '나선 팔을 가진 은하가 천천히 회전합니다.',
    tags: ['animation', 'trigonometry', 'particles'],
    code: `from vpython import *
import math, random

scene_background(vector(0.01, 0.01, 0.03))

# 은하 중심
sphere(pos=vector(0,0,0), radius=0.5, color=color.yellow)
local_light(pos=vector(0,0,0), color=color.yellow, intensity=1.5)

# 나선 팔 위에 별 배치
stars = []
for arm in range(3):  # 3개 나선 팔
    offset = arm * 2.094  # 120도 간격
    for i in range(80):
        r = 0.5 + i * 0.08
        angle = offset + i * 0.15 + random.uniform(-0.2, 0.2)
        x = r * math.cos(angle)
        z = r * math.sin(angle)
        y = random.uniform(-0.1, 0.1)

        brightness = max(0.3, 1.0 - r / 8)
        size = random.uniform(0.02, 0.06)
        col = random.choice([color.white, color.skyblue, color.yellow, color.orange])

        s = sphere(pos=vector(x, y, z), radius=size, color=col, opacity=brightness)
        s.angle = math.atan2(z, x)
        s.dist = r
        stars.append(s)

# 은하 회전
while True:
    rate(30)
    for s in stars:
        s.angle += 0.003 / max(s.dist, 0.5)
        s.pos = vector(
            s.dist * math.cos(s.angle),
            s.pos.y,
            s.dist * math.sin(s.angle)
        )
`
  },
  {
    id: 'rain',
    title: '비 내리는 날',
    thumbnail: '🌧️',
    category: 'space',
    level: 1,
    description: '빗방울이 떨어지며 바닥에 부딪히면 소리가 납니다.',
    tags: ['animation', 'sound', 'random'],
    code: `from vpython import *
import random

scene_background(vector(0.15, 0.15, 0.2))

# 바닥
box(pos=vector(0, -3, 0), size=vector(12, 0.1, 8), color=color.gray, opacity=0.3)

# 빗방울 만들기
drops = []
for i in range(30):
    x = random.uniform(-5, 5)
    y = random.uniform(0, 8)
    z = random.uniform(-3, 3)
    d = cylinder(
        pos=vector(x, y, z),
        axis=vector(0, -0.3, 0),
        radius=0.02,
        color=color.skyblue,
        opacity=0.6
    )
    d.speed = random.uniform(0.15, 0.3)
    drops.append(d)

# 비 내리기
while True:
    rate(60)
    for d in drops:
        d.pos = vector(d.pos.x, d.pos.y - d.speed, d.pos.z)

        # 바닥에 닿으면 위로 리셋 + 소리
        if d.pos.y < -3:
            if random.random() < 0.3:
                freq = random.uniform(800, 2000)
                play_sound(freq, 0.05, 'sine', 0.1)
            d.pos = vector(random.uniform(-5, 5), 8, d.pos.z)
            d.speed = random.uniform(0.15, 0.3)
`
  },

  {
    id: 'eclipse-views',
    title: '일식과 월식: 시점 바꾸기',
    thumbnail: '🌘',
    category: 'space',
    level: 3,
    description: '우주, 서울, 달 표면으로 시점을 바꾸며 일식과 월식을 관찰합니다. 크기와 거리는 한 화면에 보이도록 바꾼 모형입니다.',
    tags: ['camera', 'animation', 'widget'],
    code: eclipseViewsCode,
  },

  // ═══════════════════════════════════════
  // 🎵 사운드/음악 (5개)
  // ═══════════════════════════════════════
  {
    id: 'music-box',
    title: '3D 오르골',
    thumbnail: '🎶',
    category: 'sound',
    level: 2,
    description: '회전하는 실린더의 돌기가 음판을 때려 멜로디가 흘러나옵니다.',
    tags: ['instrument', 'animation', 'creative'],
    code: `from vpython import *
import math

scene_background(vector(0.05, 0.03, 0.02))

# 음판 (도레미파솔라시)
notes = ['도', '레', '미', '파', '솔', '라', '시']
colors = [color.red, color.orange, color.yellow, color.green, color.blue, color.navy, color.purple]
plates = []
for i, (n, c) in enumerate(zip(notes, colors)):
    b = box(pos=vector(-3 + i, 0, 0), size=vector(0.8, 0.1, 1), color=c)
    b.note = n
    b.base_y = 0
    plates.append(b)

# 오르골 실린더
drum = cylinder(pos=vector(-3, 2, 0), axis=vector(6, 0, 0), radius=0.3, color=color.gold)

# 멜로디 패턴: 학교종이 땡땡땡
melody = [4, 4, 5, 5, 4, 4, 2, 4, 4, 2, 2, 0,
          4, 4, 5, 5, 4, 4, 2, 4, 2, 0, 2, 0]

idx = 0
while True:
    rate(4)
    note_idx = melody[idx % len(melody)]

    # 해당 음판 두드리기
    p = plates[note_idx]
    p.pos = vector(p.pos.x, p.base_y - 0.2, p.pos.z)
    악기('피아노', p.note, 0.4)

    # 드럼 회전
    drum.pos = vector(-3, 2 + 0.05 * math.sin(idx * 0.5), 0)

    await rate(8)
    p.pos = vector(p.pos.x, p.base_y, p.pos.z)  # 음판 복귀

    idx += 1
`
  },
  {
    id: 'rainbow-xylophone',
    title: '무지개 실로폰',
    thumbnail: '🌈',
    category: 'sound',
    level: 1,
    description: '7색 무지개 막대가 차례로 울리며 도레미를 연주합니다.',
    tags: ['instrument', 'rainbow', 'music'],
    code: `from vpython import *

scene_background(vector(0.1, 0.1, 0.15))

# 무지개 실로폰 막대
notes = ['도', '레', '미', '파', '솔', '라', '시']
bars = []
for i in range(7):
    height = 1.5 + i * 0.2
    b = box(
        pos=vector(-3 + i, 0, 0),
        size=vector(0.8, height, 0.5),
        color=무지개[i]
    )
    bars.append(b)

# 채 (말렛)
mallet = sphere(pos=vector(-3, 2, 0), radius=0.15, color=color.white)

# 올라가며 연주
while True:
    for i in range(7):
        rate(3)
        mallet.pos = vector(-3 + i, bars[i].size.y / 2 + 0.5, 0)
        bars[i].pos.y -= 0.1
        악기('피아노', notes[i], 0.4)
        await rate(6)
        bars[i].pos.y += 0.1

    # 내려오며 연주
    for i in range(5, -1, -1):
        rate(3)
        mallet.pos = vector(-3 + i, bars[i].size.y / 2 + 0.5, 0)
        bars[i].pos.y -= 0.1
        악기('피아노', notes[i], 0.4)
        await rate(6)
        bars[i].pos.y += 0.1
`
  },
  {
    id: 'fireflies',
    title: '반딧불 합주',
    thumbnail: '✨',
    category: 'sound',
    level: 2,
    description: '빛나는 반딧불이 각자 다른 음을 내며 깜빡입니다.',
    tags: ['light', 'random', 'music'],
    code: `from vpython import *
import random, math

scene_background(vector(0.02, 0.04, 0.02))

# 반딧불 만들기
notes = ['도', '미', '솔', '라', '높은도']
note_freqs = [262, 330, 392, 440, 523]
flies = []

for i in range(12):
    x = random.uniform(-4, 4)
    y = random.uniform(-2, 3)
    z = random.uniform(-3, 3)

    col = random.choice([color.yellow, color.lime, color.green])
    s = sphere(pos=vector(x, y, z), radius=0.1, color=col)
    light = local_light(pos=vector(x, y, z), color=col, intensity=0)

    s.light = light
    s.freq = random.choice(note_freqs)
    s.phase = random.uniform(0, 6.28)
    s.speed = random.uniform(0.02, 0.05)
    s.base_pos = vector(x, y, z)
    flies.append(s)

# 반딧불 깜빡이며 소리내기
t = 0
while True:
    rate(30)
    t += 0.05

    for f in flies:
        # 둥둥 떠다니기
        f.pos = f.base_pos + vector(
            0.3 * math.sin(t * 0.5 + f.phase),
            0.2 * math.sin(t * 0.7 + f.phase),
            0.2 * math.cos(t * 0.3 + f.phase)
        )
        f.light.pos = f.pos

        # 깜빡이기
        glow = max(0, math.sin(t * 1.5 + f.phase))
        f.light.intensity = glow * 2
        f.opacity = 0.3 + glow * 0.7

        # 밝아지는 순간 소리
        if abs(math.sin(t * 1.5 + f.phase) - 1.0) < 0.05:
            if random.random() < 0.3:
                play_sound(f.freq, 0.2, 'sine', 0.15)
`
  },
  {
    id: 'rhythm-viz',
    title: '리듬 시각화',
    thumbnail: '🥁',
    category: 'sound',
    level: 1,
    description: '구들이 리듬에 맞춰 튀어오르며 비트를 만듭니다.',
    tags: ['animation', 'beat', 'sync'],
    code: `from vpython import *
import math

scene_background(vector(0.08, 0.05, 0.12))

# 비트 구 5개
colors = [color.red, color.orange, color.yellow, color.cyan, color.magenta]
freqs = [200, 300, 400, 500, 600]
balls = []

for i in range(5):
    s = sphere(pos=vector(-4 + i * 2, -1, 0), radius=0.4, color=colors[i])
    s.base_y = -1
    s.freq = freqs[i]
    balls.append(s)

# 바닥
box(pos=vector(0, -2, 0), size=vector(12, 0.2, 3), color=color.gray, opacity=0.3)

# 리듬 패턴: 1=큰비트, 0.5=작은비트, 0=쉼
pattern = [
    [1, 0, 0.5, 0, 1, 0, 0.5, 0],  # 킥
    [0, 0, 1, 0, 0, 0, 1, 0],       # 스네어
    [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],  # 하이햇
    [0, 0, 0, 1, 0, 0, 0, 0],       # 탐
    [0, 0, 0, 0, 0, 0, 0, 1],       # 크래시
]

step = 0
while True:
    rate(8)
    idx = step % 8

    for i, b in enumerate(balls):
        vol = pattern[i][idx]
        if vol > 0:
            b.pos = vector(b.pos.x, b.base_y + vol * 2, b.pos.z)
            play_sound(b.freq, 0.1, 'square', vol * 0.3)

    await rate(16)
    for b in balls:
        b.pos = vector(b.pos.x, b.base_y, b.pos.z)

    step += 1
`
  },
  {
    id: 'space-bgm',
    title: '우주 유영',
    thumbnail: '🚀',
    category: 'sound',
    level: 1,
    description: '잔잔한 배경음악과 함께 별들 사이를 떠다닙니다.',
    tags: ['bgm', 'atmosphere', 'relaxing'],
    code: `from vpython import *
import random, math

scene_background(vector(0.01, 0.01, 0.03))

# 배경음악 시작
start_bgm('peaceful')

# 별 만들기
for i in range(200):
    x = random.uniform(-15, 15)
    y = random.uniform(-10, 10)
    z = random.uniform(-15, 15)
    size = random.uniform(0.02, 0.08)
    col = random.choice([color.white, color.skyblue, color.yellow])
    sphere(pos=vector(x, y, z), radius=size, color=col)

# 성운 (큰 반투명 구)
sphere(pos=vector(3, 2, -5), radius=3, color=color.purple, opacity=0.08)
sphere(pos=vector(-4, -1, -8), radius=4, color=color.cyan, opacity=0.05)
sphere(pos=vector(5, -3, -6), radius=2.5, color=color.pink, opacity=0.06)

# 우주선 (작은 화살표)
ship = arrow(pos=vector(0, 0, 5), axis=vector(0, 0, -0.5), color=color.white)
ship.attach_trail(color=color.cyan)

# 느긋하게 떠다니기
t = 0
while True:
    rate(30)
    t += 0.01
    ship.pos = vector(
        3 * math.sin(t * 0.5),
        2 * math.sin(t * 0.3),
        5 * math.cos(t * 0.2)
    )
    ship.axis = vector(
        0.3 * math.cos(t * 0.5),
        0.2 * math.cos(t * 0.3),
        -0.3 * math.sin(t * 0.2)
    )
`
  },

  // ═══════════════════════════════════════
  // 🔬 과학/수학 (4개)
  // ═══════════════════════════════════════
  {
    id: 'cannon',
    title: '포물선 대포',
    thumbnail: '💥',
    category: 'science',
    level: 2,
    description: '대포에서 발사된 공이 포물선을 그리며 날아갑니다.',
    tags: ['physics', 'trail', 'gravity'],
    code: `from vpython import *
import math

scene_background(vector(0.4, 0.6, 0.9))

# 바닥
box(pos=vector(5, -0.5, 0), size=vector(20, 1, 4), color=color.green)

# 대포
angle = 45
cannon = cylinder(
    pos=vector(-4, 0, 0),
    axis=vector(math.cos(math.radians(angle)), math.sin(math.radians(angle)), 0) * 1.5,
    radius=0.2,
    color=color.gray
)

# 발사!
play_sfx('explosion')

ball = sphere(
    pos=vector(-4, 0.5, 0),
    radius=0.2,
    color=color.red,
    make_trail=True,
    trail_color=color.orange
)

# 초기 속도
speed = 8
vx = speed * math.cos(math.radians(angle))
vy = speed * math.sin(math.radians(angle))
g = 9.8
dt = 0.02

while True:
    rate(60)
    vy -= g * dt
    ball.pos.x += vx * dt
    ball.pos.y += vy * dt

    # 바닥에 닿으면 정지
    if ball.pos.y < 0 and vy < 0:
        play_sfx('explosion')
        # 착탄 표시
        ring(pos=vector(ball.pos.x, 0.01, 0), axis=vector(0,1,0),
             radius=0.5, thickness=0.05, color=color.red)
        print(f"비거리: {ball.pos.x + 4:.1f}m")
        break
`
  },
  {
    id: 'wave-sim',
    title: '파동 시뮬레이션',
    thumbnail: '🌊',
    category: 'science',
    level: 2,
    description: '격자 위의 구들이 물결치듯 출렁이는 파동을 보여줍니다.',
    tags: ['physics', 'wave', 'grid'],
    code: `from vpython import *
import math

scene_background(vector(0.05, 0.08, 0.15))

# 격자 만들기
N = 15
dots = []
for i in range(N):
    row = []
    for j in range(N):
        x = (i - N/2) * 0.6
        z = (j - N/2) * 0.6
        s = sphere(pos=vector(x, 0, z), radius=0.12, color=color.cyan)
        row.append(s)
    dots.append(row)

# 파동 애니메이션
t = 0
while True:
    rate(30)
    t += 0.1

    for i in range(N):
        for j in range(N):
            x = (i - N/2) * 0.6
            z = (j - N/2) * 0.6
            dist = math.sqrt(x*x + z*z)

            # 원형 파동
            y = 0.8 * math.sin(dist * 1.5 - t * 3) / (1 + dist * 0.3)

            dots[i][j].pos = vector(dots[i][j].pos.x, y, dots[i][j].pos.z)

            # 높이에 따라 색 변경
            if y > 0.2:
                dots[i][j].color = color.white
            elif y > 0:
                dots[i][j].color = color.cyan
            elif y > -0.2:
                dots[i][j].color = color.blue
            else:
                dots[i][j].color = color.navy
`
  },
  {
    id: 'surface-plot',
    title: '3D 함수 그래프',
    thumbnail: '📊',
    category: 'science',
    level: 1,
    description: 'sin(x) × cos(y) 함수를 아름다운 3D 곡면으로 시각화합니다.',
    tags: ['chart', 'math', 'colormap'],
    code: `from vpython import *
import math

# sin(x) * cos(y) 함수의 값 계산
size = 20
z_data = []

for i in range(size):
    row = []
    for j in range(size):
        x = -3.14 + i * 6.28 / size
        y = -3.14 + j * 6.28 / size
        z = math.sin(x) * math.cos(y)
        row.append(z)
    z_data.append(row)

# 3D 곡면 그래프 그리기
surface3d(z_data, x_range=[-3.14, 3.14], y_range=[-3.14, 3.14], colormap='coolwarm')

print("sin(x) × cos(y) 함수")
print("빨간색 = 양수, 파란색 = 음수")
`
  },
  {
    id: 'pendulum',
    title: '진자 운동',
    thumbnail: '🕰️',
    category: 'science',
    level: 2,
    description: '줄에 매달린 공이 좌우로 흔들리며 에너지를 보존합니다.',
    tags: ['physics', 'animation', 'energy'],
    code: `from vpython import *
import math

scene_background(vector(0.1, 0.1, 0.12))

# 지지대
box(pos=vector(0, 4, 0), size=vector(3, 0.2, 0.5), color=color.gray)
cylinder(pos=vector(-1, 0, 0), axis=vector(0, 4, 0), radius=0.05, color=color.gray)
cylinder(pos=vector(1, 0, 0), axis=vector(0, 4, 0), radius=0.05, color=color.gray)

# 진자
L = 3.5  # 줄 길이
angle = math.radians(45)  # 초기 각도
omega = 0  # 각속도
g = 9.8

# 추
ball = sphere(radius=0.25, color=color.gold, make_trail=True, trail_color=color.orange)
string = cylinder(pos=vector(0, 4, 0), radius=0.02, color=color.white)

# 에너지 표시용
energy_arrow = arrow(pos=vector(-3, -1, 0), axis=vector(0, 0, 0), color=color.red)

dt = 0.01
while True:
    rate(100)

    # 진자 운동 방정식
    alpha = -g / L * math.sin(angle)
    omega += alpha * dt
    angle += omega * dt

    # 위치 업데이트
    x = L * math.sin(angle)
    y = 4 - L * math.cos(angle)
    ball.pos = vector(x, y, 0)
    string.axis = ball.pos - string.pos

    # 운동 에너지 표시 (속도에 비례)
    speed = abs(omega * L)
    energy_arrow.axis = vector(speed * 0.5, 0, 0)

    # 최저점 통과 시 소리
    if abs(angle) < 0.02 and abs(omega) > 0.5:
        play_sound(300 + speed * 50, 0.1, 'sine', 0.2)
`
  },

  // ═══════════════════════════════════════
  // 🎨 아트/창작 (4개)
  // ═══════════════════════════════════════
  {
    id: 'fireworks',
    title: '불꽃놀이',
    thumbnail: '🎆',
    category: 'art',
    level: 2,
    description: '밤하늘에 폭발하며 퍼지는 화려한 불꽃놀이입니다.',
    tags: ['particles', 'sfx', 'random'],
    code: `from vpython import *
import random, math

scene_background(vector(0.02, 0.02, 0.05))
scene.center = vector(0, 2.5, 0)   # 불꽃이 터지는 높이를 화면 가운데에 둔다
scene.range = 6

# 불꽃놀이 함수
async def firework(x, y):
    col = random.choice([color.red, color.yellow, color.cyan,
                         color.magenta, color.green, color.orange])
    play_sfx('explosion')

    particles = []
    N = 30
    for i in range(N):
        angle1 = random.uniform(0, 6.28)
        angle2 = random.uniform(-1.5, 1.5)
        speed = random.uniform(0.5, 1.5)

        vx = speed * math.cos(angle1) * math.cos(angle2)
        vy = speed * math.sin(angle2)
        vz = speed * math.sin(angle1) * math.cos(angle2)

        p = sphere(
            pos=vector(x, y, 0),
            radius=0.06,
            color=col,
            make_trail=True,
            trail_color=col
        )
        p.velocity = vector(vx, vy, vz)
        particles.append(p)

    # 퍼지는 애니메이션
    for t in range(40):
        rate(30)
        for p in particles:
            p.pos += p.velocity * 0.08
            p.velocity.y -= 0.02  # 중력
            p.opacity = max(0, 1.0 - t / 40)
            p.radius *= 0.98

    for p in particles:
        p.visible = False

# 여러 발 쏘기
while True:
    x = random.uniform(-3, 3)
    y = random.uniform(1, 4)
    await firework(x, y)
    sleep(0.5)
`
  },
  {
    id: 'christmas-tree',
    title: '크리스마스 트리',
    thumbnail: '🎄',
    category: 'art',
    level: 1,
    description: '반짝이는 장식과 음악이 있는 크리스마스 트리입니다.',
    tags: ['holiday', 'light', 'bgm'],
    code: `from vpython import *
import random, math

scene_background(vector(0.02, 0.02, 0.05))
start_bgm('peaceful')

# 나무 기둥
cylinder(pos=vector(0, -1.5, 0), axis=vector(0, 1, 0), radius=0.2, color=color.brown)

# 나뭇잎 (원뿔 3층)
cone(pos=vector(0, 0, 0), axis=vector(0, 2.5, 0), radius=2, color=color.green)
cone(pos=vector(0, 1.2, 0), axis=vector(0, 2, 0), radius=1.5, color=color.green)
cone(pos=vector(0, 2.2, 0), axis=vector(0, 1.5, 0), radius=1, color=color.green)

# 별
sphere(pos=vector(0, 4.2, 0), radius=0.25, color=color.yellow)
local_light(pos=vector(0, 4.2, 0), color=color.yellow, intensity=2)

# 장식 달기
ornaments = []
lights = []
for i in range(20):
    angle = random.uniform(0, 6.28)
    height = random.uniform(0, 3.5)
    r = (3.5 - height) / 3.5 * 1.8  # 높이에 따라 반지름 감소

    x = r * math.cos(angle)
    z = r * math.sin(angle)

    col = random.choice([color.red, color.gold, color.blue, color.silver])
    s = sphere(pos=vector(x, height, z), radius=0.12, color=col)
    l = local_light(pos=vector(x, height, z), color=col, intensity=0)
    s.light = l
    ornaments.append(s)
    lights.append(l)

# 반짝반짝
t = 0
while True:
    rate(10)
    t += 1
    for i, (s, l) in enumerate(zip(ornaments, lights)):
        if (t + i) % 5 == 0:
            l.intensity = 1.5
        else:
            l.intensity = 0
`
  },
  {
    id: 'kaleidoscope',
    title: '3D 만화경',
    thumbnail: '🔮',
    category: 'art',
    level: 2,
    description: '대칭 패턴이 회전하며 끝없이 변하는 만화경입니다.',
    tags: ['symmetry', 'pastel', 'animation'],
    code: `from vpython import *
import math

scene_background(vector(0.05, 0.05, 0.08))

# 6겹 대칭 패턴
N = 6  # 대칭 수
objects = []

for ring_r in [1, 2, 3, 4]:
    for i in range(N):
        angle = i * 2 * math.pi / N
        x = ring_r * math.cos(angle)
        z = ring_r * math.sin(angle)

        col = 파스텔[ring_r % len(파스텔)]
        s = sphere(pos=vector(x, 0, z), radius=0.2, color=col, opacity=0.8)
        s.ring_r = ring_r
        s.base_angle = angle
        s.idx = i
        objects.append(s)

# 만화경 회전
t = 0
while True:
    rate(30)
    t += 0.02

    for s in objects:
        # 각 링마다 다른 속도로 회전
        speed = 1.0 / s.ring_r
        angle = s.base_angle + t * speed

        # 반지름도 미세하게 변동
        r = s.ring_r + 0.3 * math.sin(t * 2 + s.idx)

        s.pos = vector(
            r * math.cos(angle),
            0.5 * math.sin(t * 3 + s.ring_r),
            r * math.sin(angle)
        )

        # 색 순환
        hue = (t * 0.1 + s.ring_r * 0.3 + s.idx * 0.2) % 7
        s.color = 무지개[int(hue) % 7]
`
  },
  {
    id: 'neon-city',
    title: '네온 도시',
    thumbnail: '🏙️',
    category: 'art',
    level: 1,
    description: '빛나는 네온 빌딩이 만드는 미래 도시 야경입니다.',
    tags: ['light', 'cityscape', 'atmosphere'],
    code: `from vpython import *
import random

scene_background(vector(0.02, 0.02, 0.04))

# 네온 색상들
neon_colors = [color.cyan, color.magenta, color.purple,
               color.pink, color.skyblue, color.blue]

# 빌딩 만들기
for i in range(30):
    x = random.uniform(-8, 8)
    z = random.uniform(-6, 2)
    width = random.uniform(0.4, 1.2)
    depth = random.uniform(0.4, 1.0)
    height = random.uniform(1, 6)

    # 빌딩 몸체 (어두운 색)
    box(
        pos=vector(x, height/2, z),
        size=vector(width, height, depth),
        color=vector(0.1, 0.1, 0.15)
    )

    # 네온 라인 (꼭대기)
    col = random.choice(neon_colors)
    box(
        pos=vector(x, height, z),
        size=vector(width + 0.1, 0.1, depth + 0.1),
        color=col
    )
    local_light(pos=vector(x, height, z), color=col, intensity=0.5)

    # 창문 (랜덤)
    if random.random() < 0.5:
        for floor in range(int(height)):
            if random.random() < 0.4:
                box(
                    pos=vector(x, floor + 0.5, z + depth/2 + 0.01),
                    size=vector(width * 0.3, 0.3, 0.02),
                    color=color.yellow,
                    opacity=0.6
                )

# 바닥 (도로)
box(pos=vector(0, -0.05, 0), size=vector(20, 0.1, 15), color=vector(0.05, 0.05, 0.08))

print("네온 도시 야경")
`
  },

  // ═══════════════════════════════════════
  // 🎮 게임/인터랙티브 (2개)
  // ═══════════════════════════════════════
  {
    id: 'bounce-ball',
    title: '바운스 볼',
    thumbnail: '⚽',
    category: 'game',
    level: 1,
    description: '벽에 부딪히면 색이 바뀌고 소리가 나는 통통 튀는 공입니다.',
    tags: ['physics', 'sound', 'color-change'],
    code: `from vpython import *
import random

scene_background(vector(0.08, 0.08, 0.1))

# 상자 벽 (반투명)
wall_size = 4
box(pos=vector(wall_size,0,0), size=vector(0.1,wall_size*2,wall_size*2), color=color.cyan, opacity=0.2)
box(pos=vector(-wall_size,0,0), size=vector(0.1,wall_size*2,wall_size*2), color=color.cyan, opacity=0.2)
box(pos=vector(0,wall_size,0), size=vector(wall_size*2,0.1,wall_size*2), color=color.magenta, opacity=0.2)
box(pos=vector(0,-wall_size,0), size=vector(wall_size*2,0.1,wall_size*2), color=color.magenta, opacity=0.2)
box(pos=vector(0,0,wall_size), size=vector(wall_size*2,wall_size*2,0.1), color=color.yellow, opacity=0.2)
box(pos=vector(0,0,-wall_size), size=vector(wall_size*2,wall_size*2,0.1), color=color.yellow, opacity=0.2)

# 공
ball = sphere(pos=vector(0,0,0), radius=0.3, color=color.red, make_trail=True)
vx, vy, vz = 3, 2.5, 2

all_colors = [color.red, color.orange, color.yellow, color.green,
              color.cyan, color.blue, color.purple, color.pink]
bounces = 0

while True:
    rate(60)
    ball.pos.x += vx * 0.02
    ball.pos.y += vy * 0.02
    ball.pos.z += vz * 0.02

    # 벽 충돌
    if abs(ball.pos.x) > wall_size - 0.3:
        vx = -vx
        bounces += 1
        ball.color = all_colors[bounces % len(all_colors)]
        ball.trail_color = ball.color
        play_sound(400 + bounces * 30, 0.1, 'square', 0.2)

    if abs(ball.pos.y) > wall_size - 0.3:
        vy = -vy
        bounces += 1
        ball.color = all_colors[bounces % len(all_colors)]
        ball.trail_color = ball.color
        play_sound(500 + bounces * 30, 0.1, 'triangle', 0.2)

    if abs(ball.pos.z) > wall_size - 0.3:
        vz = -vz
        bounces += 1
        ball.color = all_colors[bounces % len(all_colors)]
        ball.trail_color = ball.color
        play_sound(600 + bounces * 30, 0.1, 'sine', 0.2)
`
  },
  {
    id: 'planet-collision',
    title: '행성 충돌',
    thumbnail: '☄️',
    category: 'game',
    level: 2,
    description: '두 행성이 서로 끌려와 충돌하면 화려한 폭발이 일어납니다.',
    tags: ['gravity', 'trail', 'sfx', 'explosion'],
    code: `from vpython import *
import math, random

scene_background(vector(0.02, 0.02, 0.05))

# 두 행성
p1 = sphere(pos=vector(-5, 1, 0), radius=0.5, color=color.cyan,
            make_trail=True, trail_color=color.skyblue)
p2 = sphere(pos=vector(5, -1, 0), radius=0.4, color=color.orange,
            make_trail=True, trail_color=color.yellow)

p1.velocity = vector(1, -0.3, 0)
p2.velocity = vector(-1.2, 0.2, 0)

# 배경 별
for i in range(80):
    sphere(pos=vector(random.uniform(-10,10), random.uniform(-8,8), random.uniform(-5,-2)),
           radius=0.03, color=color.white)

dt = 0.02
while True:
    rate(60)

    # 중력 (서로 끌어당김)
    diff = p2.pos - p1.pos
    dist = max(mag(diff), 0.5)
    force = 5.0 / (dist * dist)
    direction = diff / dist

    p1.velocity += direction * force * dt
    p2.velocity -= direction * force * dt

    p1.pos += p1.velocity * dt
    p2.pos += p2.velocity * dt

    # 충돌 감지
    if dist < (p1.radius + p2.radius):
        play_sfx('explosion')

        # 폭발 이펙트
        center = (p1.pos + p2.pos) / 2
        p1.visible = False
        p2.visible = False

        for i in range(50):
            angle1 = random.uniform(0, 6.28)
            angle2 = random.uniform(-3.14, 3.14)
            speed = random.uniform(1, 4)

            col = random.choice([color.red, color.orange, color.yellow, color.white])
            s = sphere(pos=center, radius=random.uniform(0.05, 0.15), color=col,
                      make_trail=True, trail_color=col)
            s.velocity = vector(
                speed * math.cos(angle1) * math.cos(angle2),
                speed * math.sin(angle2),
                speed * math.sin(angle1) * math.cos(angle2)
            )

        # 폭발 진행
        for t in range(60):
            rate(30)

        print("행성 충돌! 새로운 성운이 탄생했습니다.")
        break
`
  },

  // ═══════════════════════════════════════
  // ✨ v3 신규 기능 쇼케이스 (5개)
  // ═══════════════════════════════════════
  {
    id: 'showcase-shapes',
    title: '새 도형 모음 (피라미드/타원체/나선/라벨)',
    thumbnail: '🔷',
    category: 'creative',
    level: 1,
    description: 'v3에서 추가된 pyramid, ellipsoid, helix, label 객체를 한 화면에서 비교',
    tags: ['shapes', 'label', 'helix'],
    code: `from vpython import *

# v3에서 새로 추가된 3D 객체들
# ──────────────────────────────────────────

# pyramid: 사각뿔. size=(축방향 높이, 폭, 깊이)
pyramid(pos=vector(-3, 0, 0), size=vector(1.5, 1, 1),
        color=color.gold, axis=vector(0, 1, 0))
label(pos=vector(-3, 1.5, 0), text="피라미드",
      color=color.white, height=14)

# ellipsoid: 타원체. size=(x폭, y높이, z깊이)
ellipsoid(pos=vector(0, 0, 0), size=vector(1.4, 0.8, 0.6),
          color=color.skyblue)
label(pos=vector(0, 1.0, 0), text="타원체",
      color=color.white, height=14)

# helix: 나선/스프링. radius=반경, length=길이, coils=감김 수
helix(pos=vector(2.5, -0.5, 0), axis=vector(1, 0, 0),
      radius=0.4, length=2, coils=8, thickness=0.04,
      color=color.coral)
label(pos=vector(3.5, 0.7, 0), text="나선",
      color=color.white, height=14)

# 배경 + 카메라 시야 고정
scene.background = vector(0.05, 0.05, 0.1)
scene.center = vector(0, 0, 0)
scene.range = 4
`
  },

  {
    id: 'showcase-curve',
    title: '동적 곡선 (curve로 사인파 그리기)',
    thumbnail: '〰️',
    category: 'math',
    level: 2,
    description: 'curve 객체에 점을 누적하면서 실시간으로 곡선이 그려집니다',
    tags: ['curve', 'animation', 'math'],
    code: `from vpython import *
import math

# curve는 점을 append할 때마다 선분이 누적되어 그려집니다.
# 시간에 따라 사인 함수의 그래프를 그려봅니다.
# ──────────────────────────────────────────

scene.background = vector(0.05, 0.05, 0.1)

# 빨간 곡선과 노란 곡선을 동시에
sine_curve = curve(color=color.red)
cosine_curve = curve(color=color.yellow)

# 라벨로 어느 곡선이 무엇인지 표시
label(pos=vector(0, 1.5, 0), text="빨강=sin, 노랑=cos",
      color=color.white, height=14)

# 0부터 6π까지 점을 추가
x = 0
for step in range(300):
    sine_curve.append(vector(x, math.sin(x), 0))
    cosine_curve.append(vector(x, math.cos(x), 0))
    x += 0.06
    rate(120)
`
  },

  {
    id: 'showcase-clone-rotate',
    title: 'clone + rotate로 12지 시계',
    thumbnail: '🕰️',
    category: 'creative',
    level: 2,
    description: '한 객체를 복제하고 회전시켜 시계 모양 12개 마커를 만듭니다',
    tags: ['clone', 'rotate', 'pattern'],
    code: `from vpython import *
import math

# .clone(**kwargs)로 객체를 복제하고 일부 속성만 덮어씁니다.
# vector.rotate(angle, axis)로 회전한 위치를 계산합니다.
# ──────────────────────────────────────────

scene.background = vector(0.95, 0.95, 0.97)

# 시계 외곽
ring(pos=vector(0, 0, 0), radius=3.2, thickness=0.1,
     color=color.gray, axis=vector(0, 0, 1))

# 12시 위치의 기준 마커
marker = box(pos=vector(0, 3, 0), size=vector(0.3, 0.6, 0.2),
             color=color.navy)

# 12개 위치로 회전 복제
for i in range(1, 12):
    angle = -i * math.pi / 6  # 시계방향
    new_pos = vector(0, 3, 0).rotate(angle, axis=vector(0, 0, 1))
    # 정시(3,6,9,12)는 더 두껍게, 그 외는 얇게
    is_main = (i % 3 == 0)
    marker.clone(
        pos=new_pos,
        size=vector(0.25, 0.5, 0.2) if is_main else vector(0.15, 0.3, 0.15),
        color=color.navy if is_main else color.gray,
    )

# 시침
arrow(pos=vector(0, 0, 0), axis=vector(0, 2, 0),
      shaftwidth=0.15, color=color.red)
# 분침
arrow(pos=vector(0, 0, 0), axis=vector(2.5, 0, 0),
      shaftwidth=0.08, color=color.black)

scene.range = 4
`
  },

  {
    id: 'showcase-event-click',
    title: '클릭으로 공 만들기 (이벤트)',
    thumbnail: '👆',
    category: 'interactive',
    level: 3,
    description: 'scene.bind("click")으로 마우스 클릭 위치에 공을 생성합니다',
    tags: ['events', 'interactive', 'click'],
    code: `from vpython import *
import random

# scene.bind('event_name', handler)로 이벤트 핸들러 등록.
# 핸들러는 evt.pos(클릭된 월드 좌표), evt.pick(클릭된 객체 id) 정보를 받습니다.
# rate() 호출 시점에 자동으로 디스패치됩니다.
# ──────────────────────────────────────────

scene.background = vector(0.05, 0.1, 0.15)

# 안내 라벨
label(pos=vector(0, 3, 0), text="3D 화면을 클릭해 보세요!",
      color=color.white, height=20, background=color.black)

# 바닥 평면 (z=0 평면 시각화)
box(pos=vector(0, -0.05, 0), size=vector(8, 0.05, 8),
    color=color.gray, opacity=0.3)

# 클릭 핸들러
def on_click(evt):
    # evt.pos는 월드 좌표 (z=0 평면 또는 클릭된 객체 표면)
    if evt.pos is None:
        return
    # 무지개 색 중 무작위
    rainbow_colors = [color.red, color.orange, color.yellow,
                      color.green, color.cyan, color.blue, color.purple]
    sphere(pos=evt.pos, radius=0.3,
           color=random.choice(rainbow_colors),
           emissive=True)

scene.bind('click', on_click)

# 이벤트 디스패치를 위해 rate() 루프 필요
while True:
    rate(30)
`
  },

  {
    id: 'showcase-keyboard-bouncing',
    title: '키보드로 공 조종하기',
    thumbnail: '⌨️',
    category: 'interactive',
    level: 3,
    description: '방향키 입력에 따라 공이 움직이고 벽에 부딪히면 튕깁니다',
    tags: ['events', 'keyboard', 'physics'],
    code: `from vpython import *

# scene.bind('keydown', handler)로 키보드 이벤트 처리.
# evt.key에 눌린 키 이름이 들어옵니다 ('up', 'left' 등)
# ──────────────────────────────────────────

scene.background = vector(0.1, 0.1, 0.15)

# 경기장 — 4면 벽
WALL = 4
for sx, sy in [(WALL, 0), (-WALL, 0), (0, WALL), (0, -WALL)]:
    if sx != 0:
        box(pos=vector(sx, 0, 0), size=vector(0.2, WALL*2, 0.5), color=color.gray)
    else:
        box(pos=vector(0, sy, 0), size=vector(WALL*2, 0.2, 0.5), color=color.gray)

# 플레이어 공
ball = sphere(pos=vector(0, 0, 0), radius=0.3,
              color=color.lime, emissive=True, make_trail=True)
ball.velocity = vector(0, 0, 0)

# 안내 라벨
label(pos=vector(0, WALL+0.5, 0),
      text="화살표 키로 가속, Space로 정지",
      color=color.white, height=16)

# 방향키 → 가속도 부여
def on_key(evt):
    accel = 0.05
    if evt.key == 'up':    ball.velocity += vector(0, accel, 0)
    elif evt.key == 'down': ball.velocity += vector(0, -accel, 0)
    elif evt.key == 'left': ball.velocity += vector(-accel, 0, 0)
    elif evt.key == 'right':ball.velocity += vector(accel, 0, 0)
    elif evt.key == ' ':         ball.velocity = vector(0, 0, 0)

scene.bind('keydown', on_key)

# 메인 루프 — 위치/벽 충돌 처리
while True:
    rate(60)
    ball.pos += ball.velocity
    # 벽 반사
    if abs(ball.pos.x) > WALL - ball.radius:
        ball.velocity.x = -ball.velocity.x * 0.9
        ball.pos.x = (WALL - ball.radius) * (1 if ball.pos.x > 0 else -1)
    if abs(ball.pos.y) > WALL - ball.radius:
        ball.velocity.y = -ball.velocity.y * 0.9
        ball.pos.y = (WALL - ball.radius) * (1 if ball.pos.y > 0 else -1)
`
  },

  {
    id: 'showcase-slider-control',
    title: '슬라이더로 공 크기 조절',
    thumbnail: '🎚️',
    category: 'interactive',
    level: 2,
    description: 'UI 슬라이더로 객체 속성을 실시간으로 바꿉니다',
    tags: ['widget', 'slider', 'interactive'],
    code: `from vpython import *

# slider(min, max, step, value, bind=callback)로 UI 슬라이더 추가.
# 콜백은 evt.value로 슬라이더 값을 받습니다.
# ──────────────────────────────────────────

scene.background = vector(0.95, 0.95, 0.98)

ball = sphere(pos=vector(0, 0, 0), radius=0.5,
              color=color.coral, emissive=True)

label(pos=vector(0, 1.8, 0),
      text="우상단 슬라이더로 크기를 바꿔보세요",
      color=color.black, height=14)

# 슬라이더 콜백 — 슬라이더 값을 공의 반지름으로
def on_slide(evt):
    ball.radius = evt.value

slider(min=0.1, max=2.0, step=0.05, value=0.5,
       length=200, bind=on_slide)

# 버튼 콜백 — 색을 무작위로
def on_color(evt):
    import random
    palette = [color.red, color.green, color.blue,
               color.yellow, color.cyan, color.magenta, color.coral]
    ball.color = random.choice(palette)

button(text='색 바꾸기', bind=on_color)

# 이벤트 디스패치를 위해 rate() 루프 필요
while True:
    rate(30)
`
  },

  // ═══════════════════════════════════════
  // 🧪 v3 확장 쇼케이스 (8개) — 미커버 기능 보충
  // ═══════════════════════════════════════
  {
    id: 'showcase-vertex-rainbow',
    title: '정점 색상으로 만드는 무지개 부채',
    thumbnail: '🌈',
    category: 'creative',
    level: 2,
    description: 'vertex와 triangle로 정점마다 다른 색을 주어 그라디언트 면을 만듭니다',
    tags: ['vertex', 'triangle', 'gradient'],
    code: `from vpython import *
import math

# vertex(pos, color)는 위치+색을 가진 점.
# triangle(v0, v1, v2)은 3정점으로 면을 만들고, 정점 색이 자연스럽게 보간됩니다.
# ──────────────────────────────────────────

scene.background = vector(0.05, 0.05, 0.1)

# 무지개 7색 — 부채꼴 12조각으로 색이 흘러가게
rainbow_colors = [color.red, color.orange, color.yellow,
                  color.green, color.cyan, color.blue, color.purple]

N = 24                # 부채 조각 수
R = 3.0               # 반경
center = vertex(pos=vector(0, 0, 0), color=color.white)

prev_outer = None
for i in range(N + 1):
    angle = (i / N) * math.pi  # 0 ~ π (반원)
    outer_pos = vector(R * math.cos(angle), R * math.sin(angle), 0)
    # 무지개 색을 부드럽게 보간
    t = i / N * (len(rainbow_colors) - 1)
    idx = int(t)
    frac = t - idx
    if idx >= len(rainbow_colors) - 1:
        col = rainbow_colors[-1]
    else:
        a = rainbow_colors[idx]
        b = rainbow_colors[idx + 1]
        col = a * (1 - frac) + b * frac
    outer = vertex(pos=outer_pos, color=col)
    if prev_outer is not None:
        triangle(v0=center, v1=prev_outer, v2=outer)
    prev_outer = outer

label(pos=vector(0, -0.7, 0), text="정점 색이 면 위에서 그라디언트로 보간됩니다",
      color=color.white, height=14)
`
  },

  {
    id: 'showcase-platonic-solids',
    title: 'triangle/quad로 만드는 다면체',
    thumbnail: '🔺',
    category: 'math',
    level: 3,
    description: '직접 정점을 만들어 정사면체와 정육면체를 구성합니다',
    tags: ['triangle', 'quad', 'geometry'],
    code: `from vpython import *
import math

# triangle/quad는 vertex 리스트로 면을 만드는 저수준 메시.
# 정사면체(4면)와 정육면체(6면)를 직접 구성해봅시다.
# ──────────────────────────────────────────

scene.background = vector(0.97, 0.97, 0.99)

# === 정사면체 ===
# 4개의 정점 좌표 (중심이 원점)
a = math.sqrt(2/3)
b = math.sqrt(8/9)
verts_t = [
    vector(0, a, 0),
    vector(b, -a/3, 0),
    vector(-b/2, -a/3, math.sqrt(2/3)),
    vector(-b/2, -a/3, -math.sqrt(2/3)),
]
# 정사면체는 4개의 삼각형 면
faces_t = [(0,1,2), (0,2,3), (0,3,1), (1,3,2)]
for f in faces_t:
    triangle(
        v0=vertex(pos=verts_t[f[0]] + vector(-2, 0, 0), color=color.red),
        v1=vertex(pos=verts_t[f[1]] + vector(-2, 0, 0), color=color.green),
        v2=vertex(pos=verts_t[f[2]] + vector(-2, 0, 0), color=color.blue),
    )
label(pos=vector(-2, -1.5, 0), text="정사면체 (4면)",
      color=color.black, height=14)

# === 정육면체 ===
# 8개 정점, 6개 사각형 면
s = 0.7
verts_c = [
    vector(-s, -s, -s), vector( s, -s, -s),
    vector( s,  s, -s), vector(-s,  s, -s),
    vector(-s, -s,  s), vector( s, -s,  s),
    vector( s,  s,  s), vector(-s,  s,  s),
]
# 면 인덱스 (반시계 방향 보장)
faces_c = [
    (0, 3, 2, 1),  # 뒤
    (4, 5, 6, 7),  # 앞
    (0, 1, 5, 4),  # 아래
    (2, 3, 7, 6),  # 위
    (1, 2, 6, 5),  # 오른쪽
    (0, 4, 7, 3),  # 왼쪽
]
face_colors = [color.red, color.orange, color.yellow,
               color.green, color.blue, color.purple]
for face, fc in zip(faces_c, face_colors):
    quad(vs=[
        vertex(pos=verts_c[face[0]] + vector(2, 0, 0), color=fc),
        vertex(pos=verts_c[face[1]] + vector(2, 0, 0), color=fc),
        vertex(pos=verts_c[face[2]] + vector(2, 0, 0), color=fc),
        vertex(pos=verts_c[face[3]] + vector(2, 0, 0), color=fc),
    ])
label(pos=vector(2, -1.5, 0), text="정육면체 (6면)",
      color=color.black, height=14)
`
  },

  {
    id: 'showcase-extrusion-tube',
    title: 'extrusion으로 만드는 휘어진 튜브',
    thumbnail: '🌀',
    category: 'creative',
    level: 3,
    description: '2D 단면을 3D 경로(path)로 압출해 자유로운 곡선 튜브를 만듭니다',
    tags: ['extrusion', 'curve', 'path'],
    code: `from vpython import *
import math

# extrusion(path, shape)은 2D shape를 3D path를 따라 스윕합니다.
# path: 3D 점 리스트, shape: (x, y) 2D 외곽선 좌표
# ──────────────────────────────────────────

scene.background = vector(0.05, 0.08, 0.12)

# 1) 별 모양 단면
def star_shape(n_points=5, outer=0.5, inner=0.2):
    pts = []
    for i in range(n_points * 2):
        r = outer if i % 2 == 0 else inner
        ang = i * math.pi / n_points
        pts.append((r * math.cos(ang), r * math.sin(ang)))
    return pts

# 2) 나선형 경로
spiral_path = []
for i in range(40):
    t = i * 0.2
    spiral_path.append(vector(t - 4, math.sin(t) * 1.5, math.cos(t) * 1.5))

extrusion(path=spiral_path, shape=star_shape(n_points=5),
          color=color.gold)

# 3) 원형 단면 + 직선 path (속이 빈 파이프 같은 단순한 튜브)
circle_shape = [(0.2 * math.cos(a * math.pi / 8),
                 0.2 * math.sin(a * math.pi / 8)) for a in range(16)]
straight_path = [vector(t, -2, 0) for t in range(-3, 4)]
extrusion(path=straight_path, shape=circle_shape, color=color.cyan)

label(pos=vector(0, 3, 0), text="별 모양을 나선 경로로 압출",
      color=color.white, height=14)
label(pos=vector(0, -2.7, 0), text="원형 단면 + 직선 경로",
      color=color.white, height=12)
`
  },

  {
    id: 'showcase-keysdown-spaceship',
    title: 'keysdown으로 우주선 조종하기',
    thumbnail: '🚀',
    category: 'game',
    level: 3,
    description: '여러 키를 동시에 누를 수 있는 keysdown() 폴링으로 우주선을 자유롭게 움직입니다',
    tags: ['keysdown', 'game', 'multi-key'],
    code: `from vpython import *

# scene.bind('keydown')은 1회 누름마다 발생 — 게임 같은 동시 입력에는 부적합.
# keysdown()은 현재 눌린 모든 키 리스트를 반환 — 여러 키 동시 처리에 이상적.
# 예: 위+오른쪽을 함께 누르면 대각선 비행
# ──────────────────────────────────────────

scene.background = vector(0.02, 0.02, 0.08)

# 우주선 (compound로 본체+엔진 묶기)
hull = cone(pos=vector(0, 0, 0), axis=vector(0, 0.5, 0),
            radius=0.2, color=color.silver)
engine = cylinder(pos=vector(0, -0.3, 0), axis=vector(0, 0.2, 0),
                  radius=0.15, color=color.red)
ship = compound([hull, engine], pos=vector(0, 0, 0), make_trail=True,
                trail_color=color.cyan)

# 별들 (배경)
import random
for _ in range(60):
    sphere(pos=vector(random.uniform(-8,8), random.uniform(-5,5), random.uniform(-3,3)),
           radius=0.04, color=color.white, emissive=True)

label(pos=vector(0, 4.5, 0),
      text="WASD 또는 화살표로 비행 (동시 누르기 OK), Space로 정지",
      color=color.white, height=14)

speed = 0.05
while True:
    rate(60)
    keys = keysdown()  # 현재 눌려있는 키 리스트
    dx, dy = 0, 0
    if 'up' in keys or 'w' in keys:    dy += speed
    if 'down' in keys or 's' in keys:  dy -= speed
    if 'left' in keys or 'a' in keys:  dx -= speed
    if 'right' in keys or 'd' in keys: dx += speed
    if ' ' in keys:
        ship.clear_trail()  # Space — 궤적 지우기

    if dx != 0 or dy != 0:
        ship.pos = ship.pos + vector(dx, dy, 0)
        # 화면 경계 wrap
        if ship.pos.x > 6:  ship.pos = vector(-6, ship.pos.y, 0)
        if ship.pos.x < -6: ship.pos = vector(6, ship.pos.y, 0)
        if ship.pos.y > 4:  ship.pos = vector(ship.pos.x, -4, 0)
        if ship.pos.y < -4: ship.pos = vector(ship.pos.x, 4, 0)
`
  },

  {
    id: 'showcase-mouse-follow',
    title: 'scene.mouse로 마우스 따라다니기',
    thumbnail: '🖱️',
    category: 'interactive',
    level: 2,
    description: 'scene.mouse.pos를 폴링해 마우스 위치를 부드럽게 추적하는 공',
    tags: ['mouse', 'interactive', 'follow'],
    code: `from vpython import *

# scene.mouse.pos는 현재 마우스의 월드 좌표(z=0 평면 기준).
# 매 프레임 폴링해서 그 위치로 부드럽게 다가가는 공을 만듭니다.
# ──────────────────────────────────────────

scene.background = vector(0.95, 0.97, 1.0)
scene.center = vector(0, 0, 0)
scene.range = 5

# 따라다니는 공
follower = sphere(pos=vector(0, 0, 0), radius=0.3,
                  color=color.coral, emissive=True,
                  make_trail=True, trail_color=color.coral)

# 안내 라벨
label(pos=vector(0, 4, 0),
      text="3D 화면에서 마우스를 움직여보세요!",
      color=color.black, height=16,
      background=color.white)

# 십자 가이드
box(pos=vector(0, 0, -0.1), size=vector(10, 0.02, 0.01), color=color.gray, opacity=0.5)
box(pos=vector(0, 0, -0.1), size=vector(0.02, 8, 0.01), color=color.gray, opacity=0.5)

# 보간 비율 (0.0 = 안 움직임, 1.0 = 즉시 따라감)
SMOOTHING = 0.08

while True:
    rate(60)
    target = scene.mouse.pos  # vector(x, y, z) — 마우스가 가리키는 월드 좌표
    # follower.pos를 target 방향으로 부드럽게 보간
    delta = target - follower.pos
    follower.pos = follower.pos + delta * SMOOTHING
`
  },

  {
    id: 'showcase-graph-functions',
    title: '슬라이더로 함수 그래프 조절',
    thumbnail: '📈',
    category: 'math',
    level: 3,
    description: 'A·sin(B·x + C) 함수의 진폭/주파수/위상을 슬라이더로 실시간 조절',
    tags: ['graph', 'gcurve', 'slider', 'math'],
    code: `from vpython import *
import math

# 2D 그래프(graph + gcurve)와 슬라이더를 결합한 인터랙티브 시각화.
# 슬라이더 값이 바뀔 때마다 함수 그래프가 다시 그려집니다.
# ──────────────────────────────────────────

# 그래프 캔버스
g = graph(title='A · sin(B · x + C)', xtitle='x', ytitle='y',
          width=480, height=300,
          xmin=0, xmax=4*math.pi, ymin=-3, ymax=3)
fcurve = gcurve(graph=g, color=color.blue)

# 현재 파라미터 (가변)
state = {'A': 1.0, 'B': 1.0, 'C': 0.0}

def redraw():
    fcurve.clear()
    A, B, C = state['A'], state['B'], state['C']
    for i in range(200):
        x = i * 4 * math.pi / 200
        y = A * math.sin(B * x + C)
        fcurve.plot(x, y)

redraw()

# 슬라이더 콜백들
def on_A(evt):
    state['A'] = evt.value
    redraw()
def on_B(evt):
    state['B'] = evt.value
    redraw()
def on_C(evt):
    state['C'] = evt.value
    redraw()

slider(text='진폭 A', min=0.1, max=3.0, step=0.1, value=1.0, length=180, bind=on_A)
slider(text='주파수 B', min=0.5, max=4.0, step=0.1, value=1.0, length=180, bind=on_B)
slider(text='위상 C', min=0, max=2*math.pi, step=0.1, value=0, length=180, bind=on_C)

label(pos=vector(0, 0, 0),
      text="위에서부터 A(진폭), B(주파수), C(위상) 슬라이더",
      color=color.gray, height=14)

while True:
    rate(30)
`
  },

  {
    id: 'showcase-scatter-regression',
    title: '산점도와 회귀선 (gdots + gcurve)',
    thumbnail: '📊',
    category: 'math',
    level: 3,
    description: '랜덤 데이터의 산점도와 자동 계산된 회귀선을 함께 표시',
    tags: ['gdots', 'gcurve', 'data', 'statistics'],
    code: `from vpython import *
import random

# gdots(점)와 gcurve(선)를 같은 graph 안에서 함께 사용합니다.
# 노이즈가 섞인 선형 데이터에 최소제곱 회귀선을 그어봅시다.
# ──────────────────────────────────────────

# 1) 데이터 생성: y = 2x + 5 + 노이즈
points_data = []
for _ in range(40):
    x = random.uniform(0, 10)
    y = 2 * x + 5 + random.gauss(0, 2.5)
    points_data.append((x, y))

# 2) 최소제곱 회귀 (slope=m, intercept=b)
n = len(points_data)
sx = sum(p[0] for p in points_data)
sy = sum(p[1] for p in points_data)
sxx = sum(p[0]**2 for p in points_data)
sxy = sum(p[0]*p[1] for p in points_data)
m = (n*sxy - sx*sy) / (n*sxx - sx**2)
b = (sy - m*sx) / n
print(f"회귀식: y = {m:.3f} · x + {b:.3f}")

# 3) 그래프에 점과 선 함께 그리기
g = graph(title='선형 회귀', xtitle='x', ytitle='y',
          width=480, height=320, xmin=0, xmax=10)

# 산점도
dots = gdots(graph=g, color=color.red, size=6)
for x, y in points_data:
    dots.plot(x, y)

# 회귀선
line = gcurve(graph=g, color=color.blue)
for i in range(11):
    line.plot(i, m * i + b)

# 진짜 정답선 (참고용)
truth = gcurve(graph=g, color=color.gray)
for i in range(11):
    truth.plot(i, 2 * i + 5)

print("빨간 점 = 데이터, 파란 선 = 회귀, 회색 선 = 진짜 식")
`
  },

  {
    id: 'showcase-pendulum-trail',
    title: '진자 운동과 attach_trail',
    thumbnail: '🪀',
    category: 'science',
    level: 2,
    description: '단순 진자의 진동을 실시간으로 시뮬레이션하고 끝점의 궤적을 그립니다',
    tags: ['physics', 'attach_trail', 'simulation'],
    code: `from vpython import *
import math

# attach_trail()은 객체에 동적으로 궤적을 부착합니다.
# 진자의 끝점(bob)이 그리는 곡선을 관찰해봅시다.
# ──────────────────────────────────────────

scene.background = vector(0.95, 0.96, 0.98)
scene.range = 3

# 천장 고정점
pivot = sphere(pos=vector(0, 2, 0), radius=0.05, color=color.black)

# 끈 (cylinder) + 추 (sphere)
L = 1.8                      # 진자 길이
theta = math.radians(45)     # 초기 각도 (수직에서 시각)
omega = 0                    # 각속도
g = 9.81                     # 중력 가속도

bob = sphere(pos=pivot.pos + vector(L*math.sin(theta), -L*math.cos(theta), 0),
             radius=0.15, color=color.red, emissive=True)

# 추에 궤적 부착 (생성 후에도 추가 가능)
bob.attach_trail(color=color.blue, retain=500)

string = cylinder(pos=pivot.pos, axis=bob.pos - pivot.pos,
                  radius=0.015, color=color.gray)

label(pos=vector(0, 2.7, 0),
      text="단순 진자 — 빨간 추가 그리는 궤적을 관찰하세요",
      color=color.black, height=14)
label(pos=vector(0, -1.5, 0),
      text="(작은 진폭에서는 거의 직선, 큰 진폭에서는 둥근 호)",
      color=color.gray, height=12)

# 시뮬레이션 루프 (Euler 적분)
dt = 0.02
while True:
    rate(50)
    # θ'' = -g/L · sin(θ) — 진자 운동 방정식
    alpha = -g / L * math.sin(theta)
    omega += alpha * dt
    omega *= 0.999  # 미세 감쇠
    theta += omega * dt
    # 추 위치 업데이트
    bob.pos = pivot.pos + vector(L*math.sin(theta), -L*math.cos(theta), 0)
    string.axis = bob.pos - pivot.pos
`
  },

  // ═══════════════════════════════════════
  // 🎵 음악 융합 쇼케이스 (10개) — 음악×수학·과학·창의
  // ═══════════════════════════════════════

  // ── 음악 × 수학 (3) ─────────────────────
  {
    id: 'music-frequency-tower',
    title: '주파수 탑 — 음높이의 비밀',
    thumbnail: '🗼',
    category: 'sound',
    level: 2,
    description: '도레미파솔라시도의 주파수를 박스 높이로 시각화. 높을수록 음이 높다',
    tags: ['music', 'math', 'frequency'],
    code: `from vpython import *
import math

# 음의 높이는 1초당 진동수(Hz)로 결정됩니다.
# 낮은 도(C4) = 261.63 Hz, 높은 도(C5) = 523.25 Hz — 정확히 2배!
# 박스 높이를 주파수에 비례하게 그려 비교해 봅시다.
# ──────────────────────────────────────────

scene.background = vector(0.05, 0.05, 0.1)

# 도레미파솔라시도의 주파수
notes = [
    ('도', note.C4, color.red),
    ('레', note.D4, color.orange),
    ('미', note.E4, color.yellow),
    ('파', note.F4, color.green),
    ('솔', note.G4, color.cyan),
    ('라', note.A4, color.blue),
    ('시', note.B4, color.purple),
    ('도', note.C5, color.magenta),
]

# 박스 + 라벨 + 음 한꺼번에
for i, (name, freq, col) in enumerate(notes):
    h = freq / 100  # 주파수 / 100 = 박스 높이
    box(pos=vector(i*0.9 - 3.2, h/2, 0),
        size=vector(0.7, h, 0.7), color=col, emissive=True)
    label(pos=vector(i*0.9 - 3.2, h + 0.5, 0),
          text=f'{name}\\n{freq:.0f}Hz',
          color=color.white, height=12)
    sound(freq, 0.4, 'sine', 0.25)
    sleep(0.5)

# 마지막 화음으로 끝
chord([note.C4, note.E4, note.G4, note.C5], 1.5)
print('낮은 도 261Hz → 높은 도 523Hz: 정확히 2배 차이입니다!')
`
  },

  {
    id: 'music-sine-wave',
    title: '사인파 멜로디 — 슬라이더로 그리고 듣기',
    thumbnail: '🌊',
    category: 'sound',
    level: 3,
    description: '주파수와 진폭을 슬라이더로 조절하며 파형과 소리를 동시에 체험',
    tags: ['music', 'math', 'wave', 'slider'],
    code: `from vpython import *
import math

# 소리는 공기의 진동(파동). 사인파 y = A·sin(2πfx)는 가장 단순한 음.
# 슬라이더로 주파수(f)와 진폭(A)을 바꿔보세요.
# ──────────────────────────────────────────

scene.background = vector(0.95, 0.96, 0.98)

state = {'freq': 440.0, 'amp': 1.0}

# 곡선 시각화 — curve로 사인파 그리기
wave_curve = curve(color=color.blue, radius=0.04)

def redraw():
    wave_curve.clear()
    f = state['freq'] / 100  # 시각화용 주파수 스케일
    A = state['amp']
    for i in range(200):
        x = i * 0.04 - 4
        y = A * math.sin(f * x * 2 * math.pi / 4)
        wave_curve.append(vector(x, y, 0))

redraw()

# 라벨
freq_label = label(pos=vector(0, 2.5, 0),
                   text=f"{state['freq']:.0f} Hz",
                   color=color.black, height=18)

def on_freq(evt):
    state['freq'] = evt.value
    freq_label.text = f"{evt.value:.0f} Hz"
    redraw()
    # 즉시 짧은 음 재생
    sound(evt.value, 0.15, 'sine', 0.2)

def on_amp(evt):
    state['amp'] = evt.value
    redraw()

slider(min=110, max=880, step=10, value=440, length=200, bind=on_freq)
slider(min=0.2, max=2.0, step=0.1, value=1.0, length=200, bind=on_amp)

label(pos=vector(0, -2.5, 0),
      text="위 슬라이더 = 주파수, 아래 슬라이더 = 진폭",
      color=color.black, height=12)

# 이벤트 디스패치 루프
while True:
    rate(30)
`
  },

  {
    id: 'music-fibonacci-rhythm',
    title: '피보나치 리듬 — 황금비 박자',
    thumbnail: '🌀',
    category: 'sound',
    level: 2,
    description: '1, 1, 2, 3, 5, 8 비트마다 음이 울리는 자연의 수학 리듬',
    tags: ['music', 'math', 'fibonacci'],
    code: `from vpython import *
import math

# 피보나치 수열: 1, 1, 2, 3, 5, 8, 13, 21, ...
# 자연(소라껍데기, 해바라기)에 숨겨진 비율 = 황금비
# 이 수열대로 비트 수를 두면 독특한 리듬이 만들어집니다.
# ──────────────────────────────────────────

scene.background = vector(0.05, 0.08, 0.12)

fib = [1, 1, 2, 3, 5, 8, 13]
notes = [note.C4, note.D4, note.E4, note.G4, note.A4, note.C5, note.E5]
colors = [color.red, color.orange, color.yellow, color.green,
          color.cyan, color.blue, color.purple]

# 피보나치 박스 — 크기가 수열대로 커짐
boxes = []
x = -4
for i, n in enumerate(fib):
    size = 0.3 + n * 0.15
    b = box(pos=vector(x + size/2, 0, 0),
            size=vector(size, size, size),
            color=colors[i], emissive=True)
    label(pos=vector(b.pos.x, size/2 + 0.4, 0),
          text=str(n), color=color.white, height=14)
    boxes.append((b, n, notes[i]))
    x += size + 0.15

label(pos=vector(0, -2, 0),
      text="피보나치 수만큼 박자가 반복됩니다",
      color=color.white, height=14)

# 무한 반복: 각 박스가 자기 비트수만큼 음을 냄
beat_dur = 0.18
while True:
    for b, n, freq in boxes:
        for _ in range(n):
            # 박스가 통통 튐
            b.pos = b.pos + vector(0, 0.4, 0)
            sound(freq, beat_dur*0.8, 'sine', 0.3)
            sleep(beat_dur)
            b.pos = b.pos - vector(0, 0.4, 0)
    sleep(0.5)
`
  },

  // ── 음악 × 과학 (3) ─────────────────────
  {
    id: 'music-doppler',
    title: '도플러 효과 — 지나가는 자동차의 음',
    thumbnail: '🚗',
    category: 'sound',
    level: 3,
    description: '가까이 올 때는 높은 음, 멀어질 때는 낮은 음 — 구급차 사이렌의 비밀',
    tags: ['music', 'science', 'doppler'],
    code: `from vpython import *
import math

# 도플러 효과: 음원이 다가오면 파장이 짧아져 음이 높아지고,
# 멀어지면 파장이 길어져 낮아집니다.
# 구급차 사이렌이 지나갈 때 음이 변하는 이유!
# ──────────────────────────────────────────

scene.background = vector(0.05, 0.05, 0.1)

# 도로
box(pos=vector(0, -1, 0), size=vector(20, 0.1, 1),
    color=color.gray, opacity=0.5)
# 관측자(사람)
sphere(pos=vector(0, 0, 0), radius=0.2,
       color=color.peach, emissive=True)
label(pos=vector(0, 0.6, 0), text='관측자',
      color=color.white, height=12)

# 자동차
car = box(pos=vector(-7, -0.3, 0), size=vector(0.8, 0.4, 0.4),
          color=color.red, emissive=True, make_trail=True,
          trail_color=color.red)

# 자동차 본래 음
base_freq = 440  # A4

label(pos=vector(0, 2.5, 0),
      text="자동차가 좌→우로 지나갑니다. 음 변화에 귀 기울여보세요!",
      color=color.white, height=14)

# 자동차가 좌→우로 지나감 (3회 반복)
for cycle in range(3):
    car.pos = vector(-7, -0.3, 0)
    car.clear_trail()
    while car.pos.x < 7:
        car.pos = car.pos + vector(0.15, 0, 0)
        # 거리 기반 도플러 시뮬레이션 (단순화)
        dx = 0 - car.pos.x  # 관측자(0)에서 자동차까지
        speed = 0.15  # 자동차 속도(임의)
        # 다가오면(dx>0) 주파수↑, 멀어지면 주파수↓
        if dx > 0.1:  # 다가오는 중
            freq = base_freq * 1.15
        elif dx < -0.1:  # 멀어지는 중
            freq = base_freq * 0.87
        else:  # 옆을 지남
            freq = base_freq
        sound(freq, 0.12, 'sawtooth', 0.18)
        sleep(0.05)
    sleep(0.3)

print('도플러 효과: 다가올 때 약 +15%, 멀어질 때 약 -13% 주파수 변화')
`
  },

  {
    id: 'music-wave-interference',
    title: '파동 간섭 — 두 사인파의 합',
    thumbnail: '🎶',
    category: 'sound',
    level: 3,
    description: '두 음을 동시에 내면 보강·상쇄 간섭이 일어나며 새 파형이 생긴다',
    tags: ['music', 'science', 'interference'],
    code: `from vpython import *
import math

# 두 사인파를 더하면 합성파가 만들어집니다.
# 같은 주파수: 보강(2배 진폭) 또는 상쇄(0)
# 가까운 주파수: 맥놀이(beat) — 음량이 주기적으로 커졌다 작아짐
# ──────────────────────────────────────────

scene.background = vector(0.95, 0.96, 0.98)

# 세 곡선: 파동1(빨강), 파동2(파랑), 합성파(보라)
c1 = curve(color=color.red, radius=0.03)
c2 = curve(color=color.blue, radius=0.03)
csum = curve(color=color.purple, radius=0.05)

label(pos=vector(0, 3.2, 0), text='빨강 + 파랑 = 보라(합성파)',
      color=color.black, height=16)

# 두 주파수
f1 = note.C4   # 261.63 Hz
f2 = note.E4   # 329.63 Hz

# 시각화: 시간 0~4초 구간
N = 200
for i in range(N):
    t = i / N * 4
    y1 = math.sin(f1 * t / 50) * 0.7
    y2 = math.sin(f2 * t / 50) * 0.7
    x = i * 0.04 - 4
    c1.append(vector(x, y1 + 1.5, 0))
    c2.append(vector(x, y2 + 0, 0))
    csum.append(vector(x, y1 + y2 - 1.5, 0))

# 두 음을 동시에 (화음으로) 1초간 — 실제로 들어보는 보강 간섭
print('첫째 음: 도(C4, 261.63 Hz)')
sound(f1, 1.0, 'sine', 0.3)
sleep(1.1)
print('둘째 음: 미(E4, 329.63 Hz)')
sound(f2, 1.0, 'sine', 0.3)
sleep(1.1)
print('두 음을 동시에 — 화음으로 들리지만 사실은 합성파입니다')
chord([f1, f2], 2.0, 'sine', 0.25)
`
  },

  {
    id: 'music-planet-orchestra',
    title: '행성 합주단 — 우주의 음악',
    thumbnail: '🪐',
    category: 'sound',
    level: 3,
    description: '5개 행성이 각자 다른 속도로 돌면서 일직선이 될 때마다 자기 음을 연주',
    tags: ['music', 'science', 'orbit', 'space'],
    code: `from vpython import *
import math

# 케플러는 행성의 운동에서 음악을 듣고자 했습니다 ("천체의 음악").
# 5개 행성이 각자 다른 속도로 공전하다가, 0도(원점 위)를 지날 때
# 자기 고유 음을 연주합니다. 다른 주기들의 합주!
# ──────────────────────────────────────────

scene.background = vector(0.02, 0.02, 0.08)

# 태양
sphere(pos=vector(0, 0, 0), radius=0.3, color=color.yellow, emissive=True)
local_light(pos=vector(0, 0, 0), color=color.yellow, intensity=2)

# 5개 행성: 거리, 속도(주기), 색, 음
planets_data = [
    (1.5, 0.05,  color.red,    note.C5),
    (2.3, 0.035, color.orange, note.E5),
    (3.0, 0.025, color.cyan,   note.G5),
    (3.8, 0.018, color.green,  note.C6),
    (4.7, 0.013, color.purple, note.E5),
]

planets = []
for dist, speed, col, freq in planets_data:
    # 궤도 ring
    ring(pos=vector(0, 0, 0), radius=dist, thickness=0.02,
         color=color.gray, axis=vector(0, 1, 0), opacity=0.3)
    p = sphere(radius=0.15 + dist*0.04, color=col,
               emissive=True, make_trail=True, trail_color=col)
    p.dist = dist
    p.speed = speed
    p.angle = 0
    p.freq = freq
    p.last_zone = -1  # 마지막 음을 낸 영역(0~7) — 중복 방지
    planets.append(p)

label(pos=vector(0, 5.5, 0),
      text='행성이 위쪽(0도)을 지날 때마다 자기 음을 연주합니다',
      color=color.white, height=14)

# 무한 반복
while True:
    rate(60)
    for p in planets:
        p.angle += p.speed
        p.pos = vector(p.dist * math.cos(p.angle),
                       0, p.dist * math.sin(p.angle))
        # 0도(우측) 지날 때 음 재생 — sin이 0에 가깝고 cos>0
        zone = int(p.angle / (math.pi / 4)) % 8
        if zone == 0 and p.last_zone != 0:
            sound(p.freq, 0.25, 'sine', 0.18)
        p.last_zone = zone
`
  },

  // ── 음악 × 창의 (3) ─────────────────────
  {
    id: 'music-rainbow-piano',
    title: '무지개 피아노 — 클릭으로 연주',
    thumbnail: '🎹',
    category: 'sound',
    level: 2,
    description: '7개 무지개 박스를 클릭하면 도레미파솔라시 음이 나는 인터랙티브 피아노',
    tags: ['music', 'creative', 'interactive', 'click'],
    code: `from vpython import *

# 클릭 한 번이 음 한 개. 7개 색을 직접 누르며 멜로디를 만들어 보세요.
# evt.pick으로 클릭된 객체 id를 알 수 있어 어떤 건반인지 식별합니다.
# ──────────────────────────────────────────

scene.background = vector(0.1, 0.1, 0.15)
scene.center = vector(0, 0, 0)
scene.range = 5

# 7색 박스 + 음
keys_data = [
    ('도', note.C4, color.red),
    ('레', note.D4, color.orange),
    ('미', note.E4, color.yellow),
    ('파', note.F4, color.green),
    ('솔', note.G4, color.cyan),
    ('라', note.A4, color.blue),
    ('시', note.B4, color.purple),
]

key_map = {}  # id → (음, 박스)
x = -3
for name, freq, col in keys_data:
    b = box(pos=vector(x, 0, 0),
            size=vector(0.8, 1.5, 0.5),
            color=col, emissive=True)
    label(pos=vector(x, -1.2, 0), text=name,
          color=color.white, height=18)
    key_map[b._id] = (freq, b)
    x += 1

label(pos=vector(0, 2.5, 0),
      text='색 박스를 클릭해 멜로디를 만들어보세요!',
      color=color.white, height=18)

def on_click(evt):
    if evt.pick in key_map:
        freq, b = key_map[evt.pick]
        sound(freq, 0.3, 'sine', 0.35)
        # 박스가 살짝 위로 튀었다 돌아오기
        b.pos = b.pos + vector(0, 0.3, 0)

scene.bind('click', on_click)

# 박스 위치 복귀 루프 + 이벤트 디스패치
while True:
    rate(30)
    for _, b in key_map.values():
        # 원위치로 부드럽게 보간
        if b.pos.y > 0.01:
            b.pos = b.pos + vector(0, -0.05, 0)
        elif b.pos.y < -0.01:
            b.pos = vector(b.pos.x, 0, b.pos.z)
`
  },

  {
    id: 'music-note-fireworks',
    title: '음표 폭죽 — 클릭한 곳에 폭발과 음',
    thumbnail: '🎆',
    category: 'sound',
    level: 3,
    description: '화면 어디든 클릭하면 폭죽이 터지고, 위치(높이)에 따라 음 높이가 달라짐',
    tags: ['music', 'creative', 'interactive', 'particles'],
    code: `from vpython import *
import random
import math

# 클릭 위치의 y좌표 → 음 높이 (위쪽=고음, 아래쪽=저음)
# 클릭 위치의 x좌표 → 색조
# 폭죽이 사방으로 퍼져 나갑니다.
# ──────────────────────────────────────────

scene.background = vector(0.02, 0.02, 0.1)
scene.center = vector(0, 0, 0)
scene.range = 5

label(pos=vector(0, 4.2, 0),
      text='어디든 클릭! 위쪽=높은 음, 아래쪽=낮은 음',
      color=color.white, height=16)

# 폭죽 입자 풀 (원형 보관해 재사용)
particles = []
MAX_PARTICLES = 200

# 음 후보
note_pool = [note.C4, note.D4, note.E4, note.G4, note.A4,
             note.C5, note.D5, note.E5, note.G5, note.A5,
             note.C6]

def on_click(evt):
    if evt.pos is None:
        return
    cx, cy, cz = evt.pos.x, evt.pos.y, evt.pos.z
    # y좌표를 음 인덱스로 매핑 (-3 ~ +3 → 0 ~ 10)
    idx = int((cy + 3) / 6 * (len(note_pool) - 1))
    idx = max(0, min(len(note_pool) - 1, idx))
    freq = note_pool[idx]
    # 색은 x좌표로
    hue_idx = int((cx + 4) / 8 * len(무지개))
    hue_idx = max(0, min(len(무지개) - 1, hue_idx))
    col = 무지개[hue_idx]

    # 사운드 + 폭죽 입자 20개
    sound(freq, 0.4, 'triangle', 0.3)
    for _ in range(20):
        ang = random.uniform(0, 2 * math.pi)
        sp = random.uniform(0.05, 0.18)
        vx = sp * math.cos(ang)
        vy = sp * math.sin(ang)
        s = sphere(pos=vector(cx, cy, cz), radius=0.06,
                   color=col, emissive=True)
        s.velocity = vector(vx, vy, 0)
        s.life = 30  # 30프레임 후 소멸
        particles.append(s)

scene.bind('click', on_click)

# 입자 업데이트 무한 루프
while True:
    rate(60)
    alive = []
    for p in particles:
        p.pos = p.pos + p.velocity
        p.velocity = p.velocity + vector(0, -0.005, 0)  # 중력
        p.life -= 1
        p.opacity = p.life / 30
        if p.life > 0:
            alive.append(p)
        else:
            p.visible = False
    particles[:] = alive
`
  },

  {
    id: 'music-mario-dance',
    title: '슈퍼마리오 테마 — 도형 댄스',
    thumbnail: '🍄',
    category: 'sound',
    level: 2,
    description: '실제 슈퍼마리오 메인 테마 멜로디에 맞춰 도형들이 점프하며 무한히 춤춘다',
    tags: ['music', 'creative', 'game', 'mario'],
    code: `from vpython import *

# Super Mario Bros. 메인 테마(코지로 콘도, 1985)의 도입부.
# (음, 박자) 튜플 시퀀스로 표현 — None은 쉼표.
# ──────────────────────────────────────────

scene.background = vector(0.02, 0.02, 0.08)
scene.center = vector(0, 0, 0)
scene.range = 5

# 6개 도형
shapes = []
shape_specs = [
    ('sphere',    color.red),
    ('box',       color.orange),
    ('cone',      color.yellow),
    ('cylinder',  color.green),
    ('pyramid',   color.cyan),
    ('ellipsoid', color.purple),
]
for i, (kind, col) in enumerate(shape_specs):
    x = (i - 2.5) * 1.3
    if kind == 'sphere':
        s = sphere(pos=vector(x, 0, 0), radius=0.4, color=col, emissive=True)
    elif kind == 'box':
        s = box(pos=vector(x, 0, 0), size=vector(0.7, 0.7, 0.7), color=col, emissive=True)
    elif kind == 'cone':
        s = cone(pos=vector(x, 0, 0), radius=0.4, axis=vector(0, 0.8, 0), color=col, emissive=True)
    elif kind == 'cylinder':
        s = cylinder(pos=vector(x, 0, 0), radius=0.3, axis=vector(0, 0.8, 0), color=col, emissive=True)
    elif kind == 'pyramid':
        s = pyramid(pos=vector(x, 0, 0), size=vector(0.8, 0.6, 0.6), axis=vector(0, 1, 0), color=col, emissive=True)
    else:
        s = ellipsoid(pos=vector(x, 0, 0), size=vector(0.5, 0.8, 0.5), color=col, emissive=True)
    shapes.append(s)

label(pos=vector(0, 3.5, 0), text='🍄 Super Mario — Main Theme',
      color=color.white, height=20)

# Super Mario Bros. — Overworld Theme A섹션 전체 (Koji Kondo, 1985)
# 샵/플랫은 note 클래스에 없어 주파수 직접 사용
Bb4 = 466.16   # = A#4
Fs5 = 739.99   # = F#5
Gs4 = 415.30   # = G#4

# 박자 1 = 0.13초 (BPM ~230)
BEAT = 0.13

# (주파수 또는 None, 박자수)
M = [
    # ── 인트로 (4마디) ─────────────────────
    (note.E5, 1), (note.E5, 1), (None, 1), (note.E5, 1),
    (None, 1),    (note.C5, 1), (note.E5, 1), (None, 1),
    (note.G5, 1), (None, 3),    (note.G4, 1), (None, 3),

    # ── 메인 멜로디 1차 (8마디) ────────────
    (note.C5, 2), (None, 1),    (note.G4, 2), (None, 1),    (note.E4, 2), (None, 2),
    (note.A4, 2), (None, 1),    (note.B4, 2), (None, 1),    (Bb4, 1),     (note.A4, 2),
    (note.G4, 1), (note.E5, 1), (note.G5, 1), (note.A5, 1), (None, 1),    (note.F5, 1), (note.G5, 1), (None, 1),
    (note.E5, 1), (None, 1),    (note.C5, 1), (note.D5, 1), (note.B4, 1), (None, 3),

    # ── 메인 멜로디 2차 반복 (8마디) ────────
    (note.C5, 2), (None, 1),    (note.G4, 2), (None, 1),    (note.E4, 2), (None, 2),
    (note.A4, 2), (None, 1),    (note.B4, 2), (None, 1),    (Bb4, 1),     (note.A4, 2),
    (note.G4, 1), (note.E5, 1), (note.G5, 1), (note.A5, 1), (None, 1),    (note.F5, 1), (note.G5, 1), (None, 1),
    (note.E5, 1), (None, 1),    (note.C5, 1), (note.D5, 1), (note.B4, 1), (None, 3),

    # ── 변주 섹션 (8마디) ───────────────────
    (None, 4),    (note.G5, 1), (Fs5, 1),     (note.F5, 1), (note.E5, 2), (Gs4, 1),     (note.A4, 1),
    (note.C5, 1), (None, 1),    (note.A4, 1), (note.C5, 1), (note.D5, 2),
    (None, 4),    (note.G5, 1), (Fs5, 1),     (note.F5, 1), (note.E5, 2), (note.C6, 1), (None, 1),
    (note.C6, 1), (note.C6, 4),

    # ── 변주 반복 (8마디) ───────────────────
    (None, 4),    (note.G5, 1), (Fs5, 1),     (note.F5, 1), (note.E5, 2), (Gs4, 1),     (note.A4, 1),
    (note.C5, 1), (None, 1),    (note.A4, 1), (note.C5, 1), (note.D5, 2),
    (None, 4),    (note.E5, 2), (note.C5, 2), (note.A4, 2), (note.G4, 4),
]

# 무한 반복 — 풀 곡 끝까지, 그 다음 다시
while True:
    for i, (freq, beats) in enumerate(M):
        dur = BEAT * beats
        if freq is not None:
            sound(freq, dur*0.85, 'square', 0.18)
            # 박자에 맞춰 도형 하나가 점프
            s = shapes[i % len(shapes)]
            s.pos = vector(s.pos.x, 0.6, s.pos.z)
            sleep(dur*0.5)
            s.pos = vector(s.pos.x, 0, s.pos.z)
            sleep(dur*0.5)
        else:
            sleep(dur)
    sleep(1.0)  # 다음 반복 전 잠깐 쉼
`
  },

  // ── 실제 동요 / 게임 음악 ────────────────
  {
    id: 'music-childrens-songs',
    title: '동요 모음 — 학교종, 산토끼, Twinkle, 생일축하',
    thumbnail: '🎵',
    category: 'sound',
    level: 1,
    description: '버튼 4개를 눌러 동요를 듣고, 각 음에 맞춰 도형이 통통 튄다',
    tags: ['music', 'song', 'children', 'button'],
    code: `from vpython import *

# 4개 버튼 중 하나를 클릭하면 해당 동요가 재생되며
# 음에 맞춰 정중앙의 공이 점프합니다.
# 동요는 (주파수, 박자) 시퀀스로 코딩되어 있습니다.
# ──────────────────────────────────────────

scene.background = vector(0.95, 0.96, 0.99)
scene.range = 4

# 점프하는 공
ball = sphere(pos=vector(0, 0, 0), radius=0.5,
              color=color.coral, emissive=True)

label(pos=vector(0, 2.5, 0),
      text='우상단 버튼으로 동요를 골라보세요!',
      color=color.black, height=16)

# 샵/플랫 (note 클래스에 없음)
Bb4 = 466.16   # A#4

# 동요 데이터: (음, 박자수). 모두 풀버전 (1절+2절 또는 A+B+A)

# 학교종 — 1절 + 2절
SCHOOL_BELL = [
    # 1절: 학교종이 땡땡땡, 어서 모이자
    (note.G4, 1), (note.G4, 1), (note.A4, 1), (note.A4, 1),
    (note.G4, 1), (note.G4, 1), (note.E4, 2),
    (note.G4, 1), (note.G4, 1), (note.E4, 1), (note.E4, 1), (note.D4, 2),
    # 2절: 선생님이 우리를, 기다리신다
    (note.G4, 1), (note.G4, 1), (note.A4, 1), (note.A4, 1),
    (note.G4, 1), (note.G4, 1), (note.E4, 2),
    (note.G4, 1), (note.E4, 1), (note.E4, 1), (note.D4, 1), (note.C4, 2),
]

# 산토끼 — 1절 + 2절
SAN_TOKKI = [
    # 1절: 산토끼 토끼야, 어디를 가느냐
    (note.G4, 1), (note.E4, 1), (note.E4, 1), (note.F4, 1), (note.D4, 1), (note.D4, 1),
    (note.C4, 1), (note.D4, 1), (note.E4, 1), (note.F4, 1), (note.G4, 1), (note.G4, 1), (note.G4, 2),
    # 2절: 깡충깡충 뛰면서, 어디를 가느냐
    (note.G4, 1), (note.G4, 1), (note.E4, 1), (note.E4, 1),
    (note.G4, 1), (note.G4, 1), (note.E4, 2),
    (note.C4, 1), (note.D4, 1), (note.E4, 1), (note.F4, 1), (note.G4, 1), (note.G4, 1), (note.G4, 2),
]

# Twinkle Twinkle Little Star — A + B + A 풀버전
TWINKLE = [
    # A: 반짝반짝 작은별
    (note.C4, 1), (note.C4, 1), (note.G4, 1), (note.G4, 1),
    (note.A4, 1), (note.A4, 1), (note.G4, 2),
    (note.F4, 1), (note.F4, 1), (note.E4, 1), (note.E4, 1),
    (note.D4, 1), (note.D4, 1), (note.C4, 2),
    # B: Up above the world so high / Like a diamond in the sky
    (note.G4, 1), (note.G4, 1), (note.F4, 1), (note.F4, 1),
    (note.E4, 1), (note.E4, 1), (note.D4, 2),
    (note.G4, 1), (note.G4, 1), (note.F4, 1), (note.F4, 1),
    (note.E4, 1), (note.E4, 1), (note.D4, 2),
    # A 반복: 반짝반짝 작은별
    (note.C4, 1), (note.C4, 1), (note.G4, 1), (note.G4, 1),
    (note.A4, 1), (note.A4, 1), (note.G4, 2),
    (note.F4, 1), (note.F4, 1), (note.E4, 1), (note.E4, 1),
    (note.D4, 1), (note.D4, 1), (note.C4, 2),
]

# Happy Birthday — 4구절 풀버전
HAPPY_BIRTHDAY = [
    # 1: Happy birthday to you
    (note.C4, 1), (note.C4, 1), (note.D4, 2), (note.C4, 2), (note.F4, 2), (note.E4, 4),
    # 2: Happy birthday to you
    (note.C4, 1), (note.C4, 1), (note.D4, 2), (note.C4, 2), (note.G4, 2), (note.F4, 4),
    # 3: Happy birthday dear ___
    (note.C4, 1), (note.C4, 1), (note.C5, 2), (note.A4, 2), (note.F4, 2), (note.E4, 2), (note.D4, 2),
    # 4: Happy birthday to you (마지막)
    (Bb4, 1),     (Bb4, 1),     (note.A4, 2), (note.F4, 2), (note.G4, 2), (note.F4, 4),
]

# 재생 요청 큐 (버튼 콜백은 짧게 유지)
state = {'queue': None, 'name': ''}

def request(song, name):
    state['queue'] = song
    state['name'] = name

button(text='🔔 학교종', bind=lambda e: request(SCHOOL_BELL, '학교종'))
button(text='🐰 산토끼', bind=lambda e: request(SAN_TOKKI, '산토끼'))
button(text='⭐ Twinkle', bind=lambda e: request(TWINKLE, 'Twinkle Twinkle'))
button(text='🎂 생일축하', bind=lambda e: request(HAPPY_BIRTHDAY, '생일축하'))

# 메인 루프 — 큐에 곡이 들어오면 재생
BEAT = 0.28
while True:
    rate(30)
    if state['queue'] is not None:
        song = state['queue']
        state['queue'] = None
        ball.color = color.gold
        for freq, beats in song:
            dur = BEAT * beats
            sound(freq, dur*0.85, 'sine', 0.32)
            ball.pos = vector(0, 0.5, 0)
            sleep(dur * 0.4)
            ball.pos = vector(0, 0, 0)
            sleep(dur * 0.6)
        ball.color = color.coral
        print(f'🎵 {state["name"]} 연주 끝')
`
  },

  {
    id: 'music-game-themes',
    title: '게임 음악 모음 — Mario, Tetris, Pac-Man',
    thumbnail: '🎮',
    category: 'sound',
    level: 2,
    description: '버튼으로 클래식 게임 BGM을 골라 듣고, 박자에 맞춰 도형 폭죽이 터진다',
    tags: ['music', 'game', 'retro', 'button'],
    code: `from vpython import *
import random

# 80~90년대 게임 BGM은 구형 오실레이터(square/sawtooth)로 만들어졌습니다.
# 칩튠(chiptune) 사운드를 재현합니다.
# ──────────────────────────────────────────

scene.background = vector(0.02, 0.03, 0.08)
scene.range = 5

label(pos=vector(0, 3.5, 0),
      text='🎮 클래식 게임 BGM',
      color=color.white, height=22)
label(pos=vector(0, 2.7, 0),
      text='버튼을 눌러 곡을 골라보세요',
      color=color.gray, height=14)

# 샵/플랫 주파수 (note 클래스에 없어 직접 정의)
Bb4 = 466.16   # A#4
Fs5 = 739.99   # F#5
Gs4 = 415.30   # G#4

# === Super Mario Bros. — Overworld Theme A섹션 풀버전 (Koji Kondo, 1985) ===
MARIO = [
    # 인트로
    (note.E5, 1), (note.E5, 1), (None, 1), (note.E5, 1),
    (None, 1),    (note.C5, 1), (note.E5, 1), (None, 1),
    (note.G5, 1), (None, 3),    (note.G4, 1), (None, 3),
    # 메인 멜로디 1차
    (note.C5, 2), (None, 1),    (note.G4, 2), (None, 1),    (note.E4, 2), (None, 2),
    (note.A4, 2), (None, 1),    (note.B4, 2), (None, 1),    (Bb4, 1),     (note.A4, 2),
    (note.G4, 1), (note.E5, 1), (note.G5, 1), (note.A5, 1), (None, 1),    (note.F5, 1), (note.G5, 1), (None, 1),
    (note.E5, 1), (None, 1),    (note.C5, 1), (note.D5, 1), (note.B4, 1), (None, 3),
    # 메인 멜로디 2차 (반복)
    (note.C5, 2), (None, 1),    (note.G4, 2), (None, 1),    (note.E4, 2), (None, 2),
    (note.A4, 2), (None, 1),    (note.B4, 2), (None, 1),    (Bb4, 1),     (note.A4, 2),
    (note.G4, 1), (note.E5, 1), (note.G5, 1), (note.A5, 1), (None, 1),    (note.F5, 1), (note.G5, 1), (None, 1),
    (note.E5, 1), (None, 1),    (note.C5, 1), (note.D5, 1), (note.B4, 1), (None, 3),
    # 변주
    (None, 4),    (note.G5, 1), (Fs5, 1),     (note.F5, 1), (note.E5, 2), (Gs4, 1),     (note.A4, 1),
    (note.C5, 1), (None, 1),    (note.A4, 1), (note.C5, 1), (note.D5, 2),
    (None, 4),    (note.G5, 1), (Fs5, 1),     (note.F5, 1), (note.E5, 2), (note.C6, 1), (None, 1),
    (note.C6, 1), (note.C6, 4),
]

# === Tetris (Korobeiniki) — A섹션 풀버전 ===
TETRIS = [
    # A 섹션 1차
    (note.E5, 2), (note.B4, 1), (note.C5, 1), (note.D5, 2), (note.C5, 1), (note.B4, 1),
    (note.A4, 2), (note.A4, 1), (note.C5, 1), (note.E5, 2), (note.D5, 1), (note.C5, 1),
    (note.B4, 3), (note.C5, 1), (note.D5, 2), (note.E5, 2),
    (note.C5, 2), (note.A4, 2), (note.A4, 4),
    # B 섹션
    (note.D5, 3), (note.F5, 1), (note.A5, 2), (note.G5, 1), (note.F5, 1),
    (note.E5, 3), (note.C5, 1), (note.E5, 2), (note.D5, 1), (note.C5, 1),
    (note.B4, 2), (note.B4, 1), (note.C5, 1), (note.D5, 2), (note.E5, 2),
    (note.C5, 2), (note.A4, 2), (note.A4, 4),
    # A 섹션 반복
    (note.E5, 2), (note.B4, 1), (note.C5, 1), (note.D5, 2), (note.C5, 1), (note.B4, 1),
    (note.A4, 2), (note.A4, 1), (note.C5, 1), (note.E5, 2), (note.D5, 1), (note.C5, 1),
    (note.B4, 3), (note.C5, 1), (note.D5, 2), (note.E5, 2),
    (note.C5, 2), (note.A4, 2), (note.A4, 4),
]

# === Pac-Man — Coffee Break (intro) 확장 ===
PACMAN = [
    # 첫 모티프
    (note.B4, 1), (note.B5, 1), (Fs5, 1),     (note.D5, 1),
    (note.B5, 1), (Fs5, 1),     (note.D5, 2),
    (note.C5, 1), (note.C6, 1), (note.G5, 1), (note.E5, 1),
    (note.C6, 1), (note.G5, 1), (note.E5, 2),
    # 두 번째 모티프 (하강)
    (note.B4, 1), (Bb4, 1),     (note.A4, 1), (Gs4, 1),
    (note.A4, 1), (Bb4, 1),     (note.B4, 1), (note.C5, 1),
    # 세 번째 모티프
    (note.D5, 1), (note.E5, 1), (note.F5, 1), (note.G5, 1),
    (note.A5, 2), (note.G5, 1), (note.F5, 1),
    (note.E5, 2), (note.D5, 1), (note.C5, 1),
    (note.B4, 4),
    # 첫 모티프 반복
    (note.B4, 1), (note.B5, 1), (Fs5, 1),     (note.D5, 1),
    (note.B5, 1), (Fs5, 1),     (note.D5, 2),
    (note.C5, 1), (note.C6, 1), (note.G5, 1), (note.E5, 1),
    (note.C6, 1), (note.G5, 1), (note.E5, 4),
]

state = {'queue': None, 'name': ''}

def request(song, name, fx='square'):
    state['queue'] = (song, fx)
    state['name'] = name

button(text='🍄 Mario',   bind=lambda e: request(MARIO,  'Super Mario Bros.', 'square'))
button(text='🧱 Tetris',  bind=lambda e: request(TETRIS, 'Tetris (Korobeiniki)', 'sawtooth'))
button(text='🟡 Pac-Man', bind=lambda e: request(PACMAN, 'Pac-Man', 'triangle'))

# 박자마다 폭죽
particles = []
def burst(col):
    import math as m
    for _ in range(10):
        ang = random.uniform(0, 2*m.pi)
        sp = random.uniform(0.04, 0.12)
        s = sphere(pos=vector(0, 0, 0), radius=0.08, color=col, emissive=True)
        s.velocity = vector(sp*m.cos(ang), sp*m.sin(ang), 0)
        s.life = 30
        particles.append(s)

BEAT = 0.16
while True:
    rate(60)
    # 입자 업데이트
    alive = []
    for p in particles:
        p.pos = p.pos + p.velocity
        p.velocity = p.velocity + vector(0, -0.003, 0)
        p.life -= 1
        p.opacity = max(0, p.life / 30)
        if p.life > 0: alive.append(p)
        else: p.visible = False
    particles[:] = alive

    # 곡 재생 요청 처리
    if state['queue'] is not None:
        song, fx = state['queue']
        state['queue'] = None
        print(f'🎮 {state["name"]} 시작')
        for freq, beats in song:
            dur = BEAT * beats
            if freq is not None:
                sound(freq, dur*0.85, fx, 0.18)
                # 음 높이별 색
                hue = int(((freq - 200) / 600) * 6) % 7
                burst(무지개[hue])
            sleep(dur)
        print(f'🎮 {state["name"]} 종료')
`
  },

  // ── 피아노 레코더 (메인 인터랙티브) ────────
  {
    id: 'music-piano-recorder',
    title: '🎹 피아노 레코더 — 연주하고 다른 악기로 재생',
    thumbnail: '🎼',
    category: 'sound',
    level: 3,
    description: '피아노 건반을 클릭해 멜로디를 만들고, 악기를 바꿔 같은 멜로디를 다시 듣는다',
    tags: ['music', 'piano', 'recorder', 'instrument', 'creative'],
    code: `from vpython import *
import time

# === 피아노 레코더 ===
# 1) 건반을 클릭해 자유롭게 연주합니다.
# 2) 클릭한 음과 시간 간격이 자동으로 기록됩니다.
# 3) "▶ 재생" 버튼 → 같은 멜로디가 현재 선택된 악기로 다시 들립니다.
# 4) 메뉴로 악기를 바꿔보세요 — 같은 멜로디가 완전히 다르게 들립니다.
# 5) "🗑 지우기"로 처음부터 다시.
# ──────────────────────────────────────────

scene.background = vector(0.96, 0.96, 1.0)
scene.center = vector(0, 0, 0)
scene.range = 4

# 건반 정의: (한글이름, 영문음표 객체, 주파수, 색)
KEYS = [
    ('도', '도', note.C4, color.red),
    ('레', '레', note.D4, color.orange),
    ('미', '미', note.E4, color.yellow),
    ('파', '파', note.F4, color.green),
    ('솔', '솔', note.G4, color.cyan),
    ('라', '라', note.A4, color.blue),
    ('시', '시', note.B4, color.purple),
    ('도↑', '높은도', note.C5, color.magenta),
]

# 건반 박스 + id로 매핑
key_map = {}  # mesh_id → (이름_한글, 음표명, 주파수, 박스, 기본_y)
x = -3.5
for ko, name_for_play, freq, col in KEYS:
    b = box(pos=vector(x, 0, 0),
            size=vector(0.85, 1.6, 0.5),
            color=col, emissive=True)
    label(pos=vector(x, -1.3, 0), text=ko,
          color=color.black, height=18)
    key_map[b._id] = {'name': name_for_play, 'freq': freq, 'box': b, 'base_y': 0}
    x += 1

# 헤더 라벨
title_label = label(pos=vector(0, 2.6, 0),
      text='🎹 건반을 클릭해 멜로디를 만드세요',
      color=color.black, height=20)
status_label = label(pos=vector(0, 2.0, 0),
      text='기록된 음: 0개',
      color=color.gray, height=14)

# 상태
state = {
    'recording': [],     # [(name, t_offset), ...]
    'first_time': None,  # 첫 음의 절대 시각(초)
    'instrument': 'piano',
    'request': None,     # 'play' | 'clear' | None
    'playing': False,
    'last_pressed_id': None,
}

INSTRUMENTS = ['피아노', '플루트', '기타', '오르간', '신스', '베이스', '트럼펫', '칩튠']

def update_status():
    inst = state['instrument']
    n = len(state['recording'])
    status_label.text = f'기록된 음: {n}개  ·  악기: {inst}'

# 건반 클릭 이벤트
def on_click(evt):
    if state['playing']:
        return
    pick = evt.pick
    if pick not in key_map:
        return
    k = key_map[pick]
    # 즉시 음 재생 (피아노 음색 — sine + 짧은 attack)
    sound(k['freq'], 0.4, 'sine', 0.32)
    # 박스 점프 표시
    k['box'].pos = vector(k['box'].pos.x, k['base_y'] + 0.3, k['box'].pos.z)
    state['last_pressed_id'] = pick

    # 기록 (시각 = 첫 음 기준 상대 초)
    now = time.time()
    if state['first_time'] is None:
        state['first_time'] = now
    t_offset = now - state['first_time']
    state['recording'].append((k['name'], t_offset))
    update_status()

scene.bind('click', on_click)

# 재생/지우기/악기 변경 — 콜백은 짧게 (메인 루프가 처리)
def on_play(evt):
    if state['playing'] or not state['recording']:
        return
    state['request'] = 'play'

def on_clear(evt):
    state['request'] = 'clear'

def on_instrument(evt):
    # menu의 evt.value는 한글 이름
    state['instrument'] = evt.value
    update_status()

button(text='▶ 재생', bind=on_play)
button(text='🗑 지우기', bind=on_clear)
menu(choices=INSTRUMENTS, selected='피아노', bind=on_instrument)

print('💡 팁: 건반을 클릭해 멜로디를 만들고, 악기를 바꿔가며 ▶ 재생 해보세요.')
print('💡 같은 멜로디가 피아노/플루트/기타/칩튠 등으로 완전히 다르게 들립니다.')

# 메인 루프 — 박스 복귀 + 명령 처리
while True:
    rate(60)

    # 모든 박스를 base 위치로 부드럽게 복귀
    for k in key_map.values():
        b = k['box']
        if b.pos.y > k['base_y'] + 0.005:
            b.pos = vector(b.pos.x, b.pos.y - 0.04, b.pos.z)
        elif b.pos.y < k['base_y']:
            b.pos = vector(b.pos.x, k['base_y'], b.pos.z)

    # 명령 처리
    req = state['request']
    if req == 'clear':
        state['recording'] = []
        state['first_time'] = None
        state['request'] = None
        title_label.text = '🎹 건반을 클릭해 멜로디를 만드세요'
        update_status()
        print('🗑 기록을 지웠습니다.')

    elif req == 'play' and state['recording'] and not state['playing']:
        state['playing'] = True
        state['request'] = None
        title_label.text = f'▶ {state["instrument"]} 연주 중...'
        rec = state['recording']
        prev_t = 0
        for i, (name, t) in enumerate(rec):
            wait = max(0.05, t - prev_t)
            prev_t = t
            sleep(wait)
            # 악기로 같은 음 재생 (play_instrument는 sync 버전)
            try:
                play_instrument(state['instrument'], name, 0.4)
            except Exception:
                # fallback: 주파수로 직접 재생
                for k in key_map.values():
                    if k['name'] == name:
                        sound(k['freq'], 0.4, 'sine', 0.3)
                        break
            # 해당 건반 점프 표시
            for kid, k in key_map.items():
                if k['name'] == name:
                    k['box'].pos = vector(k['box'].pos.x, k['base_y'] + 0.3, k['box'].pos.z)
                    break
        state['playing'] = False
        title_label.text = '🎹 건반을 클릭해 멜로디를 만드세요'
        print(f'▶ {state["instrument"]} 연주 끝.')
`
  },

  // ── 무한 반복 / 생성 (1) ────────────────
  {
    id: 'music-endless-cosmos',
    title: '끝없는 우주 멜로디 — 자동 생성 음악-아트',
    thumbnail: '🌌',
    category: 'sound',
    level: 3,
    description: '자동으로 멜로디가 끝없이 흘러나오고, 음마다 별이 우주에 추가됩니다',
    tags: ['music', 'creative', 'generative', 'infinite'],
    code: `from vpython import *
import random
import math

# 펜타토닉 음계(5음계)는 어떻게 조합해도 어울립니다 — "잘못된 음"이 없음.
# 무작위로 골라도 항상 듣기 좋은 멜로디가 생성됩니다.
# 음마다 우주에 별 하나 추가 → 영원히 자라는 음악-우주.
# ──────────────────────────────────────────

scene.background = vector(0.01, 0.01, 0.05)
scene.center = vector(0, 0, 0)
scene.range = 8

# 펜타토닉 음계 (5음 + 옥타브)
pentatonic = [note.C4, note.D4, note.E4, note.G4, note.A4,
              note.C5, note.D5, note.E5, note.G5, note.A5]

# 별이 추가될 때 색상 — 따뜻한색 ↔ 차가운색 교차
warm = [color.red, color.orange, color.yellow, color.gold]
cool = [color.cyan, color.blue, color.purple, color.violet]

label(pos=vector(0, 6.5, 0),
      text='끝없는 우주 멜로디 — 듣고 보세요',
      color=color.white, height=18)

stars = []  # 누적된 별들 (회전 애니메이션용)
counter = 0

while True:
    # 무작위 음 + 길이 + 옥타브
    freq = random.choice(pentatonic)
    dur = random.choice([0.2, 0.3, 0.4, 0.6])

    # 음을 우주의 위치로 매핑: 주파수가 높을수록 위로
    y = (freq - 200) / 100  # 대략 0 ~ 10
    angle = counter * 0.3   # 회전 각
    radius = 3 + (counter % 50) * 0.05
    x = radius * math.cos(angle)
    z = radius * math.sin(angle)

    # 따뜻색/차가운색 교차
    palette = warm if counter % 2 == 0 else cool
    col = random.choice(palette)

    # 별 추가
    s = sphere(pos=vector(x, y, z),
               radius=0.08 + dur*0.1,
               color=col, emissive=True)
    stars.append(s)
    # 별 너무 많아지면 가장 오래된 것 제거 (메모리 절약)
    if len(stars) > 200:
        old = stars.pop(0)
        old.visible = False

    # 음 재생 — 악기 음색을 랜덤으로 (sine/triangle/square/sawtooth)
    timbre = random.choice(['sine', 'triangle', 'square', 'sawtooth'])
    sound(freq, dur, timbre, 0.18)

    sleep(dur * 0.7)
    counter += 1
`
  },

  // ═══════════════════════════════════════
  // 💡 빛 + 음악 창의 (9개) — 에이전트 팀 설계
  // ═══════════════════════════════════════
  {
    id: 'lightshow-aurora-symphony',
    title: '오로라 심포니 - 하늘에서 춤추는 빛의 교향곡',
    thumbnail: '🌌',
    category: 'art',
    level: 2,
    description: '오로라처럼 흐르는 빛 커튼이 화음에 맞춰 색과 높이를 바꿔요!',
    tags: ['light', 'music', 'aurora', 'wave', 'harmony'],
    code: `from vpython import *
import math

# 우주 배경 - 깊은 밤하늘
scene.background = vector(0.02, 0.02, 0.08)
scene.range = 18

# 타이틀 라벨
label(pos=vector(0, 12, 0), text="🎶 오로라 심포니 🎶", color=color.cyan, height=22)
label(pos=vector(0, 10, 0), text="화음에 맞춰 오로라가 춤춥니다", color=color.white, height=14)

# 별 만들기 - 배경에 작은 점들 흩뿌리기
stars = []
for i in range(80):
    star_x = (i * 7 % 40) - 20
    star_y = (i * 11 % 20) - 10
    star_z = -15 - (i % 5)
    star = sphere(pos=vector(star_x, star_y, star_z), radius=0.08,
                  color=color.white, emissive=True)
    stars.append(star)

# 오로라 커튼 - 가로로 늘어선 구체 30개
aurora_count = 30
aurora_balls = []
aurora_lights = []
for i in range(aurora_count):
    x = (i - aurora_count / 2) * 1.2
    ball = sphere(pos=vector(x, 0, 0), radius=0.5,
                  color=color.cyan, emissive=True, opacity=0.7)
    aurora_balls.append(ball)
    if i % 2 == 0:
        light = local_light(pos=vector(x, 0, 0), color=color.cyan, intensity=0.4)
        aurora_lights.append(light)

# 바닥 반사판
floor = box(pos=vector(0, -8, 0), size=vector(40, 0.2, 20),
            color=vector(0.05, 0.05, 0.1), opacity=0.6)

# 화음 시퀀스
chords_seq = [
    [note.C4, note.E4, note.G4],
    [note.D4, note.F4, note.A4],
    [note.E4, note.G4, note.B4],
    [note.F4, note.A4, note.C5],
]

beat_time = 0
chord_idx = 0
last_chord_beat = -1

while True:
    rate(60)
    beat_time += 1

    if beat_time % 90 == 0 and beat_time != last_chord_beat:
        chord(chords_seq[chord_idx], 1.4, 'sine', 0.4)
        chord_idx = (chord_idx + 1) % len(chords_seq)
        last_chord_beat = beat_time

    t = beat_time * 0.05
    for i in range(aurora_count):
        wave_y = math.sin(t + i * 0.4) * 3
        wave_z = math.cos(t * 0.7 + i * 0.3) * 2
        x = (i - aurora_count / 2) * 1.2
        aurora_balls[i].pos = vector(x, wave_y, wave_z)
        hue = (i / aurora_count + chord_idx * 0.25 + t * 0.05) % 1.0
        if hue < 0.33:
            col = vector(0.2, 0.6 + hue, 1.0 - hue)
        elif hue < 0.66:
            col = vector(0.5 + (hue - 0.33), 0.3, 1.0)
        else:
            col = vector(1.0, 0.4 + (hue - 0.66) * 0.5, 0.7)
        aurora_balls[i].color = col

    for j in range(len(aurora_lights)):
        idx = j * 2
        if idx < aurora_count:
            aurora_lights[j].color = aurora_balls[idx].color
            aurora_lights[j].pos = aurora_balls[idx].pos
            pulse = (math.sin(t * 2 + j * 0.5) + 1) * 0.3 + 0.2
            aurora_lights[j].intensity = pulse

    for i in range(len(stars)):
        twinkle = (math.sin(t * 3 + i * 0.7) + 1) * 0.5
        stars[i].color = vector(twinkle, twinkle, twinkle * 0.8 + 0.2)
`
  },
  {
    id: 'lightshow-piano-fountain',
    title: '피아노 분수 - 음표가 솟구치는 빛의 분수',
    thumbnail: '🎹',
    category: 'art',
    level: 2,
    description: '피아노 멜로디가 연주될 때마다 색색의 빛 기둥이 분수처럼 솟아올라요!',
    tags: ['light', 'music', 'piano', 'fountain', 'melody'],
    code: `from vpython import *
import math

scene.background = vector(0.05, 0.02, 0.1)
scene.range = 14

label(pos=vector(0, 10, 0), text="🎹 피아노 분수 🎹", color=color.gold, height=20)
label(pos=vector(0, 8.5, 0), text="멜로디가 빛으로 솟아오릅니다", color=color.white, height=12)

stage = cylinder(pos=vector(0, -5, 0), axis=vector(0, 0.3, 0), radius=8,
                 color=vector(0.15, 0.1, 0.2))

nozzle_count = 7
nozzles = []
fountain_particles = []
fountain_lights = []

note_colors = [
    vector(1, 0.2, 0.2),
    vector(1, 0.6, 0.1),
    vector(1, 1, 0.2),
    vector(0.3, 1, 0.3),
    vector(0.2, 0.7, 1),
    vector(0.4, 0.3, 1),
    vector(0.8, 0.3, 1),
]
note_freqs = [note.C4, note.D4, note.E4, note.F4, note.G4, note.A4, note.B4]
note_names = ['도', '레', '미', '파', '솔', '라', '시']

for i in range(nozzle_count):
    angle = (i / nozzle_count) * 2 * math.pi
    nx = math.cos(angle) * 4.5
    nz = math.sin(angle) * 4.5
    nozzle = cylinder(pos=vector(nx, -4.7, nz), axis=vector(0, 0.6, 0), radius=0.3,
                      color=note_colors[i], emissive=True)
    nozzles.append(nozzle)
    label(pos=vector(nx, -3.5, nz), text=note_names[i], color=color.white, height=14)
    particles = []
    for j in range(12):
        p = sphere(pos=vector(nx, -4, nz), radius=0.18,
                   color=note_colors[i], emissive=True, opacity=0.0)
        p.vel_y = 0.0
        p.progress = -1.0
        particles.append(p)
    fountain_particles.append(particles)
    flight = local_light(pos=vector(nx, -4, nz), color=note_colors[i], intensity=0.3)
    fountain_lights.append(flight)

center_light = local_light(pos=vector(0, 4, 0), color=color.white, intensity=0.6)

melody = [0, 1, 2, 0, 0, 1, 2, 0, 2, 3, 4, 2, 3, 4, 4, 3, 2, 1, 0, 4, 3, 2, 1, 0]
melody_idx = 0
beat_time = 0

while True:
    rate(60)
    beat_time += 1
    t = beat_time * 0.05

    if beat_time % 30 == 0:
        nidx = melody[melody_idx % len(melody)]
        sound(note_freqs[nidx], 0.5, 'sine', 0.4)
        activated = 0
        for p in fountain_particles[nidx]:
            if p.progress < 0 and activated < 5:
                p.progress = 0.0
                p.vel_y = 0.25 + (activated * 0.02)
                p.opacity = 1.0
                angle_n = (nidx / nozzle_count) * 2 * math.pi
                p.pos = vector(math.cos(angle_n) * 4.5, -4, math.sin(angle_n) * 4.5)
                activated += 1
        fountain_lights[nidx].intensity = 1.5
        nozzles[nidx].radius = 0.5
        melody_idx += 1

    for i in range(nozzle_count):
        for p in fountain_particles[i]:
            if p.progress >= 0:
                p.vel_y -= 0.008
                p.pos = p.pos + vector(0, p.vel_y, 0)
                p.progress += 0.02
                p.opacity = max(0, 1.0 - p.progress * 0.4)
                if p.pos.y < -4.5:
                    p.progress = -1.0
                    p.opacity = 0
        fountain_lights[i].intensity = max(0.3, fountain_lights[i].intensity * 0.95)
        nozzles[i].radius = max(0.3, nozzles[i].radius * 0.96)

    center_light.color = vector(
        (math.sin(t * 0.3) + 1) * 0.4 + 0.2,
        (math.sin(t * 0.4 + 2) + 1) * 0.4 + 0.2,
        (math.sin(t * 0.5 + 4) + 1) * 0.4 + 0.2
    )
    breath = (math.sin(t * 2) + 1) * 0.05
    stage.color = vector(0.15 + breath, 0.1, 0.2 + breath)
`
  },
  {
    id: 'lightshow-galaxy-disco',
    title: '갤럭시 디스코 - 우주 한복판 댄스 클럽',
    thumbnail: '🪩',
    category: 'art',
    level: 3,
    description: '행성들이 비트에 맞춰 회전하고, 스포트라이트가 디스코 비트를 쏟아냅니다!',
    tags: ['light', 'music', 'disco', 'galaxy', 'beat'],
    code: `from vpython import *
import math

scene.background = vector(0.0, 0.0, 0.02)
scene.range = 16

label(pos=vector(0, 12, 0), text="🪩 갤럭시 디스코 🪩", color=color.magenta, height=22)
label(pos=vector(0, 10.5, 0), text="우주 한복판의 댄스 플로어", color=color.cyan, height=12)

floor_tiles = []
for i in range(9):
    for j in range(9):
        tx = (i - 4) * 1.5
        tz = (j - 4) * 1.5
        tile = box(pos=vector(tx, -5, tz), size=vector(1.3, 0.2, 1.3),
                   color=color.purple, emissive=True, opacity=0.8)
        floor_tiles.append(tile)

mirror_ball = sphere(pos=vector(0, 6, 0), radius=1.2,
                     color=color.white, emissive=True)
mirror_light = local_light(pos=vector(0, 6, 0), color=color.white, intensity=0.5)

planet_count = 6
planets = []
planet_lights = []
planet_colors = [
    vector(1, 0.3, 0.3), vector(1, 1, 0.3), vector(0.3, 1, 0.3),
    vector(0.3, 1, 1), vector(0.3, 0.3, 1), vector(1, 0.3, 1)
]
for i in range(planet_count):
    angle = (i / planet_count) * 2 * math.pi
    px = math.cos(angle) * 7
    pz = math.sin(angle) * 7
    planet = sphere(pos=vector(px, 2, pz), radius=0.7,
                    color=planet_colors[i], emissive=True, make_trail=True,
                    trail_color=planet_colors[i])
    planets.append(planet)
    plight = local_light(pos=vector(px, 2, pz), color=planet_colors[i], intensity=0.6)
    planet_lights.append(plight)

spot_lights = []
spot_cones = []
spot_positions = [vector(-10, 8, -10), vector(10, 8, -10),
                  vector(-10, 8, 10), vector(10, 8, 10)]
spot_colors = [color.red, color.cyan, color.yellow, color.magenta]
for i in range(4):
    sl = local_light(pos=spot_positions[i], color=spot_colors[i], intensity=0.8)
    spot_lights.append(sl)
    sc = cone(pos=spot_positions[i], axis=vector(-spot_positions[i].x * 0.5,
              -spot_positions[i].y * 0.5, -spot_positions[i].z * 0.5),
              radius=2, color=spot_colors[i], emissive=True, opacity=0.15)
    spot_cones.append(sc)

for i in range(60):
    sx = (i * 13 % 50) - 25
    sy = (i * 7 % 30) - 5
    sz = (i * 17 % 50) - 25
    if abs(sx) > 12 or abs(sz) > 12:
        sphere(pos=vector(sx, sy, sz), radius=0.1, color=color.white, emissive=True)

bass_freqs = [note.C4, note.C4, note.G4, note.C4]
high_notes = [note.E5, note.G5, note.C6, note.G5]

beat_time = 0
beat_count = 0

while True:
    rate(60)
    beat_time += 1
    t = beat_time * 0.05

    if beat_time % 24 == 0:
        bidx = beat_count % 4
        chord([bass_freqs[bidx], high_notes[bidx]], 0.3, 'square', 0.35)
        beat_count += 1
        mirror_ball.radius = 1.6
        mirror_light.intensity = 1.5
        for k in range(len(floor_tiles)):
            phase = (k + beat_count * 5) % 4
            if phase == 0:
                floor_tiles[k].color = vector(1, 0.2, 0.5)
            elif phase == 1:
                floor_tiles[k].color = vector(0.2, 1, 0.5)
            elif phase == 2:
                floor_tiles[k].color = vector(0.5, 0.3, 1)
            else:
                floor_tiles[k].color = vector(1, 1, 0.3)

    mirror_ball.radius = max(1.2, mirror_ball.radius * 0.94)
    mirror_light.intensity = max(0.5, mirror_light.intensity * 0.93)

    mb_hue = (t * 0.3) % 1.0
    if mb_hue < 0.5:
        mirror_ball.color = vector(1, mb_hue * 2, 1 - mb_hue * 2)
    else:
        mirror_ball.color = vector(2 - mb_hue * 2, 1 - (mb_hue - 0.5) * 2, mb_hue * 2)
    mirror_light.color = mirror_ball.color

    for i in range(planet_count):
        orbit_angle = t * 0.6 + (i / planet_count) * 2 * math.pi
        py = 2 + math.sin(t * 1.5 + i) * 1.5
        px = math.cos(orbit_angle) * (7 + math.sin(t + i) * 0.5)
        pz = math.sin(orbit_angle) * (7 + math.sin(t + i) * 0.5)
        planets[i].pos = vector(px, py, pz)
        planet_lights[i].pos = vector(px, py, pz)
        beat_pulse = (math.sin(t * 3.14 + i * 0.5) + 1) * 0.4 + 0.3
        planet_lights[i].intensity = beat_pulse
        planets[i].radius = 0.7 + beat_pulse * 0.3

    for i in range(4):
        target_x = math.cos(t * 0.8 + i * 1.5) * 5
        target_z = math.sin(t * 0.8 + i * 1.5) * 5
        sp = spot_positions[i]
        new_axis = vector(target_x - sp.x, -5 - sp.y, target_z - sp.z) * 0.5
        spot_cones[i].axis = new_axis
        hue_shift = (t * 0.2 + i * 0.25) % 1.0
        if hue_shift < 0.33:
            new_col = vector(1, hue_shift * 3, 0.2)
        elif hue_shift < 0.66:
            new_col = vector(1 - (hue_shift - 0.33) * 3, 1, 0.2)
        else:
            new_col = vector(0.3, 1 - (hue_shift - 0.66) * 3, 1)
        spot_lights[i].color = new_col
        spot_cones[i].color = new_col
        spot_lights[i].intensity = 0.6 + (math.sin(t * 4 + i) + 1) * 0.4
`
  },
  {
    id: 'synesthesia-color-piano',
    title: '색채 피아노 - 클릭으로 빛과 음을 동시에',
    thumbnail: '🎹',
    category: 'creative',
    level: 2,
    description: '무지개 건반을 클릭하면 그 색이 무대에 빛나고 동시에 도레미파솔라시 음이 울립니다.',
    tags: ['synesthesia', 'music', 'interactive'],
    code: `from vpython import *

scene.background = vector(0.05, 0.05, 0.1)
scene.range = 6
scene.center = vector(0, 0, 0)

label(pos=vector(0, 4.5, 0), text='무지개 건반을 클릭하세요! 색=음', height=18, color=color.white)
label(pos=vector(0, 3.8, 0), text='스페이스: 자동연주 / 1~7: 키보드 연주', height=14, color=vector(0.8, 0.8, 1))

계이름 = ['도', '레', '미', '파', '솔', '라', '시']
주파수 = [note.C4, note.D4, note.E4, note.F4, note.G4, note.A4, note.B4]

건반들 = []
for i in range(7):
    x = (i - 3) * 1.4
    건반 = box(pos=vector(x, 0, 0), size=vector(1.2, 2.0, 0.4),
                color=무지개[i], emissive=False)
    건반들.append(건반)
    label(pos=vector(x, -1.5, 0), text=계이름[i], height=14, color=color.white)

중앙구 = sphere(pos=vector(0, 2.2, 0), radius=0.6,
                 color=color.white, emissive=True)
중앙빛 = local_light(pos=vector(0, 2.2, 0), color=color.white, intensity=0.5)

state = {'queue': []}

def on_click(evt):
    if evt.pick is not None:
        state['queue'].append(('click', evt.pick))

def on_key(evt):
    state['queue'].append(('key', evt.key))

scene.bind('click', on_click)
scene.bind('keydown', on_key)

자동 = {'on': False, 'idx': 0, 'tick': 0}

def 음재생(i):
    sound(주파수[i], 0.4, 'sine', 0.5)
    중앙구.color = 무지개[i]
    중앙빛.color = 무지개[i]
    건반들[i].emissive = True
    건반들[i].pos = vector(건반들[i].pos.x, -0.3, 0)

프레임 = 0
while True:
    rate(30)
    프레임 += 1

    while state['queue']:
        종류, 값 = state['queue'].pop(0)
        if 종류 == 'click':
            for i, 건반 in enumerate(건반들):
                if 건반._id == 값:
                    음재생(i)
                    break
        elif 종류 == 'key':
            키 = 값
            if 키 == ' ':
                자동['on'] = not 자동['on']
                자동['idx'] = 0
                자동['tick'] = 0
            elif 키 in ['1','2','3','4','5','6','7']:
                음재생(int(키)-1)

    if 자동['on']:
        자동['tick'] += 1
        if 자동['tick'] >= 15:
            자동['tick'] = 0
            음재생(자동['idx'])
            자동['idx'] = (자동['idx'] + 1) % 7

    for 건반 in 건반들:
        if 건반.pos.y < 0:
            건반.pos = vector(건반.pos.x, 건반.pos.y + 0.05, 0)
        if 건반.emissive and 프레임 % 5 == 0:
            건반.emissive = False
`
  },
  {
    id: 'synesthesia-pitch-painter',
    title: '마우스 페인팅 - 높이가 음, 색이 음색',
    thumbnail: '🎨',
    category: 'creative',
    level: 3,
    description: '마우스를 움직여 그림을 그리면 높이는 음의 높낮이로, 좌우는 음색으로 변환됩니다.',
    tags: ['synesthesia', 'music', 'interactive'],
    code: `from vpython import *

scene.background = vector(0.02, 0.02, 0.05)
scene.range = 6
scene.center = vector(0, 0, 0)

label(pos=vector(0, 5, 0), text='마우스를 움직이며 클릭하면 색과 음이 칠해집니다',
      height=16, color=color.white)
label(pos=vector(0, 4.3, 0), text='높이=음높이 | 좌우=음색 | C: 지우기 | 슬라이더로 농도 조절',
      height=12, color=vector(0.7, 0.9, 1))

canvas_bg = box(pos=vector(0, 0, -0.5), size=vector(11, 8, 0.1),
                 color=vector(0.1, 0.1, 0.15))

음색목록 = ['piano', 'flute', 'guitar', 'organ', 'synth', 'bass', 'trumpet']

그림 = []
최대점 = 200

state = {
    'drawing': False,
    '농도': 0.5,
    'clear': False
}

def on_down(evt):
    state['drawing'] = True

def on_up(evt):
    state['drawing'] = False

def on_key(evt):
    if evt.key == 'c' or evt.key == 'C':
        state['clear'] = True

def 농도변경(evt):
    state['농도'] = evt.value

scene.bind('mousedown', on_down)
scene.bind('mouseup', on_up)
scene.bind('keydown', on_key)

slider(min=0.1, max=1.0, step=0.05, value=0.5, length=240, bind=농도변경)

def 위치를음으로(pos):
    음계_표 = [note.C4, note.D4, note.E4, note.F4, note.G4, note.A4, note.B4,
            note.C5, note.D5, note.E5, note.F5, note.G5, note.A5, note.B5]
    음idx = int((pos.y + 4) / 8 * 13)
    음idx = max(0, min(13, 음idx))
    색idx = int((pos.x + 5) / 10 * 6.99)
    색idx = max(0, min(6, 색idx))
    색 = 무지개[음idx % 7]
    return 음계_표[음idx], 음색목록[색idx], 색

프레임 = 0
while True:
    rate(30)
    프레임 += 1

    if state['clear']:
        for p in 그림:
            p.visible = False
        그림.clear()
        state['clear'] = False

    mp = scene.mouse.pos
    if abs(mp.x) < 5.5 and abs(mp.y) < 4 and state['drawing']:
        if 프레임 % 2 == 0:
            주파수, 음색이름, 색 = 위치를음으로(mp)
            점 = sphere(pos=vector(mp.x, mp.y, 0),
                        radius=0.15 + state['농도']*0.2,
                        color=색, emissive=True, opacity=0.85)
            그림.append(점)
            sound(주파수, 0.15, 'sine', state['농도']*0.5)
            if len(그림) > 최대점:
                옛점 = 그림.pop(0)
                옛점.visible = False

    if 프레임 % 5 == 0:
        for p in 그림[-20:]:
            p.radius = max(0.1, p.radius * 0.98)
`
  },
  {
    id: 'synesthesia-aurora-orchestra',
    title: '오로라 오케스트라 - 슬라이더로 빛과 음을 지휘',
    thumbnail: '🌈',
    category: 'creative',
    level: 3,
    description: '세 슬라이더로 주파수, 밝기, 화음을 조절하면 오로라 띠와 화음이 동시에 변합니다.',
    tags: ['synesthesia', 'music', 'interactive'],
    code: `from vpython import *
import math

scene.background = vector(0.01, 0.01, 0.03)
scene.range = 8
scene.center = vector(0, 1, 0)

label(pos=vector(0, 6, 0), text='오로라 오케스트라', height=22, color=color.white)
label(pos=vector(0, 5.3, 0), text='슬라이더 = 주파수/밝기/화음, 클릭 = 화음 연주',
      height=14, color=vector(0.8, 1, 0.9))
label(pos=vector(0, -5, 0), text='스페이스: 자동 지휘 모드',
      height=12, color=vector(0.7, 0.7, 1))

띠 = []
for i in range(30):
    x = (i - 15) * 0.5
    구 = sphere(pos=vector(x, 0, 0), radius=0.3,
                 color=color.white, emissive=True, opacity=0.8)
    띠.append(구)

오로라빛 = local_light(pos=vector(0, 0, 3),
                        color=color.white, intensity=0.7)

box(pos=vector(0, -3, 0), size=vector(20, 0.2, 8),
    color=vector(0.05, 0.05, 0.1))

화음목록 = [
    [note.C4, note.E4, note.G4],
    [note.D4, note.F4, note.A4],
    [note.E4, note.G4, note.B4],
    [note.F4, note.A4, note.C5],
    [note.G4, note.B4, note.D5],
    [note.A4, note.C5, note.E5],
    [note.B4, note.D5, note.F5],
]
화음이름 = ['C', 'Dm', 'Em', 'F', 'G', 'Am', 'Bdim']

state = {
    '주파수계수': 1.0,
    '밝기': 0.7,
    '화음idx': 0,
    '클릭': False,
    '자동': False,
    '자동tick': 0,
}

def 주파수콜백(evt): state['주파수계수'] = evt.value
def 밝기콜백(evt): state['밝기'] = evt.value
def 화음콜백(evt): state['화음idx'] = int(evt.value)
def 클릭콜백(evt): state['클릭'] = True
def 키콜백(evt):
    if evt.key == ' ':
        state['자동'] = not state['자동']

scene.bind('click', 클릭콜백)
scene.bind('keydown', 키콜백)

slider(min=0.5, max=3.0, step=0.1, value=1.0, length=200, bind=주파수콜백)
slider(min=0.1, max=1.0, step=0.05, value=0.7, length=200, bind=밝기콜백)
slider(min=0, max=6, step=1, value=0, length=200, bind=화음콜백)

현재화음 = label(pos=vector(0, 4.5, 0), text='화음: C', height=18, color=color.yellow)

프레임 = 0
while True:
    rate(60)
    프레임 += 1

    if state['자동']:
        state['자동tick'] += 1
        if state['자동tick'] >= 72:
            state['자동tick'] = 0
            state['화음idx'] = (state['화음idx'] + 1) % 7
            state['클릭'] = True

    if state['클릭']:
        chord(화음목록[state['화음idx']], 0.6, 'sine', state['밝기']*0.4)
        state['클릭'] = False
        현재화음.text = '화음: ' + 화음이름[state['화음idx']]

    기본색 = 무지개[state['화음idx']]
    for i, 구 in enumerate(띠):
        위상 = 프레임 * 0.05 * state['주파수계수'] + i * 0.3
        y = math.sin(위상) * 1.5 + math.cos(위상*0.5) * 0.5
        구.pos = vector(구.pos.x, y, math.sin(위상*0.7))
        깊이 = (math.sin(위상) + 1) / 2
        구.color = vector(
            기본색.x * (0.5 + 깊이*0.5),
            기본색.y * (0.5 + 깊이*0.5),
            기본색.z * (0.5 + 깊이*0.5)
        )
        구.opacity = 0.4 + state['밝기'] * 0.5
        구.radius = 0.2 + state['밝기'] * 0.3

    오로라빛.color = 기본색
    오로라빛.intensity = state['밝기'] * 1.5

    if 프레임 % 30 == 0:
        근음 = 화음목록[state['화음idx']][0] * state['주파수계수']
        sound(근음, 0.3, 'sine', state['밝기'] * 0.15)
`
  },
  {
    id: 'cosmic-aurora-veil',
    title: '오로라 베일 - 흐르는 빛의 커튼',
    thumbnail: '🌌',
    category: 'art',
    level: 2,
    description: '밤하늘에 끝없이 흐르는 오로라 커튼과 부드러운 화음이 어우러지는 무한 풍경',
    tags: ['light', 'music', 'generative', 'infinite'],
    code: `from vpython import *
import random
import math

scene.background = vector(0.01, 0.02, 0.06)
scene.range = 12

label(pos=vector(0, 9, 0), text='오로라 베일 — 그저 보고 들으세요',
      color=color.white, height=16)

for _ in range(120):
    sphere(pos=vector(random.uniform(-25, 25),
                      random.uniform(-8, 12),
                      random.uniform(-25, -10)),
           radius=0.04, color=color.white, emissive=True)

NUM_COLS = 60
NUM_ROWS = 20
curtain = []

for i in range(NUM_COLS):
    col = []
    x = -15 + i * 30 / NUM_COLS
    for j in range(NUM_ROWS):
        y = -2 + j * 0.45
        s = sphere(pos=vector(x, y, 0), radius=0.18,
                   color=vector(0.2, 1.0, 0.6),
                   emissive=True, opacity=0.6)
        col.append(s)
    curtain.append(col)

local_light(pos=vector(0, 8, 4), color=vector(0.3, 0.9, 0.7), intensity=0.5)

pentatonic = [note.C4, note.D4, note.E4, note.G4, note.A4,
              note.C5, note.D5, note.E5]

t = 0.0
beat = 0
while True:
    rate(40)
    t += 0.03

    hue_shift = (math.sin(t * 0.15) + 1) / 2
    base_a = vector(0.2, 1.0, 0.6)
    base_b = vector(0.7, 0.3, 1.0)
    cur_color = base_a * hue_shift + base_b * (1 - hue_shift)

    for i in range(NUM_COLS):
        wave = math.sin(t * 1.2 + i * 0.25) * 1.4
        wave += math.sin(t * 0.6 + i * 0.07) * 0.8

        edge_fade = 1 - abs(i - NUM_COLS / 2) / (NUM_COLS / 2)
        edge_fade = max(0.2, edge_fade)

        for j in range(NUM_ROWS):
            row_phase = j * 0.18
            yshift = wave + math.sin(t * 0.8 + row_phase) * 0.3

            base_y = -2 + j * 0.45
            new_pos = vector(curtain[i][j].pos.x, base_y + yshift * 0.6, math.sin(t * 0.5 + i * 0.15) * 1.5)
            curtain[i][j].pos = new_pos

            bright = 0.5 + j / NUM_ROWS * 0.7
            curtain[i][j].color = cur_color * bright
            curtain[i][j].opacity = 0.4 * edge_fade + 0.2

    beat += 1
    if beat % 80 == 0:
        n = random.choice(pentatonic)
        sound(n, 1.4, 'sine', 0.18)
    if beat % 320 == 0:
        c1 = random.choice(pentatonic)
        c2 = random.choice(pentatonic)
        c3 = random.choice(pentatonic)
        chord([c1, c2, c3], 2.2, 'triangle', 0.14)
`
  },
  {
    id: 'cosmic-firefly-choir',
    title: '반딧불이 합창단 - 점멸하는 빛의 노래',
    thumbnail: '✨',
    category: 'art',
    level: 3,
    description: '어두운 숲 속을 떠다니는 반딧불이 100마리가 각자 점멸하며 음을 노래하는 무한 풍경',
    tags: ['light', 'music', 'generative', 'infinite'],
    code: `from vpython import *
import random
import math

scene.background = vector(0.02, 0.03, 0.05)
scene.range = 10

label(pos=vector(0, 8, 0),
      text='반딧불이 합창단 — 빛이 노래합니다',
      color=color.white, height=14)

box(pos=vector(0, -5, 0), size=vector(40, 0.2, 40),
    color=vector(0.05, 0.08, 0.05), opacity=0.7)

distant_light(direction=vector(0.3, -1, 0.2),
              color=vector(0.3, 0.4, 0.6), intensity=0.4)

pentatonic = [note.C3, note.E3, note.G3, note.A3,
              note.C4, note.D4, note.E4, note.G4, note.A4,
              note.C5, note.D5, note.E5]

warm_palette = [
    vector(1.0, 0.9, 0.3),
    vector(1.0, 0.7, 0.2),
    vector(0.9, 1.0, 0.4),
    vector(1.0, 0.5, 0.3),
    vector(0.7, 0.9, 1.0),
]

NUM_FIREFLIES = 100
fireflies = []

for _ in range(NUM_FIREFLIES):
    pos = vector(random.uniform(-15, 15),
                 random.uniform(-3, 6),
                 random.uniform(-15, 5))
    body = sphere(pos=pos, radius=0.12,
                  color=random.choice(warm_palette),
                  emissive=True, opacity=0.0)
    fireflies.append({
        'obj': body,
        'phase': random.uniform(0, 6.28),
        'speed': random.uniform(0.6, 1.8),
        'note': random.choice(pentatonic),
        'instr': random.choice(['piano', 'flute', 'chiptune']),
        'last_played': -999,
        'home': vector(pos.x, pos.y, pos.z),
    })

t = 0.0
tick = 0
while True:
    rate(50)
    t += 0.04
    tick += 1

    for f in fireflies:
        brightness = (math.sin(t * f['speed'] + f['phase']) + 1) / 2
        brightness = brightness ** 3
        f['obj'].opacity = brightness * 0.95

        f['obj'].pos = f['home'] + vector(
            math.sin(t * 0.5 + f['phase']) * 0.6,
            math.sin(t * 0.7 + f['phase'] * 1.3) * 0.4,
            math.cos(t * 0.4 + f['phase']) * 0.6,
        )

        if brightness > 0.92 and (t - f['last_played']) > 1.5:
            if random.random() < 0.18:
                sound(f['note'], 0.6, 'sine', 0.10)
                f['last_played'] = t

    if tick % 240 == 0:
        star = random.choice(fireflies)
        star['obj'].color = vector(1, 1, 0.6)
        for k in range(3):
            n = random.choice(pentatonic)
            sound(n, 0.4, 'triangle', 0.12)
`
  },
  {
    id: 'cosmic-galaxy-grow',
    title: '은하 자라기 - 별이 태어나는 우주',
    thumbnail: '🌠',
    category: 'art',
    level: 3,
    description: '무에서 시작해 별이 하나씩 태어나며 자라나는 은하, 별마다 자기 음을 가진 무한 우주 작품',
    tags: ['light', 'music', 'generative', 'infinite'],
    code: `from vpython import *
import random
import math

scene.background = vector(0.005, 0.005, 0.02)
scene.range = 14

label(pos=vector(0, 11, 0),
      text='은하 자라기 — 별이 태어나는 소리',
      color=color.white, height=14)

core = sphere(pos=vector(0, 0, 0), radius=0.7,
              color=vector(1.0, 0.9, 0.7),
              emissive=True, opacity=0.6)
local_light(pos=vector(0, 0, 0),
            color=vector(1.0, 0.9, 0.8), intensity=0.7)

star_colors = [
    vector(0.6, 0.8, 1.0),
    vector(1.0, 1.0, 1.0),
    vector(1.0, 0.9, 0.6),
    vector(1.0, 0.6, 0.4),
    vector(1.0, 0.4, 0.4),
    vector(0.8, 0.6, 1.0),
]

pentatonic = [note.C3, note.D3, note.E3, note.G3, note.A3,
              note.C4, note.D4, note.E4, note.G4, note.A4,
              note.C5, note.D5, note.E5, note.G5]

MAX_STARS = 220
stars = []

t = 0.0
tick = 0

while True:
    rate(50)
    t += 0.02
    tick += 1

    if tick % 6 == 0 and random.random() < 0.7:
        r = random.uniform(1.2, 11)
        arm_offset = random.choice([0, math.pi])
        theta = r * 0.6 + arm_offset + random.uniform(-0.3, 0.3)

        x = math.cos(theta) * r
        z = math.sin(theta) * r
        y = random.uniform(-0.6, 0.6)

        col = random.choice(star_colors)
        size = random.uniform(0.08, 0.22)
        if random.random() < 0.04:
            size = random.uniform(0.35, 0.55)

        s = sphere(pos=vector(x, y, z), radius=size,
                   color=col, emissive=True, opacity=0.0)

        star_data = {
            'obj': s,
            'born': t,
            'note': random.choice(pentatonic),
            'orbit_r': r,
            'orbit_theta': theta,
            'orbit_speed': 0.3 / (r ** 0.5),
            'y': y,
            'twinkle_phase': random.uniform(0, 6.28),
        }
        stars.append(star_data)

        sound(star_data['note'], 0.7, 'sine', 0.10)

        if random.random() < 0.15:
            c2 = random.choice(pentatonic)
            chord([star_data['note'], c2], 1.0, 'triangle', 0.08)

    while len(stars) > MAX_STARS:
        old = stars.pop(0)
        old['obj'].visible = False

    for s in stars:
        age = t - s['born']
        fade = min(1.0, age * 0.8)
        twinkle = 0.7 + 0.3 * math.sin(t * 3 + s['twinkle_phase'])
        s['obj'].opacity = fade * twinkle

        s['orbit_theta'] += s['orbit_speed'] * 0.02
        s['obj'].pos = vector(
            math.cos(s['orbit_theta']) * s['orbit_r'],
            s['y'] + math.sin(t * 0.5 + s['twinkle_phase']) * 0.05,
            math.sin(s['orbit_theta']) * s['orbit_r']
        )

    core.radius = 0.7 + math.sin(t * 0.6) * 0.15
    core.opacity = 0.5 + math.sin(t * 0.4) * 0.2

    if tick % 600 == 0:
        c1 = random.choice(pentatonic)
        c2 = random.choice(pentatonic)
        c3 = random.choice(pentatonic)
        chord([c1, c2, c3], 2.5, 'sine', 0.12)
`
  },
  {
    id: 'texture-showcase',
    title: '텍스처 쇼케이스 (20종)',
    thumbnail: '🧱',
    category: 'art',
    level: 1,
    description: '20종 프리셋 텍스처(나무·금속·은하·성운·용암·얼음 등)와 외부 URL 텍스처를 한눈에 비교.',
    tags: ['texture', 'material', 'preset', 'showcase', 'galaxy', 'nebula'],
    code: `from vpython import *

scene_background(vector(0.04, 0.04, 0.08))

# === 20종 프리셋 (5x4 그리드) ===
preset_names = [
    'wood', 'metal', 'stones', 'granite', 'gravel',
    'rough', 'rug', 'stucco', 'flower', 'earth',
    'brick', 'checker', 'grid', 'galaxy', 'nebula',
    'water', 'lava', 'ice', 'circuit', 'fire',
]

cols = 5
for i, name in enumerate(preset_names):
    row = i // cols
    col = i % cols
    x = (col - 2) * 1.7
    y = 3.0 - row * 1.7
    box(pos=vector(x, y, 0),
        size=vector(1.5, 1.5, 0.2),
        texture=getattr(textures, name))
    label(pos=vector(x, y - 1.0, 0), text=name, height=11,
          color=color.white, background=vector(0, 0, 0))

# === 외부 URL 텍스처 예제 ===
# picsum.photos — CORS 지원 무료 랜덤 이미지
sphere(pos=vector(-3, -4.8, 0), radius=0.85,
       texture="https://picsum.photos/seed/vpylab/512/512")
label(pos=vector(-3, -5.9, 0), text="picsum (랜덤)", height=11,
      color=color.white, background=vector(0, 0, 0))

# NASA images-assets — 은하 (CORS 지원, 공공 이미지)
galaxy_url = "https://images-assets.nasa.gov/image/PIA12348/PIA12348~thumb.jpg"
sphere(pos=vector(0, -4.8, 0), radius=0.85, texture=galaxy_url)
label(pos=vector(0, -5.9, 0), text="NASA 은하", height=11,
      color=color.white, background=vector(0, 0, 0))

# Wikimedia Commons — 화성 (직접 링크, CORS 지원)
mars_url = "https://upload.wikimedia.org/wikipedia/commons/0/02/OSIRIS_Mars_true_color.jpg"
sphere(pos=vector(3, -4.8, 0), radius=0.85, texture=mars_url)
label(pos=vector(3, -5.9, 0), text="화성", height=11,
      color=color.white, background=vector(0, 0, 0))

# 한 번 flush — 모든 객체 표시 후 종료
rate(1)
print("✨ 20종 프리셋 + 3종 외부 URL 텍스처 표시 완료")
`
  },
];

export default EXAMPLES;

// 카테고리 필터 헬퍼
export const EXAMPLE_CATEGORIES = [
  { id: 'all', label: '전체', labelEn: 'All' },
  { id: 'space', label: '우주/자연', labelEn: 'Space' },
  { id: 'sound', label: '사운드', labelEn: 'Sound' },
  { id: 'science', label: '과학/수학', labelEn: 'Science' },
  { id: 'art', label: '아트', labelEn: 'Art' },
  { id: 'game', label: '게임', labelEn: 'Game' },
  { id: 'creative', label: '창의', labelEn: 'Creative' },
  { id: 'math', label: '수학', labelEn: 'Math' },
  { id: 'interactive', label: '인터랙티브', labelEn: 'Interactive' },
];
