import * as React from "react";

type IconProps = React.SVGProps<SVGSVGElement> & {
  size?: number;
  stroke?: number;
  fill?: string;
  color?: string;
};

const Icon = ({
  children,
  size = 24,
  stroke = 2,
  fill = "none",
  style,
  ...rest
}: IconProps & { children: React.ReactNode }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={fill}
    stroke="currentColor"
    strokeWidth={stroke}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={style}
    {...rest}
  >
    {children}
  </svg>
);

export const IconLocation = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 22s8-7.5 8-13a8 8 0 1 0-16 0c0 5.5 8 13 8 13z" />
    <circle cx="12" cy="9" r="2.6" />
  </Icon>
);

export const IconChevDown = (p: IconProps) => (
  <Icon {...p} stroke={2.4}>
    <polyline points="6 9 12 15 18 9" />
  </Icon>
);

export const IconChevRight = (p: IconProps) => (
  <Icon {...p} stroke={2.4}>
    <polyline points="9 6 15 12 9 18" />
  </Icon>
);

export const IconChevLeft = (p: IconProps) => (
  <Icon {...p} stroke={2.4}>
    <polyline points="15 6 9 12 15 18" />
  </Icon>
);

export const IconSettings = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </Icon>
);

export const IconFilter = (p: IconProps) => (
  <Icon {...p}>
    <line x1="4" y1="6" x2="14" y2="6" />
    <line x1="18" y1="6" x2="20" y2="6" />
    <line x1="4" y1="12" x2="8" y2="12" />
    <line x1="12" y1="12" x2="20" y2="12" />
    <line x1="4" y1="18" x2="14" y2="18" />
    <line x1="18" y1="18" x2="20" y2="18" />
    <circle cx="16" cy="6" r="2" fill="currentColor" />
    <circle cx="10" cy="12" r="2" fill="currentColor" />
    <circle cx="16" cy="18" r="2" fill="currentColor" />
  </Icon>
);

export const IconLeaf = ({ size = 22, ...p }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...p}>
    <path
      d="M4 18C4 11 9 5 19 5c0 9-5 14-12 14-1.5 0-3-.3-3-.3"
      stroke="#3A7C58"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="#7FB287"
    />
    <path d="M4 19C7 15 11 12 16 10" stroke="#1F4D3A" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const IconDrop = ({ size = 22, color = "#5A8BB5", ...p }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} {...p}>
    <path d="M12 3.5c0 0 7 7.5 7 12.5a7 7 0 1 1-14 0c0-5 7-12.5 7-12.5z" />
  </svg>
);

export const IconWind = ({ size = 22, color = "#6B7A6F", ...p }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...p}
  >
    <path d="M3 8h11a3 3 0 1 0-3-3" />
    <path d="M3 12h15a3 3 0 1 1-3 3" />
    <path d="M3 16h7" />
  </svg>
);

export const IconSun = ({ size = 28, ...p }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" {...p}>
    <g className="sun-rays">
      <circle cx="20" cy="20" r="8" fill="#F0B441" />
      <g stroke="#F0B441" strokeWidth="2.4" strokeLinecap="round">
        <line x1="20" y1="3" x2="20" y2="7" />
        <line x1="20" y1="33" x2="20" y2="37" />
        <line x1="3" y1="20" x2="7" y2="20" />
        <line x1="33" y1="20" x2="37" y2="20" />
        <line x1="8" y1="8" x2="11" y2="11" />
        <line x1="29" y1="29" x2="32" y2="32" />
        <line x1="32" y1="8" x2="29" y2="11" />
        <line x1="11" y1="29" x2="8" y2="32" />
      </g>
    </g>
  </svg>
);

