import { useMemo, useState } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { estadoEvento, ESTADO_EVENTO, diaLocalISO } from '../utils/eventos.js';
import './CalendarioEventos.css';

// Misma clase que <BadgeEstadoEvento> ("ev-en-curso" con guión, no "en_curso").
const claseEstado = (ev) => ESTADO_EVENTO[estadoEvento(ev)]?.clase || '';

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

/**
 * Calendario mensual de eventos: un vistazo a qué fechas están ocupadas.
 * La regla de negocio actual es "un evento a la vez" (el backend ya lo
 * garantiza), pero acá se soporta más de uno por día igual por si acaso
 * (ej. dos eventos cortos el mismo día que no llegan a cruzarse en horario).
 *
 * Dos modos, mismo componente (para no duplicar la grilla/navegación entre
 * meses en dos lugares):
 *  - Normal (`modoSeleccion` false, por defecto): cada evento es un botón
 *    clickeable que llama a `onSeleccionar(eventoId)` — así se usa en la
 *    vista "Calendario" del listado de eventos.
 *  - Selección (`modoSeleccion` true): clickear un día elige el rango de
 *    fechas del evento que se está creando/editando (sin horario, eso se
 *    afina después en Jornadas) — así se usa en el formulario de Crear
 *    Evento. Clic 1 = un solo día; clic 2 = cierra el rango entre ambos
 *    (en cualquier orden); el próximo clic empieza un rango nuevo. Los
 *    eventos de otros días se siguen viendo (para no chocar fechas) pero
 *    ya no son clickeables — acá no hay nada que "abrir".
 *
 * `rangoSeleccionado` resalta un rango de días independientemente del modo:
 * con `modoSeleccion` es el rango que se está eligiendo (interactivo); sin
 * `modoSeleccion`, es solo de referencia visual, no clickeable — así se usa
 * el mini calendario de "días de la jornada" en AdminJornadas.jsx.
 *
 * @param {{id,nombre,fecha,fechaFin,estado?,archivadoEn?,publicadoEn?}[]} eventos
 * @param {(eventoId) => void} [onSeleccionar]
 * @param {boolean} [modoSeleccion]
 * @param {{desde: string, hasta: string} | null} [rangoSeleccionado] 'YYYY-MM-DD'
 * @param {(rango: {desde: string, hasta: string}) => void} [onCambiarRango]
 * @param {boolean} [mini] Versión chica (celdas bajas, sin leyenda) — para
 *   referencia rápida en un ladito, no como vista principal (ver el mini
 *   calendario de "días de la jornada" en AdminJornadas.jsx).
 */
export default function CalendarioEventos({
  eventos = [],
  onSeleccionar,
  modoSeleccion = false,
  rangoSeleccionado = null,
  onCambiarRango,
  mini = false,
}) {
  const [mesVisible, setMesVisible] = useState(() => {
    const hoy = new Date();
    return new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  });

  // Primer día clickeado de un rango nuevo, hasta que el segundo clic lo
  // cierra (ver comentario de arriba). Solo importa en modoSeleccion.
  const [anclaSeleccion, setAnclaSeleccion] = useState(null);
  const clickDia = (iso) => {
    if (!modoSeleccion) return;
    if (!anclaSeleccion) {
      setAnclaSeleccion(iso);
      onCambiarRango?.({ desde: iso, hasta: iso });
    } else {
      onCambiarRango?.(
        anclaSeleccion <= iso ? { desde: anclaSeleccion, hasta: iso } : { desde: iso, hasta: anclaSeleccion },
      );
      setAnclaSeleccion(null);
    }
  };

  const hoyISO = diaLocalISO(new Date());

  // eventoId -> rango de días 'YYYY-MM-DD' que ocupa (para no recalcular por celda).
  const eventosConRango = useMemo(
    () => eventos
      .filter(ev => ev.fecha && ev.fechaFin)
      .map(ev => ({ ...ev, desde: diaLocalISO(ev.fecha), hasta: diaLocalISO(ev.fechaFin) })),
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
      const iso = diaLocalISO(fecha);
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
    <div className={`qp-cal${mini ? ' qp-cal--mini' : ''}`}>
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
        {celdas.map(celda => {
          // Resaltar un rango no depende de modoSeleccion: sirve también para
          // mostrar de solo lectura (sin poder clickear) qué días ocupa algo
          // ya existente — ver el mini calendario de AdminJornadas.jsx.
          const enRango = !!rangoSeleccionado
            && celda.iso >= rangoSeleccionado.desde && celda.iso <= rangoSeleccionado.hasta;
          const claseCelda = `qp-cal__celda${celda.enMes ? '' : ' qp-cal__celda--afuera'}${celda.esHoy ? ' qp-cal__celda--hoy' : ''}${enRango ? ' qp-cal__celda--seleccionado' : ''}`;
          const contenido = (
            <>
              <span className="qp-cal__num">{celda.fecha.getDate()}</span>
              {celda.eventos.length > 0 && (
                <div className="qp-cal__eventos">
                  {celda.eventos.map(ev => modoSeleccion ? (
                    <span key={ev.id} className={`qp-cal__evento qp-cal__evento--inerte ${claseEstado(ev)}`} title={ev.nombre}>
                      {ev.nombre}
                    </span>
                  ) : (
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
            </>
          );
          // En modoSeleccion, el CUADRADO ENTERO es el botón (no solo el
          // número) — más fácil de acertar con el mouse o el dedo.
          return modoSeleccion ? (
            <button
              key={celda.iso}
              type="button"
              className={`${claseCelda} qp-cal__celda--clickable`}
              onClick={() => clickDia(celda.iso)}
            >
              {contenido}
            </button>
          ) : (
            <div key={celda.iso} className={claseCelda}>
              {contenido}
            </div>
          );
        })}
      </div>

      {!mini && (
        <div className="qp-cal__leyenda">
          <span><i className="qp-cal__punto ev-proximo" /> Próximo</span>
          <span><i className="qp-cal__punto ev-en-curso" /> En curso</span>
          <span><i className="qp-cal__punto ev-finalizado" /> Finalizado</span>
          <span><i className="qp-cal__punto ev-archivado" /> Archivado</span>
        </div>
      )}
    </div>
  );
}
