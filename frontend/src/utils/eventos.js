import api from '../api/index.js';

// Evento vence cuando fechaFin ya pasó.
export const esVigente = (evento) => new Date(evento.fechaFin) >= new Date();

// Evento.imagen es opcional — Admin puede crear un evento sin subir ninguna. Sin esto, cualquier
// <img>/backgroundImage con evento.imagen vacío se ve rota/en blanco.
export const IMAGEN_EVENTO_PLACEHOLDER = 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
export const imagenEvento = (evento) => evento?.imagen || IMAGEN_EVENTO_PLACEHOLDER;

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
