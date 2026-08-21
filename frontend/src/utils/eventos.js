import api from '../api/index.js';

// Evento vence cuando fechaFin ya pasó.
export const esVigente = (evento) => new Date(evento.fechaFin) >= new Date();

// evento.fecha ahora es un DateTime real (no un string ya formateado), así que hay que
// formatearlo para mostrarlo en la UI.
export const formatearFecha = (fechaISO, conHora = true) => {
  if (!fechaISO) return '';
  const fecha = new Date(fechaISO);
  const opciones = conHora
    ? { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: 'short', year: 'numeric' };
  return fecha.toLocaleString('es-BO', opciones);
};

// El catálogo de Evento no trae precio (vive en CategoriaTicket, varias por evento);
// esto añade `precioDesde` (la más barata) a cada evento para las cards del carrusel.
export const conPrecioDesde = async (eventosLista) => {
  const conPrecio = await Promise.all(eventosLista.map(async (evento) => {
    const categorias = await api.categoriasTicket.listar(evento.id);
    const precios = categorias.map(c => Number(c.precio));
    return { ...evento, precioDesde: precios.length ? Math.min(...precios) : null };
  }));
  return conPrecio;
};
