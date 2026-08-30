/* Supervisor: escanea la manilla, ve a la persona y registra ingreso/salida.
 * La foto es obligatoria si la entrada todavía no tiene una (anti-préstamo). */

import { useState } from 'react';
import { Alert, Button, CapturarFoto } from '@/shared/components/ui';
import {
  EscanerEntrada,
  TarjetaEntrada,
  useRegistrarMovimiento,
  type Entrada,
} from '@/features/entradas';
import styles from './ControlAccesoPanel.module.css';

export function ControlAccesoPanel() {
  const [entrada, setEntrada] = useState<Entrada | null>(null);
  const [foto, setFoto] = useState<string | null>(null);
  const movimiento = useRegistrarMovimiento();

  const necesitaFoto = entrada != null && !entrada.foto;
  const puedeIngresar = entrada?.estadoIngreso !== 'ingresado';
  const puedeSalir = entrada?.estadoIngreso === 'ingresado';

  const registrar = (tipo: 'ingreso' | 'salida') => {
    if (!entrada) return;
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

          {necesitaFoto && (
            <CapturarFoto
              label="Foto de seguridad (obligatoria)"
              valor={foto}
              onChange={setFoto}
              hint="Esta entrada todavía no tiene foto registrada."
            />
          )}

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
        </TarjetaEntrada>
      )}
    </div>
  );
}
