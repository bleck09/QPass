// --- CATÁLOGO GLOBAL DE USUARIOS (compartido entre Usuario de Negocio y Gestión de Eventos) ---
export const ROLES = ['Cliente', 'Recargador', 'Supervisor', 'Devolucion', 'UsuarioNormal', 'UsuarioNegocio'];

const CLAVE_USUARIOS = 'qpass_usuarios';

const USUARIOS_SEED = [
  {
    id: 1,
    nombre: 'María Fernández',
    email: 'maria@fiesta.com',
    rol: 'UsuarioNegocio',
    extraInfo: 'Pollos Doña María',
    foto: 'https://i.pravatar.cc/300?img=45',
    recaudado: 1250.50
  },
  {
    id: 2,
    nombre: 'Carlos Ruiz',
    email: 'carlos.r@evento.com',
    rol: 'Supervisor',
    extraInfo: 'Turno Mañana',
    foto: 'https://i.pravatar.cc/300?img=12',
    recaudado: 0
  },
  {
    id: 3,
    nombre: 'Ana López',
    email: 'ana.recarga@evento.com',
    rol: 'Recargador',
    extraInfo: 'Caja Principal 01',
    foto: 'https://i.pravatar.cc/300?img=5',
    recaudado: 0
  },
  {
    id: 4,
    nombre: 'Erick Cliente',
    email: 'cliente@QPass.com',
    rol: 'Cliente',
    extraInfo: '',
    foto: null,
    recaudado: 0
  }
];

export const leerUsuarios = () => {
  const guardado = localStorage.getItem(CLAVE_USUARIOS);
  return guardado ? JSON.parse(guardado) : USUARIOS_SEED;
};

export const guardarUsuarios = (lista) => {
  localStorage.setItem(CLAVE_USUARIOS, JSON.stringify(lista));
};
