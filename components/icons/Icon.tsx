import * as React from 'react';

export type IconProps = {
  size?: number;
  strokeWidth?: number;
  className?: string;
  style?: React.CSSProperties;
};

type SvgIconProps = IconProps & { children: React.ReactNode };

function SvgIcon({ size = 16, strokeWidth = 1.6, className = '', style, children }: SvgIconProps) {
  return (
    <svg
      className={`icon ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const Chat = (p: IconProps) => (
  <SvgIcon {...p}>
    <path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </SvgIcon>
);
export const Briefcase = (p: IconProps) => (
  <SvgIcon {...p}>
    <rect x="2" y="7" width="20" height="14" rx="2" />
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
  </SvgIcon>
);
export const Users = (p: IconProps) => (
  <SvgIcon {...p}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </SvgIcon>
);
export const File = (p: IconProps) => (
  <SvgIcon {...p}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </SvgIcon>
);
export const Plus = (p: IconProps) => (
  <SvgIcon {...p}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </SvgIcon>
);
export const Upload = (p: IconProps) => (
  <SvgIcon {...p}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </SvgIcon>
);
export const Send = (p: IconProps) => (
  <SvgIcon {...p}>
    <path d="M22 2L11 13" />
    <path d="M22 2l-7 20-4-9-9-4 20-7z" />
  </SvgIcon>
);
export const Sparkle = (p: IconProps) => (
  <SvgIcon {...p}>
    <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z" />
    <path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8z" />
  </SvgIcon>
);
export const Search = (p: IconProps) => (
  <SvgIcon {...p}>
    <circle cx="11" cy="11" r="7" />
    <line x1="20" y1="20" x2="17" y2="17" />
  </SvgIcon>
);
export const Filter = (p: IconProps) => (
  <SvgIcon {...p}>
    <polygon points="22 3 2 3 10 12.5 10 19 14 21 14 12.5 22 3" />
  </SvgIcon>
);
export const Check = (p: IconProps) => (
  <SvgIcon {...p}>
    <polyline points="20 6 9 17 4 12" />
  </SvgIcon>
);
export const X = (p: IconProps) => (
  <SvgIcon {...p}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </SvgIcon>
);
export const Chevron = (p: IconProps) => (
  <SvgIcon {...p}>
    <polyline points="9 18 15 12 9 6" />
  </SvgIcon>
);
export const ChevronDown = (p: IconProps) => (
  <SvgIcon {...p}>
    <polyline points="6 9 12 15 18 9" />
  </SvgIcon>
);
export const Arrow = (p: IconProps) => (
  <SvgIcon {...p}>
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </SvgIcon>
);
export const ArrowLeft = (p: IconProps) => (
  <SvgIcon {...p}>
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </SvgIcon>
);
export const More = (p: IconProps) => (
  <SvgIcon {...p}>
    <circle cx="12" cy="12" r="1" />
    <circle cx="19" cy="12" r="1" />
    <circle cx="5" cy="12" r="1" />
  </SvgIcon>
);
export const Dot = (p: IconProps) => (
  <SvgIcon {...p}>
    <circle cx="12" cy="12" r="3" />
  </SvgIcon>
);
export const Mail = (p: IconProps) => (
  <SvgIcon {...p}>
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <polyline points="22 6 12 13 2 6" />
  </SvgIcon>
);
export const Phone = (p: IconProps) => (
  <SvgIcon {...p}>
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92z" />
  </SvgIcon>
);
export const Map = (p: IconProps) => (
  <SvgIcon {...p}>
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </SvgIcon>
);
export const Calendar = (p: IconProps) => (
  <SvgIcon {...p}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </SvgIcon>
);
export const GraduationCap = (p: IconProps) => (
  <SvgIcon {...p}>
    <path d="M22 10v6" />
    <path d="M2 10l10-5 10 5-10 5z" />
    <path d="M6 12v5c0 1.66 4 3 6 3s6-1.34 6-3v-5" />
  </SvgIcon>
);
export const Building = (p: IconProps) => (
  <SvgIcon {...p}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M9 3v18M15 3v18M3 9h18M3 15h18" />
  </SvgIcon>
);
export const Zap = (p: IconProps) => (
  <SvgIcon {...p}>
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </SvgIcon>
);
export const Settings = (p: IconProps) => (
  <SvgIcon {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </SvgIcon>
);
export const Trash = (p: IconProps) => (
  <SvgIcon {...p}>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
  </SvgIcon>
);
export const Copy = (p: IconProps) => (
  <SvgIcon {...p}>
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </SvgIcon>
);
export const PenLine = (p: IconProps) => (
  <SvgIcon {...p}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4z" />
  </SvgIcon>
);
export const Star = (p: IconProps) => (
  <SvgIcon {...p}>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </SvgIcon>
);
export const Refresh = (p: IconProps) => (
  <SvgIcon {...p}>
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </SvgIcon>
);
export const Cube = (p: IconProps) => (
  <SvgIcon {...p}>
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </SvgIcon>
);
export const Folder = (p: IconProps) => (
  <SvgIcon {...p}>
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </SvgIcon>
);
export const Eye = (p: IconProps) => (
  <SvgIcon {...p}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </SvgIcon>
);
export const Download = (p: IconProps) => (
  <SvgIcon {...p}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </SvgIcon>
);
export const Bot = (p: IconProps) => (
  <SvgIcon {...p}>
    <rect x="4" y="7" width="16" height="12" rx="2" />
    <circle cx="9" cy="13" r="1.2" />
    <circle cx="15" cy="13" r="1.2" />
    <path d="M12 3v4" />
    <path d="M9 19v2M15 19v2" />
  </SvgIcon>
);
export const Pause = (p: IconProps) => (
  <SvgIcon {...p}>
    <rect x="6" y="4" width="4" height="16" />
    <rect x="14" y="4" width="4" height="16" />
  </SvgIcon>
);
export const TrendingUp = (p: IconProps) => (
  <SvgIcon {...p}>
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </SvgIcon>
);
export const HelpCircle = (p: IconProps) => (
  <SvgIcon {...p}>
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </SvgIcon>
);
export const AlertTriangle = (p: IconProps) => (
  <SvgIcon {...p}>
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </SvgIcon>
);
