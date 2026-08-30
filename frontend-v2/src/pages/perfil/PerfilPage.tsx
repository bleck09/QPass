/* ============================================================================
 * PerfilPage — datos personales + seguridad del usuario en sesión.
 * ========================================================================= */

import { Card, CardHeader } from '@/shared/components/ui';
import { EstadoCargando, EstadoError } from '@/shared/components/feedback';
import { useTituloPagina } from '@/shared/hooks/useTituloPagina';
import { formatearFechaHora } from '@/shared/utils/formatearFecha';
import { useSesion } from '@/features/auth';
import {
  CambiarPasswordForm,
  PerfilForm,
  useActualizarPerfil,
  useCambiarPassword,
  useHistorialPassword,
  useUsuario,
} from '@/features/usuarios';
import styles from './PerfilPage.module.css';

export function PerfilPage() {
  useTituloPagina('Mi perfil');
  const { usuario: sesion, actualizarUsuario } = useSesion();
  const id = sesion?.id;

  const { data: usuario, isPending, isError, refetch } = useUsuario(id);
  const historial = useHistorialPassword(id);
  const actualizar = useActualizarPerfil(id ?? 0);
  const cambiarPassword = useCambiarPassword(id ?? 0);

  if (isPending) return <EstadoCargando filas={4} />;
  if (isError || !usuario)
    return <EstadoError mensaje="No pudimos cargar tu perfil." onReintentar={refetch} />;

  return (
    <div className={styles.columnas}>
      <Card>
        <CardHeader>
          <h2 className={styles.titulo}>Datos personales</h2>
        </CardHeader>
        <PerfilForm
          usuario={usuario}
          cargando={actualizar.isPending}
          errorApi={actualizar.error?.mensaje}
          onGuardar={(dto) =>
            actualizar.mutate(dto, {
              onSuccess: (u) =>
                actualizarUsuario({ foto: u.foto, nombre: u.nombre }),
            })
          }
        />
      </Card>

      <Card>
        <CardHeader>
          <h2 className={styles.titulo}>Seguridad</h2>
        </CardHeader>
        <CambiarPasswordForm
          cargando={cambiarPassword.isPending}
          errorApi={cambiarPassword.error?.mensaje}
          exito={cambiarPassword.isSuccess}
          onGuardar={(dto) => cambiarPassword.mutate(dto)}
        />

        {historial.data && historial.data.length > 0 && (
          <div className={styles.historial}>
            <h3 className={styles.subtitulo}>Cambios recientes</h3>
            <ul className={styles.lista}>
              {historial.data.slice(0, 5).map((c) => (
                <li key={c.id}>
                  <span>{formatearFechaHora(c.createdAt)}</span>
                  <span className={styles.origen}>
                    {c.origen === 'self' ? 'Cambio normal' : 'Por código de recuperación'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>
    </div>
  );
}
