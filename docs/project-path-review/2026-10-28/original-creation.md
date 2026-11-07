# 1팀 경로 검토 — 순수 창작

후속 안정화(2026-10-28): 아래는 최초 검토 당시 기록입니다. GitHub 전송의 선택 checkpoint 검사는 이후 필수화되었고, ID 누락 409 거부 및 기존 대기 작업 차단이 검증됐습니다. 동료 검토 필수 정책은 여전히 별도 과제입니다. 최신 결과는 [안정화 보고서](/Users/greatsong/greatsong-project/10_수업자료/vpylab/docs/CLASSROOM_V2_THREE_WAY_REVIEW_2026-10-28.md)를 참조하세요.
검토일: 2026-10-28 · 기준 브랜치: `codex/classroom-v2` · 대상: 초심자 2명이 만드는 「세 음과 세 도형으로 알림 만들기」.

이 문서는 현재 제품 소스와 합성 수업 시나리오를 대조한 교육·협업 UX 검토입니다. 실제 학생의 수행 실험, 새 GitHub 계정 2개의 동료 승인, 실제 청감 시험의 결과가 아닙니다. 원본 수업 자료와 제품 코드는 수정하지 않았습니다. 별도의 통합 리허설 결과는 총괄 보고서에서 구분합니다.

**판단: 교사가 짧은 기술 골격과 협업 규칙을 제공하면 입문 창작에 사용할 수 있지만, 학생 2명이 제품 안내만으로 문제 설정부터 근거 있는 동료 보완까지 완주하도록 설계되었다고 보기는 어렵습니다.** 개인 초안·변경 비교·자기 승인 방지·버전 충돌 검사는 적절합니다. 반면 도움 수준, 교육 역할, 실행 근거, 보완 요청과 새 제안의 관계는 수업 운영에 의존합니다. 직접 팀 저장과 교사 반영은 동료 검토를 거치지 않을 수 있습니다.

## 수업의 목표와 난이도 경계

해결할 문제는 “다른 팀에게 작업 종료를 알려주는, 듣거나 보아서 구별할 수 있는 짧은 알림”으로 설정합니다. 학생이 음의 순서·간격·색을 선택하고, 동료가 의도를 알아차리는지 비교하도록 합니다. 음색 취향에 단일 정답을 두지 않습니다.

학생 필수 작성 범위는 변수 값, 순차 실행, 같은 형태의 한 줄 호출 정도입니다. `for`는 반복 알림을 원하는 학생의 선택 심화로만 둡니다. 이벤트 콜백·클래스·중첩 반복·`zip`·물리 모형·삼각함수를 완료 조건으로 추가하지 않습니다. `sphere`, `box`, `cone`, `vec`, `play_note`, `sleep`의 호출 틀은 교사가 제공하고, 이번 차시에서 객체 API 전체 구현·암기를 요구하지 않습니다.

순수 창작은 작품의 문제·의도·음과 도형의 구성·검증 방법을 학생이 정한다는 뜻으로 사용합니다. VPyLab의 기본 실행 골격을 제공한 사실은 표시합니다. 기존 작품의 완성 코드를 선택해 색만 바꾸는 경로와 구분하며, 학생이 아무런 도움 없이 전체 코드를 발명했다고 기록하지 않습니다.

팀 성공 기준 예시는 다음과 같습니다.

- 도형 3개와 짧은 음 3개를 정해진 순서로 표현한다.
- `gap` 값만 다르게 한 두 조건을 비교하고, 소리가 겹치는지 또는 또렷이 구분되는지 설명한다.
- 동료가 알림 의도를 알아차렸는지 확인하고, 한 가지 보완 의견에 채택·거절 이유를 남긴다.
- 소리를 듣기 어려운 상황에는 도형·음 이름·순서·길이 표로 같은 구조를 설명한다.
- 각자가 한 번씩 제작 담당과 검토 담당을 맡는다. 입력 횟수로 이해 수준을 판단하지 않는다.

## 단계별 경로 판정

표의 ‘구현됨’은 해당 기능·서버 경계가 있다는 뜻이며 교육 효과의 검증을 뜻하지 않습니다. ‘수업 지원 필요’는 현재 기능 위에 교사의 과제 카드·질문·운영 약속이 필요한 단계입니다. ‘미지원’은 해당 구조나 조작이 현재 제품 흐름에서 확인되지 않았다는 뜻입니다.

