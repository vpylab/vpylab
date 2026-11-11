/**
 * GitHub 팀 프로젝트 애드온이 이 탭에 남긴 세션을 애드온을 불러오지 않고 확인합니다.
 * 만들기 화면이 첫 화면을 그릴 때(애드온 묶음을 받기 전) 사용합니다. 키는 githubSession.js의 GITHUB_SESSION_KEY와 같아야 하며,
 * tab-session.test.js가 두 값이 같은지 확인합니다.
 */
export const GITHUB_TAB_SESSION_KEY = 'vpylab:github:session';
/** 저장하지 않은 팀 프로젝트 편집 내용(새로 고침 대비). 탭 저장소에 두고 저장·연결 끊기에서 지웁니다. */
export const GITHUB_TAB_DRAFT_KEY = 'vpylab:github:draft';

function tabStorage(storage) {
  if (storage) return storage;
  try { return globalThis.sessionStorage; } catch { return null; }
}

/** 새로 고침 전에 이 탭에서 열어 둔 팀 프로젝트의 저장소 이름(owner/repo). 없으면 null */
export function storedGitHubProject(storage) {
  try {
    const saved = JSON.parse(tabStorage(storage)?.getItem(GITHUB_TAB_SESSION_KEY) || 'null');
    return typeof saved?.project?.fullName === 'string' && saved.project.fullName ? saved.project.fullName : null;
  } catch { return null; }
}

export function readProjectDraft(fullName, storage) {
  try {
    const saved = JSON.parse(tabStorage(storage)?.getItem(GITHUB_TAB_DRAFT_KEY) || 'null');
    return saved && saved.fullName === fullName && typeof saved.code === 'string' ? saved.code : null;
  } catch { return null; }
}

export function writeProjectDraft(fullName, code, storage) {
  try {
    tabStorage(storage)?.setItem(GITHUB_TAB_DRAFT_KEY, JSON.stringify({ fullName, code }));
    return true;
  } catch { return false; }
}

export function clearProjectDraft(storage) {
  try { tabStorage(storage)?.removeItem(GITHUB_TAB_DRAFT_KEY); } catch { /* 저장소를 쓸 수 없는 환경 */ }
}
