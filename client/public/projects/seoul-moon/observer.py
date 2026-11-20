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
# 관측소의 좌표축은 남쪽(+x), 천정(+y), 서쪽(+z)입니다.
vertical = vector(0, 1, 0)
origin = vector(0, 0, 0)
lunar_north = vector(0, -0.398, 0.917)
ground = box(pos=vector(0, -3, 0), size=vector(230, 6, 230), color=vector(.032,.055,.061), shininess=0, emissive=True)
wall = cylinder(pos=vector(-2.8, 0, -6), axis=vector(0,.70,0), radius=.78, color=vector(.30,.38,.43), shininess=0, emissive=True)
dome = sphere(pos=vector(-2.8,.70,-6), radius=.73, color=vector(.37,.51,.57), shininess=0, emissive=True)
rim = cylinder(pos=vector(-2.8,.66,-6), axis=vector(0,.10,0), radius=.81, color=vector(.08,.13,.16), emissive=True)
slit_points = []
for k in range(17):
    angle = pi * k / 32
    slit_points.append(dome.pos + .735 * vector(0, sin(angle), cos(angle)))
slit = curve(pos=slit_points, radius=.035, color=vector(.06,.10,.13), emissive=True)
door = box(pos=vector(-2.8,.24,-5.23), size=vector(.28,.48,.05), color=vector(.06,.10,.13), shininess=0, emissive=True)
window = box(pos=vector(-2.8,.33,-5.19), size=vector(.15,.14,.02), color=vector(.94,.68,.32), shininess=0, emissive=True)
station = [ground, wall, dome, rim, slit, door, window]
marker_base = cylinder(radius=.065, color=wall.color, shininess=0, emissive=True, visible=False)
marker_dome = sphere(radius=.060, color=dome.color, shininess=0, emissive=True, visible=False)
horizon_mode = "관측소 · 동쪽"
phase_mode = "달 위상 · 북쪽 위"

def local_vector(v, east, north, up):
    return vector(-dot(v, north), dot(v, up), -dot(v, east))

def daylight_color(altitude):
    # 태양 고도로 밤·박명·낮을 연속해서 잇습니다.
    night = vector(.018,.035,.075)
    dawn = vector(.65,.38,.27)
    day = vector(.18,.39,.60)
    if altitude < 0:
        return night + (dawn-night) * max(0, 1 + altitude/12)
    return dawn + (day-dawn) * min(1, altitude/12)

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

# 표준 지평 굴절 34분각과 실제 원반의 각반지름으로 윗가장자리가 뜨는 때를 구합니다.
refraction = 34 / 60

def upper_limb(instant, body):
    solar, lunar, eye, up, greenwich, elongation = sky_positions(instant)
    sight = solar-eye if body == "해" else lunar-eye
    radius = 109 if body == "해" else .2724
    return degrees(asin(dot(norm(sight), up)) + asin(radius/mag(sight))) + refraction

def sky_disc(sight, altitude, real_radius, sky_distance, drawn_radius, east, north, up):
    direction = local_vector(norm(sight), east, north, up)
    angular_radius = degrees(asin(real_radius/mag(sight)))
    enlarged = degrees(asin(drawn_radius/sky_distance))
    # 지평선에서는 실제 원반과 같은 비율만 보이게 확대합니다.
    # 천체가 높아지면 원래 고도로 부드럽게 돌아갑니다.
    apparent = altitude + refraction
    if apparent <= angular_radius:
        shown = enlarged * max(-1, apparent/angular_radius)
    else:
        blend = max(0, (10-altitude)/(10+refraction-angular_radius))
        shown = altitude + (refraction + enlarged-angular_radius) * blend
    flat = norm(vector(direction.x, 0, direction.z))
    point = sky_distance * (cos(radians(shown))*flat + sin(radians(shown))*vertical)
    return point, apparent > -angular_radius

def show_rise(event):
    global stamp, speed, running, last_tick, notice, selected_view
    body = "해" if event.text == "일출" else "달"
    start = datetime.fromtimestamp(stamp, kst).replace(hour=0, minute=0, second=0, microsecond=0).timestamp()
    before = start
    height = upper_limb(before, body)
    for hour in range(1, 25):
        after = start + hour * 3600
        next_height = upper_limb(after, body)
        if height <= 0 < next_height:
            for step in range(12):
                mid = (before+after)/2
                if upper_limb(mid, body) > 0:
                    after = mid
                else:
                    before = mid
            stamp = max(first, after - 15*60)
            speed = .05
            running = True
            last_tick = monotonic()
            notice = ""
            pace.value = speed
            selected_view = horizon_mode
            view.selected = horizon_mode
            play.text = "일시 정지"
            picker.text = clock_text()
            return
        before = after
        height = next_height
    notice = "이 날짜에는 " + event.text + "이 없습니다."

