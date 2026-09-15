import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';
import './MapaUbicacion.css';

// Mismo fix que MapaSelector.jsx: sin esto el ícono por defecto de Leaflet
// queda 404 con el bundler.
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl });

/**
 * Mapa de solo lectura para la landing pública del evento: un pin fijo en
 * `lat`/`lng`, sin click ni arrastre de marcador (a diferencia de
 * MapaSelector, acá no se elige nada). Deja pan/zoom para que el asistente
 * pueda ubicarse.
 */
export default function MapaUbicacion({ lat, lng }) {
  const contenedorRef = useRef(null);
  const mapaRef = useRef(null);

  useEffect(() => {
    if (mapaRef.current || !contenedorRef.current || lat == null || lng == null) return;
    const mapa = L.map(contenedorRef.current, { scrollWheelZoom: false }).setView([lat, lng], 15);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
      crossOrigin: true,
    }).addTo(mapa);
    L.marker([lat, lng]).addTo(mapa);
    mapaRef.current = mapa;

    // invalidateSize recalcula el TAMAÑO, pero si el contenedor crecio
    // despues de inicializar el mapa el centro queda corrido y el pin
    // aparece abajo. Mientras la caja se asienta se vuelve a fijar la vista
    // en el punto; despues solo se recalcula, para no pelear con el usuario
    // si ya movio el mapa a mano.
    let asentado = false;
    const recalcular = () => {
      const m = mapaRef.current;
      if (!m) return;
      m.invalidateSize({ animate: false });
      if (!asentado) m.setView([lat, lng], m.getZoom(), { animate: false });
    };
    mapa.whenReady(recalcular);
    requestAnimationFrame(() => requestAnimationFrame(recalcular));
    const timers = [80, 250, 600, 1200].map((t) => setTimeout(recalcular, t));
    timers.push(setTimeout(() => { asentado = true; }, 1300));
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(recalcular) : null;
    if (ro && contenedorRef.current) ro.observe(contenedorRef.current);
    window.addEventListener('resize', recalcular);

    return () => {
      timers.forEach(clearTimeout);
      ro?.disconnect();
      window.removeEventListener('resize', recalcular);
      mapa.remove();
      mapaRef.current = null;
    };
  }, [lat, lng]);

  return <div ref={contenedorRef} className="pi-mapaubi" />;
}
