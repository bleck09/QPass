/* ============================================================================
 * EscanerEntrada — escanea/ingresa un código de manilla y resuelve la Entrada
 * dueña. Reutilizado por Recargador, Supervisor, Ayudante y Devolución.
 * ========================================================================= */

import { useState } from 'react';
import { Alert, EscanerQr } from '@/shared/components/ui';
import { buscarEntradaPorCodigo, type Entrada } from '../entradas';
import type { ApiError } from '@/lib/api/errors';

interface EscanerEntradaProps {
  onEncontrada: (entrada: Entrada) => void;
}

export function EscanerEntrada({ onEncontrada }: EscanerEntradaProps) {
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const alDetectar = async (codigo: string) => {
    setBuscando(true);
    setError(null);
    try {
      onEncontrada(await buscarEntradaPorCodigo(codigo));
    } catch (err) {
      setError((err as ApiError).mensaje ?? 'No encontramos esa manilla.');
    } finally {
      setBuscando(false);
    }
  };

  return (
    <div>
      <EscanerQr onDetectar={alDetectar} ocupado={buscando} />
      {error && (
        <Alert tipo="error">{error}</Alert>
      )}
    </div>
  );
}
