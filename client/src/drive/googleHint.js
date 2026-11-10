/**
 * 수업용 판에 구글로 로그인한 학생의 구글 이메일. 드라이브 승인 창에 넘겨 계정 선택 단계를 건너뜁니다.
 * GitHub로만 로그인했거나 로그인하지 않았으면 빈 문자열입니다(승인 창에서 계정을 직접 고릅니다).
 * @param {object|null} user Supabase 사용자
 * @returns {string}
 */
export function googleEmailOf(user) {
  if (!user) return '';
  const identity = (user.identities || []).find((item) => item?.provider === 'google');
  const fromIdentity = identity?.identity_data?.email;
  if (typeof fromIdentity === 'string' && fromIdentity.includes('@')) return fromIdentity;
  const onlyGoogle = user.app_metadata?.provider === 'google';
  return onlyGoogle && typeof user.email === 'string' && user.email.includes('@') ? user.email : '';
}
