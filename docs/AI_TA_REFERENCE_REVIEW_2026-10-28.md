# 운영 중인 AI 조교 프로젝트 참조 검토와 VPyLab 적용안

검토일: 2026-10-28. 이미 수업에서 운영한 AI 조교 프로젝트의 공개 설명과 지정된 실제 구현을 읽고 VPyLab의 세 프로젝트 경로와 대조했습니다. 운영 서비스 접속·변경, 외부 저장소 변경, 학생 원자료·녹음·전사·점수·비밀 설정 읽기는 하지 않았습니다. 아래의 적용안은 설계 제안이며 VPyLab에 이미 구현한 기능을 뜻하지 않습니다.

**이 사례에서 우선 가져올 것은 ‘AI가 근거 있는 초안을 만들고, 교사가 고쳐서 전달하며, 다음 질문이 학생의 후속 작업으로 이어지는 과정’입니다.** 순수 창작·수업 코드 활용·공개 프로젝트 리믹스에 같은 판단 구조를 쓰되 질문과 관찰 기준을 달리할 수 있습니다. 개인 맥의 자동화·공유 연결 토큰·시트 덮어쓰기까지 그대로 옮기는 것은 다중 교사·다중 학교 서비스의 설계와 맞지 않습니다.

## 확인한 출처와 범위

| 출처 | 기준 | 확인한 내용 |
|---|---|---|
| 발표 프로젝트 `ai-ta-project-assessment` | HEAD `d20766fbbe61ab9187eb73f097a3e698d2fbe165` | README, 공개 검토 문서, slides/widgets의 공개 설명. 지정 파일의 작업 트리 변경 없음 |
| 운영 구현 `2026-ds-danggok` | HEAD `32a25ff5e1061f6d0e6534ef57bfac2d8b71c73e` | Apps Script 구술 API, 저장소 확인 스크립트·프롬프트, 루브릭 JSON. 지정된 추적 파일의 작업 트리 변경 없음 |
| 로컬 생성 교사 앱 `web/teacher/oral/oral.js` | SHA-256 `0dcb5f1763c9adc50522c77945f47a8d9ff051cd109674211b6b43454719017e` | IndexedDB 저장, 동기화, 교사 수정·게시, 질문 후보 표시. Git ignored 생성 파일이므로 위 HEAD에 들어 있는 파일로 주장하지 않음 |
| VPyLab | 검토 시작 HEAD `b45087dd42e8e6c588cf872465088674a5c5c54f`, `codex/classroom-v2` | 교사 기록·피드백, 개인 초안, GitHub 근거, 고정 평가 영역 및 세 프로젝트 경로 |

