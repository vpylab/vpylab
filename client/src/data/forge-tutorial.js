const text=(ko,en)=>({ko,en});
const character=`from vpython import *
scene.range = 4
scene.forward = vector(0, 0, -1)

# 흰 부품을 모으면 전체 색을 바꾸기 쉽습니다. 눈은 검은색을 유지합니다.
def make_friend(where, tint):
    parts = [
        sphere(pos=where, radius=0.55, color=color.white),
        ellipsoid(pos=where+vector(-0.28,-0.45,0.12), size=vector(0.42,0.24,0.5), color=color.white),
        ellipsoid(pos=where+vector(0.28,-0.45,0.12), size=vector(0.42,0.24,0.5), color=color.white),
        sphere(pos=where+vector(-0.52,-0.05,0), radius=0.18, color=color.white),
        sphere(pos=where+vector(0.52,-0.05,0), radius=0.18, color=color.white),
        ellipsoid(pos=where+vector(-0.15,0.12,0.51), size=vector(0.1,0.23,0.08), color=color.black),
        ellipsoid(pos=where+vector(0.15,0.12,0.51), size=vector(0.1,0.23,0.08), color=color.black),
    ]
    friend = compound(parts)
    friend.color = tint
    return friend

player = make_friend(vector(0,0,0), vector(0.4,0.75,1))
other = make_friend(vector(-2.1,1.1,0), vector(1,0.75,0.45))
`;
const movement=`
speed = 2
def move_character(dx, dy):
    player.pos += vector(dx, dy, 0)
    player.pos.x = max(-3, min(3, player.pos.x))
    player.pos.y = max(-1.7, min(1.7, player.pos.y))
`;
const buttons=`
# 버튼은 터치 화면에서도 쓸 수 있습니다.
button(text="←", bind=lambda b: move_character(-0.2,0))
button(text="→", bind=lambda b: move_character(0.2,0))
button(text="↑", bind=lambda b: move_character(0,0.2))
button(text="↓", bind=lambda b: move_character(0,-0.2))
`;
const loop=`
while True:
    rate(60)
    keys = keysdown()
    dx = int('right' in keys or 'd' in keys) - int('left' in keys or 'a' in keys)
    dy = int('up' in keys or 'w' in keys) - int('down' in keys or 's' in keys)
    direction = vector(dx,dy,0)
    if mag(direction) > 0:
        step = norm(direction) * speed / 60
        move_character(step.x, step.y)
`;
const itemLogic=`
items = [
    sphere(pos=vector(1.5,0,0), radius=0.2, color=vector(1,0.45,0.7)),
    sphere(pos=vector(-1.5,-0.9,0), radius=0.2, color=vector(0.45,1,0.6)),
]
def collect_items():
    for item in items:
        if item.visible and mag(player.pos-item.pos) < 0.7:
            player.color = vector(item.color)
            item.visible = False
            print("내 캐릭터만 아이템 색으로 바뀌었어요!")
`;
const variants=[
  {id:'build',title:text('1 부품을 compound로','1 Combine parts'),code:character,note:text('흰 부품과 검은 눈을 한 덩어리로 묶습니다. player와 other는 서로 다른 오브젝트입니다.','Combine white parts and black eyes. player and other are separate objects.')},
  {id:'move',title:text('2 직접 움직이기','2 Move your character'),code:character+movement+buttons+loop,note:text('3D 화면을 한 번 누르고 방향키 또는 WASD로 움직이세요. 아래 화살표 버튼도 쓸 수 있습니다.','Click the 3D view, then use arrows or WASD. The on-screen buttons also work.')},
  {id:'collect',title:text('3 먹으면 내 색 바꾸기','3 Collect and change color'),code:character+movement+itemLogic+buttons+loop+'    collect_items()\n',note:text('분홍·초록 아이템으로 다가가세요. 먹은 아이템은 사라지고 player만 색이 바뀝니다. other의 색과 검은 눈은 유지됩니다.','Move to a pink or green item. Only player changes color; other and the black eyes stay unchanged.')},
];
export const forgeCharacterTutorial={
  id:'forge-character',kind:'lab',duration:text('15~20분 · 직접 만들고 실험','15–20 min · Build and experiment'),
  title:text('내 캐릭터가 아이템을 먹는다면?','What if my character collects an item?'),
  description:text('캐릭터를 compound로 묶고, 움직이고, 아이템을 먹으면 그 캐릭터의 색만 바꿉니다. 완성한 모양은 대장간의 모듈로 다른 프로젝트에 가져가 보세요.','Combine, move, and recolor one character when it collects an item. Reuse shapes as modules from the forge.'),
  change:text('몸통 반지름·발 크기·speed 중 하나를 바꾸고 어떤 결과인지 먼저 예상하세요.','Change body radius, foot size, or speed and predict the result.'),
  reflect:text('player.color를 other.color로 바꾸면 누가 변할까요? 부품을 따로 만드는 것과 compound로 묶는 것의 차이를 설명하세요.','Who changes if player.color becomes other.color? Explain what compound changes.'),
  tasks:[text('아이템 하나를 더 만들고 위치와 색을 직접 정하세요.','Add another item and choose its color and position.'),text('대장간에서 만든 캐릭터를 player = my_module로 연결해 보세요. 흰 몸통·흰 포인트 색으로 시작하면 전체 색 변화가 분명합니다.','Use your Forge character by setting player = my_module. White body and accent colors make tint changes clearer.')],
  peerTest:text('친구가 조작하고, 다른 친구는 player와 other 중 누구의 색이 변했는지 관찰하세요. 역할을 바꿔 다시 시험하세요.','Take turns controlling and observing which character changes color.'),
  tips:[text('compound.color는 원래 부품 색에 곱해집니다. 흰 몸통은 원하는 색으로 바뀌고 검은 눈은 검게 남습니다.','compound.color multiplies original colors. White parts take the tint; black eyes stay black.'),text('같은 객체를 두 변수에 넣으면 두 캐릭터가 아닙니다. make_friend를 두 번 호출해야 각각 움직이고 색을 바꿀 수 있습니다.','Two variable names do not create two objects. Call make_friend twice for independent objects.')],
  variants,
};
export function getForgeTutorial(id,step){if(id!==forgeCharacterTutorial.id)return undefined;const variant=variants.find(v=>v.id===step)||variants[0];return {...forgeCharacterTutorial,code:variant.code,activeStep:variant.id,stepNote:variant.note,usesSound:false};}
