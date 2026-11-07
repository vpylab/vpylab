# 예제·API 참고문서 교육 검토

검토일: 2026-10-28. 병렬 교육 검토팀의 예제·참고문서 담당 보고서. 현재 `codex/classroom-v2`의 예제 57개와 API 문서 71개를 모두 읽고, 설명·코드·화면 난이도 표기·Python API 및 브릿지의 관련 구현을 교차 확인했다. **자료는 수정하지 않았다.**

## 판정의 전제

사용자가 제시한 기준은 “학생이 작성하는 코드는 어렵지 않아야 하며, 기본 문법을 조합해 생각하는 심화는 일부 허용”이다. 따라서 작품의 시각적 완성도와 학생에게 요구하는 작성 난이도를 구별했다. 변수를 바꾸고 관찰하는 완성본과, 똑같은 프로그램 전체를 학생이 작성하는 과제는 난이도가 크게 다르다. API 71개는 조회용 참고문서이며 전부 학습하거나 구현해야 하는 필수 과제가 아니다.

예제 `level`은 현재 화면에서 1=쉬움, 2=보통, 3=도전으로 표시된다([표시 코드](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/pages/Examples.jsx:29)). 아래 판정은 **현재 코드를 통째로 초보 학생에게 맡기는 경우의 부담과, 이를 적절한 학습 활동으로 사용할 조건**을 함께 판단한 것이다.

- **적합**: 기본 호출·대입·좌표 수정만으로 목표를 달성할 수 있다. 작은 관찰 질문은 여전히 필요하다.
- **보완후적합**: 소재와 핵심 활동은 적절하다. 선행 개념·학생 수정 구역·단계별 힌트 및 명시된 정확성 문제를 보완하면 기본 문법 중심으로 운영할 수 있다.
- **선택심화**: 본수업의 필수 통과 경로에서 빼고, 수식·상태 관리·렌더링 부분을 교사가 제공하는 선택 활동으로 쓴다. 학생에게 고급 구문 유도를 요구하지 않는다.
- **입문경로분리**: 현재 쉬움/보통 표시 또는 겉으로 보이는 활동과 전체 코드 부담의 차이가 크다. 감상용 완성본은 보존하되 별도의 짧은 학생용 버전이 필요하다.

API 접근 단계는 해당 기능을 쓰는 수업 기준이다. `입문필수`도 모든 수업에서 전부 외워야 한다는 뜻은 아니다. 특히 음악은 소리를 쓰는 수업에서 선택하며 음소거·시각 대체 활동을 제공한다.

## 결론과 분포

교육 소재의 폭과 시청각 피드백은 강점이다. 그러나 완성 작품 갤러리의 난이도 표시를 초보자의 **작성 난이도**로 읽으면 적절하지 않은 항목이 많다. 함수·딕셔너리·콜백·2차원 리스트·복잡한 물리식을 동시에 설명해야 하는 예제가 있어, 기본 문법의 사고력 과제와 제공 엔진의 경계를 먼저 정해야 한다. 정답 코드를 짧게 보이게 하는 컴프리헨션·생성기식·lambda는 필수화할 이유가 없다.

예제 57개 판정: **적합 1개**, **보완후적합 16개**, **선택심화 27개**, **입문경로분리 13개**.

API 문서 71개 접근 단계: **입문필수 9개**, **필요시참고 46개**, **교사제공·선택심화 16개**.

## 주요 발견 10개

### 1. P1 · 성분 변경 문법이 화면 갱신으로 이어지지 않는 예제와 문서

[cannon의 위치 갱신](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/examples.js:561), [bounce-ball](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/examples.js:982), [shooting-stars](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/examples.js:95), [keysdown 문서](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/docs.js:880)는 `ball.pos.x += ...` 또는 `star.pos.y -= ...`를 가르친다. 그러나 [vector의 성분](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/engine/vpython-api.py:52)은 일반 Python 필드이고, 브릿지 갱신은 [객체 pos setter](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/engine/vpython-api.py:367)에서만 발생한다. [전처리기](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/engine/code-preprocessor.js:90)도 위치 변경을 보정하지 않는다.

실제 Python API 파일을 읽어 `js`만 stub한 경량 재현에서 `ball.pos.x += 1`은 Python 값만 바뀌고 갱신 명령 0개, `ball.pos = vector(2, 0, 0)`은 갱신 명령 1개였다. 이는 학생의 조건문·좌표 이해 부족과 무관한 실행 계약 문제다. 설명/발판 추가에 앞서 예제와 지원 구현을 맞춰야 한다. 기존 정상 애니메이션 패턴인 `ball.pos += vector(...)`는 객체 pos setter를 거치므로 이 문제와 구별한다.

### 2. P1 · radio 문서의 제공 코드는 JSON 직렬화에 실패

[radio 문서](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/docs.js:980)는 `value=color.red` 같은 vector를 전달한다. [radio 구현](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/engine/vpython-api.py:1737)은 이를 변환하지 않고 `radio_value`에 둔다. 실제 API를 stub 환경에서 `radio(..., value=color.red); _send_commands()`로 확인하면 `TypeError: Object of type vector is not JSON serializable`가 발생한다. 초보자가 그대로 복사해도 실패하는 참고 코드이므로 내용 난이도와 분리해 먼저 수정할 정확성 문제다. 문자열 선택값→색 매핑을 제공하거나 vector 왕복 계약을 구현해야 한다.

