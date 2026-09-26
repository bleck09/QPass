import { useEffect, useState } from 'react';
import { FONDOS_LANDING } from '../../constants/imagenesLanding.js';
import { useSeccionActiva } from '../../utils/useSeccionActiva.js';
import './FondoLanding.css';

// Secciones que cambian el fondo. La cartelera comparte el del hero; el pie
// no se observa, así que hereda el de Contacto (la última sección).
const SECCIONES = ['cartelera', 'servicios', 'asistentes', 'organizadores', 'pasados', 'contacto'];
const CAPA_DE = { cartelera: 'inicio' };

// Una capa por fondo DISTINTO: si dos secciones usan la misma foto, es la
// misma capa y no hay fundido entre ellas.
const CAPAS = [...new Set(Object.values(FONDOS_LANDING))];

// Espera antes de cambiar de fondo: al scrollear rápido se cruzan varias
// secciones y cada una disparaba su fundido, y el fondo parpadeaba.
const ESPERA_CAMBIO_MS = 250;

/**
 * Fondo fijo de la landing que cambia con un fundido según la sección que se
 * está leyendo. Antes era una sola foto para toda la página.
 *
 * Las fotos se piden recién la primera vez que su sección se activa: así la
 * carga inicial no baja cuatro imágenes a pantalla completa de golpe.
 *
 * `version`: igual que en useSeccionActiva (la cartelera cambia de nodo al
 * terminar de cargar).
 */
export default function FondoLanding({ version }) {
  const seccion = useSeccionActiva(SECCIONES, version);
  const [activa, setActiva] = useState(seccion);
  useEffect(() => {
    const t = setTimeout(() => setActiva(seccion), ESPERA_CAMBIO_MS);
    return () => clearTimeout(t);
  }, [seccion]);
  const clave = CAPA_DE[activa] ?? activa ?? 'inicio';
  const fondoActivo = clave in FONDOS_LANDING ? FONDOS_LANDING[clave] : FONDOS_LANDING.inicio;

  // Fondos que ya se mostraron alguna vez (se ajusta durante el render, el
  // patrón de React para derivar estado; no hace falta un efecto).
  const [vistos, setVistos] = useState(() => new Set([FONDOS_LANDING.inicio]));
  if (!vistos.has(fondoActivo)) setVistos(new Set(vistos).add(fondoActivo));

  return (
    <div className="qp-fondo" aria-hidden="true">
      {CAPAS.map((foto) => {
        const activo = foto === fondoActivo;
        if (foto === null) {
          return (
            <div key="aurora" className={`qp-fondo__capa qp-fondo__aurora${activo ? ' es-activa' : ''}`}>
              <span /><span /><span />
            </div>
          );
        }
        return (
          <div
            key={foto}
            className={`qp-fondo__capa qp-fondo__foto${activo ? ' es-activa' : ''}`}
            style={vistos.has(foto) ? { backgroundImage: `url(${foto})` } : undefined}
          />
        );
      })}
    </div>
  );
}