공개 주소는 README에서 확인한 [발표 자료](https://greatsong.github.io/ai-ta-project-assessment/)와 [다른 교과 적용 검토](https://greatsong.github.io/ai-ta-project-assessment/review/)입니다. 이번에는 그 서비스에 접속하거나 캡처의 학생 원문을 읽지 않았습니다. 발표 자료는 수업 운영 사례이며 교육 효과를 측정하기 전이라는 한계도 직접 밝힙니다. 운영 경험을 단순한 아이디어로 낮춰 보지 않되, 이 소스 검토로 학습 효과·부담 감소·학생 참여 개선을 실증했다고 주장하지 않습니다. [README](/Users/greatsong/greatsong-project/80_연수및강의/ai-ta-project-assessment/README.md:3), [효과와 환경의 한계](/Users/greatsong/greatsong-project/80_연수및강의/ai-ta-project-assessment/content/review.md:179), [발표의 한계 설명](/Users/greatsong/greatsong-project/80_연수및강의/ai-ta-project-assessment/content/slides.js:200).

## 실제 구현과 설명의 대조

| 운영 사례의 핵심 | 실제 소스에서 확인한 것 | 해석의 경계 |
|---|---|---|
| 교사가 판단하고 AI가 초안 작성 | 교사 앱에서 팀/개인 루브릭 항목을 직접 선택하고 점수 payload를 구성. AI 피드백 prompt는 점수·등급·학생 이름을 쓰지 않고 실제 장면과 다음 가이드를 작성하도록 지시 | 교사 전용 운영 앱의 구현이다. AI가 점수를 자동 결정하는 코드로 읽히지 않음. 프롬프트 지시만으로 사실 정확성이 보장되는 것은 아님. [교사 점수 선택](/Users/greatsong/greatsong-project/10_수업자료/2026-ds-danggok/web/teacher/oral/oral.js:1333), [점수 payload](/Users/greatsong/greatsong-project/10_수업자료/2026-ds-danggok/web/teacher/oral/oral.js:479), [AI prompt](/Users/greatsong/greatsong-project/10_수업자료/2026-ds-danggok/apps-script/oral/Code.gs:1128) |
| 초안 수정과 명시적 게시 | 피드백을 편집·저장한 뒤 ‘이슈로 올리기’를 눌러 대상 저장소·제목을 확인. 저장소 변화 초안도 편집 후 ‘올리기/버리기’ 선택. 서버 자동 초안 처리는 시트에 저장하며 게시 함수와 분리 | 자동 초안 생성과 학생에게 전달은 분리되어 있음. 반면 서버 API에는 교사별 신원·권한에 따른 별도 승인 기록 모델이 없고 공유 연결 토큰을 사용. 다중 사용자 서비스의 승인 경계로는 보완 필요. [초안 보존](/Users/greatsong/greatsong-project/10_수업자료/2026-ds-danggok/apps-script/oral/Code.gs:804), [이슈 확인·게시](/Users/greatsong/greatsong-project/10_수업자료/2026-ds-danggok/web/teacher/oral/oral.js:1522), [댓글 초안 UI](/Users/greatsong/greatsong-project/10_수업자료/2026-ds-danggok/web/teacher/oral/oral.js:1597), [토큰 인증](/Users/greatsong/greatsong-project/10_수업자료/2026-ds-danggok/apps-script/oral/Code.gs:98) |
| 같은 팩의 회차·질문·팀/개인 기준 | 루브릭 JSON에 준비물·시작 질문·꼬리질문·체크리스트·수준별 설명·`unit`이 있음. 서버 bootstrap과 교사 앱은 팀/개인을 구분해 읽고 표시 | 팩을 VPyLab에 그대로 복사하면 데이터 과학 전용 개념과 AI 사용 질문까지 따라옴. 구조를 가져오고 난이도와 질문은 새로 작성해야 함. [팩과 회차](/Users/greatsong/greatsong-project/10_수업자료/2026-ds-danggok/curriculum/구술평가_루브릭.json:81), [개인 항목 예](/Users/greatsong/greatsong-project/10_수업자료/2026-ds-danggok/curriculum/구술평가_루브릭.json:282), [서버에서 읽기](/Users/greatsong/greatsong-project/10_수업자료/2026-ds-danggok/apps-script/oral/Code.gs:481) |
| log에 근거한 다음 질문 후보 | 변경된 log의 학생별 절을 수집해 다음 회차에 맞춘 질문 후보를 만들고 `basis/source`를 저장. 후보·사용·숨김 상태가 있음. 교사가 사용·숨김 처리한 질문을 재생성으로 덮지 않음 | AI가 만든 질문도 교사의 선택 대상. 실제 질문 문장이 학생의 이해를 정확히 진단하는지는 교사가 확인해야 함. [log 수집](/Users/greatsong/greatsong-project/10_수업자료/2026-ds-danggok/scripts/oral_repo_watch.py:212), [질문 설계 지시](/Users/greatsong/greatsong-project/10_수업자료/2026-ds-danggok/scripts/oral_watch_prompt.md:24), [상태 보호](/Users/greatsong/greatsong-project/10_수업자료/2026-ds-danggok/apps-script/oral/Code.gs:1401), [질문 사용·숨김 UI](/Users/greatsong/greatsong-project/10_수업자료/2026-ds-danggok/web/teacher/oral/oral.js:1284) |
| 기기에 먼저 저장하고 큐로 재시도 | 기록·녹음·조각을 IndexedDB에 보존. 저장 버튼은 로컬 저장 완료 후 창을 닫고 서버 동기화를 시작. 기록→녹음→전사 순서, 대기·오류 상태, 정기 재시도가 있음. 서버도 처리 중 잠금·시간 경과 후 재시도·최대 횟수를 사용 | 서버 장애가 수업의 다음 팀 진행을 막지 않도록 만든 흐름은 유용. 하지만 모든 실패에서 영구 보존·자동 복구됨을 이 검토로 보장하지 않음. [기기 저장소](/Users/greatsong/greatsong-project/10_수업자료/2026-ds-danggok/web/teacher/oral/oral.js:60), [저장 버튼 순서](/Users/greatsong/greatsong-project/10_수업자료/2026-ds-danggok/web/teacher/oral/oral.js:1390), [동기화](/Users/greatsong/greatsong-project/10_수업자료/2026-ds-danggok/web/teacher/oral/oral.js:504), [서버 처리 상태](/Users/greatsong/greatsong-project/10_수업자료/2026-ds-danggok/apps-script/oral/Code.gs:716) |
| 이미 올린 글의 중복 억제 | 이슈 URL이 있으면 새 이슈 대신 수정. 초안이 ‘올림’이면 기존 URL 반환. CLI 경유 시 게시한 URL을 서버에 기록. 팀·커밋 기반 초안 ID도 사용 | HTTP 게시 성공 직후 URL 기록에 실패하거나 두 실행이 동시에 게시하면 중복 가능성이 남음. ‘중복 억제 장치 있음’과 ‘모든 장애에서 한 번만 게시됨’을 구분해야 함. [이슈 수정·URL 보존](/Users/greatsong/greatsong-project/10_수업자료/2026-ds-danggok/apps-script/oral/Code.gs:1311), [올림 확인](/Users/greatsong/greatsong-project/10_수업자료/2026-ds-danggok/apps-script/oral/Code.gs:1485), [CLI 게시 후 기록](/Users/greatsong/greatsong-project/10_수업자료/2026-ds-danggok/scripts/oral_repo_watch.py:473) |
| 자료 확인→설계→문안→교사 결정 | 저장소 차이·README·log·데이터 프로파일을 보고 설계 재료를 만든 뒤 Solar가 글을 씀. 부풀림·커밋 수 비교 금지, 근거 없는 사실 금지, AI 작성 표기를 사용 | 소스·데이터에 기반한 문안 검토는 VPyLab에도 적절. 단 데이터 과학 전용 프로파일러와 문체 규칙을 모든 창작 수업에 그대로 강제할 필요는 없음. [변화 보고서](/Users/greatsong/greatsong-project/10_수업자료/2026-ds-danggok/scripts/oral_repo_watch.py:240), [설계·금지 사항](/Users/greatsong/greatsong-project/10_수업자료/2026-ds-danggok/scripts/oral_watch_prompt.md:9), [집필과 확인](/Users/greatsong/greatsong-project/10_수업자료/2026-ds-danggok/scripts/oral_repo_watch.py:375), [게시 형식·표기](/Users/greatsong/greatsong-project/10_수업자료/2026-ds-danggok/apps-script/oral/Code.gs:1270) |
| 학생별 학기말 근거 모음 | 공개 설명에서 학생별 구술·log·승인 이슈 근거를 모으는 흐름을 설명하며, 저장소 확인 코드도 `setuk_store.cmd_collect` 호출을 포함 | 이번 지정 범위에서 수집기 내부와 실제 학생 파일은 읽지 않았음. 따라서 호출 연결과 설계 의도는 확인했으나 개인별 귀속·조회권한·수집 결과까지 검증한 것은 아님. [공개 설명](/Users/greatsong/greatsong-project/80_연수및강의/ai-ta-project-assessment/content/review.md:58), [수집 호출](/Users/greatsong/greatsong-project/10_수업자료/2026-ds-danggok/scripts/oral_repo_watch.py:573) |

발표 자료에는 교사가 처음 초안을 회수하고 기준을 바꾸어 다시 확인한 운영 경험도 있습니다. 이 사례의 중요한 교훈은 AI 초안을 항상 맞는 판단으로 간주하는 것이 아니라 교사가 실제 기록·데이터와 대조해 기준과 문안을 바꿀 수 있게 하는 것입니다. 이 공개 설명을 학생 원자료로 다시 확인하지는 않았습니다. [공개 운영 설명](/Users/greatsong/greatsong-project/80_연수및강의/ai-ta-project-assessment/content/slides.js:109).

## VPyLab에 이미 있는 기반과 없는 부분

| 기능 | VPyLab 현재 상태 | 가져올 설계 |
|---|---|---|
| 교사 개인 관찰과 학생·팀 피드백 | 구현됨. 교사 신원·프로젝트 참여를 확인하고 작성 교사만 보는 기록, 대상 학생 전달, 팀 공유를 구분 | 기존 비공개 범위를 유지. AI 초안을 교사 확정 기록과 구분하는 상태·작성 출처를 추가하는 방향. [공개 범위](/Users/greatsong/greatsong-project/10_수업자료/vpylab/server/classroom/store.js:163), [양식](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/classroom/GitHubLearningPanel.jsx:115) |
| GitHub 근거와 학생 귀속 | 구현됨. 숫자 GitHub ID와 실제 작업 요청자를 구분하며 근거 참조를 피드백에 보존 | AI 입력에도 해당 근거 ID·원문 위치·기준 코드 SHA를 연결. 이름·학번 문자열 추측으로 기존 귀속을 대체하지 않음. [귀속](/Users/greatsong/greatsong-project/10_수업자료/vpylab/server/classroom/store.js:83), [근거 보존](/Users/greatsong/greatsong-project/10_수업자료/vpylab/server/classroom/store.js:171) |
| 개인 초안 복구와 명시적 팀 확정 | 구현됨. 계정·프로젝트·편집 창별 초안, 충돌 확인, 팀 버전 분리 | 구술 메모·질문 응답 같은 새 기록도 같은 범위·복구 원칙으로 보존. 현재 개인 코드 초안 구현만으로 구술 녹음 저장까지 있다고 주장하지 않음. [초안](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/classroom/useDraft.js:11), [버전 검사](/Users/greatsong/greatsong-project/10_수업자료/vpylab/server/classroom/store.js:143) |
| 학생의 예상·관찰·판단·다음 실험 | 구현됨. AI 사용 칸은 수업 정책에 따라 표시 | log 형식을 중복 입력시키기보다 기존 기록을 근거로 재사용. AI 미사용 수업에서는 ‘AI가 준 것’ 칸을 요구하지 않음. [현재 양식](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/classroom/EvidenceForm.jsx:9) |
| 근거 없는 자동 점수 방지 | GitHub 활동 건수를 성적·사고력으로 환산하지 않는 요약과 안내가 있음 | 유지. 교사가 판단하는 서술형 루브릭과 AI의 질문·초안을 분리. [요약의 한계](/Users/greatsong/greatsong-project/10_수업자료/vpylab/server/classroom/learning-feedback.js:19) |
| 교과·경로별 checkpoint 팩 | 미구현. 현재 사고 기록 5칸과 평가 영역이 코드에 고정되어 있음 | 버전 있는 팩으로 목표·선수지식·편집 범위·질문·중간 성공·도움 축소·개인/팀 기준을 정의. 기존 콘텐츠 자체를 새 평가 기준으로 덮어쓰지 않음. [현재 고정 영역](/Users/greatsong/greatsong-project/10_수업자료/vpylab/server/classroom/learning-feedback.js:1) |
| 구술 세션·개별 질문 응답·시간 표시 | v2에 미구현 | 처음에는 녹음 없이 교사 메모와 학생의 짧은 답변을 남기는 작은 세션부터 설계. 음성 수집을 모든 프로젝트의 필수 경로로 만들지 않음. [현재 API 범위](/Users/greatsong/greatsong-project/10_수업자료/vpylab/server/classroom/app.js:122) |
| 근거별 질문 후보·사용/숨김 이력 | 미구현. 현재 다음 질문은 모든 학생에게 같은 5개 문장 | 근거가 있는 후보만 교사에게 제안하고 사용·숨김·수정 이유를 보존. 다시 생성해도 교사의 결정은 유지. [고정 질문](/Users/greatsong/greatsong-project/10_수업자료/vpylab/server/classroom/learning-feedback.js:25) |
| AI 피드백 초안→교사 수정→명시적 전달 | v2 피드백에는 자동 초안·검토 상태가 없음. 현재 교사가 직접 쓰고 공개 범위를 선택해 저장 | `draft`와 `published`를 분리하고 AI 초안은 자동 전달하지 않음. 교사 개인 기록도 외부 GitHub에 자동 게시하지 않음. [현재 교사 저장](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/classroom/GitHubLearningPanel.jsx:130), [서버 피드백](/Users/greatsong/greatsong-project/10_수업자료/vpylab/server/classroom/app.js:143) |
| 교사 피드백을 GitHub Issue·댓글로 전달 | 미구현. 현재 질문과 코드 PR 전송은 있으나 교사 피드백은 로컬 서버의 공개 범위로 전달 | 외부 전달이 필요하면 대상 저장소·공개 범위·최종 문안·근거를 미리 보여 주고 별도 게시. 학생 개인 피드백과 팀 Issue를 혼합하지 않음. [현재 GitHub 경로](/Users/greatsong/greatsong-project/10_수업자료/vpylab/server/classroom/github.js:459) |
| 학기말 개인 근거 묶음 | 프로젝트 단위 학생 근거·내보내기는 있음. 여러 프로젝트를 묶은 개인 학기말 묶음은 미구현 | 프로젝트·발생일·학생 역할·받은 도움·원문 참조·교사 판단을 연결. AI가 생활기록부 문장을 자동 확정하는 기능으로 확대하지 않음. [학생 근거](/Users/greatsong/greatsong-project/10_수업자료/vpylab/server/classroom/store.js:96), [프로젝트 내보내기](/Users/greatsong/greatsong-project/10_수업자료/vpylab/server/classroom/app.js:149) |

## 세 프로젝트 경로에서 어떻게 사용할 것인가

세 팀 모두 코드의 복잡성 대신 문제 정의·작은 비교·동료 의견에 대한 판단·독립 설명을 관찰합니다. 공통 checkpoint는 시작 합의→첫 비교→동료 보완 후 확정→각자의 설명으로 줄이고, 교사가 필요에 따라 회차를 선택하도록 합니다. 운영 사례의 데이터 과학 회차 수·모델·지표 항목을 그대로 필수화하지 않습니다.

| 경로 | AI 조교가 정리할 근거 | 교사가 고를 짧은 질문 | 스캐폴딩·최종 판단 |
|---|---|---|---|
| 순수 창작: 세 음과 세 도형 | 최초 의도, `gap` 값 한 곳의 diff, 두 조건 관찰, 동료 리뷰와 후속 제안 | 팀: “알림 성공을 무엇으로 확인했나요?” 개인: “음 길이는 두고 간격만 바꾼 이유는?” | import·도형·재생 API는 제공 골격. 학생은 값·순서·색을 정함. 다음에는 새 목적의 알림에서 지원을 줄여 설명하게 함. ‘예쁜 소리’의 판단을 AI 취향으로 확정하지 않음 |
| 기존 수업 코드 활용 | 선택한 차시/미션 ID와 원본 버전, 교사 제공 코드, 학생의 작은 변경, 예상과 관찰, 동료 질문 | 팀: “원본에서 무엇을 유지했고 무엇을 바꿨나요?” 개인: “이 값이 바뀌면 결과가 왜 달라지나요?” | 학생이 수정한 범위를 기준으로 판단. 완성 코드 전체의 난이도나 실행 성공을 개인 이해 점수로 보지 않음. 빈칸·힌트를 점차 줄인 다음 유사한 새 조건을 적용 |
| 공개 프로젝트 리믹스 | 원 프로젝트·고정 commit·코드/자산 출처, 원본과 리믹스의 diff, 유지·대체 결정, 호환성 확인, 리뷰 | 팀: “원본의 어떤 아이디어를 어떤 목적에 맞게 바꿨나요?” 개인: “내가 바꾼 부분과 제공받은 부분을 설명해 주세요.” | 원본 실행과 새 기능 도입을 나눔. 길거나 복잡한 원본을 전부 학생 구현으로 평가하지 않음. 출처·이용 조건 확인을 근거에 남기며 AI가 미확인 이용 가능성을 확정하지 않음 |

질문 후보는 각 기록의 실제 내용에 연결되어야 합니다. 예를 들어 학생이 “0.15초와 0.55초를 비교할 예정이다”라고만 썼다면 AI 초안은 “비교했다”라고 바꾸면 안 됩니다. 학생이 비교를 실제 수행했는지는 관찰 기록·실행 결과·구두 설명으로 확인합니다. 이는 운영 프롬프트의 ‘후보를 말했다는 이유로 비교했다고 부풀리지 않는다’는 원칙을 그대로 적용한 것입니다. [근거와 주장 구분](/Users/greatsong/greatsong-project/10_수업자료/2026-ds-danggok/scripts/oral_watch_prompt.md:16).

AI 미사용 수업에서도 위 checkpoint와 질문·교사 메모·피드백은 모두 사람이 진행할 수 있어야 합니다. 기존 운영 사례의 ‘프롬프트 원문/AI 제안 중 버린 것’ 형식은 AI 사용 수업에서만 선택합니다. AI 미사용 경로에는 ‘받은 도움·비교한 대안·선택한 이유’로 기록합니다. 학생 AI 사용과 교사의 AI 조교 사용을 별도로 허용할지는 수업 설정에서 명확하게 정할 필요가 있으며, 현재의 `aiPolicy` 하나가 이 둘을 이미 구분한다고 설명하지 않습니다. AI를 전혀 사용하지 않는 수업이라면 질문 후보와 피드백도 AI 호출 없이 수동으로 작성할 수 있어야 합니다.

## 그대로 복제하지 않을 구현과 이유

| 운영 환경에 맞춘 선택 | VPyLab에서 필요한 변경 |
|---|---|
| 교사 맥의 launchd·CLI 로그인·절대 경로에 의존 | 이미 VPyLab에 있는 서버 작업 대기열을 바탕으로 수업·프로젝트별 작업과 실행 상태를 관리. 개인 맥이 꺼져도 운영 상태를 파악할 수 있어야 함. 현재 참조 코드는 맥 전용이라고 명시함. [개인 환경 의존](/Users/greatsong/greatsong-project/10_수업자료/2026-ds-danggok/scripts/oral_repo_watch.py:1), [고정 실행 경로](/Users/greatsong/greatsong-project/10_수업자료/2026-ds-danggok/scripts/oral_repo_watch.py:37) |
| 하나의 공유 연결 토큰으로 API action 사용, 브라우저 저장소에 연결 정보 보존 | VPyLab의 검증된 사용자·교사 권한·프로젝트 참여 경계를 유지. 서버의 GitHub App 자격을 학생 브라우저에 보내지 않음. 게시 승인자는 실제 교사 ID로 기록. 참조 구현은 한 교사 운영 앱의 편의 모델로 이해함. [공유 토큰](/Users/greatsong/greatsong-project/10_수업자료/2026-ds-danggok/apps-script/oral/Code.gs:98), [기기 연결 정보](/Users/greatsong/greatsong-project/10_수업자료/2026-ds-danggok/web/teacher/oral/oral.js:227), [VPyLab 신원](/Users/greatsong/greatsong-project/10_수업자료/vpylab/server/classroom/app.js:51) |
| 같은 기록ID의 시트 데이터를 마지막 요청 값으로 갱신 | 잠금은 동시 셀 쓰기를 직렬화하지만 오래된 기기의 수정 충돌을 판별하는 version은 없음. VPyLab의 기준 버전·충돌 복구를 확장해 교사 초안에도 적용. [시트 갱신](/Users/greatsong/greatsong-project/10_수업자료/2026-ds-danggok/apps-script/oral/Code.gs:440), [점수 전체 교체](/Users/greatsong/greatsong-project/10_수업자료/2026-ds-danggok/apps-script/oral/Code.gs:575) |
| 게시 성공 후 시트 URL 기록, ‘올림’ 상태만으로 재게시 억제 | 외부 게시 전 작업ID·승인한 문안 버전·대상 저장소를 확정하고, 성공 여부가 불명확하면 원격 조정 확인을 먼저 수행. 일반 재시도를 무조건 새 댓글 생성으로 연결하지 않음. [CLI 게시 순서](/Users/greatsong/greatsong-project/10_수업자료/2026-ds-danggok/scripts/oral_repo_watch.py:473), [직접 게시 순서](/Users/greatsong/greatsong-project/10_수업자료/2026-ds-danggok/apps-script/oral/Code.gs:1485) |
| 짧은 SHA 기반 초안·질문 ID와 글자 근거 | 프로젝트/원본저장소/전체SHA/원문 근거ID/질문 버전을 연결하고 생성 결과와 교사 결정을 구분. 사람이 사용·숨김한 상태를 보존하는 아이디어는 채택. [현재 ID](/Users/greatsong/greatsong-project/10_수업자료/2026-ds-danggok/scripts/oral_repo_watch.py:453) |
| AI·검증 키워드 정규식으로 log의 후보 근거 추출 | 유용한 검색 힌트로만 사용. 키워드가 있다는 이유로 실제 검증 수행·사고력·AI 미사용 위반을 자동 판정하지 않음. [키워드 추출](/Users/greatsong/greatsong-project/10_수업자료/2026-ds-danggok/scripts/oral_repo_watch.py:197) |
| 학생 저장소와 전사를 모델의 입력으로 사용 | 학생 코드·README·커밋·리뷰는 명령이 아니라 근거 데이터로 처리. 모델에는 수집·요약·초안 권한만 부여하고 게시·비밀 읽기·학생 코드 실행 권한을 주지 않음. 참조 구현도 prompt와 CLI 허용 도구에서 이 구분을 시도함. [입력 취급](/Users/greatsong/greatsong-project/10_수업자료/2026-ds-danggok/scripts/oral_watch_prompt.md:3), [도구 제한](/Users/greatsong/greatsong-project/10_수업자료/2026-ds-danggok/scripts/oral_repo_watch.py:505) |
| 이름·학번이 들어 있는 교사 전용 로그 포맷 | VPyLab의 검증된 계정 ID와 프로젝트 참여를 중심으로 연결하고, 공개 GitHub 글·교사 비공개 메모·학생 전달물을 별도로 구성. 이름만으로 GitHub 활동을 귀속하지 않는 현재 구현을 유지 |

교사 확인 후 게시라는 운영 원칙도 더 명확한 서버 상태가 필요합니다. 예를 들어 초안 A를 교사가 확인한 뒤 자동화가 같은 ID에 문안 B를 쓰거나, 대기 상태의 문안을 다른 기기가 고친다면 ‘교사가 읽은 글’과 ‘실제 게시한 글’이 달라질 수 있습니다. VPyLab에서는 승인한 문안의 버전·내용 hash·대상·공개 범위를 함께 고정하고 변경되면 다시 확인하도록 설계하는 것이 적절합니다. 참조 구현의 취지를 확장하는 제안이며, 현재 운영에서 그런 사고가 발생했다고 주장하는 것은 아닙니다.

## 권장 적용 순서와 완료 기준

1. **AI 없이도 쓸 수 있는 checkpoint 팩과 교사 질문 기록.** 세 경로별로 목표·선수지식·교사 제공 부분·학생 작성 부분·짧은 팀 질문·개인 질문을 준비합니다. 교사는 질문을 사용/수정/숨김 처리하고 학생별 설명을 짧게 남깁니다. 완료 기준은 각 학생이 도움을 줄인 새 조건에서 자기 변경과 판단을 설명하는 것입니다.
2. **근거를 연결한 교사 초안함.** GitHub 근거와 개인/팀 관찰을 원문 위치와 함께 정리하고 초안·교사 수정본·전달본을 구분합니다. 사람이 작성해도 같은 흐름을 사용할 수 있어야 합니다. 비공개 메모를 학생·팀·GitHub로 전달하기 전 공개 범위를 다시 확정합니다.
3. **선택형 AI 질문·피드백 초안.** AI 허용 수업에서만 교사가 명시적으로 사용하고, 생성 결과는 교사 초안함으로만 들어갑니다. 근거가 부족하면 ‘확인할 질문’으로 남기고 검증된 관찰로 바꾸지 않습니다. 생성 실패·비용 제한 중에도 기존 제작·동료 검토·수동 피드백이 동작해야 합니다.
4. **외부 게시와 학기말 근거 묶음.** 게시 대기열의 중복·응답 유실·승인 후 수정·권한 회수·잘못된 대상 저장소를 합성 자료로 검증한 뒤 도입합니다. 학기말에는 학생이 한 일·받은 도움·교사의 관찰을 원문과 함께 묶되 최종 서술과 평가는 교사가 결정합니다.

세 경로에 적용할 때 AI가 작품을 더 길고 복잡하게 생성한 정도를 성취로 보지 않습니다. 운영 사례의 ‘산출물보다 학생의 판단과 설명’ 원칙과 사용자의 ‘코드 난이도를 높이지 않고 기본 문법을 활용’ 요구가 만나는 지점입니다. [운영 원칙](/Users/greatsong/greatsong-project/80_연수및강의/ai-ta-project-assessment/content/review.md:31).

## 이번에 수행한 확인과 남은 검증

실제 운영 코드를 통째로 실행하지 않았습니다. `Code.gs`에서 네트워크·자격 저장소 API를 호출하지 않는 상태 해석·재시도 가능 여부·질문 후보 저장 함수만 추출하고, Node VM의 메모리 시트 stub으로 다음 12개 assertion을 확인했습니다.

- 완료 상태 해석, 대기 재시도, 오류 2회 재시도, 오류 3회 중지, 실패 중지, 새 처리 중 중지, 오래된 처리 중 재시도: 7개.
- 질문 저장 2건·건너뜀 2건, 사용한 원문 유지, 숨긴 원문 유지, 기존 후보의 새 문안 갱신: 5개.

검사는 메모리에서만 실행했으며 참조 프로젝트 파일·학생 자료·운영 서버에 쓰지 않았습니다. 외부 요청·자격 증명 읽기도 하지 않았습니다. 이는 일부 상태 함수의 확인이며 실제 Sheets/Drive/GitHub 게시·오디오 처리·여러 기기 충돌·교육 효과 검증을 대신하지 않습니다. 실제 운영 서비스 가동 여부와 신규 접속 시험은 이번 요청 범위에 포함하지 않았습니다.