### 3. P2 · “쉬움”이 코드 작성의 쉬움을 뜻하지 않는 항목

[music-childrens-songs의 level 1](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/examples.js:2407)은 긴 악보 외에도 [lambda 4개·요청 큐·중첩 재생 루프](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/examples.js:2487)가 필요하다. [surface-plot의 level 1](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/examples.js:632)은 22행의 원본 문자열 안에 2차원 리스트와 삼각함수의 좌표 스케일이 들어 있다. rain/rhythm-viz/christmas-tree도 리스트·상태·중첩 루프를 결합한다. 쉬운 감상/숫자 변경 활동임을 명시하고 별도 학생용 짧은 코드와 작성 범위를 제공해야 한다. 원본 문자열 행 수에는 주석·빈줄이 들어가므로 실행문 수나 난이도 점수로 사용하지 않았다.

### 4. P2 · 일부 “보통” 작품의 여러 엔진이 한꺼번에 노출

[lightshow-piano-fountain](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/examples.js:3045)은 2차원 입자 풀·비활성 상태·속도·불투명도·음표 인덱스·조명을 동시에 관리한다. [lightshow-aurora-symphony](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/examples.js:2969), [synesthesia-color-piano](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/examples.js:3278)도 여러 상태가 얽힌다. 코드가 기본 for/if로만 구성돼도 동시에 추적할 값이 많으면 입문 난이도가 되지 않는다. 교사가 제공하는 완성 엔진과 학생의 1~3개 매개변수/규칙 변경 구역을 구별한다.

### 5. P2 · 예제 단위의 스캐폴딩 계약이 빠져 있음

[예제 데이터](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/examples.js:10)는 제목·설명·태그·level·완성 코드 중심이며 선행 지식, 탐구 질문, 학생 수정 구역, 점진 힌트, 성공의 증거를 갖는 구조가 없다. [카드를 눌러 전체 코드를 로드하는 흐름](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/pages/Sandbox.jsx:1394)은 시연에 적절하지만 그 자체로 단계적 과제가 되지는 않는다. 일부 좋은 주석과 조작 안내가 있어도 개념 예측→한 줄 변경→관찰→설명→힌트 축소를 대체하지 못한다. 아래 57개 표의 필요 발판을 콘텐츠별 계획으로 삼고, 별도 스캐폴딩 보고서와 함께 우선순위를 정한다.

### 6. P2 · 과학·수학 모델의 한계를 개념과 분리해 설명해야 함

[pendulum](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/examples.js:704)은 속도에 비례한 화살표를 운동에너지 표시라고 부른다. 운동에너지는 속도의 제곱에 비례하므로 속도 표시로 이름을 바꾸거나 질량을 정한 에너지식을 제공해야 한다. [정사면체 좌표](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/examples.js:1431)는 계산하면 모서리 3개 약 1.4402, 나머지 3개 약 1.6330으로 모두 같지 않다. 정사면체 정의를 오해시키므로 좌표 검증이 필요하다. [도플러](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/examples.js:2013)는 접근/이탈에 따른 주파수를 직접 선택하는 단순화된 모형임을 코드에 적었으므로 그 한계를 교사용/학생용 설명에도 유지한다. [합성파](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/examples.js:2065)의 시각화 시간은 물리적 초 그대로가 아니므로 스케일을 명시하고, 가까운 주파수 맥놀이와 도·미 화음을 같은 관찰이라고 평가하지 않는다.

### 7. P2 · 설명에서 약속한 음색/진폭/움직임과 실제 변경이 다름

[pitch-painter](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/examples.js:3394)는 좌우로 음색 이름을 계산하지만 [재생](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/examples.js:3415)은 `'sine'` 고정이라 좌우 변화로 음색을 들을 수 없다. [music-sine-wave의 진폭 콜백](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/examples.js:1899)은 화면 곡선만 바꾸고 소리 진폭은 바꾸지 않으므로 그래프 진폭과 음량의 관계를 실제 조작과 맞춰 설명해야 한다. [planet-collision의 폭발 진행](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/examples.js:1061)은 입자에 velocity만 주고 이후 위치를 갱신하지 않는다. [velocity setter](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/engine/vpython-api.py:413)는 값을 저장할 뿐 자동 물리 엔진이 아니다. 모형을 예측한 학생에게 관찰이 맞지 않는 이유를 떠넘기지 않아야 한다.

### 8. P2 · 오랜 감상/수업 기기 부하를 고려한 발판 부족

[cosmic-aurora-veil](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/examples.js:3559)은 60×20=1200개 커튼 구를 만들고 [40회 루프](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/examples.js:3581)에서 각 객체 pos/color/opacity를 갱신한다. 설정상 커튼만 약 144,000개 갱신 명령/초이며, 실제 FPS나 처리량을 측정한 수치는 아니다. [music-note-fireworks](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/examples.js:2244)의 `MAX_PARTICLES=200`은 실제 생성 제한에 쓰이지 않는다. [music-endless-cosmos](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/examples.js:2893) 등은 목록에서 제거한 객체를 visible=False로 숨기지만 [브릿지](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/engine/vpython-bridge.js:727)는 이를 메쉬/레지스트리 해제로 처리하지 않는다. 긴 수업의 메모리 상한을 보장하는 구조가 아니다. 낮은 개수·유한 실행을 기본 발판으로 제공하고, 객체 풀/명시적 정리와 정지·음소거 안내는 교사가 제공한다. 장시간 기기별 부하 시험은 후속 검증이다.

