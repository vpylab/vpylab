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
/** 공유 주소의 이름을 정할 수 있는지. 두 판의 저장소가 모두 지원합니다(규칙: server/shared/share-names.js). */
export const SHARE_NAMES = SHARE_BACKEND !== 'none';
