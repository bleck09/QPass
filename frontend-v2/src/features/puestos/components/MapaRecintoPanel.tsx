/* ============================================================================
 * MapaRecintoPanel — Diseñador del Recinto de un evento (antes: Mapa.jsx).
 * El Admin coloca negocios, escenarios y zonas sobre un plano y controla su
 * visibilidad. Dos vistas: plano interactivo y lista.
 * ========================================================================= */

import { useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Modal,
  Table,
  Tabs,
  Td,
  Th,
  type Tab,
} from '@/shared/components/ui';
import { EstadoCargando, EstadoError, EstadoVacio } from '@/shared/components/feedback';
import { ROLES } from '@/shared/constants/roles';
import { useUsuarios } from '@/features/usuarios';
import { usePuestos, useCrearPuesto, useActualizarPuesto, type Puesto } from '../puestos';
import { PlanoRecinto } from './PlanoRecinto';
import { ElementoRecintoForm, type ValoresElemento } from './ElementoRecintoForm';
import styles from './MapaRecintoPanel.module.css';

const TABS: Tab[] = [
  { id: 'plano', label: 'Plano visual' },
  { id: 'lista', label: 'Lista de elementos' },
];

/** Posición por defecto de un elemento recién creado, en px lógicos. */
const POSICION_INICIAL = { x: 40, y: 40 };

export function MapaRecintoPanel({ eventoId }: { eventoId: string }) {
  const { data: puestos, isPending, isError, refetch } = usePuestos(eventoId);
  const negocios = useUsuarios(ROLES.USUARIO_NEGOCIO);
  const crear = useCrearPuesto();
  const actualizar = useActualizarPuesto();

  const [vista, setVista] = useState('plano');
  const [modoDiseno, setModoDiseno] = useState(false);
  const [editando, setEditando] = useState<Puesto | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);

  const abrirAlta = () => {
    setEditando(null);
    setModalAbierto(true);
  };
  const abrirEdicion = (puesto: Puesto) => {
    setEditando(puesto);
    setModalAbierto(true);
  };
  const cerrarModal = () => setModalAbierto(false);

  const guardar = async (v: ValoresElemento) => {
    if (editando) {
      await actualizar.mutateAsync({
        id: editando.id,
        nombre: v.nombre,
        categoria: v.categoria,
        ancho: v.ancho,
        alto: v.alto,
        logo: v.logo ?? undefined,
      });
    } else {
      const creado = await crear.mutateAsync({
        eventoId,
        nombre: v.nombre,
        logo: v.logo ?? undefined,
        negocioId: v.negocioId ?? undefined,
      });
      await actualizar.mutateAsync({
        id: creado.id,
        categoria: v.categoria,
        ancho: v.ancho,
        alto: v.alto,
        ...POSICION_INICIAL,
      });
    }
    cerrarModal();
  };

  const mover = (id: string, x: number, y: number) =>
    actualizar.mutate({ id, x, y });
  const redimensionar = (id: string, ancho: number, alto: number) =>
    actualizar.mutate({ id, ancho, alto });
  const alternarVisibilidad = (p: Puesto) =>
    actualizar.mutate({ id: p.id, estadoActivo: !p.estadoActivo });

  if (isPending) return <EstadoCargando filas={5} />;
  if (isError)
    return <EstadoError mensaje="No pudimos cargar el recinto." onReintentar={refetch} />;

  const errorMutacion = crear.error?.mensaje ?? actualizar.error?.mensaje;

  return (
    <div className={styles.panel}>
      <div className={styles.barra}>
        <p className={styles.hint}>
          {puestos.length} elemento{puestos.length === 1 ? '' : 's'} en el recinto.
        </p>
        <div className={styles.acciones}>
          {vista === 'plano' && puestos.length > 0 && (
            <Button
              variante="secundario"
              onClick={() => setModoDiseno((v) => !v)}
              aria-pressed={modoDiseno}
            >
              {modoDiseno ? 'Bloquear distribución' : 'Editar distribución'}
            </Button>
          )}
          <Button onClick={abrirAlta}>Añadir elemento</Button>
        </div>
      </div>

      {errorMutacion && <Alert tipo="error">{errorMutacion}</Alert>}

      {puestos.length === 0 ? (
        <EstadoVacio
          titulo="El recinto está vacío"
          descripcion="Añade el primer negocio, escenario o zona para empezar a diseñar el plano."
          accion={<Button onClick={abrirAlta}>Añadir el primer elemento</Button>}
        />
      ) : (
        <Tabs tabs={TABS} activa={vista} onCambiar={setVista}>
          {vista === 'plano' && (
            <PlanoRecinto
              puestos={puestos}
              modoDiseno={modoDiseno}
              onMover={mover}
              onRedimensionar={redimensionar}
              onEditar={abrirEdicion}
            />
          )}

          {vista === 'lista' && (
            <Table>
              <thead>
                <tr>
                  <Th>Elemento</Th>
                  <Th>Categoría</Th>
                  <Th numerico>Tamaño</Th>
                  <Th>Estado</Th>
                  <Th>Acciones</Th>
                </tr>
              </thead>
              <tbody>
                {puestos.map((p) => (
                  <tr key={p.id}>
                    <Td>
                      <span className={styles.celdaElemento}>
                        {p.logo ? (
                          <img className={styles.miniatura} src={p.logo} alt="" />
                        ) : (
                          <span className={styles.sinMiniatura} aria-hidden="true">
                            ▦
                          </span>
                        )}
                        {p.nombre}
                      </span>
                    </Td>
                    <Td>{p.categoria ?? '—'}</Td>
                    <Td numerico>
                      {Math.round(p.ancho)} × {Math.round(p.alto)}
                    </Td>
                    <Td>
                      <Badge tono={p.estadoActivo ? 'exito' : 'neutro'}>
                        {p.estadoActivo ? 'Visible' : 'Oculto'}
                      </Badge>
                    </Td>
                    <Td>
                      <span className={styles.acciones}>
                        <Button
                          variante="terciario"
                          tamano="sm"
                          onClick={() => abrirEdicion(p)}
                        >
                          Editar
                        </Button>
                        <Button
                          variante="terciario"
                          tamano="sm"
                          onClick={() => alternarVisibilidad(p)}
                        >
                          {p.estadoActivo ? 'Ocultar' : 'Mostrar'}
                        </Button>
                      </span>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Tabs>
      )}

      <Modal
        abierto={modalAbierto}
        onCerrar={cerrarModal}
        titulo={editando ? 'Editar elemento' : 'Añadir al plano'}
        acciones={null}
      >
        <ElementoRecintoForm
          edicion={Boolean(editando)}
          inicial={
            editando
              ? {
                  negocioId: editando.negocioId,
                  nombre: editando.nombre,
                  categoria: editando.categoria ?? undefined,
                  ancho: editando.ancho,
                  alto: editando.alto,
                  logo: editando.logo,
                }
              : undefined
          }
          negocios={(negocios.data ?? []).map((u) => ({
            id: u.id,
            nombre: u.nombre,
            email: u.email,
          }))}
          cargando={crear.isPending || actualizar.isPending}
          onGuardar={guardar}
          onCancelar={cerrarModal}
        />
      </Modal>
    </div>
  );
}