### 9. P2 · 한글 음표 지원과 별칭의 대기 동작이 학습 계약과 어긋날 수 있음

[문서가 허용하는 `도#4`](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/docs.js:1357)는 [_resolve_note_name](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/engine/vpython-api.py:1977)에서 짧은 `'도'`가 먼저 매치되어 `C4#4`가 된다. 경량 재현으로 `도#4→C4#4`, `솔#4→G4#4`, `높은도→높은도`를 확인했다. [음정 변환기](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/engine/sound-system.js:539)는 `C4#4`를 C4로 읽을 수 있어 반음 과제의 소리가 다르게 나온다. 또한 `sound/play_sound`, `chord/play_chord`, `play_instrument`는 비대기이고 [한글 음표/화음](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/engine/vpython-api.py:2225)과 [악기](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/engine/vpython-api.py:2392)는 대기한다. 쉬운 한글 API를 기본 경로로 유지하되 영어 별칭과 동등한 시간 동작이라고 가르치지 않는다. 한글 높은 음은 현재 지원에 맞게 `도5`처럼 표기하고 변환 계약을 먼저 수정한다.

### 10. P3 · API 참고 예제에서 결과를 바로 확인하기 어려운 표현

[curve 문서](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/docs.js:285)는 곡선을 생성한 직후 clear()해 완성 곡선을 보려는 초보자에게 빈 화면을 줄 수 있다. [pyramid 문서](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/docs.js:191)는 직사각 밑면/꼭짓점 기준 위치라고 설명하지만 [브릿지](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/engine/vpython-bridge.js:415)는 두 폭 중 최대값을 사용한 원뿔 메시를 중심 위치에 배치한다. 참고 API의 이름을 외우게 하기보다 각 항목을 작은 입력→보이는 결과→한 값 변경으로 제시하고, 구현에서 단순화한 기하 특성은 명시한다. 위 표의 이슈는 기하 교육에 실제 사용하기 전 P2로 승격해 처리할 수 있다.

## 57개 예제 전수 판정

표의 “강함”은 콘텐츠 폐기를 뜻하지 않는다. 교사 제공 부분을 정해 학생의 수정 범위를 줄이면 해당 소재를 계속 사용할 수 있다는 뜻이다. 정확성 결함은 발판만 추가해서 해결되지 않으므로 먼저 수정해야 한다.

