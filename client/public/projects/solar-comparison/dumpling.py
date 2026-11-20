from vpython import *

# 만두 친구 · VPyLab 대장간
def make_dumpling_fcf95ed1(pos=None, scale=1):
    if not isinstance(scale, (int, float)) or not 0 < scale < 1000:
        raise ValueError("scale은 0보다 큰 유한한 양수여야 합니다 (1000 미만)")
    origin = vector(0, 0, 0) if pos is None else vector(pos)
    # 슬라이더에서 바꾼 값입니다. size는 세 방향의 전체 길이입니다.
    body_width = 1.85
    body_height = 1.8
    body_depth = 1.1
    eye_size = 0.18
    eye_gap = 0.14
    cheek_size = 0.21
    arm_size = 0.5
    feet_size = 0.5
    body_color = vector(1, 0.775822, 0.48515)
    accent_color = vector(0.386429, 0.679542, 0.552011)
    parts = []
    body = ellipsoid(pos=origin + vector((0 * (body_width / 1.85)), (-0.12 * (body_height / 1.8)), (0 * (body_depth / 1.1))) * scale, shininess=0.28, size=vector((1.85 * (body_width / 1.85)), (1.36 * (body_height / 1.8)), (1.1 * (body_depth / 1.1))) * scale, color=body_color)
    parts.append(body)
    fold_0 = ellipsoid(pos=origin + vector((-0.42 * (body_width / 1.85)), (0.43 * (body_height / 1.8)), (0 * (body_depth / 1.1))) * scale, shininess=0.28, size=vector((0.18 * (body_width / 1.85)), (0.43 * (body_height / 1.8)), (0.66 * (body_depth / 1.1))) * scale, axis=vector((0.949235 * (0.18 * (body_width / 1.85))), (0.314567 * (0.18 * (body_width / 1.85))), 0) * scale, up=vector(-0.314567, 0.949235, 0), color=vector(body_color.x * 0.938685728457888, body_color.y * 0.8667490322925515, body_color.z * 0.7652019506201402))
    parts.append(fold_0)
    fold_1 = ellipsoid(pos=origin + vector((-0.21 * (body_width / 1.85)), (0.485 * (body_height / 1.8)), (0 * (body_depth / 1.1))) * scale, shininess=0.28, size=vector((0.18 * (body_width / 1.85)), (0.43 * (body_height / 1.8)), (0.66 * (body_depth / 1.1))) * scale, axis=vector((0.987227 * (0.18 * (body_width / 1.85))), (0.159318 * (0.18 * (body_width / 1.85))), 0) * scale, up=vector(-0.159318, 0.987227, 0), color=vector(body_color.x * 0.938685728457888, body_color.y * 0.8667490322925515, body_color.z * 0.7652019506201402))
    parts.append(fold_1)
    fold_2 = ellipsoid(pos=origin + vector((0 * (body_width / 1.85)), (0.54 * (body_height / 1.8)), (0 * (body_depth / 1.1))) * scale, shininess=0.28, size=vector((0.18 * (body_width / 1.85)), (0.43 * (body_height / 1.8)), (0.66 * (body_depth / 1.1))) * scale, color=vector(body_color.x * 0.938685728457888, body_color.y * 0.8667490322925515, body_color.z * 0.7652019506201402))
    parts.append(fold_2)
    fold_3 = ellipsoid(pos=origin + vector((0.21 * (body_width / 1.85)), (0.485 * (body_height / 1.8)), (0 * (body_depth / 1.1))) * scale, shininess=0.28, size=vector((0.18 * (body_width / 1.85)), (0.43 * (body_height / 1.8)), (0.66 * (body_depth / 1.1))) * scale, axis=vector((0.987227 * (0.18 * (body_width / 1.85))), (-0.159318 * (0.18 * (body_width / 1.85))), 0) * scale, up=vector(0.159318, 0.987227, 0), color=vector(body_color.x * 0.938685728457888, body_color.y * 0.8667490322925515, body_color.z * 0.7652019506201402))
    parts.append(fold_3)
    fold_4 = ellipsoid(pos=origin + vector((0.42 * (body_width / 1.85)), (0.43 * (body_height / 1.8)), (0 * (body_depth / 1.1))) * scale, shininess=0.28, size=vector((0.18 * (body_width / 1.85)), (0.43 * (body_height / 1.8)), (0.66 * (body_depth / 1.1))) * scale, axis=vector((0.949235 * (0.18 * (body_width / 1.85))), (-0.314567 * (0.18 * (body_width / 1.85))), 0) * scale, up=vector(0.314567, 0.949235, 0), color=vector(body_color.x * 0.938685728457888, body_color.y * 0.8667490322925515, body_color.z * 0.7652019506201402))
    parts.append(fold_4)
    left_foot = ellipsoid(pos=origin + vector((-0.39 * (body_width / 1.85)), (-0.83 * (body_height / 1.8)), (0.09 * (body_depth / 1.1))) * scale, shininess=0.28, size=vector((0.32 * (feet_size / 0.5)), (0.22 * (feet_size / 0.5)), (0.43 * (feet_size / 0.5))) * scale, color=accent_color)
    parts.append(left_foot)
    right_foot = ellipsoid(pos=origin + vector((0.39 * (body_width / 1.85)), (-0.83 * (body_height / 1.8)), (0.09 * (body_depth / 1.1))) * scale, shininess=0.28, size=vector((0.32 * (feet_size / 0.5)), (0.22 * (feet_size / 0.5)), (0.43 * (feet_size / 0.5))) * scale, color=accent_color)
    parts.append(right_foot)
    left_hand = ellipsoid(pos=origin + vector((-0.96 * (body_width / 1.85)), (-0.22 * (body_height / 1.8)), (0 * (body_depth / 1.1))) * scale, shininess=0.28, size=vector((0.22 * (arm_size / 0.5)), (0.48 * (arm_size / 0.5)), (0.24 * (arm_size / 0.5))) * scale, axis=vector((0.886995 * (0.22 * (arm_size / 0.5))), (-0.461779 * (0.22 * (arm_size / 0.5))), 0) * scale, up=vector(0.461779, 0.886995, 0), color=accent_color)
    parts.append(left_hand)
    right_hand = ellipsoid(pos=origin + vector((0.96 * (body_width / 1.85)), (0.25 * (body_height / 1.8)), (0 * (body_depth / 1.1))) * scale, shininess=0.28, size=vector((0.23 * (arm_size / 0.5)), (0.55 * (arm_size / 0.5)), (0.25 * (arm_size / 0.5))) * scale, axis=vector((0.877583 * (0.23 * (arm_size / 0.5))), (-0.479426 * (0.23 * (arm_size / 0.5))), 0) * scale, up=vector(0.479426, 0.877583, 0), color=accent_color)
    parts.append(right_hand)
    eye_minus1 = ellipsoid(pos=origin + vector(((-0.25 * (body_width / 1.85)) * (eye_gap / 0.14)), (0.12 * (body_height / 1.8)), (0.55 * sqrt(max(0.05, 1 - (((-0.25 * (body_width / 1.85)) * (eye_gap / 0.14)) / (body_width * 0.5))**2 - (((0.12 * (body_height / 1.8)) + 0.12 * (body_height / 1.8)) / (0.68 * (body_height / 1.8)))**2)) + 0.04733183748563924) * (body_depth / 1.1)) * scale, shininess=0.28, size=vector((0.105 * (eye_size / 0.18)), (0.145 * (eye_size / 0.18)), (0.045 * (eye_size / 0.18))) * scale, color=vector(0.022174, 0.033105, 0.05448))
    parts.append(eye_minus1)
    cheek_minus1 = ellipsoid(pos=origin + vector((-0.43 * (body_width / 1.85)), (-0.055 * (body_height / 1.8)), (0.55 * sqrt(max(0.05, 1 - ((-0.43 * (body_width / 1.85)) / (body_width * 0.5))**2 - (((-0.055 * (body_height / 1.8)) + 0.12 * (body_height / 1.8)) / (0.68 * (body_height / 1.8)))**2)) + 0.020886404990546614) * (body_depth / 1.1)) * scale, shininess=0.28, size=vector((0.21 * (cheek_size / 0.21)), (0.115 * (cheek_size / 0.21)), (0.035 * (cheek_size / 0.21))) * scale, color=vector(0.896269, 0.381326, 0.423268))
    parts.append(cheek_minus1)
    eye_1 = ellipsoid(pos=origin + vector(((0.25 * (body_width / 1.85)) * (eye_gap / 0.14)), (0.12 * (body_height / 1.8)), (0.55 * sqrt(max(0.05, 1 - (((0.25 * (body_width / 1.85)) * (eye_gap / 0.14)) / (body_width * 0.5))**2 - (((0.12 * (body_height / 1.8)) + 0.12 * (body_height / 1.8)) / (0.68 * (body_height / 1.8)))**2)) + 0.04733183748563924) * (body_depth / 1.1)) * scale, shininess=0.28, size=vector((0.105 * (eye_size / 0.18)), (0.145 * (eye_size / 0.18)), (0.045 * (eye_size / 0.18))) * scale, color=vector(0.022174, 0.033105, 0.05448))
    parts.append(eye_1)
    cheek_1 = ellipsoid(pos=origin + vector((0.43 * (body_width / 1.85)), (-0.055 * (body_height / 1.8)), (0.55 * sqrt(max(0.05, 1 - ((0.43 * (body_width / 1.85)) / (body_width * 0.5))**2 - (((-0.055 * (body_height / 1.8)) + 0.12 * (body_height / 1.8)) / (0.68 * (body_height / 1.8)))**2)) + 0.020886404990546614) * (body_depth / 1.1)) * scale, shininess=0.28, size=vector((0.21 * (cheek_size / 0.21)), (0.115 * (cheek_size / 0.21)), (0.035 * (cheek_size / 0.21))) * scale, color=vector(0.896269, 0.381326, 0.423268))
    parts.append(cheek_1)
    face_start = vector((-0.12 * (body_width / 1.85)), (-0.09 * (body_height / 1.8)), (0.56 * (body_depth / 1.1)))
    face_bottom = vector((0 * (body_width / 1.85)), (-0.17 * (body_height / 1.8)), (0.56 * (body_depth / 1.1)))
    previous = None
    for i in range(25):
        angle = i * pi / 24
        point = origin + vector(face_start.x*cos(angle), face_start.y+(face_bottom.y-face_start.y)*sin(angle), face_start.z) * scale
        parts.append(sphere(pos=point, radius=(0.012 * (body_width / 1.85)) * scale, shininess=0.28, color=vector(0.022174, 0.033105, 0.05448)))
        if previous is not None:
            parts.append(cylinder(pos=previous, axis=point-previous, radius=(0.012 * (body_width / 1.85)) * scale, shininess=0.28, color=vector(0.022174, 0.033105, 0.05448)))
        previous = point
    return compound(parts, origin=origin)

scene.range = 2.5
scene.center = vector(0, 0.15, 0)
scene.forward = vector(-0.13, -0.145, -1)
my_module = make_dumpling_fcf95ed1(pos=vector(0, 0, 0), scale=1)
# 다른 위치에 더 만들기: friend = make_dumpling_fcf95ed1(pos=vector(3,0,0), scale=0.7)
# 이동: my_module.pos.x += 1
# 숨기기: my_module.visible = False
