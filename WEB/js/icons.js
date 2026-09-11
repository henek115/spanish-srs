const STROKE_ICONS = {
  home: '<path d="M4 11.5 12 4l8 7.5"/><path d="M6 10v9a1 1 0 0 0 1 1h3v-5h4v5h3a1 1 0 0 0 1-1v-9"/>',
  medal: '<path d="M8 3 6 9M16 3l2 6"/><circle cx="12" cy="15" r="6"/><path d="M12 12.5 13.2 15l2.5.3-1.9 1.7.5 2.5-2.3-1.3-2.3 1.3.5-2.5-1.9-1.7 2.5-.3z"/>',
  tree: '<path d="M12 3 7 10h3l-4 6h4v5h4v-5h4l-4-6h3z"/>',
  test: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1"/><path d="m9 13 2 2 4-4"/>',
  back: '<path d="M15 5 8 12l7 7"/>',
  "chevron-right": '<path d="m9 5 7 7-7 7"/>',
  "check-circle": '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
  "x-circle": '<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/>',
  flame: '<path d="M12 2c1 3-2 4-2 7a4 4 0 0 0 8 0c0-1-.5-2-1-2 1 4-1 5-2 5a2.5 2.5 0 0 1-2.5-2.5c0-2 1.5-2.5 1.5-4.5 0-1-.5-2-2-3Z"/>',
  lock: '<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  tag: '<path d="m20.5 12.5-8 8a2 2 0 0 1-2.8 0l-6.2-6.2a2 2 0 0 1 0-2.8l8-8a2 2 0 0 1 1.4-.6H19a1.5 1.5 0 0 1 1.5 1.5v6.7a2 2 0 0 1-.5 1.4Z"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/>',
  chat: '<path d="M8 9h8M8 13h5"/><path d="M21 12a8 8 0 1 1-3.2-6.4L21 4v5h-5"/>',
  palette: '<path d="M12 3a9 9 0 0 0 0 18c1.5 0 2-.9 2-2 0-.6-.3-1-.6-1.4-.3-.4-.5-.7-.5-1.1 0-.8.7-1.5 1.5-1.5H16a3 3 0 0 0 3-3 9 9 0 0 0-7-9Z"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  settings:
    '<circle cx="12" cy="12" r="3"/>' +
    '<path d="M19.4 13a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 ' +
    '1.7 1.7 0 0 0-1 1.6V19a2 2 0 1 1-4 0v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 ' +
    '1.7 1.7 0 0 0-1.6-1H5a2 2 0 1 1 0-4h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H11a1.7 1.7 0 0 0 1-1.6V5a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 1 1.5 ' +
    '1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V11a1.7 1.7 0 0 0 1.6 1H19a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.4 1Z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  bolt: '<path d="M13 2 4 14h6l-1 8 9-12h-6z"/>',
  pencil: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  coin: '<circle cx="12" cy="12" r="9"/><path d="M12 7v10M9.3 9.5c0-1.4 1.2-2.3 2.7-2.3S14.7 8.1 14.7 9.5c0 3-5.4 2-5.4 5 0 1.4 1.2 2.3 2.7 2.3s2.7-.9 2.7-2.3"/>',
  ball: '<circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18M5.8 5.8c2.9 2.9 9.5 2.9 12.4 0M5.8 18.2c2.9-2.9 9.5-2.9 12.4 0"/>',
  fork: '<path d="M7 2v7a2 2 0 0 0 4 0V2M9 9v13M16 2c-1.7 1.7-2 3.7-2 6 0 1.2.8 2 2 2s2-.8 2-2c0-2.3-.3-4.3-2-6ZM16 10v12"/>',
  health: '<circle cx="12" cy="12" r="9"/><path d="M12 7v10M7 12h10"/>',
  people: '<circle cx="8" cy="8" r="3"/><circle cx="16.5" cy="9.5" r="2.3"/><path d="M2 20c0-3.5 2.7-6 6-6s6 2.5 6 6M14.5 14.8c2.7.4 4.7 2.5 4.7 5.2"/>',
  bag: '<path d="M6 8h12l-1 12H7L6 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  gift: '<rect x="4" y="9" width="16" height="11" rx="1"/><path d="M12 9V4M12 9v11M8 9a2.5 2.5 0 0 1 0-5c2 0 4 5 4 5M16 9a2.5 2.5 0 0 0 0-5c-2 0-4 5-4 5"/>',
  leaf: '<path d="M5 21c8 0 14-6 14-14V5h-2C9 5 3 11 3 19v2Z"/><path d="M5 21c3-6 7-10 13-13"/>',
  briefcase: '<rect x="3" y="8" width="18" height="12" rx="2"/><path d="M8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  car: '<path d="M4 16V11l2-5h12l2 5v5"/><path d="M4 16h16M7 16v2M17 16v2"/><circle cx="7.5" cy="16" r="1.2"/><circle cx="16.5" cy="16" r="1.2"/>',
  cap: '<path d="m2 9 10-5 10 5-10 5-10-5Z"/><path d="M6 12v4c0 1.5 2.7 3 6 3s6-1.5 6-3v-4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  sliders: '<path d="M4 6h10M17 6h3M4 12h3M9 12h11M4 18h13M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="7" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  trash: '<path d="M4 7h16M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13"/><path d="M10 11v6M14 11v6"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 20c0-3.9 3.6-7 8-7s8 3.1 8 7"/>',
  cloud: '<path d="M7 18a4.5 4.5 0 0 1-.5-8.97A5.5 5.5 0 0 1 17.3 8.02 4 4 0 0 1 17 18H7Z"/>',
};

const FILL_ICONS = {
  "star-filled": '<path d="M12 3.5 14.5 9l6 .8-4.4 4 1.2 5.8L12 16.8 6.7 19.6l1.2-5.8-4.4-4 6-.8Z"/>',
};
STROKE_ICONS["star-outline"] = FILL_ICONS["star-filled"];

/** @returns {string} markup for an <svg>, ready to drop in innerHTML */
export function iconSvg(name, { size = 24, color = "currentColor", filled = false } = {}) {
  const useFill = filled || name in FILL_ICONS;
  const inner = useFill ? FILL_ICONS[name] || STROKE_ICONS[name] : STROKE_ICONS[name];
  if (!inner) return "";
  if (useFill) {
    return `<svg viewBox="0 0 24 24" width="${size}" height="${size}"><g fill="${color}" stroke="none">${inner}</g></svg>`;
  }
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}"><g fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${inner}</g></svg>`;
}

export function iconEl(name, opts) {
  const span = document.createElement("span");
  span.className = "icon";
  span.innerHTML = iconSvg(name, opts);
  return span;
}