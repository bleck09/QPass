// --- ASIGNACIÓN DE USUARIOS A EVENTOS (con rol específico para ese evento) ---
export const ROLES_ASIGNABLES = ['Cliente', 'Supervisor', 'UsuarioNegocio', 'Recargador', 'Devolucion'];

const CLAVE_ASIGNACIONES = 'qpass_asignaciones_eventos';

// Semilla: el usuario Cliente de prueba (ver data/usuarios.js, id 4) ya tiene acceso al
// primer evento, para que el Dashboard de Cliente no aparezca vacío en la demo.
const ASIGNACIONES_SEED = [
  { id: 'asig-seed-1', eventoId: 'ev1', usuarioId: 4, rol: 'Cliente' },
];

const guardarAsignaciones = (lista) => {
  localStorage.setItem(CLAVE_ASIGNACIONES, JSON.stringify(lista));
};

// Se asegura de que la semilla siga presente aunque el navegador ya tenga datos
// guardados de antes (ej. una lista vacía persistida antes de que existiera la semilla).
export const leerAsignaciones = () => {
  const guardado = localStorage.getItem(CLAVE_ASIGNACIONES);
  const lista = guardado ? JSON.parse(guardado) : [];
  const faltanSemillas = ASIGNACIONES_SEED.filter(
    semilla => !lista.some(a => a.eventoId === semilla.eventoId && a.usuarioId === semilla.usuarioId)
  );
  if (faltanSemillas.length === 0) return lista;

  const completa = [...lista, ...faltanSemillas];
  guardarAsignaciones(completa);
  return completa;
};

// Upsert: si el usuario ya estaba asignado a ese evento, actualiza el rol en vez de duplicar.
export const asignarUsuario = (eventoId, usuarioId, rol) => {
  const lista = leerAsignaciones();
  const idx = lista.findIndex(a => a.eventoId === eventoId && a.usuarioId === usuarioId);
  const actualizada = idx >= 0
    ? lista.map((a, i) => i === idx ? { ...a, rol } : a)
    : [...lista, { id: `asig-${Date.now()}`, eventoId, usuarioId, rol }];
  guardarAsignaciones(actualizada);
  return actualizada;
};

export const quitarAsignacion = (id) => {
  const actualizada = leerAsignaciones().filter(a => a.id !== id);
  guardarAsignaciones(actualizada);
  return actualizada;
};
