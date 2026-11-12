import { getLightSoundLab } from './light-sound-labs.js';
import { getCreativeLab } from './creative-labs.js';
import { getForgeTutorial } from './forge-tutorial.js';
import { getWelcomeTutorial } from './welcome-friends.js';
import { getCameraTutorial } from './camera-views.js';

const text = (ko, en) => ({ ko, en });

// 기능을 맛보는 체험입니다. 트레이닝 진도나 자동 점수를 만들지 않습니다.
export const tutorials = [
  {
    id: 'shape', title: text('3D를 바로 만들기', 'Create in 3D'),
    description: text('한 줄로 공을 만들고 크기를 바꿉니다.', 'Make a sphere and change its size.'),
    change: text('radius=0.5를 radius=1로 바꾸세요.', 'Change radius=0.5 to radius=1.'),
    reflect: text('반지름을 두 배로 하면 공은 어떻게 달라지나요?', 'What changes when you double the radius?'),
    code: `from vpython import *
sphere(radius=0.5, color=색상['하늘'])
`,
  },
  {
    id: 'light-sound', title: text('빛과 소리 연결하기', 'Connect light and sound'),
    description: text('소리가 나는 순간 공의 빛과 크기가 바뀝니다.', 'A sphere changes its glow and size as a note plays.'),
    change: text('음표("도")를 음표("솔")로 바꾸세요. 소리를 듣기 어려우면 공의 크기와 빛을 비교하세요.', 'Change 음표("도") to 음표("솔"). You can also compare the sphere’s size and glow without sound.'),
    reflect: text('소리만 바꾸면 화면도 달라지나요? 빛이 바뀌는 줄을 찾아보세요.', 'Does changing only the note change the scene? Find the line that changes the glow.'),
    code: `from vpython import *
공 = sphere(radius=0.4, color=색상['민트'])
sleep(0.5)
공.emissive = True
공.radius = 0.8
음표("도")
`,
  },
  {
    id: 'motion', title: text('움직임 눈으로 보기', 'Watch code move'),
    description: text('같은 공을 조금씩 옮겨 움직임을 만듭니다.', 'Move the same sphere a little at a time.'),
    change: text('vector(0.03, 0, 0)의 0.03을 -0.03으로 바꾸세요.', 'Change 0.03 to -0.03 in vector(0.03, 0, 0).'),
    reflect: text('부호를 바꾸니 어느 방향으로 움직이나요?', 'Which way does the sphere move after changing the sign?'),
    code: `from vpython import *
scene.range = 3
공 = sphere(radius=0.3, color=색상['분홍'], make_trail=True)
for i in range(60):
    rate(30)
    공.pos = 공.pos + vector(0.03, 0, 0)
`,
  },
  {
    id: 'interaction', title: text('버튼으로 반응 만들기', 'Make a button respond'),
    description: text('버튼을 누르면 공의 색이 바뀝니다.', 'Press a button to change a sphere’s color.'),
    change: text('함수 안의 색상[\'노랑\']을 색상[\'보라\']로 바꾸고 다시 실행한 뒤 버튼을 누르세요.', 'Change 색상[\'노랑\'] to 색상[\'보라\'] inside the function, run again, and press the button.'),
    reflect: text('실행만 했을 때와 버튼을 눌렀을 때의 차이는 무엇인가요?', 'What is different between running the code and pressing the button?'),
    code: `from vpython import *
공 = sphere(color=색상['하늘'])
def 바꾸기(b):
    공.color = 색상['노랑']
button(text="색 바꾸기", bind=바꾸기)
`,
  },
];

export const getTutorial = (id, step) => tutorials.find(item => item.id === id) || getWelcomeTutorial(id, step) || getCameraTutorial(id, step) || getForgeTutorial(id, step) || getCreativeLab(id, step) || getLightSoundLab(id, step);
