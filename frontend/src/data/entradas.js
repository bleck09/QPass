// --- LISTA DE PARTICIPANTES (ENTRADAS) POR EVENTO ---
// Fuente compartida entre el Dashboard General (Admin) y Gestión de Entrega (Supervisor).
const CLAVE_ENTRADAS = 'qpass_entradas';

const ENTRADAS_SEED = {
  ev1: [
    { id: 1, nombre: 'María Fernanda Rojas', documento: '7451236 LP', correo: 'maria.rojas@correo.com', tipoEntrada: 'VIP', foto: 'https://i.pravatar.cc/300?img=47', estado: 'ingresado', horaIngreso: '08:12', horaSalida: null, codigoQrVinculado: null, vinculadoEn: null },
    { id: 2, nombre: 'Jorge Luis Quispe', documento: '6621345 SC', correo: 'jorge.quispe@correo.com', tipoEntrada: 'General', foto: 'https://i.pravatar.cc/300?img=12', estado: 'ingresado', horaIngreso: '08:20', horaSalida: null, codigoQrVinculado: null, vinculadoEn: null },
    { id: 3, nombre: 'Ana Belén Castro', documento: '5589214 CB', correo: 'ana.castro@correo.com', tipoEntrada: 'General', foto: 'https://i.pravatar.cc/300?img=32', estado: 'salio', horaIngreso: '08:35', horaSalida: '13:20', codigoQrVinculado: null, vinculadoEn: null },
    { id: 4, nombre: 'Ricardo Alanoca Mamani', documento: '4471258 LP', correo: 'ricardo.alanoca@correo.com', tipoEntrada: 'Staff', foto: 'https://i.pravatar.cc/300?img=51', estado: 'salio', horaIngreso: '08:41', horaSalida: '14:05', codigoQrVinculado: null, vinculadoEn: null },
    { id: 5, nombre: 'Daniela Vargas Soto', documento: '7789456 SC', correo: 'daniela.vargas@correo.com', tipoEntrada: 'VIP', foto: 'https://i.pravatar.cc/300?img=25', estado: 'ingresado', horaIngreso: '09:02', horaSalida: null, codigoQrVinculado: null, vinculadoEn: null },
    { id: 6, nombre: 'Sergio Fabián Choque', documento: '3312589 OR', correo: 'sergio.choque@correo.com', tipoEntrada: 'General', foto: 'https://i.pravatar.cc/300?img=15', estado: 'pendiente', horaIngreso: null, horaSalida: null, codigoQrVinculado: null, vinculadoEn: null },
    { id: 7, nombre: 'Paola Andrea Terrazas', documento: '6654123 CB', correo: 'paola.terrazas@correo.com', tipoEntrada: 'General', foto: 'https://i.pravatar.cc/300?img=45', estado: 'pendiente', horaIngreso: null, horaSalida: null, codigoQrVinculado: null, vinculadoEn: null },
    { id: 8, nombre: 'Luis Fernando Mamani', documento: '5521478 LP', correo: 'luis.mamani@correo.com', tipoEntrada: 'General', foto: 'https://i.pravatar.cc/300?img=13', estado: 'pendiente', horaIngreso: null, horaSalida: null, codigoQrVinculado: null, vinculadoEn: null },
    { id: 9, nombre: 'Carla Ximena Flores', documento: '4498712 SC', correo: 'carla.flores@correo.com', tipoEntrada: 'Staff', foto: 'https://i.pravatar.cc/300?img=44', estado: 'pendiente', horaIngreso: null, horaSalida: null, codigoQrVinculado: null, vinculadoEn: null },
    { id: 10, nombre: 'Diego Armando Peñaranda', documento: '7712365 TJ', correo: 'diego.penaranda@correo.com', tipoEntrada: 'General', foto: 'https://i.pravatar.cc/300?img=59', estado: 'pendiente', horaIngreso: null, horaSalida: null, codigoQrVinculado: null, vinculadoEn: null },
    { id: 11, nombre: 'Valeria Nicole Guzmán', documento: '3387654 LP', correo: 'valeria.guzman@correo.com', tipoEntrada: 'VIP', foto: 'https://i.pravatar.cc/300?img=48', estado: 'pendiente', horaIngreso: null, horaSalida: null, codigoQrVinculado: null, vinculadoEn: null },
    { id: 12, nombre: 'Marco Antonio Villca', documento: '6698741 CB', correo: 'marco.villca@correo.com', tipoEntrada: 'General', foto: 'https://i.pravatar.cc/300?img=14', estado: 'pendiente', horaIngreso: null, horaSalida: null, codigoQrVinculado: null, vinculadoEn: null },
  ],
  ev2: [
    { id: 1, nombre: 'Pedro Callisaya', documento: '2214563 LP', correo: 'pedro.callisaya@correo.com', tipoEntrada: 'General', foto: 'https://i.pravatar.cc/300?img=33', estado: 'ingresado', horaIngreso: '10:05', horaSalida: null, codigoQrVinculado: null, vinculadoEn: null },
    { id: 2, nombre: 'Rosa Elena Mamani', documento: '3321654 LP', correo: 'rosa.mamani@correo.com', tipoEntrada: 'General', foto: 'https://i.pravatar.cc/300?img=29', estado: 'salio', horaIngreso: '10:22', horaSalida: '12:40', codigoQrVinculado: null, vinculadoEn: null },
    { id: 3, nombre: 'Freddy Choque Apaza', documento: '4478912 LP', correo: 'freddy.choque@correo.com', tipoEntrada: 'VIP', foto: 'https://i.pravatar.cc/300?img=17', estado: 'pendiente', horaIngreso: null, horaSalida: null, codigoQrVinculado: null, vinculadoEn: null },
    { id: 4, nombre: 'Ximena Torrez', documento: '5589431 LP', correo: 'ximena.torrez@correo.com', tipoEntrada: 'General', foto: 'https://i.pravatar.cc/300?img=38', estado: 'pendiente', horaIngreso: null, horaSalida: null, codigoQrVinculado: null, vinculadoEn: null },
  ],
};

const leerTodo = () => {
  const guardado = localStorage.getItem(CLAVE_ENTRADAS);
  return guardado ? JSON.parse(guardado) : ENTRADAS_SEED;
};

const guardarTodo = (obj) => {
  localStorage.setItem(CLAVE_ENTRADAS, JSON.stringify(obj));
};

export const leerEntradas = (eventoId) => leerTodo()[eventoId] || [];

export const vincularCodigoQr = (eventoId, participanteId, codigo) => {
  const todo = leerTodo();
  const lista = todo[eventoId] || [];
  const actualizada = lista.map(p => p.id === participanteId
    ? { ...p, codigoQrVinculado: codigo, vinculadoEn: new Date().toISOString() }
    : p);
  guardarTodo({ ...todo, [eventoId]: actualizada });
  return actualizada;
};

export const desvincularCodigoQr = (eventoId, participanteId) => {
  const todo = leerTodo();
  const lista = todo[eventoId] || [];
  const actualizada = lista.map(p => p.id === participanteId
    ? { ...p, codigoQrVinculado: null, vinculadoEn: null }
    : p);
  guardarTodo({ ...todo, [eventoId]: actualizada });
  return actualizada;
};
