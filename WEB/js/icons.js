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