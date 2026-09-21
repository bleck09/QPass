import './EncabezadoPagina.css';

/*
  Encabezado único de pantalla (PLAN_REDISENO.txt §2.2):

    <EncabezadoPagina
      titulo="Mis entradas"
      subtitulo="Tus entradas, tu manilla y tus solicitudes."
      icono={FaTicketAlt}
      acciones={<Boton ...>Nueva</Boton>}     // a la derecha (abajo en móvil)
    >
      <Pestanas ... />                         // opcional: fila de abajo
    </EncabezadoPagina>

  Es el único <h1> de la pantalla. El título se re-monta al cambiar
  (key) y entra con un fundido corto, así el cambio de pestaña se nota.
*/
export default function EncabezadoPagina({ titulo, subtitulo, icono: Icono, acciones, children, className = '' }) {
  return (
    <header className={`qp-encabezado ${className}`.trim()}>
      <div className="qp-encabezado-fila">
        <div key={titulo} className="qp-encabezado-txt">
          <h1>
            {Icono && <span className="qp-encabezado-ic" aria-hidden="true"><Icono /></span>}
            {titulo}
          </h1>
          {subtitulo && <p>{subtitulo}</p>}
        </div>
        {acciones && <div className="qp-encabezado-acciones">{acciones}</div>}
      </div>
      {children && <div className="qp-encabezado-extra">{children}</div>}
    </header>
  );
}
