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
import EncabezadoPagina from '../../components/EncabezadoPagina.jsx';
import StatCard from '../../components/StatCard.jsx';
import Insignia from '../../components/Insignia.jsx';
import Boton from '../../components/Boton.jsx';
import { AvisoFijo, useAvisos } from '../../components/Avisos.jsx';
import { useConfirmar } from '../../components/ConfirmarModal.jsx';
import { filtrarEventos, FILTROS_ESTADO_EVENTO } from '../../utils/eventos.js';
import { estadoStockProducto } from '../../utils/stock.js';
import { usePaginacion } from '../../utils/usePaginacion.js';
import { useApi } from '../../utils/useApi.js';
import { EstadoCarga, EstadoError, EstadoVacio } from '../../components/EstadosAsync.jsx';
import {
  FaStore, FaPlus, FaListUl, FaTrash, FaExternalLinkAlt, FaExclamationTriangle, FaCalendarTimes, FaCheckCircle,
} from 'react-icons/fa';
import './UsuarioNegocio.css';
import api from '../../api/index.js';
import { leerSesion } from '../../api/client.js';

export default function UsuarioNegocio() {
  useTituloPagina('Mi negocio');
  const sesion = leerSesion();
  const navigate = useNavigate();
  const avisos = useAvisos();
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
  // Error del servidor dentro del modal de activar (fuera del modal va como aviso).
  const [err, setErr] = useState('');
  // Id del puesto base que se está activando: su botón muestra el spinner.
  const [activando, setActivando] = useState(null);
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

  // Productos sin stock / bajos por puesto (derivado, para las insignias de la tabla).
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
    setActivando(base.id);
    try {
      await api.puestos.crear({ eventoId, puestoBaseId: base.id });
      await recargarPuestos();
      setShowActivar(false);
      avisos.exito(`"${base.nombre}" ya está activo en este evento.`, { titulo: 'Puesto activado' });
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setActivando(null);
    }
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
      avisos.exito(`"${puesto.nombre}" se quitó de este evento.`);
    } catch (e2) {
      avisos.error(e2.message, { titulo: 'No se pudo quitar el puesto' });
    }
  };

  if (!eventoSeleccionado) {
    return (
      <div className="pi-unegocio-container">
        <Migas items={[{ texto: 'Panel de negocio', actual: true }]} />
        <EncabezadoPagina
          titulo="Panel de negocio"
          subtitulo="Elegí el evento en el que querés administrar tus puestos."
          icono={FaStore}
        />
        {errorEventos ? (
          <EstadoError onReintentar={recargarEventos} />
        ) : cargandoEventos ? (
          <EstadoCarga filas={3} />
        ) : eventos.length === 0 ? (
          <EstadoVacio
            icono={FaCalendarTimes}
            titulo="Todavía no tenés ningún evento asignado"
            mensaje="Pedile a Admin que te asigne uno para empezar a vender."
          />
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
            <GrillaEventos eventos={eventosFiltrados}>
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

      <EncabezadoPagina
        titulo={eventoSeleccionado.nombre}
        subtitulo="Activá los puestos de tu catálogo en este evento y ajustá su menú (precios, stock y disponibilidad) solo para acá."
        icono={FaStore}
        acciones={<StatCard icon={<FaStore />} tono="info" valor={puestos.length} label="Puestos en este evento" />}
      />

      <div className="pi-unegocio-action-bar">
        <h2 className="pi-unegocio-subtitulo"><FaStore aria-hidden="true" /> Mis puestos</h2>
        <div className="btn-acciones">
          <Boton variante="secundario" icono={FaExternalLinkAlt} onClick={() => navigate('/usuarionegocio/catalogo')}>
            Mi catálogo
          </Boton>
          <Boton icono={FaPlus} onClick={() => { setErr(''); setShowActivar(true); }}>
            Activar puesto
          </Boton>
        </div>
      </div>

      <AvisosStockPanel />

      {errorPuestos && <EstadoError onReintentar={recargarPuestos} />}
      {!errorPuestos && cargandoPuestos && <EstadoCarga filas={4} />}
      {!errorPuestos && !cargandoPuestos && (
        <Tabla
          card
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
                      <div className="item-no-img"><FaStore aria-hidden="true" /></div>
                    )}
                    <div>
                      <div className="fila-nombre">{puesto.nombre}</div>
                      <div className="celda-secundaria">{puesto.descripcion}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div className="pi-unegocio-catalogo-cel">
                    <Insignia tono="info">
                      {puesto.productos.length} {puesto.productos.length === 1 ? 'producto' : 'productos'}
                    </Insignia>
                    {stk.sin > 0 && <Insignia tono="danger" icono={FaExclamationTriangle}>{stk.sin} sin stock</Insignia>}
                    {stk.bajo > 0 && <Insignia tono="warn">{stk.bajo} bajo</Insignia>}
                  </div>
                </td>
                <td>
                  {puesto.ayudantes.length > 0 ? (
                    <Insignia tono="neutro" icono={FaCheckCircle}>
                      {puesto.ayudantes.length} {puesto.ayudantes.length === 1 ? 'asignado' : 'asignados'}
                    </Insignia>
                  ) : (
                    <Insignia tono="warn" icono={FaExclamationTriangle} punto latido>Falta asignar</Insignia>
                  )}
                </td>
                <td className="td-centro">
                  <div className="btn-acciones">
                    <Boton variante="secundario" tamano="sm" icono={FaListUl} onClick={() => abrirDetallePuesto(puesto)}>
                      Detalles
                    </Boton>
                    <Boton variante="peligro-suave" tamano="sm" icono={FaTrash} onClick={() => desactivarPuesto(puesto)} title="Quitar del evento">
                      Quitar
                    </Boton>
                  </div>
                </td>
              </tr>
            );
          }}
        />
      )}

      {/* =========================================
          MODAL: ACTIVAR UN PUESTO BASE EN EL EVENTO
      ========================================= */}
      {showActivar && (
        <Modal
          titulo={<><FaStore aria-hidden="true" /> Activar un puesto en {eventoSeleccionado.nombre}</>}
          onCerrar={() => setShowActivar(false)}
        >
          {puestosBase.length === 0 ? (
            <EstadoVacio
              compacto
              icono={FaStore}
              titulo="Todavía no tenés puestos en tu catálogo"
              mensaje="Primero creá tus puestos en Mi catálogo; después los activás en cada evento."
              accion={<Boton icono={FaExternalLinkAlt} onClick={() => navigate('/usuarionegocio/catalogo')}>Ir a Mi catálogo</Boton>}
            />
          ) : basesDisponibles.length === 0 ? (
            <EstadoVacio compacto icono={FaCheckCircle} titulo="Ya activaste todos tus puestos del catálogo en este evento" />
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
                        <div className="item-no-img"><FaStore aria-hidden="true" /></div>
                      )}
                      <div>
                        <div className="fila-nombre">{base.nombre}</div>
                        <div className="celda-secundaria">
                          {base.productos.length} {base.productos.length === 1 ? 'producto' : 'productos'} · {base.descripcion || 'sin descripción'}
                        </div>
                      </div>
                    </div>
                    <Boton
                      tamano="sm"
                      icono={FaPlus}
                      onClick={() => activarPuesto(base)}
                      cargando={activando === base.id}
                      disabled={activando !== null && activando !== base.id}
                    >
                      Activar
                    </Boton>
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
          {err && <AvisoFijo tono="error">{err}</AvisoFijo>}
          <div className="modal-actions">
            <Boton variante="secundario" onClick={() => setShowActivar(false)}>Cerrar</Boton>
          </div>
        </Modal>
      )}

      {DialogoConfirmar}
    </div>
  );
}
