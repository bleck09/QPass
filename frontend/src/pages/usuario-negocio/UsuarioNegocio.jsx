import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTituloPagina } from '../../utils/tituloPagina.js';
import Modal from '../../components/Modal.jsx';
import EventoCard from '../../components/EventoCard.jsx';
import GrillaEventos from '../../components/GrillaEventos.jsx';
import Buscador from '../../components/Buscador.jsx';
import Tabla from '../../components/Tabla.jsx';
import { useConfirmar } from '../../components/ConfirmarModal.jsx';
import { filtrarEventos, FILTROS_ESTADO_EVENTO } from '../../utils/eventos.js';
import { useApi } from '../../utils/useApi.js';
import { EstadoCarga, EstadoError } from '../../components/EstadosAsync.jsx';
import {
  FaStore, FaPlus, FaDollarSign,
  FaListUl, FaUsers, FaBoxOpen, FaUserTie, FaHamburger,
  FaArrowLeft, FaCheckCircle, FaBan, FaTrash, FaExternalLinkAlt,
} from 'react-icons/fa';
import './UsuarioNegocio.css';
import '../supervisor/GestionEntrega.css';
import api from '../../api/index.js';
import { leerSesion } from '../../api/client.js';

export default function UsuarioNegocio() {
  useTituloPagina('Mi negocio');
  const sesion = leerSesion();
  const navigate = useNavigate();
  const [confirmar, DialogoConfirmar] = useConfirmar();

  const [eventoSeleccionado, setEventoSeleccionado] = useState(null);
  const eventoId = eventoSeleccionado?.id || '';
  const [busquedaEvento, setBusquedaEvento] = useState('');
  const [filtroEvento, setFiltroEvento] = useState('todos');

  const cargarEventos = useCallback(
    () => api.eventos.misAsignados(sesion.id, sesion.rol),
    [sesion.id, sesion.rol],
  );
  const {
    data: eventos,
    cargando: cargandoEventos,
    error: errorEventos,
    recargar: recargarEventos,
  } = useApi(cargarEventos, { inicial: [] });

  const cargarPuestos = useCallback(
    () => api.puestos.listar({ eventoId, negocioId: sesion.id }),
    [eventoId, sesion.id],
  );
  const {
    data: puestos,
    setData: setPuestos,
    cargando: cargandoPuestos,
    error: errorPuestos,
    recargar: recargarPuestos,
  } = useApi(cargarPuestos, { inicial: [], activo: !!eventoId });

  // Catálogo del negocio: lo que se puede activar en este evento.
  const cargarBase = useCallback(() => api.puestosBase.listar(), []);
  const { data: puestosBase } = useApi(cargarBase, { inicial: [] });

  const eventosFiltrados = useMemo(
    () => filtrarEventos(eventos, busquedaEvento, filtroEvento),
    [eventos, busquedaEvento, filtroEvento],
  );

  const [showActivar, setShowActivar] = useState(false);
  const [showModalCatalogo, setShowModalCatalogo] = useState(false);
  const [showModalAyudantesPuesto, setShowModalAyudantesPuesto] = useState(false);
  const [puestoSeleccionadoId, setPuestoSeleccionadoId] = useState(null);
  const [err, setErr] = useState('');

  const puestoSeleccionado = puestos.find(p => p.id === puestoSeleccionadoId) || null;

  // Puestos base que todavía NO están activados en este evento.
  const basesDisponibles = useMemo(() => {
    const activados = new Set(puestos.map(p => p.puestoBaseId));
    return puestosBase.filter(b => !activados.has(b.id));
  }, [puestosBase, puestos]);

  const volverALista = () => setEventoSeleccionado(null);

  // --- ACTIVAR UN PUESTO BASE EN EL EVENTO ---
  const activarPuesto = async (base) => {
    setErr('');
    try {
      await api.puestos.crear({ eventoId, puestoBaseId: base.id });
      await recargarPuestos();
      setShowActivar(false);
    } catch (e2) { setErr(e2.message); }
  };

  const desactivarPuesto = async (puesto) => {
    const ok = await confirmar({
      titulo: `¿Quitar "${puesto.nombre}" de este evento?`,
      mensaje: 'Dejará de aparecer en el mapa del evento. Si ya registró ventas, no se borra: solo queda inactivo. El catálogo base no se toca.',
      textoConfirmar: 'Quitar del evento',
      peligroso: true,
    });
    if (!ok) return;
    try {
      await api.puestos.desactivar(puesto.id);
      await recargarPuestos();
    } catch (e2) { setErr(e2.message); }
  };

  // --- CATÁLOGO POR EVENTO (activo / stock / precio) ---
  const abrirCatalogo = (puesto) => { setPuestoSeleccionadoId(puesto.id); setShowModalCatalogo(true); };
  const abrirModalAyudantesPuesto = (puesto) => { setPuestoSeleccionadoId(puesto.id); setShowModalAyudantesPuesto(true); };

  // `cambios` solo lleva campos del DTO: activo? / stock? / precio? (null = sin override).
  const cambiarEstadoProducto = async (producto, cambios) => {
    setErr('');
    try {
      await api.productos.actualizarEstado({
        puestoId: puestoSeleccionado.id,
        productoBaseId: producto.id,
        ...cambios,
      });
      const local = { ...cambios };
      if ('precio' in cambios) {
        local.precioSobrescrito = cambios.precio != null;
        if (cambios.precio == null) local.precio = producto.precioBase;
      }
      const productos = puestoSeleccionado.productos.map(pr =>
        pr.id === producto.id ? { ...pr, ...local } : pr,
      );
      setPuestos(prev => prev.map(p => p.id === puestoSeleccionado.id ? { ...p, productos } : p));
    } catch (e2) { setErr(e2.message); }
  };

  if (!eventoSeleccionado) {
    return (
      <div className="pi-unegocio-container">
        <div className="pi-unegocio-header-wrapper">
          <div className="pi-unegocio-header">
            <h1>Panel de negocio</h1>
            <p>Elige el evento en el que quieres administrar tus puestos.</p>
          </div>
        </div>
        {errorEventos ? (
          <EstadoError onReintentar={recargarEventos} />
        ) : cargandoEventos ? (
          <EstadoCarga filas={3} />
        ) : eventos.length === 0 ? (
          <p className="pi-entrega-sin-eventos">Todavía no tienes ningún evento asignado. Pídele a Admin que te asigne uno.</p>
        ) : (
          <>
            <Buscador
              valor={busquedaEvento}
              onCambio={setBusquedaEvento}
              placeholder="Buscar evento por nombre o lugar…"
              etiqueta="Buscar evento"
              filtros={FILTROS_ESTADO_EVENTO}
              filtroActivo={filtroEvento}
              onFiltro={setFiltroEvento}
              etiquetaFiltros="Filtrar eventos por estado"
            />
            <GrillaEventos eventos={eventosFiltrados} gridClassName="pi-entrega-eventos-grid">
              {ev => (
                <EventoCard
                  key={ev.id}
                  evento={ev}
                  onClick={() => setEventoSeleccionado(ev)}
                  cta="Abrir negocio"
                />
              )}
            </GrillaEventos>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="pi-unegocio-container">

      <div className="pi-unegocio-header-wrapper">
        <div className="pi-unegocio-header">
          <button type="button" className="pi-entrega-btn-volver" style={{ marginBottom: '8px' }} onClick={volverALista}>
            <FaArrowLeft /> Cambiar de evento
          </button>
          <h1>{eventoSeleccionado.nombre}</h1>
          <p>Activá los puestos de tu catálogo en este evento y ajustá su menú (precios, stock y disponibilidad) solo para acá.</p>
        </div>

        <div className="pi-unegocio-kpi">
          <span className="micro-etiqueta">Puestos en este evento</span>
          <div className="kpi-valor">
            <FaStore className="kpi-icon" />
            <span className="numero-grande">{puestos.length}</span>
          </div>
        </div>
      </div>

      <div className="pi-unegocio-action-bar">
        <h2 className="pi-unegocio-subtitulo"><FaStore aria-hidden="true" /> Mis Puestos</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn-secundario-sm" onClick={() => navigate('/usuarionegocio/catalogo')}>
            <FaExternalLinkAlt /> Mi Catálogo
          </button>
          <button type="button" className="btn-primario" onClick={() => { setErr(''); setShowActivar(true); }}>
            <FaPlus /> Activar puesto
          </button>
        </div>
      </div>

      {err && !showModalCatalogo && <p className="pi-unegocio-nota" style={{ color: 'var(--rojo-error-texto)' }}>{err}</p>}

      {errorPuestos && <EstadoError onReintentar={recargarPuestos} />}
      {!errorPuestos && cargandoPuestos && <EstadoCarga filas={4} />}
      {!errorPuestos && !cargandoPuestos && (
      <div className="pi-unegocio-card">
        <Tabla
          columnas={['Detalles del Puesto', 'Catálogo', { texto: 'Ayudantes', align: 'center' }, { texto: 'Acciones', align: 'center' }]}
          datos={puestos}
          vacio="Aún no activaste ningún puesto en este evento. Usá “Activar puesto”."
          renderFila={puesto => (
            <tr key={puesto.id}>
              <td>
                <div className="item-info">
                  {puesto.logo ? (
                    <img width="48" height="48" src={puesto.logo} alt="Logo" className="item-img" />
                  ) : (
                    <div className="item-no-img"><FaStore /></div>
                  )}
                  <div>
                    <div className="fila-nombre">{puesto.nombre}</div>
                    <div className="celda-secundaria">{puesto.descripcion}</div>
                  </div>
                </div>
              </td>
              <td>
                <div className="info-catalogo">
                  <span className="badge-info">{puesto.productos.length} Productos</span>
                  <button type="button" className="btn-secundario-sm" onClick={() => abrirCatalogo(puesto)}>
                    <FaListUl /> Ver Catálogo
                  </button>
                </div>
              </td>
              <td style={{ textAlign: 'center' }}>
                <div className="info-catalogo" style={{ alignItems: 'center' }}>
                  <span className="badge-ayudantes">{puesto.ayudantes.length} Asignados</span>
                  <button type="button" className="btn-secundario-sm" onClick={() => abrirModalAyudantesPuesto(puesto)}>
                    <FaUsers /> Ver Equipo
                  </button>
                </div>
              </td>
              <td style={{ textAlign: 'center' }}>
                <button type="button" className="btn-eliminar" onClick={() => desactivarPuesto(puesto)} title="Quitar del evento">
                  <FaTrash />
                </button>
              </td>
            </tr>
          )}
        />
      </div>
      )}

      {/* =========================================
          MODAL 1: ACTIVAR UN PUESTO BASE EN EL EVENTO
      ========================================= */}
      {showActivar && (
        <Modal
          titulo={<><FaStore color="var(--indigo-profundo)" aria-hidden="true" /> Activar un puesto en {eventoSeleccionado.nombre}</>}
          onCerrar={() => setShowActivar(false)}
        >
          <div className="modal-body">
            {puestosBase.length === 0 ? (
              <div className="pi-unegocio-vacio-modal">
                <p>Todavía no tenés puestos en tu catálogo.</p>
                <button type="button" className="btn-primario" onClick={() => navigate('/usuarionegocio/catalogo')}>
                  <FaExternalLinkAlt /> Ir a Mi Catálogo
                </button>
              </div>
            ) : basesDisponibles.length === 0 ? (
              <p className="tabla-vacia">Ya activaste todos tus puestos del catálogo en este evento.</p>
            ) : (
              <div className="pi-unegocio-base-lista">
                {basesDisponibles.map(base => (
                  <div key={base.id} className="pi-unegocio-base-item">
                    <div className="item-info">
                      {base.logo ? (
                        <img width="44" height="44" src={base.logo} alt="Logo" className="item-img" />
                      ) : (
                        <div className="item-no-img"><FaStore /></div>
                      )}
                      <div>
                        <div className="fila-nombre">{base.nombre}</div>
                        <div className="celda-secundaria">{base.productos.length} productos · {base.descripcion || 'sin descripción'}</div>
                      </div>
                    </div>
                    <button type="button" className="btn-primario" onClick={() => activarPuesto(base)}>
                      <FaPlus /> Activar
                    </button>
                  </div>
                ))}
              </div>
            )}
            {err && <p className="pi-unegocio-nota" style={{ color: 'var(--rojo-error-texto)' }}>{err}</p>}
            <div className="modal-actions">
              <button type="button" className="btn-cancelar" onClick={() => setShowActivar(false)}>Cerrar</button>
            </div>
          </div>
        </Modal>
      )}

      {/* =========================================
          MODAL 2: CATÁLOGO POR EVENTO (activo / stock / precio)
      ========================================= */}
      {showModalCatalogo && puestoSeleccionado && (
        <Modal
          titulo={<><FaBoxOpen color="var(--indigo-profundo)" aria-hidden="true" /> Menú de {puestoSeleccionado.nombre} · {eventoSeleccionado.nombre}</>}
          onCerrar={() => setShowModalCatalogo(false)}
          tamano="lg"
          className="modal-grande"
        >
          <div className="modal-body bg-gris">
            <p className="pi-unegocio-nota">
              El catálogo sale de <strong>Mi Catálogo</strong>. Acá solo ajustás precio, stock y disponibilidad
              para este evento. Precio vacío = usa el precio base.
            </p>
            {err && <p className="pi-unegocio-nota" style={{ color: 'var(--rojo-error-texto)' }}>{err}</p>}
            <div className="pi-unegocio-card no-margin">
              <Tabla
                columnas={['Producto', 'Categoría', 'Precio (este evento)', { texto: 'Stock', align: 'center' }, { texto: 'Estado', align: 'center' }]}
                datos={puestoSeleccionado.productos}
                porPagina={8}
                vacio="Este puesto base no tiene productos. Agregalos en Mi Catálogo."
                renderFila={producto => (
                  <tr key={producto.id} className={producto.activo === false ? 'pi-unegocio-prod-inactivo' : ''}>
                    <td>
                      <div className="item-info">
                        {producto.imagen ? (
                          <img width="48" height="48" src={producto.imagen} alt="Prod" className="item-img img-cuadrada" />
                        ) : (
                          <div className="item-no-img img-cuadrada"><FaHamburger /></div>
                        )}
                        <span className="fila-nombre">{producto.nombre}</span>
                      </div>
                    </td>
                    <td>{producto.categoria || '—'}</td>
                    <td>
                      <div className="input-monto-wrapper" style={{ maxWidth: 150 }}>
                        <FaDollarSign className="icon-monto" />
                        <input
                          type="number" min="0" step="0.50"
                          className="input-monto"
                          placeholder={`base: ${Number(producto.precioBase).toFixed(2)}`}
                          defaultValue={producto.precioSobrescrito ? Number(producto.precio) : ''}
                          onBlur={(e) => {
                            const raw = e.target.value.trim();
                            const nuevo = raw === '' ? null : Number(raw);
                            if (raw !== '' && Number.isNaN(nuevo)) return;
                            const actual = producto.precioSobrescrito ? Number(producto.precio) : null;
                            if (nuevo !== actual) cambiarEstadoProducto(producto, { precio: nuevo });
                          }}
                        />
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <input
                        type="number" min="0" step="1"
                        className="pi-unegocio-stock-input"
                        placeholder="sin control"
                        defaultValue={producto.stock ?? ''}
                        onBlur={(e) => {
                          const raw = e.target.value.trim();
                          const n = raw === '' ? null : Number(raw);
                          if (raw !== '' && Number.isNaN(n)) return;
                          if (n !== (producto.stock ?? null)) cambiarEstadoProducto(producto, { stock: n });
                        }}
                      />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        className={producto.activo === false ? 'pi-unegocio-toggle inactivo' : 'pi-unegocio-toggle activo'}
                        onClick={() => cambiarEstadoProducto(producto, { activo: producto.activo === false })}
                        title={producto.activo === false ? 'Marcar como disponible' : 'Marcar como agotado'}
                      >
                        {producto.activo === false ? <><FaBan /> Agotado</> : <><FaCheckCircle /> Activo</>}
                      </button>
                    </td>
                  </tr>
                )}
              />
            </div>
          </div>
        </Modal>
      )}

      {/* =========================================
          MODAL 3: VER EQUIPO (AYUDANTES ASIGNADOS)
      ========================================= */}
      {showModalAyudantesPuesto && puestoSeleccionado && (
        <Modal
          titulo={<><FaUsers color="var(--indigo-profundo)" aria-hidden="true" /> Equipo: {puestoSeleccionado.nombre}</>}
          onCerrar={() => setShowModalAyudantesPuesto(false)}
        >
          <div className="modal-body bg-gris">
            <div className="pi-unegocio-card no-margin">
              <Tabla
                columnas={['Nombre del Ayudante', 'Correo']}
                datos={puestoSeleccionado.ayudantes}
                porPagina={8}
                vacio="Aún no hay ayudantes asignados a este puesto."
                renderFila={asignacion => (
                  <tr key={asignacion.id}>
                    <td>
                      <div className="item-info">
                        {asignacion.ayudante.foto ? (
                          <img width="48" height="48" src={asignacion.ayudante.foto} alt="Ayudante" className="item-img" style={{ borderRadius: '50%', width: '40px', height: '40px' }} />
                        ) : (
                          <div className="item-no-img" style={{ borderRadius: '50%', width: '40px', height: '40px' }}><FaUserTie /></div>
                        )}
                        <div>
                          <div className="fila-nombre">{asignacion.ayudante.nombre}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className="celda-secundaria">{asignacion.ayudante.email}</span></td>
                  </tr>
                )}
              />
            </div>
            <div className="modal-actions" style={{ marginTop: '1rem' }}>
              <button type="button" className="btn-primario" onClick={() => navigate('/usuarionegocio/ayudantes')}>
                Ir a Mis Ayudantes
              </button>
            </div>
          </div>
        </Modal>
      )}

      {DialogoConfirmar}
    </div>
  );
}
