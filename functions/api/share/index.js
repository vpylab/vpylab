// POST /api/share — 짧은 공유 주소 만들기(오픈소스 판, Cloudflare Pages 함수). 규칙은 cloudflare/share-core.js에 있습니다.
import { assertSameOrigin, checkRate, createShare, handle, json, readJson, requireDb } from '../../../cloudflare/share-core.js';

export const onRequestPost = ({ request, env }) => handle(async () => {
  assertSameOrigin(request);
  const db = requireDb(env);
  const body = await readJson(request);
  await checkRate(db, request.headers.get('CF-Connecting-IP'), env.SHARE_SALT || 'vpylab-share');
  const created = await createShare(db, { code: body.code, title: body.title, name: body.name });
  return json(201, created);
});
