import { isAllowedIndexUrl } from '../../../server/shared/gallery-rules.js';

/**
 * Express API 주소. 운영은 VITE_API_URL(Railway), 개발은 localhost:4034.
 * 교실 LAN 모드(VITE_LAN_MODE=1)는 같은 출처('')로 보내 LAN 서버가 안내 응답을 돌려줍니다.
 */
export const LAN_MODE = import.meta.env.VITE_LAN_MODE === '1';

/**
 * 판(edition). 같은 코드로 두 곳에 배포합니다.
 *   classroom(기본): 수업용 VPyLab Classroom. Supabase 로그인·갤러리·팀·GitHub 연동, Railway 서버 사용.
 *   open: 오픈소스 VPyLab. 운영 서버와 DB를 쓰지 않습니다(docs/GOOGLE_FIRST_PLAN.md).
 */
export const EDITION = import.meta.env.VITE_EDITION === 'open' ? 'open' : 'classroom';
export const OPEN_EDITION = EDITION === 'open';
/** 운영 서버·DB가 필요한 기능(로그인, 갤러리, 팀, 공유 링크 저장, 교사 대시보드)을 켤지 */
export const SERVER_FEATURES = !LAN_MODE && !OPEN_EDITION;
export const API_BASE = OPEN_EDITION ? '' : import.meta.env.VITE_API_URL || (LAN_MODE ? '' : 'http://localhost:4034');
/**
 * 짧은 공유 주소(/s/<이름>)를 저장하는 곳. 두 판 모두 POST /api/share로 만듭니다.
 *   server: 수업용 판. Railway Express가 Supabase에 저장하고, 읽기는 Supabase에서 바로 합니다.
 *   pages: 오픈소스 판. 같은 출처의 Cloudflare Pages 함수(functions/api/share)가 D1에 저장하고 읽습니다.
 *   none: 교실 LAN 모드. 저장소가 없어 코드를 주소(#code=)에 담습니다.
 */
export const SHARE_BACKEND = LAN_MODE ? 'none' : OPEN_EDITION ? 'pages' : 'server';
/**
 * 개인 코드를 학생 본인의 구글 드라이브에 저장하는 배포인지(구글 클라이언트 ID가 설정됨). 두 판 모두 해당합니다.
 * 이 배포에서는 로그인 없이 시작하고, 운영 계정 로그인은 팀 프로젝트·갤러리·교사 기능에서만 요청합니다.
 */
export const DRIVE_SAVE = Boolean((import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim());
/**
 * 오픈소스 판의 GitHub 팀 프로젝트 애드온(서버 없이 브라우저가 GitHub API를 직접 호출, client/src/github/).
 * GitHub OAuth 앱의 클라이언트 ID가 설정된 배포에서만 켜집니다. 없어도 실행·드라이브 저장은 그대로 동작합니다.
 */
export const GITHUB_ADDON = OPEN_EDITION && Boolean((import.meta.env.VITE_GITHUB_CLIENT_ID || '').trim());
/**
 * 오픈소스 판의 GitHub 연동 갤러리(서버·DB 없음, client/src/gallery/). 앱은 정적 목록 파일 하나만 읽습니다.
 * 목록 주소(VITE_GALLERY_INDEX_URL)가 설정된 배포에서만 켜집니다. 주소는 본 앱의 CSP가 허용하는
 * https://raw.githubusercontent.com/… 또는 같은 출처의 경로여야 하고, 아니면 꺼집니다.
 * 목록은 .github/workflows/gallery-index.yml이 만듭니다. 올리기는 위의 GitHub 애드온이 있을 때만 보입니다.
 */
const galleryIndexUrl = (import.meta.env.VITE_GALLERY_INDEX_URL || '').trim();
export const GALLERY_INDEX_URL = OPEN_EDITION && isAllowedIndexUrl(galleryIndexUrl) ? galleryIndexUrl : '';
export const GITHUB_GALLERY = Boolean(GALLERY_INDEX_URL);
/**
 * 오픈소스 판의 GitHub 연동 대장간(모두의 모듈, 서버·DB 없음, client/src/forge/github-registry.js).
 * 목록 주소(VITE_FORGE_INDEX_URL)가 설정된 배포에서만 켜집니다. 주소 규칙은 갤러리 목록과 같습니다.
 * 목록은 갤러리와 같은 워크플로가 만듭니다(forge.json). 공개 등록은 위의 GitHub 애드온이 있을 때만 보입니다.
 */
const forgeIndexUrl = (import.meta.env.VITE_FORGE_INDEX_URL || '').trim();
export const FORGE_INDEX_URL = OPEN_EDITION && isAllowedIndexUrl(forgeIndexUrl) ? forgeIndexUrl : '';
export const GITHUB_FORGE = Boolean(FORGE_INDEX_URL);
/**
 * 대장간의 모두의 모듈을 어디에 두는지.
 *   server: 수업용 판. Supabase의 갤러리 테이블(client/src/forge/registry.js)
 *   github: 오픈소스 판에서 목록 주소가 설정된 배포. 학생의 GitHub 저장소와 정적 목록
 *   none: 그 밖의 배포. 모두의 모듈과 공개 등록을 보이지 않습니다. 만들기·보관함·내려받기는 그대로 동작합니다.
 */
export const FORGE_REGISTRY = SERVER_FEATURES ? 'server' : GITHUB_FORGE ? 'github' : 'none';
/** 만들기 화면에 팀 프로젝트(GitHub)가 있는 배포인지. 수업용 판은 운영 서버 방식, 오픈소스 판은 위의 애드온입니다. */
export const TEAM_PROJECTS = SERVER_FEATURES || GITHUB_ADDON;
/** 공유 주소의 이름을 정할 수 있는지. 두 판의 저장소가 모두 지원합니다(규칙: server/shared/share-names.js). */
export const SHARE_NAMES = SHARE_BACKEND !== 'none';
