# DSB 준용 산출물 체계 — 명세 (단일 현재 진실)

- 대상: `~/design-system-builder`
- Tier: **2** (수개월 유지 · 기존 7종 산출물과 `manifest.ts`가 의존 · 자격증명/비용/외부쓰기/비가역 없음)
- 생성: 2026-08-10 · spec-pipeline `init` (소급 아님 — 전 FS 미구현 상태로 정직 기입)
- 검증: `python3 000_Agent-for-me/scripts/spec_pipeline/spec_validate.py docs/spec`

---

## 1절 REQ 등록부

요구 원문은 사용자가 말한 그대로 인용한다. 해석본으로 대체하지 않는다.

| ID | 요구 원문 | 출처 | 날짜 | 상태 |
|---|---|---|---|---|
| REQ-001 | "쪼개서 작업하고 세부사항까지 산출물 만들어서 디자인시스템 준용 시에 일관성 유지할 수 있게 하려는거야." | 대화 | 2026-08-10 | open |
| REQ-002 | "사람이 디자인 가이드를 육안으로 확인할 수 있어야하고 그게 보통의 서비스에서 제공하는 페이지 형태의 가이드 이며" | 대화 | 2026-08-10 | open |
| REQ-003 | "토큰화 되어 llm이 읽고 작업할 때 일관성이 유지되어야해" | 대화 | 2026-08-10 | open |
| REQ-004 | "4가지 산출물 형태 모두 필요하다면 모두 만들되 4가지 산출물 모두 통일성을 가질 수 있는 규격이 필요해" | 대화 | 2026-08-10 | open |
| REQ-005 | "요구사항명세-기능단위명세 까지 세부적으로 정의해." | 대화 | 2026-08-10 | open |

REQ-005는 이 문서 자체의 존재로 충족되며, 유지 절차는 3절 운영 규약이 담당한다.

---

## 2절 FS 목록

