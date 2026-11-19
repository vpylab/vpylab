const word = (id, meaning, reading, explanation, example, english) => ({ id, meaning, reading, explanation, example, english });
export const codeVocabulary = [
  word('radius', '반지름', '레이디어스', '동그라미의 중심에서 가장자리까지의 길이예요. 두 배로 하면 전체 너비도 두 배가 돼요.', 'sphere(radius=0.5)', 'The distance from the centre to the edge.'),
  word('opacity', '불투명도', '오패서티', '얼마나 비치지 않는지를 뜻해요. 0은 완전히 투명, 1은 불투명해요. 0.5면 반쯤 비쳐요.', 'sphere(opacity=0.5)', '0 is transparent; 1 is opaque. Try 0.5 for a see-through shape.'),
  word('pos', '위치', '포즈 · position의 줄임말', '어디에 놓을지 정해요. 기본 좌표에서 x는 좌우, y는 위아래, z는 앞뒤예요.', 'ball.pos.x += 0.1', 'Position. Change pos.x to move along the x axis.'),
  word('size', '크기', '사이즈', '기본 방향에서 가로·높이·앞뒤 두께를 차례로 정해요. 도형을 돌리면 이 방향도 함께 돌아가요.', 'box(size=vector(2, 1, 0.5))', 'Length, height and depth along the object’s own axes.'),
  word('vector', '세 값 묶음', '벡터', 'x, y, z 세 값을 묶어요. 위치·방향·크기뿐 아니라 빛의 빨강·초록·파랑 값에도 써요.', 'vector(1, 2, 0)', 'Three values used for position, direction, size or RGB colour.'),
  word('sphere', '구', '스피어', '공처럼 둥근 입체 도형을 만들어요. radius로 반지름을 바꿔 보세요.', 'sphere(radius=0.5)', 'A ball-shaped object.'),
  word('box', '상자', '박스', '상자 모양의 입체 도형을 만들어요. size로 각 방향의 크기를 바꿔 보세요.', 'box(size=vector(1, 1, 1))', 'A box-shaped object.'),
  word('ellipsoid', '타원체', '일립소이드', '공을 늘이거나 납작하게 만든 모양이에요. 몸통·발·눈을 만들기 좋아요.', 'ellipsoid(size=vector(2, 1, 1))', 'A stretched or flattened sphere.'),
  word('cylinder', '원기둥', '실린더', '통이나 막대 같은 모양이에요. radius는 굵기, axis는 뻗는 방향과 길이를 정해요.', 'cylinder(radius=0.2, axis=vector(0, 1, 0))', 'A cylinder. Use radius for thickness and axis for direction and length.'),
  word('cone', '원뿔', '콘', '끝이 뾰족한 모양이에요. radius는 밑면의 반지름이에요.', 'cone(radius=0.5, axis=vector(0, 1, 0))', 'A cone with a pointed tip.'),
  word('ring', '고리', '링', '도넛 같은 고리를 만들어요. radius는 고리의 반지름, thickness는 관의 반지름이에요.', 'ring(radius=0.5, thickness=0.1)', 'A ring. Thickness is the radius of its tube.'),
  word('length', '길이', '렝스', '도형의 길이예요. 기본 방향에서는 x축을 따라 늘어나요. 도형을 돌리면 길이 방향도 함께 돌아가요.', 'box(length=2)', 'Length along the object’s own x axis.'),
  word('height', '높이', '하이트', '도형의 높이예요. 기본 방향에서는 y축을 따라 늘어나요.', 'box(height=1)', 'Height along the object’s own y axis.'),
  word('width', '앞뒤 두께', '위드스', 'VPython에서는 기본 방향의 z축, 즉 앞뒤 두께예요. 가로 길이를 바꾸려면 length를 써요.', 'box(width=0.5)', 'Depth along the object’s own z axis in VPython.'),
  word('thickness', '고리의 굵기', '시크니스', '고리를 이루는 관의 반지름이에요. 값을 키우면 고리가 두툼해져요.', 'ring(radius=0.5, thickness=0.1)', 'The radius of the tube that forms a ring.'),
  word('axis', '방향', '액시스', '도형이 어느 쪽을 향하는지 정해요. 원기둥·원뿔에서는 이 벡터의 길이가 도형의 길이이기도 해요.', 'cylinder(axis=vector(0, 2, 0))', 'The direction of an object. For cylinders and cones, its magnitude is also the length.'),
  word('angle', '각도', '앵글', '얼마나 돌릴지 정해요. 코드에서는 라디안을 써요. pi/2는 90도예요.', 'ball.rotate(angle=pi/2, axis=vector(0, 1, 0))', 'An angle in radians. pi/2 means 90 degrees.'),
  word('rotate', '회전하기', '로테이트', '도형을 돌려요. angle은 돌리는 양, axis는 회전축이에요.', 'ball.rotate(angle=0.1, axis=vector(0, 1, 0))', 'Rotate an object around an axis.'),
  word('compound', '하나로 합치기', '컴파운드', '여러 도형을 하나의 완제품으로 묶어요. 합친 뒤에는 완제품 전체를 움직여요.', 'friend = compound([body, eye])', 'Combine several shapes into one object.'),
  word('rate', '반복 속도', '레이트', '반복문의 속도를 조절하고 화면이 바뀔 시간을 줘요. rate(30)은 초당 최대 30번 반복하도록 해요.', 'while True:\n    rate(30)', 'Limit loop speed and give the screen time to update.'),
  word('visible', '보이기', '비저블', 'True면 보이고 False면 숨겨요. 숨겨도 변수와 도형은 남아 있어요.', 'ball.visible = False', 'True shows the object; False hides it.'),
  word('emissive', '스스로 밝게', '이미시브', '조명을 받지 않아도 밝게 보여요. 다른 도형을 비추는 광원이 되는 것은 아니에요.', 'sphere(emissive=True)', 'Looks bright without lighting; it does not illuminate other objects.'),
  // 재질·빛·소리 (시네마틱 예제에서 처음 만나는 낱말)
  word('texture', '표면 그림', '텍스처', '도형의 겉에 입히는 무늬나 사진이에요. 나무, 돌, 행성의 표면처럼 보이게 해 줘요.', 'sphere(texture=textures.earth)', 'A picture or pattern wrapped around a shape.'),
  word('textures', '재질 모음', '텍스처스', '미리 준비한 표면 그림 모음이에요. 뒤에 점을 찍으면 고를 수 있는 재질과 뜻이 나와요.', 'sphere(texture=textures.moon)', 'The built-in set of surfaces. Type a dot after it to choose one.'),
  word('local_light', '전구 조명', '로컬 라이트', '전구처럼 한 자리에서 사방으로 빛을 비춰요. 가까운 쪽은 밝고 먼 쪽은 어두워져서 낮과 밤이 생겨요.', 'local_light(pos=vector(0, 2, 0), color=color.white)', 'A light that shines in all directions from one place.'),
  word('intensity', '빛의 세기', '인텐시티', '조명이 얼마나 밝은지 정해요. 숫자가 클수록 멀리까지 밝게 비춰요.', 'lamp.intensity = 20', 'How bright a light is.'),
  word('shininess', '반짝임', '샤이니니스', '표면이 빛을 받아 반짝이는 정도예요. 0에 가까우면 매트하고 1에 가까우면 매끈해요.', 'sphere(shininess=0.2)', 'How glossy a surface looks, from 0 to 1.'),
  word('play_note', '음 연주하기', '플레이 노트', '음 이름과 길이를 정해 소리를 내요. type으로 악기 소리를 고를 수 있어요.', 'play_note("C4", 0.5, type="marimba")', 'Play a note by name. Choose an instrument with type.'),
  word('volume', '소리 크기', '볼륨', '소리가 얼마나 큰지 정해요. 0은 소리 없음, 1은 가장 큰 소리예요.', 'play_note("C4", 0.5, volume=0.5)', 'Loudness from 0 to 1.'),
  word('ambient', '바탕 빛', '앰비언트', '무대 전체에 고르게 깔리는 빛이에요. 어둡게 하면 조명이 닿지 않는 쪽이 밤처럼 보여요.', 'scene.ambient = color.gray(0.2)', 'Even base light for the whole scene.'),
  word('fov', '보는 넓이', '에프오브이 · field of view', '카메라가 한 번에 보는 각도예요. 작게 하면 망원경처럼 좁고 크게 보여요. 라디안으로 써요.', 'scene.fov = pi / 3', 'The camera’s field of view, in radians.'),
  word('camera', '카메라', '캐머러', '3D 무대를 바라보는 눈이에요. pos는 눈의 자리, axis는 바라보는 방향이에요.', 'scene.camera.pos = vector(0, 10, 20)', 'The viewpoint. pos is where it is; axis is where it looks.'),
  word('points', '점 모음', '포인츠', '많은 점을 한꺼번에 그려요. 밤하늘의 별이나 혜성의 먼지를 만들 때 써요.', 'points(pos=[vector(0, 0, 0), vector(1, 1, 0)], radius=3)', 'Draw many points at once.'),
  word('slider', '조절 막대', '슬라이더', '끌어서 숫자를 바꾸는 막대를 만들어요. 값은 .value로 읽어요.', 'speed = slider(min=0, max=3, value=1)', 'A slider for choosing a number. Read it with .value.'),
  word('menu', '고르기 메뉴', '메뉴', '여러 항목 가운데 하나를 고르는 메뉴를 만들어요. 고른 항목은 .selected로 읽어요.', 'view = menu(choices=["전체", "가까이"])', 'A menu for choosing one item. Read it with .selected.'),
  word('checkbox', '체크 상자', '체크박스', '눌러서 켜고 끄는 상자를 만들어요. 켜졌는지는 .checked로 읽어요.', 'echo = checkbox(text="울림")', 'A box you can tick. Read it with .checked.'),
  word('norm', '방향만 남기기', '놈', '화살표의 방향은 그대로 두고 길이를 1로 맞춰요. 방향만 필요할 때 써요.', 'away = norm(comet.pos)', 'A vector of length 1 in the same direction.'),
  word('mag', '벡터의 길이', '매그 · magnitude', '화살표의 길이, 곧 원점에서 그 위치까지의 거리를 구해요.', 'distance = mag(comet.pos)', 'The length of a vector.'),
];

