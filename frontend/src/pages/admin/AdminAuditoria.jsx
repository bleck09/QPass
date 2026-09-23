import { useCallback, useState } from 'react';
import { FaHistory, FaEye } from 'react-icons/fa';
import { useTituloPagina } from '../../utils/tituloPagina.js';
import { useApi } from '../../utils/useApi.js';
import api from '../../api/index.js';
import Tabla from '../../components/Tabla.jsx';
import Filtros from '../../components/Filtros.jsx';
import Modal from '../../components/Modal.jsx';
import Boton from '../../components/Boton.jsx';
import Insignia from '../../components/Insignia.jsx';
import Paginador from '../../components/Paginador.jsx';
import EncabezadoPagina from '../../components/EncabezadoPagina.jsx';
import { EstadoCarga, EstadoError } from '../../components/EstadosAsync.jsx';
import './AdminAuditoria.css';

const ENTIDADES = [
  { valor: '', texto: 'Todo' },
  { valor: 'compra', texto: 'Compras' },
  { valor: 'incidencia_recarga', texto: 'Incidencias' },
  { valor: 'reporte_entrada', texto: 'Reportes' },
  { valor: 'evento', texto: 'Eventos' },
  { valor: 'solicitud_evento', texto: 'Solicitudes' },
  { valor: 'venta', texto: 'Ventas' },
  { valor: 'corte_caja', texto: 'Cajas' },
];
const ENT_LABEL = Object.fromEntries(ENTIDADES.map((e) => [e.valor, e.texto]));

// Cómo se lee cada entidad/acción en el detalle: "Evento archivado", "Compra
// aprobada"... Las que no estén acá caen al valor crudo, que igual se entiende.
const ENT_SINGULAR = {
  compra: 'Compra',
  incidencia_recarga: 'Incidencia de recarga',
  reporte_entrada: 'Reporte de datos',
  evento: 'Evento',
  solicitud_evento: 'Solicitud de evento',
  venta: 'Venta',
  corte_caja: 'Caja',
  codigo_qr: 'Manilla',
  caso_duplicado: 'Caso de duplicado',
  transaccion: 'Transacción',
};
const ACCION_LABEL = {
  aprobar: 'Aprobado',
  rechazar: 'Rechazado',
  resolver: 'Resuelto',
  cerrar: 'Cerrado',
  abrir: 'Abierto',
  actualizar: 'Actualizado',
  crear: 'Creado',
  eliminar: 'Eliminado',
  archivar: 'Archivado',
  desarchivar: 'Desarchivado',
  publicar: 'Publicado',
  despublicar: 'Vuelto a borrador',
  finalizar: 'Finalizado',
  anular: 'Anulado',
  recuperar: 'Manilla recuperada',
  marcar_en_alerta: 'Marcada como copia',
  escaneo_en_alerta: 'Escaneo de una copia',
  vincular_por_duplicado: 'Manilla nueva por duplicado',
};

// Nombre legible de cada campo que aparece en antes/después.
const CAMPO_LABEL = {
  estado: 'Estado',
  archivadoEn: 'Archivado el',
  publicadoEn: 'Publicado el',
  anuladaEn: 'Anulada el',
  recuperadoEn: 'Recuperada el',
  cerradoEn: 'Cerrada el',
  abiertoEn: 'Abierta el',
  motivoAnulacion: 'Motivo de anulación',
  motivoRechazo: 'Motivo del rechazo',
  montoTotal: 'Monto total',
  montoInicial: 'Monto inicial',
  montoEntregado: 'Monto entregado',
  montoContado: 'Efectivo contado',
  ajusteAplicado: 'Ajuste al saldo',
  monto: 'Monto',
  entradas: 'Entradas',
  nombre: 'Nombre',
  nombreEvento: 'Nombre del evento',
  lugar: 'Lugar',
  fecha: 'Fecha',
  fechaFin: 'Fecha de cierre',
  contornoMapa: 'Contorno del mapa',
  sancion: 'Sanción',
  contexto: 'Dónde se escaneó',
  anulado: 'Anulada',
  eventoId: 'Evento',
  casoId: 'Caso',
  alertaId: 'Alerta',
  puestoId: 'Puesto',
  entradaId: 'Entrada',
  usuarioId: 'Usuario',
  tipo: 'Tipo',
  nota: 'Nota',
};
const CAMPOS_DINERO = new Set([
  'montoTotal', 'montoInicial', 'montoEntregado', 'montoContado', 'ajusteAplicado', 'monto',
]);

const fmtFecha = (iso) => new Date(iso).toLocaleString('es-BO');
const json = (v) => (v == null ? '—' : JSON.stringify(v, null, 2));

const esFechaIso = (v) =>
  typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v);

// Un valor suelto de antes/después, en texto que se pueda leer de un vistazo.
function fmtValor(campo, valor) {
  if (valor == null) return '—';
  if (typeof valor === 'boolean') return valor ? 'Sí' : 'No';
  if (esFechaIso(valor)) return fmtFecha(valor);
  if (CAMPOS_DINERO.has(campo)) return `Bs. ${Number(valor).toFixed(2)}`;
  if (typeof valor === 'object') return JSON.stringify(valor);
  if (typeof valor === 'string') return valor.replace(/_/g, ' ');
  return String(valor);
}

