/**
 * Hero imagery advisory — ADVISORY ONLY, never a gate.
 *
 * Reads the built tokens document and tells a human whether this design's hero
 * is likely to be carried by imagery. It never blocks a build, never enters
 * tokens.json, and never touches the intent hash: imagery is a skill-layer
 * concern (see uniqueness-roadmap "reference-image intake → skill layer, core
 * untouched"), and this module only surfaces a recommendation to the operator.
 *
 * Why the caveat matters: component.hero contrast targets prove
 * hero.foreground on a FLAT hero.background. A photographic hero background
 * invalidates that proof — contrast then varies per pixel. Anyone acting on a
 * "recommended" verdict must re-prove hero text contrast against the actual
 * image, which this compiler cannot do.
 */

import type { TokensDocument } from "./tokens-schema.js";

/** Skeletons whose composition is led by pictorial surface rather than structure. */
const IMAGERY_LED_SKELETONS = new Set(["poster", "collage", "story", "mosaic", "editorial"]);

/** normalized tone axis (-1..1) at/above which the design reads layered/rich. */
const RICH_THRESHOLD = 0.33;

/** display anchor (× body) at/above which the hero already carries by type size. */
const TYPE_LED_DISPLAY = 4;

export interface HeroAdvisory {
  readonly recommend: boolean;
  readonly reason: string;
  /** Present only when recommend === true. Contrast proof is void over a photo. */
  readonly contrastCaveat?: string;
}

export function heroAdvisory(doc: TokensDocument): HeroAdvisory {
  const skeleton = doc.meta.skeleton ?? "standard";
  const rich = doc.meta.toneVector?.minimal_rich ?? 0;
  const display = doc.meta.typeScale?.anchors?.display ?? 0;

  const skeletonLed = IMAGERY_LED_SKELETONS.has(skeleton);
  const isRich = rich >= RICH_THRESHOLD;
  const typeLed = display >= TYPE_LED_DISPLAY;

  if (!skeletonLed && !isRich) {
    return {
      recommend: false,
      reason: typeLed
        ? `skeleton '${skeleton}' is structure-led and display is ${display}× body — the hero carries by type and rule, not imagery`
        : `skeleton '${skeleton}' is structure-led and the tone reads restrained (minimal_rich ${rich.toFixed(2)}) — imagery is not central`,
    };
  }

  const signals = [
    skeletonLed ? `skeleton '${skeleton}' is imagery-led` : null,
    isRich ? `tone reads layered (minimal_rich ${rich.toFixed(2)})` : null,
  ].filter((s): s is string => s !== null);

  const typeNote = typeLed
    ? ` Display is already ${display}× body, so treat imagery as support for the type, not a replacement.`
    : "";

  return {
    recommend: true,
    reason: `${signals.join(" and ")} — a hero image is likely to carry this design.${typeNote}`,
    contrastCaveat:
      "component.hero contrast was proven against a FLAT background. A photographic hero voids that proof — re-prove hero text contrast against the actual image before shipping.",
  };
}

/** One-line operator hook. Returns null when there is nothing worth saying. */
export function formatHeroAdvisory(doc: TokensDocument): string | null {
  const advisory = heroAdvisory(doc);
  if (!advisory.recommend) return null;
  return [
    `HERO  [imagery-advisory] ${advisory.reason}`,
    `HERO  [contrast-void] ${advisory.contrastCaveat}`,
  ].join("\n");
}
