// Parcours (tous les niveaux) et écran d'un niveau (ses étapes)
import { NIVEAUX } from '../donnees.js';
import { $, bilingue, esc, estImage, toast, vibrer } from '../outils.js';
import { ico } from '../icones.js';
import { coco } from '../mascotte.js';
import { TYPES } from '../reglages.js';
import { etat } from '../etat.js';
import {
  cleEtape, couvertureNiveau, devoirsAffiches, etapeDebloquee, etapeTerminee, etapesFaites,
  etoilesEtape, etoilesNiveau, niveauDebloque, niveauTermine, prochaineEtape, totalEtapes
} from '../progression.js';
import { htmlBarreHaut, htmlChemin, htmlNav, htmlTitre } from '../ui/composants.js';
import { aller } from '../navigation.js';
import { nombre, surActions } from '../actions.js';

// Coco perché au-dessus de l'étape à faire
const cocoIci = (texte) => `<span class="coco-ici">${coco('parle', { taille: 46 })}<span>${esc(texte)}</span></span>`;

export function afficherParcours() {
  etat.ecran = 'parcours';
  etat.session = null;
  const faites = etapesFaites();
  const total = totalEtapes();
  const suite = prochaineEtape();
  const actuel = suite ? suite[0] : -1;

  const noeuds = NIVEAUX.map((niv, n) => {
    const nom = bilingue(niv.nom);
    const ouvert = niveauDebloque(n);
    const termine = niveauTermine(n);
    const couverture = couvertureNiveau(n);
    return {
      etat: termine ? 'termine' : !ouvert ? 'verrouille' : n === actuel ? 'actuel' : 'ouvert',
      label: `Niveau ${n + 1} : ${nom.fr}`,
      attributs: `data-action="niveau" data-n="${n}"`,
      dessus: n === actuel ? cocoIci('À toi !') : '',
      contenu: `${estImage(couverture) ? `<img src="${esc(couverture)}" alt="" loading="lazy" decoding="async">` : esc(couverture)}
        ${termine ? `<span class="badge">${ico('coche')}</span>` : !ouvert ? `<span class="badge">${ico('cadenas')}</span>` : ''}`,
      dessous: `<div class="etiquette"><b>${n + 1}. ${esc(nom.fr)}</b><span lang="zh">${esc(nom.zh)}</span>
        <span class="etoiles-mini">${ico('etoile', 'etoile-or')} ${etoilesNiveau(n)}/${niv.etapes.length * 3}</span></div>`
    };
  });

  $('#app').innerHTML = `
    <section class="ecran avec-nav">
      ${htmlBarreHaut()}
      <div class="page">
        ${htmlTitre('Mon parcours', '我的学习之路')}
        <div class="carte progression-globale">
          <b>${faites}<small> / ${total} étapes</small></b>
          <span class="jauge"><span style="width:${total ? Math.round((faites / total) * 100) : 0}%"></span></span>
        </div>
      </div>
      ${htmlChemin(noeuds)}
      ${htmlNav('#/parcours')}
    </section>`;
}

export function afficherNiveau(n) {
  etat.ecran = 'niveau:' + n;
  etat.session = null;
  const niv = NIVEAUX[n];
  const nom = bilingue(niv.nom);
  const couverture = couvertureNiveau(n);
  const devoirs = devoirsAffiches();
  const actuel = niv.etapes.findIndex((_, e) => etapeDebloquee(n, e) && !etapeTerminee(n, e));

  const noeuds = niv.etapes.map((etape, e) => {
    const faite = etapeTerminee(n, e);
    const ouverte = etapeDebloquee(n, e);
    const etoiles = etoilesEtape(n, e);
    const k = cleEtape(n, e);
    const enDevoir = devoirs.some((d) => d.etapes.includes(k) && !d.faites.includes(k));
    return {
      etat: faite ? 'termine' : !ouverte ? 'verrouille' : e === actuel ? 'actuel' : 'ouvert',
      classe: 'noeud-etape',
      label: `Étape ${e + 1}`,
      attributs: `data-action="etape" data-n="${n}" data-e="${e}"`,
      dessus: enDevoir ? '<span class="tampon tampon-noeud">Devoir</span>' : e === actuel ? cocoIci('Joue !') : '',
      contenu: ouverte ? (e === actuel ? ico('jouer') : String(e + 1)) : ico('cadenas'),
      dessous: `<div class="etoiles-etape">${[1, 2, 3].map((i) => ico('etoile', i <= etoiles ? '' : 'vide')).join('')}</div>
        <div class="nom-etape">Étape ${e + 1} · ${etape.length} mots</div>`
    };
  });

  $('#app').innerHTML = `
    <section class="ecran avec-nav">
      ${htmlBarreHaut({ titre: `Niveau ${n + 1}`, retour: true })}
      <div class="page">
        <div class="entete-niveau">
          ${estImage(couverture) ? `<img src="${esc(couverture)}" alt="">` : ''}
          <div>${htmlTitre(nom.fr, nom.zh)}</div>
          <span class="pastille">${ico('etoile', 'etoile-or')} ${etoilesNiveau(n)}/${niv.etapes.length * 3}</span>
        </div>
      </div>
      ${htmlChemin(noeuds, { espace: 165, haut: 86, taille: 80 })}
      <div class="carte legende-types">
        ${Object.entries(TYPES).map(([k, t]) => `<div><span class="puce-type t${k}">${k}</span><span>${t.fr}<span lang="zh">${t.zh}</span></span></div>`).join('')}
      </div>
      ${htmlNav('#/parcours')}
    </section>`;
}

surActions({
  niveau: (el) => {
    const n = nombre(el, 'n');
    if (niveauDebloque(n)) aller(`#/niveau/${n}`);
    else { vibrer(40); toast('Termine d\'abord le niveau d\'avant !'); }
  },
  etape: (el) => {
    const n = nombre(el, 'n');
    const e = nombre(el, 'e');
    if (etapeDebloquee(n, e)) aller(`#/etape/${n}/${e}`, el.dataset.remplacer === '1');
    else { vibrer(40); toast('Termine d\'abord l\'étape d\'avant !'); }
  }
});
