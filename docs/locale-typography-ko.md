# 한글 타이포그래피 SSOT — 폰트 에셋 + 조판 규칙

> Status: **active** (2026-07-02). `add-locale-typography` change의 운영 SSOT.
> 여기 명시된 폰트가 recipe `locales.ko` 맵과 디자인가이드 에셋의 정본이다.

## 1. 폰트 에셋 (전부 무료·재배포 가능 라이선스)

빌드 산출물은 폰트를 **지명만 하고 fetch하지 않는다**(외부의존 0 불변식).
아래 폰트가 설치된 환경에서 recipe 아이덴티티가 한글로 이어진다.

| 폰트 | 라이선스 | recipe 성격 매핑 | brew cask | 상태 |
|---|---|---|---|---|
| **Pretendard** | SIL OFL 1.1 | 범용 고딕 — minimal-tech(Inter)·expressive(Poppins) 등 sans 전반의 한글 대응 | `font-pretendard` | ✅ recipe 지명 |
| **Noto Serif KR** | SIL OFL 1.1 | 세리프 — luxury(Cormorant)·retro(Merriweather)·pro-emotive(Source Serif)의 한글 대응 | `font-noto-serif-kr` | ✅ recipe 지명 |
| Noto Sans KR | SIL OFL 1.1 | 고딕 보조(안전 폴백) | `font-noto-sans-kr` | 설치 |
| **IBM Plex Sans KR** | SIL OFL 1.1 | enterprise(IBM Plex Sans)의 **동일 패밀리** 한글판 | `font-ibm-plex-sans-kr` | 설치 — 후속: enterprise locales.ko에 지명 승격 후보 |
| SUIT | SIL OFL 1.1 | 기하 성향 — creative-multiscale(Lexend)·expressive display 후보 | `font-suit` | 설치 — 후속 지명 후보 |
| Gowun Batang | SIL OFL 1.1 | 감성 세리프 — pro-emotive 대안 | `font-gowun-batang` | 설치 |
| Gowun Dodum | SIL OFL 1.1 | 부드러운 고딕 — warm-creator(Nunito) 후보 | `font-gowun-dodum` | 설치 |
| NanumSquare Round | OFL 계열(나눔) | 라운드 — warm-creator 후보 | `font-nanum-square-round` | 설치 |
| Nanum Myeongjo | SIL OFL 1.1 | 전통 명조 — retro 대안 | `font-nanum-myeongjo` | 설치 |
| Paperlogy | SIL OFL 1.1 | 디스플레이/프레젠테이션 제목 — bold tier 제목 후보 | `font-paperlogy` | 설치 |

설치(macOS): `brew install --cask font-pretendard font-noto-serif-kr …` (표의 cask 열).
검증: 브라우저에서 `document.fonts.check('16px Pretendard', '한글')`.

- **지명 승격 절차**: "설치" 상태 폰트를 recipe `locales.ko`에 올릴 때는 해당
  recipe의 성격 정합을 육안 확인 후 골든(G-L2 계열) 갱신과 함께 반영한다.
- OFL 공통 조건: 폰트 단독 판매 금지·동일 이름 재배포 금지 외에 상업 사용·수정·재배포 자유.

## 2. 한글 조판 규칙 (레퍼런스 기반)

정본 레퍼런스: **W3C KLREQ** (Requirements for Hangul Text Layout and Typography,
https://www.w3.org/TR/klreq/) — 줄바꿈·금칙·정렬의 공식 요구사항.

| 규칙 | 값/처방 | 근거 | 구현 상태 |
|---|---|---|---|
| 줄바꿈 단위 | 어절(공백) 경계 — `word-break: keep-all` + `overflow-wrap: anywhere` | KLREQ line breaking(한글은 음절 단위 분리 가능하나 가독성은 어절 우선) | ✅ 생성기 ko 경로 |
| 본문 행간 | 1.6–1.8 (현행 토큰 1.5 → ko 시 상향 검토) | 한글 음절 블록이 em box를 채워 라틴보다 넉넉한 행간 필요(업계 관례: 네이버·카카오 가이드 160~180%) | 🔲 백로그 — 본문 행간 ko 보정 |
| 제목 행간 | ≥ 1.12 (라틴 0.98 금지) | 글리프 상하 밀착 방지 — 07-02 프로브 실측 | ✅ bold 플로어 1.12 |
| 제목 자간 | 0 ~ -1% (라틴용 큰 음수 금지) | 한글은 자폭이 균일해 과한 음수 자간 시 뭉침 | ✅ ko에서 normal 중화 |
| 한 줄 분량(본문) | 공백 포함 **25–35자**(모바일) / **35–45자**(데스크톱) | 한글 가독성 관례(전각 기준, 라틴 45–75자의 절반 수준) | 🔲 백로그 — `ch` 단위 measure를 ko에서 자수 기반(em)으로 보정 |
| 한 줄 분량(제목) | 8–15자 내외 | 히어로 헤드라인 관례 | 🔲 백로그(동상) |
| 금칙 처리 | 행두 닫는 괄호·마침표 금지 등 | KLREQ §line-adjustment — 브라우저 기본 처리에 위임 | ✅ (별도 구현 불요) |

### 백로그 티켓 (다음 increment)

1. **ko measure 보정** — demo/styleguide의 `Nch` max-width를 ko에서 자수 기반으로
   치환(전각 1em ≈ 1자 → `min(18ch, 15em)` 류). 위 분량표가 수용 기준.
2. **본문 행간 ko 보정** — 토큰 오염 없이 생성기 ko 경로에서 `line-height: 1.7` 플로어.
3. **지명 승격**: enterprise→IBM Plex Sans KR, creative-multiscale→SUIT,
   warm-creator→Gowun Dodum/NanumSquare Round (육안 확인 후).
4. **웹폰트 opt-in** — `brand.json webfonts: true` 시 Google Fonts link 삽입
   (외부의존 0 예외를 명시적 opt-in으로).
