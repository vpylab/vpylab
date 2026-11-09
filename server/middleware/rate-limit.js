/**
 * VPyLab — 요청 제한 공통 설정
 *
 * 교실에서는 학생 30명이 같은 공인 IP(학교 NAT)로 들어옵니다. 그래서 IP 하나에 분당 10회를
 * 걸면 정상 사용도 막힙니다(docs/READINESS_REVIEW_2026-10-28.md 2.9). 두 층으로 나눕니다.
 *
 *   1) IP 층(인증 전): 같은 IP에서 오는 전체 요청을 넉넉하게 막아 토큰 없는 대량 요청과
 *      Supabase 토큰 검증 비용을 억제합니다. 교실 기준: 학생 30명 × 분당 20회 = 600회.
 *   2) 사용자 층(인증 후): 로그인한 사용자 ID를 키로 삼아 사용자마다 한도를 둡니다.
 *      공유 IP의 다른 학생이 쓴 횟수가 내 한도를 깎지 않습니다. 쓰기(GitHub 커밋·발행처럼
 *      외부 서비스를 호출하거나 저장하는 요청)와 읽기(조회)를 분리해, 쓰기 한도는 사용자별로
 *      기존 값 수준을 유지합니다.
 *
 * 비로그인 요청(공유 링크 생성 등)은 IP 기준 한도를 그대로 씁니다.
 * 운영 중 조정이 필요하면 환경변수로 바꿀 수 있습니다(값은 분당 횟수).
 */
import { clientIp } from './proxy-client-ip.js';
import { rateLimit, ipKeyGenerator } from 'express-rate-limit';

const MINUTE = 60 * 1000;

function fromEnv(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isSafeInteger(value) && value > 0 ? value : fallback;
}

export const RATE_LIMITS = Object.freeze({
  /** IP 층: 교실 30명 × 분당 20회 */
  ipPerMinute: fromEnv('RATE_LIMIT_IP_PER_MINUTE', 600),
  /** 사용자 층 읽기: 접근 확인·학급 조회·대기 초대 조회 */
  userReadPerMinute: fromEnv('RATE_LIMIT_USER_READ_PER_MINUTE', 120),
  /** 사용자 층 쓰기: 저장 커밋·동기화·프로젝트 생성·초대 */
  userWritePerMinute: fromEnv('RATE_LIMIT_USER_WRITE_PER_MINUTE', 30),
  /** 사용자 층 발행: GitHub Pages 발행·포크·갱신 (기존 분당 3회 유지) */
  userPublishPerMinute: fromEnv('RATE_LIMIT_USER_PUBLISH_PER_MINUTE', 3),
  /** 비로그인 공유 링크 생성: IP 기준. 한 학급이 1분 안에 모두 공유해도 통과 */
  anonymousSharePerMinute: fromEnv('RATE_LIMIT_SHARE_PER_MINUTE', 60),
});

/** 로그인 사용자는 사용자 ID, 그 밖에는 IP(IPv6는 /56 묶음)로 키를 만듭니다. */
export function rateLimitKey(req) {
  const userId = req.supabaseUser?.id;
  if (userId) return `user:${userId}`;
  return `ip:${ipKeyGenerator(clientIp(req))}`;
}

function message(limit, scope) {
  return { error: `잠시 후 다시 시도해주세요. (${scope} 분당 ${limit}회)`, code: 'rate_limited' };
}

function build({ limit, scope, keyGenerator, windowMs = MINUTE, ...rest }) {
  return rateLimit({
    windowMs,
    limit,
    keyGenerator,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: message(limit, scope),
    ...rest,
  });
}

/**
 * IP 층. 라우터 맨 앞(인증 전)에 둡니다.
 * 같은 IP의 여러 사용자가 함께 쓰므로 한도가 크고, 사용자별 한도가 실제 남용을 막습니다.
 */
export function createIpLimiter(options = {}) {
  const limit = options.limit ?? RATE_LIMITS.ipPerMinute;
  return build({ limit, scope: '같은 네트워크', keyGenerator: (req) => `ip:${ipKeyGenerator(clientIp(req))}`, ...options, limit });
}

/** 사용자 층. requireSupabaseUser 뒤에 둬야 req.supabaseUser로 키를 만듭니다. */
export function createUserLimiter({ limit, scope = '사용자', ...options }) {
  return build({ limit, scope, keyGenerator: rateLimitKey, ...options });
}

export function createReadLimiter(options = {}) {
  return createUserLimiter({ limit: RATE_LIMITS.userReadPerMinute, scope: '조회', ...options });
}

export function createWriteLimiter(options = {}) {
  return createUserLimiter({ limit: RATE_LIMITS.userWritePerMinute, scope: '저장', ...options });
}

export function createPublishLimiter(options = {}) {
  return createUserLimiter({ limit: RATE_LIMITS.userPublishPerMinute, scope: '발행', ...options });
}

/** 비로그인 요청 전용(IP 기준). 공유 링크 생성처럼 토큰이 없는 경로에 씁니다. */
export function createAnonymousLimiter({ limit, scope = '같은 네트워크', ...options }) {
  return build({ limit, scope, keyGenerator: (req) => `ip:${ipKeyGenerator(clientIp(req))}`, ...options });
}