| ID · 원문 | 표시 level | 판정 | 핵심 부담 | 필요한 스캐폴딩 |
|---|---:|---|---|---|
| [solar-system](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/examples.js:11) | 2 | 보완후적합 | 다중 리스트·튜플 풀기·사용자 속성·삼각함수 | 강함: 궤도 수식 제공, 행성 1개→2개→데이터표 |
| [shooting-stars](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/examples.js:57) | 1 | 입문경로분리 | 무작위·중첩 반복·객체 수명·pos 성분 변경 오류 | 강함: 별 1개·유한 40회, 색/속도 1개만 수정 |
| [dna-helix](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/examples.js:104) | 2 | 선택심화 | 라디안·위상차·나머지·약 350개 객체 | 강함: 원 위 점 4개→두 가닥, 수식은 제공 |
| [galaxy](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/examples.js:151) | 2 | 선택심화 | 중첩 반복·atan2·거리별 회전·240개 객체 | 강함: 별 8개, 각도/거리 상태표와 회전 제공 |
| [rain](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/examples.js:200) | 1 | 입문경로분리 | 리스트·사용자 속성·무작위·중첩 while/for | 강함: 빗방울 1개→3개, 낙하/리셋 분리 |
| [music-box](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/examples.js:251) | 2 | 보완후적합 | enumerate(zip())·사용자 속성·나머지·await 혼용 | 강함: 음 3개와 막대 1개부터, 재생기는 제공 |
| [rainbow-xylophone](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/examples.js:300) | 1 | 입문경로분리 | 리스트·역방향 range·중첩 반복·await·성분 변경 | 강함: 3음 유한 반복, 막대 움직임 구현 수정 후 제공 |
| [fireflies](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/examples.js:347) | 2 | 선택심화 | 3축 삼각함수·위상·조명·확률 발음 | 강함: 반딧불 1마리, 밝기→음 전환표와 발음 간격 |
| [rhythm-viz](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/examples.js:407) | 1 | 입문경로분리 | 2차원 패턴·enumerate·나머지·await | 강함: 1악기 4박→2악기, 0/1 패턴표 |
| [space-bgm](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/examples.js:461) | 1 | 입문경로분리 | 200개 별·다중 삼각함수·영구 BGM | 강함: 배경 10개·이동 1축, BGM 정지/음소거 안내 |
| [cannon](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/examples.js:516) | 2 | 보완후적합 | 삼각함수·vx/vy·Euler 갱신·pos 성분 변경 오류 | 강함: 속도 분해 제공, 예측→발사→거리표; 구현 정합성 먼저 |
| [wave-sim](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/examples.js:575) | 2 | 선택심화 | 2차원 객체 배열·이중 순회·감쇠 파동식 | 강함: 구 5개 선형파→5×5, 수식 제공 |
| [surface-plot](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/examples.js:628) | 1 | 입문경로분리 | 22줄이어도 2차원 배열·sin/cos·좌표 스케일 | 강함: 3×3 직접 높이 표→제공 수식, 색상만 먼저 |
| [pendulum](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/examples.js:659) | 2 | 선택심화 | 각속도·각가속도·Euler·에너지 표시 부정확 | 강함: 운동식 제공, 길이만 비교; 속도/에너지 구별 |
| [fireworks](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/examples.js:718) | 2 | 선택심화 | async def/await·구면 방향·입자 수명·계속 생성 | 강함: 8입자 1회, 입자 함수 제공·반복 상한 |
| [christmas-tree](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/examples.js:778) | 1 | 입문경로분리 | 삼각함수·zip/enumerate·조명 20개·상시 BGM | 강함: 정적 나무→장식 3개→깜빡임, 음악 선택 |
| [kaleidoscope](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/examples.js:834) | 2 | 보완후적합 | 중첩 반복·대칭 각·사용자 속성·색 나머지 | 강함: N=3 정적 배치, 회전 제공 후 대칭 수만 변경 |
| [neon-city](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/examples.js:889) | 1 | 보완후적합 | 49줄·무작위·조건 안 중첩 반복·다수 조명 | 중간: 건물 1개→3개, 창문 생성기는 제공 |
| [bounce-ball](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/examples.js:951) | 1 | 입문경로분리 | 3축 충돌·속도 반전·나머지·성분 변경 오류 | 강함: x축 한 벽부터, y/z 분리; 브릿지 정합성 먼저 |
| [planet-collision](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/examples.js:1010) | 2 | 선택심화 | 중력 벡터·역제곱·폭발 분기; 입자 이동 누락 | 강함: 중력 모델 제공, 충돌 임계값만 탐구; 폭발 수정 필요 |
| [showcase-shapes](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/examples.js:1088) | 1 | 적합 | 기본 생성 호출·좌표/크기·라벨의 정적 조합 | 가벼움: 도형 하나 골라 크기/위치 비교, 축 안내 |
| [showcase-curve](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/examples.js:1127) | 2 | 보완후적합 | 사인/코사인·300점 반복·rate(120) | 중간: 점 5개 직선→제공 함수, 곡선/수식 대응 |
| [showcase-clone-rotate](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/examples.js:1162) | 2 | 보완후적합 | 라디안·회전 메서드·조건식 표현식 | 강함: 복제 1개→4방향, if/else 풀어 쓰기·각도표 |
| [showcase-event-click](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/examples.js:1210) | 3 | 보완후적합 | 콜백·None·이벤트 디스패치·무제한 생성 | 중간: 핸들러 골격 제공, 반지름/색만 학생 작성 |
| [showcase-keyboard-bouncing](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/examples.js:1256) | 3 | 보완후적합 | 키 이벤트·속도/벽 보정·조건식 표현식 | 강함: 한 축 입력→멈춤→충돌, 입력/물리 블록 분리 |
| [showcase-slider-control](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/examples.js:1315) | 2 | 보완후적합 | 콜백 2개·위젯·이벤트 루프 | 중간: 슬라이더 1개 완성 골격, 반지름 대입만 작성 |
| [showcase-vertex-rainbow](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/examples.js:1363) | 2 | 선택심화 | 저수준 메시·선형 색 보간·경계 인덱스·삼각함수 | 강함: 삼각형 1개→3조각, 색 보간은 제공 |
| [showcase-platonic-solids](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/examples.js:1412) | 3 | 선택심화 | 정점/면 인덱스·zip·제곱근·정사면체 좌표 검증 | 강함: 좌표표 제공, 한 면 색만 변경; 정사면체 설명 수정 |
| [showcase-extrusion-tube](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/examples.js:1482) | 3 | 선택심화 | 함수 반환·조건식·리스트 컴프리헨션·압출 | 강함: 단면/경로 제공, 기존 for로 풀어 보인 선택 과제 |
| [showcase-keysdown-spaceship](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/examples.js:1530) | 3 | 보완후적합 | 동시 입력·compound·wrap; Space 안내/동작 불일치 | 중간: 한 방향→동시 키→경계, Space 동작 명확화 |
| [showcase-mouse-follow](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/examples.js:1587) | 2 | 보완후적합 | 벡터 뺄셈·보간·마우스 폴링 | 중간: 즉시 따라가기→0.1 계수, 계수 범위·초기 상태 |
| [showcase-graph-functions](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/examples.js:1632) | 3 | 선택심화 | 딕셔너리 상태·여러 콜백·A/B/C 사인식 | 강함: A만 조절→B→C, 파형 예측표와 제공 재그리기 |
| [showcase-scatter-regression](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/examples.js:1690) | 3 | 선택심화 | 생성기식·최소제곱 수식·확률 데이터 | 강함: 데이터/회귀 함수 제공, 이상점 1개 실험; 유도 요구 안 함 |
| [showcase-pendulum-trail](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/examples.js:1745) | 2 | 선택심화 | 미분방정식·Euler·감쇠·삼각함수 | 강함: 물리 엔진 제공, L/각도 중 하나만 비교·관찰표 |
| [music-frequency-tower](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/examples.js:1808) | 2 | 보완후적합 | enumerate+튜플 풀기·비례·f문자열 | 중간: 2음 탑부터, 주파수 자료표와 높이 빈칸 |
| [music-sine-wave](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/examples.js:1855) | 3 | 선택심화 | 딕셔너리·콜백 2개·재그리기·진폭/주파수 | 강함: 한 조절기부터, 화면 진폭과 음량 차이 명시 |
| [music-fibonacci-rhythm](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/examples.js:1917) | 2 | 보완후적합 | 튜플 자료·중첩 반복·수열·반복 재생 | 중간: [1,2,3] 세 묶음, 박자수/박자간격 표현 구별 |
| [music-doppler](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/examples.js:1972) | 3 | 선택심화 | 중첩 반복·조건식·물리 단순화·연속 사운드 | 강함: 주파수 두 값 제공, 실제 속도식과 다른 모형 명시 |
| [music-wave-interference](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/examples.js:2035) | 3 | 선택심화 | 세 곡선·스케일된 사인식·합성파/간섭 설명 | 강함: 동일 f·위상 비교→근접 f 맥놀이, 실제 단위 명시 |
| [music-planet-orchestra](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/examples.js:2088) | 3 | 선택심화 | 궤도·사용자 상태·영역 나머지·발음 중복 방지 | 강함: 행성 1개→2개, 정렬과 개별 통과 구분 |
| [music-rainbow-piano](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/examples.js:2153) | 2 | 보완후적합 | 객체 내부 _id·딕셔너리·콜백·복귀 루프 | 강함: 매핑/콜백 골격 제공, 3건반→학생 멜로디 |
| [music-note-fireworks](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/examples.js:2218) | 3 | 선택심화 | 이벤트·인덱스 클램프·입자 수명·리스트 슬라이스 | 강함: 5입자 1회→클릭, 실제 생성 상한·정리 제공 |
| [music-mario-dance](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/examples.js:2297) | 2 | 입문경로분리 | 95줄·6종 분기·긴 튜플 악보·영구 재생 | 강함: 제공 연주기/악보 분리, 4음 변주만 학생 작성 |
| [music-childrens-songs](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/examples.js:2403) | 1 | 입문경로분리 | 107줄·lambda 4개·딕셔너리 요청 큐·긴 악보 | 강함: 재생기 제공, 버튼 선택/4음 변경, 정지 안내 |
| [music-game-themes](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/examples.js:2520) | 2 | 입문경로분리 | 137줄·lambda·입자/재생 큐·갱신 루프 분리 | 강함: 감상용 완성본, 악보 4음 변주만; 재생 중 입자 갱신 보완 |
| [music-piano-recorder](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/examples.js:2668) | 3 | 선택심화 | 159줄·상태기계·시간기록·예외·중첩 매핑 | 강함: 완성 도구 제공, 입력→기록→재생 별도 모듈 |
| [music-endless-cosmos](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/examples.js:2838) | 3 | 선택심화 | 계속 생성·조건식·수명·음색 무작위 | 강함: 20음 유한 실행, 객체 재사용과 생성 규칙 탐구 |
| [lightshow-aurora-symphony](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/examples.js:2912) | 2 | 선택심화 | 86줄·여러 상태·색 분기·다중 조명/삼각함수 | 강함: 배경/음악/광원 제공, 파동 폭 하나만 조절 |
| [lightshow-piano-fountain](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/examples.js:3007) | 2 | 선택심화 | 96줄·2차원 입자 풀·수명/속도·여러 상태 | 강함: 분수 1개→3개, 입자 풀 제공·상태 전이표 |
| [lightshow-galaxy-disco](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/examples.js:3112) | 3 | 선택심화 | 126줄·다중 루프·조명/타일·여러 색 수식 | 강함: 완성 작품 감상, 박자/색 한 규칙만 변경 |
| [synesthesia-color-piano](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/examples.js:3247) | 2 | 입문경로분리 | 79줄·이벤트 큐·자동 상태·두 입력 방식 | 강함: 클릭 3건반→자동 별도 선택, 공감각은 작품 매핑으로 설명 |
| [synesthesia-pitch-painter](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/examples.js:3335) | 3 | 선택심화 | 82줄·콜백 4개·매핑 함수·수명·음색 미적용 | 강함: 높이→음 1매핑, 음색 적용 수정 후 x매핑 추가 |
| [synesthesia-aurora-orchestra](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/examples.js:3426) | 3 | 선택심화 | 101줄·6콜백·여러 상태·시청각 파라미터 혼합 | 강함: 주파수/밝기/화음 각각 한 단계, 모형/예술 연결 구별 |
| [cosmic-aurora-veil](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/examples.js:3536) | 2 | 입문경로분리 | 60×20=1200개 구·3중 갱신·초당 40회 | 강함: 기본 8×4 저부하판·수식 제공, 디스플레이 심화 분리 |
| [cosmic-firefly-choir](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/examples.js:3621) | 3 | 선택심화 | 100개 딕셔너리·위상/확률·중복 발음 상태 | 강함: 5마리·발음 쿨다운 제공, 확률만 비교 |
| [cosmic-galaxy-grow](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/examples.js:3709) | 3 | 선택심화 | 102줄·중첩 상태·계속 생성·궤도/출생/사라짐 | 강함: 별 12개·유한 생성, 생명주기/시각화 엔진 제공 |
| [texture-showcase](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/examples.js:3820) | 1 | 보완후적합 | getattr·enumerate·몫/나머지·외부 URL 의존 | 중간: 프리셋 3종 직접 이름부터, 외부 이미지는 선택 |

