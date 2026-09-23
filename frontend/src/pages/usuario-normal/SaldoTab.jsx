import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaTicketAlt, FaWallet, FaQrcode, FaHistory, FaStore, FaCoins,
  FaChevronDown, FaSearch, FaExclamationTriangle, FaClock,
} from 'react-icons/fa';
import DetalleVentaModal from '../../components/DetalleVentaModal.jsx';
import HistorialManillas from '../../components/HistorialManillas.jsx';
import Tabla from '../../components/Tabla.jsx';
import Buscador from '../../components/Buscador.jsx';
import Paginador from '../../components/Paginador.jsx';
import BadgeEstadoEvento from '../../components/BadgeEstadoEvento.jsx';
import Card from '../../components/Card.jsx';
import StatCard from '../../components/StatCard.jsx';
import Insignia from '../../components/Insignia.jsx';
import { AvisoFijo } from '../../components/Avisos.jsx';
import { EstadoVacio } from '../../components/EstadosAsync.jsx';
import { usePaginacion } from '../../utils/usePaginacion.js';
import { estadoEvento } from '../../utils/eventos.js';
import Boton from '../../components/Boton.jsx';
import ModalQr from '../../components/ModalQr.jsx';
import './SaldoTab.css';

// Estado del plazo de retiro de una billetera de evento (§T&C).
// tono: el de <AvisoFijo>/<Insignia>; corto: texto de la insignia de la fila.
function plazoRetiro(expiraEn) {
  if (!expiraEn) return { tono: 'info', texto: 'El plazo de retiro se fija cuando termina el evento' };
  const fin = new Date(expiraEn);
  const dias = Math.ceil((fin - new Date()) / 86400000);
  if (dias < 0) return { tono: 'error', corto: 'Vencido', texto: `Plazo de retiro vencido (${fin.toLocaleDateString('es-BO')})` };
  if (dias === 0) return { tono: 'aviso', corto: 'Último día', texto: 'Hoy es el último día para retirar tu saldo' };
  return {
    tono: dias <= 7 ? 'aviso' : 'info',
    corto: dias <= 7 ? `${dias} día${dias === 1 ? '' : 's'}` : null,
    texto: `Te quedan ${dias} día${dias === 1 ? '' : 's'} para retirar el saldo (hasta el ${fin.toLocaleDateString('es-BO')})`,
  };
}

// Tono de <AvisoFijo> -> tono de <Insignia>.
const TONO_INSIGNIA = { error: 'danger', aviso: 'warn', info: 'info', exito: 'ok' };

// Cómo se ve cada tipo de movimiento del historial.
const TIPO_MOVIMIENTO = {
  recarga: { icono: FaCoins, texto: 'Recarga de saldo', tono: 'ok' },
  consumo: { icono: FaStore, texto: 'Consumo en puesto', tono: 'marca' },
  devolucion: { icono: FaTicketAlt, texto: 'Devolución', tono: 'warn' },
  ajuste: { icono: FaCoins, texto: 'Ajuste', tono: 'neutro' },
  ajuste_manual: { icono: FaCoins, texto: 'Reposición de saldo', tono: 'ok' },
  reverso_consumo: { icono: FaCoins, texto: 'Reintegro por venta anulada', tono: 'ok' },
};

