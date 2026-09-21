import './Insignia.css';

/*
  Insignia (badge) única de la app — PLAN_REDISENO.txt §2.2. Reemplaza las
  ~54 combinaciones de clases de badge propias de cada pantalla.

    <Insignia tono="ok" icono={FaCheckCircle}>Aprobada</Insignia>
    <Insignia tono="warn" punto>En revisión</Insignia>

  tono:  'ok' (verde) · 'warn' (ámbar) · 'danger' (rojo) · 'info' (cian)
         · 'marca' (índigo) · 'neutro' (gris)
  punto: puntito de color delante (estados "vivos": en curso, pendiente).
  latido: el punto late (algo está pasando ahora).
  solida: fondo lleno (para ponerla sobre fotos).
*/
export default function Insignia({
  tono = 'neutro',
  icono: Icono = null,
  punto = false,
  latido = false,
  solida = false,
  className = '',
  children,
  ...resto
}) {
  const clases = [
    'qp-insignia',
    `qp-insignia--${tono}`,
    solida && 'qp-insignia--solida',
    className,
  ].filter(Boolean).join(' ');

  return (
    <span className={clases} {...resto}>
      {punto && <span className={`qp-insignia-punto${latido ? ' late' : ''}`} aria-hidden="true" />}
      {Icono && <Icono className="qp-insignia-ic" aria-hidden="true" />}
      {children}
    </span>
  );
}
