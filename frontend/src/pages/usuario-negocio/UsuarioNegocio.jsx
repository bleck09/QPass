import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTituloPagina } from '../../utils/tituloPagina.js';
import Modal from '../../components/Modal.jsx';
import EventoCard from '../../components/EventoCard.jsx';
import GrillaEventos from '../../components/GrillaEventos.jsx';
import Buscador from '../../components/Buscador.jsx';
import Tabla from '../../components/Tabla.jsx';
import Migas from '../../components/Migas.jsx';
import BotonVolver from '../../components/BotonVolver.jsx';
import Paginador from '../../components/Paginador.jsx';
import AvisosStockPanel from '../../components/AvisosStockPanel.jsx';
import { useConfirmar } from '../../components/ConfirmarModal.jsx';
import { filtrarEventos, FILTROS_ESTADO_EVENTO } from '../../utils/eventos.js';
import { estadoStockProducto } from '../../utils/stock.js';
import { usePaginacion } from '../../utils/usePaginacion.js';
import { useApi } from '../../utils/useApi.js';
import { EstadoCarga, EstadoError } from '../../components/EstadosAsync.jsx';
import {
  FaStore, FaPlus, FaListUl, FaTrash, FaExternalLinkAlt, FaExclamationTriangle,
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

  // El evento abierto vive en la URL (?evento=<id>): así al volver del detalle
  // de un puesto (que es su propia página) se vuelve a ver la tabla de puestos.
  const [searchParams, setSearchParams] = useSearchParams();
  const eventoId = searchParams.get('evento') || '';
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

  const eventoSeleccionado = eventos.find(e => e.id === eventoId) || null;

  const [showActivar, setShowActivar] = useState(false);
  const [err, setErr] = useState('');
  // Logos que fallaron al cargar: caen al placeholder <FaStore/> en vez de mostrar la imagen rota.
  const [logosRotos, setLogosRotos] = useState(() => new Set());
  const marcarLogoRoto = (id) => setLogosRotos(prev => new Set(prev).add(id));

  // Puestos base que todavía NO están activados en este evento.
  const basesDisponibles = useMemo(() => {
    const activados = new Set(puestos.map(p => p.puestoBaseId));
    return puestosBase.filter(b => !activados.has(b.id));
  }, [puestosBase, puestos]);
  const basesPag = usePaginacion(basesDisponibles, 6);

  const abrirEvento = (ev) => setSearchParams({ evento: ev.id });
  const volverALista = () => setSearchParams({});
  const abrirDetallePuesto = (puesto) =>
    navigate(`/usuarionegocio/evento/${eventoId}/puesto/${puesto.id}`);

  // Productos sin stock / bajos por puesto (derivado, para el badge de la tabla).
  const alertaStockDe = (puesto) => {
    let sin = 0;
    let bajo = 0;
    for (const p of puesto.productos || []) {
      const e = estadoStockProducto(p);
      if (e === 'sin_stock' || e === 'inactivo') sin += 1;
      else if (e === 'bajo') bajo += 1;
    }
    return { sin, bajo };
  };

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

  if (!eventoSeleccionado) {
    return (
      <div className="pi-unegocio-container">
        <Migas items={[{ texto: 'Panel de negocio', actual: true }]} />
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
                  onClick={() => abrirEvento(ev)}
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

      <div className="qp-nav">
        <BotonVolver onClick={volverALista}>Cambiar de evento</BotonVolver>
        <Migas
          items={[
            { texto: 'Eventos', onClick: volverALista },
            { texto: eventoSeleccionado.nombre, actual: true },
          ]}
        />
      </div>

      <div className="pi-unegocio-header-wrapper">
        <div className="pi-unegocio-header">
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
        <div className="qp-btn-group">
          <button type="button" className="btn-secundario-sm" onClick={() => navigate('/usuarionegocio/catalogo')}>
            <FaExternalLinkAlt /> Mi Catálogo
          </button>
          <button type="button" className="btn-primario" onClick={() => { setErr(''); setShowActivar(true); }}>
            <FaPlus /> Activar puesto
          </button>
        </div>
      </div>

      <AvisosStockPanel />

      {err && !showActivar && <p className="pi-unegocio-nota pi-unegocio-nota--error">{err}</p>}

      {errorPuestos && <EstadoError onReintentar={recargarPuestos} />}
      {!errorPuestos && cargandoPuestos && <EstadoCarga filas={4} />}
      {!errorPuestos && !cargandoPuestos && (
      <div className="pi-unegocio-card">
        <Tabla
          columnas={['Puesto', 'Catálogo', 'Ayudantes', { texto: 'Acciones', align: 'center' }]}
          datos={puestos}
          vacio="Aún no activaste ningún puesto en este evento. Usá “Activar puesto”."
          renderFila={puesto => {
            const stk = alertaStockDe(puesto);
            return (
            <tr key={puesto.id}>
              <td>
                <div className="item-info">
                  {puesto.logo && !logosRotos.has(puesto.id) ? (
                    <img
                      width="48"
                      height="48"
                      src={puesto.logo}
                      alt=""
                      className="item-img"
                      onError={() => marcarLogoRoto(puesto.id)}
                    />
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
                <div className="pi-unegocio-catalogo-cel">
                  <span className="badge-info">
                    {puesto.productos.length} {puesto.productos.length === 1 ? 'producto' : 'productos'}
                  </span>
                  {stk.sin > 0 && (
                    <span className="pi-unegocio-badge-falta">
                      <FaExclamationTriangle aria-hidden="true" /> {stk.sin} sin stock
                    </span>
                  )}
                  {stk.bajo > 0 && (
                    <span className="badge-ayudantes">{stk.bajo} bajo</span>
                  )}
                </div>
              </td>
              <td>
                {puesto.ayudantes.length > 0 ? (
                  <span className="badge-ayudantes">
                    {puesto.ayudantes.length} {puesto.ayudantes.length === 1 ? 'asignado' : 'asignados'}
                  </span>
                ) : (
                  <span className="pi-unegocio-badge-falta">
                    <FaExclamationTriangle aria-hidden="true" /> Falta asignar
                  </span>
                )}
              </td>
              <td className="td-centro">
                <div className="btn-acciones">
                  <button type="button" className="btn-secundario-sm" onClick={() => abrirDetallePuesto(puesto)}>
                    <FaListUl aria-hidden="true" /> Detalles
                  </button>
                  <button type="button" className="btn-secundario-sm btn-secundario-sm--peligro" onClick={() => desactivarPuesto(puesto)} title="Quitar del evento">
                    <FaTrash aria-hidden="true" /> Quitar
                  </button>
                </div>
              </td>
            </tr>
            );
          }}
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
              <>
              <div className="pi-unegocio-base-lista">
                {basesPag.slice.map(base => (
                  <div key={base.id} className="pi-unegocio-base-item">
                    <div className="item-info">
                      {base.logo && !logosRotos.has(base.id) ? (
                        <img
                          width="44"
                          height="44"
                          src={base.logo}
                          alt=""
                          className="item-img"
                          onError={() => marcarLogoRoto(base.id)}
                        />
                      ) : (
                        <div className="item-no-img"><FaStore /></div>
                      )}
                      <div>
                        <div className="fila-nombre">{base.nombre}</div>
                        <div className="celda-secundaria">
                          {base.productos.length} {base.productos.length === 1 ? 'producto' : 'productos'} · {base.descripcion || 'sin descripción'}
                        </div>
                      </div>
                    </div>
                    <button type="button" className="btn-primario" onClick={() => activarPuesto(base)}>
                      <FaPlus /> Activar
                    </button>
                  </div>
                ))}
              </div>
              <Paginador
                pagina={basesPag.paginaActual}
                totalPaginas={basesPag.totalPaginas}
                onCambio={basesPag.setPagina}
                total={basesPag.total}
                unidad="puestos"
              />
              </>
            )}
            {err && <p className="pi-unegocio-nota pi-unegocio-nota--error">{err}</p>}
            <div className="modal-actions">
              <button type="button" className="btn-cancelar" onClick={() => setShowActivar(false)}>Cerrar</button>
            </div>
          </div>
        </Modal>
      )}

      {DialogoConfirmar}
    </div>
  );
}
