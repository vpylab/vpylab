"""
VPyLab 피지컬 컴퓨팅 키트 — 학생 코드에서 `from 피지컬키트 import *`로 불러 쓴다.

미션의 본질(센서 함수와 판단 조건문)에 집중하도록, 장면·친구·출력 장치를 만드는 코드를 이 모듈에 숨긴다.
학생 화면에는 `만두 = 만두_친구(vector(-5.5, 0, 0.4))`처럼 이름 붙인 변수만 남는다.

- Worker(pyodide-worker.js)와 테스트 하네스(src/test/run-vpython.py)가 vpython 모듈 다음에 이 파일을
  `피지컬키트` 모듈로 등록한다. 모듈은 한 번만 만들어지므로 실행마다 장면 함수(…_만들기)가 상태를 비운다.
- 키트 함수는 rate()·sleep()·음표() 같은 대기 함수를 부르지 않는다(학생 코드 변환기가 import한 함수에는
  await를 붙이지 않는다). 소리는 기다리지 않는 소리()·play_sequence()만 사용한다.
- 친구 모양은 첫 화면 친구 명세(welcome-friends.js)에서 생성한 코드이고, physical-kit.test.js가 일치를 확인한다.
- 채점: 점검 함수가 정해진 위치·값으로 학생 함수를 시험해 라벨 '① 거리 센서: 통과'·'② 판단하기: 통과'를 만든다.
"""
from vpython import *
from math import sin, cos, pi

__all__ = [
    # 장면
    '밤길_만들기', '주차장_만들기', '운전_연습장_만들기',
    # 친구와 장치
    '만두_친구', '공구상자_친구', '손전등_가로등', '거리_센서', '경고_장치',
    '주차_벽', '자동차_만들기', '후방_경보기',
    # 움직임
    '왕복_걷기', '뒤로_주차하기',
    # 점검
    '가로등_점검', '주차_점검', '후진_점검',
]

# <<FRIENDS>>
def make_dumpling(origin=None, scale=1):
    origin = vector(0,0,0) if origin is None else origin
    body = ellipsoid(pos=origin+vector(0, -0.12, 0)*scale, size=vector(1.85, 1.36, 1.1)*scale, color=vector(1, 0.89412, 0.72549))
    fold_0 = ellipsoid(pos=origin+vector(-0.42, 0.43, 0)*scale, size=vector(0.18, 0.43, 0.66)*scale, color=vector(0.97255, 0.83922, 0.64314))
    fold_0.rotate(angle=0.32, axis=vector(0,0,1))
    fold_1 = ellipsoid(pos=origin+vector(-0.21, 0.485, 0)*scale, size=vector(0.18, 0.43, 0.66)*scale, color=vector(0.97255, 0.83922, 0.64314))
    fold_1.rotate(angle=0.16, axis=vector(0,0,1))
    fold_2 = ellipsoid(pos=origin+vector(0, 0.54, 0)*scale, size=vector(0.18, 0.43, 0.66)*scale, color=vector(0.97255, 0.83922, 0.64314))
    fold_3 = ellipsoid(pos=origin+vector(0.21, 0.485, 0)*scale, size=vector(0.18, 0.43, 0.66)*scale, color=vector(0.97255, 0.83922, 0.64314))
    fold_3.rotate(angle=-0.16, axis=vector(0,0,1))
    fold_4 = ellipsoid(pos=origin+vector(0.42, 0.43, 0)*scale, size=vector(0.18, 0.43, 0.66)*scale, color=vector(0.97255, 0.83922, 0.64314))
    fold_4.rotate(angle=-0.32, axis=vector(0,0,1))
    left_foot = ellipsoid(pos=origin+vector(-0.39, -0.83, 0.09)*scale, size=vector(0.32, 0.22, 0.43)*scale, color=vector(0.6549, 0.84314, 0.76863))
    right_foot = ellipsoid(pos=origin+vector(0.39, -0.83, 0.09)*scale, size=vector(0.32, 0.22, 0.43)*scale, color=vector(0.6549, 0.84314, 0.76863))
    left_hand = ellipsoid(pos=origin+vector(-0.96, -0.22, 0)*scale, size=vector(0.22, 0.48, 0.24)*scale, color=vector(0.6549, 0.84314, 0.76863))
    left_hand.rotate(angle=-0.48, axis=vector(0,0,1))
    right_hand = ellipsoid(pos=origin+vector(0.96, 0.25, 0)*scale, size=vector(0.23, 0.55, 0.25)*scale, color=vector(0.6549, 0.84314, 0.76863))
    right_hand.rotate(angle=-0.5, axis=vector(0,0,1))
    eye_minus1 = ellipsoid(pos=origin+vector(-0.25, 0.12, 0.54)*scale, size=vector(0.105, 0.145, 0.045)*scale, color=vector(0.16078, 0.2, 0.25882))
    cheek_minus1 = ellipsoid(pos=origin+vector(-0.43, -0.055, 0.505)*scale, size=vector(0.21, 0.115, 0.035)*scale, color=vector(0.95294, 0.65098, 0.68235))
    eye_1 = ellipsoid(pos=origin+vector(0.25, 0.12, 0.54)*scale, size=vector(0.105, 0.145, 0.045)*scale, color=vector(0.16078, 0.2, 0.25882))
    cheek_1 = ellipsoid(pos=origin+vector(0.43, -0.055, 0.505)*scale, size=vector(0.21, 0.115, 0.035)*scale, color=vector(0.95294, 0.65098, 0.68235))
    # curve는 compound에 넣을 수 없어, 구와 원기둥으로 매끄럽게 잇습니다.
    mouth = []
    previous = None
    for i in range(25):
        angle = i*pi/24
        point = origin + vector(-0.12*cos(angle), -0.09-0.08*sin(angle), 0.56)*scale
        mouth.append(sphere(pos=point, radius=0.012*scale, color=vector(0.16078, 0.2, 0.25882)))
        if previous is not None:
            mouth.append(cylinder(pos=previous, axis=point-previous, radius=0.012*scale, color=vector(0.16078, 0.2, 0.25882)))
        previous = point
    return compound([body, fold_0, fold_1, fold_2, fold_3, fold_4, left_foot, right_foot, left_hand, right_hand, eye_minus1, cheek_minus1, eye_1, cheek_1] + mouth)


