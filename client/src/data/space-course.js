/** Each lesson opens a complete, editable Python program. Shared fragments keep earlier steps in sync. */
const closeView = `from vpython import *
scene.background = color.black
scene.range = 2.3
earth = sphere(radius=1, texture=textures.earth, emissive=True, shininess=0)`;

const moonView = closeView.replace('scene.range = 2.3', 'scene.range = 3.2') + `
moon_distance = 2.1
moon = sphere(pos=vector(moon_distance, 0, 0), radius=0.27, texture=textures.moon)`;

const sunlight = `from vpython import *
scene.background = color.black
scene.range = 5.8
scene.forward = vector(0, -0.45, -1)
scene.lights = []
scene.ambient = color.gray(0.15)
sun = sphere(radius=0.83, texture=textures.sun, emissive=True)
local_light(pos=sun.pos, color=color.white, intensity=250)
earth_distance = 4.1
earth = sphere(pos=vector(earth_distance, 0, 0), radius=0.48, texture=textures.earth)
moon_distance = 0.85
moon = sphere(radius=0.15, texture=textures.moon)`;

const innerRows = `    (1.55, 0.16, 1.65, 2.7, color.gray(0.6)),
    (2.6, 0.32, 0.95, 4.1, vector(0.9, 0.65, 0.32)),
    (5.65, 0.26, 0.43, 2.1, vector(0.88, 0.32, 0.16)),`;
const outerRows = `    (7.1, 0.72, 0.29, 3.4, color.white),
    (8.9, 0.62, 0.21, 0.75, color.white),
    (10.8, 0.42, 0.16, 4.5, color.cyan),
    (12.4, 0.40, 0.13, 2.4, color.blue),`;

function companions(outer) {
  return `# Mercury, Venus, Mars${outer ? ', Jupiter, Saturn, Uranus, Neptune' : ''}
# Orbit radius, planet radius, angular speed, starting angle, color
rows = [
${innerRows}
${outer ? outerRows + '\n' : ''}]
planets = []
for distance, radius, speed, start, tint in rows:
    planets.append(sphere(radius=radius, color=tint))${outer ? `
planets[3].texture = textures.jupiter
planets[4].texture = textures.saturn
rings = ring(radius=0.90, thickness=0.055, axis=vector(0.26, 1, 0.18))` : ''}`;
}

const orbitPath = `def orbit(radius):
    path = [radius * vector(cos(i * pi / 48), 0, sin(i * pi / 48)) for i in range(97)]
    curve(pos=path, radius=0.011, color=color.gray(0.22))

orbit(earth_distance)`;
const comet = `comet = sphere(radius=0.13, color=color.gray(0.72))
eccentricity = 0.56
major = 7.7
minor = major * sqrt(1 - eccentricity**2)
tilt = 0.26
def comet_position(a):
    cross_axis = minor * sin(a)
    return vector(major * (cos(a) - eccentricity), sin(tilt) * cross_axis, cos(tilt) * cross_axis)
curve(pos=[comet_position(i*pi/64) for i in range(129)], radius=0.012, color=color.gray(0.28))`;

const tails = `import random
random.seed(12)
tails = []
for dusty in [False, True]:
    grains = []
    for i in range(320):
        reach = random.uniform(0.12, 2.8)
        bend = 0.19 * reach**2 if dusty else 0
        width = (0.13 if dusty else 0.05) * reach
        grains.append(vector(reach, bend + random.gauss(0, width), random.gauss(0, width / 2)))
    tint = vector(0.96, 0.67, 0.37) if dusty else vector(0.31, 0.62, 1)
    tails.append(points(pos=grains, shape="plume", radius=0.055, size_units="world", color=tint, opacity=0.68))`;

