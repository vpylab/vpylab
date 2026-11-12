// POST /api/github/token: GitHub 로그인 code를 토큰으로 바꿉니다(오픈소스 판, Cloudflare Pages 함수).
// GitHub 팀 프로젝트 애드온만 사용합니다. 규칙은 cloudflare/github-oauth-core.js에 있습니다.
// 비밀값: GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET (없으면 503을 돌려주고 다른 기능에는 영향이 없습니다)
import { handleTokenRequest } from '../../../cloudflare/github-oauth-core.js';

export const onRequestPost = ({ request, env }) => handleTokenRequest(request, env);
