import { RecuperarForm } from '@/features/auth';
import { AuthLayout } from './AuthLayout';

export function RecuperarPage() {
  return (
    <AuthLayout
      titulo="Recuperar contraseña"
      subtitulo="Te enviaremos un código para restablecerla."
    >
      <RecuperarForm />
    </AuthLayout>
  );
}
