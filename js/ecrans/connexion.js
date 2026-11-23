// Écran de connexion : prénom + code secret de 4 chiffres.
// Avec le serveur, le code est vérifié par Supabase, qui renvoie un jeton de session.
// Une empreinte du code reste sur le téléphone pour pouvoir se reconnecter hors ligne.
import { $, cleNom, esc, initiale, toast, vibrer } from '../outils.js';
import { ico } from '../icones.js';
import { faireParler, htmlParole } from '../mascotte.js';
import { CODES_FACILES } from '../reglages.js';
import { etat } from '../etat.js';
import { Profils } from '../profils.js';
import { fusionner, rpc, serveurConfigure, synchroniser } from '../sync.js';
import { aller } from '../navigation.js';
import { surActions } from '../actions.js';

const MESSAGES = {
  prenom: ['Écris ton prénom avec des lettres, au moins 2.', '请用字母输入你的名字（至少两个字）。'],
  format: ['Ton code secret doit avoir 4 chiffres.', '密码必须是4位数字。'],
  facile: ['Ce code est trop facile à deviner. Choisis-en un autre !', '密码太简单了，请换一个。'],
  nom: ['Ce prénom n\'est pas accepté.', '这个名字无效。'],
  trop: ['Il y a trop d\'inscriptions en ce moment. Réessaie plus tard.', '请稍后再试。'],
  horsLigne: ['Pas d\'Internet. La première connexion sur ce téléphone en a besoin.', '首次登录需要联网。'],
  incorrect: ['Ce n\'est pas le bon code.', '密码错误。'],
  inconnu: ['Oups, la connexion n\'a pas marché. Réessaie.', '登录失败，请重试。']
};

let enCours = false;

export function afficherConnexion() {
  etat.ecran = 'connexion';
  etat.session = null;
  const profils = Profils.liste();
  const [fr, zh] = etat.messageConnexion
    ? [etat.messageConnexion, '']
    : ['Bonjour ! Moi, c\'est Coco. Et toi, comment tu t\'appelles ?', '你好！我是Coco。你叫什么名字？'];

  $('#app').innerHTML = `
    <section class="ecran ecran-connexion">
      <p class="marque">Apprend<span>+</span></p>
      ${htmlParole(fr, zh, { humeur: etat.messageConnexion ? 'oups' : 'parle', taille: 118, id: 'bulle-connexion', classe: 'parole-grande' })}

      <form id="form-connexion" class="carte carte-connexion" autocomplete="off" novalidate>
        <label for="champ-nom">Ton prénom <span lang="zh">你的名字</span></label>
        <input id="champ-nom" class="champ" type="text" maxlength="30" placeholder="ex. Li W." enterkeyhint="next"
               autocomplete="off" autocorrect="off" autocapitalize="words" spellcheck="false">
        <p class="astuce">Prénom + initiale du nom, toujours pareil. <span lang="zh">名字 + 姓的首字母</span></p>

        <label for="champ-code">Ton code secret <span lang="zh">你的4位密码</span></label>
        <input id="champ-code" class="champ champ-code" type="password" inputmode="numeric" pattern="[0-9]*"
               maxlength="4" autocomplete="off" placeholder="••••" enterkeyhint="go">
        <p class="astuce">Première fois ? Invente 4 chiffres et garde-les pour toi. <span lang="zh">第一次？设置4位数字并记住它。</span></p>

        <button type="submit" class="btn btn-rouge btn-large">C'est parti ! <span lang="zh">开始</span> ${ico('fleche')}</button>
      </form>

      ${profils.length ? `
      <div class="deja-venus">
        <p>Déjà venus sur ce téléphone <span lang="zh">曾在本机登录</span></p>
        <div>${profils.map((p) => `
          <button type="button" class="autocollant-eleve" data-action="profil-choisir" data-cle="${esc(p.cle)}">
            <span class="avatar">${esc(initiale(p.nom))}</span>${esc(p.nom)}
          </button>`).join('')}</div>
      </div>` : ''}
    </section>`;
}

