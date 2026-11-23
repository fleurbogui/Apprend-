// Réglages du jeu
export const CONFIG = {
  cleProfils: 'francais-aventures-profils-v2',
  cleAncienne: 'francais-aventures-progression-v1',
  essaisMax: 3,
  nbLeurres: 2,
  lettresLeurres: 'AEIOURSTLNMCPD',
  penaliteIndice: 1,
  penalitePasser: 3,
  pointsSansErreur: 10,
  pointsAvecErreur: 5,
  dureeMaxEtape: 3600 // au-delà, l'élève a sûrement laissé l'appli ouverte
};

export const TYPES = {
  1: { fr: 'Facile', zh: '简单', aide: true },
  2: { fr: 'Intermédiaire', zh: '中级', aide: true },
  3: { fr: 'Défi', zh: '挑战', aide: false },
  4: { fr: 'Devinette', zh: '猜谜', aide: false }
};

// Valeur des lettres au Scrabble, affichée sur les tuiles
export const VALEURS = {
  A: 1, B: 3, C: 3, D: 2, E: 1, F: 4, G: 2, H: 4, I: 1, J: 8, K: 10, L: 1, M: 2,
  N: 1, O: 1, P: 3, Q: 8, R: 1, S: 1, T: 1, U: 1, V: 4, W: 10, X: 10, Y: 10, Z: 10
};

// Refusés comme code secret (même liste que dans installation.sql)
export const CODES_FACILES = ['0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999', '1234', '4321', '0123', '9876'];
