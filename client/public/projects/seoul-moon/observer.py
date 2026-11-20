from vpython import *
from datetime import datetime, timedelta, timezone
from time import time, monotonic
from math import sin, cos, atan2, asin, sqrt, radians, degrees, hypot, tan, pi

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

# 달 궤도 섭동 계수. Meeus 47장, astronomia (MIT, 저작권과 출처는 SOURCES.md).
longitude_distance_terms = [
    (0, 0, 1, 0, 6288774, -20905355), (2, 0, -1, 0, 1274027, -3699111), (2, 0, 0, 0, 658314, -2955968),
    (0, 0, 2, 0, 213618, -569925), (0, 1, 0, 0, -185116, 48888), (0, 0, 0, 2, -114332, -3149),
    (2, 0, -2, 0, 58793, 246158), (2, -1, -1, 0, 57066, -152138), (2, 0, 1, 0, 53322, -170733),
    (2, -1, 0, 0, 45758, -204586), (0, 1, -1, 0, -40923, -129620), (1, 0, 0, 0, -34720, 108743),
    (0, 1, 1, 0, -30383, 104755), (2, 0, 0, -2, 15327, 10321), (0, 0, 1, 2, -12528, 0),
    (0, 0, 1, -2, 10980, 79661), (4, 0, -1, 0, 10675, -34782), (0, 0, 3, 0, 10034, -23210),
    (4, 0, -2, 0, 8548, -21636), (2, 1, -1, 0, -7888, 24208), (2, 1, 0, 0, -6766, 30824),
    (1, 0, -1, 0, -5163, -8379), (1, 1, 0, 0, 4987, -16675), (2, -1, 1, 0, 4036, -12831),
    (2, 0, 2, 0, 3994, -10445), (4, 0, 0, 0, 3861, -11650), (2, 0, -3, 0, 3665, 14403),
    (0, 1, -2, 0, -2689, -7003), (2, 0, -1, 2, -2602, 0), (2, -1, -2, 0, 2390, 10056),
    (1, 0, 1, 0, -2348, 6322), (2, -2, 0, 0, 2236, -9884), (0, 1, 2, 0, -2120, 5751),
    (0, 2, 0, 0, -2069, 0), (2, -2, -1, 0, 2048, -4950), (2, 0, 1, -2, -1773, 4130),
    (2, 0, 0, 2, -1595, 0), (4, -1, -1, 0, 1215, -3958), (0, 0, 2, 2, -1110, 0),
    (3, 0, -1, 0, -892, 3258), (2, 1, 1, 0, -810, 2616), (4, -1, -2, 0, 759, -1897),
    (0, 2, -1, 0, -713, -2117), (2, 2, -1, 0, -700, 2354), (2, 1, -2, 0, 691, 0),
    (2, -1, 0, -2, 596, 0), (4, 0, 1, 0, 549, -1423), (0, 0, 4, 0, 537, -1117),
    (4, -1, 0, 0, 520, -1571), (1, 0, -2, 0, -487, -1739), (2, 1, 0, -2, -399, 0),
    (0, 0, 2, -2, -381, -4421), (1, 1, 1, 0, 351, 0), (3, 0, -2, 0, -340, 0),
    (4, 0, -3, 0, 330, 0), (2, -1, 2, 0, 327, 0), (0, 2, 1, 0, -323, 1165),
    (1, 1, -1, 0, 299, 0), (2, 0, 3, 0, 294, 0), (2, 0, -1, -2, 0, 8752),
]

