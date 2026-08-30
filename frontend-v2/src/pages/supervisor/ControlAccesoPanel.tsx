/* Supervisor: elige su evento asignado, escanea la manilla, registra
 * ingreso/salida (foto obligatoria si la entrada aún no tiene una) y consulta
 * el padrón de asistentes del evento. */

import { useState } from 'react';
import { Alert, Button, CapturarFoto } from '@/shared/components/ui';
import { EstadoVacio } from '@/shared/components/feedback';
import { ROLES } from '@/shared/constants/roles';
import { useSesion } from '@/features/auth';
import { SelectorEventoAsignado } from '@/features/eventos';
import {
  EscanerEntrada,
  PadronAsistentes,
  TarjetaEntrada,
  useRegistrarMovimiento,
  type Entrada,
} from '@/features/entradas';
import styles from './ControlAccesoPanel.module.css';

export function ControlAccesoPanel() {
  const { usuario } = useSesion();
  const [eventoId, setEventoId] = useState('');
  const [entrada, setEntrada] = useState<Entrada | null>(null);
  const [foto, setFoto] = useState<string | null>(null);
  const movimiento = useRegistrarMovimiento();

  const otroEvento = entrada != null && eventoId !== '' && entrada.eventoId !== eventoId;
  const necesitaFoto = entrada != null && !entrada.foto;
  const puedeIngresar = entrada?.estadoIngreso !== 'ingresado';
  const puedeSalir = entrada?.estadoIngreso === 'ingresado';

  const registrar = (tipo: 'ingreso' | 'salida') => {
    if (!entrada || otroEvento) return;
    movimiento.mutate(
      { id: entrada.id, tipo, foto: foto ?? undefined },
      {
        onSuccess: (actualizada) => {
          setEntrada(actualizada);
          setFoto(null);
        },
      },
    );
  };

  return (
    <div className={styles.contenedor}>
      <div className={styles.selector}>
        <SelectorEventoAsignado
          usuarioId={usuario?.id}
          rol={ROLES.SUPERVISOR}
          value={eventoId}
          onChange={setEventoId}
        />
      </div>

      {!eventoId ? (
        <EstadoVacio
          titulo="Elige un evento asignado"
          descripcion="Solo puedes controlar el acceso de los eventos donde el administrador te asignó."
        />
      ) : (
        <>
          <div className={styles.panel}>
            <EscanerEntrada
              onEncontrada={(e) => {
                setEntrada(e);
                setFoto(null);
                movimiento.reset();
              }}
            />

            {entrada && (
              <TarjetaEntrada entrada={entrada}>
                {otroEvento && (
                  <Alert tipo="aviso">
                    Esta manilla es de otro evento. No puedes registrar
                    movimientos aquí.
                  </Alert>
                )}
                {movimiento.isError && (
                  <Alert tipo="error">{movimiento.error.mensaje}</Alert>
                )}
                {movimiento.isSuccess && (
                  <Alert tipo="exito">
                    {movimiento.data.estadoIngreso === 'ingresado'
                      ? 'Ingreso registrado.'
                      : 'Salida registrada.'}
                  </Alert>
                )}

                {!otroEvento && necesitaFoto && (
                  <CapturarFoto
                    label="Foto de seguridad (obligatoria)"
                    valor={foto}
                    onChange={setFoto}
                    hint="Esta entrada todavía no tiene foto registrada."
                  />
                )}

                {!otroEvento && (
                  <div className={styles.botones}>
                    <Button
                      onClick={() => registrar('ingreso')}
                      cargando={movimiento.isPending}
                      disabled={!puedeIngresar || (necesitaFoto && !foto)}
                    >
                      Registrar ingreso
                    </Button>
                    <Button
                      variante="secundario"
                      onClick={() => registrar('salida')}
                      cargando={movimiento.isPending}
                      disabled={!puedeSalir || (necesitaFoto && !foto)}
                    >
                      Registrar salida
                    </Button>
                  </div>
                )}
              </TarjetaEntrada>
            )}
          </div>

          <PadronAsistentes eventoId={eventoId} />
        </>
      )}
    </div>
  );
}