def make_flashlight(origin=None, scale=1):
    origin = vector(0,0,0) if origin is None else origin
    body = cylinder(pos=origin+vector(0, -0.73, 0)*scale, axis=vector(0, 1.4, 0)*scale, radius=0.46*scale, color=vector(0.72157, 0.69804, 0.93333))
    head = cone(pos=origin+vector(0, 1.05, 0)*scale, axis=vector(0, -0.55, 0)*scale, radius=0.69*scale, color=vector(0.65098, 0.61569, 0.89412))
    light = cylinder(pos=origin+vector(0, 1.05, 0)*scale, axis=vector(0, 0.045, 0)*scale, radius=0.65*scale, color=vector(1, 0.94902, 0.74902))
    rim = ring(pos=origin+vector(0, 1.09, 0)*scale, axis=vector(0, 1, 0)*scale, radius=0.67*scale, thickness=0.035*scale, color=vector(0.5451, 0.50588, 0.77255))
    switch = box(pos=origin+vector(0, -0.43, 0.47)*scale, size=vector(0.19, 0.25, 0.09)*scale, color=vector(1, 0.89412, 0.63922))
    left_foot = ellipsoid(pos=origin+vector(-0.39, -0.84, 0.09)*scale, size=vector(0.32, 0.22, 0.43)*scale, color=vector(0.6549, 0.84314, 0.76863))
    right_foot = ellipsoid(pos=origin+vector(0.39, -0.84, 0.09)*scale, size=vector(0.32, 0.22, 0.43)*scale, color=vector(0.6549, 0.84314, 0.76863))
    left_hand = ellipsoid(pos=origin+vector(-0.57, -0.22, 0)*scale, size=vector(0.22, 0.48, 0.24)*scale, color=vector(0.72157, 0.69804, 0.93333))
    left_hand.rotate(angle=-0.48, axis=vector(0,0,1))
    right_hand = ellipsoid(pos=origin+vector(0.57, 0.25, 0)*scale, size=vector(0.23, 0.55, 0.25)*scale, color=vector(0.72157, 0.69804, 0.93333))
    right_hand.rotate(angle=-0.5, axis=vector(0,0,1))
    eye_minus1 = ellipsoid(pos=origin+vector(-0.25, 0.28, 0.465)*scale, size=vector(0.105, 0.145, 0.045)*scale, color=vector(0.16078, 0.2, 0.25882))
    cheek_minus1 = ellipsoid(pos=origin+vector(-0.43, 0.105, 0.43)*scale, size=vector(0.21, 0.115, 0.035)*scale, color=vector(0.95294, 0.65098, 0.68235))
    eye_1 = ellipsoid(pos=origin+vector(0.25, 0.28, 0.465)*scale, size=vector(0.105, 0.145, 0.045)*scale, color=vector(0.16078, 0.2, 0.25882))
    cheek_1 = ellipsoid(pos=origin+vector(0.43, 0.105, 0.43)*scale, size=vector(0.21, 0.115, 0.035)*scale, color=vector(0.95294, 0.65098, 0.68235))
    # curve는 compound에 넣을 수 없어, 구와 원기둥으로 매끄럽게 잇습니다.
    mouth = []
    previous = None
    for i in range(25):
        angle = i*pi/24
        point = origin + vector(-0.12*cos(angle), 0.07-0.08*sin(angle), 0.485)*scale
        mouth.append(sphere(pos=point, radius=0.012*scale, color=vector(0.16078, 0.2, 0.25882)))
        if previous is not None:
            mouth.append(cylinder(pos=previous, axis=point-previous, radius=0.012*scale, color=vector(0.16078, 0.2, 0.25882)))
        previous = point
    return compound([body, head, light, rim, switch, left_foot, right_foot, left_hand, right_hand, eye_minus1, cheek_minus1, eye_1, cheek_1] + mouth)


