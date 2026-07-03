# Claude Design 벤치마킹 — 차용 포인트 분석 (R-A)

> M3.5 전시물 고도화 트랙의 리서치 단계 (vault PRD v2.5). R-B(styleguide
> Applications 섹션) 설계의 입력이다.
>
> 소스: 홍아린 AI "클로드 디자인 + 코드 최강 조합" (youtu.be/vHmJg8VQW5c) ·
> 그린코끼리 AI "13분만에 클로드 디자인" (youtu.be/x8uH9TtXBF8) — 2026-07-03
> 볼트 인박스 캡처 2건, 전문 트랜스크립트 기준.

## 요약 판정표

| # | Claude Design 관찰 | DSB 대응물 | 판정 | 반영처 |
|---|---|---|---|---|
| 1 | 탭 구조(프로토타입/슬라이드덱/템플릿) = 용처 선분기 | 없음 — 산출물 4종은 전부 웹 표면 | **adopt (구조 차용)** | **R-B**: Applications 섹션을 매체별 서브섹션으로 |
| 2 | 디자인 시스템 저장→재사용 (DS 먼저, 산출물은 소비자) | `brand.json`/`tokens.json`이 이미 그 자체 | **기충족 — 서사만 차용** | **R-B**: 섹션 리드 카피 "one system, every medium" |
| 3 | Tweaks — 토큰 비소모 슬라이더 미세조정 | `overrides` 다이얼 (radius/motion, 재빌드 필요) | **adapt-later** | M5/M6 후보 (styleguide 내 라이브 프리뷰 패널) |
| 4 | "스타일 목록 나열 → 복수 버전 동시 생성" | recipe selection (최근접 1개 자동) | **adopt (스킬 레이어)** | SKILL.md 인터뷰: top-3 후보 + 거리 근거 제시 |
| 5 | handoff-to-code 명령어 (share → 명령어 복사) | SKILL.md 자체가 code-native, DESIGN.md가 인계 문서 | **기충족 — 역방향 보강** | DESIGN.md/README에 "다른 도구로 넘기기" 명시 |
| 6 | 참고 이미지 3장+ 인테이크 ("없으면 generic") | 인터뷰는 언어 기반 5축 SD만 | **adopt (인터뷰 Phase 0)** | SKILL.md: 무드 이미지 → 5축 prior (결정 코어 불변) |
| 7 | 애니메이션 컴포넌트 라이브러리 차용 + "디자인 불변" 지시 | 모션 어휘 (8 recipe easing 삼중) | **M4 설계 입력** | 외부 컴포넌트 인제스트 시 모션 토큰 정규화 게이트 |

## 포인트별 분석

### 1. 용처 분기 탭 구조 → R-B의 뼈대

Claude Design은 진입 시점에 매체(프로토타입/슬라이드덱/템플릿)를 고르게 한다.
매체가 먼저, 스타일이 나중 — 이 순서가 "같은 브랜드로 여러 매체" 멘탈 모델을
만든다. DSB는 반대로 시스템이 먼저고 매체 분기가 없다. 시스템-우선은 DSB의
정체성이므로 순서는 유지하되, **매체 분기의 존재를 styleguide가 증명해야 한다**:

- Applications 섹션 = 매체별 서브섹션 (website / slides / social / video-static).
- 각 서브섹션은 aspect-ratio 고정 프레임(16:9, 4:5 or 1:1, 9:16) 안에 동일
  토큰으로 렌더한 샘플. Claude Design이 탭으로 말하는 것을 DSB는 한 페이지의
  나란한 증거로 말한다 — 전시물(고객 대상 근거 문서) 목적에 이쪽이 맞다.

### 2. DS 저장→재사용 서사

그린코끼리 영상의 설득 구조: DS를 먼저 만들면 사이트·PPT·홍보영상이 "한
세트처럼" 나온다. DSB의 `tokens.json`은 이미 재사용 가능한 SSOT고 재현성은
바이트 단위로 더 강하다. 빠진 것은 기능이 아니라 **전시물에서의 서사**다.
R-B 섹션 리드에 이 약속을 명시한다: 아래 샘플 전부가 이 페이지의 토큰과 같은
값을 소비하며, drift 골든이 그것을 기계적으로 보증한다는 문장.

- park: GetDesigns류 외부 브랜드 DS 임포트(인제스트 → recipe prior 매핑)는
  M6 이후 후보. 지금은 범위 밖.

### 3. Tweaks — 비용 0 파라미터 탐색

Tweaks의 본질은 "재생성 없이 파라미터 공간을 무한정 탐색"이다. DSB의 빌드는
이미 로컬·결정적·LLM 토큰 비소모라 비용 문제는 없지만, 탐색 루프가
`brand.json 수정 → 재빌드 → 브라우저 새로고침`으로 느리다.

