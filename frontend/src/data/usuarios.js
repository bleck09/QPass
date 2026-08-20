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

export const guardarUsuarios = (lista) => {
  localStorage.setItem(CLAVE_USUARIOS, JSON.stringify(lista));
};

// Se asegura de que el usuario Cliente de prueba (id 4) siga teniendo el email correcto
// aunque el navegador ya tenga guardada una versión vieja de este catálogo.
export const leerUsuarios = () => {
  const guardado = localStorage.getItem(CLAVE_USUARIOS);
  if (!guardado) return USUARIOS_SEED;

  const lista = JSON.parse(guardado);
  const clienteDemo = USUARIOS_SEED.find(u => u.id === 4);
  const yaCorrecto = lista.some(u => u.id === clienteDemo.id && u.email === clienteDemo.email);
  if (yaCorrecto) return lista;

  const completa = [...lista.filter(u => u.id !== clienteDemo.id), clienteDemo];
  guardarUsuarios(completa);
  return completa;
};
