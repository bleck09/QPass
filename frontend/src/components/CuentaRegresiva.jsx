import { FaHourglassHalf, FaGlassCheers } from 'react-icons/fa';
import { useCuentaRegresiva } from '../utils/useCuentaRegresiva.js';
import './CuentaRegresiva.css';

/*
  Cuenta regresiva visual ÚNICA (PLAN_REDISENO.txt §2.10). Antes había 5
  versiones propias (cartelera, página del evento, compra, mis entradas,
  entrada flotante); el cálculo ya era compartido (useCuentaRegresiva), este
  es el componente de pantalla.

    <CuentaRegresiva fecha={evento.fecha} variante="oscura" titulo="Faltan" />

  variante:  'clara'  (sobre fondos claros, por defecto)
             'oscura' (sobre fotos o fondos oscuros)
  segundos:  mostrar el bloque de segundos (por defecto sí).
  titulo:    texto chico arriba ("Faltan"); null = sin título.
  llegada:   texto cuando llega a cero; null = no se muestra nada.
  Cada número "cae" al cambiar (keyframe compartido qp-digito).
*/
export default function CuentaRegresiva({
  fecha,
  variante = 'clara',
  segundos = true,
  titulo = 'Faltan',
  llegada = '¡Hoy es el evento!',
  className = '',
}) {
  const c = useCuentaRegresiva(fecha);
  if (!c) return null;

  const clases = `qp-cuenta qp-cuenta--${variante} ${className}`.trim();

  if (c.terminada) {
    return llegada ? (
      <div className={`${clases} qp-cuenta--llego`} role="status">
        <FaGlassCheers className="qp-cuenta-llego-ic" aria-hidden="true" />
        <span>{llegada}</span>
      </div>
    ) : null;
  }

  const bloques = [[c.dias, 'días'], [c.horas, 'hs'], [c.minutos, 'min']];
  if (segundos) bloques.push([c.segundos, 'seg']);

  return (
    <div className={clases} role="timer" aria-label={`Faltan ${c.dias} días, ${c.horas} horas y ${c.minutos} minutos`}>
      {titulo && (
        <span className="qp-cuenta-tit" aria-hidden="true"><FaHourglassHalf /> {titulo}</span>
      )}
      <div className="qp-cuenta-bloques" aria-hidden="true">
        {bloques.map(([v, u]) => (
          <span key={u} className="qp-cuenta-bloque">
            <b key={v}>{u === 'días' ? v : String(v).padStart(2, '0')}</b>
            <em>{u}</em>
          </span>
        ))}
      </div>
    </div>
  );
}