latitude_terms = [
    (0, 0, 0, 1, 5128122), (0, 0, 1, 1, 280602), (0, 0, 1, -1, 277693),
    (2, 0, 0, -1, 173237), (2, 0, -1, 1, 55413), (2, 0, -1, -1, 46271),
    (2, 0, 0, 1, 32573), (0, 0, 2, 1, 17198), (2, 0, 1, -1, 9266),
    (0, 0, 2, -1, 8822), (2, -1, 0, -1, 8216), (2, 0, -2, -1, 4324),
    (2, 0, 1, 1, 4200), (2, 1, 0, -1, -3359), (2, -1, -1, 1, 2463),
    (2, -1, 0, 1, 2211), (2, -1, -1, -1, 2065), (0, 1, -1, -1, -1870),
    (4, 0, -1, -1, 1828), (0, 1, 0, 1, -1794), (0, 0, 0, 3, -1749),
    (0, 1, -1, 1, -1565), (1, 0, 0, 1, -1491), (0, 1, 1, 1, -1475),
    (0, 1, 1, -1, -1410), (0, 1, 0, -1, -1344), (1, 0, 0, -1, -1335),
    (0, 0, 3, 1, 1107), (4, 0, 0, -1, 1021), (4, 0, -1, 1, 833),
    (0, 0, 1, -3, 777), (4, 0, -2, 1, 671), (2, 0, 0, -3, 607),
    (2, 0, 2, -1, 596), (2, -1, 1, -1, 491), (2, 0, -2, 1, -451),
    (0, 0, 3, -1, 439), (2, 0, 2, 1, 422), (2, 0, -3, -1, 421),
    (2, 1, -1, 1, -366), (2, 1, 0, 1, -351), (4, 0, 0, 1, 331),
    (2, -1, 1, 1, 315), (2, -2, 0, -1, 302), (0, 0, 1, 3, -283),
    (2, 1, 1, -1, -229), (1, 1, 0, -1, 223), (1, 1, 0, 1, 223),
    (0, 1, -2, -1, -220), (2, 1, -1, -1, -220), (1, 0, 1, 1, -185),
    (2, -1, -2, -1, 181), (0, 1, 2, 1, -177), (4, 0, -2, -1, 176),
    (4, -1, -1, -1, 166), (1, 0, 1, -1, -164), (4, 0, 1, -1, 132),
    (1, 0, -1, -1, -119), (4, -1, 0, -1, 115), (2, -2, 0, 1, 107),
]

def lunar_position(t):
    # 율리우스 세기 단위의 지구시를 사용합니다.
    mean_lon = radians((218.3164477 + t*(481267.88123421 + t*(-.0015786 + t*(1/538841 - t/65194000)))) % 360)
    d = radians((297.8501921 + t*(445267.1114034 + t*(-.0018819 + t*(1/545868 - t/113065000)))) % 360)
    m = radians((357.5291092 + t*(35999.0502909 + t*(-.0001536 + t/24490000))) % 360)
    mp = radians((134.9633964 + t*(477198.8675055 + t*(.0087414 + t*(1/69699 - t/14712000)))) % 360)
    f = radians((93.272095 + t*(483202.0175233 + t*(-.0036539 + t*(-1/3526000 + t/863310000)))) % 360)
    a1 = radians(119.75 + 131.849*t)
    a2 = radians(53.09 + 479264.29*t)
    a3 = radians(313.45 + 481266.484*t)
    eccentricity = 1 - .002516*t - .0000074*t*t
    lon = 3958*sin(a1) + 1962*sin(mean_lon-f) + 318*sin(a2)
    lat = -2235*sin(mean_lon) + 382*sin(a3) + 175*sin(a1-f) + 175*sin(a1+f) + 127*sin(mean_lon-mp) - 115*sin(mean_lon+mp)
    distance = 0
    for i, j, k, l, lon_coeff, dist_coeff in longitude_distance_terms:
        angle = i*d + j*m + k*mp + l*f
        weight = eccentricity**abs(j)
        lon += lon_coeff * weight * sin(angle)
        distance += dist_coeff * weight * cos(angle)
    for i, j, k, l, coeff in latitude_terms:
        lat += coeff * eccentricity**abs(j) * sin(i*d+j*m+k*mp+l*f)
    return mean_lon+radians(lon/1e6), radians(lat/1e6), (385000.56 + distance/1000)/6378.137

# IAU 달 고정 좌표계. JPL NAIF pck00011, BODY301.
orientation_terms = [
    (125.045, -1935.5364525, -3.8787, 1.5419, 3.5610),
    (250.089, -3871.072905, -.1204, .0239, .1208),
    (260.008, 475263.3328725, .0700, -.0278, -.0642),
    (176.625, 487269.629985, -.0172, .0068, .0158),
    (357.529, 35999.0509575, 0, 0, .0252),
    (311.589, 964468.49931, .0072, -.0029, -.0066),
    (134.963, 477198.869325, 0, .0009, -.0047),
    (276.617, 12006.300765, 0, 0, -.0046),
    (34.226, 63863.5132425, 0, 0, .0028),
    (15.134, -5806.6093575, -.0052, .0008, .0052),
    (119.743, 131.84064, 0, 0, .0040),
    (239.961, 6003.1503825, 0, 0, .0019),
    (25.053, 473327.79642, .0043, -.0009, -.0044),
]