## 71개 API 문서 전수 접근 단계

모든 항목은 해당 이름/관련 메서드의 Python 지원 구현 존재를 확인하고 문서의 예제·시그니처·주요 파라미터를 읽었다. 존재 확인은 모든 인자·상호작용·브라우저 렌더링이 검증되었다는 뜻이 아니다. 별도 문제를 확인한 radio·성분 변경·한글 반음·기하 설명은 위 주요 발견과 함께 읽어야 한다.

| ID · 원문 | 권장 접근 단계 | 지원 확인과 보완점 |
|---|---|---|
| [sphere](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/docs.js:23) | 입문필수 | radius/color/pos만 먼저; velocity는 저장값이며 자동 이동 아님 명시 |
| [box](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/docs.js:48) | 입문필수 | size의 x/y/z 도해; 속성 1개씩 바꾸기 |
| [cylinder](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/docs.js:71) | 필요시참고 | pos=밑면, axis=방향+길이 도해 |
| [arrow](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/docs.js:94) | 필요시참고 | 위치와 방향 차이; 힘/속도 수식은 교사 제공 |
| [cone](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/docs.js:117) | 필요시참고 | axis·밑면 위치 도해; 원기둥 다음 제시 |
| [ring](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/docs.js:140) | 필요시참고 | 반지름/두께 비교, 기본 축과 화면 방향 표시 |
| [compound](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/docs.js:163) | 필요시참고 | 리스트 선행; 두 도형만 묶는 최소 예제 |
| [pyramid](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/docs.js:187) | 필요시참고 | 직사각 밑면/꼭짓점 위치 설명을 실제 ConeGeometry 구현과 맞춤 |
| [ellipsoid](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/docs.js:207) | 필요시참고 | size가 지름/폭임을 sphere 반지름과 나란히 비교 |
| [helix](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/docs.js:226) | 필요시참고 | radius/length/coils 중 하나씩; 삼각함수 내부 구현 학습 불필요 |
| [label](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/docs.js:249) | 필요시참고 | 문자열/좌표·height 픽셀 단위, 정적 예제로 시작 |
| [curve](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/docs.js:272) | 필요시참고 | 예제가 마지막 clear로 곧바로 지워짐; 그리기와 지우기 예제 분리 |
| [points](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/docs.js:294) | 필요시참고 | 픽셀 size와 sphere radius 단위 차이 |
| [frame](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/docs.js:314) | 교사제공·선택심화 | 호환용 별칭; 초급 기본 경로에는 compound 한 이름만 |
| [object-clone](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/docs.js:334) | 필요시참고 | **kwargs 설명보다 clone(pos=...)만 먼저; 원본/복제 비교 |
| [object-rotate](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/docs.js:352) | 필요시참고 | 라디안·origin·axis 도해; 90도 회전 상수 제공 |
| [object-attach-trail](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/docs.js:372) | 필요시참고 | 위치 전체 대입 최소 이동 3회; retain 상한 안내 |
| [object-clear-trail](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/docs.js:391) | 필요시참고 | 지우기 전 실제 이동 예시, 외부 실행 정지와 차이 |
| [vertex](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/docs.js:409) | 교사제공·선택심화 | 위치/색 정점 자료를 제공; normals 수학은 선택 |
| [triangle](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/docs.js:431) | 교사제공·선택심화 | 정점 3개 도해와 순서, 생성 템플릿 제공 |
| [quad](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/docs.js:450) | 교사제공·선택심화 | 문서는 시계방향이나 예시는 반시계; 구현 DoubleSide와 의미 맞춤 |
| [extrusion](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/docs.js:472) | 교사제공·선택심화 | 단면/경로 자료 제공; 컴프리헨션 대신 기본 for 대안 |
| [vector](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/docs.js:497) | 입문필수 | 처음에는 좌표 묶음만; mag/hat은 필요시. pos.x 변경의 브릿지 제한 보완 |
| [mag](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/docs.js:522) | 필요시참고 | 3-4-5 예제와 거리 그림; 제곱근 유도 선택 |
| [hat](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/docs.js:541) | 필요시참고 | 길이 1인 방향 그림, 영벡터 동작(0 반환) 명시 |
| [dot](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/docs.js:560) | 교사제공·선택심화 | 내적 수학은 본수업 필수에서 제외, 직각 판정으로 한정 |
| [cross](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/docs.js:580) | 교사제공·선택심화 | 외적·오른손 규칙 도해, 계산 자체는 제공 |
| [norm](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/docs.js:601) | 필요시참고 | hat과 같은 기능이므로 한 이름을 기본으로 선택 |
| [vector-clone](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/docs.js:619) | 필요시참고 | 복제/공유 차이를 작은 표로; 객체 clone과 구분 |
| [vector-proj](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/docs.js:636) | 교사제공·선택심화 | 투영·성분 그림과 두 출력의 자료형 차이 |
| [vector-diff-angle](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/docs.js:655) | 교사제공·선택심화 | 라디안→도 변환 제공; 영벡터 결과 한계 명시 |
| [vector-rotate](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/docs.js:675) | 교사제공·선택심화 | Rodrigues 공식 유도 불필요; 90도 상수/축 도해 |
| [rate](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/docs.js:697) | 입문필수 | 유한 반복부터; rate와 dt는 별도이며 rate만으로 물리시간 보장 아님 |
| [sleep](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/docs.js:717) | 필요시참고 | 실행 대기와 소리 길이 구별; 기다리는 중 정지 안내 |
| [scene_background](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/docs.js:735) | 입문필수 | 색상 한 호출; scene.background와 같은 목적의 대안임 명시 |
| [local_light](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/docs.js:753) | 필요시참고 | emissive와 조명 차이, 낮은 개수 기본값 |
| [distant_light](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/docs.js:773) | 필요시참고 | 위치 대신 방향; 기본 조명과 겹침 비교 |
| [scene-object](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/docs.js:793) | 필요시참고 | range/center/autoscale 개별 예시; title/caption 콘솔 대체 명확함 |
| [scene-bind](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/docs.js:819) | 필요시참고 | 콜백 골격·rate 필요·evt.pos None 가드 추가; 데코레이터 선택 |
| [scene-mouse](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/docs.js:844) | 필요시참고 | 좌표 평면/처음 상태 설명, 보간 계수만 바꾸기 |
| [keysdown](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/docs.js:862) | 필요시참고 | 한 축 기본 코드부터; pos.x/y 성분 변경의 브릿지 정합성 수정 필요 |
| [slider](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/docs.js:885) | 필요시참고 | 콜백/evt.value 골격 제공; 하나의 속성만 바꾸는 예시는 적절 |
| [button](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/docs.js:913) | 필요시참고 | 콜백 틀 제공, 무작위 RGB 대신 고정색 두 가지 먼저 |
| [checkbox](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/docs.js:938) | 필요시참고 | True/False와 checked/evt.value 구별 |
| [radio](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/docs.js:963) | 교사제공·선택심화 | P1: value=color.red 제공 예제가 _send_commands에서 vector JSON 직렬화 실패; 문자열 매핑 또는 왕복 지원 필요 |
| [menu](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/docs.js:992) | 필요시참고 | 선택→숫자 사전은 제공, 리스트 변환·사용자 속성 부연 |
| [winput](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/docs.js:1022) | 교사제공·선택심화 | 빈 값/잘못된 숫자 처리와 반환 자료형 안내 |
| [graph](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/docs.js:1048) | 필요시참고 | 그래프 틀 제공, 3개 고정 점→선 순서로 진입 |
| [gcurve](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/docs.js:1073) | 필요시참고 | sin/cos 대신 기본 y=2*x 예시 먼저; 단위/plot 순서 |
| [gdots](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/docs.js:1096) | 필요시참고 | random.gauss 대신 관측값 5개, 산점/인과 추론 구별 |
| [gvbars](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/docs.js:1119) | 필요시참고 | 지정값과 축 이름/단위 연결; enumerate는 기본 for 대안 |
| [ghbars](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/docs.js:1141) | 필요시참고 | plot(가로값,세로위치) 순서를 세로 막대와 비교 |
| [color-palette](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/docs.js:1164) | 입문필수 | 30색 암기 대상 아님; 기본 4~7색부터 |
| [korean-colors](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/docs.js:1211) | 입문필수 | 한글 이름 접근 가능은 부담 완화; 색상/일반 dict 차이 선택 |
| [custom-rgb](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/docs.js:1243) | 필요시참고 | 0~1 슬라이더/색 견본으로, 위치 벡터와 의미 구별 |
| [color-lists](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/docs.js:1263) | 필요시참고 | 인덱스 0부터; 이름 접근은 사용자 정의 NamedList 기능임 표시 |
| [korean-sound-quickstart](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/docs.js:1295) | 입문필수 | 음표 3줄 순차 예시는 좋음; 재생/정지·음소거·볼륨 먼저 |
| [play_sound](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/docs.js:1325) | 필요시참고 | 자동 대기 없음·단위 Hz/초·네 파형 음색 비교 |
| [play_note](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/docs.js:1348) | 입문필수 | 음표()만 자동 대기, play_note()와 차이; 한글 반음 파싱 오류 수정 필요 |
| [play_chord](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/docs.js:1370) | 필요시참고 | 한글 화음()은 대기, 영어 chord/play_chord는 비대기 차이 명시 |
| [play_sequence](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/docs.js:1394) | 교사제공·선택심화 | dict 악보는 제공; 음표 3줄 버전과 동등 예제 |
| [play_sfx](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/docs.js:1417) | 필요시참고 | 이름 목록 조회형, 반복 호출/음량·정지 안내 |
| [bgm](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/docs.js:1440) | 필요시참고 | 정지 예제는 좋음; 지속음과 짧은 음 구분, 음소거 기본 안내 |
| [note-constants](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/docs.js:1462) | 필요시참고 | 초급은 음표('도4') 하나로 진입, NamedList/영어 상수는 선택 |
| [instrument](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/docs.js:1494) | 필요시참고 | 자동 대기/음색 비교 3음은 적절; 높은도/한글 반음 이름 실제 지원 맞춤 |
| [scatter3d](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/docs.js:1519) | 교사제공·선택심화 | 중첩 컴프리헨션 대신 점 3개 목록부터, 좌표 자료 제공 |
| [surface3d](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/docs.js:1542) | 교사제공·선택심화 | 2차원 배열·수식 생성은 제공, 3×3 숫자 표부터 |
| [line3d](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/docs.js:1571) | 교사제공·선택심화 | 삼각함수/컴프리헨션 대신 3점 경로부터 |
| [bar3d](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/docs.js:1592) | 필요시참고 | 기본 리스트 하나 입력은 쉬움; 단위/축이름 추가 |
| [texture-attribute](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/docs.js:1617) | 필요시참고 | 프리셋만 먼저, 외부 URL/data는 교사 선택; 네트워크 실패가 학생 코드오류 아님 안내 |
| [textures-presets](/Users/greatsong/greatsong-project/10_수업자료/vpylab/client/src/data/docs.js:1645) | 필요시참고 | 20종 암기 불필요, getattr 격자 생성기는 교사 제공; 프리셋 1개 직접 호출 |

