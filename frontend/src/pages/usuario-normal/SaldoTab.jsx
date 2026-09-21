import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaTicketAlt, FaWallet, FaQrcode, FaHistory, FaStore, FaCoins,
  FaExclamationTriangle, FaChevronDown
} from 'react-icons/fa';
import DetalleVentaModal from '../../components/DetalleVentaModal.jsx';
import HistorialManillas from '../../components/HistorialManillas.jsx';
import Tabla from '../../components/Tabla.jsx';
import Buscador from '../../components/Buscador.jsx';
import Paginador from '../../components/Paginador.jsx';
import BadgeEstadoEvento from '../../components/BadgeEstadoEvento.jsx';
import { usePaginacion } from '../../utils/usePaginacion.js';
import { estadoEvento } from '../../utils/eventos.js';
import Boton from '../../components/Boton.jsx';
import ModalQr from '../../components/ModalQr.jsx';

// Estado del plazo de retiro de una billetera de evento (§T&C).
function plazoRetiro(expiraEn) {
  if (!expiraEn) return { tono: 'neutro', texto: 'El plazo de retiro se fija cuando termina el evento' };
  const fin = new Date(expiraEn);
  const dias = Math.ceil((fin - new Date()) / 86400000);
  if (dias < 0) return { tono: 'vencido', texto: `Plazo de retiro vencido (${fin.toLocaleDateString('es-BO')})` };
  if (dias === 0) return { tono: 'porVencer', texto: 'Hoy es el último día para retirar tu saldo' };
  return {
    tono: dias <= 7 ? 'porVencer' : 'ok',
    texto: `Te quedan ${dias} día${dias === 1 ? '' : 's'} para retirar el saldo (hasta el ${fin.toLocaleDateString('es-BO')})`,
  };
}

// Tarjeta expandible: saldo de un evento + desglose recargado/gastado/devuelto.
// `enCurso`: es el mismo evento que ya se destacó grande arriba — se marca acá
// también para no perderlo de vista dentro de la lista completa.
function BilleteraAcordeon({ b, enCurso = false, qrCodigo }) {
  const [abierto, setAbierto] = useState(false);
  const [verQr, setVerQr] = useState(false);
  const plazo = plazoRetiro(b.expiraEn);
  const bloqueado = Number(b.bloqueado ?? 0);
  const disponible = Number(b.disponible ?? b.saldo);
  // Solo tiene sentido "retirar" (y por lo tanto mostrar el QR) en un evento
  // que ya terminó, con saldo pendiente de cobrar y ANTES de que venza el
  // plazo de retiro — pasada la fecha límite, ya no sirve mostrar el QR.
  const puedeRetirar =
    ['finalizado', 'archivado'].includes(estadoEvento(b)) &&
    disponible > 0 &&
    qrCodigo &&
    plazo.tono !== 'vencido';
  return (
    <div className={`pi-usr-bill ${abierto ? 'abierto' : ''}${enCurso ? ' pi-usr-bill--en-curso' : ''}`}>
      <button type="button" className="pi-usr-bill-cab" onClick={() => setAbierto(o => !o)} aria-expanded={abierto}>
        <span className="pi-usr-bill-titulo">
          <strong>{b.eventoNombre}</strong>
          <span className="pi-usr-bill-fecha">
            {new Date(b.fecha).toLocaleDateString('es-BO')}
            {enCurso && <span className="pi-usr-bill-badge-curso">En curso</span>}
          </span>
        </span>
        <span className={`pi-usr-bill-plazo tono-${plazo.tono}`}>{plazo.tono === 'vencido' ? 'Vencido' : plazo.tono === 'porVencer' ? '¡Retirá pronto!' : ''}</span>
        <span className="pi-usr-bill-saldo">{disponible} pts</span>
        <FaChevronDown className="pi-usr-bill-flecha" aria-hidden="true" />
      </button>
      {abierto && (
        <div className="pi-usr-bill-cuerpo">
          <div className="pi-usr-bill-grid">
            <div><span>{Number(b.recargado)} pts</span><small>Recargado</small></div>
            <div><span>{Number(b.gastado)} pts</span><small>Gastado en puestos</small></div>
            <div><span>{Number(b.devuelto)} pts</span><small>Devuelto</small></div>
            <div className="destacado"><span>{disponible} pts</span><small>Saldo disponible</small></div>
          </div>
          {bloqueado > 0 && (
            <p className="pi-usr-bill-disputa">
              <FaExclamationTriangle aria-hidden="true" /> {bloqueado} pts retenidos por una incidencia de recarga en revisión — no los podés usar ni retirar hasta que se resuelva.
            </p>
          )}
          <p className={`pi-usr-bill-plazo-detalle tono-${plazo.tono}`}>{plazo.texto}</p>
          {puedeRetirar && (
            <Boton icono={FaQrcode} onClick={() => setVerQr(true)}>Ver mi QR para retirar</Boton>
          )}
        </div>
      )}
      {verQr && (
        <ModalQr
          codigo={qrCodigo}
          titulo={b.eventoNombre}
          nota={`Mostrá este código en el punto de retiro para cobrar tus ${disponible} pts disponibles.`}
          onCerrar={() => setVerQr(false)}
        />
      )}
    </div>
  );
}

