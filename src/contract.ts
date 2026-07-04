import { EXPRESSION_TIERS } from "./brand-schema.js";
import {
  COMPONENT_P1_REGISTRY,
  COMPONENT_P1_ROLLOUT,
  COMPONENT_STATES,
  type ComponentPrimitiveDefinition,
} from "./component-registry.js";
import { EXPORT_GATE_CODES } from "./gate.js";
import { MOTION_EASING_PRESETS } from "./motion-easing.js";
import { RECIPE_ORDER } from "./recipe-selection.js";
import {
  CONTRAST_ROLES,
  CONTRAST_STATES,
  DIMENSION_UNITS,
  LEAF_TYPES,
  MIN_RATIO,
  SKELETONS,
  TOKEN_CLASS_PATTERNS,
  type TokensDocument,
} from "./tokens-schema.js";
import { computeTokenHash } from "./validator.js";

export const GENERATED_ARTIFACTS = [
  "tokens.css",
  "fonts.css",
  "tokens.ts",
  "styleguide.html",
  "DESIGN.md",
  "demo.html",
  "contract.json",
] as const;

export const GATE_CATALOG = {
  "export-brand-fields": "brand.json is structurally complete and every finite field is in range.",
  "export-conflict-free": "Recipe selection and requested overrides have no blocking conflicts.",
  "export-recipe-selected": "A concrete recipe is selected before tokens are built.",
  "export-override-limit": "At most three override axes are applied in one build.",
  "export-user-confirmed": "The caller explicitly confirms generation after reviewing the selected recipe.",
  "class-missing": "Every token leaf declares a portability class.",
  "class-invalid": "Token leaf classes are limited to portable, adapter-derived, or target-only:<target>.",
  "alias-unresolved": "Alias references resolve to an existing token path.",
  "alias-cycle": "Alias references do not form cycles.",
  "alias-type": "Alias references preserve the declared leaf type.",
  "unit-invalid": "Dimension and duration leaves use normalized intent units.",
  "cubic-bezier-invalid": "Motion easing leaves use finite four-point cubic-bezier tuples.",
  "orphan-token": "Portable primitive leaves should be consumed by semantic or component aliases.",
  "component-parity": "Rolled-out recipes expose the exact component primitive path registry.",
  "texture-opacity-invalid": "Texture overlay opacity is a numeric token.",
  "texture-opacity-cap": "Texture overlay opacity stays below the shipped cap.",
  "texture-contrast-unparseable": "Texture worst-case blended contrast colors must parse.",
  "texture-contrast-fail": "Texture worst-case blended backgrounds meet contrast floors.",
  "glass-opacity-floor": "Glass backing opacity stays inside the statically provable interval.",
  "glass-contrast-unparseable": "Glass contrast colors must parse.",
  "glass-contrast-collapse": "Glass foreground luminance cannot collapse inside the reachable background interval.",
  "glass-contrast-fail": "Glass worst-case interval contrast meets role floors.",
  "contrast-unresolved": "Every contrastPair foreground and background resolves to a color.",
  "contrast-unparseable": "Every contrastPair color can be parsed for WCAG math.",
  "contrast-fail": "Every non-disabled contrastPair meets its role floor.",
  "contrast-exempt": "Disabled controls record the WCAG incidental-content exemption.",
  "foreground-missing": "Semantic background roles expose a paired foreground role.",
  "trace-coverage": "Decision traces cover the core token categories present in the document.",
  "intent-leak": "Intent rationale avoids physical implementation values.",
  "manifest-drift": "Generated surfaces embed the current builtFromTokenHash.",
  "surface-incomplete": "Generated surfaces contain the required manifest sections or demo regions.",
  "a11y-record": "Generated documentation records every contrastPair result.",
  "motion-reduce-missing": "Motion tokens require reduced-motion records in generated surfaces.",
} as const;

export type GateCode = keyof typeof GATE_CATALOG;

