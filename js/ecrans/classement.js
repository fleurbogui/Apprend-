// Classement : semaine (points depuis lundi) et général (étoiles)
import { $, debutSemaine, esc, initiale, rangFr } from '../outils.js';
import { htmlParole } from '../mascotte.js';
import { etat } from '../etat.js';
import { P } from '../profils.js';
import { chargerClassement, serveurConfigure } from '../sync.js';
import { htmlBarreHaut, htmlNav, htmlTitre } from '../ui/composants.js';
import { surActions } from '../actions.js';

// Classement gardé sur le téléphone ; la partie « semaine » est vidée si une nouvelle semaine a commencé
function classementCache() {
  const c = P() && P().classement;
  if (!c) return null;
  const memeSemaine = new Date(c.debut).getTime() >= debutSemaine().getTime() - 86400000;
  return { ...c, semaine: memeSemaine ? c.semaine : [], nb_semaine: memeSemaine ? c.nb_semaine : 0 };
}

// Ce que dit Coco : la place de l'élève et qui dépasser
function motivation(liste, moi, semaine) {
  const unite = semaine ? 'points' : 'étoiles';
  if (!moi) {
    return semaine
      ? ['Termine une étape cette semaine pour entrer dans le classement !', '本周完成一关即可上榜！']
      : ['Gagne ta première étoile pour entrer dans le classement !', '获得第一颗星即可上榜！'];
  }
  if (moi.rang === 1) return [`Tu es 1er avec ${moi.score} ${unite} ! Garde ta place !`, '你是第一名！继续保持！'];
  const devant = liste.filter((x) => x.score > moi.score).pop();
  if (!devant) return [`Tu es ${rangFr(moi.rang)}. Continue, tu peux monter !`, `你是第${moi.rang}名，加油！`];
  const ecart = devant.score - moi.score + 1;
  return [`Tu es ${rangFr(moi.rang)}. Encore ${ecart} ${unite} et tu passes devant ${devant.nom} !`, `你是第${moi.rang}名。再得${ecart}分就能超过${devant.nom}！`];
}

function htmlPodium(liste, unite) {
  const marche = (x, cls) => (x ? `
    <div class="marche ${cls} ${x.moi ? 'moi' : ''}">
      <span class="avatar">${esc(initiale(x.nom))}</span>
      <b>${esc(x.nom)}</b><small>${x.score} ${unite}</small>
      <div class="socle">${x.rang}</div>
    </div>` : `<div class="marche ${cls} vide"><div class="socle"></div></div>`);
  const place = (o) => liste.find((x) => x.ordre === o);
  const reste = liste.filter((x) => x.ordre > 3);
  return `
    <div class="podium">${marche(place(2), 'deux')}${marche(place(1), 'un')}${marche(place(3), 'trois')}</div>
    ${reste.length ? `<ol class="liste-classement">${reste.map((x, i) => `
      ${x.ordre > (i ? reste[i - 1].ordre : 3) + 1 ? '<li class="saut" aria-hidden="true">···</li>' : ''}
      <li class="${x.moi ? 'moi' : ''}"><span class="rang">${x.rang}</span><span class="avatar">${esc(initiale(x.nom))}</span>
        <span class="nom">${esc(x.nom)}${x.moi ? ' <small>(toi)</small>' : ''}</span><span class="score">${x.score} ${unite}</span></li>`).join('')}
    </ol>` : ''}`;
}

export function afficherClassement(rafraichir = true) {
  etat.ecran = 'classement';
  etat.session = null;
  const c = classementCache();
  const semaine = etat.ongletClassement === 'semaine';
  const liste = c ? (semaine ? c.semaine : c.general) : [];
  const moi = liste.find((x) => x.moi);
  const unite = semaine ? 'pts' : '★';

  let corps;
  if (!serveurConfigure()) corps = htmlParole('Le classement arrive quand ton prof aura relié l\'appli au serveur.', '老师连接服务器后即可查看排行榜。', { humeur: 'content', taille: 84 });
  else if (!c) corps = htmlParole(navigator.onLine === false ? 'Connecte-toi à Internet pour voir le classement.' : 'Je vais chercher le classement…', navigator.onLine === false ? '请连接网络。' : '加载中…', { humeur: 'content', taille: 84, id: 'bulle-classement' });
  else {
    const [fr, zh] = motivation(liste, moi, semaine);
    corps = htmlParole(fr, zh, { humeur: moi && moi.rang === 1 ? 'bravo' : 'parle', taille: 84 }) + (liste.length ? htmlPodium(liste, unite) : '');
  }
  const nb = c ? (semaine ? c.nb_semaine : c.nb_general) : 0;

  $('#app').innerHTML = `
    <section class="ecran avec-nav">
      ${htmlBarreHaut()}
      <div class="page">
        ${htmlTitre('Classement', '排行榜')}
        <div class="interrupteur" role="tablist">
          <button type="button" role="tab" aria-selected="${semaine}" data-action="onglet-classement" data-onglet="semaine">Cette semaine</button>
          <button type="button" role="tab" aria-selected="${!semaine}" data-action="onglet-classement" data-onglet="general">Depuis le début</button>
        </div>
        ${corps}
        <p class="note-bas">
          ${semaine ? 'Points gagnés depuis lundi. Une étape compte une fois par jour, et pas si elle est faite trop vite.'
                    : 'Total des étoiles, avec le meilleur score de chaque étape.'}
          ${nb ? ` ${nb} élève${nb > 1 ? 's' : ''} classé${nb > 1 ? 's' : ''}.` : ''}
        </p>
      </div>
      ${htmlNav('#/classement')}
    </section>`;

  if (rafraichir && serveurConfigure()) {
    chargerClassement().then((ok) => {
      if (etat.ecran !== 'classement') return;
      if (ok) afficherClassement(false);
      else if (!c) {
        const b = $('#bulle-classement');
        if (b) b.innerHTML = '<p class="bulle-fr">Le classement n\'est pas disponible. Réessaie plus tard.</p><p class="bulle-zh" lang="zh">排行榜暂时无法显示。</p>';
      }
    });
  }
}

surActions({
  'onglet-classement': (el) => {
    etat.ongletClassement = el.dataset.onglet === 'general' ? 'general' : 'semaine';
    afficherClassement(false);
  }
});
