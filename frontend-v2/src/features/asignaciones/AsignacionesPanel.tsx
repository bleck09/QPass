/* ============================================================================
 * AsignacionesPanel — personal del evento: asignar un usuario a un rol dentro
 * del evento y quitar asignaciones.
 * ========================================================================= */

import { useMemo, useState } from 'react';
import {
  Badge,
  Button,
  ConfirmarModal,
  Select,
  Table,
  Td,
  Th,
} from '@/shared/components/ui';
import { EstadoCargando, EstadoError, EstadoVacio } from '@/shared/components/feedback';
import { ROL_LABEL, TODOS_LOS_ROLES, type Rol } from '@/shared/constants/roles';
import { useUsuarios } from '@/features/usuarios';
import {
  useAsignaciones,
  useAsignar,
  useQuitarAsignacion,
  type Asignacion,
} from './asignaciones';
import styles from './AsignacionesPanel.module.css';

export function AsignacionesPanel({ eventoId }: { eventoId: string }) {
  const { data, isPending, isError, refetch } = useAsignaciones(eventoId);
  const usuarios = useUsuarios();
  const asignar = useAsignar(eventoId);
  const quitar = useQuitarAsignacion(eventoId);

  const [usuarioId, setUsuarioId] = useState('');
  const [rol, setRol] = useState<Rol>('Recargador');
  const [aQuitar, setAQuitar] = useState<Asignacion | null>(null);

  const opcionesUsuario = useMemo(
    () =>
      (usuarios.data ?? []).map((u) => ({
        id: u.id,
        etiqueta: `${u.nombre} · ${u.email}`,
      })),
    [usuarios.data],
  );

  const onAsignar = () => {
    if (!usuarioId) return;
    asignar.mutate(
      { eventoId, usuarioId: Number(usuarioId), rol },
      { onSuccess: () => setUsuarioId('') },
    );
  };

  return (
    <div className={styles.panel}>
      <div className={styles.form}>
        <Select
          label="Usuario"
          value={usuarioId}
          onChange={(e) => setUsuarioId(e.target.value)}
        >
          <option value="">Selecciona…</option>
          {opcionesUsuario.map((o) => (
            <option key={o.id} value={o.id}>
              {o.etiqueta}
            </option>
          ))}
        </Select>
        <Select
          label="Rol en el evento"
          value={rol}
          onChange={(e) => setRol(e.target.value as Rol)}
        >
          {TODOS_LOS_ROLES.map((r) => (
            <option key={r} value={r}>
              {ROL_LABEL[r]}
            </option>
          ))}
        </Select>
        <Button onClick={onAsignar} cargando={asignar.isPending} disabled={!usuarioId}>
          Asignar
        </Button>
      </div>

      {isPending && <EstadoCargando filas={3} />}
      {isError && <EstadoError onReintentar={refetch} />}
      {data && data.length === 0 && (
        <EstadoVacio
          titulo="Sin personal asignado"
          descripcion="Asigna recargadores, supervisores y demás roles a este evento."
        />
      )}
      {data && data.length > 0 && (
        <Table>
          <thead>
            <tr>
              <Th>Usuario</Th>
              <Th>Rol</Th>
              <Th>
                <span className="sr-only">Acciones</span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {data.map((a) => (
              <tr key={a.id}>
                <Td>
                  {a.usuario?.nombre}
                  <span className={styles.email}> · {a.usuario?.email}</span>
                </Td>
                <Td>
                  <Badge tono="marca">{ROL_LABEL[a.rol]}</Badge>
                </Td>
                <Td numerico>
                  <Button
                    variante="terciario"
                    tamano="sm"
                    onClick={() => setAQuitar(a)}
                  >
                    Quitar
                  </Button>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <ConfirmarModal
        abierto={aQuitar !== null}
        titulo="Quitar asignación"
        textoConfirmar="Quitar"
        destructivo
        cargando={quitar.isPending}
        onCancelar={() => setAQuitar(null)}
        onConfirmar={() =>
          aQuitar && quitar.mutate(aQuitar.id, { onSuccess: () => setAQuitar(null) })
        }
      >
        {aQuitar?.usuario?.nombre} dejará de tener el rol{' '}
        {aQuitar ? ROL_LABEL[aQuitar.rol] : ''} en este evento.
      </ConfirmarModal>
    </div>
  );
}
