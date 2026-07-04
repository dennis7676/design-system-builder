import { contrastRatio, mixOklchColors } from "./color.js";
import { MIN_RATIO, type ContrastRole, type LeafToken, type TokenGroup, isAlias, isLeaf } from "./tokens-schema.js";
import { entriesFrom, resolveToken, resolveValue, tokenMap, type TokenEntry } from "./surface-data.js";
import type { TokensDocument } from "./tokens-schema.js";

export function htmlEscape(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function mdEscape(value: string): string {
  return value.replaceAll("|", "\\|").replaceAll("\n", " ");
}

export function groupOf(parent: TokenGroup, key: string): TokenGroup | null {
  const node = parent[key];
  if (node === undefined || isLeaf(node)) return null;
  return node;
}

export function tokenEntriesUnder(
  parent: TokenGroup,
  key: string,
  prefix: string,
): readonly TokenEntry[] {
  const group = groupOf(parent, key);
  return group === null ? [] : entriesFrom(group, prefix);
}

export function tokenRef(leaf: LeafToken): string {
  return isAlias(leaf.$value) ? leaf.$value.slice(1, -1) : "";
}

export function descriptionFor(doc: TokensDocument, entry: TokenEntry): string {
  if (entry.leaf.$description !== undefined) return entry.leaf.$description;
  const terminal = resolveToken(entry.path, tokenMap(doc));
  return terminal.$description ?? "";
}

export function pathTail(path: string, prefix: string): string {
  return path.startsWith(`${prefix}.`) ? path.slice(prefix.length + 1) : path;
}

export function oklchMix(first: string, firstPct: number, second: string): string {
  return `color-mix(in oklch, ${first} ${firstPct}%, ${second})`;
}

export interface MixedTextOptions {
  readonly doc: TokensDocument;
  readonly fgPath: string;
  readonly surfacePath: string;
  readonly pct: number;
  readonly role: ContrastRole;
  readonly site: string;
  readonly fgCss?: string;
  readonly surfaceCss?: string;
}

export function mixedText(options: MixedTextOptions): string {
  const leaves = tokenMap(options.doc);
  const fg = resolveValue(options.fgPath, leaves);
  const surface = resolveValue(options.surfacePath, leaves);
  if (typeof fg !== "string" || typeof surface !== "string") {
    throw new Error(`demo derived text contrast failed at ${options.site}: color token unresolved`);
  }
  const mixed = mixOklchColors(fg, surface, options.pct);
  const ratio = mixed === null ? null : contrastRatio(mixed, surface);
  const floor = MIN_RATIO[options.role];
  if (ratio === null) {
    throw new Error(`demo derived text contrast failed at ${options.site}: color parse failed, pct=${options.pct}%, floor=${floor}`);
  }
  if (ratio < floor) {
    throw new Error(
      `demo derived text contrast failed at ${options.site}: pct=${options.pct}%, ratio=${ratio.toFixed(2)}, floor=${floor}`,
    );
  }
  return oklchMix(
    options.fgCss ?? cssVarForToken(options.fgPath),
    options.pct,
    options.surfaceCss ?? cssVarForToken(options.surfacePath),
  );
}

export function cssVarForToken(path: string): string {
  return `var(--${path.replaceAll(".", "-")})`;
}

export function axisLabel(axis: string): string {
  return axis.replaceAll("_", " / ");
}

export function usageHint(role: string, description: string, ko = false): string {
  if (description !== "") return description;
  if (ko) {
    if (role.includes("surface.foreground")) return "짝이 되는 surface 역할 위에서 기본 텍스트·아이콘 색으로 사용합니다.";
    if (role.includes("surface")) return "차분한 읽기 대비가 필요한 페이지·카드 배경에 사용합니다.";
    if (role.includes("primary.foreground")) return "primary 액션 배경 위에 올라가는 콘텐츠에만 사용합니다.";
    if (role.includes("primary")) return "주요 액션, 선택 상태, 강한 강조에 사용합니다.";
    if (role.includes("hover")) return "뚜렷한 톤 변화가 필요한 호버 상태에 사용합니다.";
    return "컴포넌트·레이아웃 결정에서 이 시맨틱 역할이 필요한 곳에 사용합니다.";
  }
  if (role.includes("surface.foreground")) return "Default text and icon color on the matching surface role.";
  if (role.includes("surface")) return "Use for page and card backgrounds that need calm reading contrast.";
  if (role.includes("primary.foreground")) return "Use only for content placed on primary action backgrounds.";
  if (role.includes("primary")) return "Use for primary actions, selected states, and high-signal accents.";
  if (role.includes("hover")) return "Use for interactive hover states that need a visible tonal shift.";
  return "Use where this semantic role appears in component and layout decisions.";
}

export function typeSentence(role: string, ko = false): string {
  if (ko) {
    if (role.includes("heading")) return "목적이 분명한 제목은 시스템을 쉽게 훑어보게 합니다.";
    if (role.includes("caption")) return "캡션은 조용한 메타데이터를 또렷하게 전달합니다.";
    return "다람쥐 헌 쳇바퀴에 타고파 — 의도를 읽기 좋은 인터페이스 글자로 옮깁니다.";
  }
  if (role.includes("heading")) return "Purposeful headings make the system easy to scan.";
  if (role.includes("caption")) return "Caption text clarifies quiet metadata without stealing focus.";
  return "The quick brown fox maps intent to readable interface type.";
}

export function componentUsage(path: string, ko = false): string {
  if (ko) {
    if (path.includes("backgroundHover")) return "인터랙티브 호버 표면";
    if (path.includes("background")) return "기본 액션 표면";
    if (path.includes("foreground")) return "텍스트·아이콘 색";
    if (path.includes("radius")) return "컨트롤 형태";
    if (path.includes("padding")) return "컨트롤 리듬";
    if (path.includes("transition")) return "상태 전환 타이밍";
    return "컴포넌트 계약";
  }
  if (path.includes("backgroundHover")) return "Interactive hover surface";
  if (path.includes("background")) return "Default action surface";
  if (path.includes("foreground")) return "Text and icon color";
  if (path.includes("radius")) return "Control shape";
  if (path.includes("padding")) return "Control rhythm";
  if (path.includes("transition")) return "State-change timing";
  return "Component contract";
}

export function styleguideInlineJs(): string {
  return `(() => {
  const links = [...document.querySelectorAll("[data-nav-link]")];
  const setActive = (id) => links.forEach((link) => link.classList.toggle("is-active", link.getAttribute("data-nav-link") === id));
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible?.target?.id) setActive(visible.target.id);
    }, { rootMargin: "-20% 0px -65% 0px", threshold: [0.1, 0.35, 0.6] });
    document.querySelectorAll("main > section[id]").forEach((section) => observer.observe(section));
  }
  const playground = document.querySelector("[data-playground]");
  const target = playground?.querySelector(".playground-target");
  playground?.querySelectorAll("[data-playground-state]").forEach((control) => {
    control.addEventListener("click", () => {
      const state = control.getAttribute("data-playground-state") ?? "default";
      playground.classList.remove("is-hover", "is-focus", "is-disabled");
      if (state !== "default") playground.classList.add("is-" + state);
      playground.querySelectorAll("[data-playground-state]").forEach((button) => button.classList.toggle("is-selected", button === control));
      if (target instanceof HTMLButtonElement) target.toggleAttribute("disabled", state === "disabled");
      target?.setAttribute("aria-disabled", String(state === "disabled"));
    });
  });
})();`;
}
