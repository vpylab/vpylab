# 공유·임베드·설치 안내

VPyLab은 설치 없이 브라우저에서 실행되고 링크 하나로 공유됩니다. 이 문서는 설치, 공유, 임베드와 관련된 기능과 그 코드가 있는 위치를 정리합니다. 처음 작성한 날은 2026-10-30이고, 2026-11-12에 하나의 버전(Cloudflare Pages, 서버 없음)에 맞게 고쳤습니다. 배포 설정은 [DEPLOY.md](DEPLOY.md)에 있습니다.

## 1. 앱으로 설치 (PWA)

- `client/public/manifest.webmanifest`가 앱 이름, 아이콘, 독립 창(`standalone`)을 정의합니다. 색은 `DESIGN.md`의 밝은 테마 값(표면 `#FFFFFF`, 배경 `#F8FAFC`)입니다.
- 아이콘은 `icon-192.png`·`icon-512.png`(일반)와 `icon-maskable-192.png`·`icon-maskable-512.png`(둥근 마스크용)입니다.
- 크롬·엣지: 브라우저가 `beforeinstallprompt`를 보내면 **더 보기** 메뉴에 **앱으로 설치** 버튼이 표시됩니다. 설치하거나 한 번 거절하면 숨깁니다(`client/src/lib/pwa-install.js`, `client/src/components/layout/InstallPrompt.jsx`).
- iOS Safari: 설치 프롬프트가 없으므로 "공유 → 홈 화면에 추가" 안내를 한 번만 보여 줍니다. 안드로이드의 앱 안 브라우저에서는 "크롬에서 열면 설치할 수 있습니다"를 한 번 보여 줍니다. 닫으면 `localStorage`(`vpylab-ios-install-hint-dismissed`)에 기억합니다.
- 서비스 워커가 매니페스트를 사전 캐시합니다(`client/scripts/service-worker-plugin.mjs`의 `PUBLIC_PRECACHE`).

## 2. 짧은 공유 주소

- 만들기 화면의 **도구 → 공유**는 짧은 주소 `/s/<이름>`을 만듭니다. 이름을 정하지 않으면 무작위 6자가 붙고, 이름을 정하면 그 이름이 주소가 됩니다(영어 소문자, 숫자, 하이픈 3~30자, 먼저 정한 사람이 사용).
- 주소는 Cloudflare Pages 함수(`functions/api/share/`)가 만들고 읽으며, 코드와 제목만 D1 데이터베이스에 저장합니다. 로그인은 필요 없고 주소에는 만료가 없습니다. 규칙과 한도는 [DEPLOY.md](DEPLOY.md)의 "짧은 공유 주소"에 있습니다.
- 만든 브라우저에는 수정 열쇠가 남아(`localStorage`), 같은 브라우저에서 같은 이름을 다시 정하면 그 주소의 코드를 지금 코드로 바꿉니다.
- 공유 저장소가 응답하지 않으면 코드를 주소에 담은 링크(`#code=`)로 대신합니다. 이 링크를 읽을 때는 압축을 푼 뒤 길이 상한(50,000자)을 확인합니다(`client/src/utils/share.js`).
- 공유 주소를 열면 실행 화면이 먼저 표시됩니다. 코드는 만들기 화면에서 볼 수 있습니다.

## 3. 공유 미리보기 카드 (Open Graph)

- 모든 주소는 `client/index.html`의 기본 og 메타로 같은 카드를 보여 줍니다. 그림은 `client/public/brand/og-default.png`(1200×630)입니다.
- 공유 주소마다 제목을 넣은 카드를 만들던 함수는 2026-11-12에 예전 구성과 함께 지웠습니다. 지금은 `/s/<이름>`을 메신저에 붙여도 기본 카드가 표시됩니다.

## 4. 임베드 (iframe)

- `/embed/:id`는 헤더, 편집기, 저장 없이 3D 화면, 제목, 실행·정지, 소리 켜기, **VPyLab에서 열기**만 두는 보기 전용 페이지입니다(`client/src/pages/Embed.jsx`). 열리면 자동 실행하며, 소리는 브라우저 정책 때문에 사용자가 **소리 켜기**를 누른 뒤에 납니다.
- `id`는 짧은 공유 주소의 이름입니다. 공유 주소만 임베드할 수 있습니다.
- 공유 창의 **임베드 코드 복사**가 아래 코드를 복사합니다. 주소의 앞부분은 지금 열려 있는 사이트의 출처입니다(`client/src/utils/embed.js`).

  ```html
  <iframe src="https://vpylab.pages.dev/embed/<id>" width="800" height="500" allow="autoplay; fullscreen" loading="lazy" title="VPyLab"></iframe>
  ```

- 서비스 워커는 `/embed/` 페이지 응답을 일반 앱 셸과 다른 키에 저장합니다(헤더가 다르기 때문입니다).
- 보안: `client/public/_headers`에서 `/embed/*`만 `Content-Security-Policy: … frame-ancestors *`이고 `X-Frame-Options`가 없습니다. 그 밖의 경로는 `frame-ancestors 'self'`와 `X-Frame-Options: DENY`를 유지합니다. `/embed/*`의 CSP에는 구글 로그인과 GitHub 주소가 없습니다.

## 5. 전체 화면

- 3D 화면 오른쪽 위의 **전체 화면** 버튼이 `requestFullscreen`으로 3D 화면을 키웁니다. 전체 화면 안에서는 아래에 실행·정지와 **전체 화면 나가기** 버튼이 표시되고, `Esc`로도 나갑니다(`client/src/hooks/useFullscreen.js`).
- iOS Safari처럼 API가 없거나 iframe이 `allow="fullscreen"` 없이 막은 경우에는 CSS 고정 배치로 화면을 채우고 `Esc`로 끕니다.
- 크기 변화는 `Viewport3D`의 `ResizeObserver`가 카메라 비율과 렌더러 크기를 갱신합니다.

## 6. QR 공유

- 공유 창에는 링크, **QR 보기**, **임베드 코드 복사**, 열기가 있습니다(`client/src/components/share/ShareLinkDialog.jsx`).
- QR은 `qrcode`(MIT) 라이브러리로 브라우저 안에서 만들며 외부 이미지 API를 사용하지 않습니다. 프로젝터에 표시하면 학생이 휴대폰 카메라로 바로 열 수 있고, **PNG 내려받기**로 인쇄용 파일을 받습니다(`client/src/components/share/QRCodeModal.jsx`).
