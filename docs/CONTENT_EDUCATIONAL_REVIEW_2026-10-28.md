# 콘텐츠 교육 적절성 종합 검토

검토일: 2026-10-28 · 기준 코드: `9a21ac2` · 브랜치: `codex/classroom-v2`.

**현재 콘텐츠를 그대로 모두 필수 입문 과정으로 운영하기에는 보완이 필요합니다.** 도형·패턴·소리·실험의 소재는 유지하면서, 학생이 직접 작성할 부분을 좁히고 선수학습과 선택 심화를 다시 배치하는 것이 적절합니다. 기본 문법을 결합해 규칙을 발견하는 심화는 남기되, 삼각함수·콜백·복합 엔진 전체 작성을 입문 공통 요구로 두지 않는 방향을 권합니다.

스캐폴딩은 별도로 [스캐폴딩 검토·보완 설계서](/Users/greatsong/greatsong-project/10_수업자료/vpylab/docs/CONTENT_SCAFFOLDING_REVIEW_2026-10-28.md)에 정리했습니다. 이번 작업은 판단과 보고이며 기존 콘텐츠·제품 코드·운영 서비스는 수정하지 않았습니다.

## 별도 병렬 검토팀과 범위

세 담당 에이전트가 각 영역을 전수 검토하고, 총괄 검토자가 목록 대조·API 계약·채점 반례를 독립 확인했습니다.

| 담당 | 전수 범위 | 결과 |
|---|---|---|
| 코스·차시 | 7코스의 46차시 | [차시별 판정과 교사/학생 범위](/Users/greatsong/greatsong-project/10_수업자료/vpylab/docs/content-review/2026-10-28/courses-review.md) |
| 미션·채점 | 54미션의 목표·시작 코드·풀이·힌트·검사 기준 | [미션별 판정과 도움 단계](/Users/greatsong/greatsong-project/10_수업자료/vpylab/docs/content-review/2026-10-28/missions-review.md) |
| 예제·참고문서 | 57예제와 71개 API 문서 | [예제별 판정·API 접근 단계](/Users/greatsong/greatsong-project/10_수업자료/vpylab/docs/content-review/2026-10-28/examples-reference-review.md) |
| 총괄 교차 검토 | 228항목 목록, 282코드의 AST, 주요 API·채점 계약 | [전수 목록 CSV](/Users/greatsong/greatsong-project/10_수업자료/vpylab/docs/content-review/2026-10-28/inventory.csv), [범위·원본 SHA-256](/Users/greatsong/greatsong-project/10_수업자료/vpylab/docs/content-review/2026-10-28/inventory-manifest.json) |

228항목은 차시 46 + 미션 54 + 예제 57 + API 문서 71개입니다. 미션 풀이 54개를 포함한 282개 코드 모두 Python AST 문법 검사를 통과했고, 기존 차시 검증 스크립트도 46개를 통과했습니다. 문법·호출 이름 검사의 확인 범위에 더해 API 인자·동작·교육 설계를 별도로 확인했습니다.

실행 코드 줄 수는 주석·빈 줄을 제외하면 차시 3~23줄(중앙 10), 미션 시작 코드 2~20줄(중앙 10), 예제 13~115줄(중앙 32)입니다. 전체 제공 코드의 길이이며 학생이 직접 써야 하는 분량을 뜻하지 않습니다. 줄 수로 교육 적합 판정을 자동 계산하지 않았습니다.

## 판단 기준과 편성 권고

현재 자료의 학년·레벨 표기를 참고하되, Python 기본 문법을 배우는 학생에게 3D·음악 API 골격은 제공하는 조건으로 검토했습니다. 실제 대상 학년과 선수 경험이 확정되면 조정해야 합니다.

다음 여섯 가지를 함께 보았습니다. 목표가 분명한지, 선수지식이 연결되는지, 새 문법·수학·상태 추적을 한꺼번에 요구하는지, 학생이 바꿀 범위가 명확한지, 도움을 줄인 새 문제에서 설명·적용할 수 있는지, 확인 기준이 목표와 일치하는지입니다.

| 편성 판단 | 차시 | 미션 | 예제 | 합계 |
|---|---:|---:|---:|---:|
| 적합 | 10 | 17 | 1 | **28** |
| 보완후적합 | 24 | 23 | 16 | **63** |
| 선택심화 | 10 | 9 | 27 | **46** |
| 입문경로분리 | 2 | 5 | 13 | **20** |
| 합계 | 46 | 54 | 57 | **157** |

이 수치는 전문가 검토를 대신하는 학습 효과 점수나 학생 성공률이 아닙니다. 소스에 드러난 설계를 바탕으로 한 에이전트팀의 편성 판단입니다. 적합은 관련 선수학습 뒤 짧은 관찰·편집 활동으로 활용 가능한 경우입니다. 보완후적합은 정확성·힌트·편집 범위 등의 보완이 필요합니다. 선택심화는 기초 이후 자발적 도전으로 제공하고, 입문경로분리는 제공 모형을 조작하는 활동과 내부 엔진을 구현하는 활동을 나누자는 의미입니다. 자료 삭제를 권고하는 분류는 아닙니다.