// Une antes y después en una fila por campo, dejando fuera lo que no cambió.
// Un campo que solo está en "antes" NO es un cambio: los servicios lo guardan
// como referencia de en qué estado estaba la cosa (ej. archivar un evento anota
// `estado: finalizado` sin tocarlo). Se marca como contexto para no leerlo como
// si se hubiera borrado — salvo cuando la operación borró el registro entero
// (despues = null), donde todo lo de antes sí desapareció.
function filasCambios(antes, despues) {
  const a = antes && typeof antes === 'object' ? antes : {};
  const d = despues && typeof despues === 'object' ? despues : {};
  const eliminado = despues == null && Object.keys(a).length > 0;
  const campos = [...new Set([...Object.keys(a), ...Object.keys(d)])];
  return campos
    .map((campo) => {
      const contexto = !eliminado && !(campo in d);
      return {
        campo,
        etiqueta: CAMPO_LABEL[campo] ?? campo,
        antes: fmtValor(campo, a[campo]),
        despues: contexto ? 'Sin cambio' : fmtValor(campo, d[campo]),
        contexto,
      };
    })
    .filter((f) => f.contexto || f.antes !== f.despues);
}

export default function AdminAuditoria() {
  useTituloPagina('Auditoría');

  const [entidad, setEntidad] = useState('');
  const [pagina, setPagina] = useState(0);
  const [detalle, setDetalle] = useState(null);

  const cargar = useCallback(
    () => api.auditoria.listar({ entidad: entidad || undefined, pagina }),
    [entidad, pagina],
  );
  const { data, cargando, error, recargar } = useApi(cargar, { inicial: null });

  const totalPaginas = data ? Math.max(1, Math.ceil(data.total / data.porPagina)) : 1;

  return (
    <div className="pi-aud-container">
      <EncabezadoPagina titulo="Auditoría" subtitulo="Quién hizo qué en las operaciones sensibles, con el antes y el después." icono={FaHistory} />

      <Filtros
        opciones={ENTIDADES}
        activo={entidad}
        onCambio={(v) => { setEntidad(v); setPagina(0); }}
        etiqueta="Filtrar por entidad"
      />

      {error ? (
        <EstadoError onReintentar={recargar} />
      ) : cargando || !data ? (
        <EstadoCarga filas={8} />
      ) : (
        <>
          <Tabla
            card
            porPagina={0}
            columnas={['Fecha', 'Actor', 'Entidad', 'Acción', { texto: 'Ver', srOnly: true }]}
            datos={data.registros}
            vacio="Sin registros de auditoría para este filtro."
            renderFila={(r) => (
              <tr key={r.id}>
                <td>{fmtFecha(r.createdAt)}</td>
                <td>{r.actor?.nombre ?? `#${r.actorId}`}</td>
                <td>{ENT_LABEL[r.entidad] ?? r.entidad}</td>
                <td>
                  <Insignia tono="marca">{ACCION_LABEL[r.accion] ?? r.accion.replace(/_/g, ' ')}</Insignia>
                </td>
                <td className="td-derecha">
                  <Boton variante="secundario" tamano="sm" icono={FaEye} onClick={() => setDetalle(r)}>Ver</Boton>
                </td>
              </tr>
            )}
          />

          {/* Paginado del servidor: mismo Paginador global que usa Tabla. */}
          <Paginador pagina={pagina} totalPaginas={totalPaginas} onCambio={setPagina} total={data.total} />
        </>
      )}

      {detalle && (
        <Modal
          titulo={`${ENT_SINGULAR[detalle.entidad] ?? ENT_LABEL[detalle.entidad] ?? detalle.entidad} · ${
            ACCION_LABEL[detalle.accion] ?? detalle.accion.replace(/_/g, ' ')
          }`}
          onCerrar={() => setDetalle(null)}
          tamano="lg"
        >
          <div className="pi-aud-detalle">
            <p className="pi-aud-detalle-meta">
              {fmtFecha(detalle.createdAt)} · {detalle.actor?.nombre ?? `#${detalle.actorId}`}
            </p>

            {(() => {
              const cambios = filasCambios(detalle.antes, detalle.despues);
              if (cambios.length === 0) {
                return (
                  <p className="texto-ayuda">No quedaron datos comparables para esta operación.</p>
                );
              }
              return (
                <table className="pi-aud-cambios">
                  <thead>
                    <tr>
                      <th>Qué cambió</th>
                      <th>Antes</th>
                      <th>Después</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cambios.map((f) => (
                      <tr key={f.campo}>
                        <th scope="row">{f.etiqueta}</th>
                        <td className={f.contexto ? 'pi-aud-contexto' : 'pi-aud-antes'}>{f.antes}</td>
                        <td className={f.contexto ? 'pi-aud-contexto' : 'pi-aud-despues'}>{f.despues}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              );
            })()}

            <details className="pi-aud-crudo">
              <summary>Ver datos técnicos</summary>
              <p className="pi-aud-detalle-meta">id del registro: {detalle.entidadId}</p>
              <div className="pi-aud-detalle-cols">
                <div>
                  <h4>Antes</h4>
                  <pre>{json(detalle.antes)}</pre>
                </div>
                <div>
                  <h4>Después</h4>
                  <pre>{json(detalle.despues)}</pre>
                </div>
              </div>
            </details>
          </div>
        </Modal>
      )}
    </div>
  );
}
