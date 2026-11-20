const pink = "색상['분홍']";
const sky = "색상['하늘']";
const oneBall = 'sphere()';
const pinkBall = `sphere(color=${pink})`;
const secondBall = `sphere(pos=vec(2.5, 0, 0), color=${sky})`;

const placedBalls = `left = sphere(pos=vec(-1.5, 0, 0), radius=0.8, color=${pink})
right = sphere(pos=vec(1.5, 0, 0), radius=0.8, color=${sky})`;
const bindClick = "scene.bind('click', 바꾸기)";
const clickAnywhere = `${placedBalls}

def 바꾸기(이벤트):
    left.color = right.color

${bindClick}`;

// 세 조건에 색, 조명, 음을 차례로 덧붙인다. 빈 공간은 항상 시작 상태로 돌아간다.
function pickProgram({ light = false, sound = false } = {}) {
  const lines = [
    `colors = [${pink}, ${sky}]`,
    'balls = [',
    '    sphere(pos=vec(-1.5, 0, 0), radius=0.8, color=colors[0]),',
    '    sphere(pos=vec(1.5, 0, 0), radius=0.8, color=colors[1]),',
    ']',
  ];
  if (light) lines.push('lamp = local_light(pos=vec(0, 2, 2), intensity=8)', 'scene.lights = [lamp]');
  lines.push('', 'def 바꾸기(이벤트):', '    if 이벤트.pick == balls[0]:', '        balls[0].color = balls[1].color');
  if (light) lines.push('        lamp.pos = vec(-1.5, 1, 1)');
  if (sound) lines.push("        play_note('C4', 0.2)");
  lines.push('    elif 이벤트.pick == balls[1]:', '        balls[1].color = balls[0].color');
  if (light) lines.push('        lamp.pos = vec(1.5, 1, 1)');
  if (sound) lines.push("        play_note('G4', 0.2)");
  lines.push('    else:', '        balls[0].color = colors[0]', '        balls[1].color = colors[1]');
  if (light) lines.push('        lamp.pos = vec(0, 2, 2)');
  return [...lines, '', bindClick].join('\n');
}

