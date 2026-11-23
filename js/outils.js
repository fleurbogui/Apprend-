// Petites fonctions utilisées partout
export const $ = (sel) => document.querySelector(sel);

// Canal d'événements entre modules (synchro terminée, session expirée, navigation...)
export const bus = new EventTarget();
export const emettre = (nom, detail) => bus.dispatchEvent(new CustomEvent(nom, { detail }));
export const ecouter = (nom, fn) => bus.addEventListener(nom, (ev) => fn(ev.detail));

export function esc(texte) {
  return String(texte ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// "Français / 中文" devient { fr, zh }
export function bilingue(texte) {
  const s = String(texte);
  const i = s.indexOf(' / ');
  return i === -1 ? { fr: s, zh: '' } : { fr: s.slice(0, i), zh: s.slice(i + 3) };
}
export function htmlBi(texte) {
  const b = bilingue(texte);
  return esc(b.fr) + (b.zh ? ` <span class="zh" lang="zh">${esc(b.zh)}</span>` : '');
}

// Comparaison des réponses : sans majuscules, accents, espaces ni tirets ("sœur" = "soeur")
export function normaliser(texte) {
  return String(texte).toLowerCase().replace(/œ/g, 'oe').replace(/æ/g, 'ae')
    .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '');
}

// Clé d'un prénom : minuscules, sans accents ni espaces en trop
export function cleNom(nom) {
  return String(nom).toLowerCase().replace(/œ/g, 'oe').replace(/æ/g, 'ae')
    .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
}

export const estLettre = (c) => /\p{L}/u.test(c);
export const estImage = (src) => /\.(png|jpe?g|gif|svg|webp|avif)$/i.test(String(src || ''));
export const initiale = (nom) => Array.from(String(nom || '?'))[0];

export function melanger(tab) {
  const t = tab.slice();
  for (let i = t.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [t[i], t[j]] = [t[j], t[i]];
  }
  return t;
}

export function vibrer(ms) {
  try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {}
}

// Prononciation en français par la synthèse vocale du téléphone
export function parler(texte) {
  if (!('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(texte);
    u.lang = 'fr-FR';
    u.rate = 0.85;
    const voix = window.speechSynthesis.getVoices().find((v) => /^fr/i.test(v.lang));
    if (voix) u.voice = voix;
    window.speechSynthesis.speak(u);
  } catch (e) {}
}

let minuteurToast = null;
export function toast(message, duree = 2600) {
  const el = $('#toast');
  el.textContent = message;
  el.classList.add('visible');
  clearTimeout(minuteurToast);
  minuteurToast = setTimeout(() => el.classList.remove('visible'), duree);
}

export function jourLocal(date = new Date()) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function joursEntre(jourA, jourB) {
  return Math.round((new Date(jourB + 'T12:00:00') - new Date(jourA + 'T12:00:00')) / 86400000);
}
export function debutSemaine(d = new Date()) {
  const lundi = new Date(d);
  lundi.setHours(0, 0, 0, 0);
  lundi.setDate(lundi.getDate() - ((lundi.getDay() + 6) % 7));
  return lundi;
}
export const rangFr = (r) => (r === 1 ? '1er' : r + 'e');

export function nouvelId() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}