// Tarjeta expandible: saldo de un evento + desglose recargado/gastado/devuelto.
// `enCurso`: es el mismo evento que ya se destacó grande arriba — se marca acá
// también para no perderlo de vista dentro de la lista completa.
function BilleteraAcordeon({ b, enCurso = false, qrCodigo }) {
  const [abierto, setAbierto] = useState(false);
  const [verQr, setVerQr] = useState(false);
  const plazo = plazoRetiro(b.expiraEn);
  const bloqueado = Number(b.bloqueado ?? 0);
  const disponible = Number(b.disponible ?? b.saldo);
  const idCuerpo = `bill-${b.eventoId}`;
  // Solo tiene sentido "retirar" (y por lo tanto mostrar el QR) en un evento
  // que ya terminó, con saldo pendiente de cobrar y ANTES de que venza el
  // plazo de retiro — pasada la fecha límite, ya no sirve mostrar el QR.
  const puedeRetirar =
    ['finalizado', 'archivado'].includes(estadoEvento(b)) &&
    disponible > 0 &&
    qrCodigo &&
    plazo.tono !== 'error';
  return (
    <div className={`pi-sal-bill${abierto ? ' abierto' : ''}${enCurso ? ' en-curso' : ''}`}>
      <button type="button" className="pi-sal-bill-cab" onClick={() => setAbierto(o => !o)} aria-expanded={abierto} aria-controls={idCuerpo}>
        <span className="pi-sal-bill-titulo">
          <strong>{b.eventoNombre}</strong>
          <span className="pi-sal-bill-fecha">
            {new Date(b.fecha).toLocaleDateString('es-BO')}
            {enCurso && <Insignia tono="ok" punto latido>En curso</Insignia>}
          </span>
        </span>
        {plazo.corto && (
          <Insignia tono={TONO_INSIGNIA[plazo.tono]} icono={FaClock}>{plazo.corto}</Insignia>
        )}
        <span className="pi-sal-bill-saldo">{disponible} <small>pts</small></span>
        <FaChevronDown className="pi-sal-bill-flecha" aria-hidden="true" />
      </button>
      {/* Siempre montado: se abre/cierra con animación de alto (grid 0fr -> 1fr). */}
      <div id={idCuerpo} className="pi-sal-bill-cuerpo" inert={!abierto}>
        <div className="pi-sal-bill-interior">
          <dl className="pi-sal-bill-grid">
            <div><dt>Recargado</dt><dd>{Number(b.recargado)} pts</dd></div>
            <div><dt>Gastado en puestos</dt><dd>{Number(b.gastado)} pts</dd></div>
            <div><dt>Devuelto</dt><dd>{Number(b.devuelto)} pts</dd></div>
            <div className="destacado"><dt>Saldo disponible</dt><dd>{disponible} pts</dd></div>
          </dl>
          {bloqueado > 0 && (
            <AvisoFijo tono="aviso" titulo={`${bloqueado} pts retenidos`}>
              Hay una incidencia de recarga en revisión: no los podés usar ni retirar hasta que se resuelva.
            </AvisoFijo>
          )}
          <AvisoFijo tono={plazo.tono} icono={FaClock}>{plazo.texto}</AvisoFijo>
          {puedeRetirar && (
            <Boton icono={FaQrcode} onClick={() => setVerQr(true)}>Ver mi QR para retirar</Boton>
          )}
        </div>
      </div>
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
    <div className="pi-sal">
      <div className="qp-stats">
        <StatCard icon={<FaWallet />} tono="total" valor={saldoTotal} unidad="pts" label="Saldo total (todos los eventos)" />
        <StatCard icon={<FaCoins />} tono="ok" valor={totalRecargado} unidad="pts" label="Total recargado" />
        <StatCard icon={<FaStore />} tono="danger" valor={totalGastado} unidad="pts" label="Total gastado" />
      </div>

      {billeteraEnCurso && (
        <Card className="pi-sal-destacada">
          <div className="pi-sal-destacada-info">
            <BadgeEstadoEvento evento={billeteraEnCurso} />
            <strong>{billeteraEnCurso.eventoNombre}</strong>
            <span>{Number(billeteraEnCurso.disponible ?? billeteraEnCurso.saldo)} pts disponibles</span>
          </div>
          <Boton icono={FaQrcode} onClick={() => navigate('/usuarionormal')}>Ver mi manilla</Boton>
        </Card>
      )}

      <Card as="section">
        <h3 className="pi-sal-titulo"><FaWallet aria-hidden="true" /> Saldo por evento</h3>
        <p className="texto-ayuda">
          El saldo que recargás en un evento solo se puede usar en ese evento.
          Tocá un evento para ver el detalle.
        </p>
        {billeteras.length === 0 ? (
          <EstadoVacio
            compacto
            icono={FaWallet}
            titulo="Todavía no recargaste saldo"
            mensaje="Cuando recargues en un evento, vas a ver acá cuánto te queda."
          />
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
              <EstadoVacio compacto icono={FaSearch} titulo="Ningún evento coincide con la búsqueda" />
            ) : (
              <>
                <div className="pi-sal-bill-lista qp-escalonado">
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
      </Card>

      <Card as="section">
        <h3 className="pi-sal-titulo"><FaHistory aria-hidden="true" /> Mis movimientos (compras y recargas)</h3>

        <div className="pi-sal-hist-buscador">
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
                <span className="pi-sal-detalle">
                  <strong>{item.venta.puesto?.nombre || 'Puesto'}</strong>
                  <span>
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
                ? <span className="pi-sal-detalle">Recargado por {item.operador.nombre}</span>
                : (item.nota || '—');
            } else if (item.tipo === 'devolucion') {
              detalle = (
                <span className="pi-sal-detalle">
                  {item.nota || 'Retiro de saldo'}
                  {item.operador?.nombre ? ` · ${item.operador.nombre}` : ''}
                </span>
              );
            } else {
              detalle = item.nota || '—';
            }
            const tipo = TIPO_MOVIMIENTO[item.tipo] ?? { icono: FaExclamationTriangle, texto: item.tipo, tono: 'neutro' };
            const monto = Number(item.monto);
            // El "ajuste" es el único tipo cuyo monto viene con signo propio
            // (puede ser una corrección negativa); los demás siempre guardan
            // una magnitud positiva y el signo lo da el tipo de movimiento.
            const positivo = item.tipo === 'ajuste'
              ? monto >= 0
              : ['recarga', 'reverso_consumo', 'ajuste_manual'].includes(item.tipo);
            return (
              <tr key={item.id}>
                <td><Insignia tono={tipo.tono} icono={tipo.icono}>{tipo.texto}</Insignia></td>
                <td className="pi-sal-celda-sec">{item.evento?.nombre || '—'}</td>
                <td>{detalle}</td>
                <td className={`pi-sal-monto ${positivo ? 'positivo' : 'negativo'}`}>
                  {positivo ? '+' : '-'}{Math.abs(monto)} pts
                </td>
                <td className="pi-sal-celda-sec">{new Date(item.createdAt).toLocaleString('es-BO')}</td>
              </tr>
            );
          }}
        />
        {ventaDetalle && (
          <DetalleVentaModal venta={ventaDetalle} onCerrar={() => setVentaDetalle(null)} />
        )}
      </Card>

      {/* Cambios de manilla de sus entradas: si le cambiaron la manilla (perdida,
          dañada o duplicada), acá ve cuándo y por qué. */}
      <Card>
        <HistorialManillas
          mias
          titulo="Mis manillas"
          descripcion="Cada manilla que te entregaron y cada cambio, con el motivo."
        />
      </Card>
    </div>
  );
}
