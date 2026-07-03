export const COPY = {
  en: {
    eyebrow: (brand: string) => `Introducing ${brand}`,
    headline: "Ship a product that feels unmistakably yours.",
    lead: "Every color, type ramp, radius, and motion on this page is driven by one brand token set — nothing here is hardcoded.",
    ctaPrimary: "Start free",
    ctaGhost: "Book a demo",
    navCta: "Get started",
    featuresTitle: "Built on the brand's own tokens",
    cards: [
      ["Token-driven", "One tokens.json compiles into every surface — catalog, docs, and this applied page."],
      ["Accessible by gate", "Contrast pairs pass a deterministic WCAG export gate before anything ships."],
      ["Recipe families", "Structural recipes give each brand its own room; overrides fine-tune within it."],
    ],
    learnMore: "Learn more",
    formTitle: "Request access",
    formLead: "See the applied page rendered for your brand.",
    formSubmit: "Request access",
    fields: [
      ["Name", "text", "name", "Ada Lovelace"],
      ["Work email", "email", "email", "ada@example.com"],
      ["Company", "text", "company", "Analytical Engines"],
    ],
    footTagline: "Design tokens, applied.",
    fine: (brand: string) => `© ${brand}. Styled entirely by brand tokens.`,
  },
  ko: {
    eyebrow: (brand: string) => `${brand}를 소개합니다`,
    headline: "당신의 브랜드다움이 그대로 느껴지는 제품을 만드세요.",
    lead: "이 페이지의 모든 색상, 타이포그래피, 곡률, 모션은 하나의 브랜드 토큰 세트에서 파생됩니다 — 하드코딩된 값은 없습니다.",
    ctaPrimary: "무료로 시작",
    ctaGhost: "데모 신청",
    navCta: "시작하기",
    featuresTitle: "브랜드 고유 토큰으로 빌드됩니다",
    cards: [
      ["토큰 기반 설계", "하나의 tokens.json이 카탈로그, 문서, 그리고 이 적용 페이지까지 모든 표면으로 컴파일됩니다."],
      ["게이트로 보장되는 접근성", "대비쌍은 출고 전 결정론적 WCAG 게이트를 통과합니다."],
      ["레시피 패밀리", "구조적 레시피가 브랜드마다 고유한 공간을 제공합니다."],
    ],
    learnMore: "자세히 보기",
    formTitle: "접근 요청",
    formLead: "당신의 브랜드로 렌더링된 적용 페이지를 확인하세요.",
    formSubmit: "접근 요청",
    fields: [
      ["이름", "text", "name", "홍길동"],
      ["업무용 이메일", "email", "email", "hong@example.com"],
      ["회사", "text", "company", "분석기관"],
    ],
    footTagline: "디자인 토큰, 그대로 적용.",
    fine: (brand: string) => `© ${brand}. 모든 스타일은 브랜드 토큰에서 나옵니다.`,
  },
} as const;

export type DemoCopy = (typeof COPY)[keyof typeof COPY];
