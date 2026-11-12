import { eclipseViewsCode } from './eclipse-views.js';

const text = (ko, en) => ({ ko, en });

// 1·2단계가 함께 쓰는 장면: 바닥, 공, 나무
const yard = `from vpython import *
ground = box(pos=vector(0, -0.6, 0), size=vector(8, 0.2, 4), color=color.green)
ball = sphere(pos=vector(-3, 0, 0), radius=0.5, color=color.orange)
tree = cone(pos=vector(3, -0.5, 0), axis=vector(0, 1.5, 0), radius=0.5, color=color.cyan)
`;

const lookCode = `${yard}
scene.center = vector(0, 0, 0)        # 카메라가 바라보는 점
scene.range = 5                       # 중심에서 화면 가장자리까지 보이는 거리
scene.forward = vector(0, -0.5, -1)   # 카메라가 보는 방향
`;

const placeCode = `${yard}
scene.camera.pos = vector(0, 3, 8)      # 카메라가 있는 곳
scene.camera.axis = vector(0, -3, -8)   # 카메라에서 바라보는 점까지의 화살표
print("center =", scene.center)
print("range =", round(scene.range, 2))
`;

// 3·5단계가 함께 쓰는 장면: 나무 둘레를 도는 차
const track = `from vpython import *
ground = box(pos=vector(0, -0.3, 0), size=vector(14, 0.2, 14), color=color.green)
tree = cone(pos=vector(0, -0.2, 0), axis=vector(0, 2, 0), radius=0.6, color=color.cyan)
post = cylinder(pos=vector(5, -0.2, 3), axis=vector(0, 1.5, 0), radius=0.2, color=color.red)
car = box(size=vector(1, 0.4, 0.6), color=color.orange)
`;

const rideCode = `${track}
angle = 0
while True:
    rate(60)
    angle = angle + 0.01
    car.pos = vector(5 * cos(angle), 0, 5 * sin(angle))
    heading = vector(-sin(angle), 0, cos(angle))     # 차가 나아가는 방향
    car.axis = heading
    scene.camera.pos = car.pos + vector(0, 0.6, 0)   # 차 지붕 위
    scene.camera.axis = heading * 4                  # 앞쪽으로 4만큼 떨어진 곳을 본다
`;

const followCode = `from vpython import *
ground = box(pos=vector(10, -0.6, 0), size=vector(30, 0.2, 4), color=color.green)
for i in range(11):
    cylinder(pos=vector(i * 2, -0.5, -1), axis=vector(0, 1, 0), radius=0.1, color=color.white)
ball = sphere(pos=vector(0, 0, 0), radius=0.5, color=color.orange)

scene.range = 4
scene.forward = vector(0, -0.3, -1)
scene.camera.follow(ball)   # 공을 화면 가운데에 둔다

while ball.pos.x < 20:
    rate(60)
    ball.pos.x = ball.pos.x + 0.05
`;

const switchCode = `${track}scene.title = "1: 위 / Top   2: 차 / Car   3: 뒤 / Chase"

view = 1
angle = 0
while True:
    rate(60)
    keys = keysdown()
    if '1' in keys:
        view = 1
    if '2' in keys:
        view = 2
    if '3' in keys:
        view = 3

    angle = angle + 0.01
    car.pos = vector(5 * cos(angle), 0, 5 * sin(angle))
    heading = vector(-sin(angle), 0, cos(angle))
    car.axis = heading

    if view == 1:
        scene.camera.pos = vector(0, 12, 9)
        scene.camera.axis = vector(0, -12, -9)
    if view == 2:
        scene.camera.pos = car.pos + vector(0, 0.6, 0)
        scene.camera.axis = heading * 4
    if view == 3:
        scene.camera.pos = car.pos - heading * 4 + vector(0, 2, 0)
        scene.camera.axis = car.pos - scene.camera.pos
`;

