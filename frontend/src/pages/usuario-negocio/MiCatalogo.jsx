import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../../components/Modal.jsx';
import Buscador from '../../components/Buscador.jsx';
import Migas from '../../components/Migas.jsx';
import EventoCard from '../../components/EventoCard.jsx';
import GrillaEventos from '../../components/GrillaEventos.jsx';
import { useApi } from '../../utils/useApi.js';
import { useTituloPagina } from '../../utils/tituloPagina.js';
import { EstadoCarga, EstadoError, EstadoVacio } from '../../components/EstadosAsync.jsx';
import EncabezadoPagina from '../../components/EncabezadoPagina.jsx';
import StatCard from '../../components/StatCard.jsx';
import Insignia from '../../components/Insignia.jsx';
import Boton from '../../components/Boton.jsx';
import Campo from '../../components/Campo.jsx';
import SubirImagen from '../../components/SubirImagen.jsx';
import { AvisoFijo, useAvisos } from '../../components/Avisos.jsx';
import { errorObligatorio } from '../../utils/validacion.js';
import {
  FaStore, FaPlus, FaBoxOpen,
  FaSave, FaCalendarAlt, FaArchive, FaSearch,
} from 'react-icons/fa';
import api from '../../api/index.js';
import './UsuarioNegocio.css';
import './MiCatalogo.css';

const FORM_PUESTO = { nombre: '', descripcion: '', logo: '' };

export default function MiCatalogo() {
  useTituloPagina('Mi catálogo');
  const navigate = useNavigate();
  const avisos = useAvisos();

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
  // Error del servidor dentro del modal; el nombre se valida en su campo.
  const [err, setErr] = useState('');
  const [intento, setIntento] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const errorNombre = intento ? errorObligatorio(formPuesto.nombre, 'Escribí el nombre del puesto.') : null;

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return puestosBase;
    return puestosBase.filter(p => p.nombre.toLowerCase().includes(q));
  }, [puestosBase, busqueda]);

  const verCatalogo = (p) => navigate(`/usuarionegocio/catalogo/${p.id}`);

  // ---------- CREAR PUESTO BASE (pocos campos → modal). Editar / archivar
  //            viven en la página del puesto (MiCatalogoPuesto), igual que en
  //            la gestión de eventos: la tarjeta solo abre el detalle. ----------
  const abrirCrear = () => { setFormPuesto(FORM_PUESTO); setErr(''); setIntento(false); setShowPuesto(true); };

  const guardarPuesto = async (e) => {
    e.preventDefault();
    setErr('');
    setIntento(true);
    if (errorObligatorio(formPuesto.nombre)) return document.getElementById('mc-nombre')?.focus();

    setGuardando(true);
    try {
      await api.puestosBase.crear({
        nombre: formPuesto.nombre.trim(),
        descripcion: formPuesto.descripcion.trim() || null,
        logo: formPuesto.logo || null,
      });
      await recargar();
      setShowPuesto(false);
      avisos.exito(`"${formPuesto.nombre.trim()}" ya está en tu catálogo. Ahora cargale sus productos.`, { titulo: 'Puesto creado' });
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="pi-unegocio-container">
      <Migas items={[{ texto: 'Mi Catálogo', actual: true }]} />
      <EncabezadoPagina
        titulo="Mi catálogo"
        subtitulo="Definí tus puestos y sus productos una sola vez. Después los activás en cada evento sin volver a cargarlos."
        icono={FaStore}
        acciones={<StatCard icon={<FaStore />} tono="info" valor={puestosBase.length} label="Puestos en catálogo" />}
      />

      <div className="pi-unegocio-action-bar">
        <Buscador valor={busqueda} onCambio={setBusqueda} placeholder="Buscar puesto por nombre…" />
        <Boton icono={FaPlus} onClick={abrirCrear}>Nuevo puesto base</Boton>
      </div>

      {error ? (
        <EstadoError onReintentar={recargar} />
      ) : cargando ? (
        <EstadoCarga filas={4} />
      ) : (
        <GrillaEventos
          eventos={filtrados}
         
          vacio={busqueda
            ? <EstadoVacio compacto icono={FaSearch} titulo="Ningún puesto coincide con la búsqueda" />
            : (
              <EstadoVacio
                icono={FaStore}
                titulo="Aún no tenés puestos en tu catálogo"
                mensaje="Creá el primero: después lo activás en cada evento sin volver a cargarlo."
                accion={<Boton icono={FaPlus} onClick={abrirCrear}>Nuevo puesto base</Boton>}
              />
            )}
        >
          {p => (
            <EventoCard
              key={p.id}
              evento={{ nombre: p.nombre, imagen: p.logo || undefined }}
              onClick={() => verCatalogo(p)}
              cta="Ver catálogo"
              badges={p.archivado ? <Insignia tono="neutro" solida icono={FaArchive}>Archivado</Insignia> : null}
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
          titulo={<><FaStore aria-hidden="true" /> Nuevo puesto base</>}
          onCerrar={() => setShowPuesto(false)}
        >
          <form onSubmit={guardarPuesto} className="formulario" noValidate>
              <Campo
                id="mc-nombre" etiqueta="Nombre del puesto" placeholder="Ej: Pollos Doña María"
                value={formPuesto.nombre} onChange={(e) => setFormPuesto(f => ({ ...f, nombre: e.target.value }))}
                error={errorNombre}
              />
              <Campo
                id="mc-desc" etiqueta="Breve descripción" placeholder="Ej: Comida rápida y gaseosas"
                value={formPuesto.descripcion} onChange={(e) => setFormPuesto(f => ({ ...f, descripcion: e.target.value }))}
              />
              <SubirImagen
                id="mc-logo" etiqueta="Logo o foto del puesto (opcional)" carpeta="puestos" texto="Hacé clic para subir el logo"
                valor={formPuesto.logo} onCambio={(url) => setFormPuesto(f => ({ ...f, logo: url }))}
              />
              {err && <AvisoFijo tono="error">{err}</AvisoFijo>}
              <div className="modal-actions">
                <Boton variante="secundario" onClick={() => setShowPuesto(false)} disabled={guardando}>Cancelar</Boton>
                <Boton type="submit" icono={FaSave} cargando={guardando}>Crear puesto</Boton>
              </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
