import { useCallback, useMemo, useState } from 'react';
import { FaHistory } from 'react-icons/fa';
import Buscador from './Buscador.jsx';
import Tabla from './Tabla.jsx';
import { EstadoCarga, EstadoError } from './EstadosAsync.jsx';
import { useApi } from '../utils/useApi.js';
import api from '../api/index.js';
import { formatearFecha } from '../utils/eventos.js';
import './HistorialManillas.css';

/*
  Historial de entrega y cambio de manillas. Sale de la propia manilla
  (asignadoPor/asignadoEn y anuladoPor/anuladoEn), así que es solo lectura y ya
  incluye los cambios por duplicado (ver CasoDuplicado en schema.prisma).

  Dos usos, mismo componente:
    <HistorialManillas eventoId={ev.id} />   // todo el evento (Supervisor / Admin / Cliente)
    <HistorialManillas mias />               // "Mis manillas" del usuario logueado

  Props:
    eventoId     string    evento a mostrar (ignorado si `mias`).
    mias         bool      historial del usuario logueado, de todos sus eventos.
    titulo       string    encabezado; null lo oculta (si la página ya tiene uno).
    descripcion  string
*/
export default function HistorialManillas({
  eventoId,
  mias = false,
  titulo = 'Historial de manillas',
  descripcion = 'Cada entrega y cada cambio de manilla, con quién lo hizo y por qué.',
}) {
  const cargar = useCallback(
    () => (mias ? api.codigosQr.historialMias() : api.codigosQr.historial(eventoId)),
    [mias, eventoId],
  );
  const { data: movimientos, cargando, error, recargar } = useApi(cargar, {
    inicial: [],
    activo: mias || !!eventoId,
  });
  const [busqueda, setBusqueda] = useState('');

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return movimientos;
    return movimientos.filter(m =>
      `${m.entrada?.nombre || ''} ${m.evento?.nombre || ''} ${m.manilla.numero} ${m.manilla.codigo} ${m.actor?.nombre || ''}`
        .toLowerCase().includes(q),
    );
  }, [movimientos, busqueda]);

  const columnas = mias
    ? ['Fecha', 'Movimiento', 'Evento', 'Manilla', 'Motivo']
    : ['Fecha', 'Movimiento', 'Manilla', 'Participante', 'Lo hizo', 'Motivo'];

  const etiquetaMovimiento = (tipo) => {
    if (tipo === 'entrega') return <span className="qp-hist-mov qp-hist-mov--ok">Entrega</span>;
    if (tipo === 'duplicado') return <span className="qp-hist-mov qp-hist-mov--alerta">Cambio por duplicado</span>;
    return <span className="qp-hist-mov">Baja / reemplazo</span>;
  };

  return (
    <section className="qp-hist-manillas">
      {titulo && (
        <div className="qp-hist-manillas__head">
          <h2><FaHistory aria-hidden="true" /> {titulo}</h2>
          {descripcion && <p>{descripcion}</p>}
        </div>
      )}

      <Buscador
        valor={busqueda}
        onCambio={setBusqueda}
        placeholder={mias
          ? 'Buscar por evento o N.º de manilla…'
          : 'Buscar por participante, N.º de manilla o quién lo hizo…'}
        etiqueta="Buscar en el historial de manillas"
      />

      {error ? (
        <EstadoError onReintentar={recargar} />
      ) : cargando && movimientos.length === 0 ? (
        <EstadoCarga filas={3} />
      ) : (
        <Tabla
          card
          columnas={columnas}
          datos={filtrados}
          vacio={busqueda.trim()
            ? 'Ningún movimiento coincide con la búsqueda.'
            : mias
              ? 'Todavía no te entregaron ninguna manilla.'
              : 'Todavía no se entregó ninguna manilla en este evento.'}
          renderFila={m => (
            <tr key={m.id}>
              <td className="qp-hist-fecha">{formatearFecha(m.fecha)}</td>
              <td>{etiquetaMovimiento(m.tipo)}</td>
              {mias
                ? <td>{m.evento?.nombre || '—'}</td>
                : null}
              <td>N.º {m.manilla.numero}</td>
              {!mias && <td>{m.entrada?.nombre || '—'}</td>}
              {!mias && <td>{m.actor ? `${m.actor.nombre} (${m.actor.rol})` : '—'}</td>}
              <td>{m.motivo || '—'}</td>
            </tr>
          )}
        />
      )}
    </section>
  );
}