## 예제를 학생 과제로 전환할 때의 발판 설계

1. **최소 성공**: 제공한 5~12개 실행문으로 눈에 보이는 결과를 만든다. 코드를 전부 타이핑하는 분량보다 새 개념과 수정할 부분의 수를 제한한다.
2. **예측과 한 가지 변경**: “반지름을 0.3에서 0.6으로 바꾸면 무엇이 달라질까?”처럼 변수를 하나만 바꾼다. 바꾸기 전 예상, 바꾼 값, 관찰을 기록한다.
3. **기본 문법으로 규칙 작성**: 대입·산술·비교·if·단일 for 중 필요한 것만 연습한다. 학생에게 컴프리헨션/lambda/async를 새로 쓰도록 요구하지 않는다. 심화는 같은 문법으로 조건 비교·패턴 발견·반례 설명을 늘린다.
4. **힌트 단계 축소**: 변경할 줄 표시→값 후보 제공→부분 빈칸→힌트 없는 유사 문제 순서로 줄인다. 한 화면에서 정답 코드 전체를 먼저 보는 것만으로 발판이 완성되지는 않는다.
5. **결과보다 설명 확인**: 그림이 예쁜가와 함께 “왜 이 조건을 택했나”, “어느 변경이 영향을 줬나”, “다음 비교는 무엇인가”를 묻는다. AI 사용 여부와 관계없이 같은 예측/실험/설명 근거를 남긴다.