def terrestrial_days(stamp):
    # 현대 UTC→TT의 69.184초를 근사값으로 사용합니다.
    return (stamp - epoch + 69.184)/86400 - 1.5

def precess(v, t):
    zeta = radians(t*(2306.2181 + t*(.30188 + .017998*t))/3600)
    z = radians(t*(2306.2181 + t*(1.09468 + .018203*t))/3600)
    theta = radians(t*(2004.3109 - t*(.42665 + .041833*t))/3600)
    polar = vector(0,0,1)
    return v.rotate(zeta, polar).rotate(-theta, vector(0,1,0)).rotate(z, polar)

def lunar_frame(stamp):
    days = terrestrial_days(stamp)
    t = days/36525
    ra = 269.9949 + .0031*t
    dec = 66.5392 + .0130*t
    w = 38.3213 + 13.17635815*days - 1.4e-12*days*days
    for start, rate_deg, ra_coeff, dec_coeff, spin_coeff in orientation_terms:
        angle = radians((start+rate_deg*t) % 360)
        ra += ra_coeff*sin(angle)
        dec += dec_coeff*cos(angle)
        w += spin_coeff*sin(angle)
    ra, dec, w = radians(ra), radians(dec), radians(w % 360)
    north = vector(cos(dec)*cos(ra), cos(dec)*sin(ra), sin(dec))
    node = vector(-sin(ra), cos(ra), 0)
    prime = cos(w)*node + sin(w)*cross(north, node)
    return precess(prime,t), precess(north,t)

def sky_positions(stamp):
    days = (stamp - epoch) / 86400
    tilt = radians(23.4393 - 0.0000003563 * days)
    solar_anomaly = radians((356.0470 + 0.9856002585 * days) % 360)
    perihelion = radians(282.9404 + 0.0000470935 * days)
    true_sun, distance = orbit(solar_anomaly, 0.016709 - 0.000000001151 * days)
    solar = equatorial(true_sun + perihelion, 0, distance * 23454.79, tilt)

    lon, lat, distance = lunar_position(terrestrial_days(stamp)/36525)
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
moon = sphere(radius=0.2724, texture="/projects/seoul-moon/lroc-color.jpg", shininess=0)
sun = sphere(emissive=True, texture=textures.sun, color=color.white, shininess=0)
ray = arrow(color=color.yellow, emissive=True, shaftwidth=0.045, visible=False)
# 관측소의 좌표축은 남쪽(+x), 천정(+y), 서쪽(+z)입니다.
vertical = vector(0, 1, 0)
origin = vector(0, 0, 0)
observer_eye = vector(0,.007,0)
rise_heading = vector(0,0,-1)
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
rise_mode = "지평선 확대"
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
    radius = 109.1 if body == "해" else .2724
    return degrees(asin(dot(norm(sight), up)) + asin(radius/mag(sight))) + refraction

def apparent_altitude(geometric):
    # Bennett 표준 대기 굴절식의 역을 이분법으로 계산합니다.
    # 지평선 아래에는 첫 접촉에 쓰는 34분각을 연속해서 적용합니다.
    if geometric <= -refraction:
        return geometric + refraction
    if geometric >= 89:
        return geometric
    low, high = geometric, geometric + .6
    for step in range(12):
        app = (low+high)/2
        h = max(0, app)
        bend = refraction * tan(radians(7.31/4.4)) / tan(radians(h + 7.31/(h+4.4)))
        if app-bend > geometric:
            high = app
        else:
            low = app
    return (low+high)/2

def sky_disc(sight, altitude, physical_radius, display_radius, east, north, up):
    direction = local_vector(norm(sight), east, north, up)
    flat = norm(vector(direction.x, 0, direction.z))
    half_angle = degrees(asin(physical_radius/mag(sight)))
    top = apparent_altitude(altitude+half_angle)
    # 윗가장자리의 굴절을 맞춰 첫 출현 시각을 보존합니다.
    height = radians(top-half_angle)
    distance = mag(sight)*display_radius/physical_radius
    return observer_eye + distance*(cos(height)*flat + sin(height)*vertical), top > 0

