/* ============================================================================
 * AdminUsuariosPage — lista de cuentas + alta de cuentas operativas.
 * ========================================================================= */

import { useState } from 'react';
import {
  Button,
  ConfirmarModal,
  EncabezadoPagina,
  Modal,
  Select,
} from '@/shared/components/ui';
import { EstadoCargando, EstadoError, EstadoVacio } from '@/shared/components/feedback';
import { useTituloPagina } from '@/shared/hooks/useTituloPagina';
import { ROL_LABEL, TODOS_LOS_ROLES, type Rol } from '@/shared/constants/roles';
import {
  CrearUsuarioForm,
  UsuarioTabla,
  useCrearUsuario,
  useEliminarUsuario,
  useUsuarios,
  type Usuario,
} from '@/features/usuarios';
import styles from './AdminUsuariosPage.module.css';

export function AdminUsuariosPage() {
  useTituloPagina('Usuarios');

  const [filtroRol, setFiltroRol] = useState<Rol | ''>('');
  const { data: usuarios, isPending, isError, refetch } = useUsuarios(
    filtroRol || undefined,
  );
  const [crearAbierto, setCrearAbierto] = useState(false);
  const [aEliminar, setAEliminar] = useState<Usuario | null>(null);

  const crear = useCrearUsuario();
  const eliminar = useEliminarUsuario();

  const cerrarCrear = () => {
    setCrearAbierto(false);
    crear.reset();
  };

  return (
    <>
      <EncabezadoPagina
        descripcion="Cuentas del sistema. Puedes dar de alta cuentas operativas (Recargador, Supervisor, Devolución, Negocio); la contraseña la defines tú y se la comunicas a la persona."
        accion={<Button onClick={() => setCrearAbierto(true)}>Crear cuenta</Button>}
      />

      <div className={styles.filtros}>
        <Select
          label="Filtrar por rol"
          value={filtroRol}
          onChange={(e) => setFiltroRol(e.target.value as Rol | '')}
        >
          <option value="">Todos los roles</option>
          {TODOS_LOS_ROLES.map((r) => (
            <option key={r} value={r}>
              {ROL_LABEL[r]}
            </option>
          ))}
        </Select>
      </div>

      {isPending && <EstadoCargando filas={6} />}
      {isError && (
        <EstadoError mensaje="No pudimos cargar los usuarios." onReintentar={refetch} />
      )}
      {usuarios && usuarios.length === 0 && (
        <EstadoVacio
          titulo="Sin resultados"
          descripcion="No hay cuentas con ese filtro."
        />
      )}
      {usuarios && usuarios.length > 0 && (
        <UsuarioTabla usuarios={usuarios} onEliminar={setAEliminar} />
      )}

      <Modal
        abierto={crearAbierto}
        onCerrar={cerrarCrear}
        titulo="Crear cuenta"
        acciones={null}
        bloquearCierreFuera
      >
        <CrearUsuarioForm
          cargando={crear.isPending}
          errorApi={crear.error?.mensaje}
          onCancelar={cerrarCrear}
          onGuardar={(dto) => crear.mutate(dto, { onSuccess: cerrarCrear })}
        />
      </Modal>

      <ConfirmarModal
        abierto={aEliminar !== null}
        titulo="Eliminar cuenta"
        textoConfirmar="Eliminar"
        destructivo
        cargando={eliminar.isPending}
        onCancelar={() => setAEliminar(null)}
        onConfirmar={() =>
          aEliminar &&
          eliminar.mutate(aEliminar.id, { onSuccess: () => setAEliminar(null) })
        }
      >
        Se eliminará la cuenta de <strong>{aEliminar?.nombre}</strong> ({aEliminar?.email}).
        Esta acción no se puede deshacer.
      </ConfirmarModal>
    </>
  );
}
