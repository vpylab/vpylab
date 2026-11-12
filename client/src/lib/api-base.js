import { isAllowedIndexUrl } from '../../../shared/gallery-rules.js';

/**
 * 배포마다 달라지는 설정. VPyLab은 운영 서버와 DB 없이 동작합니다.
 * 아래 값이 모두 비어 있어도 실행·예제·공유 링크·파일 저장은 그대로 동작합니다.
 */

/** 개인 코드를 학생 본인의 구글 드라이브에 저장하는 배포인지(구글 클라이언트 ID가 설정됨). */
export const DRIVE_SAVE = Boolean((import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim());
/**
 * GitHub 팀 프로젝트 애드온(브라우저가 GitHub API를 직접 호출, client/src/github/).
 * GitHub OAuth 앱의 클라이언트 ID가 설정된 배포에서만 켜집니다. 없어도 실행·드라이브 저장은 그대로 동작합니다.
 */
export const GITHUB_ADDON = Boolean((import.meta.env.VITE_GITHUB_CLIENT_ID || '').trim());
/**
 * GitHub 연동 갤러리(client/src/gallery/). 앱은 정적 목록 파일 하나만 읽습니다.
 * 목록 주소(VITE_GALLERY_INDEX_URL)가 설정된 배포에서만 켜집니다. 주소는 본 앱의 CSP가 허용하는
 * https://raw.githubusercontent.com/… 또는 같은 출처의 경로여야 하고, 아니면 꺼집니다.
 * 목록은 .github/workflows/gallery-index.yml이 만듭니다. 올리기는 위의 GitHub 애드온이 있을 때만 보입니다.
 */
const galleryIndexUrl = (import.meta.env.VITE_GALLERY_INDEX_URL || '').trim();
export const GALLERY_INDEX_URL = isAllowedIndexUrl(galleryIndexUrl) ? galleryIndexUrl : '';
export const GITHUB_GALLERY = Boolean(GALLERY_INDEX_URL);
/**
 * GitHub 연동 대장간(모두의 모듈, client/src/forge/github-registry.js).
 * 목록 주소(VITE_FORGE_INDEX_URL)가 설정된 배포에서만 켜집니다. 주소 규칙은 갤러리 목록과 같습니다.
 * 목록은 갤러리와 같은 워크플로가 만듭니다(forge.json). 공개 등록은 위의 GitHub 애드온이 있을 때만 보입니다.
 */
const forgeIndexUrl = (import.meta.env.VITE_FORGE_INDEX_URL || '').trim();
export const FORGE_INDEX_URL = isAllowedIndexUrl(forgeIndexUrl) ? forgeIndexUrl : '';
export const GITHUB_FORGE = Boolean(FORGE_INDEX_URL);
/**
 * 대장간의 모두의 모듈을 어디에 두는지.
 *   github: 목록 주소가 설정된 배포. 학생의 GitHub 저장소와 정적 목록
 *   none: 그 밖의 배포. 모두의 모듈과 공개 등록을 보이지 않습니다. 만들기·보관함·내려받기는 그대로 동작합니다.
 */
export const FORGE_REGISTRY = GITHUB_FORGE ? 'github' : 'none';
/** 만들기 화면에 팀 프로젝트(GitHub)가 있는 배포인지. 위의 GitHub 애드온과 같습니다. */
export const TEAM_PROJECTS = GITHUB_ADDON;
