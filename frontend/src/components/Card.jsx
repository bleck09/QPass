import './Card.css';

/*
  Caja de contenido REUTILIZABLE — la "surface" genérica del Manual 8.5 / Anexo A:
  fondo + borde + radio + sombra suave, mismos bordes y padding de una a otra.
  Reemplaza los ~8 paneles `pi-x-card` que estaban copiados con otro nombre
  (pi-admin-card, pi-unegocio-card, pi-dashboard-card, pi-mapa-card, …).

  Para código NUEVO. Los `pi-x-card` que ya existen quedan con su clase pero su
  CSS ahora apunta a los mismos tokens que esto (S-D3), así que se ven igual.

  No es "todo es una card": los KPI tiles van en <StatCard>, los modales en
  <Modal>, y las filas de lista / paneles glass conservan su propio look.

  Uso:
    <Card>…</Card>
    <Card variante="raised" className="algo">…</Card>   // elevada (dropdown/popover)
    <Card padding={false}>…</Card>                       // sin padding interno (tablas)

  Props:
    variante   'surface'(def) | 'raised'   sombra plana vs elevada.
    padding    bool = true                  padding interno estándar.
    as         'div'(def) | 'section' | …   etiqueta a renderizar.
    className  string
*/
export default function Card({
  variante = 'surface',
  padding = true,
  as: Tag = 'div',
  className = '',
  children,
  ...rest
}) {
  return (
    <Tag
      className={
        `qp-card qp-card--${variante}` +
        (padding ? ' qp-card--pad' : '') +
        (className ? ` ${className}` : '')
      }
      {...rest}
    >
      {children}
    </Tag>
  );
}
