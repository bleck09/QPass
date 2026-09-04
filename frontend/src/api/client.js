const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const CLAVE_SESION = 'usuarioProyectoIngresos';

export const leerSesion = () => {
  const guardado = localStorage.getItem(CLAVE_SESION);
  return guardado ? JSON.parse(guardado) : null;
};

export const guardarSesion = (sesion) => {
  localStorage.setItem(CLAVE_SESION, JSON.stringify(sesion));
};

export const cerrarSesion = () => {
  localStorage.removeItem(CLAVE_SESION);
};

const request = async (method, path, body) => {
  const sesion = leerSesion();
  const headers = { 'Content-Type': 'application/json' };
  if (sesion?.token) headers.Authorization = `Bearer ${sesion.token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    cerrarSesion();
    window.location.href = '/login';
    throw new Error('Sesión expirada');
  }

  if (res.status === 204) return null;

  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || `Error ${res.status}`);
  return data;
};

export const apiGet = (path) => request('GET', path);
export const apiPost = (path, body) => request('POST', path, body);
export const apiPatch = (path, body) => request('PATCH', path, body);
export const apiPut = (path, body) => request('PUT', path, body);
export const apiDelete = (path) => request('DELETE', path);

// Subida de archivos (multipart/form-data): a diferencia de "request", NO fija
// Content-Type — el navegador arma el boundary solo si se lo dejamos.
export const apiUpload = async (path, formData) => {
  const sesion = leerSesion();
  const headers = {};
  if (sesion?.token) headers.Authorization = `Bearer ${sesion.token}`;

  const res = await fetch(`${BASE_URL}${path}`, { method: 'POST', headers, body: formData });

  if (res.status === 401) {
    cerrarSesion();
    window.location.href = '/login';
    throw new Error('Sesión expirada');
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || `Error ${res.status}`);
  return data;
};

// Arma un query string desde un objeto, ignorando valores undefined/null/''.
export const qs = (params = {}) => {
  const entradas = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '');
  if (entradas.length === 0) return '';
  return `?${new URLSearchParams(entradas).toString()}`;
};