API 문서 71개는 모두 학생에게 작성시킬 과제가 아닙니다. 입문에서 자주 참조할 항목 9개, 필요할 때 찾아볼 항목 46개, 교사가 골격을 제공하거나 선택 심화로 다룰 항목 16개로 구분했습니다. 작품 예제와 참고 문서를 순차 필수 과제로 바꾸면 실제 난이도가 크게 높아집니다.

## 수업 전에 먼저 해결할 정확성·평가 문제

P1은 학생에게 그대로 제공하거나 성취 판단에 사용하기 전에 확인·수정할 사항입니다. 학생의 낮은 이해도나 스캐폴딩 부족으로만 해석해서는 안 됩니다. 아래는 핵심 발견이며 항목별 추가 근거는 담당 보고서에 있습니다.

| 우선 | 대상·발견 | 독립 확인과 교육상 영향 |
|---|---|---|
| P1 | `beg-patterns-2`: 7색 목록을 `range(8)`로 조회 | 원문 코드와 실제 Python API를 연결한 경량 실행에서 `IndexError` 재현. 입문 예제가 그대로 실패하므로 먼저 정정해야 함. [코드](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/courses.js:161) |
| P1 | `pro-toolkit-9`: 산점도 호출 계약 불일치 | `scatter3d(x,y,z,color=...)`가 실제 `scatter3d(points,colors=...)` API와 맞지 않아 `TypeError` 재현. [호출](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/courses.js:1023), [구현](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/engine/vpython-api.py:2111) |
| P1 | 일부 이동 예제의 `ball.pos.x += ...` | 실제 객체의 성분만 수정하면 화면 전달용 update 명령이 생기지 않고, `ball.pos=vector(...)`는 명령을 생성함. 성분 대입이 포함된 예제 5개·참고문서 2개를 정적 목록에서 확인. 각각 전체 동작을 재검증해야 하며 7개 전체가 같은 방식으로 실패한다고 단정하지 않음. [벡터](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/engine/vpython-api.py:52), [위치 setter](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/engine/vpython-api.py:365) |
| P1 | 한글 반음과 문자열 화음 | `도#4→C4#4`, `솔#4→G4#4` 변환과 실제 JS에서 원음과 같은 주파수로 해석됨을 확인. `화음(['도4',...])`는 문자열을 주파수 배열로 보내고 재생 함수는 유효 숫자로 받지 못함. 반음·화음 비교 수업 전에 수정·출력 확인 필요. [변환](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/engine/vpython-api.py:1977), [화음 전달](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/engine/vpython-api.py:2031), [주파수 검사](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/engine/sound-system.js:469) |
| P1 | `radio` 문서 예제의 vector 값 전송 | 문서와 같은 `value=color.red`로 실제 API를 호출한 뒤 명령 전송 시 JSON 직렬화 `TypeError` 재현. 콜백을 배우기 전에 제공 골격부터 작동해야 함. [문서](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/docs.js:984), [구현](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/engine/vpython-api.py:1737) |
| P1 | v2의 CT 문법 목표 확인 누락 | A형 17미션 중 codeChecks를 가진 14미션의 부가 검사가 v2 분기에 반영되지 않음. CT-3의 함수 없는 직접 구 생성 결과가 객체 기준 100점, 함수 기준 0점인 반례 확인. [v2 분기](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/classroom/Workspace.jsx:109), [기존 병행 검사](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/pages/MissionPlay.jsx:198) |
| P1 | 튜토리얼 37개의 실행 확인과 성취 판단 혼용 | 모두 starter=solution, assertions 없음. 무관한 구 하나를 등록한 실제 채점 엔진에서도 gradeRun은 100점. 실행 상태와 관찰·수정·설명의 증거를 분리해야 함. [미션 설정](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/missions.js:13), [판정](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/engine/grading-engine.js:288) |

경량 재현 원문: [Python API 계약](/Users/greatsong/greatsong-project/10_수업자료/vpylab/docs/content-review/2026-10-28/contract-checks.json), [채점·소리 함수](/Users/greatsong/greatsong-project/10_수업자료/vpylab/docs/content-review/2026-10-28/grading-sound-checks.json). Python API는 브라우저 통신만 대체하여 호출했고 JavaScript는 실제 함수를 격리 실행했습니다. 실제 Three.js·Web Audio·Pyodide 화면에서 전수 실행하거나 소리를 청취한 결과는 아닙니다. 발견을 재현한 기록이며 “정상 통과 테스트” 수로 집계하지 않았습니다.