// 카메라 시점 튜토리얼. 기존 선택 활동(creative-labs)과 같은 형식이며, 단계마다 바꿀 것과 생각할 것이 따로 있습니다.
// 한국어 문장은 솔라 프로4가 집필했습니다 (docs/reference/solar/camera-views-261112-solar.md). 사실이 바뀔 때만 고칩니다.
export const cameraViewsTutorial = {
  id: 'camera-views', kind: 'lab', duration: text('20~30분 · 혼자 또는 2명', '20–30 min · Solo or pairs'),
  title: text('카메라 시점 바꾸기', 'Change the camera view'),
  description: text("카메라가 서 있는 위치와 바라보는 점을 코드로 정하는 방법을 익힙니다. 움직이는 차 위에 카메라를 올리고 마지막 단계에서는 서울과 달 표면에 카메라를 두고 일식과 월식을 관찰합니다.", "Learn to set in code where the camera stands and the point it looks at. Put the camera on a moving car, and in the last stage put it on Seoul and on the Moon's surface to watch solar and lunar eclipses."),
  prerequisite: text('움직임 체험 다음 · vector와 while 반복', 'After the motion experience · vector and while loops'),
  code: lookCode,
  variants: [
    {
      id: 'look', title: text('1. 바라보는 곳', '1. Where it looks'), code: lookCode,
      note: text("scene.center는 카메라가 바라보는 점입니다. scene.range는 그 점에서 화면 가장자리까지 보이는 거리입니다. scene.forward는 카메라가 보는 방향이며 벡터의 길이는 영향을 주지 않습니다. 이 값을 적지 않으면 VPyLab이 물체가 만들어진 자리에 맞춰 화면을 정하고 그 뒤 물체가 움직여도 카메라는 움직이지 않습니다.", "scene.center is the point the camera looks at. scene.range is the distance you can see from that point to the edge of the view. scene.forward is the direction the camera faces; the length of the vector does not matter. If you leave these out, VPyLab frames the places where objects were created, and the camera does not move when objects move later."),
      change: text("먼저 scene.range = 5의 5를 2로 변경하고 실행합니다. 다음으로 scene.center를 vector(3, 0, 0)으로 변경하고 실행합니다.", "First change the 5 in scene.range = 5 to 2 and run. Then change scene.center to vector(3, 0, 0) and run."),
      reflect: text("range를 줄이면 공과 나무가 크게 보이지만 코드의 radius 값은 그대로입니다. 달라진 것은 물체가 아니라 카메라가 보여 주는 범위입니다. center를 옮긴 뒤 화면 가운데에 놓인 물체가 무엇인지 확인합니다.", "With a smaller range the ball and the tree look bigger, but the radius values in the code are the same. What changed is the range the camera shows, not the objects. After moving center, check which object sits in the middle of the view."),
    },
    {
      id: 'place', title: text('2. 카메라 옮기기', '2. Move the camera'), code: placeCode,
      note: text("scene.camera.pos는 카메라가 있는 위치를 나타냅니다. scene.camera.axis는 카메라에서 바라보는 점까지 이어지는 화살표입니다. 바라보는 점 scene.center는 pos에 axis를 더한 값입니다. 코드를 실행하면 콘솔에 center = <0, 0, 0>이 출력됩니다. 코드에서는 pos를 먼저 정하고 axis를 그다음에 정합니다. pos를 바꾸면 axis는 그대로 유지되어 center가 함께 옮겨집니다.", "scene.camera.pos is where the camera is. scene.camera.axis is the arrow from the camera to the point it looks at. That point, scene.center, is pos plus axis. Running the code prints center = <0, 0, 0> in the console. The code sets pos first and axis second. Changing pos keeps axis as it is, so center moves along with it."),
      change: text("scene.camera.axis를 vector(3, -3, -8)로 변경하고 실행합니다. 카메라는 같은 위치에서 방향만 돌려 나무 쪽을 보며 출력되는 center는 <3, 0, 0>입니다.", "Change scene.camera.axis to vector(3, -3, -8) and run. The camera stays in the same place and only turns toward the tree, and the printed center is <3, 0, 0>."),
      reflect: text("axis를 vector(0, -1.5, -4)로 바꾸면 처음 값과 방향은 같고 길이만 절반입니다. 이때 3D 화면은 처음과 같으며 출력되는 center와 range 값만 달라집니다. 화면에 보이는 모습은 카메라의 위치와 방향이 정하고 axis의 길이는 바라보는 점까지의 거리만 정하기 때문입니다. range는 axis의 길이에 비례합니다.", "Changing axis to vector(0, -1.5, -4) keeps the first direction and halves the length. The 3D view stays the same; only the printed center and range change. What you see is decided by the camera's position and direction, while the length of axis only sets the distance to the point it looks at. range is proportional to the length of axis."),
    },
    {
      id: 'ride', title: text('3. 물체에 올리기', '3. Ride an object'), code: rideCode,
      note: text("차가 나무 둘레를 돕니다. while 반복 안에서 scene.camera.pos와 scene.camera.axis를 매번 다시 정하면 카메라가 차와 함께 움직입니다. pos는 차 위치에서 위로 0.6만큼 올린 곳이며 axis는 차가 나아가는 방향 heading에 4를 곱한 값입니다.", "The car circles the tree. Setting scene.camera.pos and scene.camera.axis again on every pass of the while loop makes the camera move with the car. pos is 0.6 above the car, and axis is heading, the direction the car is moving, times 4."),
      change: text("마지막 줄 scene.camera.axis = heading * 4를 scene.camera.axis = tree.pos - scene.camera.pos로 변경합니다. 차는 계속 달리고 카메라는 나무를 계속 바라봅니다.", "Change the last line, scene.camera.axis = heading * 4, to scene.camera.axis = tree.pos - scene.camera.pos. The car keeps driving and the camera keeps looking at the tree."),
      reflect: text("axis는 보고 싶은 점의 위치에서 카메라 위치를 뺀 값입니다. 같은 방법으로 빨간 기둥 post를 계속 바라보는 코드로 고쳐서 확인합니다.", "axis is the position of the point you want to see minus the camera position. Use the same rule to keep looking at the red post, and check the result."),
    },
    {
      id: 'follow', title: text('4. 따라가기', '4. Follow'), code: followCode,
      note: text("scene.camera.follow(ball)은 공을 계속 화면 가운데에 둡니다. 보는 방향과 거리는 유지되고 바라보는 점만 공의 위치로 바뀝니다. 흰 기둥이 뒤로 지나가는 모습으로 공의 이동을 확인할 수 있습니다. scene.camera.follow(None)은 따라가기를 멈춥니다.", "scene.camera.follow(ball) keeps the ball in the middle of the view. The viewing direction and distance stay the same; only the point the camera looks at changes to the ball's position. The white posts passing by show that the ball is moving. scene.camera.follow(None) stops following."),
      change: text("scene.camera.follow(ball) 줄 맨 앞에 #을 붙이고 실행합니다. 카메라가 한 곳에 고정되어 공이 오른쪽으로 화면을 벗어납니다.", "Put # at the start of the scene.camera.follow(ball) line and run. The camera stays in one place and the ball leaves the view to the right."),
      reflect: text("3단계는 카메라가 차와 함께 움직이며 차가 향하는 쪽을 봅니다. 4단계는 카메라가 거리와 방향을 유지한 채 공을 가운데에 둡니다. 물체의 빠르기와 방향을 비교할 때는 고정된 카메라가 알맞고 멀리 이동하는 물체를 계속 볼 때는 따라가는 카메라가 알맞습니다.", "In stage 3 the camera moves with the car and looks where the car is heading. In stage 4 the camera keeps its distance and direction and keeps the ball centered. A fixed camera suits comparing how fast and which way objects move; a following camera suits watching an object that travels far."),
    },
    {
      id: 'switch', title: text('5. 키로 전환하기', '5. Switch with keys'), code: switchCode,
      note: text("변수 view에 지금 시점의 번호를 저장합니다. keysdown()은 지금 눌려 있는 키의 목록을 돌려줍니다. 3D 화면을 한 번 누른 뒤 숫자 키 1, 2, 3으로 전환하며 1은 위에서 내려다보기, 2는 차에서 앞을 보기, 3은 차 뒤에서 따라가기입니다.", "The variable view stores the number of the current view. keysdown() returns the list of keys held down right now. Click the 3D view once, then switch with the number keys 1, 2 and 3: 1 looks down from above, 2 looks ahead from the car, and 3 follows from behind the car."),
      change: text("시점 3의 줄 scene.camera.pos = car.pos - heading * 4 + vector(0, 2, 0)에서 4를 8로, 2를 5로 변경합니다. 카메라가 차에서 더 멀고 더 높은 곳에서 따라갑니다.", "In the line for view 3, scene.camera.pos = car.pos - heading * 4 + vector(0, 2, 0), change 4 to 8 and 2 to 5. The camera follows from farther back and higher up."),
      reflect: text("시점 하나는 카메라 위치를 정하는 줄과 axis를 정하는 줄, 두 줄로 이루어집니다. 학생이 추가할 네 번째 시점은 나무 꼭대기에서 차를 바라보는 시점입니다. 이 시점은 숫자 키 4로 선택합니다. 추가할 코드는 키 4를 확인하는 조건과 view == 4일 때 실행할 두 줄입니다.", "A view is two lines: one that sets the camera position and one that sets axis. The fourth view to add looks at the car from the top of the tree. Select it with the number key 4. The code to add is a condition that checks key 4 and the two lines to run when view == 4."),
    },
    {
      id: 'eclipse', title: text('6. 일식과 월식', '6. Eclipses'), code: eclipseViewsCode,
      note: text("태양, 지구, 달의 모형이며 화면 아래 목록에서 네 가지 시점을 고르고 빠르기 슬라이더로 시간의 빠르기를 조절합니다. 천체의 크기와 거리, 달 궤도의 기울기, 지구의 자전 빠르기는 한 화면에서 관찰할 수 있게 바꾼 값이며 실제 비율이 아닙니다. 실행하자마자 서울에서 태양 보기를 고르면 약 4초 뒤 달이 태양을 가리기 시작하고 약 6초 뒤 태양이 모두 가려집니다. 약 50초 뒤에는 월식이 일어나며 서울에서 달 보기에서 달이 어두운 붉은색으로 바뀝니다. 달에서 지구 보기는 지구를 향한 달 표면에 카메라를 둔 시점이며 월식 때 지구가 태양을 가리는 모습이 보입니다.", "This is a model of the Sun, Earth and Moon. Choose one of four views from the list below the 3D view, and set how fast time passes with the Speed slider. The sizes and distances, the tilt of the Moon's orbit and Earth's spin rate are changed so that everything can be observed in one view; they are not the real proportions. Choose Sun from Seoul right after running: the Moon starts to cover the Sun after about 4 seconds and covers it completely after about 6 seconds. A lunar eclipse follows after about 50 seconds, and in Moon from Seoul the Moon turns dark red. Earth from Moon puts the camera on the lunar surface facing Earth, and during the lunar eclipse you see Earth cover the Sun."),
      change: text("tilt = radians(25)의 25를 0으로 변경하고 실행한 뒤 빠르기를 올려서 관찰합니다. 화면 아래 안내 문구에 일식과 월식이 달이 한 바퀴 돌 때마다 나타납니다.", "Change the 25 in tilt = radians(25) to 0, run, and raise the speed to watch. The message below the 3D view shows a solar and a lunar eclipse every time the Moon goes around once."),
      reflect: text("기울기가 25일 때는 처음 두 달이 지난 뒤 한동안 일식도 월식도 일어나지 않습니다. 우주에서 보기에서 달이 지구 그림자를 나타낸 원기둥의 위나 아래로 지나가는 모습을 확인합니다. 실제 달 궤도의 기울기는 약 5도이며 실제 일식과 월식도 같은 까닭으로 매달 일어나지 않습니다.", "With a tilt of 25, after the first two months there are no solar or lunar eclipses for a while. In the Space view, check how the Moon passes above or below the cylinder that marks Earth's shadow. The real tilt of the Moon's orbit is about 5 degrees, and real eclipses do not happen every month for the same reason."),
    },
  ],
  tasks: [
    text("6단계 코드에서 latitude = radians(37.5)의 37.5를 적도의 위도 0으로 변경합니다. 같은 시각의 일식이 서울에서 볼 때와 어떻게 다른지 비교합니다.", "In the stage 6 code, change the 37.5 in latitude = radians(37.5) to 0, the latitude of the equator. Compare how the eclipse at the same moment differs from the view in Seoul."),
    text("직접 만든 움직이는 작품에 시점 두 가지를 넣습니다. 한 시점은 전체를 보는 고정된 카메라이고 다른 시점은 움직이는 물체 위에 올린 카메라입니다.", "Add two views to a moving project of your own. One is a fixed camera that shows everything; the other is a camera placed on a moving object."),
  ],
  tips: [
    text("숫자 키를 눌러도 시점이 바뀌지 않으면 3D 화면을 한 번 누른 뒤 다시 누릅니다. 키보드가 없는 기기에서는 6단계처럼 menu를 사용하면 화면을 눌러서 고를 수 있습니다.", "If the number keys do not change the view, click the 3D view once and press again. On a device without a keyboard, use menu as in stage 6 so the view can be chosen by tapping."),
    text("물체가 화면 밖으로 나가 보이지 않으면 3D 화면 오른쪽 위의 화면에 맞추기 버튼을 누릅니다. 지금 있는 물체가 모두 보이도록 카메라가 한 번 맞춰집니다. 코드가 반복 안에서 카메라를 매번 정하는 3단계, 5단계, 6단계에서는 코드가 정한 시점이 우선합니다.", "If an object has left the view, press Fit to view at the top right of the 3D view. The camera is fitted once so that every object is visible. In stages 3, 5 and 6, where the code sets the camera on every pass of the loop, the view set by the code wins."),
    text("보는 방향이 화면의 위쪽 방향 scene.up과 나란하면 화면이 어느 쪽으로 돌아갈지 정해지지 않습니다. 바로 위에서 내려다볼 때는 scene.forward = vector(0, -1, -0.01)처럼 방향을 조금 기울입니다.", "If the viewing direction is parallel to scene.up, the upward direction of the view, the way the view is turned is not determined. To look straight down, tilt the direction slightly, as in scene.forward = vector(0, -1, -0.01)."),
    text("서울에서 보는 두 시점에서 화면이 지구로 가득 차면 태양이나 달이 지평선 아래에 있는 때입니다. 지구가 자전해 다시 떠오를 때까지 기다리거나 빠르기를 올립니다. 이 모형은 달의 그림자가 지구 표면에 생기는 모습을 그리지 않으며 일식과 월식이 일어나는 때는 화면 아래 안내 문구로 확인합니다.", "If Earth fills the view in the two views from Seoul, the Sun or the Moon is below the horizon. Wait for Earth to spin until it rises again, or raise the speed. This model does not draw the Moon's shadow on Earth's surface; read the message below the 3D view to know when an eclipse is happening."),
  ],
};

export function getCameraTutorial(id, step) {
  if (id !== cameraViewsTutorial.id) return undefined;
  const variant = cameraViewsTutorial.variants.find(item => item.id === step) || cameraViewsTutorial.variants[0];
  return { ...cameraViewsTutorial, code: variant.code, activeStep: variant.id, stepNote: variant.note, change: variant.change, reflect: variant.reflect };
}
