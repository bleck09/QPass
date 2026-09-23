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

/*
  El tema oscuro es SOLO para el panel (lo de adentro). La página pública, la
  del evento y las pantallas de cuenta (login, registro, recuperar, completar
  perfil) tienen su propio diseño y se ven SIEMPRE en claro, aunque la persona
  tenga el sistema en oscuro o haya elegido oscuro dentro de la app.
  Para eso se fuerza data-theme="light": el bloque @media del tema oscuro está
  escrito como :root:not([data-theme="light"]), así que queda desactivado.
*/
export const forzarTemaClaro = () => {
  document.documentElement.setAttribute('data-theme', 'light');
};

/** Vuelve al tema que la persona eligió (al entrar al panel). */
export const restaurarTema = () => {
  document.documentElement.setAttribute('data-theme', leerTema());
};
