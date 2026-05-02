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
        <div className={"screen" + (isAI ? " screen-ai-mode" : "")} key={pathname}>
          {children}
        </div>
        <TabBar />
      </div>
    </LocationProvider>
  );
}
