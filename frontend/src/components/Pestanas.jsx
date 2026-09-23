import { useLayoutEffect, useRef } from 'react';
import './Pestanas.css';

/*
  Pestañas únicas de la app (PLAN_REDISENO.txt §2.2). Reemplaza las ~13
  implementaciones propias (pi-usr-tabs, pi-ges-tabs, pi-rec-tabs...).

    <Pestanas
      items={[{ id: 'eventos', etiqueta: 'Eventos', icono: FaCalendarAlt, contador: 3 }]}
      activo={pestana}
      onCambio={(id) => ...}
      variante="segmento"   // 'segmento' (píldora) | 'linea' (subrayado)
      navegacion            // true: cada una lleva a otra ruta (aria-current);
                            // false: pestañas de contenido (role="tab")
      etiqueta="Secciones del panel"
    />

  - Indicador que se desliza bajo la activa (se mide el botón activo y se
    escriben su posición y ancho como variables CSS).
  - Flechas ← → (y Inicio/Fin) mueven el foco entre pestañas.
  - En pantallas angostas hacen scroll horizontal y la activa queda visible.
  - item.contador: número chico al lado (null/0 = no se muestra).
  - item.deshabilitado: se ve pero no se puede elegir.
  - item.soloIcono: muestra solo el ícono (la etiqueta queda para lectores
    de pantalla y como tooltip).
  - idBase: da ids a las pestañas (`${idBase}-tab-${id}`) y las enlaza con
    su panel (`${idBase}-panel-${id}`), para usar role="tabpanel" +
    aria-labelledby en el contenido.
*/
export default function Pestanas({
  items,
  activo,
  onCambio,
  variante = 'segmento',
  navegacion = false,
  etiqueta,
  anchoCompleto = false,
  idBase,
  className = '',
}) {
  const contenedorRef = useRef(null);
  const botonesRef = useRef({});

  // Posiciona el indicador bajo la pestaña activa (y lo re-ubica si cambia
  // el tamaño, p. ej. al rotar el celular o cambiar un contador).
  useLayoutEffect(() => {
    const contenedor = contenedorRef.current;
    if (!contenedor) return;
    const ubicar = () => {
      const btn = botonesRef.current[activo];
      if (!btn) { contenedor.style.setProperty('--ind-ancho', '0px'); return; }
      contenedor.style.setProperty('--ind-x', `${btn.offsetLeft}px`);
      contenedor.style.setProperty('--ind-ancho', `${btn.offsetWidth}px`);
      // Que la activa quede a la vista si las pestañas hacen scroll.
      const { scrollLeft, clientWidth } = contenedor;
      if (btn.offsetLeft < scrollLeft || btn.offsetLeft + btn.offsetWidth > scrollLeft + clientWidth) {
        contenedor.scrollTo({ left: btn.offsetLeft - 16, behavior: 'smooth' });
      }
    };
    ubicar();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(ubicar) : null;
    ro?.observe(contenedor);
    return () => ro?.disconnect();
  }, [activo, items]);

  const habilitados = items.filter((it) => !it.deshabilitado);

  const teclado = (e) => {
    const i = habilitados.findIndex((it) => it.id === document.activeElement?.dataset.pestana);
    if (i === -1) return;
    const destino = {
      ArrowRight: habilitados[(i + 1) % habilitados.length],
      ArrowLeft: habilitados[(i - 1 + habilitados.length) % habilitados.length],
      Home: habilitados[0],
      End: habilitados[habilitados.length - 1],
    }[e.key];
    if (!destino) return;
    e.preventDefault();
    botonesRef.current[destino.id]?.focus();
    // En pestañas de contenido la selección sigue al foco (patrón ARIA).
    if (!navegacion) onCambio(destino.id);
  };

  return (
    <div
      ref={contenedorRef}
      className={`qp-pestanas qp-pestanas--${variante}${anchoCompleto ? ' qp-pestanas--ancho' : ''} ${className}`.trim()}
      role={navegacion ? undefined : 'tablist'}
      aria-label={etiqueta}
      onKeyDown={teclado}
    >
      <span className="qp-pestanas-indicador" aria-hidden="true" />
      {items.map(({ id, etiqueta: texto, icono: Icono, contador, deshabilitado, soloIcono }) => {
        const esActiva = id === activo;
        return (
          <button
            key={id}
            ref={(n) => { botonesRef.current[id] = n; }}
            type="button"
            data-pestana={id}
            id={idBase ? `${idBase}-tab-${id}` : undefined}
            aria-controls={idBase && !navegacion ? `${idBase}-panel-${id}` : undefined}
            className={`qp-pestana${esActiva ? ' activa' : ''}${soloIcono ? ' qp-pestana--icono' : ''}`}
            title={soloIcono ? texto : undefined}
            role={navegacion ? undefined : 'tab'}
            aria-selected={navegacion ? undefined : esActiva}
            aria-current={navegacion && esActiva ? 'page' : undefined}
            tabIndex={navegacion || esActiva ? 0 : -1}
            disabled={deshabilitado}
            onClick={() => onCambio(id)}
          >
            {Icono && <Icono className="qp-pestana-ic" aria-hidden="true" />}
            <span className={soloIcono ? 'sr-only' : undefined}>{texto}</span>
            {contador != null && contador !== 0 && (
              <span key={contador} className="qp-pestana-contador">{contador}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
