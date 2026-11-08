# 수업용 판(VPyLab Classroom) 직접 배포하기

> 이 문서는 2026-11-08까지 README에 있던 수업용 판 배포 안내를 옮긴 것입니다. 지금 운영 중인 수업용 판은 백엔드를 Railway에 두고, 빌드 설정은 저장소 루트의 `vercel.json`을 따릅니다. 현재 설정은 [DEPLOY_TWO_EDITIONS.md](DEPLOY_TWO_EDITIONS.md)에서 확인할 수 있습니다. 아래의 Render 절차는 학교가 직접 배포할 때 사용할 수 있는 방법 가운데 하나입니다.

> **새 교실 로컬 검토 (`codex/classroom-v2`)**: `npm run dev:classroom`으로 별도 포트에서 실행합니다. [직접 테스트하는 방법](CLASSROOM_V2_LOCAL_TEST.md) · [새 시스템 설계와 승인 후 교체 기준](CLASSROOM_V2_ARCHITECTURE.md). 기존 운영 진입점과 수업 자료는 유지합니다.

학생·교사용 안내는 [GUIDE.ko.md](GUIDE.ko.md)(공개판)와 [USER_GUIDE_KO.md](USER_GUIDE_KO.md)(수업용 판)에 있습니다.

---

## 이 문서는 누구를 위한 건가요?

**프로그래밍을 잘 모르는 선생님**도 VPyLab을 직접 배포해서 수업에 사용할 수 있도록 안내합니다.  
모든 단계를 **스크린샷 없이도 따라할 수 있게** 최대한 쉽게 설명했습니다.

AI에게 배포를 맡기고 싶다면 이 README 전체를 보여주고, Supabase/Render/Vercel 계정 정보는 직접 확인하면서 진행하세요.

---

## 목차

