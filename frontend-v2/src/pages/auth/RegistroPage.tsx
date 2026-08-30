import { RegistroForm } from '@/features/auth';
import { AuthLayout } from './AuthLayout';

export function RegistroPage() {
  return (
    <AuthLayout
      titulo="Crear cuenta"
      subtitulo="Regístrate para comprar entradas y usar tu billetera en los eventos."
      ancho
    >
      <RegistroForm />
    </AuthLayout>
  );
}
