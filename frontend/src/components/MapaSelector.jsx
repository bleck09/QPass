import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';
import { FaSearch, FaLocationArrow, FaTimes } from 'react-icons/fa';
import './MapaSelector.css';

// Los íconos por defecto de Leaflet no resuelven bien con bundlers: se fijan a mano.
L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl });

// Centro por defecto si todavía no hay coordenadas (Cochabamba, Bolivia).
const CENTRO_DEFECTO = [-17.3895, -66.1568];

const parsear = (texto) => {
  if (!texto) return null;
  const m = String(texto).match(/(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)/);
  if (!m) return null;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return [lat, lng];
};

const formatear = ([lat, lng]) => `${lat.toFixed(6)}, ${lng.toFixed(6)}`;

// Selector de punto en un mapa (Leaflet + OpenStreetMap). `value` es "lat, lng"
// (texto) y `onChange` devuelve ese mismo formato.
export default function MapaSelector({ value, onChange }) {
  const contenedorRef = useRef(null);
  const mapaRef = useRef(null);
  const marcadorRef = useRef(null);
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; });

  const [busqueda, setBusqueda] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [errorBusqueda, setErrorBusqueda] = useState('');

  const punto = parsear(value);

  // Monta el mapa una sola vez.
  useEffect(() => {
    if (mapaRef.current || !contenedorRef.current) return;
    const inicial = parsear(value) || CENTRO_DEFECTO;
    // scrollWheelZoom off: dentro de un modal con scroll, la rueda mueve el
    // formulario, no el zoom. Quedan los botones +/- y el doble clic.
    const mapa = L.map(contenedorRef.current, { scrollWheelZoom: false })
      .setView(inicial, parsear(value) ? 15 : 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(mapa);

    if (parsear(value)) {
      marcadorRef.current = L.marker(inicial, { draggable: true }).addTo(mapa);
      marcadorRef.current.on('dragend', () => {
        const { lat, lng } = marcadorRef.current.getLatLng();
        onChangeRef.current(formatear([lat, lng]));
      });
    }

    mapa.on('click', (e) => {
      const latlng = [e.latlng.lat, e.latlng.lng];
      if (marcadorRef.current) {
        marcadorRef.current.setLatLng(latlng);
      } else {
        marcadorRef.current = L.marker(latlng, { draggable: true }).addTo(mapa);
        marcadorRef.current.on('dragend', () => {
          const { lat, lng } = marcadorRef.current.getLatLng();
          onChangeRef.current(formatear([lat, lng]));
        });
      }
      onChangeRef.current(formatear(latlng));
    });

    mapaRef.current = mapa;

    // El contenedor está dentro de un modal recién abierto: hasta que no tiene
    // tamaño real, los tiles se dibujan mal. Recalculamos varias veces y ante
    // cualquier cambio de tamaño del contenedor.
    const recalcular = () => mapa.invalidateSize();
    requestAnimationFrame(recalcular);
    const timers = [80, 250, 600].map((t) => setTimeout(recalcular, t));
    const ro = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(recalcular)
      : null;
    if (ro && contenedorRef.current) ro.observe(contenedorRef.current);

    return () => {
      timers.forEach(clearTimeout);
      ro?.disconnect();
      mapa.remove();
      mapaRef.current = null;
      marcadorRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Si `value` cambia desde afuera (ej. al abrir el modal en modo editar).
  useEffect(() => {
    const mapa = mapaRef.current;
    const p = parsear(value);
    if (!mapa || !p) return;
    if (marcadorRef.current) {
      marcadorRef.current.setLatLng(p);
    } else {
      marcadorRef.current = L.marker(p, { draggable: true }).addTo(mapa);
      marcadorRef.current.on('dragend', () => {
        const { lat, lng } = marcadorRef.current.getLatLng();
        onChangeRef.current(formatear([lat, lng]));
      });
    }
  }, [value]);

  const colocar = (lat, lng, zoom = 16) => {
    const mapa = mapaRef.current;
    if (!mapa) return;
    mapa.setView([lat, lng], zoom);
    if (marcadorRef.current) marcadorRef.current.setLatLng([lat, lng]);
    else {
      marcadorRef.current = L.marker([lat, lng], { draggable: true }).addTo(mapa);
      marcadorRef.current.on('dragend', () => {
        const { lat: a, lng: b } = marcadorRef.current.getLatLng();
        onChangeRef.current(formatear([a, b]));
      });
    }
    onChangeRef.current(formatear([lat, lng]));
  };

  const buscar = async (e) => {
    e.preventDefault();
    const q = busqueda.trim();
    if (!q) return;
    setBuscando(true);
    setErrorBusqueda('');
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`,
        { headers: { Accept: 'application/json' } },
      );
      const datos = await res.json();
      if (!datos.length) {
        setErrorBusqueda('No se encontró ese lugar.');
        return;
      }
      colocar(Number(datos[0].lat), Number(datos[0].lon));
    } catch {
      setErrorBusqueda('No se pudo buscar (sin conexión?).');
    } finally {
      setBuscando(false);
    }
  };

  const usarMiUbicacion = () => {
    if (!navigator.geolocation) return;
    setErrorBusqueda('');
    navigator.geolocation.getCurrentPosition(
      (pos) => colocar(pos.coords.latitude, pos.coords.longitude, 17),
      () => setErrorBusqueda('No se pudo obtener tu ubicación.'),
    );
  };

  const limpiar = () => {
    if (marcadorRef.current && mapaRef.current) {
      mapaRef.current.removeLayer(marcadorRef.current);
      marcadorRef.current = null;
    }
    onChangeRef.current('');
  };

  return (
    <div className="pi-mapasel">
      <div className="pi-mapasel-controles">
        <form className="pi-mapasel-buscar" onSubmit={buscar}>
          <FaSearch aria-hidden="true" />
          <input
            type="text"
            placeholder="Buscar dirección o lugar…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            aria-label="Buscar lugar en el mapa"
          />
          <button type="submit" disabled={buscando}>{buscando ? '…' : 'Buscar'}</button>
        </form>
        <button type="button" className="pi-mapasel-gps" onClick={usarMiUbicacion} title="Usar mi ubicación actual">
          <FaLocationArrow aria-hidden="true" /> Mi ubicación
        </button>
      </div>

      <div ref={contenedorRef} className="pi-mapasel-mapa" />

      <div className="pi-mapasel-pie">
        <span className="pi-mapasel-coords">
          {punto ? formatear(punto) : 'Hacé clic en el mapa para marcar el lugar'}
        </span>
        {punto && (
          <button type="button" className="pi-mapasel-limpiar" onClick={limpiar}>
            <FaTimes aria-hidden="true" /> Quitar
          </button>
        )}
      </div>
      {errorBusqueda && <p className="pi-mapasel-error">{errorBusqueda}</p>}
    </div>
  );
}
