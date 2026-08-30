/* ============================================================================
 * RevisarMiCompra — mientras una compra está "pendiente", el comprador puede
 * corregir nombre/correo/celular de los invitados (su propia entrada de titular
 * no se edita aquí). El comprobante de pago no se puede cambiar.
 * ========================================================================= */

import { useState } from 'react';
import { Alert, Button, Input } from '@/shared/components/ui';
import { useCorregirEntradas, type Compra } from '../compras';
import styles from './RevisarMiCompra.module.css';

interface Fila {
  id: string;
  nombre: string;
  correo: string;
  celular: string;
}

interface Props {
  compra: Compra;
  onListo: () => void;
}

export function RevisarMiCompra({ compra, onListo }: Props) {
  const corregir = useCorregirEntradas(compra.id);
  const [filas, setFilas] = useState<Fila[]>(
    compra.entradas.map((e) => ({
      id: e.id,
      nombre: e.nombre,
      correo: e.correo,
      celular: e.celular ?? '',
    })),
  );

  const cambiar = (id: string, campo: keyof Omit<Fila, 'id'>, valor: string) =>
    setFilas((prev) =>
      prev.map((f) => (f.id === id ? { ...f, [campo]: valor } : f)),
    );

  const guardar = () => {
    corregir.mutate(
      {
        entradas: filas.map((f) => ({
          id: f.id,
          nombre: f.nombre.trim(),
          correo: f.correo.trim(),
          celular: f.celular.trim() || undefined,
        })),
      },
      { onSuccess: onListo },
    );
  };

  return (
    <div className={styles.contenedor}>
      <p className={styles.ayuda}>
        Tu compra está en revisión: puedes corregir los datos de los invitados. El
        comprobante de pago no se puede modificar.
      </p>

      {corregir.isError && <Alert tipo="error">{corregir.error.mensaje}</Alert>}

      <ul className={styles.lista}>
        {compra.entradas.map((e, i) => {
          const fila = filas.find((f) => f.id === e.id)!;
          const bloqueado = e.isTitular;
          return (
            <li key={e.id} className={styles.fila}>
              <p className={styles.filaTitulo}>
                {e.isTitular ? 'Tu entrada (titular)' : `Invitado ${i}`}
              </p>
              <div className={styles.campos}>
                <Input
                  label="Nombre"
                  value={fila.nombre}
                  readOnly={bloqueado}
                  onChange={(ev) => cambiar(e.id, 'nombre', ev.target.value)}
                />
                <Input
                  label="Correo"
                  type="email"
                  value={fila.correo}
                  readOnly={bloqueado}
                  onChange={(ev) => cambiar(e.id, 'correo', ev.target.value)}
                />
                <Input
                  label="Celular"
                  type="tel"
                  inputMode="numeric"
                  opcional
                  value={fila.celular}
                  onChange={(ev) => cambiar(e.id, 'celular', ev.target.value)}
                />
              </div>
            </li>
          );
        })}
      </ul>

      <div className={styles.pie}>
        <Button variante="secundario" onClick={onListo}>
          Cancelar
        </Button>
        <Button onClick={guardar} cargando={corregir.isPending}>
          Guardar cambios
        </Button>
      </div>
    </div>
  );
}
