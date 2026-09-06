/*
  Tema claro / oscuro — Manual 11.6, Anexo A A12.
  Dos estados nomás: 'light' | 'dark'. La primera vez arranca según el sistema
  operativo; a partir de ahí es una elección explícita guardada en localStorage.
  El flash inicial ya lo evita el <script> inline de index.html.
*/
const CLAVE = 'qpass-tema';

const temaDelSistema = () => {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
};

export const leerTema = () => {
  try {
    const v = localStorage.getItem(CLAVE);
    if (v === 'light' || v === 'dark') return v;
  } catch {
    /* modo privado */
  }
  return temaDelSistema();
};

export const aplicarTema = (tema) => {
  document.documentElement.setAttribute('data-theme', tema);
  try {
    localStorage.setItem(CLAVE, tema);
  } catch {
    /* modo privado: el tema se pierde al cerrar, sin romper nada */
  }
};