| 단계 | 판정 | 학생의 구체적 행동과 남길 근거 | 현재 구현과 필요한 지원 |
|---|---|---|---|
| 1. 순수 창작 시작 | 수업 지원 필요 | 학생 가가 새 프로젝트를 만들고 AI 미사용을 선택. “어떤 알림을 누구에게 줄 것인가”를 한 문장으로 정함 | 새 프로젝트는 실행 가능한 구 1개의 `DEFAULT_CODE`로 시작함. 생성 대화상자에 빈 코드/기술 골격 선택란은 없음. ‘구는 플랫폼 제공 예시, 작품 구성은 직접 설계’라고 안내하고 편집 범위를 표시해야 함. [기본 코드](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/classroom/ClassroomApp.jsx:9), [생성 양식](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/classroom/ClassroomApp.jsx:164) |
| 2. 문제·성공 기준 합의 | 수업 지원 필요 | 두 학생이 목적과 관찰 기준을 말로 합의하고 리더가 입력. “예쁘다”만 쓰지 않고 순서·간격·구별 여부를 포함 | 문제와 성공 기준 저장은 구현됨. 둘 다 필수값이 아니며 학생 편집자는 읽기 전용이어서 공동 합의는 대화나 질문 기록으로 보충. [생성 입력 검증](/Users/greatsong/greatsong-project/10_수업자료/vpylab/server/classroom/app.js:113), [수정 권한](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/classroom/Workspace.jsx:172) |
| 3. 참여·교육 역할 분담 | 수업 지원 필요 | 가: 도형·시간 조건 설계, 나: 알림을 보고 듣는 검사. 두 번째 제안에서 역할 교환. 이 약속을 첫 질문 본문에 기록 | 초대 코드 참여와 편집자/관찰자 권한은 구현됨. 제작자·검증자·기록자, 담당 과업, 역할 교환 이력 필드는 없음. 편집자 권한이 교육 역할 수행을 입증하지 않음. [참여](/Users/greatsong/greatsong-project/10_수업자료/vpylab/server/classroom/store.js:128), [권한 UI](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/classroom/Workspace.jsx:214) |
| 4. 개인 초안·작은 실험 | 구현됨 | 각자 본인 초안에서 `gap` 한 값만 바꾸어 실행. 예상과 실제 결과를 1문장씩 기록하고 팀 코드와 구분 | 계정·프로젝트·편집 창별 초안 보존, 교체 전 복구, 서버 개인 초안 목록이 있음. 팀원이 타인 개인 초안을 함께 편집하는 방식은 아님. [초안 범위](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/classroom/useDraft.js:11), [초안 조회](/Users/greatsong/greatsong-project/10_수업자료/vpylab/server/classroom/store.js:134) |
| 5. 질문·조건 공유 | 수업 지원 필요 | “0.15초 간격이면 세 음이 겹칠까?”를 예상·고정 조건·비교할 값과 함께 질문으로 남김 | 질문 작성과 GitHub Issue 보내기는 구현됨. 로컬 질문의 답글·담당자·완료 처리·제안 연결은 확인되지 않음. 질문에 답하는 대화는 GitHub에서 하거나 후속 질문/제안 본문에 이전 질문 식별자를 직접 적어야 함. [질문 UI](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/classroom/Workspace.jsx:177), [로컬 질문 저장](/Users/greatsong/greatsong-project/10_수업자료/vpylab/server/classroom/store.js:155) |
| 6. 변경 제안 | 수업 지원 필요 | 가가 제목과 예상·관찰·선택 이유·다음 확인을 적어 제안. 변경은 `gap` 한 값에 한정 | 제안 코드·기준 팀 버전·구조화한 기록·diff가 보존됨. 제안 제목만 필수이고 기록은 전부 비어도 허용됨. 실행 결과는 브라우저에서 관찰 칸에 일부 넣어주는 편의 기능이며 서버 검증된 실행 증명은 아님. [제안 요청](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/classroom/Workspace.jsx:85), [실행 기록 채우기](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/classroom/Workspace.jsx:102), [서버 기록 검증](/Users/greatsong/greatsong-project/10_수업자료/vpylab/server/classroom/app.js:18) |
| 7. 동료 실행·보완 요청 | 수업 지원 필요 | 나가 제안을 개인 초안에 열어 두 조건을 실행. “음 길이 0.4초인데 간격은 0.15초여서 겹친다. 0.55초를 비교해 달라”라고 보완 | 자기 제안 검토는 서버에서 차단됨. 다른 학생이 제안 코드를 개인 초안에 열 수 있음. 실행·청취 여부와 구체적 검토 문장의 질은 서버에서 확인하지 않음. [실행해보기·리뷰](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/classroom/Workspace.jsx:185), [자기 검토 금지](/Users/greatsong/greatsong-project/10_수업자료/vpylab/server/classroom/store.js:161) |
| 8. 같은 제안의 코드 보완·재검토 | 미지원 | 가가 보완한 v2를 다시 제안하고 원래 질문·제안 번호와 변경 이유를 적음 | 로컬 제안을 수정·교체·닫는 API/UI가 없어 같은 제안에서 코드 수정→재승인으로 이어질 수 없음. 현재는 새 제안으로 제출해야 하며 이전 보완 요청/새 제안 간 연결·구 제안 정리는 자동으로 남지 않음. [제안·검토·반영 API 전체](/Users/greatsong/greatsong-project/10_수업자료/vpylab/server/classroom/app.js:133), [제안 상태 저장](/Users/greatsong/greatsong-project/10_수업자료/vpylab/server/classroom/store.js:159) |
| 9. 동료 승인·팀 반영 | 구현됨 | 나가 두 조건 비교 후 관찰과 승인 이유를 남김. 가 또는 나가 검토된 제안을 반영 | 학생 반영은 다른 유효 팀원의 최신 승인과 미해결 보완 요청이 없는지 검사. 기준 버전이 달라지면 충돌. 빈 승인도 통과하며 직접 팀 저장과 교사 반영에는 같은 리뷰 요건이 적용되지 않음. [반영 검사](/Users/greatsong/greatsong-project/10_수업자료/vpylab/server/classroom/store.js:162), [팀 직접 저장](/Users/greatsong/greatsong-project/10_수업자료/vpylab/server/classroom/store.js:143) |
| 10. GitHub PR·리뷰 기록 | 수업 지원 필요 | 교사 연결 후 팀 확정본을 PR로 보냄. GitHub의 검토 링크와 앱의 로컬 검토가 별도임을 확인 | UI는 팀 checkpoint와 코드를 보내고 실제 GitHub 리뷰는 수집·표시함. 로컬 리뷰를 GitHub 리뷰로 게시하는 흐름은 없음. PR API의 checkpointId는 선택값이어서 UI와 달리 ‘확정본만’이라는 경계를 HTTP에서 완전히 강제하지 않음. [PR UI](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/classroom/Workspace.jsx:219), [PR API 경계](/Users/greatsong/greatsong-project/10_수업자료/vpylab/server/classroom/github.js:318), [기록 표시](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/classroom/GitHubLearningPanel.jsx:95) |
| 11. 각자의 성찰 | 수업 지원 필요 | “내 예상/동료가 발견한 점/왜 바꿨는지/다음에 시험할 조건”을 각자 짧게 설명 | checkpoint의 사고 기록은 있음. 반영 checkpoint는 제안 작성자 명의이며 검토자의 설명은 리뷰에 따로 남음. 별도 독립 성찰 제출·도움 축소 확인 단계는 없음. ‘기록과 성찰’ 탭의 명칭만으로 모든 학생의 성찰이 보존되는 것은 아님. [발자국 표시](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/classroom/Workspace.jsx:128), [성찰 추출](/Users/greatsong/greatsong-project/10_수업자료/vpylab/server/classroom/store.js:185) |
| 12. 교사 개별 기록·피드백 | 구현됨 | 교사가 가의 비교 설명과 나의 보완 근거를 구분하여 기록. 학생 피드백과 비공개 관찰을 나눔 | 교사별 비공개·대상 학생·팀 공개 범위가 구분되고, GitHub 근거 또는 직접 관찰을 기록할 수 있음. 저장 횟수 대신 원문·구두 설명을 함께 봐야 함. [교사 기록 양식](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/classroom/GitHubLearningPanel.jsx:130), [공개 범위 검사](/Users/greatsong/greatsong-project/10_수업자료/vpylab/server/classroom/store.js:163), [건수를 성적으로 보지 않는 안내](/Users/greatsong/greatsong-project/10_수업자료/vpylab/server/classroom/learning-feedback.js:32) |

