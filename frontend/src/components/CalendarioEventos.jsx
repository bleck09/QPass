import { useMemo, useState } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { estadoEvento, ESTADO_EVENTO } from '../utils/eventos.js';
import './CalendarioEventos.css';

// Misma clase que <BadgeEstadoEvento> ("ev-en-curso" con guión, no "en_curso").
const claseEstado = (ev) => ESTADO_EVENTO[estadoEvento(ev)]?.clase || '';

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

// 'YYYY-MM-DD' en el calendario LOCAL del navegador (nunca UTC) — así un
// evento nocturno que cruza medianoche cuenta en ambos días tal como se ve.
const diaISOLocal = (fecha) => {
  const d = new Date(fecha);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};

/**
 * Calendario mensual de eventos: un vistazo a qué fechas están ocupadas.
 * La regla de negocio actual es "un evento a la vez" (el backend ya lo
 * garantiza), pero acá se soporta más de uno por día igual por si acaso
 * (ej. dos eventos cortos el mismo día que no llegan a cruzarse en horario).
 *
 * @param {{id,nombre,fecha,fechaFin,estado?,archivadoEn?,publicadoEn?}[]} eventos
 * @param {(eventoId) => void} onSeleccionar
 */
export default function CalendarioEventos({ eventos = [], onSeleccionar }) {
  const [mesVisible, setMesVisible] = useState(() => {
    const hoy = new Date();
    return new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  });

  const hoyISO = diaISOLocal(new Date());

  // eventoId -> rango de días 'YYYY-MM-DD' que ocupa (para no recalcular por celda).
  const eventosConRango = useMemo(
    () => eventos
      .filter(ev => ev.fecha && ev.fechaFin)
      .map(ev => ({ ...ev, desde: diaISOLocal(ev.fecha), hasta: diaISOLocal(ev.fechaFin) })),
    [eventos],
  );

  const celdas = useMemo(() => {
    const anio = mesVisible.getFullYear();
    const mes = mesVisible.getMonth();
    const primerDiaMes = new Date(anio, mes, 1);
    // getDay(): 0=domingo..6=sábado -> se convierte a "días desde el lunes".
    const offsetLunes = (primerDiaMes.getDay() + 6) % 7;
    const inicioGrilla = new Date(anio, mes, 1 - offsetLunes);

    return Array.from({ length: 42 }, (_, i) => {
      const fecha = new Date(inicioGrilla.getFullYear(), inicioGrilla.getMonth(), inicioGrilla.getDate() + i);
      const iso = diaISOLocal(fecha);
      const eventosDelDia = eventosConRango.filter(ev => iso >= ev.desde && iso <= ev.hasta);
      return {
        fecha,
        iso,
        enMes: fecha.getMonth() === mes,
        esHoy: iso === hoyISO,
        eventos: eventosDelDia,
      };
    });
  }, [mesVisible, eventosConRango, hoyISO]);

  const irAHoy = () => {
    const hoy = new Date();
    setMesVisible(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
  };
  const mesAnterior = () => setMesVisible(m => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  const mesSiguiente = () => setMesVisible(m => new Date(m.getFullYear(), m.getMonth() + 1, 1));

  return (
    <div className="qp-cal">
      <div className="qp-cal__cabecera">
        <div className="qp-cal__titulo">
          <strong>{MESES[mesVisible.getMonth()]}</strong> {mesVisible.getFullYear()}
        </div>
        <div className="qp-cal__nav">
          <button type="button" onClick={irAHoy} className="qp-cal__hoy">Hoy</button>
          <button type="button" onClick={mesAnterior} aria-label="Mes anterior"><FaChevronLeft aria-hidden="true" /></button>
          <button type="button" onClick={mesSiguiente} aria-label="Mes siguiente"><FaChevronRight aria-hidden="true" /></button>
        </div>
      </div>

      <div className="qp-cal__grid qp-cal__grid--dias-semana">
        {DIAS_SEMANA.map(d => <div key={d} className="qp-cal__dia-semana">{d}</div>)}
      </div>

      <div className="qp-cal__grid">
        {celdas.map(celda => (
          <div
            key={celda.iso}
            className={`qp-cal__celda${celda.enMes ? '' : ' qp-cal__celda--afuera'}${celda.esHoy ? ' qp-cal__celda--hoy' : ''}`}
          >
            <span className="qp-cal__num">{celda.fecha.getDate()}</span>
            {celda.eventos.length > 0 && (
              <div className="qp-cal__eventos">
                {celda.eventos.map(ev => (
                  <button
                    key={ev.id}
                    type="button"
                    className={`qp-cal__evento ${claseEstado(ev)}`}
                    onClick={() => onSeleccionar?.(ev.id)}
                    title={ev.nombre}
                  >
                    {ev.nombre}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="qp-cal__leyenda">
        <span><i className="qp-cal__punto ev-proximo" /> Próximo</span>
        <span><i className="qp-cal__punto ev-en-curso" /> En curso</span>
        <span><i className="qp-cal__punto ev-finalizado" /> Finalizado</span>
        <span><i className="qp-cal__punto ev-archivado" /> Archivado</span>
      </div>
    </div>
  );
}
