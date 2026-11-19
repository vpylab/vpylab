from vpython import *

# 공구상자 친구 · VPyLab 대장간
def make_toolbox_93965bd6(pos=None, scale=1):
    if not isinstance(scale, (int, float)) or not 0 < scale < 1000:
        raise ValueError("scale은 0보다 큰 유한한 양수여야 합니다 (1000 미만)")
    origin = vector(0, 0, 0) if pos is None else vector(pos)
    # 슬라이더에서 바꾼 값입니다. size는 세 방향의 전체 길이입니다.
    body_width = 1.8
    body_height = 1.8
    body_depth = 1.1
    eye_size = 0.18
    eye_gap = 0.14
    cheek_size = 0.21
    arm_size = 0.5
    feet_size = 0.5
    body_color = vector(0.913099, 0.287441, 0.223228)
    accent_color = vector(0.887923, 0.64448, 0.254152)
    parts = []
    handle = ring(pos=origin + vector((0 * (body_width / 1.8)), (0.83 * (body_height / 1.8)), (0 * (body_depth / 1.1))) * scale, shininess=0.28, axis=vector((0 * (body_width / 1.8)), (0 * (body_height / 1.8)), (1 * (body_depth / 1.1))) * scale, radius=(0.32 * (body_width / 1.8)) * scale, thickness=(0.085 * (body_width / 1.8)) * scale, color=vector(0.822786, 0.597202, 0.208637))
    parts.append(handle)
    body = box(pos=origin + vector((0 * (body_width / 1.8)), (-0.04 * (body_height / 1.8)), (0 * (body_depth / 1.1))) * scale, shininess=0.28, size=vector((1.55 * (body_width / 1.8)), (1.05 * (body_height / 1.8)), (0.85 * (body_depth / 1.1))) * scale, color=body_color)
    parts.append(body)
    left_edge = ellipsoid(pos=origin + vector((-0.76 * (body_width / 1.8)), (-0.04 * (body_height / 1.8)), (0 * (body_depth / 1.1))) * scale, shininess=0.28, size=vector((0.22 * (body_width / 1.8)), (1.05 * (body_height / 1.8)), (0.85 * (body_depth / 1.1))) * scale, color=body_color)
    parts.append(left_edge)
    right_edge = ellipsoid(pos=origin + vector((0.76 * (body_width / 1.8)), (-0.04 * (body_height / 1.8)), (0 * (body_depth / 1.1))) * scale, shininess=0.28, size=vector((0.22 * (body_width / 1.8)), (1.05 * (body_height / 1.8)), (0.85 * (body_depth / 1.1))) * scale, color=body_color)
    parts.append(right_edge)
    lid = box(pos=origin + vector((0 * (body_width / 1.8)), (0.47 * (body_height / 1.8)), (0 * (body_depth / 1.1))) * scale, shininess=0.28, size=vector((1.8 * (body_width / 1.8)), (0.26 * (body_height / 1.8)), (0.98 * (body_depth / 1.1))) * scale, color=vector(body_color.x * 1.0280222477759804, body_color.y * 1.239907825778537, body_color.z * 1.211755885169756))
    parts.append(lid)
    clasp = box(pos=origin + vector((0 * (body_width / 1.8)), (0.35 * (body_height / 1.8)), (0.53 * (body_depth / 1.1))) * scale, shininess=0.28, size=vector((0.32 * (body_width / 1.8)), (0.28 * (body_height / 1.8)), (0.12 * (body_depth / 1.1))) * scale, color=accent_color)
    parts.append(clasp)
    left_foot = ellipsoid(pos=origin + vector((-0.39 * (body_width / 1.8)), (-0.72 * (body_height / 1.8)), (0.09 * (body_depth / 1.1))) * scale, shininess=0.28, size=vector((0.32 * (feet_size / 0.5)), (0.22 * (feet_size / 0.5)), (0.43 * (feet_size / 0.5))) * scale, color=vector(0.386429, 0.679542, 0.552011))
    parts.append(left_foot)
    right_foot = ellipsoid(pos=origin + vector((0.39 * (body_width / 1.8)), (-0.72 * (body_height / 1.8)), (0.09 * (body_depth / 1.1))) * scale, shininess=0.28, size=vector((0.32 * (feet_size / 0.5)), (0.22 * (feet_size / 0.5)), (0.43 * (feet_size / 0.5))) * scale, color=vector(0.386429, 0.679542, 0.552011))
    parts.append(right_foot)
    left_hand = ellipsoid(pos=origin + vector((-0.96 * (body_width / 1.8)), (-0.22 * (body_height / 1.8)), (0 * (body_depth / 1.1))) * scale, shininess=0.28, size=vector((0.22 * (arm_size / 0.5)), (0.48 * (arm_size / 0.5)), (0.24 * (arm_size / 0.5))) * scale, axis=vector((0.886995 * (0.22 * (arm_size / 0.5))), (-0.461779 * (0.22 * (arm_size / 0.5))), 0) * scale, up=vector(0.461779, 0.886995, 0), color=vector(0.386429, 0.679542, 0.552011))
    parts.append(left_hand)
    right_hand = ellipsoid(pos=origin + vector((0.96 * (body_width / 1.8)), (0.25 * (body_height / 1.8)), (0 * (body_depth / 1.1))) * scale, shininess=0.28, size=vector((0.23 * (arm_size / 0.5)), (0.55 * (arm_size / 0.5)), (0.25 * (arm_size / 0.5))) * scale, axis=vector((0.877583 * (0.23 * (arm_size / 0.5))), (-0.479426 * (0.23 * (arm_size / 0.5))), 0) * scale, up=vector(0.479426, 0.877583, 0), color=vector(0.386429, 0.679542, 0.552011))
    parts.append(right_hand)
    eye_minus1 = ellipsoid(pos=origin + vector(((-0.25 * (body_width / 1.8)) * (eye_gap / 0.14)), (0.05 * (body_height / 1.8)), (0.44 * (body_depth / 1.1))) * scale, shininess=0.28, size=vector((0.105 * (eye_size / 0.18)), (0.145 * (eye_size / 0.18)), (0.045 * (eye_size / 0.18))) * scale, color=vector(0.022174, 0.033105, 0.05448))
    parts.append(eye_minus1)
    cheek_minus1 = ellipsoid(pos=origin + vector((-0.43 * (body_width / 1.8)), (-0.125 * (body_height / 1.8)), (0.405 * (body_depth / 1.1))) * scale, shininess=0.28, size=vector((0.21 * (cheek_size / 0.21)), (0.115 * (cheek_size / 0.21)), (0.035 * (cheek_size / 0.21))) * scale, color=vector(0.896269, 0.381326, 0.423268))
    parts.append(cheek_minus1)
    eye_1 = ellipsoid(pos=origin + vector(((0.25 * (body_width / 1.8)) * (eye_gap / 0.14)), (0.05 * (body_height / 1.8)), (0.44 * (body_depth / 1.1))) * scale, shininess=0.28, size=vector((0.105 * (eye_size / 0.18)), (0.145 * (eye_size / 0.18)), (0.045 * (eye_size / 0.18))) * scale, color=vector(0.022174, 0.033105, 0.05448))
    parts.append(eye_1)
    cheek_1 = ellipsoid(pos=origin + vector((0.43 * (body_width / 1.8)), (-0.125 * (body_height / 1.8)), (0.405 * (body_depth / 1.1))) * scale, shininess=0.28, size=vector((0.21 * (cheek_size / 0.21)), (0.115 * (cheek_size / 0.21)), (0.035 * (cheek_size / 0.21))) * scale, color=vector(0.896269, 0.381326, 0.423268))
    parts.append(cheek_1)
    face_start = vector((-0.12 * (body_width / 1.8)), (-0.16 * (body_height / 1.8)), (0.46 * (body_depth / 1.1)))
    face_bottom = vector((0 * (body_width / 1.8)), (-0.24 * (body_height / 1.8)), (0.46 * (body_depth / 1.1)))
    previous = None
    for i in range(25):
        angle = i * pi / 24
        point = origin + vector(face_start.x*cos(angle), face_start.y+(face_bottom.y-face_start.y)*sin(angle), face_start.z) * scale
        parts.append(sphere(pos=point, radius=(0.012 * (body_width / 1.8)) * scale, shininess=0.28, color=vector(0.022174, 0.033105, 0.05448)))
        if previous is not None:
            parts.append(cylinder(pos=previous, axis=point-previous, radius=(0.012 * (body_width / 1.8)) * scale, shininess=0.28, color=vector(0.022174, 0.033105, 0.05448)))
        previous = point
    object_3d = compound(parts)
    effects = []
    visible_parts = [object_3d] + effects
    object_offset = vector(object_3d.pos - origin)
    class Module:
        def __init__(self):
            self.object = object_3d
            self.parts = visible_parts
            self.active = True
        @property
        def pos(self):
            return vector(self.object.pos - object_offset)
        def move_to(self, new_pos):
            self.object.pos = vector(new_pos) + object_offset
        def dispose(self):
            if not self.active:
                return
            self.active = False
            for item in self.parts:
                item.visible = False
    return Module()

scene.range = 2.5
scene.center = vector(0, 0.15, 0)
scene.forward = vector(-0.13, -0.145, -1)
my_module = make_toolbox_93965bd6(pos=vector(0, 0, 0), scale=1)
# 다른 위치에 더 만들기: friend = make_toolbox_93965bd6(pos=vector(3,0,0), scale=0.7)
# 이동: my_module.move_to(vector(2,0,0))
# 제거: my_module.dispose()
