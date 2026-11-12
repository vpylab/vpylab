// 없는 /api/ 주소: 화면(index.html)이 아니라 404를 돌려줍니다.
// 더 구체적인 함수(/api/share, /api/share/:id, /api/github/token)가 먼저 처리하고, 나머지만 여기로 옵니다.
export function onRequest() {
  return new Response(JSON.stringify({ error: 'not_found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
