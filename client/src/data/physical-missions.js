/**
 * 피지컬 컴퓨팅 시뮬레이션 미션 (시범 3종)
 *
 * 설계 원칙:
 * - 장면·친구·출력 장치는 숨김 모듈 `피지컬키트`(engine/physical-kit.py)가 만든다.
 *   학생 화면에는 이름 붙인 변수(만두, 센서, 가로등 …)만 남는다.
 * - 학생은 두 함수만 채운다. ① 센서 함수(수식을 본문에서 계산해 변수로 돌려주기) ② 판단 함수(조건문으로 출력 호출)
 * - 아두이노의 loop()처럼 "센서 읽기 → 판단 → 출력"을 반복한다.
 * - 학생 코드는 정석으로 쓴다. 한 줄 조건식·컴프리헨션을 쓰지 않고, return은 변수로 한다.
 * - 채점: 키트의 점검 함수가 정해진 위치·값으로 두 함수를 시험해 라벨을 만들고, 채점기는 그 라벨 글자를 확인한다.
 */

const text = (ko, en) => ({ ko, en });
const labelIs = (value, message) => ({ type: 'label', property: 'text', operator: '==', value, match: 'any', message });

// ── PC-1 스마트 가로등 ─────────────────────────────────────────

const streetlight = (sensorBody, reactBody) => `from vpython import *
from 피지컬키트 import *

# ── 준비: 밤길과 친구들 (만드는 코드는 키트 안에 있습니다) ──
밤길_만들기()
가로등 = 손전등_가로등(vector(0, 0, -1.9))
센서 = 거리_센서(vector(0, 0, -1))
만두 = 만두_친구(vector(-5.5, 0, 0.4))


# ── 미션 ① 거리 센서 ──
def 거리센서():
    # 센서에서 만두 친구까지의 거리를 계산해 돌려줍니다.
${sensorBody}
    return 거리


# ── 미션 ② 판단하기 ──
def 반응하기(거리):
${reactBody}


# ── 점검: 두 함수가 맞게 동작하는지 먼저 확인합니다 ──
가로등_점검(거리센서, 반응하기)

# ── 반복: 센서 읽기 → 판단 → 출력 (아두이노의 loop()와 같습니다) ──
for 시간 in range(300):
    rate(30)
    왕복_걷기(만두, 시간)
    거리 = 거리센서()
    반응하기(거리)
    if 시간 % 30 == 0:
        print("거리 센서:", round(거리, 1))
`;

const streetlightStarter = streetlight(
  `    # 힌트: 두 위치 사이의 거리는 mag(만두.pos - 센서.pos)입니다.
    거리 = 100          # ← 100을 거리 계산식으로 바꾸세요`,
  `    # 거리가 3보다 작으면 가로등.켜기(), 아니면 가로등.끄기()를 실행하세요.
    pass                # ← 이 줄을 지우고 조건문을 쓰세요`,
);

const streetlightSolution = streetlight(
  `    거리 = mag(만두.pos - 센서.pos)`,
  `    if 거리 < 3:
        가로등.켜기()
    else:
        가로등.끄기()`,
);

// ── PC-2 후진 경고 센서 ────────────────────────────────────────

const parking = (sensorBody, reactBody) => `from vpython import *
from 피지컬키트 import *

# ── 준비: 주차장과 친구 (만드는 코드는 키트 안에 있습니다) ──
주차장_만들기()
센서 = 거리_센서(vector(-3.7, 0.45, 0))
경고 = 경고_장치(vector(-3.6, 2.6, 0))
공구상자 = 공구상자_친구(vector(4, 0, 0.2))


# ── 미션 ① 거리 센서 ──
def 거리센서():
    # 센서에서 공구상자 친구까지의 거리를 계산해 돌려줍니다.
${sensorBody}
    return 거리


# ── 미션 ② 판단하기 ──
def 반응하기(거리):
${reactBody}


# ── 점검: 두 함수가 맞게 동작하는지 먼저 확인합니다 ──
주차_점검(거리센서, 반응하기)

# ── 반복: 센서 읽기 → 판단 → 출력 ──
for 시간 in range(330):
    rate(30)
    뒤로_주차하기(공구상자, 시간)
    거리 = 거리센서()
    반응하기(거리)
    경고.소리내기(시간)
    if 시간 % 30 == 0:
        print("거리 센서:", round(거리, 1))
`;

const parkingStarter = parking(
  `    # 힌트: 미션 1과 같은 방법입니다. 이번 친구 이름은 공구상자입니다.
    거리 = 100          # ← 100을 거리 계산식으로 바꾸세요`,
  `    # 거리가 4 이상이면 경고.안전()
    #       2 이상 4 미만이면 경고.주의()
    #       2 미만이면 경고.위험()을 실행하세요.
    # 힌트: if / elif / else 를 사용합니다.
    pass                # ← 이 줄을 지우고 조건문을 쓰세요`,
);