export const IconSunCloud = ({ size = 64 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
    <g transform="translate(8 6)">
      <circle cx="20" cy="22" r="11" fill="#F0B441" />
      <g stroke="#F0B441" strokeWidth="2.4" strokeLinecap="round">
        <line x1="20" y1="3" x2="20" y2="7" />
        <line x1="3" y1="22" x2="7" y2="22" />
        <line x1="9" y1="11" x2="11.5" y2="13.5" />
        <line x1="29" y1="11" x2="31.5" y2="8.5" />
        <line x1="9" y1="33" x2="11.5" y2="30.5" />
      </g>
    </g>
    <g transform="translate(18 30)">
      <ellipse cx="22" cy="18" rx="22" ry="13" fill="#FFFFFF" />
      <path
        d="M2 22 Q2 8 18 8 Q22 0 32 4 Q44 6 44 18 Q44 24 36 24 L8 24 Q2 24 2 22z"
        fill="#F2F2F2"
        opacity="0.6"
      />
      <path
        d="M2 22 Q2 8 18 8 Q22 0 32 4 Q44 6 44 18 Q44 24 36 24 L8 24 Q2 24 2 22z"
        stroke="#D8D8D8"
        strokeWidth="1"
        fill="none"
      />
    </g>
  </svg>
);

export const IconCloud = ({ size = 56 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
    <g transform="translate(8 18)">
      <path
        d="M2 32 Q2 14 22 14 Q26 4 40 6 Q56 8 58 24 Q64 24 64 32 Q64 40 56 40 L10 40 Q2 40 2 32z"
        fill="#FFFFFF"
        stroke="#D8D8D8"
        strokeWidth="1.2"
      />
    </g>
  </svg>
);

export const IconMoonCloud = ({ size = 56 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
    <g transform="translate(6 6)">
      <path
        d="M22 6 a12 12 0 1 0 12 18 a10 10 0 0 1 -12 -18z"
        fill="#9BB0BD"
        stroke="#7C95A4"
        strokeWidth="1"
      />
    </g>
    <g transform="translate(14 28)">
      <path
        d="M2 28 Q2 12 20 12 Q24 4 36 6 Q50 8 52 22 Q58 22 58 30 Q58 36 50 36 L8 36 Q2 36 2 28z"
        fill="#F5F5F5"
        stroke="#C8C8C8"
        strokeWidth="1"
      />
    </g>
  </svg>
);

export const IconRain = ({ size = 56 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
    <g transform="translate(8 10)">
      <path
        d="M2 28 Q2 10 22 10 Q26 0 40 2 Q56 4 58 22 Q64 22 64 30 Q64 38 56 38 L10 38 Q2 38 2 28z"
        fill="#C8D6DE"
        stroke="#94ABBA"
        strokeWidth="1"
      />
    </g>
    <g fill="#5A8BB5">
      <path d="M22 56 q-3 4 0 6 q3 -2 0 -6z" />
      <path d="M38 58 q-3 4 0 6 q3 -2 0 -6z" />
      <path d="M54 56 q-3 4 0 6 q3 -2 0 -6z" />
    </g>
  </svg>
);

export const IconSnow = ({ size = 56 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
    <g transform="translate(8 10)">
      <path
        d="M2 28 Q2 10 22 10 Q26 0 40 2 Q56 4 58 22 Q64 22 64 30 Q64 38 56 38 L10 38 Q2 38 2 28z"
        fill="#E8EFF3"
        stroke="#A8BBC7"
        strokeWidth="1"
      />
    </g>
    <g stroke="#94ABBA" strokeWidth="1.6" strokeLinecap="round">
      <path d="M22 56 v8 M19 60 h6 M20 58 l4 4 M24 58 l-4 4" />
      <path d="M40 58 v8 M37 62 h6 M38 60 l4 4 M42 60 l-4 4" />
      <path d="M58 56 v8 M55 60 h6 M56 58 l4 4 M60 58 l-4 4" />
    </g>
  </svg>
);

export const IconUmbrella = ({ size = 22, color = "#5A8BB5", ...p }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...p}
  >
    <path d="M3 12a9 9 0 0 1 18 0z" fill={color} fillOpacity="0.15" />
    <line x1="12" y1="12" x2="12" y2="19" />
    <path d="M9 19a3 3 0 0 0 6 0" />
  </svg>
);

export const IconUV = ({ size = 22, color = "#E89B3C", ...p }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...p}
  >
    <circle cx="12" cy="12" r="4" fill={color} />
    <line x1="12" y1="2" x2="12" y2="5" />
    <line x1="12" y1="19" x2="12" y2="22" />
    <line x1="2" y1="12" x2="5" y2="12" />
    <line x1="19" y1="12" x2="22" y2="12" />
    <line x1="5" y1="5" x2="7" y2="7" />
    <line x1="17" y1="17" x2="19" y2="19" />
    <line x1="19" y1="5" x2="17" y2="7" />
    <line x1="7" y1="17" x2="5" y2="19" />
  </svg>
);

export const IconDust = ({ size = 22, color = "#6B7A6F", ...p }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} {...p}>
    <circle cx="6" cy="6" r="1.5" />
    <circle cx="12" cy="4" r="1.5" />
    <circle cx="18" cy="7" r="1.5" />
    <circle cx="5" cy="12" r="1.5" />
    <circle cx="11" cy="11" r="1.5" />
    <circle cx="18" cy="13" r="1.5" />
    <circle cx="7" cy="18" r="1.5" />
    <circle cx="14" cy="19" r="1.5" />
    <circle cx="20" cy="18" r="1.5" />
  </svg>
);

export const IconSunrise = ({ size = 22, color = "#E89B3C", ...p }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...p}
  >
    <path d="M5 17h14" />
    <path d="M7 14a5 5 0 0 1 10 0" fill={color} fillOpacity="0.2" />
    <line x1="12" y1="3" x2="12" y2="6" />
    <line x1="4" y1="11" x2="6" y2="11" />
    <line x1="18" y1="11" x2="20" y2="11" />
    <polyline points="9 6 12 3 15 6" />
  </svg>
);

export const IconSunset = ({ size = 22, color = "#C77A26", ...p }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...p}
  >
    <path d="M5 17h14" />
    <path d="M7 14a5 5 0 0 1 10 0" fill={color} fillOpacity="0.2" />
    <line x1="12" y1="6" x2="12" y2="3" />
    <line x1="4" y1="11" x2="6" y2="11" />
    <line x1="18" y1="11" x2="20" y2="11" />
    <polyline points="9 3 12 6 15 3" />
  </svg>
);

