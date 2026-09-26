import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTituloPagina } from '../../utils/tituloPagina.js';
import Modal from '../../components/Modal.jsx';
import Buscador from '../../components/Buscador.jsx';
import Tabla from '../../components/Tabla.jsx';
import Paginador from '../../components/Paginador.jsx';
import Boton from '../../components/Boton.jsx';
import Campo from '../../components/Campo.jsx';
import Insignia from '../../components/Insignia.jsx';
import EncabezadoPagina from '../../components/EncabezadoPagina.jsx';
import { AvisoFijo, useAvisos } from '../../components/Avisos.jsx';
import { useConfirmar } from '../../components/ConfirmarModal.jsx';
import { useApi } from '../../utils/useApi.js';
import { EstadoCarga, EstadoError } from '../../components/EstadosAsync.jsx';
import { errorObligatorio, errorCorreo, errorContrasenaNueva, limpiarErrores, enfocarPrimero } from '../../utils/validacion.js';
import {
  FaStore, FaUserTie, FaPlus, FaTrash, FaUsersCog, FaUser, FaEnvelope, FaKey,
} from 'react-icons/fa';
import { ROLE_LABELS } from '../../constants/roles.js';
import api from '../../api/index.js';
import './AdCreaUsuarioNegocio.css';

const ROLES = ['Cliente', 'Recargador', 'Supervisor', 'Devolucion', 'UsuarioNormal', 'UsuarioNegocio'];

// Tono de la Insignia global por rol (antes: badge-* propios, globales ocultos).
const TONO_ROL = {
  Supervisor: 'marca',
  Recargador: 'ok',
  UsuarioNegocio: 'info',
  Devolucion: 'warn',
};

const FORM_VACIO = { nombre: '', email: '', password: '', rol: 'UsuarioNegocio' };
const ORDEN_CAMPOS = ['adneg-nombre', 'adneg-email', 'adneg-password'];

const validarUsuario = (f) => limpiarErrores({
  'adneg-nombre': errorObligatorio(f.nombre, 'Escribí el nombre.'),
  'adneg-email': errorCorreo(f.email),
  'adneg-password': errorContrasenaNueva(f.password),
});