function repondre([fr, zh], humeur = 'oups') {
  faireParler(document.querySelector('.ecran-connexion .parole'), fr, zh, humeur);
  vibrer(60);
}

async function empreinteCode(cle, code) {
  if (!window.crypto || !crypto.subtle) return null;
  const octets = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`apprend-plus|${cle}|${code}`));
  return Array.from(new Uint8Array(octets), (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function validerConnexion(nom, code) {
  if (enCours) return;
  const prenom = String(nom || '').replace(/\s+/g, ' ').trim();
  code = String(code || '').trim();
  if (!/^\p{L}[\p{L}\p{M}' .-]{1,29}$/u.test(prenom)) return repondre(MESSAGES.prenom);
  if (!/^[0-9]{4}$/.test(code)) return repondre(MESSAGES.format);
  // Un code trop facile n'est jamais accepté par le serveur : inutile de l'envoyer
  if (CODES_FACILES.includes(code) && !(Profils.trouver(prenom) || {}).codeLocal) return repondre(MESSAGES.facile);

  const cle = cleNom(prenom);
  const local = Profils.trouver(prenom);
  const empreinte = await empreinteCode(cle, code);
  const bouton = $('#form-connexion button[type=submit]');
  enCours = true;
  if (bouton) bouton.disabled = true;

  try {
    if (!serveurConfigure()) {
      // Sans serveur, le code protège seulement l'accès sur ce téléphone
      if (local && local.codeLocal && local.codeLocal !== empreinte) return repondre(MESSAGES.incorrect);
      return ouvrirSession(prenom, { empreinte });
    }

    let r;
    try {
      r = await rpc('eleve_connexion', { p_nom: prenom, p_code: code });
    } catch (e) {
      // Hors ligne : seulement pour un élève déjà connecté ici avec ce même code
      if (local && local.jeton && local.codeLocal === empreinte) return ouvrirSession(prenom, {});
      return repondre(MESSAGES.horsLigne);
    }
    if (r && r.erreur === 'code') {
      const n = Number(r.restants) || 0;
      return repondre([`Ce n'est pas le bon code. Encore ${n} essai${n > 1 ? 's' : ''}.`, '密码错误。']);
    }
    if (r && r.erreur === 'bloque') {
      return repondre([`Trop d'essais ! Attends ${Number(r.minutes) || 15} minutes, ou demande à ton prof.`, '尝试次数太多，请稍后再试。']);
    }
    if (!r || r.erreur) return repondre(MESSAGES[r && r.erreur] || MESSAGES.inconnu);
    return ouvrirSession(prenom, { jeton: String(r.jeton || ''), empreinte, donnees: r, nouveau: !!r.nouveau });
  } finally {
    enCours = false;
    if (bouton) bouton.disabled = false;
  }
}

function ouvrirSession(nom, { jeton, empreinte, donnees, nouveau } = {}) {
  const p = Profils.ouvrir(nom);
  if (jeton) p.jeton = jeton;
  if (empreinte) p.codeLocal = empreinte;
  if (donnees) fusionner(p, donnees);
  Profils.sauver();
  etat.messageConnexion = '';
  toast(nouveau ? `Bienvenue ${p.nom} ! Retiens bien ton code.` : `Bon retour, ${p.nom} !`);
  aller('#/', true);
  synchroniser();
}

export function installerConnexion() {
  document.addEventListener('submit', (ev) => {
    if (ev.target.id !== 'form-connexion') return;
    ev.preventDefault();
    validerConnexion($('#champ-nom').value, $('#champ-code').value);
  });
  surActions({
    'profil-choisir': (el) => {
      const p = Profils.data.profils[el.dataset.cle];
      if (!p) return;
      $('#champ-nom').value = p.nom;
      $('#champ-code').value = '';
      $('#champ-code').focus();
    }
  });
}
