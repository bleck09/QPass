/* Supervisor: entrega manillas del pool. Lista las entradas confirmadas y
 * permite vincular una manilla (escaneando su código) o anular la vigente. */

import { useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  EscanerQr,
  Modal,
  Table,
  Td,
  Th,
} from '@/shared/components/ui';
import { EstadoCargando, EstadoError, EstadoVacio } from '@/shared/components/feedback';
import type { ApiError } from '@/lib/api/errors';
import { SelectorEvento } from '@/features/eventos';
import { buscarCodigoQr } from '@/features/codigos-qr';
import { useAnularQr, useEntradas, useVincularQr, type Entrada } from '@/features/entradas';
import styles from './EntregarManillasPanel.module.css';

export function EntregarManillasPanel() {
  const [eventoId, setEventoId] = useState('');
  const { data, isPending, isError, refetch } = useEntradas(eventoId);
  const [vincularA, setVincularA] = useState<Entrada | null>(null);
  const [anularA, setAnularA] = useState<Entrada | null>(null);

  const vincular = useVincularQr();
  const anular = useAnularQr();
  const [errorScan, setErrorScan] = useState<string | null>(null);

  const cerrar = () => {
    setVincularA(null);
    setAnularA(null);
    setErrorScan(null);
    vincular.reset();
    anular.reset();
  };

  const alEscanear = async (codigo: string) => {
    if (!vincularA) return;
    setErrorScan(null);
    try {
      const cq = await buscarCodigoQr(codigo);
      vincular.mutate(
        { id: vincularA.id, codigoQrId: cq.id },
        { onSuccess: cerrar },
      );
    } catch (err) {
      setErrorScan((err as ApiError).mensaje ?? 'Ese código no existe.');
    }
  };

  return (
    <div className={styles.panel}>
      <div className={styles.selector}>
        <SelectorEvento value={eventoId} onChange={setEventoId} />
      </div>

      {!eventoId && <EstadoVacio titulo="Elige un evento para ver sus entradas" />}
      {eventoId && isPending && <EstadoCargando filas={5} />}
      {eventoId && isError && <EstadoError onReintentar={refetch} />}
      {eventoId && data && data.length === 0 && (
        <EstadoVacio titulo="Sin entradas confirmadas todavía" />
      )}

      {eventoId && data && data.length > 0 && (
        <Table>
          <thead>
            <tr>
              <Th>Persona</Th>
              <Th>Categoría</Th>
              <Th>Manilla</Th>
              <Th>
                <span className="sr-only">Acciones</span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {data.map((e) => (
              <tr key={e.id}>
                <Td>{e.nombre}</Td>
                <Td>{e.categoriaTicket?.nombre ?? '—'}</Td>
                <Td>
                  {e.codigoQrVinculado ? (
                    <Badge tono="exito">{e.codigoQrVinculado.codigo}</Badge>
                  ) : (
                    <Badge tono="neutro">Sin asignar</Badge>
                  )}
                </Td>
                <Td numerico>
                  {e.codigoQrVinculado ? (
                    <Button
                      variante="terciario"
                      tamano="sm"
                      onClick={() => setAnularA(e)}
                    >
                      Cambiar / anular
                    </Button>
                  ) : (
                    <Button
                      variante="secundario"
                      tamano="sm"
                      onClick={() => setVincularA(e)}
                    >
                      Vincular manilla
                    </Button>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <Modal
        abierto={vincularA !== null}
        onCerrar={cerrar}
        titulo={`Vincular manilla a ${vincularA?.nombre ?? ''}`}
        acciones={null}
      >
        {vincular.isError && <Alert tipo="error">{vincular.error.mensaje}</Alert>}
        {errorScan && <Alert tipo="error">{errorScan}</Alert>}
        <EscanerQr onDetectar={alEscanear} ocupado={vincular.isPending} />
      </Modal>

      <Modal
        abierto={anularA !== null}
        onCerrar={cerrar}
        titulo="Anular manilla"
        acciones={
          <>
            <Button variante="secundario" onClick={cerrar}>
              Cerrar
            </Button>
            <Button
              variante="destructivo"
              cargando={anular.isPending}
              onClick={() =>
                anularA &&
                anular.mutate(
                  { id: anularA.id, motivo: 'perdida/dañada' },
                  { onSuccess: cerrar },
                )
              }
            >
              Anular
            </Button>
          </>
        }
      >
        {anular.isError && <Alert tipo="error">{anular.error.mensaje}</Alert>}
        <p className={styles.aviso}>
          Se anulará la manilla <strong>{anularA?.codigoQrVinculado?.codigo}</strong>{' '}
          de {anularA?.nombre}. El saldo no se mueve. Luego podrás vincular una
          manilla nueva.
        </p>
      </Modal>
    </div>
  );
}
