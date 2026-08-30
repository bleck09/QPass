/* ============================================================================
 * PaginaPrincipalPage (/) — landing corporativa de QPass. Port fiel del
 * frontend original (glassmorphism + carrusel 3D), en TS y con la capa de
 * datos por hooks.
 * ========================================================================= */

import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaArrowRight,
  FaBolt,
  FaChartPie,
  FaMapMarkerAlt,
  FaMobileAlt,
  FaQrcode,
  FaSignInAlt,
} from 'react-icons/fa';
import { RUTAS } from '@/shared/constants/rutas';
import { formatearFecha } from '@/shared/utils/formatearFecha';
import {
  CarruselEventos,
  esVigente,
  useEventos,
  type Evento,
} from '@/features/eventos';
import styles from './PaginaPrincipalPage.module.css';

export function PaginaPrincipalPage() {
  const navigate = useNavigate();
  const { data: eventos } = useEventos();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const { proximos, pasados } = useMemo(() => {
    const todos = eventos ?? [];
    return {
      proximos: todos.filter(esVigente),
      pasados: todos.filter((e) => !esVigente(e)),
    };
  }, [eventos]);

  const verEvento = (evento: Evento) =>
    navigate(RUTAS.LANDING_EVENTO(evento.id));

  return (
    <div className={styles.container}>
      <div className={styles.bgImage} />
      <div className={`${styles.glow} ${styles.glow1}`} />
      <div className={`${styles.glow} ${styles.glow2}`} />

      <nav className={`${styles.navbar} ${styles.glass}`}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}>
            <FaQrcode />
          </div>
          <span>QPass</span>
        </div>
        <ul className={styles.navLinks}>
          <li>
            <a href="#servicios">Características</a>
          </li>
          <li>
            <a href="#cartelera">Cartelera</a>
          </li>
          <li>
            <a href="#pasados">Eventos Pasados</a>
          </li>
        </ul>
        <div>
          <button className={styles.btnSolid} onClick={() => navigate(RUTAS.LOGIN)}>
            <FaSignInAlt /> Iniciar Sesión
          </button>
        </div>
      </nav>

      <header className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={`${styles.badge} ${styles.glass}`}>
            La nueva era de los eventos en Bolivia
          </div>
          <h1>Revolucionamos la forma en que vives los eventos</h1>
          <p>
            Olvídate de las filas eternas. Con QPass, tu celular y una manilla QR
            es todo lo que necesitas para acceder y comprar al instante.
          </p>
          <div>
            <a href="#cartelera" className={`${styles.btnSolid} ${styles.btnLarge}`}>
              Ver Cartelera <FaArrowRight />
            </a>
          </div>
        </div>
      </header>

      <section id="cartelera" className={styles.section}>
        <div className={`${styles.sectionHeader} ${styles.center}`}>
          <h2>Próximos Eventos</h2>
          <p>
            Explora y asegura tu acceso a las mejores experiencias. (Pasa el mouse
            o desliza)
          </p>
        </div>

        {proximos.length > 0 ? (
          <CarruselEventos eventos={proximos} onAdquirir={verEvento} />
        ) : (
          <p className={styles.vacio}>Pronto anunciaremos nuevos eventos.</p>
        )}
      </section>

      <section id="servicios" className={styles.section}>
        <div className={styles.featureGrid}>
          <div className={`${styles.featureMain} ${styles.glass}`}>
            <h2>
              El Ecosistema <br />
              Perfecto
            </h2>
            <p>
              Conectamos a organizadores y asistentes a través de tecnología de
              punta. Desde la validación en puerta hasta la compra de una bebida,
              todo en milisegundos.
            </p>

            <div className={styles.featureStats}>
              <div className={styles.statItem}>
                <strong>10K+</strong>
                <span>Entradas vendidas</span>
              </div>
              <div className={styles.statUsers}>
                <img src="https://i.pravatar.cc/100?img=1" alt="" />
                <img src="https://i.pravatar.cc/100?img=2" alt="" />
                <img src="https://i.pravatar.cc/100?img=3" alt="" />
                <div className={styles.moreUsers}>
                  <FaArrowRight />
                </div>
              </div>
            </div>
          </div>

          <div className={styles.sideCards}>
            {[
              { icono: <FaMobileAlt />, h: 'Manillas Inteligentes', p: 'Tu dinero y entrada en un QR seguro.' },
              { icono: <FaBolt />, h: 'Cero Filas', p: 'Compras ultrarrápidas en puntos de venta.' },
              { icono: <FaChartPie />, h: 'Auditoría Real', p: 'Métricas exactas para el organizador.' },
            ].map((c) => (
              <div key={c.h} className={`${styles.sideCard} ${styles.glass}`}>
                <div className={styles.iconCircle}>{c.icono}</div>
                <h4>{c.h}</h4>
                <p>{c.p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {pasados.length > 0 && (
        <section id="pasados" className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>Eventos Pasados</h2>
            <p>El éxito de nuestros aliados es nuestro éxito.</p>
          </div>

          <div className={styles.pastGrid}>
            {pasados.map((evento) => (
              <div key={evento.id} className={`${styles.pastCard} ${styles.glass}`}>
                <img
                  src={evento.imagen ?? undefined}
                  alt=""
                  loading="lazy"
                  width={100}
                  height={100}
                />
                <div className={styles.pastInfo}>
                  <h4>{evento.nombre}</h4>
                  <span>
                    <FaMapMarkerAlt /> {evento.lugar} · {formatearFecha(evento.fecha)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <footer className={`${styles.footer} ${styles.glass}`}>
        <div className={styles.footerContent}>
          <div>
            <div className={styles.logo}>
              <div className={styles.logoIcon}>
                <FaQrcode />
              </div>
              <span>QPass</span>
            </div>
            <p className={styles.footerTag}>
              La tecnología definitiva para eventos Cashless.
            </p>
          </div>
          <p className={styles.copyright}>
            © {new Date().getFullYear()} QPass Technologies.
          </p>
        </div>
      </footer>
    </div>
  );
}
