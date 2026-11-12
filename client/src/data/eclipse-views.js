// 일식·월식 시점 전환 모형. 예제(examples.js)와 카메라 튜토리얼의 마지막 단계가 같은 코드를 사용합니다.
// 시작 각도는 서울에서 개기 일식이 약 6.5초 뒤, 월식이 약 48초 뒤에 보이도록 고른 값입니다(빠르기 1 기준).
// 값을 바꾸면 src/data/camera-views.test.js의 관측 검사도 함께 확인하세요.
export const eclipseViewsCode = `from vpython import *

# 태양, 지구, 달의 크기와 거리는 한 화면에 보이도록 바꾼 값입니다. 실제 비율이 아닙니다.
# 실제 달 궤도는 약 5도 기울어 있습니다. 이 모형은 천체를 크게 그렸으므로 기울기도 25도로 키웠습니다.
# 실제 지구는 달이 한 바퀴 도는 동안 약 27번 자전합니다. 여기서는 관찰하기 쉽게 약 3번만 자전합니다.
scene.background = color.black
scene.lights = []
scene.ambient = color.gray(0.15)

sun = sphere(pos=vector(0, 0, 0), radius=2, color=color.yellow, emissive=True)
earth = sphere(radius=1, color=color.blue)
moon = sphere(radius=0.4, color=color.white)
seoul = sphere(radius=0.06, color=color.red, emissive=True)
shadow = cylinder(radius=1, color=color.gray(0.5), opacity=0.25, emissive=True)   # 지구 그림자가 지나는 곳 (보이도록 밝게 표시)
sunlight = distant_light(direction=vector(1, 0, 0), color=color.white)

views = menu(choices=["우주에서 보기 / Space", "서울에서 태양 보기 / Sun from Seoul", "서울에서 달 보기 / Moon from Seoul", "달에서 지구 보기 / Earth from Moon"])
speed = slider(min=0, max=20, value=1, text="빠르기 / Speed")

earth_distance = 24
moon_distance = 5
tilt = radians(25)          # 달 궤도의 기울기
latitude = radians(37.5)    # 서울의 위도

# 실행하고 약 6초 뒤 서울에서 일식이 보이도록 고른 시작 각도
earth_angle = 2.87
moon_angle = 5.51
spin_angle = 4.57

last_view = -1
last_message = ""
while True:
    rate(60)
    earth_angle = earth_angle + 0.0001 * speed.value   # 지구의 공전
    moon_angle = moon_angle + 0.0013 * speed.value     # 달의 공전
    spin_angle = spin_angle + 0.0037 * speed.value     # 지구의 자전

    earth.pos = vector(cos(earth_angle), 0, sin(earth_angle)) * earth_distance
    moon_offset = vector(cos(moon_angle), 0, sin(moon_angle)) * moon_distance
    moon_offset = moon_offset.rotate(angle=tilt, axis=vector(1, 0, 0))   # 궤도면을 기울인다
    moon.pos = earth.pos + moon_offset
    seoul_offset = vector(cos(latitude) * cos(spin_angle), sin(latitude), cos(latitude) * sin(spin_angle))
    seoul.pos = earth.pos + seoul_offset

    # 햇빛과 지구 그림자는 태양 반대쪽을 향한다
    away = hat(earth.pos - sun.pos)
    sunlight.direction = away
    shadow.pos = earth.pos
    shadow.axis = away * 8

    # 월식: 달이 지구 그림자 안에 들어갔는지 계산한다
    behind = dot(moon_offset, away)
    side = mag(moon_offset - away * behind)
    # 일식: 달 그림자가 지구에 닿는지 계산한다
    toward = hat(moon.pos - sun.pos)
    reach = dot(earth.pos - moon.pos, toward)
    miss = mag(earth.pos - moon.pos - toward * reach)

    message = "식이 없습니다 / No eclipse"
    moon.color = color.white
    if behind > 0 and side < earth.radius:
        message = "월식: 달이 지구 그림자 안에 있습니다 / Lunar eclipse"
        moon.color = vector(0.4, 0.1, 0.05)
    if reach > 0 and miss < earth.radius + 2 * moon.radius:   # 옅은 그림자까지 포함한다
        message = "일식: 달 그림자가 지구에 닿았습니다 / Solar eclipse"
    if message != last_message:
        last_message = message
        scene.caption = message

    # 시점을 바꾼 순간에 한 번만 하는 일
    view = views.index
    if view != last_view:
        last_view = view
        scene.up = vector(0, 1, 0)
        if view == 1 or view == 2:
            scene.fov = pi / 6    # 망원경처럼 좁은 범위를 크게 본다
        else:
            scene.fov = pi / 3
        if view == 0:
            scene.camera.pos = vector(0, 20, 32)
            scene.camera.axis = vector(0, -20, -32)

    # 움직이는 곳에 카메라를 두는 시점은 매번 다시 정한다
    eye = seoul.pos + seoul_offset * 0.05   # 서울 지표면 바로 위
    if view == 1:
        scene.up = seoul_offset             # 서울의 머리 위 방향이 화면의 위쪽
        scene.camera.pos = eye
        scene.camera.axis = sun.pos - eye
    if view == 2:
        scene.up = seoul_offset
        scene.camera.pos = eye
        scene.camera.axis = moon.pos - eye
    if view == 3:
        moon_eye = moon.pos - hat(moon_offset) * 0.45   # 지구를 향한 달 표면 바로 위
        scene.camera.pos = moon_eye
        scene.camera.axis = earth.pos - moon_eye
`;
