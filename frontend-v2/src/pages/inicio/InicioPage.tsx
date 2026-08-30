import { Link } from 'react-router-dom';
import { Button } from '@/shared/components/ui';
import { config } from '@/lib/config';
import { RUTAS } from '@/shared/constants/rutas';
import styles from './InicioPage.module.css';

export function InicioPage() {
  return (
    <div className={styles.pagina}>
      <header className={styles.header}>
        <span className={styles.marca}>
          <img src="/favicon.svg" alt="" />
          {config.appNombre}
        </span>
        <Link to={RUTAS.LOGIN}>
          <Button variante="secundario" tamano="sm">
            Iniciar sesión
          </Button>
        </Link>
      </header>

      <main className={styles.hero}>
        <h1 className={styles.titulo}>
          Control de acceso y billetera para tus eventos
        </h1>
        <p className={styles.sub}>
          Manillas con QR, recargas de saldo y ventas por puesto — todo en un
          solo lugar, en tiempo real.
        </p>
        <div className={styles.acciones}>
          <Link to={RUTAS.LOGIN}>
            <Button tamano="lg">Ingresar</Button>
          </Link>
          <Link to={RUTAS.REGISTRO}>
            <Button variante="secundario" tamano="lg">
              Crear cuenta
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
