# design-system-builder

**브랜드 컨셉 하나로 디자인 시스템을 정의하고, 그 시스템으로 일관된 산출물들을
찍어내는 생성기.** 웹사이트 한 장, 이벤트 페이지 한 장을 만드는 도구가 아니라 —
① 원하는 컨셉에 맞게 ② 디자인 시스템을 정의하고 ③ 일관성을 유지한 채 산출물을
베리에이션하는 것이 목적이다.

같은 입력이면 언제나 바이트 단위로 같은 결과가 나온다(재현성), 그리고 모든 색
조합은 출고 전에 WCAG 접근성 게이트를 기계적으로 통과한다(결정적 안전). 이 두
가지가 이 도구의 존재 이유다.

## 어떻게 동작하는가 (파이프라인)

```
인터뷰(스킬)  →  brand.json  →  tokens.json  →  4개 산출물
 컨셉 질문        컨셉 확정       디자인 시스템      DESIGN.md / styleguide.html
 (5축 톤 등)      (재현성 봉인)    (intent SSOT)     / demo.html / tokens.css
```

1. **인터뷰** — 대화형 질문(감정→색, Semantic Differential 5축)으로 브랜드의
   톤을 수치화한다. 결과는 `brand.json`으로 봉인되며, 여기서부터는 전부 결정적.
2. **레시피 선택** — 5축 톤 벡터를 8개 **레시피**(검증된 디자인 패밀리)와
   매칭한다. 하드 제약 필터 → 유클리드 거리 → 최근접 선택.
3. **빌드** — 레시피의 토큰 트리를 복제하고 사용자의 다이얼(아래)을 적용해
   `tokens.json`(intent 전용 SSOT)을 만든다.
4. **생성** — 토큰 하나에서 산출물 4종이 나온다. 전부 같은 토큰값을 소비하므로
   서로 어긋날 수 없다.

## 무엇을 고를 수 있는가 (조합 공간)

| 다이얼 | 선택지 | 효과 |
|---|---|---|
| **recipe** (자동 매칭) | minimal-tech · enterprise · luxury · retro · expressive · pro-emotive · warm-creator · creative-multiscale | 색·타이포·곡률·그림자·그라데이션 — 브랜드의 뼈대 |
| **expression** | `safe` · `balanced` · `bold` | 레이아웃 진폭 — 정돈된 대칭 ↔ split 히어로·비대칭 스포트라이트. 색·대비는 불변 |
| **overrides** | radius(tighter/looser) · motion speed(snappier/calmer) | 스칼라 미세조정 (대비 안전) |
| **locales** | `["ko"]` | 한글 대응 — 성격 정합 폰트 스택(세리프→Noto Serif KR, 고딕→Pretendard) + 어절 줄바꿈·행간 보정·한글 카피 |

8 recipe × 3 tier만으로 24가지 뚜렷한 룩. 어떤 조합이든 같은 brand.json이면
같은 바이트가 나온다.

## 무엇이 나오는가 (산출물 4종)

| 산출물 | 용도 |
|---|---|
| `DESIGN.md` | 디자인 철학·결정 트레이스 — 왜 이 값인지의 기록 |
| `styleguide.html` | 토큰 카탈로그 + 컴포넌트 플레이그라운드 — 시스템의 레퍼런스 |
| `demo.html` | 실제 제품 레이아웃(nav·hero·features·form·footer)에 시스템을 적용한 실물 — expression tier가 여기서 드러난다 |
| `tokens.css` | CSS 변수(`--semantic-*`) — 실제 프로젝트가 소비하는 어댑터 산출물 |

네 산출물 전부에 `builtFromTokenHash`가 박혀 있어, 토큰과 어긋난(드리프트된)
산출물은 `validate --check-manifest`가 기계적으로 잡아낸다.

## 무엇이 보장되는가

- **재현성** — 같은 `brand.json` → 바이트 동일 산출물. LLM의 즉흥 생성은
  파이프라인 어디에도 없다(인터뷰까지만 LLM, 이후 전부 결정적 코드).
