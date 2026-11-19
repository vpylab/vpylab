export const cometCode = `from vpython import *
import random

# 전시용 태양계입니다. 크기·거리·공전 속도는 한 화면에서 관찰하도록 조정했습니다.
scene.background = vector(0.001, 0.002, 0.006)
scene.range = 18
scene.lights = []
scene.ambient = color.gray(0.18)
sun = sphere(radius=1.15, color=vector(1, 0.86, 0.50), texture=textures.sun, emissive=True)
local_light(pos=sun.pos, color=vector(1, 0.96, 0.88), intensity=95)

# 별은 밝기별로 모아 세 개의 점 집합으로 그립니다.
random.seed(42)
for count, tint, radius in [(1350, (0.39, 0.48, 0.64), 0.045), (510, (0.72, 0.80, 1), 0.075), (140, (1, 0.86, 0.67), 0.10)]:
    stars = []
    for i in range(count):
        y = random.uniform(-1, 1)
        a = random.uniform(0, 2*pi)
        h = sqrt(1-y*y)
        stars.append(85 * vector(h*cos(a), y, h*sin(a)))
    points(pos=stars, color=vector(*tint), radius=radius, size_units='world')

# 행성을 추가하거나 고칠 때는 거리, 반지름, 색, 각속도, 출발 각도를 바꾸세요.
data = [
    (2.0, 0.15, (0.65, 0.60, 0.53), 1.65, 1.8),  # 수성
    (3.0, 0.27, (0.98, 0.76, 0.47), 1.25, 3.7),  # 금성
    (4.5, 0.40, (1, 1, 1),          0.85, 0.5),  # 지구
    (6.3, 0.24, (0.92, 0.37, 0.18), 0.64, 4.8),  # 화성
    (8.3, 0.90, (0.96, 0.72, 0.49), 0.38, 2.5),  # 목성
    (10.7, 0.74, (0.98, 0.84, 0.60), 0.27, 5.8), # 토성
    (13.1, 0.49, (0.49, 0.90, 0.91), 0.19, 3.5), # 천왕성
    (15.4, 0.47, (0.30, 0.49, 0.98), 0.14, 0.95) # 해왕성
]
planets = []
for distance, radius, tint, speed, phase in data:
    path = [distance * vector(cos(i*pi/90), 0, sin(i*pi/90)) for i in range(181)]
    curve(pos=path, color=vector(0.09, 0.14, 0.21))
    planets.append(sphere(radius=radius, color=vector(*tint), shininess=0.10))
# 표면 그림의 색이 그대로 보이도록 바탕색을 흰색으로 바꾼 뒤 재질을 입힙니다.
planets[4].color = color.white
planets[4].texture = textures.jupiter
planets[5].color = color.white
planets[5].texture = textures.saturn
earth = planets[2]
earth.texture = textures.earth
moon = sphere(radius=0.14, texture=textures.moon, shininess=0)
rings = []
for r, width, tone in [(0.99, 0.028, 0.54), (1.08, 0.045, 0.78), (1.20, 0.022, 0.62)]:
    rings.append(ring(radius=r, thickness=width, axis=vector(0.32, 1, 0.18), color=vector(tone, 0.86*tone, 0.66*tone)))

# 혜성: 근일점 거리와 이심률을 바꾸면 궤도와 먼지의 분포가 함께 바뀝니다.
q = 2.8               # 근일점 거리: 태양에 가장 가까워질 때의 거리
eccentricity = 0.68   # 이심률: 0이면 원, 1에 가까울수록 길쭉한 타원
mu = 14               # 태양이 끌어당기는 세기
comet = sphere(pos=vector(-q,0,0), radius=0.065, texture=textures.granite)
velocity = vector(0, 0.18, 0.984).norm() * sqrt(mu*(1+eccentricity)/q)
# 핵 주위의 코마, 태양 반대쪽의 이온 줄기, 공전 뒤쪽으로 휘는 먼지 부채.
# 입자는 한 번 만들고 좌표계만 움직입니다. 꼬리의 밀도는 시각화 모형입니다.
layers = []
for kind, count, tint, radius, opacity in [
    ("coma", 520, vector(.22,.76,.64), .23, .038),
    ("ion", 2300, vector(.055,.25,.86), .195, .052),
    ("dust", 3200, vector(.85,.51,.23), .25, .044)]:
    samples = []
    for i in range(count):
        u = random.random()**1.2
        if kind == "coma":
            offset = vector(random.gauss(0,.12),random.gauss(0,.12),random.gauss(0,.12))
        elif kind == "ion":
            strand = i % 5
            width = .018 + .055*u
            offset = vector(4.6*u, u*(strand-2)*.073 + .045*u*sin(11*u+strand) + random.gauss(0,width), random.gauss(0,width))
        else:
            width = .028 + .26*u
            offset = vector(3.55*u, 1.42*u**1.65 + random.gauss(0,width), random.gauss(0,.6*width))
        samples.append(dict(pos=offset, color=tint*((1-u)**1.2)))
    layers.append(points(pos=samples, shape="mist", size_units="world", radius=radius, opacity=opacity))

# 각 먼지 알갱이가 받는 복사압 비율(beta)에 따라 방출 이후 경로가 달라집니다.
grains = []
released = points(shape="mist", size_units="world", radius=.085, color=vector(.94,.68,.4), opacity=.055)
tick = 0
view = menu(choices=["태양계 전체", "지표에서 달 보기", "지표에서 태양 보기", "지표에서 혜성 보기", "혜성 따라가기"])
pace = slider(min=0, max=3, value=1, step=0.1, text="공전 속도 (0 = 정지)")
last_view = -1
message = ""
t = 0
while True:
    rate(60)
    dt = 0.004 * pace.value
    if dt > 0:
        velocity -= mu * norm(comet.pos) * dt / mag(comet.pos)**2
        comet.pos += velocity * dt
        if tick % 4 == 0:
            kick = vector(random.gauss(0,.06),random.gauss(0,.06),random.gauss(0,.06))
            grains.append([comet.pos*1, velocity+kick, random.uniform(.18,.72)])
            grains = grains[-96:]
        for grain in grains:
            grain[1] -= mu*(1-grain[2])*norm(grain[0])*dt/mag(grain[0])**2
            grain[0] += grain[1]*dt
        if tick % 4 == 0:
            released.splice(0, released.npoints, [g[0] for g in grains])
        tick += 1
    away = norm(comet.pos)
    trailing = -norm(velocity - dot(velocity, away)*away)
    for layer in layers:
        layer.origin = comet.pos
        layer.axis = away
        layer.up = trailing
    for p, (distance, radius, tint, speed, phase) in zip(planets, data):
        a = phase + speed*t
        p.pos = distance * vector(cos(a), 0, sin(a))
    for band in rings:
        band.pos = planets[5].pos
    m = 2.4 + 5*t
    moon.pos = earth.pos + 0.95*vector(cos(m), 0.12*sin(m), 0.993*sin(m))
    spin = 2.8 + 9*t
    earth.axis = vector(cos(spin), 0, sin(spin))
    mode = view.index
    if mode == 0:
        status = "드래그로 회전 · 확대해서 지구와 달, 토성의 고리를 관찰하세요."
        if last_view != 0:
            scene.up = vector(0, 1, 0)
            scene.fov = pi/3
            scene.camera.pos = vector(0, 13, 24)
            scene.camera.axis = vector(0, -13, -24)
    elif mode == 4:
        focus = comet.pos + 1.85*away + .38*trailing
        scene.camera.pos = focus + 4.8*norm(cross(trailing, away)) + .85*trailing
        scene.up = -trailing
        scene.camera.axis = focus - scene.camera.pos
        status = "푸른 이온 꼬리는 태양 반대쪽을 향하고, 금빛 먼지 꼬리는 공전 뒤쪽으로 휩니다."
    else:
        zenith = vector(cos(pi/6)*cos(spin), sin(pi/6), cos(pi/6)*sin(spin))
        eye = earth.pos + 0.42*zenith
        direction = (moon.pos if mode == 1 else sun.pos if mode == 2 else comet.pos) - eye
        altitude = dot(direction, zenith)
        scene.up = zenith
        scene.fov = pi/3
        scene.camera.pos = eye
        scene.camera.axis = direction if altitude >= 0 else direction - altitude*zenith
        status = view.selected + (" · 지평선 위" if altitude >= 0 else " · 지평선 아래")
    if message != status:
        scene.caption = status
        message = status
    last_view = mode
    t += 0.004*pace.value
`;