export const IconShield = ({ size = 22, color = "#3A7C58", ...p }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...p}
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill={color} fillOpacity="0.15" />
  </svg>
);

export const IconClipboard = ({ size = 22, color = "#FFFFFF", ...p }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...p}
  >
    <rect x="6" y="4" width="12" height="16" rx="2" />
    <path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" />
    <line x1="9" y1="10" x2="15" y2="10" />
    <line x1="9" y1="14" x2="13" y2="14" />
  </svg>
);

export const IconCheck = ({ size = 18, color = "#FFFFFF", stroke = 3, ...p }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={stroke}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...p}
  >
    <polyline points="5 12 10 17 19 7" />
  </svg>
);

export const IconClock = ({ size = 18, color = "currentColor", ...p }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...p}
  >
    <circle cx="12" cy="12" r="9" />
    <polyline points="12 7 12 12 15 14" />
  </svg>
);

export const IconBell = ({ size = 18, color = "currentColor", ...p }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...p}
  >
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </svg>
);

export const IconArrowUp = ({ size = 14, color = "currentColor", ...p }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...p}
  >
    <line x1="12" y1="19" x2="12" y2="5" />
    <polyline points="5 12 12 5 19 12" />
  </svg>
);

export const IconSparkle = ({ size = 18, color = "currentColor", ...p }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} {...p}>
    <path d="M12 3l1.5 5L18 9.5 13.5 11 12 16l-1.5-5L6 9.5 10.5 8z" />
    <circle cx="19" cy="5" r="1" />
    <circle cx="5" cy="19" r="1" />
  </svg>
);

export const IconBot = ({ size = 28, color = "#FFFFFF", ...p }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" {...p}>
    <rect x="6" y="9" width="20" height="16" rx="6" fill={color} fillOpacity="0.95" />
    <circle cx="12" cy="17" r="2" fill="#1F4D3A" />
    <circle cx="20" cy="17" r="2" fill="#1F4D3A" />
    <line x1="16" y1="6" x2="16" y2="9" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <circle cx="16" cy="5" r="1.5" fill={color} />
    <path
      d="M22 5 l1.2 2.5 L26 8.5 L23.2 9.5 L22 12 L20.8 9.5 L18 8.5 L20.8 7.5z"
      fill="#F0B441"
    />
  </svg>
);

