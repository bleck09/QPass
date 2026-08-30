import { Navigate, useLocation } from 'react-router-dom';
import { LoginForm, useSesion } from '@/features/auth';
import { Alert } from '@/shared/components/ui';
import { RUTA_INICIO_POR_ROL } from '@/shared/constants/rutas';
import { AuthLayout } from './AuthLayout';

export function LoginPage() {
  const { estaAutenticado, usuario } = useSesion();
  const location = useLocation();
  const aviso = (location.state as { aviso?: string } | null)?.aviso;

  if (estaAutenticado && usuario) {
    return <Navigate to={RUTA_INICIO_POR_ROL[usuario.rol]} replace />;
  }

  return (
    <AuthLayout titulo="Iniciar sesión" subtitulo="Ingresa a tu cuenta de QPass.">
      {aviso && (
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <Alert tipo="exito">{aviso}</Alert>
        </div>
      )}
      <LoginForm />
    </AuthLayout>
  );
}