def make_toolbox(origin=None, scale=1):
    origin = vector(0,0,0) if origin is None else origin
    handle = ring(pos=origin+vector(0, 0.83, 0)*scale, axis=vector(0, 0, 1)*scale, radius=0.32*scale, thickness=0.085*scale, color=vector(0.91765, 0.79608, 0.49412))
    body = box(pos=origin+vector(0, -0.04, 0)*scale, size=vector(1.55, 1.05, 0.85)*scale, color=vector(0.96078, 0.57255, 0.5098))
    left_edge = ellipsoid(pos=origin+vector(-0.76, -0.04, 0)*scale, size=vector(0.22, 1.05, 0.85)*scale, color=vector(0.96078, 0.57255, 0.5098))
    right_edge = ellipsoid(pos=origin+vector(0.76, -0.04, 0)*scale, size=vector(0.22, 1.05, 0.85)*scale, color=vector(0.96078, 0.57255, 0.5098))
    lid = box(pos=origin+vector(0, 0.47, 0)*scale, size=vector(1.8, 0.26, 0.98)*scale, color=vector(0.97255, 0.63137, 0.55686))
    clasp = box(pos=origin+vector(0, 0.35, 0.53)*scale, size=vector(0.32, 0.28, 0.12)*scale, color=vector(0.94902, 0.82353, 0.54118))
    left_foot = ellipsoid(pos=origin+vector(-0.39, -0.72, 0.09)*scale, size=vector(0.32, 0.22, 0.43)*scale, color=vector(0.6549, 0.84314, 0.76863))
    right_foot = ellipsoid(pos=origin+vector(0.39, -0.72, 0.09)*scale, size=vector(0.32, 0.22, 0.43)*scale, color=vector(0.6549, 0.84314, 0.76863))
    left_hand = ellipsoid(pos=origin+vector(-0.96, -0.22, 0)*scale, size=vector(0.22, 0.48, 0.24)*scale, color=vector(0.6549, 0.84314, 0.76863))
    left_hand.rotate(angle=-0.48, axis=vector(0,0,1))
    right_hand = ellipsoid(pos=origin+vector(0.96, 0.25, 0)*scale, size=vector(0.23, 0.55, 0.25)*scale, color=vector(0.6549, 0.84314, 0.76863))
    right_hand.rotate(angle=-0.5, axis=vector(0,0,1))
    eye_minus1 = ellipsoid(pos=origin+vector(-0.25, 0.05, 0.44)*scale, size=vector(0.105, 0.145, 0.045)*scale, color=vector(0.16078, 0.2, 0.25882))
    cheek_minus1 = ellipsoid(pos=origin+vector(-0.43, -0.125, 0.405)*scale, size=vector(0.21, 0.115, 0.035)*scale, color=vector(0.95294, 0.65098, 0.68235))
    eye_1 = ellipsoid(pos=origin+vector(0.25, 0.05, 0.44)*scale, size=vector(0.105, 0.145, 0.045)*scale, color=vector(0.16078, 0.2, 0.25882))
    cheek_1 = ellipsoid(pos=origin+vector(0.43, -0.125, 0.405)*scale, size=vector(0.21, 0.115, 0.035)*scale, color=vector(0.95294, 0.65098, 0.68235))
    # curve는 compound에 넣을 수 없어, 구와 원기둥으로 매끄럽게 잇습니다.
    mouth = []
    previous = None
    for i in range(25):
        angle = i*pi/24
        point = origin + vector(-0.12*cos(angle), -0.16-0.08*sin(angle), 0.46)*scale
        mouth.append(sphere(pos=point, radius=0.012*scale, color=vector(0.16078, 0.2, 0.25882)))
        if previous is not None:
            mouth.append(cylinder(pos=previous, axis=point-previous, radius=0.012*scale, color=vector(0.16078, 0.2, 0.25882)))
        previous = point
    return compound([handle, body, left_edge, right_edge, lid, clasp, left_foot, right_foot, left_hand, right_hand, eye_minus1, cheek_minus1, eye_1, cheek_1] + mouth)