## 중요 발견과 우선순위

### P1 — 검토를 거친 팀 확정이라는 의미가 경로마다 다름

학생의 `mergeProposal`에는 다른 동료의 승인 요건이 있지만, 같은 학생 편집자가 `saveCheckpoint`를 직접 호출하면 검토 없이 팀 코드가 바뀝니다. 교사에게는 리뷰 요건의 예외도 있습니다. UI가 이를 설명하기는 하므로 구현과 설명이 완전히 반대인 것은 아닙니다. 다만 이 프로젝트를 ‘항상 두 학생의 검토를 거친 최종본’으로 운영하려면 수업 약속만으로는 부족합니다. 교육적으로는 기다리기 번거로운 리뷰를 건너뛰는 경로가 더 짧습니다.

권고: 수업별 ‘자유 실험 저장/동료 검토 후 확정’을 구분하고, 검토 필수 수업에서는 일반 편집자의 직접 확정을 막는 정책을 설계합니다. 교사의 예외 반영에는 사유와 예외 사실을 팀 기록에 표시하는 방식이 필요합니다. 이번 검토에서 기능을 추가하지 않았습니다.

근거: [직접 저장 권한·버전만 검사](/Users/greatsong/greatsong-project/10_수업자료/vpylab/server/classroom/store.js:143), [학생 리뷰 요건·교사 예외](/Users/greatsong/greatsong-project/10_수업자료/vpylab/server/classroom/store.js:162), [두 저장 경로를 모두 제공하는 UI](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/classroom/Workspace.jsx:123).

