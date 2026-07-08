import React from "react";
import { Composition } from "remotion";
import { BrandCard } from "./Composition";

export const RemotionRoot: React.FC = () => (
  <Composition
    id="BrandCard"
    component={BrandCard}
    durationInFrames={60}
    fps={30}
    width={1280}
    height={720}
  />
);