과학·수학 설명도 정리해야 합니다. `rate(60)`과 `dt=0.02`를 같은 시간 간격으로 설명하는 부분, 속도를 갱신하기 전 시간에 찍는 v-t 기록, 속도를 운동에너지로 표시한 예제, 음색 값을 계산한 뒤 고정 sine를 사용하는 예제 등은 [코스 보고서](/Users/greatsong/greatsong-project/10_수업자료/vpylab/docs/content-review/2026-10-28/courses-review.md)와 [예제 보고서](/Users/greatsong/greatsong-project/10_수업자료/vpylab/docs/content-review/2026-10-28/examples-reference-review.md)에 개별 근거를 남겼습니다.

## 교육 설계에서 우선 보완할 부분

1. **입문 필수 경로의 개념 증가를 줄입니다.** `beg-patterns-4`의 중첩 반복·조건·나머지 연산은 단계별 경험 후 선택 심화로, 뒤 두 차시의 삼각함수·꽃 함수는 제공 모형 탐구로 분리합니다. L1 미션 `MA-2/SC-2/AR-1/AR-2/AR-6`도 숫자·패턴 편집과 엔진 작성 경로를 나눕니다.
2. **작품 감상과 독립 구현의 목표를 구분합니다.** `music-childrens-songs` 같은 버튼·다중 자료구조·lambda·재생 루프 예제는 완성본 감상과 짧은 멜로디 편집에 활용하고 전체 구현을 입문 요구로 두지 않습니다. [예제 코드](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/examples.js:2407)
3. **쉬운 문법으로 깊이 생각하는 심화를 남깁니다.** 체스판 규칙, 벽 반사, 규칙+무작위 아트, 짧은 질문·응답 멜로디를 선택 프로젝트로 제공합니다. 입력·고정 조건·반례·설명을 깊게 하고 새 문법 도입은 제한합니다. 전체 참고 목록의 심화 예제를 필수 과정에 모두 넣지 않습니다.
4. **서비스에서도 접근 단계를 안내합니다.** v2 자료실은 현재 제목·분류·설명·코드 중심이며 선수지식·교사 제공 범위·필수/선택 구분을 충분히 보여주지 않습니다. 차시를 합칠 때 코스의 level·학년을 이어주지 않는 경로도 확인했습니다. [자료 변환](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/classroom/curriculum.js:7), [표시](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/classroom/CurriculumLibrary.jsx:25)
5. **과학·음악·창작의 확인 기준을 분리합니다.** 실행 여부, 목표 조건, 비교의 타당성, 표현 의도와 선택 이유를 각각 기록합니다. “예쁘게 들리는가”는 음량·균형·끝맺음·의도 전달에 대한 청취 피드백으로 확인하고, 소리를 못 듣는 환경에는 시각·이벤트 표 대안을 제공합니다.

완성 코드·접힌 힌트·★ 표시·공통 성찰 양식은 계속 활용할 수 있습니다. 차시마다 편집 경계, 예측 질문, 중간 확인, 점진적 힌트, 도움을 줄인 새 과제를 붙이는 구체안은 [스캐폴딩 별도 보고서](/Users/greatsong/greatsong-project/10_수업자료/vpylab/docs/CONTENT_SCAFFOLDING_REVIEW_2026-10-28.md)에 있습니다.

## AI 수업과 GitHub 협력 기록

핵심 학습 목표는 AI 없이 수행 가능해야 합니다. 현재 콘텐츠의 도움 부족을 AI의 코드 대필로 메우도록 요구하지 않습니다. AI 사용 수업도 최초 예상, 채택·거절 이유, 실제 비교와 새 조건 적용을 같은 기준으로 봅니다.

GitHub에는 예상·고정 조건을 Issue에, 작은 변경과 관찰을 PR에, 동료의 반례를 리뷰에, 판단 수정을 후속 기록에 연결할 수 있습니다. 초기에 Git 작업 전체를 학생에게 동시에 가르치지 말고 교사가 저장소·제출 골격을 제공합니다. 교사의 구두 관찰과 학생의 스케치도 근거로 보존하며 커밋 수·코드 길이로 개인의 사고력이나 기여도를 환산하지 않습니다.

## 보완 순서와 검증 한계

우선 실행·음높이·API·확인 기준의 P1 문제를 해결하고, 입문 필수 경로를 좁힌 뒤 핵심 차시에 스캐폴딩을 붙이는 순서를 권합니다. 그다음 AI 사용/미사용 두 수업에서 실제 학생이 편집할 곳을 찾고, 이유를 설명하고, 도움을 줄인 새 조건에 적용하는지를 파일럿으로 확인합니다.

이번 판단은 코드·설명·노출 경로의 전수 소스 검토와 일부 계약 재현입니다. 실제 학생의 수행·오류율·완료 시간, 교사의 현장 수업, 학교 기기 청취, 전체 콘텐츠의 브라우저 동작을 실증하지 않았습니다. 원본 콘텐츠 5개 파일의 SHA-256 보존을 확인하며, 구현 수정과 운영 교체는 이번 작업에 포함하지 않았습니다.