export default function AdCreaUsuarioNegocio() {
  useTituloPagina('Gestión de Usuarios');
  const avisos = useAvisos();

  const [showModal, setShowModal] = useState(false);
  const [confirmar, DialogoConfirmar] = useConfirmar();
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroRol, setFiltroRol] = useState('Todos');
  const [pagina, setPagina] = useState(0);

  // La búsqueda va al servidor: se espera a que el usuario deje de escribir
  // para no disparar una request por tecla.
  const [busqueda, setBusqueda] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setBusqueda(searchTerm.trim()), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Paginado del servidor: los compradores (UsuarioNormal) crecen sin techo,
  // así que ya no se descarga la lista entera para filtrarla en el navegador.
  const cargarUsuarios = useCallback(
    () => api.usuarios.listar({
      roles: filtroRol === 'Todos' ? undefined : filtroRol,
      buscar: busqueda || undefined,
      pagina,
    }),
    [filtroRol, busqueda, pagina],
  );
  const {
    data,
    cargando: cargandoUsuarios,
    error: errorUsuarios,
    recargar: recargarUsuarios,
  } = useApi(cargarUsuarios, { inicial: null });
  const usuarios = data?.usuarios ?? [];
  const totalPaginas = data ? Math.max(1, Math.ceil(data.total / data.porPagina)) : 1;

  // Cambiar el filtro o la búsqueda vuelve a la primera página.
  const cambiarFiltroRol = (rol) => { setFiltroRol(rol); setPagina(0); };
  const cambiarBusqueda = (texto) => { setSearchTerm(texto); setPagina(0); };

  const [formData, setFormData] = useState(FORM_VACIO);
  const [intento, setIntento] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorGuardar, setErrorGuardar] = useState('');
  const errores = intento ? validarUsuario(formData) : {};

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const abrirModal = () => {
    setFormData(FORM_VACIO);
    setIntento(false);
    setErrorGuardar('');
    setShowModal(true);
  };

  // Crear cuenta = alta normal: sin confirmación (PLAN §2.4); validación en
  // línea + cargando + aviso de éxito. Antes un error de la API se perdía.
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIntento(true);
    const errs = validarUsuario(formData);
    if (Object.keys(errs).length) return enfocarPrimero(errs, ORDEN_CAMPOS);
    setGuardando(true);
    setErrorGuardar('');
    try {
      await api.auth.registro({ ...formData, nombre: formData.nombre.trim(), email: formData.email.trim() });
      await recargarUsuarios();
      avisos.exito(`La cuenta de ${formData.nombre.trim()} quedó creada.`);
      setShowModal(false);
    } catch (err) {
      setErrorGuardar(err?.message || 'No se pudo crear la cuenta.');
    } finally {
      setGuardando(false);
    }
  };

  const eliminarUsuario = async (user) => {
    const ok = await confirmar({
      titulo: `¿Eliminar a ${user.nombre}?`,
      mensaje: `Se eliminará la cuenta ${user.email} del sistema. Esta acción no se puede deshacer.`,
      textoConfirmar: 'Eliminar usuario',
      peligroso: true,
    });
    if (!ok) return;
    try {
      await api.usuarios.eliminar(user.id);
      // Si era el único de la última página, se retrocede una.
      if (usuarios.length === 1 && pagina > 0) setPagina(p => p - 1);
      else await recargarUsuarios();
      avisos.exito(`La cuenta de ${user.nombre} se eliminó.`);
    } catch (err) {
      avisos.error(err?.message || 'No se pudo eliminar la cuenta.', { titulo: 'No se pudo eliminar' });
    }
  };

  // Opciones del filtro por rol, con su conteo (para las pastillas del <Buscador>).
  // El conteo viene del servidor (respeta la búsqueda, no el rol elegido).
  const conteoPorRol = data?.conteoPorRol;
  const filtrosRol = useMemo(() => {
    const m = conteoPorRol || {};
    const todos = Object.values(m).reduce((a, n) => a + n, 0);
    return [
      { valor: 'Todos', texto: 'Todos', conteo: todos },
      ...ROLES.map(rol => ({ valor: rol, texto: ROLE_LABELS[rol] || rol, conteo: m[rol] || 0 })),
    ];
  }, [conteoPorRol]);

  const hayFiltro = searchTerm.trim() !== '' || filtroRol !== 'Todos';

  return (
    <div className="pi-adnegocio-container">
      <EncabezadoPagina
        titulo="Gestión global de usuarios"
        subtitulo="Administra, crea y filtra todas las cuentas operativas y clientes del sistema."
        icono={FaUsersCog}
      />

      <Buscador
        valor={searchTerm}
        onCambio={cambiarBusqueda}
        placeholder="Buscar usuario por nombre o correo…"
        etiqueta="Buscar usuario por nombre o correo"
        filtros={filtrosRol}
        filtroActivo={filtroRol}
        onFiltro={cambiarFiltroRol}
        etiquetaFiltros="Filtrar por rol"
        acciones={<Boton icono={FaPlus} onClick={abrirModal}>Nuevo usuario</Boton>}
      />

      {hayFiltro && data && (
        <p className="texto-ayuda">
          {data.total} usuario{data.total === 1 ? '' : 's'} encontrado{data.total === 1 ? '' : 's'}
          {filtroRol !== 'Todos' && ` · rol: ${ROLE_LABELS[filtroRol] || filtroRol}`}
        </p>
      )}

      {errorUsuarios ? (
        <EstadoError onReintentar={recargarUsuarios} />
      ) : cargandoUsuarios || !data ? (
        <EstadoCarga filas={5} />
      ) : (
        <>
        <Tabla
          card
          porPagina={0}
          columnas={['Usuario', 'Contacto', 'Rol / Tipo', 'CI / Celular', { texto: 'Acción', srOnly: true }]}
          datos={usuarios}
          vacio="No se encontraron usuarios en esta categoría o búsqueda."
          renderFila={user => (
            <tr key={user.id}>
              <td>
                <div className="pi-adnegocio-item-info">
                  {user.foto ? (
                    <img width="40" height="40" src={user.foto} alt="" className="pi-adnegocio-img" />
                  ) : (
                    <div className="pi-adnegocio-no-img" aria-hidden="true">
                      {user.rol === 'UsuarioNegocio' ? <FaStore /> : <FaUserTie />}
                    </div>
                  )}
                  <span className="fila-nombre">{user.nombre}</span>
                </div>
              </td>
              <td><span className="celda-normal">{user.email}</span></td>
              <td><Insignia tono={TONO_ROL[user.rol] || 'neutro'}>{ROLE_LABELS[user.rol] || user.rol}</Insignia></td>
              <td><span className="celda-secundaria">{user.ci || user.celular || '—'}</span></td>
              <td className="td-derecha">
                <Boton
                  variante="peligro-suave"
                  tamano="sm"
                  icono={FaTrash}
                  onClick={() => eliminarUsuario(user)}
                  aria-label={`Eliminar la cuenta de ${user.nombre}`}
                >
                  Eliminar
                </Boton>
              </td>
            </tr>
          )}
        />
        {/* Paginado del servidor: mismo Paginador global que usa Tabla. */}
        <Paginador pagina={pagina} totalPaginas={totalPaginas} onCambio={setPagina} total={data.total} unidad="usuarios" />
        </>
      )}

      {showModal && (
        <Modal titulo="Registrar nuevo usuario" onCerrar={() => setShowModal(false)} tamano="md">
          <form onSubmit={handleSubmit} className="formulario" noValidate>
            <p className="texto-ayuda">Asigna el rol correcto. El sistema adapta los accesos y paneles automáticamente.</p>
            <Campo id="adneg-rol" etiqueta="Tipo de cuenta (rol)">
              <select id="adneg-rol" name="rol" value={formData.rol} onChange={handleChange}>
                {ROLES.map(rol => (
                  <option key={rol} value={rol}>{ROLE_LABELS[rol] || rol}</option>
                ))}
              </select>
            </Campo>
            <Campo id="adneg-nombre" etiqueta="Nombre completo / encargado" icono={FaUser} autoComplete="name"
              name="nombre" value={formData.nombre} onChange={handleChange} placeholder="Ej: Juan Pérez"
              error={errores['adneg-nombre']} />
            <Campo id="adneg-email" etiqueta="Correo electrónico" icono={FaEnvelope} type="email" autoComplete="email"
              name="email" value={formData.email} onChange={handleChange} placeholder="juan@correo.com"
              error={errores['adneg-email']} />
            <Campo id="adneg-password" etiqueta="Contraseña temporal" icono={FaKey} autoComplete="new-password"
              name="password" value={formData.password} onChange={handleChange}
              ayuda="Mínimo 6 caracteres. Pasásela a la persona por un medio seguro." error={errores['adneg-password']} />
            {errorGuardar && <AvisoFijo tono="error">{errorGuardar}</AvisoFijo>}
            <div className="modal-actions">
              <Boton variante="secundario" onClick={() => setShowModal(false)} disabled={guardando}>Cancelar</Boton>
              <Boton type="submit" cargando={guardando}>Crear cuenta</Boton>
            </div>
          </form>
        </Modal>
      )}

      {DialogoConfirmar}
    </div>
  );
}
