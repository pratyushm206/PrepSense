const iconPaths = {
  check: <path d="m5 12 4.5 4.5L19 7" />,
  chevronDown: <path d="m6 9 6 6 6-6" />,
  calendar: <><rect x="3" y="4" width="18" height="17" rx="3" /><path d="M8 2v4m8-4v4M3 9h18M8 14h3m-3 3h7" /></>,
  grid: <><circle cx="7" cy="7" r="3" /><circle cx="17" cy="7" r="3" /><circle cx="7" cy="17" r="3" /><circle cx="17" cy="17" r="3" /></>,
  target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /><path d="m12 12 6-6" /></>,
  bulb: <><path d="M12 3a7 7 0 0 0-4 12.75c.6.42 1 1.02 1 1.75h6c0-.73.4-1.33 1-1.75A7 7 0 0 0 12 3Z" /><path d="M9 21h6m-5-3v-2m4 2v-2" /></>,
  chart: <><path d="M4 18V6m0 12h16M8 15l3-4 3 2 5-7" /><path d="M16 6h3v3" /></>,
  clock: <><circle cx="24" cy="24" r="17" /><path d="M24 14v11l7 4M9 8l5 3m25-3-5 3" /></>,
  document: <><path d="M7 3h7l5 5v13H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" /><path d="M14 3v6h5M9 14h6m-6 4h6" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  sparkline: <><path d="M5 39h54M8 34l13-12 10 7 15-18 10 8" /><circle cx="21" cy="22" r="2" /><circle cx="31" cy="29" r="2" /><circle cx="46" cy="11" r="2" /></>,
  mail: <><rect x="3.5" y="5.5" width="17" height="13" rx="1.5" /><path d="M4 7.5 12 13l8-5.5" /></>,
  github: <path fill="currentColor" stroke="none" d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.04 1.53 1.04.9 1.53 2.36 1.09 2.94.83.09-.65.35-1.09.64-1.34-2.22-.25-4.56-1.11-4.56-4.95 0-1.1.39-1.99 1.03-2.69-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02A9.56 9.56 0 0 1 12 6.8a9.5 9.5 0 0 1 2.5.34c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.69 0 3.85-2.34 4.7-4.57 4.95.36.31.68.92.68 1.86v2.76c0 .26.18.58.69.48A10 10 0 0 0 12 2Z" />,
  linkedin: <><rect x="3.5" y="3.5" width="17" height="17" rx="2" /><path d="M8 10.5V16.5M8 7.5v.02M12 16.5v-3.6c0-1.2.9-2 2-2s2 .8 2 2v3.6" /></>,
  code: <><path d="M7 4.5h7.5L19 9v10.5H7z" /><path d="M14.5 4.5V9H19M9.5 13h5M9.5 16h3.5" /></>,
  logout: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" /></>,
  xBrand: <path d="M5 5 19 19M19 5 5 19" />,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></>,
  moon: <path d="M20.5 15.2A8.5 8.5 0 0 1 8.8 3.5 8.5 8.5 0 1 0 20.5 15.2Z" />
};

export function MenuIcon({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true" focusable="false">
      <path className="menu-icon-line menu-icon-line-top" d="M4 6h16" />
      <path className="menu-icon-line menu-icon-line-middle" d="M4 12h16" />
      <path className="menu-icon-line menu-icon-line-bottom" d="M4 18h16" />
    </svg>
  );
}

export function CloseIcon({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true" focusable="false">
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

export default function Icon({ name, className = '', title, viewBox = '0 0 24 24', ...props }) {
  return (
    <svg
      className={className}
      viewBox={viewBox}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      {...(title ? { 'aria-label': title } : {})}
      {...props}
    >
      {name === 'sparkline' && (
        <defs>
          <linearGradient id="dashboard-empty-sparkline-stroke" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="var(--glow-indigo)" />
            <stop offset="100%" stopColor="var(--accent-text)" />
          </linearGradient>
        </defs>
      )}
      <g className={name === 'sparkline' ? 'icon-sparkline-art' : undefined}>{iconPaths[name]}</g>
    </svg>
  );
}