### P1 — GitHub PR에 보내는 코드가 팀 확정본인지 검사는 선택적임

일반 UI는 checkpoint 코드와 ID를 보내지만 서버는 `checkpointId`가 있을 때만 코드의 일치를 확인합니다. ID를 생략하면 형식·용량·권한·원격 기준 SHA를 통과한 다른 코드도 작업 대기열에 들어갈 수 있는 구조입니다. 따라서 ‘개인 초안은 PR로 전송될 수 없다’ 또는 ‘PR은 동료가 검토한 팀 확정본이다’라고 서버 보장으로 설명하면 안 됩니다. 코드상 발견이며, 실제 허용 응답 여부는 총괄 HTTP 리허설에서 별도로 확인합니다.

권고: 외부 제안의 checkpoint 연결을 서버에서 필수로 하고, 수업 정책이 요구한다면 해당 checkpoint의 동료 검토 이력도 확인합니다. 단순히 최신 checkpoint인 것과 동료 검토를 마쳤다는 것은 별개입니다.

근거: [checkpointId 선택 검사](/Users/greatsong/greatsong-project/10_수업자료/vpylab/server/classroom/github.js:321), [공개 API](/Users/greatsong/greatsong-project/10_수업자료/vpylab/server/classroom/github.js:468), [UI가 보내는 checkpoint](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/classroom/Workspace.jsx:219).

### P2 — 보완 요청을 반영하는 핵심 학습 고리가 끊김

수치 하나를 보완하더라도 기존 로컬 제안 코드를 고칠 수 없습니다. 새 제안을 만들면 이전 보완 요청이 해결되었는지 판단하는 연결이 없고 원래 제안은 계속 검토 중으로 남을 수 있습니다. 반대로 코드를 바꾸지 않고 같은 제안에 최신 승인을 남기면 이전 보완 요청은 최신 결정으로 대체됩니다. 실제 보완이 필요한 이유를 학생이 설명하고 교사가 확인해야 합니다.

권고: 제안의 변경 이력과 검토가 본 코드 버전을 연결하고, 새 코드가 올라오면 재검토를 요구하도록 설계합니다. 우선 수업에서는 새 제안 제목에 ‘이전 제안 보완’, 본문에 이전 제안 식별자·수정 한 곳·비교 결과를 적는 수동 규칙을 사용합니다.

근거: [제안 생성·리뷰·반영만 있는 경로](/Users/greatsong/greatsong-project/10_수업자료/vpylab/server/classroom/app.js:133), [검토자별 최신 결정 선택](/Users/greatsong/greatsong-project/10_수업자료/vpylab/server/classroom/store.js:160).

### P2 — ‘검토 후 승인’은 실행과 설명을 보장하지 않음