picker = winput(prompt="한국 시각", type="datetime-local", bind=set_date)
picker.text = clock_text()
selected_view = horizon_mode

def choose_view(event):
    global selected_view
    selected_view = event.selected

view = menu(choices=[horizon_mode, phase_mode, "전체 조망", "지구·달 중심"], bind=choose_view)
button(text="일출", bind=show_rise)
button(text="월출", bind=show_rise)
pace = slider(min=0, max=24, step=0.05, value=0, text="시간/초", bind=set_speed)
play = button(text="일시 정지", bind=toggle)
button(text="지금 서울", bind=now_seoul)
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
    mode = selected_view
    instant = int(stamp) if speed == 0 else stamp
    aspect = scene.width / max(1, scene.height)
    state = (instant, mode, aspect, notice)
    if state == previous:
        continue
    new_view = previous == None or mode != previous[1]
    reframe = new_view or aspect != previous[2]
    previous = state
    solar, lunar, eye, up, greenwich, elongation = sky_positions(instant)
    east = norm(cross(pole, up))
    north = norm(cross(up, east))
    moon_sight = lunar - eye
    altitude = degrees(asin(dot(norm(moon_sight), up)))
    solar_sight = solar - eye
    sun_alt = degrees(asin(dot(norm(solar_sight), up)))
    # 서울에서 보는 밝은 면의 비율은 달에서 본 태양과 관측자의 각도로 결정됩니다.
    lit = 50 * (1 + dot(norm(solar - lunar), norm(eye - lunar)))
    waxing = "차오르는 달" if elongation < pi else "기우는 달"
    status = datetime.fromtimestamp(instant, kst).strftime("%Y-%m-%d  %H:%M KST")
    status += f"\n해 {sun_alt:.1f}° · 달 {altitude:.1f}° · 밝은 면 {lit:.0f}%"
    if speed == 0 and running:
        status += " · 실시간"
    if notice:
        status += "\n" + notice
    light = norm(lunar - solar)
    if new_view:
        outer = mode in ["전체 조망", "지구·달 중심"]
        scene.userspin = outer
        scene.userzoom = outer
        scene.userpan = outer
        for shape in station:
            shape.visible = mode == horizon_mode
        marker_dome.visible = outer
        marker_base.visible = outer
        earth.visible = outer
        ray.visible = mode == "지구·달 중심"
        scene.ambient = color.gray(.14) if outer else color.black

    if mode == horizon_mode:
        # 정지한 관측소에서 동쪽을 봅니다. 작은 화면에서 뜨는 모습을 보도록 원반만 확대합니다.
        if new_view:
            moon.radius = 1.85
            sun.radius = 2.48
        if reframe:
            scene.fov = 2 * atan2(1.14, min(1.6, aspect))
            scene.up = vertical
            scene.camera.pos = vector(0,.035,0)
            scene.camera.axis = vector(0, 4.5, -12)
        scene.ambient = color.gray(.12 * min(1, max(0, (sun_alt+6)/16)))
        scene.background = daylight_color(sun_alt)
        moon.pos, moon.visible = sky_disc(moon_sight, altitude, .2724, 60, 1.85, east, north, up)
        sun.pos, sun.visible = sky_disc(solar_sight, sun_alt, 109, 80, 2.48, east, north, up)
        moon.axis = local_vector(-norm(lunar), east, north, up)
        moon.up = local_vector(lunar_north, east, north, up)
        sunlight.direction = local_vector(light, east, north, up)
    elif mode == phase_mode:
        # 달 북쪽을 화면 위에 고정합니다. 달에서 본 태양·관측자의 각도는 그대로 보존합니다.
        toward = -norm(moon_sight)
        right = norm(cross(lunar_north, toward))
        top = cross(toward, right)
        sunlight.direction = vector(dot(light,right), dot(light,top), dot(light,toward))
        if reframe:
            scene.background = color.black
            moon.pos = origin
            moon.axis = vector(0,0,1)
            moon.up = vertical
            moon.radius = 1
            moon.visible = True
            sun.visible = False
            scene.fov = radians(36)
            scene.up = vertical
            scene.camera.pos = vector(0,0,4.2 / min(1,aspect))
            scene.camera.axis = vector(0,0,-4.2 / min(1,aspect))
        status += " · " + waxing
        if altitude < 0:
            status += " (지평선 아래)"
    else:
        marker_base.pos = earth.radius * norm(eye)
        marker_base.axis = .075 * up
        marker_dome.pos = marker_base.pos + marker_base.axis
        earth.axis = vector(cos(greenwich), sin(greenwich), 0)
        earth.up = pole
        sunlight.direction = light
        if new_view:
            scene.fov = radians(48)
            moon.radius = .2724
            sun.radius = 1.15
        moon.axis = -norm(lunar)
        moon.up = lunar_north
        moon.pos = 3.3 * norm(lunar)
        moon.visible = True
        sun.pos = 8 * norm(solar)
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
