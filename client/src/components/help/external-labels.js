/**
 * 구글·GitHub·브라우저 화면에 적힌 글자. VPyLab이 정하는 글자가 아니며, 그 화면의 언어(브라우저·계정 설정)에 따라 달라집니다.
 * 그림에는 VPyLab 화면의 언어와 같은 표기를 적고, 다른 언어 표기는 그림 아래에 함께 알려 줍니다.
 * 표기가 바뀌면 이 파일만 고칩니다. 확인한 날짜와 확신하지 못하는 표기는 docs/reference/solar/step-guides-261112-solar.md에 적었습니다.
 */
export const EXTERNAL_LABELS = {
  // 구글 승인 창: 권한 줄에 들어 있는 말(줄 전체 문장은 적지 않습니다)과 진행 버튼
  googleDriveFiles: { ko: 'Google Drive 파일', en: 'Google Drive files' },
  googleContinue: { ko: '계속', en: 'Continue' },
  // 크롬의 팝업 차단 안내: 허용 항목에 들어 있는 말과 닫는 버튼
  popupAlwaysAllow: { ko: '항상 허용', en: 'Always allow' },
  popupDone: { ko: '완료', en: 'Done' },
  // GitHub 승인 창은 영어로만 표시됩니다.
  githubScope: { ko: 'Public repositories and repository invites', en: 'Public repositories and repository invites' },
  githubAuthorize: { ko: 'Authorize vpylab', en: 'Authorize vpylab' },
};

export function externalLabel(key, locale) {
  const label = EXTERNAL_LABELS[key];
  if (!label) return '';
  return locale === 'en' ? label.en : label.ko;
}

/** 같은 곳의 다른 언어 표기(한국어 화면이면 영어 표기, 영어 화면이면 한국어 표기). 두 표기가 같으면 빈 문자열. */
export function otherLabel(key, locale) {
  const label = EXTERNAL_LABELS[key];
  if (!label || label.ko === label.en) return '';
  return locale === 'en' ? label.ko : label.en;
}
