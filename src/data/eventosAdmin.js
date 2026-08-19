// --- CATÁLOGO DE EVENTOS DEL PANEL ADMIN (compartido entre Dashboard, Gestión de Eventos, Tickets, Mapa y Configurar Página) ---
// Nota: este catálogo es independiente del de src/data/eventos.js (home pública / Usuario Normal).
const CLAVE_EVENTOS = 'qpass_eventos_admin';

// Usada cuando se crea un evento sin imagen propia.
export const IMAGEN_EVENTO_PLACEHOLDER = 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';

const EVENTOS_SEED = [
  { id: 'ev1', nombre: 'Festival QPass 2026', lugar: 'Campo Ferial, Cbba', fecha: '15 Oct, 2026', imagen: 'https://images.unsplash.com/photo-1540317580384-e5d43616b9aa?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80' },
  { id: 'ev2', nombre: 'Feria Gastronómica La Paz', lugar: 'Parque de la Familia', fecha: '02 Nov, 2026', imagen: 'https://images.unsplash.com/photo-1555244162-803834f70033?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80' },
];

export const leerEventos = () => {
  const guardado = localStorage.getItem(CLAVE_EVENTOS);
  return guardado ? JSON.parse(guardado) : EVENTOS_SEED;
};

export const guardarEventos = (lista) => {
  localStorage.setItem(CLAVE_EVENTOS, JSON.stringify(lista));
};

export const crearEvento = ({ nombre, lugar, fecha, imagen }) => {
  const nuevo = { id: `ev-${Date.now()}`, nombre, lugar, fecha, imagen: imagen || IMAGEN_EVENTO_PLACEHOLDER };
  const lista = [...leerEventos(), nuevo];
  guardarEventos(lista);
  return { lista, nuevo };
};
