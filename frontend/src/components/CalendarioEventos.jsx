import { useId, useMemo, useState } from 'react';
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

  // 'mes' (grilla de 7x6) o 'semana' (un día por fila, a todo el ancho: en la
  // grilla mensual el nombre del evento no entra y queda cortado). `diaVisible`
  // es cualquier día de la semana mostrada. `mini` siempre va en mes.
  const [vista, setVista] = useState('mes');
  const [diaVisible, setDiaVisible] = useState(() => new Date());
  const porSemana = vista === 'semana' && !mini;
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

  // Saltar a un mes/año concretos: con solo las flechas, llegar a una fecha
  // lejana costaba muchos clics. Los años ofrecidos cubren los de los eventos
  // cargados más una ventana alrededor del año actual.
  const idMes = useId();
  const idAnio = useId();
  const anios = useMemo(() => {
    const actual = new Date().getFullYear();
    const set = new Set([mesVisible.getFullYear()]);
    for (let a = actual - 2; a <= actual + 3; a++) set.add(a);
    for (const ev of eventos) {
      if (ev.fecha) set.add(new Date(ev.fecha).getFullYear());
      if (ev.fechaFin) set.add(new Date(ev.fechaFin).getFullYear());
    }
    return [...set].sort((a, b) => a - b);
  }, [eventos, mesVisible]);

  const irAMes = (mes) => {
    setMesVisible(m => new Date(m.getFullYear(), Number(mes), 1));
    // En vista semanal, cambiar el mes lleva a su primera semana.
    setDiaVisible(d => new Date(d.getFullYear(), Number(mes), 1));
  };
  const irAAnio = (anio) => {
    setMesVisible(m => new Date(Number(anio), m.getMonth(), 1));
    setDiaVisible(d => new Date(Number(anio), d.getMonth(), 1));
  };

  // Los 7 días (lunes a domingo) de la semana de `diaVisible`.
  const diasSemana = useMemo(() => {
    const base = new Date(diaVisible.getFullYear(), diaVisible.getMonth(), diaVisible.getDate());
    const lunes = new Date(base.getFullYear(), base.getMonth(), base.getDate() - ((base.getDay() + 6) % 7));
    return Array.from({ length: 7 }, (_, i) => {
      const fecha = new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() + i);
      const iso = diaLocalISO(fecha);
      return {
        fecha,
        iso,
        esHoy: iso === hoyISO,
        eventos: eventosConRango.filter(ev => iso >= ev.desde && iso <= ev.hasta),
      };
    });
  }, [diaVisible, eventosConRango, hoyISO]);

  const irAHoy = () => {
    const hoy = new Date();
    setMesVisible(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
    setDiaVisible(hoy);
  };
  // Las flechas mueven un mes o una semana, según la vista.
  const correrSemana = (dias) => setDiaVisible(d => {
    const sig = new Date(d.getFullYear(), d.getMonth(), d.getDate() + dias);
    setMesVisible(new Date(sig.getFullYear(), sig.getMonth(), 1));
    return sig;
  });
  const anterior = () => (porSemana
    ? correrSemana(-7)
    : setMesVisible(m => new Date(m.getFullYear(), m.getMonth() - 1, 1)));
  const siguiente = () => (porSemana
    ? correrSemana(7)
    : setMesVisible(m => new Date(m.getFullYear(), m.getMonth() + 1, 1)));

  return (
    <div className={`qp-cal${mini ? ' qp-cal--mini' : ''}`}>
      <div className="qp-cal__cabecera">
        <div className="qp-cal__titulo">
          <label className="sr-only" htmlFor={idMes}>Mes</label>
          <select
            id={idMes}
            className="qp-cal__select"
            value={mesVisible.getMonth()}
            onChange={(e) => irAMes(e.target.value)}
          >
            {MESES.map((nombre, i) => <option key={nombre} value={i}>{nombre}</option>)}
          </select>
          <label className="sr-only" htmlFor={idAnio}>Año</label>
          <select
            id={idAnio}
            className="qp-cal__select"
            value={mesVisible.getFullYear()}
            onChange={(e) => irAAnio(e.target.value)}
          >
            {anios.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div className="qp-cal__nav">
          {!mini && (
            <div className="qp-cal__vistas" role="group" aria-label="Cómo ver el calendario">
              <button
                type="button"
                className={vista === 'mes' ? 'is-on' : ''}
                aria-pressed={vista === 'mes'}
                onClick={() => setVista('mes')}
              >
                Mes
              </button>
              <button
                type="button"
                className={vista === 'semana' ? 'is-on' : ''}
                aria-pressed={vista === 'semana'}
                onClick={() => setVista('semana')}
              >
                Semana
              </button>
            </div>
          )}
          <button type="button" onClick={irAHoy} className="qp-cal__hoy">Hoy</button>
          <button type="button" onClick={anterior} aria-label={porSemana ? 'Semana anterior' : 'Mes anterior'}><FaChevronLeft aria-hidden="true" /></button>
          <button type="button" onClick={siguiente} aria-label={porSemana ? 'Semana siguiente' : 'Mes siguiente'}><FaChevronRight aria-hidden="true" /></button>
        </div>
      </div>

      {porSemana ? (
        <ul className="qp-cal__semana">
          {diasSemana.map(dia => (
            <li
              key={dia.iso}
              className={`qp-cal__dia${dia.esHoy ? ' qp-cal__dia--hoy' : ''}`}
            >
              <div className="qp-cal__dia-cab">
                {modoSeleccion ? (
                  <button type="button" className="qp-cal__dia-fecha" onClick={() => clickDia(dia.iso)}>
                    {DIAS_SEMANA[(dia.fecha.getDay() + 6) % 7]} {dia.fecha.getDate()}
                  </button>
                ) : (
                  <span className="qp-cal__dia-fecha">
                    {DIAS_SEMANA[(dia.fecha.getDay() + 6) % 7]} {dia.fecha.getDate()}
                  </span>
                )}
                <span className="qp-cal__dia-mes">{MESES[dia.fecha.getMonth()]}</span>
              </div>
              <div className="qp-cal__dia-eventos">
                {dia.eventos.length === 0 ? (
                  <span className="qp-cal__dia-vacio">Sin eventos</span>
                ) : dia.eventos.map(ev => (
                  onSeleccionar && !modoSeleccion ? (
                    <button
                      key={ev.id}
                      type="button"
                      className={`qp-cal__evento ${claseEstado(ev)}`}
                      onClick={() => onSeleccionar(ev.id)}
                    >
                      {ev.nombre}
                    </button>
                  ) : (
                    <span key={ev.id} className={`qp-cal__evento qp-cal__evento--inerte ${claseEstado(ev)}`}>
                      {ev.nombre}
                    </span>
                  )
                ))}
              </div>
            </li>
          ))}
        </ul>
      ) : (
      <>
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
      </>
      )}

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
