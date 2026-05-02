"use client";

import * as React from "react";
import { useLocation } from "./LocationContext";
import { IconLocation } from "./icons";

export function TopBar({ rightSlot }: { rightSlot?: React.ReactNode }) {
  const { farm, geoStatus, refreshGeolocation } = useLocation();
  const dot =
    geoStatus === "granted"
      ? "#3A7C58"
      : geoStatus === "requesting"
        ? "#E89B3C"
        : geoStatus === "denied"
          ? "#C77A26"
          : "#B5BEB6";
  const dotTitle =
    geoStatus === "granted"
      ? "GPS 좌표 적용됨"
      : geoStatus === "requesting"
        ? "GPS 좌표 가져오는 중…"
        : geoStatus === "denied"
          ? "GPS 권한 거부됨 — 기본 좌표 사용"
          : "GPS 미지원 — 기본 좌표 사용";
  return (
    <div className="top-bar" style={{ position: "relative" }}>
      <button
        className="location-pill"
        onClick={refreshGeolocation}
        title={dotTitle}
        aria-label="현재 위치 새로고침"
      >
        <IconLocation size={18} />
        <span>{farm.name}</span>
        <span
          aria-hidden
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: dot,
            display: "inline-block",
          }}
        />
      </button>
      {rightSlot}
    </div>
  );
}