def show_rise(event):
    global stamp, speed, running, last_tick, notice, selected_view, rise_heading
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
            solar, lunar, eye, up, greenwich, elongation = sky_positions(after)
            east = norm(cross(vector(0,0,1),up))
            north = norm(cross(up,east))
            sight = solar-eye if body == "해" else lunar-eye
            direction = local_vector(sight,east,north,up)
            rise_heading = norm(vector(direction.x,0,direction.z))
            selected_view = rise_mode
            view.selected = rise_mode
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

view = menu(choices=[horizon_mode, rise_mode, phase_mode, "전체 조망", "지구·달 중심"], bind=choose_view)
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
    state = (instant, mode, aspect, notice, rise_heading.x, rise_heading.z, running, speed)
    if state == previous:
        continue
    new_view = previous == None or mode != previous[1]
    reframe = new_view or aspect != previous[2] or state[4:6] != previous[4:6]
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
    status += f"\n기하 고도 · 해 {sun_alt:.1f}° · 달 {altitude:.1f}° · 밝은 면 {lit:.0f}%"
    if speed == 0 and running:
        status += " · 실시간"
    if notice:
        status += "\n" + notice
    prime, lunar_north = lunar_frame(instant)
    light = norm(lunar - solar)
    if new_view:
        outer = mode in ["전체 조망", "지구·달 중심"]
        scene.userspin = outer
        scene.userzoom = outer
        scene.userpan = outer
        for shape in station:
            shape.visible = mode in [horizon_mode, rise_mode]
        marker_dome.visible = outer
        marker_base.visible = outer
        earth.visible = outer
        ray.visible = mode == "지구·달 중심"
        scene.ambient = color.gray(.14) if outer else color.black

    if mode in [horizon_mode, rise_mode]:
        if new_view:
            moon.radius = .2724
            sun.radius = .4
            sun.texture = None
        if reframe:
            scene.up = vertical
            if mode == rise_mode:
                scene.fov = 2*atan2(tan(radians(7)), min(1,aspect))
                axis = 12*rise_heading + vector(0,.55,0)
            else:
                scene.fov = 2*atan2(1.14, min(1.6,aspect))
                axis = vector(0,4.5,-12)
            scene.camera.pos = observer_eye
            scene.camera.axis = axis
        scene.ambient = color.gray(.12 * min(1, max(0, (sun_alt+6)/16)))
        scene.background = daylight_color(sun_alt)
        # 낮하늘의 산란광 때문에 달의 명암 대비가 약해집니다.
        moon.opacity = 1 - .70*min(1,max(0,(sun_alt+6)/16))
        sun.color = vector(1, .65, .28) + min(1,max(0,sun_alt/12))*vector(0,.35,.72)
        moon.pos, moon.visible = sky_disc(moon_sight, altitude, .2724, .2724, east, north, up)
        sun.pos, sun.visible = sky_disc(solar_sight, sun_alt, 109.1, .4, east, north, up)
        moon.axis = local_vector(prime, east, north, up)
        moon.up = local_vector(lunar_north, east, north, up)
        sunlight.direction = local_vector(light, east, north, up)
    elif mode == phase_mode:
        # 달 북쪽을 화면 위에 고정합니다. 달에서 본 태양·관측자의 각도는 그대로 보존합니다.
        toward = -norm(moon_sight)
        right = norm(cross(lunar_north, toward))
        top = cross(toward, right)
        sunlight.direction = vector(dot(light,right), dot(light,top), dot(light,toward))
        moon.axis = vector(dot(prime,right), dot(prime,top), dot(prime,toward))
        moon.up = vector(0, dot(lunar_north,top), dot(lunar_north,toward))
        if reframe:
            scene.background = color.black
            moon.pos = origin
            moon.radius = .2724
            moon.visible = True
            moon.opacity = 1
            sun.visible = False
            scene.fov = 2*atan2(tan(radians(.4)), min(1,aspect))
            scene.up = vertical
        distance = mag(moon_sight)
        scene.camera.pos = vector(0,0,distance)
        scene.camera.axis = vector(0,0,-distance)
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
            moon.opacity = 1
            scene.fov = radians(48)
            moon.radius = .2724
            sun.radius = 1.15
            sun.color = color.white
            sun.texture = textures.sun
        moon.axis = prime
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
