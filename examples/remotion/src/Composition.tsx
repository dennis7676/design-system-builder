/**
 * Example Remotion composition that consumes the design-system-builder video
 * adapter output end-to-end:
 *   - tokens.ts   -> colors (#hex), space (px), radius, duration (ms), gradient,
 *                    shadow, font families, and the embedded `toFrames` helper
 *   - fonts.video.ts -> loadVideoFonts() (google fonts via @remotion/google-fonts)
 *
 * Nothing here is hand-tuned; every visual value is read from the generated
 * `tokens` object, proving the brand -> tokens -> video-adapter -> Remotion chain.
 */
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { tokens, toFrames } from "./tokens";
import { loadVideoFonts } from "./fonts.video";

const fontFamilies = loadVideoFonts();
const sansFamily = fontFamilies["Lexend"] ?? tokens.primitive.font.family.sans[0];
const monoFamily = fontFamilies["IBM Plex Mono"] ?? tokens.primitive.font.family.mono[0];

type ShadowLayer = {
  readonly offsetX: number;
  readonly offsetY: number;
  readonly blur: number;
  readonly spread: number;
  readonly color: string;
  readonly inset?: boolean;
};

function shadowCss(layers: readonly ShadowLayer[]): string {
  return layers
    .map((l) =>
      `${l.inset ? "inset " : ""}${l.offsetX}px ${l.offsetY}px ${l.blur}px ${l.spread}px ${l.color}`,
    )
    .join(", ");
}

function gradientCss(g: typeof tokens.semantic.gradient.hero): string {
  const stops = g.stops.map((s) => `${s.color} ${s.position * 100}%`).join(", ");
  return `${g.kind}-gradient(${g.angle}deg, ${stops})`;
}

export const BrandCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Animate the card in over the `duration.normal` token, converted ms -> frames.
  const inFrames = toFrames(tokens.primitive.duration.normal, fps);
  const opacity = interpolate(frame, [0, inFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const lift = interpolate(frame, [0, inFrames], [tokens.primitive.space.md, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: gradientCss(tokens.semantic.gradient.hero),
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          opacity,
          transform: `translateY(${lift}px)`,
          backgroundColor: tokens.primitive.color.neutral["50"],
          color: tokens.primitive.color.neutral["900"],
          padding: `${tokens.primitive.space.lg}px ${tokens.primitive.space.lg}px`,
          borderRadius: tokens.primitive.radius.md,
          boxShadow: shadowCss(tokens.semantic.elevation.raised),
          display: "flex",
          flexDirection: "column",
          gap: tokens.primitive.space.sm,
          maxWidth: 720,
        }}
      >
        <div
          style={{
            fontFamily: sansFamily,
            fontSize: tokens.primitive.font.size.display,
            fontWeight: tokens.primitive.font.weight.bold,
            lineHeight: tokens.primitive.font.lineHeight.tight,
            color: tokens.primitive.color.brand["600"],
          }}
        >
          Prism design system
        </div>
        <div
          style={{
            fontFamily: monoFamily,
            fontSize: tokens.primitive.font.size.caption,
            letterSpacing: `${tokens.primitive.font.tracking.caption}em`,
            color: tokens.primitive.color.neutral["600"],
          }}
        >
          rendered from generated tokens — frame {frame}
        </div>
      </div>
    </AbsoluteFill>
  );
};
