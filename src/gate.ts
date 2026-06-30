/**
 * Deterministic export gate (confidence scoring abandoned — d-series decision).
 *
 * The gate is a PURE function over machine-checkable conditions. The 5th
 * condition from the design ("user-confirmed") is a skill-layer (Step 2 / Phase
 * preview) concern, so it enters here as a passed-in boolean — the gate does not
 * model approval UI.
 */

import { validateBrand, type BrandJson } from "./brand-schema.js";
import type { RecipeSelection } from "./recipe-selection.js";

export interface GateInput {
  readonly brand: BrandJson;
  readonly selection: RecipeSelection;
  /** Supplied by the caller (skill/CLI); the gate does not gather approval. */
  readonly userConfirmed: boolean;
}

export interface GateResult {
  readonly ok: boolean;
  readonly reasons: readonly string[];
}

export function canGenerate(input: GateInput): GateResult {
  const reasons: string[] = [];

  // 1. required fields + in-range
  const fieldErrors = validateBrand(input.brand);
  for (const e of fieldErrors) reasons.push(`brand.${e.path}: ${e.message}`);

  // 2. conflicts == []
  for (const c of input.selection.conflicts) reasons.push(`conflict[${c.code}]: ${c.message}`);

  // 3. a recipe was selected
  if (input.selection.recipeKey === null) reasons.push("no recipe selected");

  // 4. override count (range already covered by validateBrand; count is the gate's check)
  const overrideCount = Object.keys(input.brand.overrides ?? {}).length;
  if (overrideCount > 3) reasons.push(`override axes ${overrideCount} > 3`);

  // 5. user confirmation (passed in, not gathered here)
  if (!input.userConfirmed) reasons.push("user has not confirmed");

  return { ok: reasons.length === 0, reasons };
}
