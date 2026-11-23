// Les boutons portent un attribut data-action. Chaque module déclare les actions
// qu'il gère avec surActions({ nom: (element, evenement) => ... }).
const gestionnaires = {};

export function surActions(table) {
  Object.entries(table).forEach(([nom, fn]) => {
    if (gestionnaires[nom]) console.warn(`Action déclarée deux fois : ${nom}`);
    gestionnaires[nom] = fn;
  });
}

export function installerActions() {
  document.addEventListener('click', (ev) => {
    const el = ev.target.closest('[data-action]');
    if (!el) return;
    const fn = gestionnaires[el.dataset.action];
    if (fn) fn(el, ev);
  });
}

// Lit un attribut data-* numérique (data-n, data-e...)
export const nombre = (el, nom) => parseInt(el.dataset[nom], 10);
