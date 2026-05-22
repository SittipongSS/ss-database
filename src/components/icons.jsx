import React from 'react'

const ICON_PATHS = {
  dashboard: <><rect x="2" y="2" width="5" height="6" rx="1"/><rect x="9" y="2" width="5" height="3" rx="1"/><rect x="2" y="10" width="5" height="4" rx="1"/><rect x="9" y="7" width="5" height="7" rx="1"/></>,
  products: <><path d="M8 2 L14 5 L14 11 L8 14 L2 11 L2 5 Z"/><path d="M2 5 L8 8 L14 5"/><path d="M8 8 L8 14"/></>,
  customers: <><circle cx="6" cy="6" r="2.5"/><path d="M2 13 c0-2.5 1.8-4 4-4 s4 1.5 4 4"/><circle cx="11.5" cy="5" r="2"/><path d="M9.5 13 c0-2 1.5-3.2 3.2-3.2 s2 0.8 2 0.8"/></>,
  orders: <><path d="M3 3 H13 V13 H3 Z"/><path d="M5.5 6 H10.5"/><path d="M5.5 8.5 H10.5"/><path d="M5.5 11 H8"/></>,
  invoice: <><path d="M3.5 1.5 H10 L12.5 4 V14.5 H3.5 Z"/><path d="M10 1.5 V4 H12.5"/><path d="M5.5 8 H10.5"/><path d="M5.5 10 H10.5"/><path d="M5.5 12 H8.5"/></>,
  search: <><circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5 L13.5 13.5"/></>,
  trending: <><path d="M2 11 L6 7 L9 9 L14 4"/><path d="M10.5 4 H14 V7.5"/></>,
  settings: <><circle cx="8" cy="8" r="2"/><path d="M8 1.5 V3.5 M8 12.5 V14.5 M14.5 8 H12.5 M3.5 8 H1.5 M12.6 3.4 L11.2 4.8 M4.8 11.2 L3.4 12.6 M12.6 12.6 L11.2 11.2 M4.8 4.8 L3.4 3.4"/></>,
  bell: <><path d="M4 11 V7 C4 4.8 5.8 3 8 3 C10.2 3 12 4.8 12 7 V11 L13 12.5 H3 Z"/><path d="M6.5 12.5 C6.5 13.3 7.2 14 8 14 C8.8 14 9.5 13.3 9.5 12.5"/></>,
  plus: <><path d="M8 3 V13 M3 8 H13"/></>,
  more: <><circle cx="3.5" cy="8" r="1"/><circle cx="8" cy="8" r="1"/><circle cx="12.5" cy="8" r="1"/></>,
  filter: <><path d="M2 3.5 H14 L9.5 8.5 V13 L6.5 11.5 V8.5 Z"/></>,
  download: <><path d="M8 2 V10"/><path d="M5 7 L8 10 L11 7"/><path d="M2.5 12 V13.5 H13.5 V12"/></>,
  upload: <><path d="M8 10 V2"/><path d="M5 5 L8 2 L11 5"/><path d="M2.5 12 V13.5 H13.5 V12"/></>,
  arrowRight: <><path d="M3 8 H13 M9 4 L13 8 L9 12"/></>,
  arrowUp: <><path d="M8 3 L8 13 M4 7 L8 3 L12 7"/></>,
  arrowDown: <><path d="M8 13 L8 3 M4 9 L8 13 L12 9"/></>,
  check: <><path d="M3 8 L7 12 L13 4"/></>,
  x: <><path d="M3.5 3.5 L12.5 12.5 M12.5 3.5 L3.5 12.5"/></>,
  calendar: <><rect x="2.5" y="3.5" width="11" height="10" rx="1"/><path d="M2.5 6.5 H13.5"/><path d="M5.5 2 V5 M10.5 2 V5"/></>,
  clock: <><circle cx="8" cy="8" r="5.5"/><path d="M8 5 V8 L10 9.5"/></>,
  package: <><path d="M2 4.5 L8 7.5 L14 4.5 L8 1.5 Z"/><path d="M2 4.5 V11.5 L8 14.5 L14 11.5 V4.5"/><path d="M8 7.5 V14.5"/></>,
  tag: <><path d="M2 8 L8 2 H13 V7 L7 13 Z"/><circle cx="10.5" cy="5.5" r="0.7" fill="currentColor"/></>,
  receipt: <><path d="M3 1.5 V14.5 L5 13 L7 14.5 L9 13 L11 14.5 L13 13 V1.5 Z"/><path d="M5.5 5 H10.5 M5.5 8 H10.5 M5.5 11 H8.5"/></>,
  alert: <><path d="M8 2 L14 13 H2 Z"/><path d="M8 6 V9.5"/><circle cx="8" cy="11.5" r="0.7" fill="currentColor"/></>,
  chevronDown: <><path d="M4 6 L8 10 L12 6"/></>,
  chevronLeft: <><path d="M10 4 L6 8 L10 12"/></>,
  chevronRight: <><path d="M6 4 L10 8 L6 12"/></>,
  sun: <><circle cx="8" cy="8" r="3"/><path d="M8 1 V3 M8 13 V15 M1 8 H3 M13 8 H15 M3.2 3.2 L4.6 4.6 M11.4 11.4 L12.8 12.8 M12.8 3.2 L11.4 4.6 M4.6 11.4 L3.2 12.8"/></>,
  moon: <><path d="M12 4A6 6 0 1 0 6 14A4 4 0 0 1 12 4Z"/></>,
  contrast: <><circle cx="8" cy="8" r="5.5"/><path d="M8 2.5V13.5"/><path d="M8 2.5A5.5 5.5 0 0 1 8 13.5Z" fill="currentColor" stroke="none"/></>,
  star: <><path d="M8 1.5 L9.8 5.5 L14 6.1 L11 9.1 L11.7 13.5 L8 11.4 L4.3 13.5 L5 9.1 L2 6.1 L6.2 5.5 Z"/></>,
  building: <><path d="M3 14 V3 H10 V14"/><path d="M10 14 V6 H13 V14"/><path d="M2 14 H14"/><path d="M5 5.5 H6 M7.5 5.5 H8.5 M5 8 H6 M7.5 8 H8.5 M5 10.5 H6 M7.5 10.5 H8.5 M11 8 H12 M11 10.5 H12"/></>,
  flask: <><path d="M6 1.5 V5.5 L3 12.5 C2.6 13.3 3.2 14 4 14 H12 C12.8 14 13.4 13.3 13 12.5 L10 5.5 V1.5"/><path d="M5 1.5 H11"/><path d="M4 9.5 H12"/></>,
  menu: <><path d="M2 4 H14 M2 8 H14 M2 12 H14"/></>,
}

export function Icon({ name, className = "" }) {
  const p = ICON_PATHS[name]
  if (!p) return null
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {p}
    </svg>
  )
}