export function vocabularyForCode(code = '') {
  // 주석·문자열에 우연히 등장한 단어는 안내 대상으로 고르지 않습니다.
  const source = String(code).slice(0, 100_000).replace(/"""[\s\S]*?(?:"""|$)|'''[\s\S]*?(?:'''|$)|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|#[^\n]*/g, match => ' '.repeat(match.length));
  return codeVocabulary.map(term => ({ term, index: source.search(new RegExp('\\b' + term.id + '\\b')) }))
    .filter(item => item.index >= 0).sort((a, b) => a.index - b.index).map(item => vocabularyWord(item.term.id, source.slice(0,item.index+item.term.id.length)));
}

export function vocabularyWord(id,prefix=''){
 const term=codeVocabulary.find(w=>w.id===id);if(!term)return undefined;
 if(['width','height'].includes(id)&&/\bscene[ \t]*\.[ \t]*(?:width|height)[ \t]*=?[ \t]*$/.test(prefix)){
  const horizontal=id==='width';return{...term,meaning:horizontal?'화면 가로 크기':'화면 세로 크기',explanation:horizontal?'3D 화면의 가로 길이예요. 단위는 픽셀이고, 도형의 두께와는 달라요.':'3D 화면의 세로 길이예요. 단위는 픽셀이고, 도형의 높이와는 달라요.',example:'scene.'+id+' = '+(horizontal?'800':'500')};
 }
 return term;
}
