// --- CÓDIGOS QR GENERADOS POR EVENTO (simulado: cada uno es único, sin backend real) ---
const CLAVE_QR = 'qpass_codigos_qr';

// { [eventoId]: { siguienteNumero, codigos: [{ id, numero, codigo, generadoEn }] } }
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

// Genera `cantidad` códigos únicos nuevos para el evento (se suman a los ya generados).
export const generarQr = (eventoId, cantidad) => {
  const todo = leerTodo();
  const actual = todo[eventoId] || { siguienteNumero: 1, codigos: [] };

  const nuevos = [];
  for (let i = 0; i < cantidad; i++) {
    const numero = actual.siguienteNumero + i;
    nuevos.push({
      id: `qr-${eventoId}-${numero}`,
      numero,
      codigo: `QP-${eventoId}-${String(numero).padStart(6, '0')}`,
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