# <</FRIENDS>>

# === 실행마다 비우는 상태 ===
_현재 = {}
_기준위치 = {}


def _초기화():
    _현재.clear()
    _기준위치.clear()


def _기억(물체):
    _기준위치[id(물체)] = vector(물체.pos)


def _숫자인가(값):
    if isinstance(값, bool):
        return False
    return isinstance(값, (int, float))


def _결과_표시(위치, 거리_맞음, 거리_전체, 판단_맞음, 판단_전체):
    """점검 결과를 화면 라벨로 보여 준다. 채점기는 이 라벨 글자를 확인한다."""
    if 거리_맞음 == 거리_전체:
        거리_글 = '① 거리 센서: 통과'
        거리_색 = color.green
    else:
        거리_글 = '① 거리 센서: 다시 확인 (' + str(거리_맞음) + '/' + str(거리_전체) + ')'
        거리_색 = color.orange
    if 판단_맞음 == 판단_전체:
        판단_글 = '② 판단하기: 통과'
        판단_색 = color.green
    else:
        판단_글 = '② 판단하기: 다시 확인 (' + str(판단_맞음) + '/' + str(판단_전체) + ')'
        판단_색 = color.orange
    label(pos=위치, text=거리_글, color=거리_색, height=15, box=False)
    label(pos=위치 - vector(0, 0.6, 0), text=판단_글, color=판단_색, height=15, box=False)
    if 거리_맞음 == 거리_전체 and 판단_맞음 == 판단_전체:
        play_sequence([{"freq": 523.25, "duration": 0.12}, {"freq": 783.99, "duration": 0.22}])


def _거리_점검(거리센서, 옮기기, 물체, 센서, 위치들):
    """물체를 정해진 위치에 놓고 학생 거리센서()가 실제 거리를 돌려주는지 센다."""
    맞음 = 0
    for x in 위치들:
        옮기기(x)
        값 = 거리센서()
        if _숫자인가(값):
            실제 = mag(물체.pos - 센서.pos)
            if abs(값 - 실제) < 0.05:
                맞음 += 1
    return 맞음


# ═══════════════════════════════════════════════
# 장면
# ═══════════════════════════════════════════════

def 밤길_만들기():
    """가로등 미션의 밤길(도로·인도·차선)"""
    _초기화()
    scene.background = vector(0.03, 0.04, 0.1)
    scene.range = 5.5
    scene.center = vector(0, 1.4, 0)
    scene.forward = vector(0, -0.35, -1)
    box(pos=vector(0, -0.05, 0.6), size=vector(20, 0.1, 3), color=vector(0.22, 0.23, 0.27))
    box(pos=vector(0, 0.02, -1.6), size=vector(20, 0.14, 1.4), color=vector(0.42, 0.42, 0.46))
    for x in range(-9, 10, 3):
        box(pos=vector(x, 0.01, 0.6), size=vector(1.2, 0.02, 0.1), color=vector(0.9, 0.85, 0.5))


