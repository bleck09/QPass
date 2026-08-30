import { Link } from 'react-router-dom';
import { Button } from '@/shared/components/ui';
import { RUTAS } from '@/shared/constants/rutas';

export function NotFoundPage() {
  return (
    <div
      style={{
        display: 'grid',
        placeItems: 'center',
        minHeight: '100dvh',
        padding: 'var(--space-6)',
        textAlign: 'center',
      }}
    >
      <div>
        <p
          style={{
            fontSize: 'var(--text-3xl)',
            fontWeight: 700,
            color: 'var(--color-action-texto)',
          }}
        >
          404
        </p>
        <h1 style={{ fontSize: 'var(--text-xl)', margin: 'var(--space-2) 0' }}>
          No encontramos esta página
        </h1>
        <p style={{ color: 'var(--color-text-secundario)', marginBottom: 'var(--space-6)' }}>
          Puede que el enlace esté roto o que la página se haya movido.
        </p>
        <Link to={RUTAS.INICIO}>
          <Button>Ir al inicio</Button>
        </Link>
      </div>
    </div>
  );
}
