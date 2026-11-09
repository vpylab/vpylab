import { proxyClientIp } from './middleware/proxy-client-ip.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 4034;

// === 프록시 설정 (Railway/Render 등 리버스 프록시 뒤에서 req.ip 정확도 보장) ===
app.set('trust proxy', 1);
// Vercel 중계(/srv)를 거친 요청은 비밀값이 맞을 때만 실제 학생 IP를 씁니다(학교 DNS의 railway.app 차단 대응).
app.use(proxyClientIp());

// === 보안 미들웨어 (CRITICAL — 보안 감사 결과 반영) ===
app.use(helmet());
// ALLOWED_ORIGINS: 콤마 구분 목록. 공백/빈 항목 제거 후 비어 있으면 localhost로 폴백
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
app.use(cors({
  origin: allowedOrigins.length > 0 ? allowedOrigins : ['http://localhost:4033'],
}));
app.use(express.json({ limit: '1mb' }));

// === 요청 제한 1층: 같은 IP 전체 (인증 전) ===
// 학교 공유 IP에서 30명이 쓰는 상황을 기준으로 넉넉하게 두고, 사용자별 한도는 각 라우트가
// 인증 뒤에 적용합니다. 자세한 근거는 server/middleware/rate-limit.js 참고.
import { createIpLimiter } from './middleware/rate-limit.js';
app.use('/api', createIpLimiter());

// === 라우트 ===
// 새 배포 여부를 즉시 확인하기 위한 진단 정보:
//   - startedAt: 서버 프로세스가 시작된 시각. 새 배포되면 갱신됨
//   - commitSha: Railway가 자동으로 주입하는 git commit hash
//   - uptimeSeconds: 시작 후 지난 시간
const SERVER_STARTED_AT = new Date().toISOString();
const COMMIT_SHA =
  process.env.RAILWAY_GIT_COMMIT_SHA
  || process.env.GIT_COMMIT_SHA
  || process.env.SOURCE_COMMIT
  || null;

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '0.3.0',
    startedAt: SERVER_STARTED_AT,
    uptimeSeconds: Math.round(process.uptime()),
    commitSha: COMMIT_SHA ? COMMIT_SHA.slice(0, 12) : null,
  });
});

// GitHub Pages 발행 API
import publishRoutes from './routes/publish.js';
app.use('/api/publish', publishRoutes);

// 학생 제출 기록
// app.use('/api/submissions', require('./routes/submissions.js'));  // Step 7에서 활성화

// 코드 공유 (서버 경유 — 보안 감사 결과 반영)
import shareRoutes from './routes/share.js';
app.use('/api/share', shareRoutes);

// GitHub 동기화 (Phase 3 — 학생/팀 GitHub 레포에 매 저장 시점 commit)
import syncRoutes from './routes/sync.js';
app.use('/api/sync', syncRoutes);

// 프로젝트 = GitHub 레포 1:1 (Phase 4-A — 프로젝트 생성 + 자동 Pages + commit)
import projectsRoutes from './routes/projects.js';
app.use('/api/projects', projectsRoutes);

// === 404 핸들러 (모든 라우트 뒤) ===
app.use((req, res) => {
  res.status(404).json({ error: '요청한 경로를 찾을 수 없습니다.' });
});

// === 전역 에러 핸들러 ===
// 내부 에러 상세는 콘솔에만 남기고, 응답에는 일반 메시지만 노출 (err.message 노출 금지)
app.use((err, req, res, next) => {
  console.error('[VPyLab] 처리되지 않은 에러:', err);
  if (res.headersSent) return next(err);
  // body-parser 등 클라이언트 입력 문제(4xx)는 해당 상태 코드 유지
  const status = err.status || err.statusCode;
  if (status && status >= 400 && status < 500) {
    return res.status(status).json({ error: '요청 형식이 올바르지 않습니다.' });
  }
  res.status(500).json({ error: '서버 오류가 발생했습니다.' });
});

app.listen(PORT, () => {
  console.log(`[VPyLab] Express 서버 실행: http://localhost:${PORT}`);
});