def 주차장_만들기():
    """후진 경고 미션의 주차장(바닥·주차선·벽)"""
    _초기화()
    scene.background = vector(0.08, 0.09, 0.13)
    scene.range = 5
    scene.center = vector(0, 1.3, 0)
    scene.forward = vector(0, -0.3, -1)
    box(pos=vector(0, -0.05, 0), size=vector(12, 0.1, 4), color=vector(0.3, 0.31, 0.35))
    for x in [-1.5, 1.5]:
        box(pos=vector(x, 0.01, 0), size=vector(0.08, 0.02, 3.6), color=vector(0.85, 0.85, 0.85))
    box(pos=vector(-4, 1.5, 0), size=vector(0.3, 3, 4), color=vector(0.55, 0.5, 0.48))


def 운전_연습장_만들기():
    """엑셀·브레이크 후진 미션의 연습장(바닥·주차 칸)"""
    _초기화()
    scene.background = vector(0.55, 0.72, 0.9)
    scene.range = 5
    scene.center = vector(-1.2, 0.8, 0)
    scene.forward = vector(0, -0.45, -1)
    box(pos=vector(0, -0.05, 0), size=vector(14, 0.1, 5), color=vector(0.36, 0.37, 0.4))
    for z in [-0.95, 0.95]:
        box(pos=vector(-3, 0.01, z), size=vector(3, 0.02, 0.08), color=vector(0.95, 0.95, 0.95))


# ═══════════════════════════════════════════════
# 친구 (위치는 발이 닿는 바닥 지점)
# ═══════════════════════════════════════════════

def 만두_친구(위치):
    크기 = 0.7
    친구 = make_dumpling(origin=위치 + vector(0, 0.94, 0) * 크기, scale=크기)
    _기억(친구)
    _현재['친구'] = 친구
    return 친구


def 공구상자_친구(위치):
    크기 = 0.8
    친구 = make_toolbox(origin=위치 + vector(0, 0.83, 0) * 크기, scale=크기)
    _기억(친구)
    _현재['친구'] = 친구
    return 친구


# ═══════════════════════════════════════════════
# 장치
# ═══════════════════════════════════════════════

def 거리_센서(위치):
    """하늘색 거리 센서. pos가 센서 한가운데다."""
    센서 = box(pos=위치 + vector(0, 0.15, 0), size=vector(0.3, 0.3, 0.3),
             color=vector(0.3, 0.85, 1), emissive=True)
    _현재['센서'] = 센서
    return 센서


class _손전등가로등:
    """손전등 친구가 가로등 역할을 한다. 켜기()·끄기()로 불을 바꾼다."""

    def __init__(self, 위치):
        크기 = 1.1
        중심 = 위치 + vector(0, 0.95 * 크기 + 0.09, 0)
        self.몸 = make_flashlight(origin=중심, scale=크기)
        self.빛판 = cylinder(pos=중심 + vector(0, 1.1, 0) * 크기, axis=vector(0, 0.02, 0) * 크기,
                           radius=0.64 * 크기, color=vector(0.5, 0.5, 0.55))
        self.빛줄기 = cone(pos=중심 + vector(0, 1.62, 0) * 크기, axis=vector(0, -0.52, 0) * 크기,
                          radius=0.8 * 크기, color=vector(1, 0.91, 0.54), opacity=0, emissive=True)
        self.땅빛 = cylinder(pos=vector(위치.x, 0.02, 위치.z + 2.1), axis=vector(0, 0.02, 0), radius=2.4,
                           color=vector(1, 0.85, 0.45), emissive=True, opacity=0.22, visible=False)
        self.빛 = local_light(pos=중심 + vector(0, 1.6, 1.2) * 크기, color=vector(0, 0, 0))
        self.켜짐 = False

    @property
    def pos(self):
        return self.몸.pos

    def 켜기(self):
        self.켜짐 = True
        self.빛판.color = vector(1, 0.93, 0.6)
        self.빛판.emissive = True
        self.빛줄기.opacity = 0.15
        self.땅빛.visible = True
        self.빛.color = vector(1, 0.88, 0.55)

    def 끄기(self):
        self.켜짐 = False
        self.빛판.color = vector(0.5, 0.5, 0.55)
        self.빛판.emissive = False
        self.빛줄기.opacity = 0
        self.땅빛.visible = False
        self.빛.color = vector(0, 0, 0)


def 손전등_가로등(위치):
    등 = _손전등가로등(위치)
    _현재['가로등'] = 등
    return 등