- adapt-later (M5/M6): styleguide에 클라이언트사이드 tweak 패널 — CSS 변수를
  라이브로 조정하고, 마음에 든 조합을 **기존 override 어휘(radius
  tighter/looser, motion snappier/calmer)로 역제안**하는 UX. 자유 슬라이더가
  아니라 override 축으로 제한해야 var-only·대비 게이트 규율과 충돌하지 않는다.
  조정값이 tokens.json 밖에 남으면 drift이므로, 패널은 어디까지나 "override
  추천기"고 확정은 재빌드.
- R-B에는 넣지 않는다 (정적 전시물 규율 유지).

### 4. 스타일 목록 나열 → 복수 후보

"먼저 가능한 스타일 목록을 나열해 달라"가 핵심 프롬프트 기법으로 소개된다.
DSB의 recipe selection은 유클리드 최근접 1개를 자동 선택하는데, 후보 거리는
이미 계산돼 있다(`recipe-selection.ts`). 스킬 레이어에서:

- 인터뷰 종료 시 top-3 recipe를 거리·하드제약 통과 여부와 함께 제시하고
  사용자가 고르게 한다. 코어는 불변(선택 결과가 brand.json에 봉인될 뿐).
- 복수 버전 "동시 생성"도 DSB에선 공짜다 — 같은 brand.json에서 recipe만 바꾼
  빌드 N개. SKILL.md에 비교 빌드 절차 한 단락이면 충분하다.

### 5. handoff-to-code

Claude Design의 share→명령어 패턴은 디자인 도구가 코드 도구로 넘기는
단방향이다. DSB는 이미 코드 쪽에 산다. 보강할 것은 역방향 문서화뿐:
DESIGN.md(사람/LLM용 시스템 명세)와 `tokens.css`가 타 도구(Claude Design의
커스텀 DS 붙여넣기 포함)로 넘어가는 인계물임을 README·DESIGN.md 머리에 명시.

### 6. 참고 이미지 인테이크 — 인터뷰 Phase 0

"레퍼런스 없이 프롬프트만 넣으면 AI 티 나는 generic 결과"는 DSB 인터뷰에도
그대로 적용되는 경고다. 언어 기반 5축 SD는 사용자의 어휘력에 상한이 걸린다.

- adopt: SKILL.md 인터뷰에 Phase 0 추가 — 무드 이미지 3장+(핀터레스트 캡처,
  로고, 기존 브랜드물)를 받아 5축 prior와 recipe prior를 추출. **이미지는
  prior일 뿐, 확정치는 여전히 인터뷰 답변으로 봉인** — brand.json 이후의
  결정성은 건드리지 않는다. 이미지 해석은 스킬(LLM) 소관이라 코어 코드 변경 0.

### 7. 애니메이션 컴포넌트 소싱 — M4 입력

홍아린 영상의 모션 전략: 외부 컴포넌트 라이브러리에서 가져오되 "디자인은
절대 건드리지 말고 애니메이션만"을 명시한다. 두 가지 시사점:

- 모션과 구조의 직교 분리는 DSB 모션 어휘(recipe별 easing 삼중, exit 무
  overshoot)와 같은 방향 — 검증된 설계라는 방증.
- 외부 컴포넌트 인제스트는 하드코딩 easing/duration을 그대로 들여오므로
  anti-hardcode 규율과 정면 충돌. M4 확장에서 인제스트를 허용한다면 **모션
  토큰으로 정규화하는 게이트**(easing→recipe 삼중 매핑, duration→모션 스케일
  스냅)가 선행 조건.

## R-B 설계 입력 (이 문서의 결론)

1. **섹션 구조**: `applications` 섹션 1개, 매체별 서브블록 5종 —
   ① website (기존 demo 축소 임베드) ② slides 16:9 ×2 (타이틀+본문)
   ③ social carousel 4:5 ×3 (시퀀스) ④ video 16:9 타이틀카드+로워서드
   ⑤ video 9:16 쇼츠/릴스 커버. 모두 aspect-ratio 고정 프레임.
2. **리드 카피**: "동일 토큰 소비" 약속 + drift 골든 언급 (포인트 2).
3. **골격 직교**: 각 샘플 레이아웃은 recipe의 골격 문법(8종)을 반영하되
   매체 프레임이 우선 제약 — 골격은 배치 어휘로만 소비.
4. **규율 동일**: var-only, anti-hardcode, drift 골든, 렌더 QA(EN·KO).
5. **모션 비포함**: 영상 2종은 정적 레이아웃만 (모션은 M4 소관), Tweaks류
   인터랙션도 비포함 (포인트 3은 M5/M6).
