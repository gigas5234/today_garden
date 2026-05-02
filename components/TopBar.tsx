"use client";

import * as React from "react";
import { useLocation } from "./LocationContext";
import { IconLocation } from "./icons";

/** 화면 상단: 좌측 로고+"오늘밭" 브랜드 + 우측 보조 슬롯 (설정 등) */
export function TopBar({ rightSlot }: { rightSlot?: React.ReactNode }) {
  return (
    <div className="top-bar">
      <div className="brand">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/illustrations/icon.png"
          alt="오늘밭 로고"
          className="brand-logo"
          width={36}
          height={36}
        />
        <span className="brand-title">오늘밭</span>
      </div>
      {rightSlot}
    </div>
  );
}

/** Hero 좌측 상단에 작게 떠 있는 위치 칩. 클릭 시 GPS 재요청. */
export function HeroLocationPill() {
  const { farm, geoStatus, refreshGeolocation } = useLocation();
  const dot =
    geoStatus === "granted"
      ? "#3A7C58"
      : geoStatus === "requesting"
        ? "#E89B3C"
        : geoStatus === "denied"
          ? "#C77A26"
          : "#B5BEB6";
  const title =
    geoStatus === "granted"
      ? "GPS 좌표 적용됨"
      : geoStatus === "requesting"
        ? "GPS 좌표 가져오는 중…"
        : geoStatus === "denied"
          ? "GPS 권한 거부됨 — 기본 좌표 사용"
          : "GPS 미지원 — 기본 좌표 사용";
  return (
    <button
      className="hero-location-pill"
      onClick={refreshGeolocation}
      title={title}
      aria-label="현재 위치 새로고침"
    >
      <IconLocation size={13} />
      <span>{farm.name}</span>
      <span
        aria-hidden
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: dot,
          display: "inline-block",
        }}
      />
    </button>
  );
}
