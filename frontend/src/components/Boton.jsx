/*
  Botón único de la app (PLAN_REDISENO.txt §2.3). Los estilos viven en
  styles/buttons.css (global), compartidos con las clases .btn-primario /
  .btn-cancelar / .btn-secundario-sm que ya usaban otras pantallas.

    <Boton variante="primario" icono={FaSave} cargando={guardando} onClick={...}>
      Guardar cambios
    </Boton>

  variante: 'primario' (índigo, la acción principal — una por vista)
            'secundario' (borde)  ·  'fantasma' (sin borde, terciaria)
            'peligro' (rojo, destruir)  ·  'peligro-suave' (fila de tabla)
            'compra' (coral, pagar/comprar)
            'exito' (verde, aprobar / confirmar dinero)
            'acento' (cian de marca, CTA de la landing pública)
            'translucido' (vidrio sobre fotos / bandas oscuras; su color
            sale de --btn-tinte)
  tamano:   'sm' (tablas) · 'md' (por defecto) · 'lg' (CTA de pantalla)
  cargando: muestra un spinner y deshabilita (evita el doble envío); el
            texto se mantiene para que el botón no cambie de ancho.
  anchoCompleto: ocupa todo el ancho disponible.
  pildora:  bordes totalmente redondeados (páginas públicas).
  como:     'button' (defecto), 'a' o un componente como Link de
            react-router: mismo aspecto para un enlace (pasar href / to).
  Cualquier otra prop (type, aria-*, title, form, href, to...) pasa al
  elemento.
*/
export default function Boton({
  variante = 'primario',
  tamano = 'md',
  icono: Icono = null,
  iconoDerecha: IconoDerecha = null,
  cargando = false,
  anchoCompleto = false,
  pildora = false,
  como: Elemento = 'button',
  disabled = false,
  type = 'button',
  className = '',
  children,
  ...resto
}) {
  const clases = [
    'qp-btn',
    `qp-btn--${variante}`,
    `qp-btn--${tamano}`,
    anchoCompleto && 'qp-btn--ancho',
    pildora && 'qp-btn--pildora',
    cargando && 'qp-btn--cargando',
    !children && 'qp-btn--solo-icono',
    className,
  ].filter(Boolean).join(' ');

  const inactivo = disabled || cargando;
  // Un enlace no tiene "disabled": se marca con aria-disabled y sale del tab.
  const propsElemento = Elemento === 'button'
    ? { type, disabled: inactivo }
    : { 'aria-disabled': inactivo || undefined, tabIndex: inactivo ? -1 : undefined };

  return (
    <Elemento
      className={clases}
      aria-busy={cargando || undefined}
      {...propsElemento}
      {...resto}
    >
      {cargando
        ? <span className="qp-btn-spinner" aria-hidden="true" />
        : Icono && <Icono className="qp-btn-ic" aria-hidden="true" />}
      {children && <span className="qp-btn-txt">{children}</span>}
      {IconoDerecha && !cargando && <IconoDerecha className="qp-btn-ic qp-btn-ic--der" aria-hidden="true" />}
    </Elemento>
  );
}
