-- 오픈소스 판 짧은 공유 주소(/s/<이름>) 저장소. Cloudflare D1(vpylab-shares).
-- 개인정보는 담지 않습니다. 코드·제목과, 고칠 때 확인할 수정 열쇠의 해시만 둡니다.
CREATE TABLE IF NOT EXISTS shares (
  id TEXT PRIMARY KEY,              -- 주소에 쓰는 이름(정한 이름 또는 무작위 6자)
  code TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  named INTEGER NOT NULL DEFAULT 0, -- 1이면 사용자가 정한 이름
  edit_key_hash TEXT NOT NULL,      -- 수정 열쇠의 SHA-256(열쇠 자체는 만든 브라우저에만 있음)
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- 생성 속도 제한. 키는 (비밀 소금 + IP + 분)의 해시라 1분마다 바뀌고, 2분 지난 줄은 지웁니다.
CREATE TABLE IF NOT EXISTS share_rate (
  k TEXT PRIMARY KEY,
  n INTEGER NOT NULL,
  ts INTEGER NOT NULL
);
