import './StatCard.css';

/*
  Tile de KPI / estadística REUTILIZABLE — ícono + número grande + etiqueta.
  Reemplaza los ~15 "stat card" / "kpi card" que estaban copiados con otro nombre
  en cada página (pi-sup-stat-card, pi-entrega-stat-card, pi-dash-stat-card,
  pi-adtick-kpi-card, pi-rec-historial-stat, …). El Manual 8.5 / Anexo A tratan
  el tile de dato como un ROL propio: mismos bordes, baseline y padding entre uno
  y otro. NO es capa de datos: es presentación pura.

  Uso:
    <StatCard icon={<FaUsers />} tono="total" valor={stats.total} label="Total participantes" />
    <StatCard valor={historial.length} label="Recargas realizadas" />           // sin ícono
    <StatCard icon={<FaCheckCircle />} tono="ok" valor={stats.adentro}
              label="Personas adentro" extra={<span className="qp-stat__pct">{pct}%</span>} />
    <StatCard icon={<FaTicketAlt />} valor={n} label="Entradas" onClick={abrir} />  // clickable -> <button>

  Props:
    icon    nodo         ícono opcional (se envuelve y se le da color por `tono`).
    tono    string        'neutral'(def) | 'total' | 'ok' | 'warn' | 'danger' | 'info'.
    valor   nodo          el número / dato grande.
    label   nodo          la etiqueta corta debajo.
    extra   nodo          nodo opcional alineado a la derecha (badge de %, etc.).
    onClick fn            si se pasa, el tile se renderiza como <button>.
    className string       clase extra para casos puntuales.
*/
export default function StatCard({
  icon,
  tono = 'neutral',
  valor,
  label,
  extra,
  nota,
  onClick,
  className = '',
}) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`qp-stat${onClick ? ' qp-stat--click' : ''}${className ? ` ${className}` : ''}`}
    >
      {icon != null && (
        <span className={`qp-stat__icon qp-stat__icon--${tono}`} aria-hidden="true">
          {icon}
        </span>
      )}
      <span className="qp-stat__body">
        <span className="qp-stat__valor">{valor}</span>
        <span className="qp-stat__label">{label}</span>
        {nota != null && <span className="qp-stat__nota">{nota}</span>}
      </span>
      {extra != null && <span className="qp-stat__extra">{extra}</span>}
    </Tag>
  );
}
