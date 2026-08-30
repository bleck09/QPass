/* ============================================================================
 * PuestoCard — un puesto del negocio: gestiona sus productos y sus ayudantes.
 * ========================================================================= */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Alert,
  Badge,
  Button,
  Card,
  Input,
  Modal,
} from '@/shared/components/ui';
import { formatearMoneda } from '@/shared/utils/formatearMoneda';
import {
  useAsignarAyudante,
  useCrearCuentaAyudante,
  useCrearProducto,
  useEliminarProducto,
  useQuitarAyudante,
  type Puesto,
} from './puestos';
import styles from './PuestoCard.module.css';

const productoSchema = z.object({
  nombre: z.string().trim().min(1, 'Nombre requerido'),
  precio: z.string().refine((v) => Number(v) >= 0, 'Precio no válido'),
});
type ProductoValues = z.infer<typeof productoSchema>;

const ayudanteSchema = z.object({
  nombre: z.string().trim().min(1, 'Nombre requerido'),
  email: z.string().trim().min(1, 'Correo requerido').email('Correo no válido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  celular: z.string().trim().optional().or(z.literal('')),
});
type AyudanteValues = z.infer<typeof ayudanteSchema>;

export function PuestoCard({ puesto }: { puesto: Puesto }) {
  const crearProducto = useCrearProducto();
  const eliminarProducto = useEliminarProducto();
  const crearCuenta = useCrearCuentaAyudante();
  const asignar = useAsignarAyudante();
  const quitar = useQuitarAyudante();
  const [ayudanteAbierto, setAyudanteAbierto] = useState(false);

  const prodForm = useForm<ProductoValues>({ resolver: zodResolver(productoSchema) });
  const ayuForm = useForm<AyudanteValues>({ resolver: zodResolver(ayudanteSchema) });

  const agregarProducto = (v: ProductoValues) => {
    crearProducto.mutate(
      { puestoId: puesto.id, nombre: v.nombre.trim(), precio: Number(v.precio) },
      { onSuccess: () => prodForm.reset({ nombre: '', precio: '' }) },
    );
  };

  const crearYAsignar = async (v: AyudanteValues) => {
    const cuenta = await crearCuenta.mutateAsync({
      nombre: v.nombre.trim(),
      email: v.email.trim(),
      password: v.password,
      celular: v.celular?.trim() || undefined,
    });
    await asignar.mutateAsync({ puestoId: puesto.id, ayudanteId: cuenta.id });
    setAyudanteAbierto(false);
    ayuForm.reset();
  };

  return (
    <Card>
      <div className={styles.cabecera}>
        <div>
          <h3 className={styles.titulo}>{puesto.nombre}</h3>
          {puesto.descripcion && <p className={styles.desc}>{puesto.descripcion}</p>}
        </div>
        <Badge tono={puesto.estadoActivo ? 'exito' : 'neutro'}>
          {puesto.estadoActivo ? 'Activo' : 'Inactivo'}
        </Badge>
      </div>

      <section className={styles.seccion}>
        <h4>Productos</h4>
        {puesto.productos.length === 0 && (
          <p className={styles.vacio}>Sin productos todavía.</p>
        )}
        <ul className={styles.lista}>
          {puesto.productos.map((p) => (
            <li key={p.id}>
              <span>
                {p.nombre} · {formatearMoneda(p.precio)}
              </span>
              <Button
                variante="terciario"
                tamano="sm"
                onClick={() => eliminarProducto.mutate(p.id)}
              >
                Quitar
              </Button>
            </li>
          ))}
        </ul>
        {crearProducto.isError && (
          <Alert tipo="error">{crearProducto.error.mensaje}</Alert>
        )}
        <form
          className={styles.formInline}
          onSubmit={prodForm.handleSubmit(agregarProducto)}
          noValidate
        >
          <Input
            label="Nombre"
            error={prodForm.formState.errors.nombre?.message}
            {...prodForm.register('nombre')}
          />
          <Input
            label="Precio (Bs)"
            type="number"
            step="0.01"
            error={prodForm.formState.errors.precio?.message}
            {...prodForm.register('precio')}
          />
          <Button type="submit" tamano="sm" cargando={crearProducto.isPending}>
            Agregar
          </Button>
        </form>
      </section>

      <section className={styles.seccion}>
        <div className={styles.seccionHead}>
          <h4>Ayudantes</h4>
          <Button
            variante="secundario"
            tamano="sm"
            onClick={() => setAyudanteAbierto(true)}
          >
            Crear ayudante
          </Button>
        </div>
        {puesto.ayudantes.length === 0 && (
          <p className={styles.vacio}>Sin ayudantes asignados.</p>
        )}
        <ul className={styles.lista}>
          {puesto.ayudantes.map((a) => (
            <li key={a.id}>
              <span>
                {a.ayudante?.nombre} · turno {a.turno}
              </span>
              <Button
                variante="terciario"
                tamano="sm"
                onClick={() => quitar.mutate(a.id)}
              >
                Quitar
              </Button>
            </li>
          ))}
        </ul>
      </section>

      <Modal
        abierto={ayudanteAbierto}
        onCerrar={() => setAyudanteAbierto(false)}
        titulo="Crear ayudante"
        acciones={null}
      >
        {(crearCuenta.isError || asignar.isError) && (
          <Alert tipo="error">
            {crearCuenta.error?.mensaje ?? asignar.error?.mensaje}
          </Alert>
        )}
        <form
          className={styles.formModal}
          onSubmit={ayuForm.handleSubmit(crearYAsignar)}
          noValidate
        >
          <Input
            label="Nombre"
            error={ayuForm.formState.errors.nombre?.message}
            {...ayuForm.register('nombre')}
          />
          <Input
            label="Correo"
            type="email"
            error={ayuForm.formState.errors.email?.message}
            {...ayuForm.register('email')}
          />
          <Input
            label="Celular"
            type="tel"
            opcional
            {...ayuForm.register('celular')}
          />
          <Input
            label="Contraseña"
            type="password"
            autoComplete="new-password"
            hint="Comunícasela al ayudante."
            error={ayuForm.formState.errors.password?.message}
            {...ayuForm.register('password')}
          />
          <div className={styles.pieModal}>
            <Button variante="secundario" onClick={() => setAyudanteAbierto(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              cargando={crearCuenta.isPending || asignar.isPending}
            >
              Crear y asignar
            </Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
}