| 원본을 보존하는 대상 | 학생용 첫 단계 | 두 번째 단계 | 기본 문법 조합의 선택 심화 | 교사가 제공할 부분 |
|---|---|---|---|---|
| rain / shooting-stars | 한 객체 위치·색 변경 | 유한 for로 한 축 이동 | 바닥 조건에 따라 리셋 위치/소리 변경 | 무작위 배경·객체 목록·반복/정지 골격 |
| surface-plot | 3×3 높이 표의 숫자 하나 바꾸기 | 한 행/열 패턴 비교 | 동일 for/if로 봉우리 두 개/평지 조건 설계 | 3D 차트 함수·좌표 스케일·삼각함수 |
| music-childrens-songs | 제공 연주기로 4음 비교 | 음표 순서·길이 중 하나 변경 | 반복/조건으로 A-B-A 패턴·리듬 반례 설계 | 악보 전체·lambda·요청 큐·이벤트 루프 |
| showcase-slider-control | 제공 콜백 안 반지름 대입 | 범위/기본값 비교 | if로 작은 공/큰 공 색 규칙 결정 | 이벤트 등록·UI 생성·rate 루프 |
| cannon / pendulum | 초기 값 하나 바꿔 예측 | 같은 조건 두 번 비교·표 작성 | 조건문으로 특정 높이/영역 통과 횟수 세기 | 삼각함수·수치 적분·과학식·단위 |
| cosmic-aurora-veil / lightshow | 저부하 완성본의 색/개수 변경 | 진폭 값 하나에 따른 관찰 | 기본 if로 두 규칙 전환·경계값 비교 | 파동식·입자 풀·메모리 정리·음악 동기화 |