export const timbreCode = `from vpython import *
from time import monotonic
scene.title = "빛으로 연주하는 다섯 음"
scene.caption = "버튼을 누르거나 숫자 1~5로 연주하세요."
notes = ["C4", "D4", "E4", "G4", "A4"]
timbres = ["felt", "marimba", "glass"]
voice = menu(choices=["펠트 피아노", "마림바", "유리종"])
room = checkbox(text="공간 잔향", checked=False)
volume = slider(min=0.1, max=1, value=0.42, text="연주 세기")
colors = [color.cyan, color.green, color.yellow, color.orange, color.magenta]
keys = [box(pos=vector(i-2,0,0), size=vector(.86,.25,2), color=colors[i]) for i in range(5)]
lights = [local_light(pos=k.pos+vector(0,.45,.5), color=k.color, intensity=0) for k in keys]
box(pos=vector(0,-.28,0), size=vector(6,.2,3), color=color.gray(.19))
ends = [0]*5
scene.forward = vector(0,-.65,-1)
def strike(i):
    ends[i] = monotonic() + .65
    play_note(notes[i], .65, type=timbres[voice.index] + ("-room" if room.checked else ""), volume=volume.value)
# 버튼 다섯 개를 만들고 누르면 그 번호의 건반을 칩니다. (i=i는 버튼마다 자기 번호를 기억하게 하는 표현입니다)
for i in range(5):
    button(text=str(i+1), bind=lambda b, i=i: strike(i))
def on_key(e):
    if e.key in ["1","2","3","4","5"]:
        strike(int(e.key)-1)
scene.bind("keydown", on_key)
while True:
    rate(45)
    for i in range(5):
        # glow는 방금 친 건반이 1에서 0으로 서서히 줄어드는 값입니다. 건반 빛과 조명 세기에 씁니다.
        glow = max(0, (ends[i]-monotonic())/.65)
        if keys[i].emissive != (glow > .1):
            keys[i].emissive = glow > .1
        if lights[i].intensity != 3*glow**2:
            lights[i].intensity = 3*glow**2
`;