리뷰 의견이 비어도 승인할 수 있으며 UI도 빈 의견일 때 ‘검토 의견이 없습니다’라고 표시합니다. 예상·관찰·판단도 비어 있을 수 있습니다. 승인 수와 기록 수는 동료가 실제로 실행·비교했다는 근거가 아닙니다. 이 과제에는 “변경한 한 값, 실행한 두 조건, 의도와 실제 결과, 다음 질문” 정도의 짧은 확인 틀이 필요합니다. 긴 글을 필수로 만들어 문해 부담을 높일 필요는 없습니다.

근거: [리뷰 comment 빈 값 허용](/Users/greatsong/greatsong-project/10_수업자료/vpylab/server/classroom/app.js:136), [빈 의견 표시·승인 버튼](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/classroom/Workspace.jsx:186), [예상·관찰 양식](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/classroom/EvidenceForm.jsx:9).

### P2 — 입문 창작의 도움 수준과 시작 의도가 불명확함

새 프로젝트에는 공 한 개가 있으며 자동으로 과제의 3도형·3음 골격이 제공되지는 않습니다. 소리 영역의 `play_note`와 `sleep` 예시는 유용하지만, 학생이 처음 보는 여러 생성자·좌표·키워드 인자를 검색해서 모두 조합해야 한다면 변수와 순차를 목표로 한 수업의 난이도를 넘을 수 있습니다.

권고: 교사가 ‘실행용 골격’과 ‘학생이 결정할 부분’을 구분한 짧은 카드를 제공합니다. `gap` 한 값 비교 → 음 순서 선택 → 새 알림 독립 설계 순으로 도움을 줄입니다. `for`로 압축하는 활동은 선택 심화로 분리합니다.

근거: [기본 코드](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/classroom/ClassroomApp.jsx:9), [재생 예시](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/classroom/RuntimePanel.jsx:180), [기존 스캐폴딩 검토](/Users/greatsong/greatsong-project/10_수업자료/vpylab/docs/CONTENT_SCAFFOLDING_REVIEW_2026-10-28.md:77).

### P2 — 검토자의 성찰과 공동 설계가 자동으로 개인 근거가 되지는 않음

팀 확정본의 사고 기록은 작성자에게 연결됩니다. 동료의 관찰·구두 설계·코드 작성 이외의 기여는 리뷰 본문 또는 교사의 개별 기록으로 보완해야 합니다. 교육 역할은 권한 역할과 다르며 별도 담당 이력은 없습니다. 이름만으로 GitHub 근거를 배분하지 않는 현재 원칙은 적절합니다.

근거: [학생별 근거 구성](/Users/greatsong/greatsong-project/10_수업자료/vpylab/server/classroom/store.js:96), [역할 표시](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/classroom/Workspace.jsx:214), [숫자 ID 기준 귀속 원칙](/Users/greatsong/greatsong-project/10_수업자료/vpylab/server/classroom/learning-feedback.js:34).

### P3 — AI 미사용은 수업 정책과 화면 안내로 운영함

AI 정책을 `disabled`로 선택하면 제안 기록에서 AI 사용 칸이 감춰지고 동일한 실행 환경을 사용합니다. 다만 새 프로젝트의 기본값은 `optional`이고, 이 설정은 학생이 외부 AI를 쓰지 않았음을 검증하는 장치가 아닙니다. 해당 팀은 처음에 정책을 바꾸고 구두 설명·작은 독립 변형으로 학생의 판단을 확인하면 됩니다.

근거: [생성 기본 정책](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/classroom/ClassroomApp.jsx:164), [AI 칸 표시 조건](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/classroom/EvidenceForm.jsx:14), [정책과 무관한 실행 환경](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/classroom/RuntimePanel.jsx:26).

## 교사용 최소 스캐폴딩 카드

| 지원 수준 | 제공하는 것 | 학생이 결정하는 것 | 도움을 줄였을 때 볼 근거 |
|---|---|---|---|
| 처음 | import·도형 생성자·짧은 재생 호출, 좌표와 음 이름 카드 | 알림의 목적, `gap` 0.15/0.55 두 조건의 예상 | 어떤 값을 바꿨고 무엇을 고정했는지 말함 |
| 중간 | 관찰 기준만 남김: 겹침·순서·도형 대응 | 음 순서 또는 색 한 조건, 동료 보완의 채택/거절 | 실행 전 예상과 실행 후 관찰을 비교함 |
| 독립 적용 | 완료 알림과 다른 상황 하나만 제시 | 새 음 3개와 간격, 시각 표현, 검증 방법 | 첫 작품을 그대로 복사하는 대신 목적에 따른 선택 이유를 설명함 |

