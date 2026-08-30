/* Modal para que el Usuario reporte un dato mal en una entrada ya aprobada. */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert, Button, Modal, Select, Textarea } from '@/shared/components/ui';
import { useCrearReporte, type CampoReportado } from './reportes-entrada';

const schema = z.object({
  campo: z.enum(['nombre', 'correo', 'celular']),
  descripcion: z.string().trim().min(5, 'Explica qué está mal y cuál es el dato correcto'),
});
type Values = z.infer<typeof schema>;

interface ReportarDatoModalProps {
  abierto: boolean;
  compraId: string;
  entradaId: string;
  onCerrar: () => void;
}

export function ReportarDatoModal({
  abierto,
  compraId,
  entradaId,
  onCerrar,
}: ReportarDatoModalProps) {
  const crear = useCrearReporte();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { campo: 'nombre' } });

  const cerrar = () => {
    reset();
    crear.reset();
    onCerrar();
  };

  return (
    <Modal abierto={abierto} onCerrar={cerrar} titulo="Reportar dato incorrecto" acciones={null}>
      {crear.isError && <Alert tipo="error">{crear.error.mensaje}</Alert>}
      {crear.isSuccess && (
        <Alert tipo="exito">Reporte enviado. Un administrador lo revisará.</Alert>
      )}
      <form
        onSubmit={handleSubmit((v) =>
          crear.mutate(
            {
              compraId,
              entradaId,
              campo: v.campo as CampoReportado,
              descripcion: v.descripcion.trim(),
            },
            { onSuccess: cerrar },
          ),
        )}
        noValidate
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
      >
        <Select label="Dato a corregir" {...register('campo')}>
          <option value="nombre">Nombre</option>
          <option value="correo">Correo</option>
          <option value="celular">Celular</option>
        </Select>
        <Textarea
          label="¿Qué está mal?"
          rows={3}
          error={errors.descripcion?.message}
          {...register('descripcion')}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
          <Button variante="secundario" onClick={cerrar}>
            Cancelar
          </Button>
          <Button type="submit" cargando={crear.isPending}>
            Enviar reporte
          </Button>
        </div>
      </form>
    </Modal>
  );
}
