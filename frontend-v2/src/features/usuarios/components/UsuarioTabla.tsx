import { Badge, Button, Table, Td, Th } from '@/shared/components/ui';
import { ROL_LABEL } from '@/shared/constants/roles';
import type { Usuario } from '../types/usuarios.types';

interface UsuarioTablaProps {
  usuarios: Usuario[];
  onEliminar: (usuario: Usuario) => void;
}

export function UsuarioTabla({ usuarios, onEliminar }: UsuarioTablaProps) {
  return (
    <Table>
      <thead>
        <tr>
          <Th>Nombre</Th>
          <Th>Correo</Th>
          <Th>Rol</Th>
          <Th>Celular</Th>
          <Th>
            <span className="sr-only">Acciones</span>
          </Th>
        </tr>
      </thead>
      <tbody>
        {usuarios.map((u) => (
          <tr key={u.id}>
            <Td>
              {[u.nombre, u.apellidoPaterno].filter(Boolean).join(' ')}
            </Td>
            <Td>{u.email}</Td>
            <Td>
              <Badge tono="neutro">{ROL_LABEL[u.rol]}</Badge>
            </Td>
            <Td>{u.celular ?? '—'}</Td>
            <Td numerico>
              <Button
                variante="terciario"
                tamano="sm"
                onClick={() => onEliminar(u)}
              >
                Eliminar
              </Button>
            </Td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
