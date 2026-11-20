export function createCometCode(en = false, closeup = false) {
  const views = en
    ? ["Solar system", "Moon from Earth", "Sun from Earth", "Comet from Earth", "Follow comet", "Fix nucleus and watch grains"]
    : ["태양계 전체", "지표에서 달 보기", "지표에서 태양 보기", "지표에서 혜성 보기", "혜성 따라가기", "핵 고정 · 입자 관찰"];
  const selected = closeup ? `, selected=${JSON.stringify(views[4])}` : '';
  return `from vpython import *
import random

# ${en ? "A classroom model. Sizes, distances and orbital speeds are scaled to fit one view." : "전시용 태양계입니다. 크기·거리·공전 속도는 한 화면에서 관찰하도록 조정했습니다."}
scene.background = vector(0.001, 0.002, 0.006)
scene.range = 18
scene.lights = []
scene.ambient = color.gray(0.18)
sun = sphere(radius=1.15, color=color.white, texture=textures.sun, emissive=True)
local_light(pos=sun.pos, color=vector(1, 0.96, 0.88), intensity=95)

# ${en ? "Group the stars by brightness and draw each group as one set of points." : "별은 밝기별로 모아 세 개의 점 집합으로 그립니다."}
random.seed(42)
for count, tint, radius in [(1350, (0.39, 0.48, 0.64), 0.045), (510, (0.72, 0.80, 1), 0.075), (140, (1, 0.86, 0.67), 0.10)]:
    stars = []
    for i in range(count):
        y = random.uniform(-1, 1)
        a = random.uniform(0, 2*pi)
        h = sqrt(1-y*y)
        stars.append(85 * vector(h*cos(a), y, h*sin(a)))
    points(pos=stars, color=vector(*tint), radius=radius, size_units='world')

# ${en ? "Each row gives distance, radius, color, angular speed and starting angle." : "행성을 추가하거나 고칠 때는 거리, 반지름, 색, 각속도, 출발 각도를 바꾸세요."}
data = [
    (2.0, 0.15, (0.65, 0.60, 0.53), 1.65, 1.8),  # ${en ? "Mercury" : "수성"}
    (3.0, 0.27, (0.98, 0.76, 0.47), 1.25, 3.7),  # ${en ? "Venus" : "금성"}
    (4.5, 0.40, (1, 1, 1),          0.85, 0.5),  # ${en ? "Earth" : "지구"}
    (6.3, 0.24, (0.92, 0.37, 0.18), 0.64, 4.8),  # ${en ? "Mars" : "화성"}
    (8.3, 0.90, (0.96, 0.72, 0.49), 0.38, 2.5),  # ${en ? "Jupiter" : "목성"}
    (10.7, 0.74, (0.98, 0.84, 0.60), 0.27, 5.8), # ${en ? "Saturn" : "토성"}
    (13.1, 0.49, (0.49, 0.90, 0.91), 0.19, 3.5), # ${en ? "Uranus" : "천왕성"}
    (15.4, 0.47, (0.30, 0.49, 0.98), 0.14, 0.95) # ${en ? "Neptune" : "해왕성"}
]
planets = []
for distance, radius, tint, speed, phase in data:
    path = [distance * vector(cos(i*pi/90), 0, sin(i*pi/90)) for i in range(181)]
    curve(pos=path, color=vector(0.09, 0.14, 0.21))
    planets.append(sphere(radius=radius, color=vector(*tint), shininess=0.10))
# ${en ? "A white base color preserves the colors in the surface image." : "표면 그림의 색이 그대로 보이도록 바탕색을 흰색으로 바꾼 뒤 재질을 입힙니다."}
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

# ${en ? "Change the closest approach or eccentricity to explore the orbit and dust distribution." : "혜성: 근일점 거리와 이심률을 바꾸면 궤도와 먼지의 분포가 함께 바뀝니다."}
q = 2.8               # ${en ? "Perihelion distance: the closest approach to the Sun" : "근일점 거리: 태양에 가장 가까워질 때의 거리"}
eccentricity = 0.68   # ${en ? "Eccentricity: zero gives a circle; values closer to one give a longer ellipse" : "이심률: 0이면 원, 1에 가까울수록 길쭉한 타원"}
mu = 14               # ${en ? "Strength of the solar gravitational pull" : "태양이 끌어당기는 세기"}
comet = sphere(pos=vector(-q,0,0), radius=0.065, texture=textures.granite)
velocity = vector(0, 0.18, 0.984).norm() * sqrt(mu*(1+eccentricity)/q)
# ${en ? "Each point marks a possible end position. The particles move and fade as flow_time increases." : "각 점은 입자가 향하는 끝점입니다. flow_time이 흐르면 각자 다른 속도로 방출·소멸합니다."}
layers = []
for kind, count, tint, radius, opacity in [
    ("coma", 480, vector(.23,.77,.65), .074, .115),
    ("ion", 1700, vector(.07,.29,.91), .047, .19),
    ("dust", 2300, vector(.89,.56,.31), .053, .16),
    ("grit", 480, vector(.92,.76,.57), .024, .67)]:
    samples = []
    for i in range(count):
        if kind == "coma":
            end = vector(random.gauss(.07,.32), random.gauss(0,.35), random.gauss(0,.27))
        elif kind == "ion":
            strand = i % 7 - 3
            end = vector(random.uniform(3.4,5.45), strand*.089 + random.gauss(0,.075), random.gauss(0,.11))
        else:
            reach = random.uniform(2.2,4.55)
            end = vector(reach, reach*random.uniform(.13,.56) + random.gauss(0,.20), random.gauss(0,.28))
        samples.append(dict(pos=end, color=tint*random.uniform(.48,1)))
    layers.append(points(pos=samples, shape="plume", size_units="world", radius=radius, opacity=opacity))

# ${en ? "Different amounts of radiation pressure change each grain's path after release." : "각 먼지 알갱이가 받는 복사압 비율(beta)에 따라 방출 이후 경로가 달라집니다."}
grains = []
released = points(shape="mist", size_units="world", radius=.085, color=vector(.94,.68,.4), opacity=.055)
tick = 0
view = menu(choices=${JSON.stringify(views)}${selected})
pace = slider(min=0, max=3, value=1, step=0.1, text="${en ? "Orbit speed (0 = pause)" : "공전 속도 (0 = 정지)"}")
last_view = -1
message = ""
particle_time = 0
t = 0
while True:
    rate(60)
    mode = view.index
    step = .004 * pace.value
    if step == 0 and mode == last_view:
        continue
    particle_time += step / .24
    dt = 0 if mode == 5 else step
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
        layer.flow_time = particle_time
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
    sun.axis = vector(cos(.42*t), 0, -sin(.42*t))
    if mode == 0:
        status = "${en ? "Drag to orbit. Zoom in to find the Moon or Saturn’s rings." : "드래그로 회전 · 확대해서 지구와 달, 토성의 고리를 관찰하세요."}"
        if last_view != 0:
            scene.up = vector(0, 1, 0)
            scene.fov = pi/3
            scene.camera.pos = vector(0, 13, 24)
            scene.camera.axis = vector(0, -13, -24)
    elif mode in (4, 5):
        focus = comet.pos + 1.85*away + .38*trailing
        scene.camera.pos = focus + 4.8*norm(cross(trailing, away)) + .85*trailing
        scene.up = -trailing
        scene.camera.axis = focus - scene.camera.pos
        status = "${en ? "The nucleus stays still. Watch the grains flow." : "핵 고정 · 입자 흐름"}" if mode == 5 else "${en ? "The blue ion tail points away from the Sun. The golden dust tail curves behind the comet." : "푸른 이온 꼬리는 태양 반대쪽을 향하고, 금빛 먼지 꼬리는 공전 뒤쪽으로 휩니다."}"
    else:
        zenith = vector(cos(pi/6)*cos(spin), sin(pi/6), cos(pi/6)*sin(spin))
        eye = earth.pos + 0.42*zenith
        direction = (moon.pos if mode == 1 else sun.pos if mode == 2 else comet.pos) - eye
        altitude = dot(direction, zenith)
        scene.up = zenith
        scene.fov = pi/3
        scene.camera.pos = eye
        scene.camera.axis = direction if altitude >= 0 else direction - altitude*zenith
        status = view.selected + ("${en ? " · above the horizon" : " · 지평선 위"}" if altitude >= 0 else "${en ? " · below the horizon" : " · 지평선 아래"}")
    if message != status:
        scene.caption = status
        message = status
    last_view = mode
    t += dt
`;
}

