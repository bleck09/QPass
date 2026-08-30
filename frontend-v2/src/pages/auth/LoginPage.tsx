import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { DevCredenciales, LoginForm, useSesion } from '@/features/auth';
import { RUTA_INICIO_POR_ROL } from '@/shared/constants/rutas';
import { AuthLayout } from './AuthLayout';

export function LoginPage() {
  const { estaAutenticado, usuario } = useSesion();
  const navigate = useNavigate();
  const location = useLocation();
  const aviso = (location.state as { aviso?: string } | null)?.aviso;

  // Redirige cuando la sesión YA está commiteada en el contexto (efecto, no
  // en el render): así los guards de la ruta destino ven estaAutenticado=true.
  useEffect(() => {
    if (estaAutenticado && usuario) {
      const destino = RUTA_INICIO_POR_ROL[usuario.rol] ?? '/';
      navigate(destino, { replace: true });
    }
  }, [estaAutenticado, usuario, navigate]);

  return (
    <AuthLayout
      titulo="Iniciar Sesión"
      subtitulo="Ingrese sus credenciales para acceder al portal de QPass."
      extra={<DevCredenciales />}
    >
      {aviso && (
        <p
          style={{
            color: '#86efac',
            background: 'rgba(34,197,94,0.1)',
            border: '1px solid rgba(34,197,94,0.2)',
            padding: 10,
            borderRadius: 8,
            fontSize: 13,
            marginBottom: 16,
          }}
        >
          {aviso}
        </p>
      )}
      <LoginForm />
    </AuthLayout>
  );
}
