"use client";

import * as React from "react";
import type { WeatherSnapshot } from "@/lib/weather/normalize";

const cache = new Map<string, { snap: WeatherSnapshot; t: number }>();
const TTL = 60_000;

export function useWeather(lat: number, lon: number) {
  const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;
  const [snap, setSnap] = React.useState<WeatherSnapshot | null>(() => {
    const c = cache.get(key);
    if (c && Date.now() - c.t < TTL) return c.snap;
    return null;
  });
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancel = false;
    const cached = cache.get(key);
    if (cached && Date.now() - cached.t < TTL) {
      setSnap(cached.snap);
      return;
    }
    setError(null);
    fetch(`/api/weather/now?lat=${lat}&lon=${lon}`)
      .then((r) => {
        if (!r.ok) throw new Error("fetch failed");
        return r.json() as Promise<WeatherSnapshot>;
      })
      .then((data) => {
        if (cancel) return;
        cache.set(key, { snap: data, t: Date.now() });
        setSnap(data);
      })
      .catch((e) => {
        if (cancel) return;
        setError(String(e));
      });
    return () => {
      cancel = true;
    };
  }, [key, lat, lon]);

  return { snap, error };
}
