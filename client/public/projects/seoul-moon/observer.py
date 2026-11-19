from vpython import *
from datetime import datetime, timedelta, timezone
from time import time, monotonic
from math import sin, cos, atan2, asin, sqrt, radians, degrees, hypot, pi

# 서울시청 부근의 지리 좌표. 시간 입력에는 항상 한국 표준시를 사용합니다.
latitude = radians(37.5665)
longitude = 126.9780
kst = timezone(timedelta(hours=9))
epoch = datetime(1999, 12, 31, tzinfo=timezone.utc).timestamp()
first = datetime(1900, 1, 1, tzinfo=kst).timestamp()
last = datetime(2100, 12, 31, 23, 59, 59, tzinfo=kst).timestamp()

# 저정밀 궤도 요소와 달의 섭동항 (Paul Schlyter, stjarnhimlen.se/comp/ppcomp.html).
# 지구 중심 적도 좌표로 바꿉니다. 거리 한 단위는 지구의 적도 반지름입니다.
def orbit(anomaly, eccentricity):
    eccentric = anomaly
    for step in range(4):
        eccentric -= (eccentric - eccentricity * sin(eccentric) - anomaly) / (1 - eccentricity * cos(eccentric))
    x = cos(eccentric) - eccentricity
    y = sqrt(1 - eccentricity ** 2) * sin(eccentric)
    return atan2(y, x), hypot(x, y)

def equatorial(lon, lat, distance, tilt):
    x = distance * cos(lat) * cos(lon)
    y = distance * cos(lat) * sin(lon)
    z = distance * sin(lat)
    return vector(x, y * cos(tilt) - z * sin(tilt), y * sin(tilt) + z * cos(tilt))

def sky_positions(stamp):
    days = (stamp - epoch) / 86400
    tilt = radians(23.4393 - 0.0000003563 * days)
    solar_anomaly = radians((356.0470 + 0.9856002585 * days) % 360)
    perihelion = radians(282.9404 + 0.0000470935 * days)
    true_sun, distance = orbit(solar_anomaly, 0.016709 - 0.000000001151 * days)
    solar = equatorial(true_sun + perihelion, 0, distance * 23454.79, tilt)

    node = radians((125.1228 - 0.0529538083 * days) % 360)
    perigee = radians((318.0634 + 0.1643573223 * days) % 360)
    m = radians((115.3654 + 13.0649929509 * days) % 360)
    inc = radians(5.1454)
    true_moon, distance = orbit(m, 0.0549)
    u = true_moon + perigee
    lon = node + atan2(cos(inc) * sin(u), cos(u))
    lat = asin(sin(inc) * sin(u))
    f = m + perigee
    d = f + node - solar_anomaly - perihelion
    lon += radians(-1.274*sin(m-2*d) + 0.658*sin(2*d) - 0.186*sin(solar_anomaly)
                   - 0.059*sin(2*m-2*d) - 0.057*sin(m-2*d+solar_anomaly) + 0.053*sin(m+2*d)
                   + 0.046*sin(2*d-solar_anomaly) + 0.041*sin(m-solar_anomaly) - 0.035*sin(d)
                   - 0.031*sin(m+solar_anomaly) - 0.015*sin(2*f-2*d) + 0.011*sin(m-4*d))
    lat += radians(-0.173*sin(f-2*d) - 0.055*sin(m-f-2*d) - 0.046*sin(m+f-2*d)
                   + 0.033*sin(f+2*d) + 0.017*sin(2*m+f))
    distance = 60.2666 * distance - 0.58*cos(m-2*d) - 0.46*cos(2*d)
    lunar = equatorial(lon, lat, distance, tilt)
    greenwich = radians((280.46061837 + 360.98564736629 * (days - 1.5)) % 360)
    sidereal = greenwich + radians(longitude)
    up = vector(cos(latitude)*cos(sidereal), cos(latitude)*sin(sidereal), sin(latitude))
    eccentricity2 = 0.00669438
    scale = 1 / sqrt(1 - eccentricity2 * sin(latitude)**2)
    eye = scale * vector(up.x, up.y, (1 - eccentricity2) * up.z)
    elongation = (lon - true_sun - perihelion) % (2*pi)
    return solar, lunar, eye, up, greenwich, elongation

