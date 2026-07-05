import type { ContrastRole, ContrastState } from "./tokens-schema.js";

export const COMPONENT_P1_ROLLOUT = ["minimal-tech", "enterprise", "pro-emotive", "expressive", "creative-multiscale", "luxury", "retro", "warm-creator"] as const;

export const COMPONENT_STATES = [
  "default",
  "hover",
  "focus",
  "active",
  "disabled",
] as const satisfies readonly ContrastState[];

export type ComponentState = (typeof COMPONENT_STATES)[number];

export interface ComponentPrimitiveDefinition {
  readonly name: string;
  readonly variants?: readonly string[];
  readonly stateProperties?: readonly string[];
  readonly baseProperties: readonly string[];
  readonly contrastRole?: ContrastRole;
  readonly focusIndicator?: "border";
}

export const COMPONENT_P1_REGISTRY = [
  {
    name: "button",
    variants: ["primary", "secondary", "ghost"],
    baseProperties: [
      "radius",
      "paddingX",
      "paddingY",
      "borderWidth",
      "label.family",
      "label.weight",
      "label.transform",
      "transition",
    ],
    stateProperties: ["background", "foreground", "border"],
    contrastRole: "text",
    focusIndicator: "border",
  },
  {
    name: "link",
    baseProperties: ["underlineOffset", "borderWidth", "label.family", "label.weight", "transition"],
    stateProperties: ["background", "foreground", "border"],
    contrastRole: "text",
    focusIndicator: "border",
  },
  {
    name: "input",
    baseProperties: [
      "radius",
      "paddingX",
      "paddingY",
      "borderWidth",
      "borderPlacement",
      "label.family",
      "label.weight",
      "label.transform",
      "transition",
    ],
    stateProperties: ["background", "foreground", "border"],
    contrastRole: "text",
    focusIndicator: "border",
  },
  {
    name: "select",
    baseProperties: [
      "radius",
      "paddingX",
      "paddingY",
      "borderWidth",
      "borderPlacement",
      "label.family",
      "label.weight",
      "label.transform",
      "transition",
    ],
    stateProperties: ["background", "foreground", "border"],
    contrastRole: "text",
    focusIndicator: "border",
  },
  {
    name: "checkbox",
    baseProperties: ["size", "radius", "borderWidth", "transition"],
    stateProperties: ["background", "foreground", "border"],
    contrastRole: "non-text",
    focusIndicator: "border",
  },
  {
    name: "radio",
    baseProperties: ["size", "radius", "borderWidth", "transition"],
    stateProperties: ["background", "foreground", "border"],
    contrastRole: "non-text",
    focusIndicator: "border",
  },
  {
    name: "switch",
    baseProperties: ["width", "height", "thumbSize", "radius", "borderWidth", "transition"],
    stateProperties: ["background", "foreground", "border"],
    contrastRole: "non-text",
    focusIndicator: "border",
  },
  {
    name: "card",
    baseProperties: ["background", "foreground", "border", "radius", "padding", "borderWidth"],
  },
  {
    name: "badge",
    baseProperties: [
      "background",
      "foreground",
      "border",
      "radius",
      "paddingX",
      "paddingY",
      "borderWidth",
      "label.family",
      "label.weight",
      "label.transform",
    ],
  },
  {
    name: "divider",
    baseProperties: ["color", "thickness", "style"],
  },
] as const satisfies readonly ComponentPrimitiveDefinition[];

export type ComponentPrimitiveName = (typeof COMPONENT_P1_REGISTRY)[number]["name"];

export interface ComponentContrastTarget {
  readonly primitive: string;
  readonly variant?: string;
  readonly state: ComponentState;
  readonly fg: string;
  readonly bg: string;
  readonly role: ContrastRole;
  readonly minRatio?: number;
}

export interface ComponentFocusTarget {
  readonly primitive: string;
  readonly variant?: string;
  readonly state: "focus";
  readonly fg: string;
  readonly bg: string;
  readonly role: "non-text";
}

export interface ComponentCompositeContrastTarget {
  readonly fg: string;
  readonly bg: string;
  readonly role: ContrastRole;
  readonly minRatio?: number;
}

export interface ComponentCompositeExemption {
  readonly path: string;
  readonly reason: string;
  readonly exemption: string;
}

export interface ComponentCompositeDefinition {
  readonly name: string;
  readonly leafPaths: readonly string[];
  readonly contrastTargets: readonly ComponentCompositeContrastTarget[];
  readonly exemptions: readonly ComponentCompositeExemption[];
}

export const COMPONENT_P2_ROLLOUT = [
  "minimal-tech",
  "enterprise",
  "pro-emotive",
  "luxury",
  "retro",
  "warm-creator",
  "expressive",
  "creative-multiscale",
] as const;

