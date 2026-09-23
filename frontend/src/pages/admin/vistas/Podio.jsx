/*
  Podio de los 3 primeros (recargadores, devoluciones, negocios) del panel de
  Admin. Estaba dentro de Admin.jsx; se saca acá para que lo compartan las
  vistas ya separadas.
*/
export default function Podio({ lista, valorKey, unidad }) {
  // Coral y cian son fondos muy saturados: el texto blanco no alcanza 4.5:1 ahí,
  // así que solo el puesto sobre índigo (oscuro) usa texto blanco; los otros dos usan azul noche.
  const estilos = [
    { fondo: 'var(--coral-compra)', texto: 'var(--texto-sobre-vivo)' },
    { fondo: 'var(--indigo-profundo)', texto: 'var(--texto-sobre-oscuro)' },
    { fondo: 'var(--cian-digital)', texto: 'var(--texto-sobre-vivo)' },
  ];
  return (
    <div className="pi-dash-podio">
      {lista.slice(0, 3).map((item, index) => (
        <div className="pi-dash-podio-item" key={item.id ?? item.nombre}>
          <div
            className="pi-dash-podio-puesto"
            style={{ backgroundColor: estilos[index].fondo, color: estilos[index].texto }}
          >
            {index + 1}
          </div>
          <span className="pi-dash-podio-nombre">{item.nombre}</span>
          <span className="pi-dash-podio-valor">{item[valorKey]} {unidad}</span>
        </div>
      ))}
    </div>
  );
}