| ID | 기능 단위 | satisfies | impl | 상태 |
|---|---|---|---|---|
| FS-001 | 컴포넌트 스펙 소스 스키마 | REQ-001 | references/components/*.json | draft |
| FS-002 | 레시피 델타 병합 | REQ-001 | src/component-spec.ts | draft |
| FS-003 | components.json 생성 | REQ-001, REQ-003 | src/component-spec.ts | draft |
| FS-004 | rules.json 생성 | REQ-001 | src/rules-generator.ts | draft |
| FS-005 | styleguide 사이드바 라우팅 | REQ-002 | src/styleguide-generator.ts | draft |
| FS-006 | styleguide 컴포넌트·준용 섹션 | REQ-002 | src/styleguide-generator.ts | draft |
| FS-007 | DESIGN.md 판별 그래프 | REQ-003 | src/design-md-generator.ts | draft |
| FS-008 | 토큰 경로 공통 앵커 규약 | REQ-004 | src/surface-data.ts | draft |
| FS-009 | 스펙 완주 게이트 | REQ-001, REQ-004 | src/gate.ts | draft |
| FS-010 | manifest 신규 2면 교차검사 | REQ-004 | src/manifest.ts | draft |
| FS-011 | compliance CLI 값 규칙 4종 | REQ-001 | src/compliance.ts | draft |
| FS-012 | rules.json 확장 kind 예약 | REQ-001 | src/rules-generator.ts | draft |

`shared: true` FS = FS-008(전 면이 참조하는 앵커 규약), FS-001(전 생성기의 입력 스키마). 이 둘이 바뀌면 의존 FS의 TC까지 재실행한다.

---

### FS-001 — 컴포넌트 스펙 소스 스키마

- satisfies: REQ-001
- impl: `references/components/*.json` (18개), `src/component-spec.ts` (스키마 타입·로더)
- shared: **true** — 전 생성기의 입력
- 상태: draft

컴포넌트 18개(P1 primitives 10 · P2 composites 4 · P3 patterns 4)의 정체성 산문을 레시피 무관 공통 1벌로 둔다. 값(radius·padding·motion)은 레시피가 정하지만 "button이 무엇이고 link와 어떻게 다른가"는 브랜드 톤과 무관하다.

```ac
- references/components/ 아래에 component-registry.ts가 선언한 18개 이름과 1:1 대응하는 JSON 파일이 존재한다
- 각 파일은 필수 4필드를 갖는다: purpose.what(string) · useWhen(string) · dontUseWhen(string) · vsPartner(array)
- vsPartner의 각 원소는 {key, note}이며 key는 registry에 실재하는 컴포넌트 이름이다
- 선택 필드는 purpose.why · anatomy · designRules[]이며 부재 시 null 또는 생략을 허용한다
- 필수 필드를 null로 두려면 같은 파일의 _deferred 객체에 해당 필드명을 키로 하는 사유 문자열이 있어야 한다
- registry에 없는 컴포넌트 이름의 파일이 있으면 로더가 error를 반환한다
```

---

### FS-002 — 레시피 델타 병합

- satisfies: REQ-001
- impl: `src/component-spec.ts`, `references/recipes/*.json`
- shared: false
- 상태: draft

레시피가 컴포넌트 용법을 예외적으로 덮어써야 할 때만 쓰는 경로. 병합은 결정론이라 같은 brand.json은 같은 산문을 낸다.

```ac
- 레시피 JSON의 componentOverrides 키는 선택이며 없으면 공통 1벌이 그대로 쓰인다
- componentOverrides.<컴포넌트>.<필드> 가 있으면 해당 필드만 덮어쓰고 나머지 필드는 공통값을 유지한다
- 덮어쓰기는 필드 단위이며 컴포넌트 객체 전체 치환이 아니다
- 병합 결과는 입력이 같으면 항상 동일하다 (Date.now 등 비결정 요소 미사용)
- componentOverrides가 registry에 없는 컴포넌트를 참조하면 build가 error로 실패한다
```

---

### FS-003 — components.json 생성

- satisfies: REQ-001, REQ-003
- impl: `src/component-spec.ts`, `src/cli.ts` (generate 경로)
- shared: false
- 상태: draft

LLM과 페이지 생성기가 함께 읽는 구조화 스펙. tokens.json에 넣지 않는 이유는 `tokenHash`가 `component` 키를 해싱하기 때문이며(`tokens-schema.ts:264`), 산문 수정이 재현성 계약을 오염시키면 안 된다.

```ac
- generate 실행 시 out/components.json이 생성된다
- 최상위에 tokenHash 필드가 있고 값이 같은 빌드의 tokens.json 해시와 문자열 일치한다
- 각 컴포넌트 항목은 FS-001의 필수 4필드에 더해 registry 유래 결정론 필드(variants·states·baseProperties·stateProperties)를 포함한다
- vsPartner의 key가 components.json 안에 실재하는 컴포넌트를 가리킨다 (끊긴 참조 0건)
- _deferred가 있는 필드는 값 null과 함께 _deferred 사유가 그대로 실린다
- 같은 brand.json으로 두 번 build하면 components.json이 바이트 동일하다
```

---

### FS-004 — rules.json 생성

- satisfies: REQ-001
- impl: `src/rules-generator.ts`, `src/cli.ts`
- shared: false
- 상태: draft

소비자 계약. `contract.json`(생산자 계약 — 빌드 유효성·게이트)과 분리해 검사기가 게이트 코드를 로드하지 않게 한다.

```ac
- generate 실행 시 out/rules.json이 생성된다
- 최상위 구조는 {tokenHash, rules[]}이며 tokenHash는 같은 빌드의 tokens.json 해시와 일치한다
- 각 rule은 {id, kind, severity, appliesTo, message} 필드를 갖는다
- severity 어휘는 error 또는 warning 두 값만 허용한다
- appliesTo의 토큰 경로 패턴은 tokens.json에 실재하는 경로를 최소 1개 이상 매칭한다
- rules[]는 FS-011의 값 규칙 4종을 포함한다
```

---

### FS-005 — styleguide 사이드바 라우팅

- satisfies: REQ-002
- impl: `src/styleguide-generator.ts`
- shared: false
- 상태: draft

현재 25KB 단일 스크롤 9섹션은 컴포넌트 18개 스펙이 들어가면 탐색이 무너진다. 단일 self-contained 파일을 유지하면서(file:// 핸드오프 계약) 좌측 사이드바 + 해시 라우팅으로 페이지 감각을 만든다.

```ac
- styleguide.html은 단일 파일이며 외부 리소스(CDN·폰트·이미지 URL) 요청이 0건이다
- 좌측 사이드바에 기초·컴포넌트·준용 3개 그룹의 내비게이션이 있다
- 사이드바 항목 클릭 시 location.hash가 바뀌고 해당 섹션만 표시된다
- 해시를 직접 입력해 진입하면 그 섹션이 표시된 상태로 열린다
- JavaScript가 비활성인 환경에서도 전 섹션 본문이 DOM에 존재한다 (검색·인쇄 가능)
- file:// 프로토콜로 열었을 때 라우팅이 동작한다
```

---

### FS-006 — styleguide 컴포넌트·준용 섹션

- satisfies: REQ-002
- impl: `src/styleguide-generator.ts`, `src/surface-data.ts`
- shared: false
- 상태: draft

사람이 육안으로 확인하는 면. components.json과 rules.json을 같은 데이터로 렌더한다.

```ac
- 컴포넌트 그룹에 components.json의 18개 항목이 각각 하나의 섹션으로 렌더된다
- 각 컴포넌트 섹션은 purpose.what · useWhen · dontUseWhen · vsPartner를 표시한다
- vsPartner 항목은 해당 컴포넌트 섹션으로 이동하는 내부 링크다
- _deferred 필드는 값 대신 사유가 시각적으로 구분되어 표시된다 (빈칸으로 두지 않는다)
- 준용 그룹에 rules.json의 전 규칙이 id·severity·설명과 함께 표시된다
- 토큰을 표시하는 모든 행에 FS-008 규약의 앵커 id 속성이 있다
```

---

### FS-007 — DESIGN.md 판별 그래프

- satisfies: REQ-003
- impl: `src/design-md-generator.ts`
- shared: false
- 상태: draft

LLM이 생성 시점에 읽는 면. 컴포넌트 오선택을 문서가 아니라 참조 구조로 막는다.

```ac
- DESIGN.md에 컴포넌트 판별 섹션이 존재한다
- 각 컴포넌트에 대해 useWhen · dontUseWhen · vsPartner가 기재된다
- 토큰과 컴포넌트 참조는 FS-008 규약의 문자열을 그대로 사용한다 (별칭·축약 금지)
- 값(수치·hex)은 재기재하지 않고 tokens.css 또는 styleguide 참조로 대체한다
- 문서 상단에 "값의 정본은 tokens.json, 이 문서는 사용 규칙" 취지의 canonical source 선언이 있다
```

---

### FS-008 — 토큰 경로 공통 앵커 규약

- satisfies: REQ-004
- impl: `src/surface-data.ts` (앵커 생성 유틸), 전 생성기가 소비
- shared: **true**
- 상태: draft

4면 통일 규격의 호칭 축. 사람이 페이지에서 본 문자열, LLM이 MD에서 읽은 문자열, 검사기가 위반으로 뱉는 문자열이 하나여야 준용이 성립한다.

```ac
- 토큰 식별자는 tokens.json의 경로 문자열(예: semantic.color.surface.default)을 그대로 쓴다
- styleguide.html의 토큰 행 id 속성 값이 그 경로와 문자열 일치한다
- DESIGN.md의 토큰 표기가 그 경로와 문자열 일치한다
- rules.json의 appliesTo가 그 경로 또는 그 경로의 와일드카드 패턴이다
- compliance CLI의 위반 메시지에 그 경로가 그대로 출력된다
- 별도 앵커 ID 체계(DS-COLOR-001 등)를 생성하지 않는다
```

---

### FS-009 — 스펙 완주 게이트

- satisfies: REQ-001, REQ-004
- impl: `src/gate.ts`, `src/validator.ts`
- shared: false
- 상태: draft

ds-portal이 `anatomy` 71/145(49%)에서 멈춘 실패를 구조로 막는다. 빈칸은 남기되 왜 비었는지가 함께 남는다.

```ac
- 필수 4필드(purpose.what·useWhen·dontUseWhen·vsPartner) 중 하나라도 값과 _deferred가 모두 없으면 build가 error로 실패한다
- 값이 null이고 _deferred에 해당 필드 사유가 있으면 warning으로 강등되고 build는 통과한다
- _deferred 사유가 빈 문자열이면 error로 취급한다
- build 출력에 필드별 커버리지 수치(채운 수/전체 18)가 항상 표시된다
- 커버리지 표시는 100%일 때도 생략되지 않는다
- 게이트 코드는 gate.ts의 EXPORT_GATE_CODES 어휘에 등록된다
```

---

### FS-010 — manifest 신규 2면 교차검사

- satisfies: REQ-004
- impl: `src/manifest.ts`, `src/contract.ts`
- shared: false
- 상태: draft

4면 통일 규격의 동기화 축. 기존 `checkManifest`(drift·contract·completeness·a11y·motion·demo)를 확장한다.

```ac
- Surfaces 인터페이스에 componentsJson과 rulesJson이 추가된다
- GENERATED_ARTIFACTS 목록에 components.json과 rules.json이 포함된다
- components.json·rules.json의 tokenHash가 tokens.json 해시와 다르면 manifest-drift error가 발생한다
- REQUIRED_ELEMENTS에 compliance가 추가되고 styleguide.html에 해당 섹션이 없으면 error가 발생한다
- components.json에 있는 컴포넌트가 styleguide.html에 렌더되지 않으면 error가 발생한다
- rules.json의 appliesTo가 tokens.json에 없는 경로만 가리키면 error가 발생한다
- validate --check-manifest 실행 시 위 검사가 모두 수행된다
```

---

### FS-011 — compliance CLI 값 규칙 4종

- satisfies: REQ-001
- impl: `src/compliance.ts`, `src/cli.ts`
- shared: false
- 상태: draft

소비 코드를 정적 분석한다. 브라우저를 쓰지 않아 100% 결정론이며 CI에서 돈다. 런타임 생성 스타일은 보지 못한다는 한계를 문서에 명시한다.

```ac
- dsb compliance <경로> --rules <rules.json> 형태로 실행된다
- CSS·TSX·JSX 파일에서 색 리터럴(hex·rgb·hsl)을 찾아 no-hardcoded-color 위반으로 보고한다
- px·rem 치수 리터럴을 찾아 no-hardcoded-dimension 위반으로 보고한다
- ms·s 지속시간 리터럴을 찾아 no-hardcoded-duration 위반으로 보고한다
- tokens.json에 없는 CSS 변수 참조를 unknown-token-ref 위반으로 보고한다
- 각 위반은 파일경로:줄번호 · 규칙id · 대체할 토큰 경로를 함께 출력한다
- error가 1건 이상이면 exit code 1, 없으면 0을 반환한다
- 같은 입력에 대해 두 번 실행하면 출력이 동일하다
```

---

### FS-012 — rules.json 확장 kind 예약

- satisfies: REQ-001
- impl: `src/rules-generator.ts`
- shared: false
- 상태: draft

1차에 구현하지 않는 조립·선택 규칙을 스키마가 미리 표현할 수 있게 해 나중에 구조 변경 없이 채운다.

```ac
- rule의 kind 어휘에 value · nesting · selection 세 값이 정의된다
- 1차 구현은 kind=value만 실제 검사하며 나머지 kind는 검사기가 건너뛴다
- 건너뛴 규칙 수를 compliance 실행 출력에 명시한다 (침묵 무시 금지)
- 미구현 kind의 규칙이 rules.json에 있어도 검사기가 오류 없이 종료한다
```

---

## 3절 설계 결정 (grill 확정 · 2026-08-10)

REQ가 아니라 "어떻게"의 확정이다. 커버리지 분모에 넣지 않는다. 뒤집으려면 CHG를 쓴다.

| ID | 결정 | 근거 | 관련 FS |
|---|---|---|---|
| D-001 | 준용 규칙을 rules.json으로 분리 (contract.json 병합 안 함) | 생산자 계약과 소비자 계약은 독자·수명이 다름 | FS-004 |
| D-002 | 산문은 저자가 쓰고 build가 결정론 투영 (LLM 생성 안 함) | 재현성 봉인이 brand.json 하나로 유지됨 | FS-001 |
| D-003 | 공통 1벌 18개 + 레시피 델타 (레시피별 전수 144칸 아님) | 컴포넌트 정체성은 브랜드 톤과 무관 | FS-001, FS-002 |
| D-004 | 토큰 경로가 유일한 앵커 (별도 ID 체계 신설 안 함) | 이미 SSOT이고 alias·contrastPairs가 이미 사용 | FS-008 |
| D-005 | 검사기는 소스 정적 분석 (렌더 검사 안 함) | 결정론 유지·브라우저 의존 제거 | FS-011 |
| D-006 | 단일 self-contained HTML + 해시 라우팅 (다중 페이지 사이트 아님) | file:// 핸드오프 계약 유지·manifest 면 수 불변 | FS-005 |
| D-007 | 미기입은 error, _deferred 명시 시 warning 강등 | 빈칸은 남기되 사유가 함께 남음 | FS-009 |
| D-008 | 필수는 판별 4종, anatomy·designRules는 선택 | P3 패턴 구조가 덜 굳어 유보가 몰릴 위험 | FS-001, FS-009 |
| D-009 | 1차 규칙은 값 4종, nesting·selection은 스키마만 예약 | 즉시 동작·오탐 최소, 확장 경로는 열어둠 | FS-011, FS-012 |

### 가정 (사용자 확인 완료 · 2026-08-10)

- 컴포넌트 산문 집필 위치 = `references/components/*.json` 18개 파일
- 레시피 델타 키 이름 = `componentOverrides`
- `distinction`(사람용 한 줄)은 별도 집필하지 않고 `vsPartner`에서 생성
- 초기 집필은 P1 primitives 10개 우선, P2·P3는 `_deferred`로 시작

---

## 4절 운영 규약

- 요건 수신 시 Tier 판정 → Tier 2 이상이면 `docs/spec/changes/CHG-NNN.md` 작성 후 이 문서 갱신
- 수용 기준(```ac 블록)이 바뀐 FS의 연결 TC는 suspect로 마킹. 처분 4종만 허용: no-impact(근거 한 줄)/updated/obsolete/deferred
- 구현 커밋·완료 보고에 affected-FS 선언 의무 (자동 탐지하지 않는다)
- 실행 증거는 `docs/spec/res-log.jsonl`에 append. spec.md에는 상태 플래그만 갱신
- FS 상태는 verified/failed만 종결 상태. 에이전트 자기 보고는 증거가 아니다
- 구조 검사: `python3 <볼트>/000_Agent-for-me/scripts/spec_pipeline/spec_validate.py docs/spec`
- 추적성 리포트: 같은 디렉터리의 `spec_trace.py` (생성물은 `_generated/`, 수기 편집 금지)

### 이 명세가 덮지 않는 것

- 기존 7종 산출물(`tokens.css`·`fonts.css`·`tokens.ts`·`styleguide.html` 기본 섹션·`DESIGN.md` 기본 섹션·`demo.html`·`contract.json`)의 현행 동작
- 다크 모드(M3)·Tailwind/shadcn export(M2.5)·video(M4) 로드맵
- 컴포넌트 산문의 내용 품질 — 구조 게이트는 존재만 증명하고 의미는 사람이 판정한다