function program(step) {
  if (step < 3) return (step === 1 ? closeView : moonView) + '\n';
  const setup = [step < 5 ? moonView : sunlight];
  if (step >= 7) {
    setup[0] = setup[0].replace('scene.range = 5.8', step === 7 ? 'scene.range = 6.8' : 'scene.range = 14');
    setup.push(companions(step >= 8));
  }
  if (step >= 6) setup.push(orbitPath);
  if (step >= 7) setup.push('for distance, radius, speed, start, tint in rows:\n    orbit(distance)');
  if (step >= 9) setup.push(comet);
  if (step === 10) setup.push(tails);

  const loop = ['t = 0', 'while True:', '    rate(30)'];
  if (step >= 6) loop.push('    earth_angle = 0.65 * t', '    earth.pos = earth_distance * vector(cos(earth_angle), 0, sin(earth_angle))');
  loop.push('    moon_angle = 2.2 * t', '    moon.pos = earth.pos + moon_distance * vector(cos(moon_angle), sin(0.18)*sin(moon_angle), cos(0.18)*sin(moon_angle))');
  if (step >= 4) loop.push('    earth.axis = vector(cos(t), 0, -sin(t))');
  if (step >= 7) loop.push('    for planet, (distance, radius, speed, start, tint) in zip(planets, rows):',
    '        a = start + speed * t', '        planet.pos = distance * vector(cos(a), 0, sin(a))');
  if (step >= 8) loop.push('    rings.pos = planets[4].pos');
  if (step >= 9) loop.push('    a = 0.7 + 0.26 * t', '    comet.pos = comet_position(a)');
  if (step === 10) loop.push('    away = norm(comet.pos - sun.pos)', '    motion = comet_position(a + 0.01) - comet.pos',
    '    behind = norm(dot(motion, away) * away - motion)', '    for tail in tails:', '        tail.origin = comet.pos',
    '        tail.axis = away', '        tail.up = behind', '        tail.flow_time = t');
  loop.push('    t += 1 / 30');
  return [...setup, loop.join('\n')].join('\n\n') + '\n';
}

