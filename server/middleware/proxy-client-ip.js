/**
 * Vercel 중계(api/srv.mjs)를 거친 요청의 실제 학생 IP.
 *
 * 학교 DNS가 *.railway.app을 막아 브라우저는 vpylab.vercel.app/srv/…로 요청하고, Vercel 함수가 이 서버로 전달합니다.
 * 그러면 req.ip는 Vercel의 IP가 되어 모든 학생이 한 IP로 보입니다. 함수가 보낸 x-vpylab-client-ip를
 * 비밀값(PROXY_SECRET)이 맞을 때만 믿습니다. 비밀값이 없거나 틀리면 머리를 무시하므로, 직접 요청이 IP를 속일 수 없습니다.
 */
import { timingSafeEqual } from 'node:crypto';
import { isIP } from 'node:net';

function sameSecret(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || !a || a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export function proxyClientIp({ secret = process.env.PROXY_SECRET } = {}) {
  return (req, res, next) => {
    const sent = req.get('x-vpylab-proxy-secret');
    if (secret && sent && sameSecret(sent, secret)) {
      const ip = String(req.get('x-vpylab-client-ip') || '').trim();
      if (isIP(ip)) req.vpylabClientIp = ip;
    }
    next();
  };
}

/** 요청 제한 키에 쓰는 IP: 믿을 수 있는 중계 IP가 있으면 그것, 아니면 Express의 req.ip */
export const clientIp = (req) => req.vpylabClientIp || req.ip || '';
