/* Confirmación de una acción con consecuencias (Manual 3.3, 8.6). */

import type { ReactNode } from 'react';
import { Modal } from '../Modal';
import { Button } from '../Button';

interface ConfirmarModalProps {
  abierto: boolean;
  titulo: string;
  children: ReactNode;
  textoConfirmar?: string;
  destructivo?: boolean;
  cargando?: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
}

export function ConfirmarModal({
  abierto,
  titulo,
  children,
  textoConfirmar = 'Confirmar',
  destructivo = false,
  cargando = false,
  onConfirmar,
  onCancelar,
}: ConfirmarModalProps) {
  return (
    <Modal
      abierto={abierto}
      onCerrar={onCancelar}
      titulo={titulo}
      acciones={
        <>
          <Button variante="secundario" onClick={onCancelar} disabled={cargando}>
            Cancelar
          </Button>
          <Button
            variante={destructivo ? 'destructivo' : 'primario'}
            onClick={onConfirmar}
            cargando={cargando}
          >
            {textoConfirmar}
          </Button>
        </>
      }
    >
      <p style={{ color: 'var(--color-text-secundario)' }}>{children}</p>
    </Modal>
  );
}
