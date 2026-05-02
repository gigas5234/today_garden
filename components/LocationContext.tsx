"use client";

import * as React from "react";
import { DEFAULT_FARM, Farm, farmAt } from "@/lib/farms";

type GeoStatus = "idle" | "requesting" | "granted" | "denied" | "unsupported";

type Ctx = {
  farm: Farm;                   // 현재 사용 중인 좌표 (geolocation 적용 후 반영)
  geoStatus: GeoStatus;
  refreshGeolocation: () => void;
};

const LocationCtx = React.createContext<Ctx | null>(null);

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [farm, setFarm] = React.useState<Farm>(DEFAULT_FARM);
  const [geoStatus, setGeoStatus] = React.useState<GeoStatus>("idle");

  const requestGeolocation = React.useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoStatus("unsupported");
      return;
    }
    setGeoStatus("requesting");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = farmAt(pos.coords.latitude, pos.coords.longitude);
        setFarm(next);
        setGeoStatus("granted");
      },
      () => {
        setGeoStatus("denied");
      },
      { enableHighAccuracy: false, maximumAge: 600_000, timeout: 8000 }
    );
  }, []);

  React.useEffect(() => {
    requestGeolocation();
  }, [requestGeolocation]);

  return (
    <LocationCtx.Provider
      value={{ farm, geoStatus, refreshGeolocation: requestGeolocation }}
    >
      {children}
    </LocationCtx.Provider>
  );
}

export function useLocation() {
  const ctx = React.useContext(LocationCtx);
  if (!ctx) throw new Error("useLocation must be used inside LocationProvider");
  return ctx;
}
