// État de l'interface partagé entre les écrans
export const etat = {
  ecran: '',               // écran affiché : 'accueil', 'parcours', 'niveau:2', 'etape'...
  session: null,           // exercice en cours (voir jeu/exercice.js)
  dernierResultat: null,   // résultat de la dernière étape, pour l'écran de résultat
  messageConnexion: '',    // message affiché sur l'écran de connexion
  ongletClassement: 'semaine'
};
