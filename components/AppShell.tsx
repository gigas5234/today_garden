"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LocationProvider } from "./LocationContext";
import {
  IconCloudSun,
  IconClock,
  IconChecklist,
  IconChatBot,
} from "./icons";

type TabDef = {
  id: "weather" | "hourly" | "tasks" | "ai";
  label: string;
  href: string;
  icon: typeof IconCloudSun;
};

const TABS: TabDef[] = [
  { id: "weather", label: "날씨", href: "/weather", icon: IconCloudSun },
  { id: "hourly", label: "시간별", href: "/", icon: IconClock },
  { id: "tasks", label: "할 일", href: "/tasks", icon: IconChecklist },
  { id: "ai", label: "AI 상담", href: "/chat", icon: IconChatBot },
];

function StatusBar() {
  return (
    <div className="status-bar">
      <span>9:41</span>
      <div className="right">
        <svg width="18" height="11" viewBox="0 0 18 11" fill="currentColor">
          <path d="M1 7v3h2V7H1zm4-3v6h2V4H5zm4-3v9h2V1H9zm4-1v10h2V0h-2z" />
        </svg>
        <svg
          width="16"
          height="11"
          viewBox="0 0 16 11"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
        >
          <path d="M1 4 a8 8 0 0 1 14 0" />
          <path d="M3 6.5 a5 5 0 0 1 10 0" />
          <circle cx="8" cy="9" r="1" fill="currentColor" />
        </svg>
        <svg width="24" height="11" viewBox="0 0 24 11" fill="none">
          <rect x="1" y="1" width="20" height="9" rx="2" stroke="currentColor" />
          <rect x="3" y="3" width="16" height="5" rx="1" fill="currentColor" />
          <rect x="22" y="4" width="1.5" height="3" rx="0.5" fill="currentColor" />
        </svg>
      </div>
    </div>
  );
}

function TabBar() {
  const pathname = usePathname();
  const activeId = (() => {
    if (pathname === "/" || pathname.startsWith("/?")) return "hourly";
    if (pathname.startsWith("/weather")) return "weather";
    if (pathname.startsWith("/tasks")) return "tasks";
    if (pathname.startsWith("/chat")) return "ai";
    return "hourly";
  })();
  return (
    <div className="tab-bar">
      {TABS.map((t) => {
        const Icon = t.icon;
        const active = activeId === t.id;
        return (
          <Link
            key={t.id}
            href={t.href}
            className={"tab-item" + (active ? " active" : "")}
            data-screen-label={t.label}
          >
            <span className="tab-icon">
              <Icon size={28} stroke={active ? 2.6 : 2.2} />
            </span>
            <span className="tab-label">{t.label}</span>
          </Link>
        );
      })}
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAI = pathname.startsWith("/chat");
  return (
    <LocationProvider>
      <div className="app-shell">
        <StatusBar />
        <div className={"screen" + (isAI ? " screen-ai-mode" : "")} key={pathname}>
          {children}
        </div>
        <TabBar />
      </div>
    </LocationProvider>
  );
}