const parkingSolution = parking(
  `    거리 = mag(공구상자.pos - 센서.pos)`,
  `    if 거리 >= 4:
        경고.안전()
    elif 거리 >= 2:
        경고.주의()
    else:
        경고.위험()`,
);

// ── PC-3 엑셀·브레이크 후진 주차 ──────────────────────────────

const driving = (sensorBody, reactBody) => `from vpython import *
from 피지컬키트 import *

# ── 준비: 연습장과 자동차 (만드는 코드는 키트 안에 있습니다) ──
# 3D 화면을 한 번 클릭한 뒤 운전합니다.
#   ↓ 키: 엑셀(후진)   스페이스: 브레이크   ↑ 키: 앞으로
운전_연습장_만들기()
벽 = 주차_벽(vector(-4.5, 0, 0))
경보기 = 후방_경보기(vector(-4.5, 1.2, 0))
자동차 = 자동차_만들기(vector(2, 0, 0))
센서 = 자동차.후방센서


# ── 미션 ① 후방 거리 센서 ──
def 거리센서():
    # 자동차 뒤의 센서에서 벽까지의 거리를 계산해 돌려줍니다.
${sensorBody}
    return 거리


# ── 미션 ② 판단하기 ──
def 반응하기(거리):
${reactBody}


# ── 점검: 두 함수가 맞게 동작하는지 먼저 확인합니다 ──
후진_점검(거리센서, 반응하기)

# ── 반복: 운전 → 센서 읽기 → 판단 → 경고음 (1분 동안) ──
for 시간 in range(1800):
    rate(30)
    자동차.운전하기()
    거리 = 거리센서()
    반응하기(거리)
    경보기.소리내기(시간)
    if 시간 % 30 == 0:
        print("거리 센서:", round(거리, 1))
`;

const drivingStarter = driving(
  `    # 힌트: 이번에는 센서가 자동차와 함께 움직입니다. mag(벽.pos - 센서.pos)
    거리 = 100          # ← 100을 거리 계산식으로 바꾸세요`,
  `    # 거리가 4 이상이면          경보기.조용히()
    #       2.5 이상 4 미만이면   경보기.느리게()      뚜—  뚜—
    #       1.2 이상 2.5 미만이면 경보기.빠르게()      뚜뚜뚜
    #       1.2 미만이면          경보기.아주_빠르게()  뚜두두두두
    pass                # ← 이 줄을 지우고 조건문을 쓰세요`,
);

const drivingSolution = driving(
  `    거리 = mag(벽.pos - 센서.pos)`,
  `    if 거리 >= 4:
        경보기.조용히()
    elif 거리 >= 2.5:
        경보기.느리게()
    elif 거리 >= 1.2:
        경보기.빠르게()
    else:
        경보기.아주_빠르게()`,
);

const distancePassed = (message) => labelIs('① 거리 센서: 통과', message);
const judgementPassed = (message) => labelIs('② 판단하기: 통과', message);