scene.autoscale = False
scene.lights = []
sunlight = distant_light(direction=vector(0, 0, -1), color=color.white, intensity=3)
pole = vector(0, 0, 1)
earth = sphere(radius=0.995, texture=textures.earth, shininess=0)
moon = sphere(radius=0.2724, texture=textures.moon, shininess=0)
sun = sphere(emissive=True, texture=textures.sun, color=color.white, shininess=0)
ray = arrow(color=color.yellow, emissive=True, shaftwidth=0.045, visible=False)
# 지구 위에 관측자의 위치를 표시하는 만두입니다.
parts = []
def part(x, y, z, w, h, d, tint, angle=0):
    shape = ellipsoid(size=0.18 * vector(w, h, d), color=tint, emissive=True, visible=False)
    parts.append((shape, x, y + 0.94, z, angle))

cream = vector(1, 0.81, 0.55)
mint = vector(0.39, 0.68, 0.55)
ink = vector(0.04, 0.05, 0.08)
part(0, -0.12, 0, 1.85, 1.36, 1.1, cream)
for k in range(-2, 3):
    part(k * 0.21, 0.43 + (2 - abs(k)) * 0.055, 0, 0.18, 0.43, 0.66, vector(0.94, 0.67, 0.38), -k * 0.16)
for side in [-1, 1]:
    part(side * 0.39, -0.83, 0.09, 0.32, 0.22, 0.43, mint)
    part(side * 0.25, 0.12, 0.54, 0.105, 0.145, 0.045, ink)
    part(side * 0.43, -0.055, 0.505, 0.21, 0.115, 0.035, vector(0.94, 0.43, 0.51))
part(-0.96, -0.22, 0, 0.22, 0.48, 0.24, mint, -0.48)
part(0.96, 0.25, 0, 0.23, 0.55, 0.25, mint, -0.5)

# 관측자는 서울에 고정됩니다. 지평선 아래에서도 위상을 공부하려면 '달 위상 추적'을 고르세요.
view = menu(choices=["서울 하늘 · 달 확대", "달 위상 추적", "전체 조망", "지구·달 중심", "서울 하늘 · 태양 확대", "서울 하늘 · 360°"])
stamp = time()
running = True
speed = 0
last_tick = monotonic()
notice = ""

def clock_text():
    return datetime.fromtimestamp(stamp, kst).strftime("%Y-%m-%dT%H:%M")

def set_date(field):
    global stamp, last_tick, notice
    try:
        chosen = datetime.fromisoformat(field.text).replace(tzinfo=kst).timestamp()
        if not first <= chosen <= last:
            raise ValueError()
        stamp = chosen
        last_tick = monotonic()
        notice = ""
    except (ValueError, OverflowError):
        notice = "1900~2100년의 한국 시각을 선택하세요."
        field.text = clock_text()

def toggle(event):
    global running, last_tick
    running = not running
    last_tick = monotonic()
    play.text = "일시 정지" if running else "재생"

def set_speed(event):
    global speed, last_tick
    speed = event.value
    last_tick = monotonic()

def now_seoul(event):
    global stamp, last_tick, running, notice, speed
    stamp = time()
    last_tick = monotonic()
    running = True
    notice = ""
    speed = 0
    pace.value = 0
    play.text = "일시 정지"
    picker.text = clock_text()