1. [전체 구조 이해하기](#1-전체-구조-이해하기)
2. [사전 준비](#2-사전-준비)
3. [Step 1: Supabase 데이터베이스 만들기](#step-1-supabase-데이터베이스-만들기)
4. [Step 2: 백엔드 서버 배포하기 (Render)](#step-2-백엔드-서버-배포하기-render)
5. [Step 3: 프론트엔드 배포하기 (Vercel)](#step-3-프론트엔드-배포하기-vercel)
6. [Step 4: 동작 확인하기](#step-4-동작-확인하기)
7. [문제가 생겼을 때](#문제가-생겼을-때)
8. [업데이트하기](#업데이트하기)

---

## 1. 전체 구조 이해하기

VPyLab은 세 부분으로 나뉩니다:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  프론트엔드  │────▶│   백엔드    │────▶│ 데이터베이스 │
│  (화면)     │     │  (서버)     │     │  (저장소)    │
│  Vercel     │     │  Render     │     │  Supabase   │
│  무료       │     │  무료       │     │  무료        │
└─────────────┘     └─────────────┘     └─────────────┘
```

| 구성 요소 | 하는 일 | 배포할 곳 | 비용 |
|-----------|---------|-----------|------|
| 프론트엔드 | 학생이 보는 화면 (에디터, 3D 뷰어) | Vercel | 무료 |
| 백엔드 | 코드 공유, 작품 발행 | Render | 무료 |
| 데이터베이스 | 학급, 학생, 코드 저장 | Supabase | 무료 |

**무료 한도 참고:**
- Vercel: 월 100GB 트래픽 (학교 한 곳이면 충분)
- Render: 무료 인스턴스는 15분 미사용 시 절전 (첫 요청에 30초 대기)
- Supabase: 500MB 저장, 월 5만 API 호출

---

## 2. 사전 준비

아래 계정을 **무료로** 만들어주세요. 이메일 하나로 모두 가입 가능합니다.

| 서비스 | 가입 주소 | 필요한 이유 |
|--------|-----------|-------------|
| GitHub | https://github.com/signup | 코드 저장소 + 로그인 |
| Supabase | https://supabase.com | 데이터베이스 |
| Render | https://render.com | 백엔드 서버 |
| Vercel | https://vercel.com | 프론트엔드 화면 |

> **팁:** GitHub 계정이 있으면 나머지 서비스도 "Sign in with GitHub" 버튼으로 바로 가입됩니다.

### 내 컴퓨터에 GitHub 리포지토리 준비하기

1. https://github.com/vpylab/vpylab 에 접속합니다
2. 우측 상단 **Fork** 버튼을 클릭합니다
3. "Create fork" 버튼을 클릭합니다
4. 이제 `https://github.com/내아이디/vpylab` 형태의 내 저장소가 생겼습니다

---

## Step 1: Supabase 데이터베이스 만들기

### 1-1. 프로젝트 생성

1. https://supabase.com/dashboard 에 접속합니다
2. **New Project** 클릭
3. 아래와 같이 입력합니다:
   - **Name:** `vpylab` (아무 이름이나 괜찮습니다)
   - **Database Password:** 안전한 비밀번호 입력 (메모해두세요)
   - **Region:** `Northeast Asia (Seoul)` 선택
4. **Create new project** 클릭
5. 1~2분 기다리면 프로젝트가 만들어집니다

### 1-2. 테이블 만들기

운영 프로젝트는 기존처럼 마이그레이션 스크립트로 적용합니다. Supabase Personal Access Token(PAT)을 준비한 뒤 실행하세요.

```bash
export SUPABASE_ACCESS_TOKEN=sbp_xxxxxxxxxxxxxxxxx
node scripts/apply-migrations.mjs
```

특정 파일만 적용해야 할 때는 파일명을 넘깁니다.

```bash
node scripts/apply-migrations.mjs 014_gallery_project_links.sql
```

PAT이 없으면 스크립트가 SQL Editor URL과 실행할 SQL을 출력합니다. 이 경우 아래 파일들을 **순서대로** SQL Editor에서 실행하세요.

```
supabase/migrations/001_vpylab_schema.sql
supabase/migrations/002_gallery.sql
supabase/migrations/003_shares.sql
supabase/migrations/004_shares_rls_fix.sql
supabase/migrations/005_gallery_search_index.sql
supabase/migrations/006_gallery_collaboration.sql
supabase/migrations/007_admin_features.sql
supabase/migrations/008_code_shares.sql
supabase/migrations/009_code_revisions.sql
supabase/migrations/010_team_projects.sql
supabase/migrations/011_github_sync.sql
supabase/migrations/012_fix_rls_recursion.sql
supabase/migrations/014_gallery_project_links.sql
```

> **주의 1:** 반드시 001 → 002 → ... → 012 → 014 순서대로 실행해야 합니다.
> 각 파일을 실행할 때마다 "Success" 메시지가 나오면 다음 파일로 넘어가세요.
>
> **주의 2:** `013_reset_for_project_centric.sql` 은 **개발/테스트용 데이터 리셋 스크립트**입니다. 신규 설치 시에는 실행하지 마세요. 기존 데이터를 모두 지우고 프로젝트 중심 모델로 초기화할 때만 사용합니다.
>
> **마이그레이션 009~012가 없으면** 프로젝트(팀 협업), 코드 이력(revision), GitHub 동기화 기능이 동작하지 않습니다.
> **마이그레이션 014가 없으면** 갤러리 작품이 어느 VPyLab 프로젝트에서 발행되었는지 추적할 수 없습니다.

### 1-3. API 키 메모하기

1. 왼쪽 메뉴에서 **Settings** → **API** 클릭
2. 아래 3가지를 메모장에 복사해 둡니다:

| 이름 | 어디에 있나요 | 용도 |
|------|---------------|------|
| **Project URL** | 상단에 `https://xxxx.supabase.co` 형태 | 프론트 + 백엔드 모두 사용 |
| **anon public** | `Project API keys` 섹션 | 프론트엔드에서 사용 (공개 가능) |
| **service_role** | `Project API keys` 섹션 (눈 아이콘 클릭) | 백엔드에서만 사용 (**절대 공개 금지**) |

---

## Step 2: 백엔드 서버 배포하기 (Render)

### 2-1. Render에서 서비스 만들기

1. https://dashboard.render.com 에 접속합니다
2. **New** → **Web Service** 클릭
3. **Build and deploy from a Git repository** 선택 → **Next**
4. GitHub 연동이 안 되어 있으면 **Connect GitHub** 클릭하여 연결
5. 내 `vpylab` 리포지토리를 찾아 **Connect** 클릭

### 2-2. 서비스 설정

| 설정 항목 | 입력할 값 |
|-----------|-----------|
| **Name** | `vpylab-server` |
| **Region** | `Singapore` (한국에서 가까움) |
| **Branch** | `main` |
| **Root Directory** | `server` |
| **Runtime** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `node index.js` |
| **Instance Type** | `Free` 선택 |

### 2-3. 환경변수 설정

아래쪽 **Environment Variables** 섹션에서 **Add Environment Variable**을 클릭하여 하나씩 추가합니다:

| Key | Value |
|-----|-------|
| `PORT` | `10000` |
| `ALLOWED_ORIGINS` | (Step 3 완료 후 Vercel 주소 입력. 일단 `https://vpylab.vercel.app` 으로 넣어두세요) |
| `SUPABASE_URL` | Step 1에서 메모한 **Project URL** |
| `SUPABASE_SERVICE_ROLE_KEY` | Step 1에서 메모한 **service_role** 키 |
| `NODE_ENV` | `production` |

> AI 힌트 기능은 현재 버전에서 제외되어 있으므로 `UPSTAGE_API_KEY`는 필요하지 않습니다.

### 2-4. 배포 시작

**Create Web Service** 버튼을 클릭합니다.

5~10분 후 배포가 완료되면 상단에 URL이 표시됩니다:  
`https://vpylab-server-xxxx.onrender.com`

이 URL을 메모해 두세요. 프론트엔드에서 사용합니다.

### 2-5. 동작 확인

브라우저에서 아래 주소를 열어보세요:  
`https://vpylab-server-xxxx.onrender.com/api/health`

아래와 같은 응답이 나오면 성공입니다:
```json
{"status":"ok","timestamp":"2026-...","version":"0.1.0"}
```

---

## Step 3: 프론트엔드 배포하기 (Vercel)

### 3-1. Vercel에서 프로젝트 만들기

1. https://vercel.com/dashboard 에 접속합니다
2. **Add New...** → **Project** 클릭
3. **Import Git Repository**에서 `vpylab` 리포지토리를 찾아 **Import** 클릭

### 3-2. 빌드 설정

| 설정 항목 | 입력할 값 |
|-----------|-----------|
| **Framework Preset** | `Vite` |
| **Root Directory** | `client` (Edit 클릭하여 변경) |
| **Build Command** | `npm install && npx vite build` |
| **Output Directory** | `dist` |

### 3-3. 환경변수 설정

**Environment Variables** 섹션에서 아래를 추가합니다:

| Key | Value |
|-----|-------|
| `VITE_SUPABASE_URL` | Step 1에서 메모한 **Project URL** |
| `VITE_SUPABASE_ANON_KEY` | Step 1에서 메모한 **anon public** 키 |
| `VITE_API_URL` | Step 2에서 받은 Render URL (예: `https://vpylab-server-xxxx.onrender.com`) |

### 3-4. 배포

**Deploy** 버튼을 클릭합니다. 2~3분 후 배포가 완료됩니다.

완료되면 URL이 표시됩니다: `https://vpylab-xxxx.vercel.app`

### 3-5. Render 환경변수 업데이트

이제 실제 Vercel URL을 알았으니, Render로 돌아가서 수정합니다:

1. Render 대시보드 → `vpylab-server` → **Environment** 탭
2. `ALLOWED_ORIGINS` 값을 실제 Vercel URL로 변경
3. **Save Changes** → 자동으로 재배포됩니다

> **커스텀 도메인을 사용한다면:**  
> `ALLOWED_ORIGINS`에 쉼표로 구분하여 추가합니다:  
> `https://vpylab-xxxx.vercel.app,https://myschool.com`

---

## Step 4: 동작 확인하기

1. Vercel에서 받은 URL을 브라우저에서 엽니다
2. 에디터가 보이면 아래 코드를 입력하고 **실행** 버튼을 누릅니다:

```python
from vpython import *

scene.background = 색상['검정']
sphere(color=색상['빨강'], emissive=True)
label(pos=vector(0, 1.2, 0), text="안녕!", color=색상['하양'], height=20)
음표("도4", 0.3)
음표("미4", 0.3)
음표("솔4", 0.5)
```

3. 3D 화면에 빛나는 빨간 구와 라벨이 나타나고 도-미-솔 소리가 나면 **성공**입니다!

> **API 레퍼런스**: 객체·메서드·VPython 대비 차이는 [VPYTHON_API.md](VPYTHON_API.md)를 참고하세요.

### 추가 확인 (선택)

- [ ] 코드 저장 → 불러오기가 되는지 확인
- [ ] 코드 공유 버튼 → 공유 링크 생성 확인
- [ ] 갤러리 페이지가 로드되는지 확인

---

## 문제가 생겼을 때

### "사이트가 로딩되지 않아요"

- Vercel 대시보드에서 빌드 로그를 확인합니다
- 환경변수 `VITE_SUPABASE_URL`과 `VITE_SUPABASE_ANON_KEY`가 정확한지 확인합니다

### "로그인/회원가입이 안 돼요"

- Supabase 대시보드 → **Authentication** → **URL Configuration**
- **Site URL**을 Vercel 배포 URL로 설정합니다
- **Redirect URLs**에도 같은 URL을 추가합니다

### "코드 공유가 안 돼요"

- Render 대시보드에서 서버 로그를 확인합니다
- `SUPABASE_URL`과 `SUPABASE_SERVICE_ROLE_KEY`가 정확한지 확인합니다

### "Render 서버가 느려요"

- 무료 인스턴스는 15분 미사용 시 절전 모드에 들어갑니다
- 첫 요청 시 30초 정도 대기가 발생합니다 (이후는 빠릅니다)
- 수업 시작 전에 미리 사이트를 한 번 열어두면 좋습니다

### "SQL 실행 시 에러가 나요"

- 마이그레이션 파일을 순서대로 실행했는지 확인합니다
- 이미 실행한 파일을 다시 실행하면 "already exists" 에러가 나올 수 있습니다 — 이건 정상입니다

---

## 업데이트하기

원본 프로젝트에 업데이트가 있을 때:

1. 내 GitHub 리포지토리에서 **Sync fork** → **Update branch** 클릭
2. Vercel과 Render가 자동으로 재배포합니다

---