class _경고장치:
    """경고등 하나와 부저. 안전()·주의()·위험()으로 상태를 바꾸고, 소리내기(시간)가 상태에 맞게 삐 소리를 낸다."""

    def __init__(self, 위치):
        self.등 = sphere(pos=위치, radius=0.3, color=vector(0.35, 0.35, 0.38))
        self.빛 = local_light(pos=위치 + vector(0.7, 0, 1), color=vector(0, 0, 0))
        self.모드 = None

    def _바꾸기(self, 모드, 색, 빛색):
        self.모드 = 모드
        self.등.color = 색
        self.등.emissive = True
        self.빛.color = 빛색

    def 안전(self):
        self._바꾸기('안전', vector(0.3, 0.9, 0.45), vector(0.1, 0.4, 0.15))

    def 주의(self):
        self._바꾸기('주의', vector(1, 0.82, 0.25), vector(0.5, 0.4, 0.1))

    def 위험(self):
        self._바꾸기('위험', vector(1, 0.3, 0.25), vector(0.6, 0.12, 0.1))

    def 끄기(self):
        self.모드 = None
        self.등.color = vector(0.35, 0.35, 0.38)
        self.등.emissive = False
        self.빛.color = vector(0, 0, 0)

    def 소리내기(self, 시간):
        if self.모드 == '주의' and 시간 % 12 == 0:
            소리(523, 0.07, 'square', 0.15)
        elif self.모드 == '위험' and 시간 % 4 == 0:
            소리(880, 0.05, 'square', 0.15)


def 경고_장치(위치):
    장치 = _경고장치(위치)
    _현재['경고'] = 장치
    return 장치


def 주차_벽(위치):
    """낮은 주차 벽. pos는 벽 한가운데이고, 높이가 자동차 후방 센서와 같다."""
    벽 = box(pos=위치 + vector(0, 0.4, 0), size=vector(0.3, 0.8, 3.2), color=vector(0.85, 0.78, 0.35))
    for z in [-1.2, -0.4, 0.4, 1.2]:
        box(pos=위치 + vector(0.16, 0.4, z), size=vector(0.02, 0.8, 0.4), color=vector(0.2, 0.2, 0.22))
    _현재['벽'] = 벽
    return 벽


