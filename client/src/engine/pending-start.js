/**
 * 엔진 준비를 기다리던 실행을 자동으로 시작해도 되는지 정합니다.
 *
 * 터치 기기에서는 소리를 켜려면 사용자의 탭이 필요해서, 탭 없이 자동 실행하려는 경우에는 먼저 탭을 받습니다.
 * 하지만 사용자가 이미 시작을 눌렀다면(그 탭에서 오디오 재개를 요청했으므로) 다시 묻지 않고 실행해야 합니다.
 * 그러지 않으면 엔진을 받는 동안 시작을 누른 사용자가 빈 화면에 남습니다.
 */
export function needsTapBeforeAutoStart({ touch, audioUnlocked, userStarted }) {
  return Boolean(touch) && !audioUnlocked && !userStarted;
}
