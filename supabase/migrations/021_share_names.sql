-- 수업용 판 짧은 공유 주소에 이름 정하기(/s/<이름>)를 더합니다. (2026-11-09)
-- 규칙은 server/shared/share-names.js. 오픈소스 판(Cloudflare D1)과 같은 동작입니다.

-- 1) 사용자가 정한 이름인지, 마지막으로 고친 시각
ALTER TABLE public.vpylab_shares ADD COLUMN IF NOT EXISTS named boolean NOT NULL DEFAULT false;
ALTER TABLE public.vpylab_shares ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- 2) 수정 열쇠의 해시. 공유 행은 누구나 읽을 수 있으므로(링크로 열기) 별도 표에 두고 서버(service_role)만 읽게 합니다.
CREATE TABLE IF NOT EXISTS public.vpylab_share_keys (
  share_id text PRIMARY KEY REFERENCES public.vpylab_shares(id) ON DELETE CASCADE,
  edit_key_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.vpylab_share_keys ENABLE ROW LEVEL SECURITY;
-- 정책을 만들지 않습니다: anon·authenticated는 읽기·쓰기 모두 막히고 service_role만 사용합니다.
REVOKE ALL ON public.vpylab_share_keys FROM anon, authenticated;

-- 3) 공개 키로 직접 넣는 경로를 닫습니다. 공유는 서버(service_role)를 거쳐 이름 검사·요청 제한을 받습니다.
--    004_shares_rls_fix.sql에서 지웠던 정책이 운영 DB에 남아 있었습니다(2026-11-09 확인).
DROP POLICY IF EXISTS "vpylab_shares_insert_all" ON public.vpylab_shares;
