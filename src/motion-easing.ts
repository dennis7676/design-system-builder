import type { CubicBezierValue } from "./tokens-schema.js";

export const MOTION_EASING_PRESETS = {
  subtle: {
    standard: [0.2, 0, 0, 1],
    enter: [0, 0, 0, 1],
    exit: [0.3, 0, 1, 1],
  },
  standard: {
    standard: [0.4, 0, 0.2, 1],
    enter: [0, 0, 0.1, 1],
    exit: [0.4, 0, 1, 1],
  },
  expressive: {
    standard: [0.34, 1.2, 0.64, 1],
    enter: [0.16, 1.1, 0.3, 1],
    exit: [0.6, 0, 0.8, 0.6],
  },
  dramatic: {
    standard: [0.68, -0.3, 0.32, 1.3],
    enter: [0.2, 1.25, 0.4, 1],
    exit: [0.7, -0.2, 0.9, 0.6],
  },
} as const satisfies Record<string, MotionEasingTriple>;

export type MotionEasingPreset = keyof typeof MOTION_EASING_PRESETS;

export interface MotionEasingTriple {
  readonly standard: CubicBezierValue;
  readonly enter: CubicBezierValue;
  readonly exit: CubicBezierValue;
}
