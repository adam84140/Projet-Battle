// Icônes SVG (style "trait" arrondi), utilisées dans le menu et le HUD.

const P = {
  plus: '<path d="M12 4v16M4 12h16" stroke-width="3.2"/>',
  shield: '<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/><path d="M9 12l2 2 4-4"/>',
  ammo: '<path d="M6 21V9l1.5-4L9 9v12M11 21V9l1.5-4L14 9v12M16 21V9l1.5-4L19 9v12M5 21h15"/>',
  grenade: '<circle cx="11" cy="14" r="6"/><path d="M11 8V5h4l2 2M15 5l3-2"/><path d="M8 12h6M8 15h6"/>',
  bolt: '<path d="M13 2L5 13h6l-1 9 8-11h-6z"/>',
  cross: '<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z"/>',
  rocket: '<path d="M5 19l3-1 8-8a4 4 0 0 0-6-6l-8 8-1 3z" /><path d="M14 4l6-1-1 6"/><path d="M5 19l-2 2M8 16l-3 3"/>',
  flame: '<path d="M12 22c4 0 7-3 7-7 0-4-3-6-4-10-2 2-2 4-2 6-2-1-3-3-3-5-3 3-5 6-5 9 0 4 3 7 7 7z"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/><path d="M4 20L20 4"/>',
  target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 1v5M12 18v5M1 12h5M18 12h5"/>',
  knife: '<path d="M4 20l6-6M10 14L20 4c1 4-1 8-6 12z"/><path d="M3 21l2-2"/>',
  rifle: '<path d="M2 11h14l2-2h4v3h-3l-2 2H9l-2 4H4l1-4H2z"/>',
  mg: '<path d="M1 11h16l2-1h4v2h-4l-1 2H10l-2 5H5l1-5H1z"/><path d="M10 14v3h3v-3"/>',
  sniper: '<path d="M1 12h16h6M7 12l-2 5H2l1-5M9 9h6v3H9z"/><circle cx="12" cy="8" r="1"/>',
  skull: '<path d="M12 3a8 8 0 0 0-8 8c0 3 1.5 4.5 3 5.5V20h10v-3.5c1.5-1 3-2.5 3-5.5a8 8 0 0 0-8-8z"/><circle cx="9" cy="11" r="1.6"/><circle cx="15" cy="11" r="1.6"/>',
  explosion: '<path d="M12 2l2 6 5-3-2 6 6 1-6 3 3 5-6-2-2 6-2-6-6 2 3-5-6-3 6-1-2-6 5 3z"/>',
  tank: '<path d="M3 15h18v4H3zM6 15l1-4h9l2 4M12 11V8h8"/>',
  jeep: '<path d="M3 16v-4l3-4h8l2 4h4v4z"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
  flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>',
  play: '<path d="M7 4l13 8-13 8z"/>',
  keyboard: '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h1M10 10h1M14 10h1M18 10h1M7 14h10"/>',
  sheet: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  roadkill: '<path d="M3 16v-4l3-4h8l2 4h4v4z"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>',
};

export function icon(name, size = 22, cls = '') {
  const body = P[name] || P.plus;
  return `<svg class="ico ${cls}" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}

export const WEAPON_ICON = {
  fusil: 'rifle',
  mitrailleuse: 'mg',
  sniper: 'sniper',
  knife: 'knife',
  grenade: 'grenade',
  rocket: 'rocket',
  shell: 'tank',
  explosion: 'explosion',
  roadkill: 'jeep',
};
