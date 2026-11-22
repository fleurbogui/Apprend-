// Contenu de l'application : niveaux, étapes et exercices.
//
// Un niveau : { id, nom: "Français / 中文", image (facultatif), etapes: [...] }.
// L'id ne doit jamais changer, il sert à enregistrer la progression.
// L'ordre du tableau est l'ordre d'affichage.
//
// Un exercice :
//   type      1 facile (lettres à cliquer), 2 première lettre donnée + lettres pièges,
//             3 saisie au clavier, 4 devinette avec indice
//   image     chemin de la photo, par exemple "images/chat.jpg"
//   mot       la réponse avec ses accents ; majuscules, accents et tirets sont ignorés à la correction
//   indice    pour le type 4, "Français / 中文"
//   consigne  "Français / 中文"
//   lettres   facultatif, lettres proposées pour le type 1
//   audio     facultatif, texte prononcé s'il diffère du mot
//
// Après une modification, augmenter VERSION dans service-worker.js.

const CLIQUE   = "Clique les lettres pour former le mot / 点击字母拼出单词";
const COMPLETE = "Complète le mot / 补全单词";
const ECRIS    = "Écris le mot sans aide / 独立拼写单词";
const DEVINE   = "Devine le mot / 猜一猜";
const COULEUR  = "Quelle est cette couleur ? / 这是什么颜色？";
const COMBIEN  = "Combien y en a-t-il ? / 有几个？";