기술 API를 숨긴 뒤 전체가 모두 쉬운 문법이라고 설명하지 않습니다. 제시된 골격과 학생 작성 부분을 표시합니다. 첫 프로젝트에서는 대표 실험 두 번 정도를 묶어서 기록하며 모든 숫자 편집마다 이슈·PR을 만들게 하지 않습니다. 제작·검토 역할은 적어도 한 번 교환합니다.

## 합성 시나리오에서 기대하는 구체적 기록

| 작성자 | 기록 | 예시 |
|---|---|---|
| 가 | 문제·성공 기준 | “옆 팀에 완료를 알린다. 세 음을 구별할 수 있고 화면에서도 세 단계를 알 수 있어야 한다.” |
| 가 | 질문 | “음 길이를 0.4초로 두고 간격을 0.15초/0.55초로 바꾸면 끝맺음이 어떻게 다른가?” |
| 가 | v1 제안 | “세 도형과 세 음을 만들었다. 빨리 끝나게 하려고 간격 0.15초를 골랐다.” |
| 나 | 보완 요청 | “0.15초 간격으로 들으면 앞 음이 남아 다음 음과 겹친다. 0.55초도 비교해 달라.” |
| 가 | v2 새 제안 | “이전 제안의 간격만 0.55초로 바꾸었다. 다른 조건을 유지했고 세 음을 구분하는 쪽을 택했다.” |
| 나 | 승인 | “두 조건을 비교했다. 0.55초에서는 음의 순서가 더 구별되었다. 알림이 길어지는 점은 다음에 0.45초와 비교하자.” |
| 가·나 | 성찰 | 가: “빨리 끝내는 것과 구별하는 것이 충돌했다.” 나: “코드를 직접 고치기 전에 한 변수 비교를 제안했다.” |
| 교사 | 개인 관찰 | “나는 코드를 입력하지 않았지만 비교 조건을 정했고 근거 있는 보완을 제시함. 다음에는 나가 새 알림 제작을 맡도록 질문.” |

위의 청감 표현은 학생이 실제로 확인한 뒤에만 사실 기록으로 남깁니다. 자동 HTTP 리허설에서 같은 문자열을 제출한 것은 그 관찰을 했다는 증거가 아닙니다.

## 리허설용 짧은 Python 두 버전

이 코드는 과제의 기술 골격 예시입니다. 완성 해답을 학생에게 처음부터 모두 제시할 필요는 없습니다. 문법 검사나 API 저장 성공과 실제 브라우저의 재생·장면·청감 검증을 구분합니다. 음색 선택 UI는 ‘미리 듣기’ 설정이며 코드의 `"musicbox"`를 자동으로 바꾸는 기능으로 해석하지 않습니다.

v1은 `gap = 0.15`, v2는 첫 변수 한 줄만 `gap = 0.55`로 바꿉니다. 음 길이·음색·도형은 고정하여 비교합니다.

```python
from vpython import *

# 비교할 변수 하나만 바꿉니다.
gap = 0.15

sphere(pos=vec(-2, 0, 0), radius=0.5, color=color.cyan)
play_note("C5", 0.4, "musicbox")
sleep(gap)

box(pos=vec(0, 0, 0), size=vec(1, 1, 1), color=color.orange)
play_note("E5", 0.4, "musicbox")
sleep(gap)

cone(pos=vec(2, 0, 0), axis=vec(0, 1, 0), radius=0.5, color=color.magenta)
play_note("G5", 0.4, "musicbox")
print("세 음과 세 도형의 알림을 비교합니다.")
```

첫 독립 적용에서는 위 코드를 더 짧게 압축하게 하기보다 다른 목적의 알림에서 음 순서 또는 간격을 스스로 골라 설명하도록 합니다. `for`를 배우지 않은 학생에게 리스트·반복을 먼저 요구하지 않습니다.

## 후속 확인에서 관찰할 것

실제 파일럿에서는 두 학생이 각각 편집 범위를 찾는지, 두 조건을 같은 기준으로 비교하는지, 동료의 보완 요청을 이해하고 설명하는지, 역할 교환 후에도 독립적으로 판단하는지를 확인합니다. 학년·선수 경험·실제 기기·오디오 환경이 확인되지 않았으므로 소요 시간·성공률·실제 협업 효과는 확정하지 않습니다.
