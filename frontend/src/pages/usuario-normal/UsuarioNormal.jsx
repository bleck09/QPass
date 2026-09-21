import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaTicketAlt, FaWallet, FaCalendarAlt, FaShoppingCart, FaArrowLeft } from 'react-icons/fa';
import EncabezadoPagina from '../../components/EncabezadoPagina.jsx';
import Pestanas from '../../components/Pestanas.jsx';
import Boton from '../../components/Boton.jsx';
import { useTituloPagina } from '../../utils/tituloPagina.js';
import { leerSesion } from '../../api/client.js';
import { useDatosUsuario } from './useDatosUsuario.js';
import EventosTab from './EventosTab.jsx';
import CompraTab from './CompraTab.jsx';
import MisEntradasTab from './MisEntradasTab.jsx';
import SaldoTab from './SaldoTab.jsx';
import './UsuarioNormal.css';

const PESTANAS = ['eventos', 'comprar', 'misentradas', 'saldo'];

const RUTA = {
  eventos: '/usuarionormal/eventos',
  misentradas: '/usuarionormal',
  saldo: '/usuarionormal/saldo',
};

// Título, bajada e ícono de cada pestaña (EncabezadoPagina).
const ENCABEZADO = {
  eventos: { titulo: 'Elegí tu evento', subtitulo: 'Mirá la cartelera y comprá tus entradas en pocos pasos.', icono: FaCalendarAlt },
  comprar: { titulo: 'Comprar entradas', subtitulo: 'Elegí categorías, completá los datos y pagá con QR.', icono: FaShoppingCart },
  misentradas: { titulo: 'Mis entradas', subtitulo: 'Tu manilla, tus compras y las entradas que te regalaron.', icono: FaTicketAlt },
  saldo: { titulo: 'Mi saldo', subtitulo: 'Tu saldo por evento, tus movimientos y tus manillas.', icono: FaWallet },
};

/**
 * Panel del Usuario Normal: encabezado + pestañas. Cada pestaña vive en su
 * propio archivo; los datos compartidos salen de useDatosUsuario.
 *
 * Cada pestaña se monta la primera vez que se visita y después solo se
 * OCULTA al cambiar de pestaña (no se desmonta): así conserva su estado
 * (carrito, búsquedas, filtros), igual que cuando todo vivía en un solo
 * componente. `display: contents` hace que el envoltorio no altere el diseño.
 */
export default function UsuarioNormal() {
  useTituloPagina('Mi panel');
  const [usuario] = useState(() => leerSesion() || { nombre: 'Invitado', email: '' });

  const location = useLocation();
  const navigate = useNavigate();
  const pestana = location.pathname.endsWith('/eventos')
    ? 'eventos'
    : location.pathname.endsWith('/comprar')
    ? 'comprar'
    : location.pathname.endsWith('/saldo')
    ? 'saldo'
    : 'misentradas';

  const datos = useDatosUsuario(usuario);
  const comprasPendientes = datos.compras.filter((c) => c.estado === 'pendiente').length;

  // Pestañas ya visitadas (ajuste de estado durante el render, sin efecto).
  const [visitadas, setVisitadas] = useState(() => new Set([pestana]));
  if (!visitadas.has(pestana)) setVisitadas(new Set(visitadas).add(pestana));

  const contenido = {
    eventos: () => (
      <EventosTab
        proximosEventos={datos.proximosEventos}
        eventosPasados={datos.eventosPasados}
        cargandoEventos={datos.cargandoEventos}
        errorEventos={datos.errorEventos}
        recargarEventos={datos.recargarEventos}
        saldoPorEvento={datos.saldoPorEvento}
      />
    ),
    comprar: () => (
      <CompraTab
        usuario={usuario}
        proximosEventos={datos.proximosEventos}
        comprasConEvento={datos.comprasConEvento}
        entradasANombreMio={datos.entradasANombreMio}
        recargarCompras={datos.recargarCompras}
      />
    ),
    misentradas: () => (
      <MisEntradasTab
        usuario={usuario}
        proximosEventos={datos.proximosEventos}
        comprasConEvento={datos.comprasConEvento}
        entradasANombreMio={datos.entradasANombreMio}
        recargarCompras={datos.recargarCompras}
      />
    ),
    saldo: () => (
      <SaldoTab
        billeteras={datos.billeteras}
        historial={datos.historial}
        qrPorEvento={datos.qrPorEvento}
      />
    ),
  };

  return (
    <div className="pi-usr-container">

      <EncabezadoPagina
        titulo={ENCABEZADO[pestana].titulo}
        subtitulo={ENCABEZADO[pestana].subtitulo}
        icono={ENCABEZADO[pestana].icono}
        acciones={pestana === 'comprar' && (
          <Boton variante="secundario" icono={FaArrowLeft} onClick={() => navigate('/usuarionormal/eventos')}>
            Elegir otro evento
          </Boton>
        )}
      >
        <Pestanas
          navegacion
          etiqueta="Secciones de mi panel"
          activo={pestana}
          onCambio={(id) => navigate(RUTA[id])}
          items={[
            { id: 'eventos', etiqueta: 'Eventos', icono: FaCalendarAlt },
            // Contador: solicitudes que todavía están en revisión.
            { id: 'misentradas', etiqueta: 'Mis entradas', icono: FaTicketAlt, contador: comprasPendientes },
            { id: 'saldo', etiqueta: 'Mi saldo', icono: FaWallet },
          ]}
        />
      </EncabezadoPagina>

      {PESTANAS.filter((id) => visitadas.has(id)).map((id) => (
        <div key={id} style={{ display: pestana === id ? 'contents' : 'none' }}>
          {contenido[id]()}
        </div>
      ))}
    </div>
  );
}