class _자동차:
    """만두 친구가 운전하는 자동차. 앞이 +x, 뒤가 -x(벽 쪽)다.
    운전하기()가 키보드를 읽는다: ↓ 또는 s = 엑셀(후진), ↑ 또는 w = 앞으로, 스페이스 = 브레이크."""

    길이 = 2.2

    def __init__(self, 위치):
        self.몸체 = box(pos=위치 + vector(0, 0.45, 0), size=vector(self.길이, 0.5, 1.15), color=vector(0.95, 0.45, 0.4))
        self.지붕 = box(pos=위치 + vector(-0.15, 0.95, 0), size=vector(1.2, 0.5, 1.05), color=vector(0.75, 0.9, 1), opacity=0.35)
        self.운전자 = make_dumpling(origin=위치 + vector(0.05, 0.98, 0), scale=0.36)
        self.바퀴들 = []
        for x in [-0.7, 0.7]:
            for z in [-0.58, 0.58]:
                바퀴 = cylinder(pos=위치 + vector(x, 0.24, z - 0.06), axis=vector(0, 0, 0.12), radius=0.24, color=vector(0.15, 0.15, 0.17))
                self.바퀴들.append(바퀴)
        self.브레이크등들 = []
        self.후진등들 = []
        for z in [-0.42, 0.42]:
            self.브레이크등들.append(box(pos=위치 + vector(-1.11, 0.55, z), size=vector(0.04, 0.12, 0.22), color=vector(0.45, 0.08, 0.08)))
            self.후진등들.append(box(pos=위치 + vector(-1.11, 0.4, z), size=vector(0.04, 0.08, 0.16), color=vector(0.5, 0.5, 0.5)))
        self.후방센서 = box(pos=위치 + vector(-1.15, 0.4, 0), size=vector(0.06, 0.12, 0.12), color=vector(0.3, 0.85, 1), emissive=True)
        self.부품들 = [self.몸체, self.지붕, self.운전자, self.후방센서] + self.바퀴들 + self.브레이크등들 + self.후진등들
        self.속도 = 0
        self.시작_x = 위치.x
        self.부딪힘 = False

    @property
    def pos(self):
        return self.몸체.pos

    def 옮기기(self, x):
        """자동차 가운데를 x로 옮긴다 (부품 전체를 함께 옮긴다)."""
        dx = x - self.몸체.pos.x
        for 부품 in self.부품들:
            부품.pos = 부품.pos + vector(dx, 0, 0)

    def _등_켜기(self, 등들, 켜짐, 켜진색, 꺼진색):
        for 등 in 등들:
            if 켜짐:
                등.color = 켜진색
            else:
                등.color = 꺼진색
            등.emissive = 켜짐

    def 운전하기(self):
        키 = keysdown()
        엑셀 = ('down' in 키) or ('s' in 키)
        앞으로 = ('up' in 키) or ('w' in 키)
        브레이크 = ' ' in 키
        if 브레이크:
            if self.속도 > 0.006:
                self.속도 -= 0.006
            elif self.속도 < -0.006:
                self.속도 += 0.006
            else:
                self.속도 = 0
        elif 엑셀:
            self.속도 = max(-0.06, self.속도 - 0.002)
        elif 앞으로:
            self.속도 = min(0.06, self.속도 + 0.002)
        else:
            self.속도 = self.속도 * 0.97
        self._등_켜기(self.브레이크등들, 브레이크, vector(1, 0.15, 0.12), vector(0.45, 0.08, 0.08))
        self._등_켜기(self.후진등들, 엑셀, vector(1, 1, 0.95), vector(0.5, 0.5, 0.5))

        새_x = self.몸체.pos.x + self.속도
        벽 = _현재.get('벽')
        if 벽 is not None:
            닿는_x = 벽.pos.x + 벽.size.x / 2 + self.길이 / 2 + 0.06
            if 새_x < 닿는_x:
                새_x = 닿는_x
                if not self.부딪힘 and self.속도 < -0.02:
                    소리(110, 0.25, 'square', 0.3)
                    print("쿵! 벽에 닿았습니다. ↑ 키로 앞으로 빼 보세요.")
                self.부딪힘 = True
                self.속도 = 0
            else:
                self.부딪힘 = False
        새_x = min(새_x, self.시작_x + 1.5)
        self.옮기기(새_x)


def 자동차_만들기(위치):
    차 = _자동차(위치)
    _현재['자동차'] = 차
    _현재['센서'] = 차.후방센서
    return 차


class _후방경보기:
    """주차 보조 표시등(막대 4칸)과 부저.
    조용히()·느리게()·빠르게()·아주_빠르게()로 상태를 바꾸고, 소리내기(시간)가 뚜— 뚜— / 뚜뚜뚜 / 뚜두두두두 소리를 낸다."""

    색들 = [vector(0.3, 0.9, 0.45), vector(1, 0.85, 0.25), vector(1, 0.55, 0.2), vector(1, 0.25, 0.22)]

    def __init__(self, 위치):
        self.막대들 = []
        for i in range(4):
            막대 = box(pos=위치 + vector(0, 0, -0.75 + i * 0.5), size=vector(0.1, 0.18 + i * 0.08, 0.38),
                     color=vector(0.3, 0.3, 0.33))
            self.막대들.append(막대)
        self.모드 = None

    def _바꾸기(self, 모드, 칸수):
        self.모드 = 모드
        for i in range(4):
            막대 = self.막대들[i]
            if i < 칸수:
                막대.color = self.색들[i]
                막대.emissive = True
            else:
                막대.color = vector(0.3, 0.3, 0.33)
                막대.emissive = False

    def 조용히(self):
        self._바꾸기('조용히', 0)

    def 느리게(self):
        self._바꾸기('느리게', 2)

    def 빠르게(self):
        self._바꾸기('빠르게', 3)

    def 아주_빠르게(self):
        self._바꾸기('아주_빠르게', 4)

    def 소리내기(self, 시간):
        if self.모드 == '느리게' and 시간 % 15 == 0:
            소리(660, 0.08, 'square', 0.15)
        elif self.모드 == '빠르게' and 시간 % 6 == 0:
            소리(880, 0.06, 'square', 0.15)
        elif self.모드 == '아주_빠르게' and 시간 % 2 == 0:
            소리(988, 0.04, 'square', 0.15)


def 후방_경보기(위치):
    장치 = _후방경보기(위치)
    _현재['경보기'] = 장치
    return 장치


