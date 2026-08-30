/* ============================================================================
 * LandingEventoPage (/evento/:id) — página pública del evento, con los colores
 * definidos por el organizador. No usa el layout de la app.
 * ========================================================================= */

import { Link, useParams } from 'react-router-dom';
import { Spinner } from '@/shared/components/ui';
import { formatearFechaHora } from '@/shared/utils/formatearFecha';
import { formatearMoneda } from '@/shared/utils/formatearMoneda';
import { RUTAS } from '@/shared/constants/rutas';
import { ContadorRegresivo, useEvento } from '@/features/eventos';
import { useCategoriasTicket } from '@/features/categorias-ticket';
import { useLandingConfig } from '@/features/landing-config';
import { usePuestos, MapaRecintoPublico } from '@/features/puestos';
import styles from './LandingEventoPage.module.css';

export function LandingEventoPage() {
  const { id = '' } = useParams();
  const evento = useEvento(id);
  const landing = useLandingConfig(id);
  const categorias = useCategoriasTicket(id);
  const puestos = usePuestos(id);

  if (evento.isPending || landing.isPending) {
    return (
      <div className={styles.centro}>
        <Spinner tamano={32} />
      </div>
    );
  }

  if (evento.isError || !evento.data) {
    return (
      <div className={styles.centro}>
        <p>No encontramos este evento.</p>
        <Link to={RUTAS.INICIO}>Ir al inicio</Link>
      </div>
    );
  }

  const l = landing.data;
  const ev = evento.data;
  const cats = categorias.data ?? [];
  const puestosActivos = (puestos.data ?? []).filter((p) => p.estadoActivo);
  // Sin campo "destacado" en el backend: se recomienda la del medio si hay 3+.
  const idxRecomendado = cats.length >= 3 ? 1 : -1;
  const fecha = new Date(ev.fecha);

  const estilo = {
    '--l-fondo': l?.colorFondo ?? '#0b1120',
    '--l-primario': l?.colorPrimario ?? '#0f7d8c',
    '--l-boton': l?.colorBoton ?? '#0f7d8c',
    '--l-titulo': l?.colorTextoTitulo ?? '#ffffff',
    '--l-parrafo': l?.colorTextoP ?? '#c9d3dd',
  } as React.CSSProperties;

  return (
    <div className={styles.pagina} style={estilo}>
      <nav className={styles.navbar}>
        <Link to={RUTAS.INICIO} className={styles.marca}>
          QPass
        </Link>
        <ul className={styles.navLinks}>
          {cats.length > 0 && (
            <li>
              <a href="#entradas">Entradas</a>
            </li>
          )}
          {l?.actividades && l.actividades.length > 0 && (
            <li>
              <a href="#actividades">Actividades</a>
            </li>
          )}
          {puestosActivos.length > 0 && (
            <li>
              <a href="#mapa">Mapa</a>
            </li>
          )}
          {l?.cronograma && l.cronograma.length > 0 && (
            <li>
              <a href="#cronograma">Cronograma</a>
            </li>
          )}
        </ul>
        <Link to={RUTAS.LOGIN} className={styles.navCta}>
          Iniciar sesión
        </Link>
      </nav>

      <header
        className={styles.hero}
        style={
          l?.imagen
            ? {
                backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,.45), rgba(0,0,0,.75)), url(${l.imagen})`,
              }
            : undefined
        }
      >
        <div className={styles.heroContenido}>
          <h1 className={styles.titulo}>{l?.titulo ?? ev.nombre}</h1>
          <p className={styles.lugar}>
            {ev.lugar} · {formatearFechaHora(ev.fecha)}
          </p>
          <Link to={RUTAS.LOGIN} className={styles.cta}>
            Iniciar sesión para comprar
          </Link>
        </div>
      </header>

      <main className={styles.main}>
        {l?.informacion && <p className={styles.info}>{l.informacion}</p>}

        <section className={styles.seccion}>
          <div className={styles.fechaGigante}>
            <span className={styles.fechaNum}>{fecha.getDate()}</span>
            <span className={styles.fechaMes}>
              {fecha.toLocaleDateString('es-BO', { month: 'long' })}
            </span>
          </div>
          <div className={styles.contadorWrap}>
            <ContadorRegresivo fecha={ev.fecha} />
          </div>
        </section>

        {cats.length > 0 && (
          <section id="entradas" className={styles.seccion}>
            <h2>Entradas</h2>
            <ul className={styles.tickets}>
              {cats.map((c, i) => (
                <li key={c.id}>
                  <span>
                    <strong>{c.nombre}</strong>
                    {i === idxRecomendado && (
                      <span className={styles.recomendado}>Recomendada</span>
                    )}
                    {c.descripcion && <span> — {c.descripcion}</span>}
                  </span>
                  <span className={styles.precio}>{formatearMoneda(c.precio)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {l?.actividades && l.actividades.length > 0 && (
          <section id="actividades" className={styles.seccion}>
            <h2>Actividades</h2>
            <div className={styles.actividades}>
              {l.actividades.map((a, i) => (
                <div key={i} className={styles.actividad}>
                  {a.icono && <span className={styles.icono}>{a.icono}</span>}
                  <h3>{a.titulo}</h3>
                  <p>{a.descripcion}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {puestosActivos.length > 0 && (
          <section id="mapa" className={styles.seccion}>
            <h2>Mapa del recinto</h2>
            <p className={styles.info}>
              Toca un puesto para ver sus productos y precios.
            </p>
            <MapaRecintoPublico puestos={puestosActivos} />
          </section>
        )}

        {l?.cronograma && l.cronograma.length > 0 && (
          <section id="cronograma" className={styles.seccion}>
            <h2>Cronograma</h2>
            <ul className={styles.cronograma}>
              {l.cronograma.map((c, i) => (
                <li key={i}>
                  <span className={styles.hora}>{c.hora}</span>
                  <span>{c.actividad}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>

      <footer className={styles.footer}>
        <Link to={RUTAS.INICIO}>QPass</Link>
        <span>© {new Date().getFullYear()}</span>
      </footer>
    </div>
  );
}