이 표는 **설계안**이다. 현재 자료에 이미 이 발판들이 구현되어 있다고 판정하지 않았다. 학생 작성 난이도는 선행 지식과 수업 시간에 따라 달라지므로 실제 학급 수준을 정한 뒤 최소 성공 단계의 소요 시간·교사 도움 횟수를 파일럿으로 확인한다.

## 검토 한계

- 실제 학생의 수행 관찰·사전 지식 평가·학급 수업·장시간 기기별 실행을 하지 않았다. 본 판정은 자료 전체 읽기와 관련 지원 코드 교차 확인에 근거한 전문가적 설계 검토다.
- Python API의 성분 갱신·radio 직렬화·한글 음표 변환, 정사면체 모서리 길이만 로컬 경량 재현했다. 이는 57개 작품의 Pyodide/브라우저/오디오 전수 실행 결과가 아니다.
- 긴 작품을 무조건 나쁜 자료로 판정하지 않았다. 감상·탐구 도구로 제공하고 학습 목표에 필요한 작은 부분만 학생이 작성하면 교육적으로 쓸 수 있다. 반대로 짧은 코드라도 2차원 배열·수식·이벤트를 동시에 요구하면 낮은 난이도라고 보장하지 않았다.
- 외부 이미지 URL의 현재 가용성/CORS는 이 검토에서 접속 시험하지 않았다. 외부 텍스처는 프리셋 대안과 교사 제공 선택 자료로 분류했다.
