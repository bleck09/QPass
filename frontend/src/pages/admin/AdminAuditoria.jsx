import { useCallback, useState } from 'react';
import { FaHistory, FaChevronLeft, FaChevronRight, FaEye } from 'react-icons/fa';
import { useTituloPagina } from '../../utils/tituloPagina.js';
import { useApi } from '../../utils/useApi.js';
import api from '../../api/index.js';
import Tabla from '../../components/Tabla.jsx';
import Filtros from '../../components/Filtros.jsx';
import Modal from '../../components/Modal.jsx';
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

const fmtFecha = (iso) => new Date(iso).toLocaleString('es-BO');
const json = (v) => (v == null ? '—' : JSON.stringify(v, null, 2));

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
      <div className="pi-aud-header">
        <h1><FaHistory aria-hidden="true" /> Auditoría</h1>
        <p>Quién hizo qué en las operaciones sensibles, con el antes y el después.</p>
      </div>

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
                <td><span className="pi-aud-accion">{r.accion}</span></td>
                <td style={{ textAlign: 'right' }}>
                  <button type="button" className="pi-aud-btn-ver" onClick={() => setDetalle(r)}>
                    <FaEye aria-hidden="true" /> Ver
                  </button>
                </td>
              </tr>
            )}
          />

          <div className="pi-aud-paginador">
            <button type="button" disabled={pagina === 0} onClick={() => setPagina((p) => p - 1)}>
              <FaChevronLeft aria-hidden="true" /> Anteriores
            </button>
            <span>Página {pagina + 1} de {totalPaginas} · {data.total} registros</span>
            <button type="button" disabled={pagina + 1 >= totalPaginas} onClick={() => setPagina((p) => p + 1)}>
              Siguientes <FaChevronRight aria-hidden="true" />
            </button>
          </div>
        </>
      )}

      {detalle && (
        <Modal
          titulo={`${ENT_LABEL[detalle.entidad] ?? detalle.entidad} · ${detalle.accion}`}
          onCerrar={() => setDetalle(null)}
          tamano="lg"
        >
          <div className="pi-aud-detalle">
            <p className="pi-aud-detalle-meta">
              {fmtFecha(detalle.createdAt)} · {detalle.actor?.nombre ?? `#${detalle.actorId}`} · id {detalle.entidadId}
            </p>
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
          </div>
        </Modal>
      )}
    </div>
  );
}