export const cometCloseupCode = cometCode.replace('view = menu(choices=', 'view = menu(selected="혜성 따라가기", choices=');

export const solarStudyCode = `from vpython import *
import random
scene.background = color.black
scene.lights = []
scene.ambient = color.gray(.08)
scene.fov = 55*pi/180
scene.camera.pos = vector(0,14,24)
scene.camera.axis = -scene.camera.pos
sun = sphere(radius=1.5, color=vector(1,.68,0), emissive=True, shininess=0)
local_light(pos=sun.pos, color=color.white, intensity=400)
random.seed(18)
stars = []
for i in range(2000):
    y, a = random.uniform(-1,1), random.uniform(0,2*pi)
    stars.append(random.uniform(80,150)*vector(sqrt(1-y*y)*cos(a), y, sqrt(1-y*y)*sin(a)))
points(pos=stars, radius=.2, size_units="world")
data = [(3,.25,(.397,.397,.397),.40,3.95), (4.5,.45,(1,.72,.45),.25,2.23),
        (6.5,.5,(.053,.141,.753),.16,1.47), (8.5,.35,(1,.06,0),.11,3.59),
        (12,1.1,(.905,.372,.171),.05,2.92)]
planets = []
for distance, radius, tint, speed, phase in data:
    curve(pos=[distance*vector(cos(i*pi/64),0,sin(i*pi/64)) for i in range(129)], color=color.gray(.033))
    planets.append(sphere(radius=radius, color=vector(*tint), shininess=.2))
moon = sphere(radius=.14, color=color.gray(.65))
pace = slider(min=0,max=3,value=1,step=.1,text="공전 속도")
t = 0
while True:
    rate(60)
    for planet, (distance, radius, tint, speed, phase) in zip(planets,data):
        a = phase - speed*pi*t/2
        planet.pos = distance*vector(cos(a),0,sin(a))
    moon.pos = planets[2].pos + .9*vector(cos(2*t+2),0,sin(2*t+2))
    t += pace.value/60
`;