const lessons = [
  {
    "title": {
      "ko": "검은 우주에 지구 놓기",
      "en": "Earth against a black sky"
    },
    "summary": "검은 배경에서 대륙을 찾아보세요.",
    "practice": {
      "line": "earth = sphere(radius=1, texture=textures.earth, emissive=True, shininess=0)",
      "meaning": "구에 지도를 감싸면 평면 사진의 양끝이 만납니다.",
      "change": "radius=1을 0.7로 바꾸세요.",
      "observe": "지구의 크기와 대륙의 위치 중 무엇이 달라졌나요?"
    }
  },
  {
    "title": {
      "ko": "달을 곁에 놓기",
      "en": "Place the Moon beside Earth"
    },
    "summary": "달과 지구 사이의 빈 공간을 관찰하세요.",
    "practice": {
      "line": "moon_distance = 2.1",
      "meaning": "달의 중심을 지구 중심에서 오른쪽으로 옮깁니다.",
      "change": "moon_distance를 2.1에서 1.5로 줄이세요.",
      "observe": "거리를 바꿔도 두 구의 반지름이 같은지 확인하세요."
    }
  },
  {
    "title": {
      "ko": "달을 공전시키기",
      "en": "Send the Moon into orbit"
    },
    "summary": "달이 지구의 앞과 뒤를 지나가는 순서를 따라가세요.",
    "practice": {
      "line": "moon_angle = 2.2 * t",
      "meaning": "각도를 매번 조금씩 바꿔 달의 다음 위치를 계산합니다.",
      "change": "2.2를 1.1로 바꾸고 한 바퀴 시간을 재세요.",
      "observe": "경로의 크기와 한 바퀴 걸리는 시간을 따로 비교하세요."
    }
  },
  {
    "title": {
      "ko": "공전과 자전 구별하기",
      "en": "Separate orbit from spin"
    },
    "summary": "달이 움직이는 동안 지구의 대륙 하나를 눈으로 따라가세요.",
    "practice": {
      "line": "earth.axis = vector(cos(t), 0, -sin(t))",
      "meaning": "지구의 중심은 그대로 두고 표면 지도의 방향만 바꿉니다.",
      "change": "이 줄의 cos(t)와 sin(t)에서 t를 모두 2*t로 바꾸세요.",
      "observe": "하루에 해당하는 자전과 달의 한 바퀴 중 어느 시간이 달라졌나요?"
    }
  },
  {
    "title": {
      "ko": "태양으로 낮과 밤 만들기",
      "en": "Light the day side with the Sun"
    },
    "summary": "화면을 넓혀 태양을 놓고 지구에 비치는 빛을 살펴보세요.",
    "practice": {
      "line": "local_light(pos=sun.pos, color=color.white, intensity=250)",
      "meaning": "빛나는 태양 표면과 주위를 비추는 점광원을 같은 자리에 둡니다.",
      "change": "intensity를 250에서 125로 줄이세요.",
      "observe": "밝기는 변해도 지구의 밝은 쪽이 여전히 태양을 향하나요?"
    }
  },
  {
    "title": {
      "ko": "지구도 태양 주위로",
      "en": "Give Earth an orbit too"
    },
    "summary": "달이 지구와 함께 이동하면서 공전하는지 확인하세요.",
    "practice": {
      "line": "earth_angle = 0.65 * t",
      "meaning": "먼저 태양 기준으로 지구를 놓고, 그 지구 위치에 달의 상대 위치를 더합니다.",
      "change": "earth_angle의 0.65를 0.32로 바꾸세요.",
      "observe": "지구 바로 옆 달의 궤도 크기도 변했는지 설명하세요."
    }
  },
  {
    "title": {
      "ko": "네 내행성의 속도 비교",
      "en": "Compare the four inner planets"
    },
    "summary": "수성·금성·화성을 더하고 같은 시간에 돌아간 각도를 비교하세요.",
    "practice": {
      "line": "for distance, radius, speed, start, tint in rows:",
      "meaning": "표의 한 줄이 행성 하나의 거리·크기·속도·초기 각도·색을 정합니다.",
      "change": "첫 행에서 수성의 속도 1.65만 0.43으로 바꾸세요.",
      "observe": "화성과 주기가 같아져도 이동 경로의 길이가 다른 이유는 무엇인가요?"
    }
  },
  {
    "title": {
      "ko": "여덟 행성과 토성 고리",
      "en": "Build eight planets and Saturn’s ring"
    },
    "summary": "목성부터 해왕성까지 더하고 멀리서도 궤도가 구별되는지 살펴보세요.",
    "practice": {
      "line": "rings.pos = planets[4].pos",
      "meaning": "고리 중심을 매 프레임 토성 중심으로 옮겨 둘이 함께 돌게 합니다.",
      "change": "궤도를 그리는 curve의 radius를 0.011에서 0.04로 바꾸세요.",
      "observe": "두 화면을 비교하세요. 행성을 돋보이게 할 때와 궤도를 설명할 때 각각 어떤 선 굵기를 택하겠나요?"
    }
  },
  {
    "title": {
      "ko": "초점이 있는 혜성 궤도",
      "en": "Trace a comet around a focus"
    },
    "summary": "기울어진 길쭉한 궤도를 따라 태양과 혜성 사이의 거리를 관찰하세요.",
    "practice": {
      "line": "eccentricity = 0.56",
      "meaning": "이심률이 커지면 타원이 길어집니다. 모형의 태양은 타원의 한 초점에 있습니다. 이 모형에서는 혜성이 타원 경로를 따라가도록 각도 변수를 일정하게 증가시킵니다. 실제 혜성의 공전 속도는 태양과의 거리에 따라 달라집니다.",
      "change": "eccentricity를 0.20으로 줄이고 태양에 가장 가까운 지점을 비교하세요.",
      "observe": "장반경 major를 그대로 두면 근일점 거리가 커지나요, 작아지나요?"
    }
  },
  {
    "title": {
      "ko": "완성: 혜성의 두 꼬리",
      "en": "Finish with the comet’s two tails"
    },
    "summary": "한 장면에서 공전·자전과 태양 반대쪽으로 자라는 두 꼬리를 함께 관찰하세요.",
    "practice": {
      "line": "bend = 0.19 * reach**2 if dusty else 0",
      "meaning": "이온 꼬리는 태양 반대쪽으로 향하고, 이 모형의 먼지 꼬리는 뒤쪽으로 휩니다.",
      "change": "먼지 꼬리의 bend에서 0.19를 0.08로 줄이고, 혜성을 확대해 비교하세요.",
      "observe": "전체 구도와 확대 구도에서 두 꼬리를 구분하는 단서를 하나씩 찾으세요."
    }
  }
];

export default {
  id: 'space-from-earth', track: 'fusion', level: 2, icon: '🌍', color: 'indigo',
  title: { ko: '지구에서 시작하는 태양계', en: 'Build a Solar System from Earth' },
  subject: '과학·수학·미술·코딩',
  description: '검은 화면의 지구에서 여덟 행성과 혜성까지, 앞 단계의 작품에 한 가지씩 더하는 STEAM 실습입니다. 거리·크기·시간을 관찰하기 좋게 조정한 수업용 모형입니다.',
  targetGrade: '중·고등학생',
  sessions: lessons.length,
  lessons: lessons.map((lesson, i) => ({ ...lesson, id: `space-from-earth-${i + 1}`, code: program(i + 1) })),
};