/** Pestaña "Mi Saldo": saldo por evento, movimientos y cambios de manilla. */
export default function SaldoTab({ billeteras, historial, qrPorEvento }) {
  const navigate = useNavigate();

  // --- ESTADO DE SALDO (billetera POR EVENTO: el saldo recargado en un evento
  //     solo sirve en ese evento) ---
  const [ventaDetalle, setVentaDetalle] = useState(null);
  const saldoTotal = useMemo(
    () => billeteras.reduce((s, b) => s + Number(b.disponible ?? b.saldo), 0),
    [billeteras],
  );

  // El evento que está pasando AHORA se destaca grande arriba de la lista; sigue
  // apareciendo también en la lista de abajo (con buscador, para no perderlo de
  // vista entre muchos eventos).
  const billeteraEnCurso = useMemo(
    () => billeteras.find(b => estadoEvento(b) === 'en_curso') || null,
    [billeteras],
  );
  const [busquedaBilleteras, setBusquedaBilleteras] = useState('');
  // Saldo por evento se muestra COMPLETO, pero de a 5: la lista crece con
  // cada evento en el que el usuario recargo alguna vez y no tiene techo.
  // Se pagina sobre la lista ya filtrada por el buscador, no sobre la total.
  const billeterasFiltradas = useMemo(() => {
    const q = busquedaBilleteras.trim().toLowerCase();
    if (!q) return billeteras;
    return billeteras.filter(b => b.eventoNombre.toLowerCase().includes(q));
  }, [billeteras, busquedaBilleteras]);
  const pagBilleteras = usePaginacion(billeterasFiltradas, 5);

  const totalRecargado = useMemo(
    () => historial.filter(t => t.tipo === 'recarga').reduce((total, t) => total + Number(t.monto), 0),
    [historial]
  );

  const totalGastado = useMemo(
    () => historial.filter(t => t.tipo === 'consumo').reduce((total, t) => total + Number(t.monto), 0),
    [historial]
  );

  // --- Búsqueda + filtros del historial de transacciones ---
  const [busquedaHist, setBusquedaHist] = useState('');
  const [filtroHist, setFiltroHist] = useState('todos');

  // Agrupa los tipos crudos en las categorías que ve el usuario.
  const grupoTipo = (tipo) => {
    if (tipo === 'recarga') return 'recarga';
    if (tipo === 'consumo') return 'consumo';
    if (tipo === 'devolucion') return 'devolucion';
    return 'ajuste'; // ajuste, reverso_consumo, reverso_venta…
  };

  const filtrosHist = useMemo(() => {
    const conteo = (g) => historial.filter(t => grupoTipo(t.tipo) === g).length;
    return [
      { valor: 'todos', texto: 'Todos', conteo: historial.length },
      { valor: 'recarga', texto: 'Recargas', conteo: conteo('recarga') },
      { valor: 'consumo', texto: 'Consumos', conteo: conteo('consumo') },
      { valor: 'devolucion', texto: 'Devoluciones', conteo: conteo('devolucion') },
      { valor: 'ajuste', texto: 'Ajustes', conteo: conteo('ajuste') },
    ].filter(f => f.valor === 'todos' || f.conteo > 0);
  }, [historial]);

  const historialFiltrado = useMemo(() => {
    const q = busquedaHist.trim().toLowerCase();
    return historial.filter(t => {
      if (filtroHist !== 'todos' && grupoTipo(t.tipo) !== filtroHist) return false;
      if (!q) return true;
      const enProductos = (t.venta?.items || [])
        .some(i => (i.nombreProducto || '').toLowerCase().includes(q));
      return (
        (t.evento?.nombre || '').toLowerCase().includes(q) ||
        (t.venta?.puesto?.nombre || '').toLowerCase().includes(q) ||
        (t.operador?.nombre || '').toLowerCase().includes(q) ||
        (t.nota || '').toLowerCase().includes(q) ||
        enProductos
      );
    });
  }, [historial, busquedaHist, filtroHist]);

  return (
    <>
      {/* =========================================================
          PESTAÑA: MI SALDO
      ========================================================= */}
        <div className="pi-usr-saldo">
          <div className="pi-usr-saldo-stats">
            <div className="pi-usr-saldo-card">
              <FaWallet size={30} color="var(--indigo-profundo)" />
              <span className="pi-usr-saldo-numero">{saldoTotal} pts</span>
              <span className="pi-usr-saldo-label">Saldo total (todos los eventos)</span>
            </div>

            <div className="pi-usr-saldo-card saldo-card-recargado">
              <FaCoins size={30} color="var(--verde-recarga-texto)" />
              <span className="pi-usr-saldo-numero">{totalRecargado} pts</span>
              <span className="pi-usr-saldo-label">Total recargado</span>
            </div>

            <div className="pi-usr-saldo-card saldo-card-gastado">
              <FaStore size={30} color="var(--rojo-error-texto)" />
              <span className="pi-usr-saldo-numero">{totalGastado} pts</span>
              <span className="pi-usr-saldo-label">Total gastado</span>
            </div>
          </div>

          {billeteraEnCurso && (
            <div className="pi-usr-bill-destacada">
              <div className="pi-usr-bill-destacada-info">
                <BadgeEstadoEvento evento={billeteraEnCurso} className="pi-usr-bill-destacada-badge" />
                <strong className="pi-usr-bill-destacada-nombre">{billeteraEnCurso.eventoNombre}</strong>
                <span className="pi-usr-bill-destacada-saldo">
                  {Number(billeteraEnCurso.disponible ?? billeteraEnCurso.saldo)} pts disponibles
                </span>
              </div>
              <Boton icono={FaQrcode} onClick={() => navigate('/usuarionormal')}>Ver mi manilla</Boton>
            </div>
          )}

          <div className="pi-usr-card mt-20">
            <h3><FaWallet color="var(--indigo-profundo)" /> Saldo por evento</h3>
            <p className="texto-ayuda">
              El saldo que recargás en un evento solo se puede usar en ese evento.
              Tocá un evento para ver el detalle.
            </p>
            {billeteras.length === 0 ? (
              <p className="texto-ayuda">Todavía no recargaste saldo en ningún evento.</p>
            ) : (
              <>
                {billeteras.length > 3 && (
                  <Buscador
                    valor={busquedaBilleteras}
                    onCambio={setBusquedaBilleteras}
                    placeholder="Buscar evento…"
                    etiqueta="Buscar en saldo por evento"
                  />
                )}
                {billeterasFiltradas.length === 0 ? (
                  <p className="texto-ayuda">Ningún evento coincide con la búsqueda.</p>
                ) : (
                  <>
                    <div className="pi-usr-bill-lista">
                      {pagBilleteras.slice.map(b => (
                        <BilleteraAcordeon
                          key={b.eventoId}
                          b={b}
                          enCurso={b.eventoId === billeteraEnCurso?.eventoId}
                          qrCodigo={qrPorEvento.get(b.eventoId)}
                        />
                      ))}
                    </div>
                    <Paginador
                      pagina={pagBilleteras.paginaActual}
                      totalPaginas={pagBilleteras.totalPaginas}
                      onCambio={pagBilleteras.setPagina}
                      total={pagBilleteras.total}
                      unidad="eventos"
                    />
                  </>
                )}
              </>
            )}
          </div>

          <div className="pi-usr-card mt-20">
            <h3><FaHistory color="var(--indigo-profundo)" /> Mis Transacciones (Compras y Recargas)</h3>

            <div className="pi-usr-hist-buscador">
              <Buscador
                valor={busquedaHist}
                onCambio={setBusquedaHist}
                placeholder="Buscar por evento, puesto o producto…"
                filtros={filtrosHist}
                filtroActivo={filtroHist}
                onFiltro={setFiltroHist}
                etiquetaFiltros="Filtrar movimientos por tipo"
              />
            </div>

            <Tabla
              columnas={['Movimiento', 'Evento', 'Lugar / Detalle', 'Monto', 'Fecha / Hora']}
              datos={historialFiltrado}
              vacio={
                historial.length === 0
                  ? 'Aún no tienes movimientos registrados.'
                  : 'Ningún movimiento coincide con la búsqueda.'
              }
              renderFila={item => {
                const esVenta = ['consumo', 'reverso_consumo'].includes(item.tipo) && item.venta;
                let detalle;
                if (esVenta) {
                  const items = item.venta.items || [];
                  const unidades = items.reduce((total, i) => total + Number(i.cantidad), 0);
                  detalle = (
                    <span className="pi-usr-detalle-consumo">
                      <strong>{item.venta.puesto?.nombre || 'Puesto'}</strong>
                      <span className="pi-usr-detalle-items">
                        {items.length > 0
                          ? `${unidades} ${unidades === 1 ? 'producto' : 'productos'}`
                          : 'Compra sin detalle de productos'}
                      </span>
                      <Boton
                        variante="secundario"
                        tamano="sm"
                        onClick={() => setVentaDetalle({
                          fecha: item.createdAt,
                          puesto: item.venta.puesto?.nombre,
                          anulada: item.tipo === 'reverso_consumo' || !!item.venta.anuladaEn,
                          motivoAnulacion: item.venta.motivoAnulacion,
                          monto: item.venta.montoTotal ?? item.monto,
                          items,
                        })}
                      >
                        Ver detalle
                      </Boton>
                    </span>
                  );
                } else if (item.tipo === 'recarga') {
                  detalle = item.operador?.nombre
                    ? <span className="pi-usr-detalle-consumo">Recargado por {item.operador.nombre}</span>
                    : (item.nota || '—');
                } else if (item.tipo === 'devolucion') {
                  detalle = (
                    <span className="pi-usr-detalle-consumo">
                      {item.nota || 'Retiro de saldo'}
                      {item.operador?.nombre ? ` · ${item.operador.nombre}` : ''}
                    </span>
                  );
                } else {
                  detalle = item.nota || '—';
                }
                return (
                  <tr key={item.id}>
                    <td>
                      <span className="pi-usr-tipo-celda">
                        {item.tipo === 'recarga' && <><FaCoins color="var(--verde-recarga-texto)" /> Recarga de Saldo</>}
                        {item.tipo === 'consumo' && <><FaStore color="var(--indigo-profundo)" /> Consumo en Puesto</>}
                        {item.tipo === 'devolucion' && <><FaTicketAlt color="var(--coral-compra)" /> Devolución</>}
                        {item.tipo === 'ajuste' && <><FaCoins color="var(--verde-recarga-texto)" /> Ajuste</>}
                        {item.tipo === 'ajuste_manual' && <><FaCoins color="var(--verde-recarga-texto)" /> Reposición de saldo</>}
                        {item.tipo === 'reverso_consumo' && <><FaCoins color="var(--verde-recarga-texto)" /> Reintegro por venta anulada</>}
                      </span>
                    </td>
                    <td style={{ fontSize: '13px' }}>{item.evento?.nombre || '—'}</td>
                    <td>{detalle}</td>
                    {(() => {
                      const monto = Number(item.monto);
                      // El "ajuste" es el único tipo cuyo monto viene con signo propio
                      // (puede ser una corrección negativa); los demás siempre guardan
                      // una magnitud positiva y el signo lo da el tipo de movimiento.
                      const positivo = item.tipo === 'ajuste'
                        ? monto >= 0
                        : ['recarga', 'reverso_consumo', 'ajuste_manual'].includes(item.tipo);
                      return (
                        <td className={positivo ? 'pi-usr-monto-positivo' : 'pi-usr-monto-negativo'}>
                          {positivo ? '+' : '-'}{Math.abs(monto)} pts
                        </td>
                      );
                    })()}
                    <td style={{color: 'var(--texto-secundario)', fontSize: '13px'}}>{new Date(item.createdAt).toLocaleString('es-BO')}</td>
                  </tr>
                );
              }}
            />
            {ventaDetalle && (
              <DetalleVentaModal venta={ventaDetalle} onCerrar={() => setVentaDetalle(null)} />
            )}
          </div>

          {/* Cambios de manilla de sus entradas: si le cambiaron la manilla (perdida,
              dañada o duplicada), acá ve cuándo y por qué. */}
          <div className="pi-usr-card mt-20">
            <HistorialManillas
              mias
              titulo="Mis manillas"
              descripcion="Cada manilla que te entregaron y cada cambio, con el motivo."
            />
          </div>
        </div>
    </>
  );
}