play = button(text="일시 정지", bind=toggle)
button(text="지금 서울", bind=now_seoul)
picker = winput(prompt="시작 시각 (한국)", type="datetime-local", bind=set_date)
picker.text = clock_text()
pace = slider(min=0, max=24, step=0.25, value=0, text="시간/초 · 0은 실시간", bind=set_speed)
bearing = None
previous = None
caption = ""
while True:
    rate(24)
    tick = monotonic()
    if running:
        factor = 1 if speed == 0 else speed * 3600
        stamp += (tick - last_tick) * factor
        if stamp >= last:
            stamp = last
            toggle(None)
    last_tick = tick
    mode = view.selected
    if mode == "서울 하늘 · 360°":
        if bearing == None:
            bearing = slider(min=0, max=360, step=1, value=180, length=140, text="방위각 °")
        heading = bearing.value
    else:
        if bearing != None:
            bearing.delete()
            bearing = None
        heading = 0
    # 실시간에는 1초, 빨리 보기에는 프레임마다 관측 위치를 갱신합니다.
    instant = int(stamp) if speed == 0 else stamp
    state = (instant, mode, heading, notice)
    if state == previous:
        continue
    new_view = previous == None or mode != previous[1]
    previous = state
    solar, lunar, eye, up, greenwich, elongation = sky_positions(instant)
    east = norm(cross(pole, up))
    north = norm(cross(up, east))
    local = mode.startswith("서울") or mode == "달 위상 추적"
    moon_sight = lunar - eye
    altitude = degrees(asin(dot(norm(moon_sight), up)))
    solar_sight = solar - eye
    sun_alt = degrees(asin(dot(norm(solar_sight), up)))
    # 서울에서 보는 밝은 면의 비율은 달에서 본 태양과 관측자의 각도로 결정됩니다.
    lit = 50 * (1 + dot(norm(solar - lunar), norm(eye - lunar)))
    waxing = "차오르는 달" if elongation < pi else "기우는 달"
    status = datetime.fromtimestamp(instant, kst).strftime("%Y-%m-%d %H:%M KST")
    status += f" · {waxing} {lit:.1f}% · 달 고도 {altitude:.1f}°"
    if altitude < 0:
        status += " · 달이 지평선 아래"
    if notice:
        status += " · " + notice
    sunlight.direction = norm(lunar - solar)
    # 달의 같은 면이 대략 지구를 향합니다. 세밀한 칭동과 월식은 이 모형에서 생략합니다.
    moon.axis = -norm(lunar)
    moon.up = pole
    if new_view:
        scene.userspin = not local
        scene.userzoom = not local
        scene.userpan = not local
        scene.ambient = color.black if local else color.gray(0.14)
        ray.visible = mode == "지구·달 중심"
        earth.visible = mode != "달 위상 추적"
        if local:
            scene.fov = radians(100) if mode.endswith("360°") else 0.020
        else:
            scene.fov = radians(48)
        for shape, x, y, z, angle in parts:
            shape.visible = not local
    if local:
        moon.pos = lunar
        moon.visible = altitude >= 0 or mode == "달 위상 추적"
        sun.pos = eye + 90 * norm(solar_sight)
        sun.radius = 90 * 109 / mag(solar_sight)
        sun.visible = sun_alt > 0 and mode != "달 위상 추적"
        scene.background = vector(0.12, 0.26, 0.42) if sun.visible else color.black
        sight = moon_sight
        if mode.endswith("태양 확대"):
            sight = sun.pos - eye
            status += f" · 태양 고도 {sun_alt:.1f}°"
        elif mode.endswith("360°"):
            az = radians(heading)
            sight = 60 * (cos(radians(20)) * (cos(az)*north + sin(az)*east) + sin(radians(20))*up)
        elif altitude < 0 and mode != "달 위상 추적":
            status += " · ‘달 위상 추적’에서 모양 보기"
        scene.up = up
        scene.camera.pos = eye
        scene.camera.axis = sight
    else:
        earth.axis = vector(cos(greenwich), sin(greenwich), 0)
        earth.up = pole
        for shape, x, y, z, angle in parts:
            shape.pos = earth.radius * up + 0.18 * (-x*east + y*up + z*north)
            shape.axis = mag(shape.axis) * (-cos(angle)*east + sin(angle)*up)
            shape.up = cos(angle)*up + sin(angle)*east
        moon.pos = 3.3 * norm(lunar)
        moon.visible = True
        sun.pos = 8 * norm(solar)
        sun.radius = 1.15
        sun.visible = mode == "전체 조망"
        scene.background = vector(0.025, 0.04, 0.075)
        if ray.visible:
            ray.pos = 1.2 * norm(solar)
            ray.axis = 0.85 * norm(solar)
            status += " · 화살표는 태양 방향"
        status += " · 크기·거리 축척 조정"
        if new_view:
            center = 0.37 * sun.pos if sun.visible else 0.42 * moon.pos
            distance = 22 if sun.visible else 11
            scene.up = norm(vector(solar.x, solar.y, 0)) if sun.visible else norm(vector(lunar.x, lunar.y, 0))
            scene.camera.pos = center + distance * pole
            scene.camera.axis = -distance * pole
    if status != caption:
        scene.caption = status
        caption = status
