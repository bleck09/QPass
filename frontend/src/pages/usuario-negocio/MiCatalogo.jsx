import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../../components/Modal.jsx';
import Buscador from '../../components/Buscador.jsx';
import Migas from '../../components/Migas.jsx';
import EventoCard from '../../components/EventoCard.jsx';
import GrillaEventos from '../../components/GrillaEventos.jsx';
import { useApi } from '../../utils/useApi.js';
import { useTituloPagina } from '../../utils/tituloPagina.js';
import { EstadoCarga, EstadoError } from '../../components/EstadosAsync.jsx';
import {
  FaStore, FaPlus, FaTimes, FaImage, FaUpload, FaBoxOpen,
  FaSave, FaCalendarAlt,
} from 'react-icons/fa';
import api from '../../api/index.js';
import { subirImagenDeInput } from '../../utils/imagenes.js';
import './UsuarioNegocio.css';
import './MiCatalogo.css';

const FORM_PUESTO = { nombre: '', descripcion: '', logo: '' };

export default function MiCatalogo() {
  useTituloPagina('Mi catálogo');
  const navigate = useNavigate();

  const cargar = useCallback(() => api.puestosBase.listar(), []);
  const {
    data: puestosBase,
    cargando,
    error,
    recargar,
  } = useApi(cargar, { inicial: [] });

  const [busqueda, setBusqueda] = useState('');
  const [showPuesto, setShowPuesto] = useState(false);
  const [formPuesto, setFormPuesto] = useState(FORM_PUESTO);
  const [err, setErr] = useState('');

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return puestosBase;
    return puestosBase.filter(p => p.nombre.toLowerCase().includes(q));
  }, [puestosBase, busqueda]);

  const verCatalogo = (p) => navigate(`/usuarionegocio/catalogo/${p.id}`);

  // ---------- CREAR PUESTO BASE (pocos campos → modal). Editar / archivar
  //            viven en la página del puesto (MiCatalogoPuesto), igual que en
  //            la gestión de eventos: la tarjeta solo abre el detalle. ----------
  const subirLogo = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const url = await subirImagenDeInput(file, 'puestos');
      setFormPuesto(f => ({ ...f, logo: url }));
    } catch (e2) { setErr(e2.message); }
  };

  const abrirCrear = () => { setFormPuesto(FORM_PUESTO); setErr(''); setShowPuesto(true); };

  const guardarPuesto = async (e) => {
    e.preventDefault();
    setErr('');
    try {
      await api.puestosBase.crear({
        nombre: formPuesto.nombre,
        descripcion: formPuesto.descripcion || null,
        logo: formPuesto.logo || null,
      });
      await recargar();
      setShowPuesto(false);
    } catch (e2) { setErr(e2.message); }
  };

  return (
    <div className="pi-unegocio-container">
      <Migas items={[{ texto: 'Mi Catálogo', actual: true }]} />
      <div className="pi-unegocio-header-wrapper">
        <div className="pi-unegocio-header">
          <h1>Mi catálogo</h1>
          <p>Definí tus puestos y sus productos una sola vez. Después los activás en cada evento sin volver a cargarlos.</p>
        </div>
        <div className="pi-unegocio-kpi">
          <span className="micro-etiqueta">Puestos en catálogo</span>
          <div className="kpi-valor">
            <FaStore className="kpi-icon" />
            <span className="numero-grande">{puestosBase.length}</span>
          </div>
        </div>
      </div>

      <div className="pi-unegocio-action-bar">
        <Buscador valor={busqueda} onCambio={setBusqueda} placeholder="Buscar puesto por nombre…" />
        <button type="button" className="btn-primario" onClick={abrirCrear}>
          <FaPlus /> Nuevo puesto base
        </button>
      </div>

      {err && !showPuesto && (
        <p className="pi-unegocio-nota pi-unegocio-nota--error">{err}</p>
      )}

      {error ? (
        <EstadoError onReintentar={recargar} />
      ) : cargando ? (
        <EstadoCarga filas={4} />
      ) : (
        <GrillaEventos
          eventos={filtrados}
          gridClassName="pi-entrega-eventos-grid"
          vacio={busqueda
            ? 'No se encontraron puestos.'
            : 'Aún no tenés puestos en tu catálogo. Creá el primero con “Nuevo puesto base”.'}
        >
          {p => (
            <EventoCard
              key={p.id}
              evento={{ nombre: p.nombre, imagen: p.logo || undefined }}
              onClick={() => verCatalogo(p)}
              cta="Ver catálogo"
              badges={p.archivado ? <span className="pi-mcat-tag-archivado">Archivado</span> : null}
              meta={[
                <><FaBoxOpen aria-hidden="true" /> {p.productos.length} producto{p.productos.length === 1 ? '' : 's'}</>,
                <><FaCalendarAlt aria-hidden="true" /> {p._count?.puestos ?? 0} evento{(p._count?.puestos ?? 0) === 1 ? '' : 's'}</>,
              ]}
            />
          )}
        </GrillaEventos>
      )}

      {/* CREAR PUESTO BASE */}
      {showPuesto && (
        <Modal
          titulo={<><FaStore color="var(--indigo-profundo)" aria-hidden="true" /> Nuevo puesto base</>}
          onCerrar={() => setShowPuesto(false)}
        >
          <div className="modal-body">
            <form onSubmit={guardarPuesto} className="formulario">
              <div className="input-group">
                <label htmlFor="mc-nombre">Nombre del puesto</label>
                <input id="mc-nombre" type="text" value={formPuesto.nombre} onChange={(e) => setFormPuesto(f => ({ ...f, nombre: e.target.value }))} placeholder="Ej: Pollos Doña María" required />
              </div>
              <div className="input-group">
                <label htmlFor="mc-desc">Breve descripción</label>
                <input id="mc-desc" type="text" value={formPuesto.descripcion} onChange={(e) => setFormPuesto(f => ({ ...f, descripcion: e.target.value }))} placeholder="Ej: Comida rápida y gaseosas" />
              </div>
              <div className="input-group">
                <label htmlFor="mc-logo"><FaImage aria-hidden="true" /> Logo o foto del puesto (opcional)</label>
                {!formPuesto.logo ? (
                  <div className="upload-zone">
                    <FaUpload className="upload-icon" />
                    <span className="upload-text">Haz clic para subir el logo</span>
                    <span className="upload-subtext">PNG, JPG hasta 2MB</span>
                    <input id="mc-logo" type="file" accept="image/*" onChange={subirLogo} className="upload-input-hidden" />
                  </div>
                ) : (
                  <div className="preview-zone">
                    <img width="200" height="200" src={formPuesto.logo} alt="Vista previa" className="img-preview" />
                    <button type="button" className="btn-quitar-imagen" onClick={() => setFormPuesto(f => ({ ...f, logo: '' }))}><FaTimes /> Quitar imagen</button>
                  </div>
                )}
              </div>
              {err && <p className="pi-unegocio-nota pi-unegocio-nota--error">{err}</p>}
              <div className="modal-actions">
                <button type="button" className="btn-cancelar" onClick={() => setShowPuesto(false)}>Cancelar</button>
                <button type="submit" className="btn-primario"><FaSave /> Crear puesto</button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
}
