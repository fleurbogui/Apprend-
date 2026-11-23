// Menu du profil (feuille du bas) et aide à l'installation sur le téléphone
import { esc, initiale, toast } from '../outils.js';
import { ico } from '../icones.js';
import { coco } from '../mascotte.js';
import { P, Profils } from '../profils.js';
import { etapesFaites, serieJours, totalEtapes, totalEtoiles } from '../progression.js';
import { serveurConfigure } from '../sync.js';
import { aller } from '../navigation.js';
import { surActions } from '../actions.js';
import { fermerModale, ouvrirModale } from '../ui/modale.js';

const appareil = {
  ios: /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1),
  android: /android/i.test(navigator.userAgent),
  get safari() { return this.ios && !/crios|fxios|edgios|opios/i.test(navigator.userAgent); },
  get installee() { return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true; }
};
let invitationInstall = null;

function etatSynchro(p) {
  if (!serveurConfigure()) return ['off', 'Sauvegardé sur ce téléphone'];
  if (p.enAttente.length) return ['attente', `${p.enAttente.length} étape(s) à envoyer dès qu'Internet revient`];
  if (p.synchro) return ['ok', `Sauvegardé en ligne le ${new Date(p.synchro).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}`];
  return ['attente', 'Connexion au serveur…'];
}

function ouvrirMenuProfil() {
  const p = P();
  const [classe, texte] = etatSynchro(p);
  ouvrirModale(`
    <div class="entete-profil">
      <span class="avatar grand">${esc(initiale(p.nom))}</span>
      <div><b>${esc(p.nom)}</b><small>${totalEtoiles()} étoiles · ${etapesFaites()}/${totalEtapes()} étapes · ${serieJours()} jour(s) de suite</small></div>
    </div>
    <p class="etat-synchro"><span class="point ${classe}"></span>${texte}</p>
    <div class="menu-liste">
      <button type="button" class="btn btn-blanc btn-large" data-action="deconnexion">${ico('sortir')} Changer d'élève <span lang="zh">切换用户</span></button>
      <button type="button" class="btn btn-blanc btn-large" data-action="aide">${ico('telephone')} Installer l'appli <span lang="zh">安装应用</span></button>
      <button type="button" class="btn btn-blanc btn-large" data-action="credits">${ico('photo')} Crédits photos <span lang="zh">图片来源</span></button>
      <button type="button" class="btn btn-rouge btn-large" data-action="fermer-modale">Fermer <span lang="zh">关闭</span></button>
    </div>
    <p class="note-bas">Ta progression n'est jamais effacée : retape ton prénom et ton code pour la retrouver.</p>`);
}

function ouvrirAide() {
  const blocAndroid = `
    <section class="bloc-os ${appareil.android ? 'actif' : ''}">
      <h3>Sur Android</h3>
      <ol><li>Ouvre le lien dans <b>Chrome</b></li><li>Appuie sur les <b>3 points ⋮</b> en haut à droite</li>
        <li>« <b>Ajouter à l'écran d'accueil</b> » puis « <b>Installer</b> »</li></ol>
      <p lang="zh">用 Chrome 打开链接 → 点击右上角的 ⋮ → “添加到主屏幕” → “安装”</p>
    </section>`;
  const blocIos = `
    <section class="bloc-os ${appareil.ios ? 'actif' : ''}">
      <h3>Sur iPhone / iPad</h3>
      <ol><li>Ouvre le lien dans <b>Safari</b></li><li>Appuie sur <b>Partager</b> en bas</li>
        <li>« <b>Sur l'écran d'accueil</b> » puis « <b>Ajouter</b> »</li></ol>
      <p lang="zh">用 Safari 打开链接 → 点击底部的“分享” → “添加到主屏幕” → “添加”</p>
    </section>`;
  let conseil = 'Installe-moi sur ton téléphone : je marcherai même sans Internet !';
  if (appareil.installee) conseil = 'Je suis déjà installé sur ce téléphone. Bravo !';
  else if (appareil.ios && !appareil.safari) conseil = 'Sur iPhone, il faut ouvrir le lien dans Safari pour m\'installer.';

  ouvrirModale(`
    <div class="parole parole-gauche">${coco('parle', { taille: 70 })}<div class="bulle"><p class="bulle-fr">${conseil}</p></div></div>
    ${invitationInstall ? `<button type="button" class="btn btn-rouge btn-large" data-action="installer">Installer maintenant <span lang="zh">立即安装</span></button>` : ''}
    ${appareil.ios ? blocIos + blocAndroid : blocAndroid + blocIos}
    <div class="menu-liste"><button type="button" class="btn btn-rouge btn-large" data-action="fermer-modale">Fermer <span lang="zh">关闭</span></button></div>`);
}

export function installerMenu() {
  window.addEventListener('beforeinstallprompt', (ev) => { ev.preventDefault(); invitationInstall = ev; });
  window.addEventListener('appinstalled', () => { invitationInstall = null; toast('Appli installée !'); });
}

surActions({
  'menu-profil': ouvrirMenuProfil,
  aide: ouvrirAide,
  'fermer-modale': fermerModale,
  credits: () => aller('#/credits'),
  deconnexion: () => {
    fermerModale();
    Profils.deconnecter();
    aller('#/', true);
  },
  installer: () => {
    if (!invitationInstall) return;
    invitationInstall.prompt();
    invitationInstall.userChoice.finally(() => { invitationInstall = null; fermerModale(); });
  }
});
