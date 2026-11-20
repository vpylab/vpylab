export const DEFAULT_CODE = '';

// 이전 버전의 기본 예제를 수정한 초안은 학생 코드로 복원합니다.
export const LEGACY_BOUNCING_BALL = `from vpython import *

# 화면에 보이는 범위 (카메라는 한 곳에 고정됩니다)
scene.range = 6

# 구를 만들고 움직여보세요
ball = sphere(pos=vector(0, 0, 0), radius=0.5, color=color.cyan)
ball.velocity = vector(1, 0, 0)

dt = 0.01
while True:
    rate(100)
    ball.pos = ball.pos + ball.velocity * dt

    # 벽에 부딪히면 반사
    if abs(ball.pos.x) > 5:
        ball.velocity.x = -ball.velocity.x
`;

const legacyEnglish = LEGACY_BOUNCING_BALL.replace('# 화면에 보이는 범위 (카메라는 한 곳에 고정됩니다)', '# Visible range (the camera stays in one place)').replace('# 구를 만들고 움직여보세요', '# Create and move a sphere').replace('# 벽에 부딪히면 반사', '# Bounce at the walls');

export function isStarterCode(code) {
  return !code || code === LEGACY_BOUNCING_BALL || code === legacyEnglish;
}