export const IconSend = ({ size = 18, color = "#FFFFFF", ...p }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} {...p}>
    <path d="M3 11.5L21 4l-7 18-2.5-8L3 11.5z" />
  </svg>
);

export const IconPlus = ({ size = 22, color = "currentColor", ...p }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2.4"
    strokeLinecap="round"
    {...p}
  >
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

export const IconChat = ({ size = 24, color = "currentColor", ...p }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...p}
  >
    <path
      d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z"
      fill={color}
      fillOpacity="0.0"
    />
  </svg>
);

export const IconList = ({ size = 24, color = "currentColor", ...p }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...p}
  >
    <line x1="9" y1="6" x2="20" y2="6" />
    <line x1="9" y1="12" x2="20" y2="12" />
    <line x1="9" y1="18" x2="20" y2="18" />
    <circle cx="4.5" cy="6" r="1.5" fill={color} />
    <circle cx="4.5" cy="12" r="1.5" fill={color} />
    <circle cx="4.5" cy="18" r="1.5" fill={color} />
  </svg>
);

/** 할 일 탭 — 체크박스가 있는 클립보드 (의미 더 명확) */
export const IconChecklist = ({ size = 24, color = "currentColor", ...p }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...p}
  >
    <rect x="5" y="4" width="14" height="17" rx="2" />
    <path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" />
    <polyline points="8.5 11 10 12.5 13 9.5" strokeWidth="2.2" />
    <line x1="14.5" y1="11" x2="17" y2="11" />
    <polyline points="8.5 16 10 17.5 13 14.5" strokeWidth="2.2" />
    <line x1="14.5" y1="16" x2="17" y2="16" />
  </svg>
);

/** AI 상담 탭 — 챗 버블 + 스파클 */
export const IconChatBot = ({ size = 24, color = "currentColor", ...p }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...p}
  >
    <path d="M4 6 a3 3 0 0 1 3 -3 h10 a3 3 0 0 1 3 3 v8 a3 3 0 0 1 -3 3 h-6 l-4 4 v-4 a3 3 0 0 1 -3 -3 z" />
    <circle cx="9.5" cy="10" r="1" fill={color} />
    <circle cx="14.5" cy="10" r="1" fill={color} />
    <path d="M19 4 l0.6 1.4 L21 6 l-1.4 0.6 L19 8 l-0.6 -1.4 L17 6 l1.4 -0.6 z" fill={color} stroke="none" />
  </svg>
);

export const IconCalendar = ({ size = 24, color = "currentColor", ...p }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...p}
  >
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <line x1="3" y1="10" x2="21" y2="10" />
    <line x1="8" y1="3" x2="8" y2="7" />
    <line x1="16" y1="3" x2="16" y2="7" />
  </svg>
);

export const IconCloudSun = ({ size = 24, color = "currentColor", ...p }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...p}
  >
    <circle cx="7.5" cy="8" r="3" fill={color} fillOpacity="0.5" />
    <line x1="7.5" y1="2.5" x2="7.5" y2="4" />
    <line x1="2.5" y1="8" x2="4" y2="8" />
    <line x1="3.5" y1="4" x2="4.5" y2="5" />
    <line x1="11.5" y1="4" x2="10.5" y2="5" />
    <path
      d="M8 17 Q8 11.5 13.5 11.5 Q17 10.5 19 14 Q22 14 22 17.5 Q22 21 18.5 21 L10 21 Q8 21 8 17z"
      fill={color}
      fillOpacity="0.35"
    />
  </svg>
);

const CROP_COLORS: Record<string, string> = {
  고추: "#D33C2E",
  토마토: "#E55C3C",
  오이: "#5A9B73",
  상추: "#7FB287",
};

export const CropChip = ({ name }: { name: string }) => {
  const c = CROP_COLORS[name];
  return (
    <span
      className="tag"
      style={{ borderColor: c ? c + "50" : undefined, color: c || "#3D4A41" }}
    >
      {name}
    </span>
  );
};

export const HashPill = ({
  icon,
  label,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  color?: string;
}) => (
  <span className="ctx-pill">
    <span style={{ color: color || "#5A8BB5", display: "inline-flex" }}>{icon}</span>
    <span>{label}</span>
  </span>
);