- **접근성** — 모든 텍스트/배경 쌍은 WCAG 대비(텍스트 4.5 / 큰글씨 3 / 비텍스트
  3)를 게이트에서 검사받고, 그라데이션 배경은 **최악 stop 기준**으로 판정된다.
  통과 못 하면 빌드가 안 된다.
- **일관성** — 산출물 간·tier 간 브랜드 값(:root 변수)은 항상 동일. 베리에이션은
  레이아웃과 스케일에만 실린다. (E2E로 브라우저 computed style까지 검증)
- **회귀 안전** — golden 테스트 108개 + R1 키스톤(기준 레시피 해시 불변)이
  모든 변경마다 돈다.

## 사용법 (CLI)

```bash
npm install
npx tsx src/cli.ts build   <brand.json> --out <tokens.json> --confirm
npx tsx src/cli.ts generate <tokens.json> --out-dir <dir>
npx tsx src/cli.ts validate <tokens.json> --check-manifest
```

인터뷰 프런트도어는 Claude Code 스킬(SKILL.md)로 제공된다 — 대화로 brand.json을
만들고 위 CLI를 자동 실행한다.

## 폰트 에셋 (한글)

한글 아이덴티티를 위해 무료 폰트(전부 SIL OFL 계열)를 에셋으로 채택한다.
빌드는 폰트를 fetch하지 않고 **지명만** 하므로(외부의존 0), 설치된 환경에서
레시피 성격이 한글로 이어진다. 정본 표·설치법·조판 규칙:
**[docs/locale-typography-ko.md](docs/locale-typography-ko.md)**

핵심: Pretendard(고딕 전반) · Noto Serif KR(세리프) · IBM Plex Sans KR(enterprise
동일 패밀리) · SUIT(기하) · Gowun Batang/Dodum · NanumSquare Round · Nanum
Myeongjo · Paperlogy(디스플레이).

## 기술 계약 (요약)

- **intent-only SSOT**: `tokens.json`은 의도값만 담는다(`space.comfortable` →
  어댑터가 `web: 1rem`으로 실현). 실현값(rem/ms/oklch)은 SSOT가 아니다.
- **`$class`**: 모든 leaf는 `portable` / `adapter-derived` / `target-only:<target>`.
- **tokenHash / 드리프트 계약**: intent 서브트리(meta 제외)의 해시. 각 표면이
  `builtFromTokenHash`를 임베드 → `validate --check-manifest`가 재계산 비교.
  meta(expression/locales 에코)는 해시에 안 들어간다.
- **contrastPairs**: fg/bg 쌍 레지스트리(role · state · minRatio) — WCAG 게이트의 입력.
- **validator 게이트**: alias 그래프 · `$class` 커버리지 · 타입/단위 · WCAG 대비 ·
  전경 페어링 · 조건부 motion-reduce · 표면 드리프트.
- **R1 키스톤**: 기준 레시피(minimal-tech) 무옵션 빌드 해시 = `golden/sample.tokens.json`.
  모든 증분이 이 불변식을 지켜야 한다.

## 스코프와 로드맵

- 현재 스코프: **web 단일 타깃** (M2/M3). 영상(Remotion) 어댑터는 M4.
- 진행 SSOT: 볼트 `prd_2026-06-29_design-system-builder-skill.md` (M0~M6)
- 고유성 레버: [docs/uniqueness-roadmap.md](docs/uniqueness-roadmap.md) —
  B3 색 해제 → per-recipe 골격 → 모티프 → **엣지포인트**(컨셉 정합 제안형
  HITL+메뉴+게이트) → 모션 어휘(시스템 내부 DSL)
- 어휘 티어: [docs/expressive-vocabulary-roadmap.md](docs/expressive-vocabulary-roadmap.md)

## License

MIT — see [LICENSE](./LICENSE). Bundled reference recipes carry their own
NOTICE; fonts follow their own OFL licenses.
