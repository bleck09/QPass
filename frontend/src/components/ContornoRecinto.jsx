import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';
import './ContornoRecinto.css';

// Mismo problema (y mismo fix) que MapaSelector.jsx: el ícono POR DEFECTO de
// Leaflet no resuelve bien con bundlers. A diferencia de "arreglar el default
// global" (poco confiable acá), se arma un ícono explícito y se lo pasa a
// cada marcador — es lo que ya funciona en MapaSelector.jsx.
const ICONO_UBICACION = L.icon({
  iconUrl, iconRetinaUrl, shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const CENTRO_DEFECTO = [-17.3895, -66.1568]; // Cochabamba, igual que MapaSelector

// Los vértices del contorno son manijas de edición, no "lugares" — un punto
// chico en vez del pin de Leaflet (que además no resuelve bien con bundlers,
// ver el comentario del mismo problema en MapaSelector.jsx).
const iconoVertice = L.divIcon({
  className: 'pi-contorno-vertice',
  iconSize: [16, 16],
});

/**
 * Editor del contorno del recinto sobre un mapa real (Leaflet + OpenStreetMap),
 * calcado del setup de MapaSelector.jsx. `value` es un array controlado
 * [[lat,lng], ...]:
 *  - Clickear el mapa agrega un vértice al final.
 *  - Arrastrar un vértice lo mueve.
 *  - El popup de cada vértice permite borrarlo (mínimo 3 — si no, el
 *    contorno no es un polígono válido).
 * `onChange` se dispara con el array ya actualizado en cada edición; quien
 * use este componente decide cuándo persistirlo (botón "Guardar contorno").
 */
export default function ContornoRecinto({ centro, value, onChange }) {
  const contenedorRef = useRef(null);
  const mapaRef = useRef(null);
  const capaRef = useRef(null); // LayerGroup con el polígono/polilínea + vértices
  const marcadorCentroRef = useRef(null); // pin fijo: dónde está el evento (referencia, no editable acá)
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  useEffect(() => { valueRef.current = value; });
  useEffect(() => { onChangeRef.current = onChange; });

  // Monta el mapa una sola vez.
  useEffect(() => {
    if (mapaRef.current || !contenedorRef.current) return;
    const mapa = L.map(contenedorRef.current, { scrollWheelZoom: true })
      .setView(centro || CENTRO_DEFECTO, 17);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
      crossOrigin: true,
    }).addTo(mapa);

    capaRef.current = L.layerGroup().addTo(mapa);

    // Pin fijo de referencia: acá está el evento (Evento.latitud/longitud) —
    // sin esto, un mapa recién abierto (sin contorno todavía) no tiene NADA
    // marcado y no hay forma de saber dónde hay que empezar a dibujar.
    if (centro) {
      marcadorCentroRef.current = L.marker(centro, { icon: ICONO_UBICACION })
        .addTo(mapa)
        .bindPopup('Ubicación del evento');
    }

    mapa.on('click', (e) => {
      const actual = valueRef.current || [];
      onChangeRef.current([...actual, [e.latlng.lat, e.latlng.lng]]);
    });

    mapaRef.current = mapa;

    // Mismo problema que MapaSelector: el contenedor puede no tener tamaño
    // real todavía (pestaña recién activada) y los tiles quedan a medias.
    const recalcular = () => mapaRef.current?.invalidateSize({ animate: false });
    mapa.whenReady(recalcular);
    requestAnimationFrame(() => requestAnimationFrame(recalcular));
    const timers = [80, 250, 600, 1200].map((t) => setTimeout(recalcular, t));
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(recalcular) : null;
    if (ro && contenedorRef.current) ro.observe(contenedorRef.current);
    window.addEventListener('resize', recalcular);

    return () => {
      timers.forEach(clearTimeout);
      ro?.disconnect();
      window.removeEventListener('resize', recalcular);
      mapa.remove();
      mapaRef.current = null;
      capaRef.current = null;
      marcadorCentroRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Si la ubicación del evento llega después del montaje (carga async), pone
  // (o mueve) el pin de referencia. Además, si todavía no hay contorno
  // dibujado, centra el mapa ahí — si ya hay vértices, no le pisa la vista al
  // usuario que está editando.
  useEffect(() => {
    if (!mapaRef.current || !centro) return;
    if (marcadorCentroRef.current) {
      marcadorCentroRef.current.setLatLng(centro);
    } else {
      marcadorCentroRef.current = L.marker(centro, { icon: ICONO_UBICACION })
        .addTo(mapaRef.current)
        .bindPopup('Ubicación del evento');
    }
    if (!value || value.length === 0) {
      mapaRef.current.setView(centro, 17);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centro]);

  // Redibuja polígono + vértices cada vez que cambia `value` (incluye lo que
  // este mismo componente disparó, y un "Descartar cambios" externo).
  useEffect(() => {
    const capa = capaRef.current;
    if (!capa) return;
    capa.clearLayers();
    const puntos = value || [];

    if (puntos.length >= 2) {
      const Forma = puntos.length >= 3 ? L.polygon : L.polyline;
      Forma(puntos, { color: '#00B4D8', weight: 3, fillOpacity: 0.15 }).addTo(capa);
    }

    puntos.forEach((punto, indice) => {
      const marcador = L.marker(punto, { draggable: true, icon: iconoVertice }).addTo(capa);
      marcador.on('dragend', () => {
        const actual = [...(valueRef.current || [])];
        actual[indice] = [marcador.getLatLng().lat, marcador.getLatLng().lng];
        onChangeRef.current(actual);
      });
      marcador.bindPopup(
        puntos.length > 3
          ? '<button type="button" data-quitar-vertice="1">Eliminar vértice</button>'
          : 'Mínimo 3 vértices',
      );
      marcador.on('popupopen', (ev) => {
        const boton = ev.popup.getElement()?.querySelector('[data-quitar-vertice]');
        boton?.addEventListener('click', () => {
          onChangeRef.current((valueRef.current || []).filter((_, i) => i !== indice));
          marcador.closePopup();
        });
      });
    });
  }, [value]);

  return <div ref={contenedorRef} className="pi-contorno-mapa" />;
}