export default {
  id: 'two-ball-signals',
  track: 'beginner',
  level: 1,
  title: { ko: '클릭에 반응하는 두 공', en: 'Two balls that respond to clicks' },
  subject: '코딩',
  description: '공 하나를 그리고 색을 입힙니다. 두 번째 공을 놓고, 클릭한 공이 다른 공의 색을 따라 하게 만든 뒤 빛과 소리를 더합니다.',
  targetGrade: '코딩을 처음 배우는 학생',
  sessions: 8,
  icon: '🟣',
  color: 'sky',
  lessons: [
    {
      id: 'draw', title: { ko: '공 하나 그리기', en: 'Draw one ball' },
      summary: '빈 첫 줄에 sphere()를 입력하고 실행을 누르세요.',
      code: oneBall, starterCode: '',
      practice: {
        line: oneBall,
        meaning: 'sphere는 공을 그리는 명령입니다. 영문 소문자로 쓰고 끝에 여는 괄호와 닫는 괄호를 붙입니다.',
        change: '괄호 안을 비운 채 실행하세요. 공은 화면 어디에 나타나나요?',
        observe: '처음 나온 공의 색과 위치를 기억해 두세요.',
      },
    },
    {
      id: 'color', title: { ko: '공에 분홍색 입히기', en: 'Color the ball pink' },
      summary: '같은 공에 색을 지정해 다시 그립니다.',
      code: pinkBall,
      practice: {
        line: pink, meaning: '색상에서 분홍을 골라 color에 건네면 분홍 공이 그려집니다.',
        change: '따옴표 안의 분홍을 하늘로 바꾸고 다시 실행하세요.',
        observe: '어느 부분을 그대로 두었기에 이번에도 공이 그려졌나요?',
      },
    },
    {
      id: 'second', title: { ko: '하늘색 공 하나 더 놓기', en: 'Add a sky-blue ball' },
      summary: '첫 줄은 그대로 두고 둘째 줄에 하늘색 공을 그립니다.',
      code: pinkBall + '\n' + secondBall,
      practice: {
        line: 'pos=vec(2.5, 0, 0)', meaning: '두 공을 같은 자리에 그리면 겹칩니다. 둘째 공의 첫 번째 좌표를 2.5로 정해 오른쪽에 놓습니다.',
        change: '2.5 앞에 마이너스를 붙여 보세요. 실행하기 전에 둘째 공이 어디로 갈지 짚어 보세요.',
        observe: '분홍 공도 함께 움직였나요? 어느 줄이 어느 공을 그리는지 찾아보세요.',
      },
    },
    {
      id: 'arrange', title: { ko: '두 공의 크기와 위치 정하기', en: 'Set the sizes and positions' },
      summary: '두 공을 같은 크기로 그리고 가운데에서 같은 거리만큼 떨어뜨립니다.',
      code: placedBalls,
      practice: {
        line: 'radius=0.8', meaning: 'radius는 반지름입니다. 첫 번째 좌표 -1.5와 1.5는 왼쪽과 오른쪽 자리입니다. left와 right는 나중에 각 공을 다시 부를 이름입니다.',
        change: '왼쪽 공의 radius만 1.2로 바꾸세요. 이번에는 그 값을 되돌리고 첫 번째 좌표만 -2로 바꿔 보세요.',
        observe: '공을 키우는 숫자와 옮기는 숫자를 각각 짚어 보세요.',
      },
    },
    {
      id: 'click', title: { ko: '클릭하면 색을 바꾸는 함수', en: 'Change a color with a click' },
      summary: '장면을 누르면 왼쪽 공이 오른쪽 공의 색을 가져옵니다.',
      code: clickAnywhere,
      practice: {
        line: bindClick, meaning: 'def로 클릭할 때 할 일을 묶고 scene.bind로 클릭과 그 함수를 연결합니다. 들여쓴 줄은 클릭할 때 실행됩니다.',
        change: 'left.color = right.color에서 left와 right를 서로 바꾸세요. 어느 공의 색이 변할까요?',
        observe: '다시 실행한 뒤 빈 곳을 먼저 눌러 보세요. 공을 직접 눌렀을 때와 결과가 같은 까닭은 무엇일까요?',
      },
    },
    {
      id: 'pick', title: { ko: '조건문으로 누른 공 구분하기', en: 'Check which ball was clicked' },
      summary: '왼쪽 공, 오른쪽 공, 빈 곳을 눌렀을 때 할 일을 따로 정합니다.',
      code: pickProgram(),
      practice: {
        line: 'if 이벤트.pick == balls[0]:',
        meaning: '이벤트.pick은 클릭한 도형입니다. balls[0]과 같으면 첫째 공, balls[1]과 같으면 둘째 공을 누른 것입니다. 빈 곳을 누르면 None입니다.',
        change: 'colors의 첫 색을 바꾸고 실행하세요. 왼쪽 공을 누른 다음 빈 곳을 누르면 어떤 색이 돌아올까요?',
        observe: '왼쪽, 오른쪽 순서로 누르면 둘 다 하늘색입니다. 빈 곳을 눌러 되돌린 뒤 오른쪽부터 누르면 왜 둘 다 분홍색이 될까요?',
      },
    },
    {
      id: 'light', title: { ko: '누른 공 가까이 빛 옮기기', en: 'Move a light toward the clicked ball' },
      summary: '흰 조명 하나를 놓고, 클릭한 공 위쪽으로 옮깁니다.',
      code: pickProgram({ light: true }),
      practice: {
        line: 'lamp = local_light(pos=vec(0, 2, 2), intensity=8)',
        meaning: 'scene.lights에 lamp만 넣어 이 조명으로 두 공을 비춥니다. lamp.pos를 바꾸면 조명이 움직입니다. 빈 곳을 누르면 빛도 가운데로 돌아옵니다.',
        change: 'intensity를 8에서 2로 줄이고 같은 공을 다시 눌러 보세요.',
        observe: '두 공이 같은 색일 때 왼쪽과 오른쪽을 번갈아 눌러 보세요. 밝게 비치는 쪽은 어떻게 달라지나요?',
      },
    },
    {
      id: 'sound', title: { ko: '두 공에 서로 다른 소리 더하기', en: 'Give each ball its own note' },
      summary: '왼쪽 공에는 도, 오른쪽 공에는 솔을 연결합니다. 빈 곳은 조용히 처음 상태로 돌아갑니다.',
      code: pickProgram({ light: true, sound: true }),
      practice: {
        line: "play_note('C4', 0.2)",
        meaning: '왼쪽 공을 누르면 C4(도), 오른쪽 공을 누르면 G4(솔)가 0.2초 동안 납니다. 각 음을 해당 조건 안에 들여써서 연결합니다.',
        change: '오른쪽 공의 G4를 E4(미)로 바꾸고 두 공을 번갈아 눌러 보세요.',
        observe: '두 공의 색이 같아져도 소리만 듣고 어느 공을 눌렀는지 구분할 수 있나요?',
      },
    },
  ],
};