export interface UsageContract {
  readonly contractVersion: 1;
  readonly builtFromTokenHash: string;
  readonly artifacts: readonly string[];
  readonly consume: {
    readonly do: readonly string[];
    readonly dont: readonly string[];
  };
  readonly tokens: Record<string, unknown>;
  readonly components: Record<string, unknown>;
  readonly gates: ReadonlyArray<{ readonly code: string; readonly purpose: string }>;
  readonly accessibility: Record<string, unknown>;
  readonly enums: Record<string, unknown>;
  readonly guarantees: ReadonlyArray<{ readonly claim: string; readonly proof: string }>;
}

export function buildContract(doc: TokensDocument): UsageContract {
  return {
    contractVersion: 1,
    builtFromTokenHash: computeTokenHash(doc),
    artifacts: [...GENERATED_ARTIFACTS],
    consume: {
      do: [
        "Consume semantic token CSS variables (--semantic-*) for product surfaces.",
        "Consume component token CSS variables (--component-*) for primitive component states.",
        "Use contrastPairs as the allowed foreground/background registry.",
        "Treat generated files as read-only outputs and regenerate them from tokens.json.",
      ],
      dont: [
        "Do not consume primitive token variables directly in product code.",
        "Do not copy physical literals from generated CSS, HTML, or markdown into source code.",
        "Do not create foreground/background combinations outside contrastPairs or documented component states.",
        "Do not edit generated artifacts by hand to repair drift.",
      ],
    },
    tokens: {
      publicPrefixes: ["--semantic-", "--component-"],
      internalPrefixes: ["--primitive-"],
      classes: [...TOKEN_CLASS_PATTERNS],
      units: [...DIMENSION_UNITS],
      leafTypes: [...LEAF_TYPES],
      contrastRoles: [...CONTRAST_ROLES],
      contrastStates: [...CONTRAST_STATES],
    },
    components: {
      rolloutRecipes: [...COMPONENT_P1_ROLLOUT],
      states: [...COMPONENT_STATES],
      registry: (COMPONENT_P1_REGISTRY as readonly ComponentPrimitiveDefinition[]).map((definition) => ({
        name: definition.name,
        variants: [...(definition.variants ?? [])],
        baseProperties: [...definition.baseProperties],
        stateProperties: [...(definition.stateProperties ?? [])],
        contrastRole: definition.contrastRole ?? null,
        focusIndicator: definition.focusIndicator ?? null,
      })),
    },
    gates: Object.entries(GATE_CATALOG).map(([code, purpose]) => ({ code, purpose })),
    accessibility: {
      minRatio: { ...MIN_RATIO },
      disabledExemption: "Disabled controls are exempt from WCAG 1.4.3 text floors and are recorded as contrast-exempt.",
      gradientRule: "Gradient backgrounds are checked at the worst contrast stop.",
      demoDerivedTextRule: "Demo foreground color-mix values are checked at build time with OKLCH interpolation.",
    },
    enums: {
      recipes: [...RECIPE_ORDER],
      expression: [...EXPRESSION_TIERS],
      skeletons: [...SKELETONS],
      motionPresets: Object.keys(MOTION_EASING_PRESETS),
      motionPresetCurves: MOTION_EASING_PRESETS,
      exportGateCodes: [...EXPORT_GATE_CODES],
    },
    guarantees: [
      {
        claim: "Same input tokens produce deterministic contract bytes.",
        proof: "golden/contract.test.ts byte-golden and deterministic-bytes test.",
      },
      {
        claim: "WCAG contrast is gated for contrastPairs, gradients, glass, texture overlays, and demo derived foregrounds.",
        proof: "src/validator.ts contrast-fail/texture-contrast-fail/glass-contrast-fail and src/render-utils.ts mixedText.",
      },
      {
        claim: "Generated surfaces stay tied to the source token hash.",
        proof: "src/manifest.ts manifest-drift checks builtFromTokenHash on styleguide, DESIGN.md, demo.html, and contract.json.",
      },
      {
        claim: "The component registry surface follows the code registry.",
        proof: "src/component-registry.ts COMPONENT_P1_REGISTRY plus golden/contract.test.ts registry flow assertion.",
      },
      {
        claim: "Regression safety is enforced by the golden test suite.",
        proof: "Run npm test.",
      },
    ],
  };
}

export function buildContractJson(doc: TokensDocument): string {
  return `${JSON.stringify(buildContract(doc), null, 2)}\n`;
}