const NIVEAUX = [
  {
    id: 1,
    nom: "Salutations & Présentation / 问候与介绍",
    etapes: [
      [
        { type: 1, image: "images/bonjour.jpg",  mot: "bonjour",   consigne: "Comment dit-on « 你好 » ? / 怎么说“你好”？" },
        { type: 2, image: "images/sourire.jpg",  mot: "sourire",   consigne: COMPLETE },
        { type: 4, image: "images/moi.jpg",      mot: "moi",       indice: "Je, la personne qui parle / 我", consigne: DEVINE },
        { type: 1, image: "images/aurevoir.jpg", mot: "au revoir", consigne: "Comment dit-on « 再见 » ? / 怎么说“再见”？" },
        { type: 3, image: "images/merci.jpg",    mot: "merci",     consigne: ECRIS }
      ],
      [
        { type: 1, image: "images/salut.jpg", mot: "salut", consigne: CLIQUE },
        { type: 2, image: "images/oui.jpg",   mot: "oui",   consigne: COMPLETE },
        { type: 2, image: "images/non.jpg",   mot: "non",   consigne: COMPLETE },
        { type: 4, image: "images/ami.jpg",   mot: "ami",   indice: "Personne que l'on aime bien / 朋友", consigne: DEVINE },
        { type: 3, image: "images/ici.jpg",   mot: "ici",   consigne: ECRIS }
      ],
      [
        { type: 1, image: "images/fille.jpg",  mot: "fille",  consigne: CLIQUE },
        { type: 2, image: "images/garcon.jpg", mot: "garçon", consigne: COMPLETE },
        { type: 2, image: "images/homme.jpg",  mot: "homme",  consigne: COMPLETE },
        { type: 4, image: "images/femme.jpg",  mot: "femme",  indice: "Une dame / 女人", consigne: DEVINE },
        { type: 3, image: "images/bebe.jpg",   mot: "bébé",   consigne: ECRIS }
      ]
    ]
  },
  {
    id: 3,
    nom: "La famille / 家庭",
    etapes: [
      [
        { type: 1, image: "images/mere.jpg",    mot: "mère",    consigne: CLIQUE },
        { type: 1, image: "images/pere.jpg",    mot: "père",    consigne: CLIQUE },
        { type: 2, image: "images/frere.jpg",   mot: "frère",   consigne: COMPLETE },
        { type: 2, image: "images/soeur.jpg",   mot: "sœur",    consigne: COMPLETE },
        { type: 4, image: "images/famille.jpg", mot: "famille", indice: "Les parents et les enfants ensemble / 家人", consigne: DEVINE }
      ],
      [
        { type: 1, image: "images/grandmere.jpg", mot: "grand-mère", consigne: CLIQUE },
        { type: 2, image: "images/grandpere.jpg", mot: "grand-père", consigne: COMPLETE },
        { type: 2, image: "images/enfant.jpg",    mot: "enfant",     consigne: COMPLETE },
        { type: 4, image: "images/mariage.jpg",   mot: "mariage",    indice: "La grande fête quand on se marie / 婚礼", consigne: DEVINE },
        { type: 3, image: "images/cadeau.jpg",    mot: "cadeau",     consigne: ECRIS }
      ]
    ]
  },
  {
    id: 9,
    nom: "Les fruits et légumes / 水果和蔬菜",
    image: "images/fraise.jpg",
    etapes: [
      [
        { type: 1, image: "images/pomme.jpg",  mot: "pomme",  consigne: CLIQUE },
        { type: 1, image: "images/banane.jpg", mot: "banane", consigne: CLIQUE },
        { type: 2, image: "images/orange.jpg", mot: "orange", consigne: COMPLETE },
        { type: 2, image: "images/fraise.jpg", mot: "fraise", consigne: COMPLETE },
        { type: 3, image: "images/cerise.jpg", mot: "cerise", consigne: ECRIS }
      ],
      [
        { type: 1, image: "images/poire.jpg",  mot: "poire",  consigne: CLIQUE },
        { type: 2, image: "images/raisin.jpg", mot: "raisin", consigne: COMPLETE },
        { type: 2, image: "images/ananas.jpg", mot: "ananas", consigne: COMPLETE },
        { type: 4, image: "images/citron.jpg", mot: "citron", indice: "Fruit jaune très acide / 很酸的黄色水果", consigne: DEVINE },
        { type: 3, image: "images/tomate.jpg", mot: "tomate", consigne: ECRIS }
      ],
      [
        { type: 1, image: "images/carotte.jpg",      mot: "carotte",        consigne: CLIQUE },
        { type: 1, image: "images/oignon.jpg",       mot: "oignon",         consigne: CLIQUE },
        { type: 2, image: "images/salade.jpg",       mot: "salade",         consigne: COMPLETE },
        { type: 2, image: "images/champignon.jpg",   mot: "champignon",     consigne: COMPLETE },
        { type: 4, image: "images/pommedeterre.jpg", mot: "pomme de terre", indice: "On en fait des frites / 可以做薯条的蔬菜", consigne: DEVINE }
      ]
    ]
  },
  {
    id: 4,
    nom: "Nourriture & Boissons / 食物与饮料",
    etapes: [
      [
        { type: 1, image: "images/pain.jpg",    mot: "pain",    consigne: CLIQUE },
        { type: 1, image: "images/lait.jpg",    mot: "lait",    consigne: CLIQUE },
        { type: 2, image: "images/fromage.jpg", mot: "fromage", consigne: COMPLETE },
        { type: 2, image: "images/riz.jpg",     mot: "riz",     consigne: COMPLETE },
        { type: 3, image: "images/eau.jpg",     mot: "eau",     consigne: ECRIS }
      ],
      [
        { type: 1, image: "images/croissant.jpg", mot: "croissant", consigne: CLIQUE },
        { type: 2, image: "images/soupe.jpg",     mot: "soupe",     consigne: COMPLETE },
        { type: 4, image: "images/cafe.jpg",      mot: "café",      indice: "Boisson noire du matin / 咖啡", consigne: DEVINE },
        { type: 4, image: "images/the.jpg",       mot: "thé",       indice: "Boisson chaude très aimée en Chine / 茶", consigne: DEVINE },
        { type: 3, image: "images/gateau.jpg",    mot: "gâteau",    consigne: ECRIS }
      ]
    ]
  },
  {
    id: 2,
    nom: "Couleurs & Nombres / 颜色与数字",
    etapes: [
      [
        { type: 1, image: "images/rouge.jpg", mot: "rouge", consigne: COULEUR },
        { type: 1, image: "images/bleu.jpg",  mot: "bleu",  consigne: COULEUR },
        { type: 2, image: "images/jaune.jpg", mot: "jaune", consigne: COULEUR },
        { type: 4, image: "images/un.jpg",    mot: "un",    indice: "Le premier chiffre : 1 / 第一个数字：1", consigne: COMBIEN },
        { type: 3, image: "images/deux.jpg",  mot: "deux",  consigne: COMBIEN }
      ],
      [
        { type: 1, image: "images/vert.jpg",   mot: "vert",   consigne: COULEUR },
        { type: 2, image: "images/blanc.jpg",  mot: "blanc",  consigne: COULEUR },
        { type: 2, image: "images/noir.jpg",   mot: "noir",   consigne: COULEUR },
        { type: 4, image: "images/trois.jpg",  mot: "trois",  indice: "Le chiffre 3 / 数字三", consigne: COMBIEN },
        { type: 3, image: "images/quatre.jpg", mot: "quatre", consigne: COMBIEN }
      ]
    ]
  },
  {
    id: 5,
    nom: "Les animaux / 动物",
    etapes: [
      [
        { type: 1, image: "images/chat.jpg",    mot: "chat",    consigne: CLIQUE },
        { type: 1, image: "images/chien.jpg",   mot: "chien",   consigne: CLIQUE },
        { type: 2, image: "images/oiseau.jpg",  mot: "oiseau",  consigne: COMPLETE },
        { type: 2, image: "images/poisson.jpg", mot: "poisson", consigne: COMPLETE },
        { type: 3, image: "images/cheval.jpg",  mot: "cheval",  consigne: ECRIS }
      ],
      [
        { type: 1, image: "images/vache.jpg",  mot: "vache",  consigne: CLIQUE },
        { type: 2, image: "images/cochon.jpg", mot: "cochon", consigne: COMPLETE },
        { type: 2, image: "images/lapin.jpg",  mot: "lapin",  consigne: COMPLETE },
        { type: 4, image: "images/souris.jpg", mot: "souris", indice: "Petit animal gris qui aime le fromage / 老鼠", consigne: DEVINE },
        { type: 3, image: "images/canard.jpg", mot: "canard", consigne: ECRIS }
      ],
      [
        { type: 1, image: "images/lion.jpg",     mot: "lion",     consigne: CLIQUE },
        { type: 2, image: "images/tigre.jpg",    mot: "tigre",    consigne: COMPLETE },
        { type: 2, image: "images/elephant.jpg", mot: "éléphant", consigne: COMPLETE },
        { type: 4, image: "images/singe.jpg",    mot: "singe",    indice: "Il adore les bananes / 猴子", consigne: DEVINE },
        { type: 3, image: "images/panda.jpg",    mot: "panda",    consigne: ECRIS }
      ]
    ]
  },
  {
    id: 6,
    nom: "La maison / 家",
    etapes: [
      [
        { type: 1, image: "images/maison.jpg",  mot: "maison",  consigne: CLIQUE },
        { type: 1, image: "images/porte.jpg",   mot: "porte",   consigne: CLIQUE },
        { type: 2, image: "images/fenetre.jpg", mot: "fenêtre", consigne: COMPLETE },
        { type: 2, image: "images/lit.jpg",     mot: "lit",     consigne: COMPLETE },
        { type: 3, image: "images/table.jpg",   mot: "table",   consigne: ECRIS }
      ],
      [
        { type: 1, image: "images/chaise.jpg",  mot: "chaise",  consigne: CLIQUE },
        { type: 2, image: "images/cuisine.jpg", mot: "cuisine", consigne: COMPLETE },
        { type: 2, image: "images/lampe.jpg",   mot: "lampe",   consigne: COMPLETE },
        { type: 4, image: "images/cle.jpg",     mot: "clé",     indice: "Pour ouvrir la porte / 钥匙", consigne: DEVINE },
        { type: 3, image: "images/jardin.jpg",  mot: "jardin",  consigne: ECRIS }
      ]
    ]
  },
  {
    id: 7,
    nom: "Le corps / 身体",
    etapes: [
      [
        { type: 1, image: "images/main.jpg",   mot: "main",   consigne: CLIQUE },
        { type: 1, image: "images/pied.jpg",   mot: "pied",   consigne: CLIQUE },
        { type: 2, image: "images/visage.jpg", mot: "visage", consigne: COMPLETE },
        { type: 4, image: "images/oeil.jpg",   mot: "œil",    indice: "On l'utilise pour voir / 眼睛", consigne: DEVINE },
        { type: 3, image: "images/bouche.jpg", mot: "bouche", consigne: ECRIS }
      ],
      [
        { type: 1, image: "images/nez.jpg",     mot: "nez",     consigne: CLIQUE },
        { type: 2, image: "images/oreille.jpg", mot: "oreille", consigne: COMPLETE },
        { type: 2, image: "images/bras.jpg",    mot: "bras",    consigne: COMPLETE },
        { type: 4, image: "images/cheveux.jpg", mot: "cheveux", indice: "Ils poussent sur la tête / 头发", consigne: DEVINE },
        { type: 3, image: "images/dents.jpg",   mot: "dents",   consigne: ECRIS }
      ]
    ]
  },
  {
    id: 8,
    nom: "Les vêtements / 衣服",
    etapes: [
      [
        { type: 1, image: "images/robe.jpg",      mot: "robe",      consigne: CLIQUE },
        { type: 2, image: "images/chapeau.jpg",   mot: "chapeau",   consigne: COMPLETE },
        { type: 2, image: "images/chaussure.jpg", mot: "chaussure", consigne: COMPLETE },
        { type: 2, image: "images/pantalon.jpg",  mot: "pantalon",  consigne: COMPLETE },
        { type: 3, image: "images/manteau.jpg",   mot: "manteau",   consigne: ECRIS }
      ],
      [
        { type: 1, image: "images/chemise.jpg",  mot: "chemise",  consigne: CLIQUE },
        { type: 2, image: "images/jupe.jpg",     mot: "jupe",     consigne: COMPLETE },
        { type: 2, image: "images/echarpe.jpg",  mot: "écharpe",  consigne: COMPLETE },
        { type: 4, image: "images/lunettes.jpg", mot: "lunettes", indice: "Pour mieux voir / 眼镜", consigne: DEVINE },
        { type: 3, image: "images/sac.jpg",      mot: "sac",      consigne: ECRIS }
      ]
    ]
  }
];