# ═══════════════════════════════════════════════
# 움직임
# ═══════════════════════════════════════════════

def 왕복_걷기(친구, 시간, 왼쪽=-5.5, 오른쪽=5.5, 한쪽=150):
    """친구가 왼쪽에서 오른쪽으로 걸어갔다가 돌아온다. 한쪽은 가는 데 걸리는 반복 횟수다."""
    기준 = _기준위치[id(친구)]
    단계 = 시간 % (2 * 한쪽)
    if 단계 < 한쪽:
        걸음 = 단계
    else:
        걸음 = 2 * 한쪽 - 단계
    x = 왼쪽 + (오른쪽 - 왼쪽) * 걸음 / 한쪽
    통통 = 0.08 * abs(sin(시간 * 0.35))
    친구.pos = vector(x, 기준.y + 통통, 기준.z)


def 뒤로_주차하기(친구, 시간, 멈출_x=-2.5):
    """친구가 처음 자리에서 벽 쪽으로 뒷걸음질하고, 잠깐 멈췄다가 다시 나간다."""
    기준 = _기준위치[id(친구)]
    거리 = 기준.x - 멈출_x
    if 시간 < 150:
        x = 기준.x - 거리 * 시간 / 150
        흔들 = 0.05 * abs(sin(시간 * 0.4))
    elif 시간 < 180:
        x = 멈출_x
        흔들 = 0
    else:
        x = 멈출_x + 거리 * min(1, (시간 - 180) / 150)
        흔들 = 0.05 * abs(sin(시간 * 0.4))
    친구.pos = vector(x, 기준.y + 흔들, 기준.z)


# ═══════════════════════════════════════════════
# 점검 (채점용 라벨을 만든다)
# ═══════════════════════════════════════════════

def 가로등_점검(거리센서, 반응하기):
    친구 = _현재['친구']
    센서 = _현재['센서']
    등 = _현재['가로등']
    기준 = _기준위치[id(친구)]

    def 옮기기(x):
        친구.pos = vector(x, 기준.y, 기준.z)

    거리_맞음 = _거리_점검(거리센서, 옮기기, 친구, 센서, [-5, -2, 0, 3])
    친구.pos = 기준

    판단_맞음 = 0
    for 값, 켜져야 in [(1, True), (2.5, True), (4, False), (8, False)]:
        등.켜짐 = None
        반응하기(값)
        if 등.켜짐 == 켜져야:
            판단_맞음 += 1
    등.끄기()
    _결과_표시(vector(0, 4.4, 0), 거리_맞음, 4, 판단_맞음, 4)


def 주차_점검(거리센서, 반응하기):
    친구 = _현재['친구']
    센서 = _현재['센서']
    장치 = _현재['경고']
    기준 = _기준위치[id(친구)]

    def 옮기기(x):
        친구.pos = vector(x, 기준.y, 기준.z)

    거리_맞음 = _거리_점검(거리센서, 옮기기, 친구, 센서, [3, 0, -2])
    친구.pos = 기준

    판단_맞음 = 0
    for 값, 정답 in [(6, '안전'), (4, '안전'), (3, '주의'), (2, '주의'), (1.5, '위험')]:
        장치.모드 = None
        반응하기(값)
        if 장치.모드 == 정답:
            판단_맞음 += 1
    장치.끄기()
    _결과_표시(vector(0, 4.2, 0), 거리_맞음, 3, 판단_맞음, 5)


def 후진_점검(거리센서, 반응하기):
    차 = _현재['자동차']
    벽 = _현재['벽']
    장치 = _현재['경보기']
    시작 = 차.pos.x

    거리_맞음 = _거리_점검(거리센서, 차.옮기기, 벽, 차.후방센서, [2, 0, -2])
    차.옮기기(시작)

    판단_맞음 = 0
    정답들 = [(6, '조용히'), (4, '조용히'), (3, '느리게'), (2.5, '느리게'),
            (1.5, '빠르게'), (1.2, '빠르게'), (0.8, '아주_빠르게')]
    for 값, 정답 in 정답들:
        장치.모드 = None
        반응하기(값)
        if 장치.모드 == 정답:
            판단_맞음 += 1
    장치.조용히()
    _결과_표시(vector(-0.8, 3.7, 0), 거리_맞음, 3, 판단_맞음, 7)
