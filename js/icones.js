// Icônes dessinées en SVG (trait arrondi, couleur du texte)
const ICONES = {
  retour: '<path d="M15 18l-6-6 6-6"/>',
  fermer: '<path d="M18 6L6 18M6 6l12 12"/>',
  effacer: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
  ampoule: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
  passer: '<path d="M5 5.5l8 6.5-8 6.5z"/><path d="M18 5v14"/>',
  son: '<path d="M11 5L6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>',
  etoile: '<path fill="currentColor" stroke="none" d="M12 2.2l3 6.2 6.8.9-5 4.7 1.3 6.7L12 17.5l-6.1 3.2 1.3-6.7-5-4.7 6.8-.9z"/>',
  cadenas: '<rect x="5" y="11" width="14" height="10" rx="2.5"/><path d="M8 11V7.5a4 4 0 0 1 8 0V11"/>',
  coche: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  jouer: '<path fill="currentColor" stroke="none" d="M8 5.6v12.8a1 1 0 0 0 1.5.9l10-6.4a1 1 0 0 0 0-1.8l-10-6.4A1 1 0 0 0 8 5.6z"/>',
  flamme: '<path fill="currentColor" stroke="none" d="M12 2c1 3.6 5.5 5.6 5.5 11.2A5.5 5.5 0 0 1 6.5 13.5c0-2.6 1.1-4.3 2.6-5.8.2 1.9 1 3.2 2.5 3.4-1-3.2-.4-6.3.4-9.1z"/>',
  sortir: '<path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"/><path d="M10 17l-5-5 5-5M5 12h11"/>',
  photo: '<rect x="3" y="6" width="18" height="14" rx="2.5"/><circle cx="12" cy="13" r="3.5"/><path d="M8.5 6l1.5-2.2h4L15.5 6"/>',
  telephone: '<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
  livre: '<path d="M4 19.5V5a2 2 0 0 1 2-2h14v14H6.5A2.5 2.5 0 0 0 4 19.5zm0 0A2.5 2.5 0 0 0 6.5 22H20v-5"/>',
  maison: '<path d="M3 10.5L12 3l9 7.5"/><path d="M5 9.5V20h5v-6h4v6h5V9.5"/>',
  carte: '<path d="M9 4L3 6.5v13.5l6-2.5 6 2.5 6-2.5V4l-6 2.5z"/><path d="M9 4v13.5M15 6.5V20"/>',
  fleche: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  trophee: '<path d="M8 4h8v6a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4"/><path d="M12 14v4M8.5 21h7M10 18h4"/>'
};

export function ico(nom, classe = '') {
  return `<svg class="ico ${classe}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONES[nom] || ''}</svg>`;
}