export const createTimbreCode = (en = false) => `from vpython import *
from time import monotonic
scene.title = "${en ? "Five notes in light" : "빛으로 연주하는 다섯 음"}"
scene.caption = "${en ? "Tap a button or press a number key from 1 to 5." : "버튼을 누르거나 숫자 1~5로 연주하세요."}"
notes = ["C4", "D4", "E4", "G4", "A4"]
timbres = ["felt", "marimba", "glass"]
voice = menu(choices=["${en ? "Felt piano" : "펠트 피아노"}", "${en ? "Marimba" : "마림바"}", "${en ? "Glass bell" : "유리종"}"])
room = checkbox(text="${en ? "Room reverb" : "공간 잔향"}", checked=False)
volume = slider(min=0.1, max=1, value=0.42, text="${en ? "Volume" : "연주 세기"}")
colors = [color.cyan, color.green, color.yellow, color.orange, color.magenta]
keys = [box(pos=vector(i-2,0,0), size=vector(.86,.25,2), color=colors[i]) for i in range(5)]
lights = [local_light(pos=k.pos+vector(0,.45,.5), color=k.color, intensity=0) for k in keys]
box(pos=vector(0,-.28,0), size=vector(6,.2,3), color=color.gray(.19))
ends = [0]*5
scene.forward = vector(0,-.65,-1)
def strike(i):
    ends[i] = monotonic() + .65
    play_note(notes[i], .65, type=timbres[voice.index] + ("-room" if room.checked else ""), volume=volume.value)
# ${en ? "Each button remembers its own key number through i=i." : "버튼 다섯 개를 만들고 누르면 그 번호의 건반을 칩니다. (i=i는 버튼마다 자기 번호를 기억하게 하는 표현입니다)"}
for i in range(5):
    button(text=str(i+1), bind=lambda b, i=i: strike(i))
def on_key(e):
    if e.key in ["1","2","3","4","5"]:
        strike(int(e.key)-1)
scene.bind("keydown", on_key)
while True:
    rate(45)
    for i in range(5):
        # ${en ? "Glow fades from one to zero after each strike and controls the key and its light." : "glow는 방금 친 건반이 1에서 0으로 서서히 줄어드는 값입니다. 건반 빛과 조명 세기에 씁니다."}
        glow = max(0, (ends[i]-monotonic())/.65)
        if keys[i].emissive != (glow > .1):
            keys[i].emissive = glow > .1
        if lights[i].intensity != 3*glow**2:
            lights[i].intensity = 3*glow**2
`;