export const COMPONENT_P2_COMPOSITES = [
  {
    name: "nav",
    leafPaths: ["background", "foreground", "border", "paddingX", "paddingY"],
    contrastTargets: [
      { fg: "component.nav.foreground", bg: "component.nav.background", role: "text" },
    ],
    exemptions: [],
  },
  {
    name: "table",
    leafPaths: [
      "headerBackground",
      "headerForeground",
      "rowBackground",
      "rowStripeBackground",
      "rowHoverBackground",
      "cellForeground",
      "border",
      "cellPaddingX",
      "cellPaddingY",
    ],
    contrastTargets: [
      { fg: "component.table.headerForeground", bg: "component.table.headerBackground", role: "text" },
      { fg: "component.table.cellForeground", bg: "component.table.rowBackground", role: "text" },
      { fg: "component.table.cellForeground", bg: "component.table.rowStripeBackground", role: "text" },
      { fg: "component.table.cellForeground", bg: "component.table.rowHoverBackground", role: "text" },
    ],
    exemptions: [],
  },
  {
    name: "modal",
    leafPaths: [
      "overlayBackground",
      "panelBackground",
      "panelForeground",
      "panelBorder",
      "panelRadius",
      "panelShadow",
      "padding",
    ],
    contrastTargets: [
      { fg: "component.modal.panelForeground", bg: "component.modal.panelBackground", role: "text" },
    ],
    exemptions: [
      {
        path: "component.modal.overlayBackground",
        reason: "Non-text decorative scrim; panel legibility is covered by panelForeground on panelBackground.",
        exemption: "WCAG 1.4.3 incidental decorative content",
      },
    ],
  },
  {
    name: "formRow",
    leafPaths: ["gap", "labelForeground", "helpForeground", "errorForeground", "errorBorder"],
    contrastTargets: [
      { fg: "component.formRow.labelForeground", bg: "semantic.color.surface.default", role: "text" },
      { fg: "component.formRow.helpForeground", bg: "semantic.color.surface.default", role: "text" },
      { fg: "component.formRow.errorForeground", bg: "semantic.color.surface.default", role: "text" },
      { fg: "component.formRow.errorBorder", bg: "semantic.color.surface.default", role: "non-text" },
    ],
    exemptions: [],
  },
] as const satisfies readonly ComponentCompositeDefinition[];

export function componentPrimitiveNames(
  registry: readonly ComponentPrimitiveDefinition[] = COMPONENT_P1_REGISTRY,
): readonly string[] {
  return registry.map((entry) => entry.name);
}

export function componentPaths(
  registry: readonly ComponentPrimitiveDefinition[] = COMPONENT_P1_REGISTRY,
): readonly string[] {
  return registry.flatMap(pathsForDefinition);
}

export function componentContrastTargets(
  registry: readonly ComponentPrimitiveDefinition[] = COMPONENT_P1_REGISTRY,
): readonly ComponentContrastTarget[] {
  return registry.flatMap((definition) => {
    if (definition.stateProperties === undefined || definition.contrastRole === undefined) return [];
    return prefixesForDefinition(definition).flatMap(({ prefix, variant }) =>
      COMPONENT_STATES.map((state) => ({
        primitive: definition.name,
        ...(variant !== undefined ? { variant } : {}),
        state,
        fg: `${prefix}.foreground.${state}`,
        bg: `${prefix}.background.${state}`,
        role: definition.contrastRole as ContrastRole,
        ...(state === "disabled" ? { minRatio: 0 } : {}),
      })),
    );
  });
}

export function componentFocusTargets(
  registry: readonly ComponentPrimitiveDefinition[] = COMPONENT_P1_REGISTRY,
): readonly ComponentFocusTarget[] {
  return registry.flatMap((definition) => {
    if (definition.stateProperties === undefined || definition.focusIndicator === undefined) return [];
    return prefixesForDefinition(definition).map(({ prefix, variant }) => ({
      primitive: definition.name,
      ...(variant !== undefined ? { variant } : {}),
      state: "focus" as const,
      fg: `${prefix}.${definition.focusIndicator}.focus`,
      bg: `${prefix}.background.focus`,
      role: "non-text" as const,
    }));
  });
}

export const COMPONENT_P1_PATHS = componentPaths();

export function componentCompositeNames(
  registry: readonly ComponentCompositeDefinition[] = COMPONENT_P2_COMPOSITES,
): readonly string[] {
  return registry.map((entry) => entry.name);
}

export function componentCompositePaths(
  registry: readonly ComponentCompositeDefinition[] = COMPONENT_P2_COMPOSITES,
): readonly string[] {
  return registry.flatMap((definition) =>
    definition.leafPaths.map((path) => `component.${definition.name}.${path}`),
  );
}

export function componentCompositeContrastTargets(
  registry: readonly ComponentCompositeDefinition[] = COMPONENT_P2_COMPOSITES,
): readonly ComponentCompositeContrastTarget[] {
  return registry.flatMap((definition) => definition.contrastTargets);
}

export function componentCompositeExemptions(
  registry: readonly ComponentCompositeDefinition[] = COMPONENT_P2_COMPOSITES,
): readonly ComponentCompositeExemption[] {
  return registry.flatMap((definition) => definition.exemptions);
}

export const COMPONENT_P2_PATHS = componentCompositePaths();

function pathsForDefinition(definition: ComponentPrimitiveDefinition): readonly string[] {
  return prefixesForDefinition(definition).flatMap(({ prefix }) => [
    ...definition.baseProperties.map((property) => `${prefix}.${property}`),
    ...(definition.stateProperties ?? []).flatMap((property) =>
      COMPONENT_STATES.map((state) => `${prefix}.${property}.${state}`),
    ),
  ]);
}

function prefixesForDefinition(
  definition: ComponentPrimitiveDefinition,
): ReadonlyArray<{ readonly prefix: string; readonly variant?: string }> {
  const variants = definition.variants ?? [undefined];
  return variants.map((variant) => ({
    prefix: variant === undefined
      ? `component.${definition.name}`
      : `component.${definition.name}.${variant}`,
    ...(variant !== undefined ? { variant } : {}),
  }));
}
