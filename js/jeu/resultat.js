// Fin d'étape : étoiles, réaction de Coco, mots appris et suite
import { $, esc, estImage } from '../outils.js';
import { ico } from '../icones.js';
import { htmlParole } from '../mascotte.js';
import { etat } from '../etat.js';
import { etapeSuivante } from '../progression.js';

const REACTIONS = {
  3: ['Parfait, zéro erreur ! Tu es un champion !', '太完美了！一个错误都没有！'],
  2: ['Très bien ! Encore un petit effort pour 3 étoiles.', '很好！再努力一点就能拿三颗星。'],
  1: ['Bien joué, tu as fini ! Rejoue pour gagner plus d\'étoiles.', '做得好！再玩一次可以拿更多星星。']
};

export function afficherResultat() {
  etat.ecran = 'resultat';
  const r = etat.dernierResultat;
  const suite = etapeSuivante(r.n, r.e);
  const [fr, zh] = REACTIONS[r.etoiles];
  const temps = `${Math.floor(r.duree / 60)}:${String(r.duree % 60).padStart(2, '0')}`;

  $('#app').innerHTML = `
    <section class="ecran ecran-resultat">
      <div class="grandes-etoiles" aria-label="${r.etoiles} étoiles sur 3">
        ${[1, 2, 3].map((k) => ico('etoile', k <= r.etoiles ? '' : 'vide')).join('')}
      </div>
      ${htmlParole(r.record ? `Nouveau record ! ${fr}` : fr, zh, { humeur: r.etoiles === 3 ? 'bravo' : 'parle', taille: 110, classe: 'parole-grande' })}

      <ul class="compteurs">
        <li><b>${r.points}</b><span>points</span></li>
        <li><b>${r.penalites}</b><span>erreurs</span></li>
        <li><b>${temps}</b><span>temps</span></li>
      </ul>

      <section class="mots-appris">
        <h2>Les mots de l'étape <span lang="zh">点击收听</span></h2>
        <ul>${r.bilan.map((m) => `
          <li><button type="button" class="puce-mot ${m.reussi ? '' : 'rate'}" data-action="dire" data-texte="${esc(m.audio || m.mot)}">
            ${estImage(m.image) ? `<img src="${esc(m.image)}" alt="">` : ''}${esc(m.mot)} ${ico('son')}
          </button></li>`).join('')}</ul>
      </section>

      <div class="boutons-resultat">
        ${suite ? `<button type="button" class="btn btn-rouge btn-large" data-action="etape" data-n="${suite[0]}" data-e="${suite[1]}" data-remplacer="1">
          ${suite[0] !== r.n ? 'Niveau suivant' : 'Étape suivante'} ${ico('fleche')}</button>` : ''}
        <button type="button" class="btn btn-blanc btn-large" data-action="etape" data-n="${r.n}" data-e="${r.e}" data-remplacer="1">${ico('effacer')} Recommencer</button>
        <button type="button" class="btn btn-blanc btn-large" data-action="accueil">${ico('maison')} Accueil</button>
      </div>
    </section>`;

  if (r.etoiles === 3) lancerConfettis();
}

function lancerConfettis() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const couleurs = ['#E0242B', '#FFFFFF', '#FFC53D', '#1E1416'];
  const zone = document.createElement('div');
  zone.className = 'confettis';
  for (let i = 0; i < 46; i++) {
    const c = document.createElement('i');
    c.style.left = Math.random() * 100 + '%';
    c.style.background = couleurs[i % couleurs.length];
    c.style.animationDuration = 1.8 + Math.random() * 1.6 + 's';
    c.style.animationDelay = Math.random() * 0.5 + 's';
    zone.appendChild(c);
  }
  document.body.appendChild(zone);
  setTimeout(() => zone.remove(), 4500);
}