export const createSolarStudyCode = (en = false) => `from vpython import *
from time import monotonic
import random
scene.background = color.black
scene.lights = []
scene.ambient = color.gray(.08)
scene.fov = 55*pi/180
scene.camera.pos = vector(0,14,24)
scene.camera.axis = -scene.camera.pos
sun = sphere(radius=1.5, color=color.white, texture=textures.sun, emissive=True, shininess=0)
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
earth = planets[2]
earth.texture = textures.earth
earth.color = color.white
moon = sphere(radius=.14, color=color.gray(.65))
# ${en ? "The clock and slider use the same playback speed." : "시계와 슬라이더는 같은 재생 배율을 사용합니다."}
speed_scale = 1
def slide(control):
    global speed_scale
    speed_scale = control.value

pace = slider(min=0, max=4, value=1, step=.125, text="${en ? "Orbit speed" : "공전 속도"}", bind=slide)
def change_speed(event):
    global speed_scale
    if event.key == "up":
        speed_scale = min(4, 2*speed_scale if speed_scale else 1)
    elif event.key == "down":
        speed_scale = round(speed_scale*4)/8
    else:
        return
    pace.value = speed_scale

scene.bind("keydown", change_speed)
scene.caption = "${en ? "At 1×, Mercury orbits in about 10 s" : "1배에서 수성 한 바퀴 약 10초"}"
t = 0
previous = monotonic()
positioned = False
while True:
    rate(60)
    now = monotonic()
    # ${en ? "Skip long time gaps when returning to this tab." : "탭에 돌아오는 순간의 긴 공백은 건너뜁니다."}
    elapsed = min(now-previous, .1)
    previous = now
    if speed_scale == 0 and positioned:
        continue
    t += elapsed*speed_scale
    positioned = True
    for planet, (distance, radius, tint, speed, phase) in zip(planets,data):
        a = phase - speed*pi*t/2
        planet.pos = distance*vector(cos(a),0,sin(a))
    # ${en ? "The Moon also orbits Earth in its rotating frame." : "달은 함께 공전하는 지구의 자전 좌표계에서 한 번 더 돕니다."}
    earth_orbit = data[2][4] - data[2][3]*pi*t/2
    earth_spin = earth_orbit - 3*t
    earth.axis = vector(cos(earth_spin), 0, sin(earth_spin))
    lunar_angle = earth_spin - 2*t
    moon.pos = earth.pos + .9*vector(cos(lunar_angle), 0, sin(lunar_angle))
    sun.axis = vector(cos(.1*t), 0, -sin(.1*t))
`;

export const cometCode = createCometCode();
export const cometCloseupCode = createCometCode(false, true);
export const solarStudyCode = createSolarStudyCode();
export const timbreCode = createTimbreCode();
