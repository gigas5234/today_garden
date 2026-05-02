import * as React from "react";
import {
  IconSun,
  IconSunCloud,
  IconCloud,
  IconMoonCloud,
  IconRain,
  IconSnow,
} from "./icons";
import type { SkyKind } from "@/lib/weather/normalize";

export function WeatherIcon({
  kind,
  size = 42,
}: {
  kind: SkyKind;
  size?: number;
}) {
  switch (kind) {
    case "sun":
      return <IconSun size={size} />;
    case "sun-cloud":
      return <IconSunCloud size={size} />;
    case "cloud":
      return <IconCloud size={size} />;
    case "moon-cloud":
      return <IconMoonCloud size={size} />;
    case "rain":
      return <IconRain size={size} />;
    case "snow":
      return <IconSnow size={size} />;
    case "sleet":
      // 비/눈 — 시각적으로 비에 더 가깝게 표현
      return <IconRain size={size} />;
  }
}

export const SKY_LABEL: Record<SkyKind, string> = {
  sun: "맑음",
  "sun-cloud": "구름 조금",
  cloud: "흐림",
  "moon-cloud": "구름 조금",
  rain: "비",
  snow: "눈",
  sleet: "비/눈",
};