const physicalMissions = [
  {
    id: 'PC-1',
    category: 'PC',
    level: 1,
    title: text('스마트 가로등: 다가오면 불이 켜져요', 'Smart Streetlight: Lights On When Someone Comes'),
    description: text(
      '만두 친구가 길을 따라 걸어가고 손전등 친구가 가로등 역할을 합니다. 목표는 만두 친구가 가까이 오면 가로등이 켜지게 하는 것입니다. 거리센서() 안에서 센서와 만두 친구 사이의 거리를 계산하고, 반응하기()에서 거리가 3보다 작으면 가로등.켜기()를, 아니면 가로등.끄기()를 실행하는 조건문을 작성합니다.',
      'Make the flashlight streetlight turn on when the dumpling friend comes near. Calculate the distance in 거리센서() and turn the light on in 반응하기() when it is less than 3.',
    ),
    gradeType: 'run',
    starterCode: streetlightStarter,
    solutionCode: streetlightSolution,
    assertions: [
      distancePassed(text('거리센서()가 센서와 만두 친구 사이의 거리를 돌려줍니다', '거리센서() returns the distance between the sensor and the friend')),
      judgementPassed(text('거리가 3보다 작으면 불을 켜고, 아니면 끕니다', 'Turn the light on when the distance is less than 3, otherwise off')),
    ],
    hints: [
      text('고칠 곳은 거리 = 100 줄의 100 부분뿐이며 return 거리 줄은 그대로 둡니다.', 'Replace only 100 in 거리 = 100. Keep return 거리.'),
      text('mag(만두.pos - 센서.pos)의 결과는 두 위치 사이의 거리입니다.', 'mag(만두.pos - 센서.pos) is the distance between two positions.'),
      text('if 거리 < 3: 다음 줄에 가로등.켜기()를, else: 다음 줄에 가로등.끄기()를 작성하며 두 줄 모두 들여쓰기를 맞춰야 합니다.', 'Write 가로등.켜기() under if 거리 < 3: and 가로등.끄기() under else:, with matching indentation.'),
      text('출력 창에 "거리 센서:" 값이 주기적으로 표시되며 이 값으로 센서가 제대로 동작하는지 확인할 수 있습니다.', 'Watch the "거리 센서:" values in the console to check the sensor.'),
    ],
  },
  {
    id: 'PC-2',
    category: 'PC',
    level: 1,
    title: text('후진 경고 센서: 가까울수록 빠르게 삐삐', 'Parking Sensor: Faster Beeps When Closer'),
    description: text(
      '공구상자 친구가 뒷걸음질로 벽에 다가갑니다. 목표는 벽에 가까워질수록 경고등 색과 경고음이 바뀌게 하는 것입니다. 거리센서()를 완성하고 if / elif / else로 거리를 세 구간으로 나누어 경고.안전(), 경고.주의(), 경고.위험() 가운데 하나를 실행합니다.',
      'Make the warning light and beeps change as the toolbox friend backs toward the wall. Complete 거리센서() and use if / elif / else to run 안전(), 주의(), or 위험().',
    ),
    gradeType: 'run',
    starterCode: parkingStarter,
    solutionCode: parkingSolution,
    assertions: [
      distancePassed(text('거리센서()가 센서와 공구상자 친구 사이의 거리를 돌려줍니다', '거리센서() returns the distance between the sensor and the toolbox friend')),
      judgementPassed(text('4 이상은 안전, 2 이상 4 미만은 주의, 2 미만은 위험으로 나눕니다', '4 or more is safe, 2 to under 4 is caution, under 2 is danger')),
    ],
    hints: [
      text('거리 센서는 미션 1과 같은 방법이며 친구 이름만 공구상자로 바꾸면 됩니다.', 'The sensor works like Mission 1. Just use 공구상자 as the friend name.'),
      text('"4 이상"은 코드로 거리 >= 4이며 "2 미만"은 코드로 거리 < 2입니다.', '"4 or more" is 거리 >= 4 and "under 2" is 거리 < 2.'),
      text('if 거리 >= 4: 다음에 elif 거리 >= 2:를 쓰며 elif 조건은 앞의 if가 거짓일 때, 곧 거리가 4보다 작을 때만 확인됩니다.', 'After if 거리 >= 4:, elif 거리 >= 2: is checked only when the distance is under 4.'),
      text('점검 단계에서 경계값 4와 2도 시험하며 >와 >=의 차이를 확인해야 합니다.', 'The check also tests boundary values like 4 and 2. Look at the difference between > and >=.'),
    ],
  },
  {
    id: 'PC-3',
    category: 'PC',
    level: 2,
    title: text('엑셀과 브레이크: 후진 주차 센서', 'Gas and Brake: Reverse Parking Sensor'),
    description: text(
      '키보드로 엑셀과 브레이크를 밟으며 자동차를 후진시킵니다. 자동차 뒤에 붙은 센서가 벽까지의 거리를 계산하며, 가까워질수록 경고음이 뚜— 뚜—, 뚜뚜뚜, 뚜두두두두 순서로 바뀌게 거리를 네 구간으로 나누어야 합니다. 운전은 1분 동안 이어지고 실행 중에 채점하기 버튼을 누르면 곧바로 채점됩니다.',
      'Back the car up with the keyboard gas and brake. The rear sensor measures the distance to the wall, and the beeps get faster in four steps as it gets closer. Press grade while running to grade right away.',
    ),
    gradeType: 'run',
    starterCode: drivingStarter,
    solutionCode: drivingSolution,
    assertions: [
      distancePassed(text('거리센서()가 자동차 후방 센서와 벽 사이의 거리를 돌려줍니다', '거리센서() returns the distance between the rear sensor and the wall')),
      judgementPassed(text('4 이상·2.5 이상·1.2 이상·1.2 미만의 네 구간으로 나눕니다', 'Split into four ranges: 4+, 2.5+, 1.2+, under 1.2')),
    ],
    hints: [
      text('센서 = 자동차.후방센서로 정해져 있으므로 자동차가 움직이면 센서도 함께 움직입니다.', '센서 is 자동차.후방센서, so it moves with the car.'),
      text('벽과 센서의 위치 차이로 거리를 계산하며 계산식 예시는 거리 = mag(벽.pos - 센서.pos)입니다.', 'Calculate the position difference: 거리 = mag(벽.pos - 센서.pos).'),
      text('구간이 네 개면 if 한 개, elif 두 개, else 한 개를 사용하며 큰 거리부터 차례로 확인합니다.', 'For four ranges use one if, two elifs, and one else, checking from the largest distance.'),
      text('3D 화면을 먼저 클릭해야 키보드 입력이 자동차에 전달되며 벽에 닿으면 ↑ 키로 앞으로 빼낼 수 있습니다.', 'Click the 3D view so the keyboard reaches the car. Use the up key to pull forward after touching the wall.'),
    ],
  },
];

export default physicalMissions;
