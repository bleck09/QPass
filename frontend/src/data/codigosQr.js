// --- CÓDIGOS QR GENERADOS POR EVENTO (simulado: cada uno es único, sin backend real) ---
const CLAVE_QR = 'qpass_codigos_qr';

// Sin 0/O/1/I para no confundir al leer un código a mano.
const CARACTERES_ALEATORIOS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const LARGO_ALEATORIO = 12;

// { [eventoId]: { siguienteNumero, codigos: [{ id, numero, codigo, ancho, alto, generadoEn }] } }
const leerTodo = () => {
  const guardado = localStorage.getItem(CLAVE_QR);
  return guardado ? JSON.parse(guardado) : {};
};

const guardarTodo = (obj) => {
  localStorage.setItem(CLAVE_QR, JSON.stringify(obj));
};

export const leerQrDelEvento = (eventoId) => {
  const todo = leerTodo();
  return todo[eventoId] || { siguienteNumero: 1, codigos: [] };
};

const generarParteAleatoria = () => {
  let parte = '';
  for (let i = 0; i < LARGO_ALEATORIO; i++) {
    parte += CARACTERES_ALEATORIOS[Math.floor(Math.random() * CARACTERES_ALEATORIOS.length)];
  }
  return parte;
};

// Junta los códigos ya generados de TODOS los eventos, para que ninguno se repita globalmente.
const obtenerCodigosExistentes = (todo) => {
  const existentes = new Set();
  Object.values(todo).forEach(({ codigos }) => codigos.forEach(qr => existentes.add(qr.codigo)));
  return existentes;
};

const generarCodigoUnico = (prefijo, existentes) => {
  let codigo;
  do {
    codigo = `${prefijo}-${generarParteAleatoria()}`;
  } while (existentes.has(codigo));
  existentes.add(codigo);
  return codigo;
};

// Genera `cantidad` códigos únicos nuevos para el evento (se suman a los ya generados).
// opciones: { prefijo: 1 a 3 letras, ancho, alto: tamaño en px del QR }
export const generarQr = (eventoId, cantidad, opciones = {}) => {
  const { prefijo = 'QP', ancho = 180, alto = 180 } = opciones;
  const prefijoNormalizado = prefijo.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3) || 'QP';

  const todo = leerTodo();
  const actual = todo[eventoId] || { siguienteNumero: 1, codigos: [] };
  const existentes = obtenerCodigosExistentes(todo);

  const nuevos = [];
  for (let i = 0; i < cantidad; i++) {
    const numero = actual.siguienteNumero + i;
    nuevos.push({
      id: `qr-${eventoId}-${numero}`,
      numero,
      codigo: generarCodigoUnico(prefijoNormalizado, existentes),
      ancho,
      alto,
      generadoEn: new Date().toISOString(),
    });
  }

  const actualizado = {
    siguienteNumero: actual.siguienteNumero + cantidad,
    codigos: [...actual.codigos, ...nuevos],
  };

  const todoActualizado = { ...todo, [eventoId]: actualizado };
  guardarTodo(todoActualizado);
  return actualizado;
};

// Borra todos los códigos generados de un evento (no reinicia la numeración, para que
// los códigos generados antes de vaciar sigan siendo únicos si se vuelve a generar).
export const vaciarQrDelEvento = (eventoId) => {
  const todo = leerTodo();
  const actual = todo[eventoId] || { siguienteNumero: 1, codigos: [] };
  const actualizado = { ...actual, codigos: [] };
  const todoActualizado = { ...todo, [eventoId]: actualizado };
  guardarTodo(todoActualizado);
  return actualizado;
};
