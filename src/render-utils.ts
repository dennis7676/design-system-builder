import { type LeafToken, type TokenGroup, isAlias, isLeaf } from "./tokens-schema.js";
import { entriesFrom, resolveToken, tokenMap, type TokenEntry } from "./surface-data.js";
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

export function axisLabel(axis: string): string {
  return axis.replaceAll("_", " / ");
}

export function usageHint(role: string, description: string): string {
  if (description !== "") return description;
  if (role.includes("surface.foreground")) return "Default text and icon color on the matching surface role.";
  if (role.includes("surface")) return "Use for page and card backgrounds that need calm reading contrast.";
  if (role.includes("primary.foreground")) return "Use only for content placed on primary action backgrounds.";
  if (role.includes("primary")) return "Use for primary actions, selected states, and high-signal accents.";
  if (role.includes("hover")) return "Use for interactive hover states that need a visible tonal shift.";
  return "Use where this semantic role appears in component and layout decisions.";
}

export function typeSentence(role: string): string {
  if (role.includes("heading")) return "Purposeful headings make the system easy to scan.";
  if (role.includes("caption")) return "Caption text clarifies quiet metadata without stealing focus.";
  return "The quick brown fox maps intent to readable interface type.";
}

export function componentUsage(path: string): string {
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
