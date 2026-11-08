// GET·PUT /api/share/:id — 공유 코드 읽기와, 만든 브라우저(수정 열쇠)로 고치기. 규칙은 cloudflare/share-core.js에 있습니다.
import { assertSameOrigin, bearerKey, getShare, handle, json, readJson, requireDb, updateShare } from '../../../cloudflare/share-core.js';

export const onRequestGet = ({ params, env }) => handle(async () => {
  const share = await getShare(requireDb(env), params.id);
  return json(200, share);
});

export const onRequestPut = ({ request, params, env }) => handle(async () => {
  assertSameOrigin(request);
  const db = requireDb(env);
  const body = await readJson(request);
  const updated = await updateShare(db, params.id, bearerKey(request), { code: body.code, title: body.title });
  return json(200, updated);
});
