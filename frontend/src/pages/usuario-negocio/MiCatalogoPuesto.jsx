import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Modal from '../../components/Modal.jsx';
import Migas from '../../components/Migas.jsx';
import BotonVolver from '../../components/BotonVolver.jsx';
import Tabla from '../../components/Tabla.jsx';
import Buscador from '../../components/Buscador.jsx';
import Paginador from '../../components/Paginador.jsx';
import Boton from '../../components/Boton.jsx';
import Campo from '../../components/Campo.jsx';
import Insignia from '../../components/Insignia.jsx';
import Pestanas from '../../components/Pestanas.jsx';
import SubirImagen from '../../components/SubirImagen.jsx';
import { AvisoFijo, useAvisos } from '../../components/Avisos.jsx';
import { useConfirmar } from '../../components/ConfirmarModal.jsx';
import { usePaginacion } from '../../utils/usePaginacion.js';
import { useApi } from '../../utils/useApi.js';
import { useTituloPagina } from '../../utils/tituloPagina.js';
import { errorObligatorio, limpiarErrores, enfocarPrimero } from '../../utils/validacion.js';
import { EstadoCarga, EstadoError, EstadoVacio } from '../../components/EstadosAsync.jsx';
import {
  FaStore, FaPlus, FaBoxOpen, FaDollarSign, FaHamburger, FaPen, FaArchive, FaTrash, FaSave,
  FaCalendarAlt, FaThLarge, FaListUl, FaSearch,
} from 'react-icons/fa';
import api from '../../api/index.js';
import './UsuarioNegocio.css';
import './MiCatalogo.css';

const FORM_PRODUCTO = { nombre: '', precio: '', imagen: '', categoria: '' };
const FORM_PUESTO = { nombre: '', descripcion: '', logo: '' };
// Categorías comunes para el <select>. Cualquier otra se escribe eligiendo "Otro…".
const CATEGORIAS_PRODUCTO = ['Bebida', 'Comida', 'Postre', 'Snack'];

const validarProducto = (f, prefijo) => limpiarErrores({
  [`${prefijo}-nombre`]: errorObligatorio(f.nombre, 'Escribí el nombre del producto.'),
  [`${prefijo}-precio`]: f.precio === '' ? 'Escribí el precio.'
    : Number(f.precio) < 0 ? 'El precio no puede ser negativo.' : null,
});

/**
 * Campo de categoría: <select> con las comunes + "Otro…" que despliega un input
 * libre. Evita que se escriban variantes distintas de lo mismo.
 */
function SelectorCategoria({ id, valor, onCambio }) {
  const [otro, setOtro] = useState(valor !== '' && !CATEGORIAS_PRODUCTO.includes(valor));
  return (
    <>
      <select
        id={id}
        value={otro ? 'Otro' : valor}
        onChange={(e) => {
          const v = e.target.value;
          if (v === 'Otro') { setOtro(true); onCambio(''); }
          else { setOtro(false); onCambio(v); }
        }}
      >
        <option value="">Sin categoría</option>
        {CATEGORIAS_PRODUCTO.map(c => <option key={c} value={c}>{c}</option>)}
        <option value="Otro">Otro…</option>
      </select>
      {otro && (
        <input
          type="text"
          placeholder="Nombre de la categoría"
          aria-label="Nombre de la categoría"
          value={valor}
          onChange={(e) => onCambio(e.target.value)}
          autoFocus
        />
      )}
    </>
  );
}

/** Formulario de producto: el mismo para "Añadir" y "Editar". */
function FormProducto({ prefijo, form, setForm, errores, err, guardando, onEnviar, onCancelar, textoEnviar, iconoEnviar }) {
  const cambiar = (campo) => (e) => setForm(f => ({ ...f, [campo]: e.target.value }));
  const idPrecio = `${prefijo}-precio`;
  return (
    <form onSubmit={onEnviar} className="formulario" noValidate>
      <Campo
        id={`${prefijo}-nombre`} etiqueta="Nombre del producto" placeholder="Ej: Hamburguesa simple"
        value={form.nombre} onChange={cambiar('nombre')} error={errores[`${prefijo}-nombre`]}
      />
      <Campo id={idPrecio} etiqueta="Precio base (Bs.)" error={errores[idPrecio]}>
        <div className="input-monto-wrapper">
          <FaDollarSign className="icon-monto" aria-hidden="true" />
          <input
            id={idPrecio} type="number" step="0.50" min="0" placeholder="0.00" className="input-monto"
            value={form.precio} onChange={cambiar('precio')}
            aria-invalid={!!errores[idPrecio]} aria-describedby={errores[idPrecio] ? `${idPrecio}-error` : undefined}
          />
        </div>
      </Campo>
      <Campo id={`${prefijo}-cat`} etiqueta="Categoría (opcional)">
        <SelectorCategoria
          id={`${prefijo}-cat`}
          valor={form.categoria}
          onCambio={(v) => setForm(f => ({ ...f, categoria: v }))}
        />
      </Campo>
      <SubirImagen
        id={`${prefijo}-foto`} etiqueta="Foto (opcional)" carpeta="productos" texto="Hacé clic para subir una foto"
        valor={form.imagen} onCambio={(url) => setForm(f => ({ ...f, imagen: url }))}
      />
      {err && <AvisoFijo tono="error">{err}</AvisoFijo>}
      <div className="modal-actions">
        <Boton variante="secundario" onClick={onCancelar} disabled={guardando}>Cancelar</Boton>
        <Boton type="submit" icono={iconoEnviar} cargando={guardando}>{textoEnviar}</Boton>
      </div>
    </form>
  );
}

export default function MiCatalogoPuesto() {
  const { id } = useParams();
  const navigate = useNavigate();
  const avisos = useAvisos();
  const [confirmar, DialogoConfirmar] = useConfirmar();

  const cargar = useCallback(() => api.puestosBase.obtener(id), [id]);
  const {
    data: puesto,
    setData: setPuesto,
    cargando,
    error,
    recargar,
  } = useApi(cargar, { inicial: null });

  useTituloPagina(puesto ? `Catálogo · ${puesto.nombre}` : 'Catálogo');

  const [showAgregar, setShowAgregar] = useState(false);
  const [formProducto, setFormProducto] = useState(FORM_PRODUCTO);
  const [prodEditandoId, setProdEditandoId] = useState(null);
  const [formProdEditar, setFormProdEditar] = useState(FORM_PRODUCTO);
  const [showEditarPuesto, setShowEditarPuesto] = useState(false);
  const [formPuesto, setFormPuesto] = useState(FORM_PUESTO);
  // Error del servidor dentro del modal abierto; los de cada campo, junto al campo.
  const [err, setErr] = useState('');
  const [intento, setIntento] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // Vista de la lista de productos: tarjetas o tabla (se recuerda por navegador).
  const [vista, setVista] = useState(() => {
    try { return localStorage.getItem('mcat-vista-productos') || 'cards'; } catch { return 'cards'; }
  });
  useEffect(() => {
    try { localStorage.setItem('mcat-vista-productos', vista); } catch { /* ignore */ }
  }, [vista]);

  const [busquedaProd, setBusquedaProd] = useState('');
  const productosFiltrados = useMemo(() => {
    const q = busquedaProd.trim().toLowerCase();
    const lista = puesto?.productos || [];
    if (!q) return lista;
    return lista.filter(pr =>
      pr.nombre.toLowerCase().includes(q) || (pr.categoria || '').toLowerCase().includes(q),
    );
  }, [puesto, busquedaProd]);

  // Paginación de la vista TARJETAS (la de tabla la pagina <Tabla> sola).
  const cardsPag = usePaginacion(productosFiltrados, 12);

  const setProductos = (productos) => setPuesto(p => (p ? { ...p, productos } : p));

  const abrirModal = (abrir) => { setErr(''); setIntento(false); abrir(); };

  // ---------- AÑADIR PRODUCTO (botón → modal) ----------
  const abrirAgregar = () => abrirModal(() => { setFormProducto(FORM_PRODUCTO); setShowAgregar(true); });

  const agregarProducto = async (e) => {
    e.preventDefault();
    setErr('');
    setIntento(true);
    const errs = validarProducto(formProducto, 'mcp-ag');
    if (Object.keys(errs).length) return enfocarPrimero(errs, ['mcp-ag-nombre', 'mcp-ag-precio']);

    setGuardando(true);
    try {
      const nuevo = await api.puestosBase.crearProducto(id, {
        nombre: formProducto.nombre.trim(),
        precio: parseFloat(formProducto.precio),
        imagen: formProducto.imagen || null,
        categoria: formProducto.categoria || null,
      });
      setProductos([...(puesto.productos || []), nuevo]);
      setShowAgregar(false);
      avisos.exito(`"${nuevo.nombre}" se agregó al catálogo.`);
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setGuardando(false);
    }
  };

  // ---------- EDITAR / BORRAR PRODUCTO ----------
  const abrirEditarProducto = (pr) => abrirModal(() => {
    setProdEditandoId(pr.id);
    setFormProdEditar({
      nombre: pr.nombre,
      precio: String(Number(pr.precio)),
      imagen: pr.imagen || '',
      categoria: pr.categoria || '',
    });
  });

  const guardarEdicionProducto = async (e) => {
    e.preventDefault();
    setErr('');
    setIntento(true);
    const errs = validarProducto(formProdEditar, 'mcp-ed');
    if (Object.keys(errs).length) return enfocarPrimero(errs, ['mcp-ed-nombre', 'mcp-ed-precio']);

    setGuardando(true);
    try {
      const actualizado = await api.puestosBase.actualizarProducto(prodEditandoId, {
        nombre: formProdEditar.nombre.trim(),
        precio: parseFloat(formProdEditar.precio),
        imagen: formProdEditar.imagen || null,
        categoria: formProdEditar.categoria || null,
      });
      setProductos(puesto.productos.map(pr => pr.id === prodEditandoId ? { ...pr, ...actualizado } : pr));
      setProdEditandoId(null);
      avisos.exito('Los cambios del producto quedaron guardados.');
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setGuardando(false);
    }
  };

  const eliminarProducto = async (pr) => {
    const ok = await confirmar({
      titulo: `¿Eliminar "${pr.nombre}"?`,
      mensaje: 'Si ya se vendió alguna vez, se archiva (no se borra) para conservar el historial.',
      textoConfirmar: 'Eliminar',
      peligroso: true,
    });
    if (!ok) return;
    try {
      await api.puestosBase.eliminarProducto(pr.id);
      setProductos(puesto.productos.filter(x => x.id !== pr.id));
      avisos.exito(`"${pr.nombre}" se quitó del catálogo.`);
    } catch (e2) {
      avisos.error(e2.message, { titulo: 'No se pudo quitar el producto' });
    }
  };

  // ---------- EDITAR / ARCHIVAR PUESTO ----------
  const abrirEditarPuesto = () => abrirModal(() => {
    setFormPuesto({ nombre: puesto.nombre, descripcion: puesto.descripcion || '', logo: puesto.logo || '' });
    setShowEditarPuesto(true);
  });

  const guardarPuesto = async (e) => {
    e.preventDefault();
    setErr('');
    setIntento(true);
    if (errorObligatorio(formPuesto.nombre)) return document.getElementById('mcp-nombre')?.focus();

    setGuardando(true);
    try {
      await api.puestosBase.actualizar(id, {
        nombre: formPuesto.nombre.trim(),
        descripcion: formPuesto.descripcion.trim() || null,
        logo: formPuesto.logo || null,
      });
      await recargar();
      setShowEditarPuesto(false);
      avisos.exito('Los datos del puesto quedaron guardados.');
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setGuardando(false);
    }
  };

  const archivarPuesto = async () => {
    const ok = await confirmar({
      titulo: `¿Archivar "${puesto.nombre}"?`,
      mensaje: 'Dejará de aparecer en tu catálogo y no podrás activarlo en nuevos eventos. Los eventos donde ya está activado y sus ventas no se tocan.',
      textoConfirmar: 'Archivar',
      peligroso: true,
    });
    if (!ok) return;
    try {
      await api.puestosBase.archivar(id);
      avisos.exito(`"${puesto.nombre}" se archivó.`);
      navigate('/usuarionegocio/catalogo');
    } catch (e2) {
      avisos.error(e2.message, { titulo: 'No se pudo archivar el puesto' });
    }
  };

  const volverAlCatalogo = () => navigate('/usuarionegocio/catalogo');
  const migas = [
    { texto: 'Mi Catálogo', to: '/usuarionegocio/catalogo' },
    { texto: puesto?.nombre || 'Puesto', actual: true },
  ];

  if (error || cargando || !puesto) {
    return (
      <div className="pi-unegocio-container">
        <div className="qp-nav">
          <BotonVolver onClick={volverAlCatalogo}>Volver a Mi Catálogo</BotonVolver>
          <Migas items={migas} />
        </div>
        {error ? <EstadoError onReintentar={recargar} /> : <EstadoCarga filas={4} />}
      </div>
    );
  }

  const erroresAgregar = intento && showAgregar ? validarProducto(formProducto, 'mcp-ag') : {};
  const erroresEditar = intento && prodEditandoId ? validarProducto(formProdEditar, 'mcp-ed') : {};
  const errorNombrePuesto = intento && showEditarPuesto ? errorObligatorio(formPuesto.nombre, 'Escribí el nombre del puesto.') : null;

  const vacioProductos = busquedaProd.trim()
    ? <EstadoVacio compacto icono={FaSearch} titulo="Ningún producto coincide con la búsqueda" />
    : (
      <EstadoVacio
        icono={FaHamburger}
        titulo="Todavía no hay productos en este puesto"
        mensaje="Agregá el primero: después vas a poder ajustar su precio y stock en cada evento."
        accion={<Boton icono={FaPlus} onClick={abrirAgregar}>Añadir producto</Boton>}
      />
    );

  return (
    <div className="pi-unegocio-container">
      <div className="qp-nav">
        <BotonVolver onClick={volverAlCatalogo}>Volver a Mi Catálogo</BotonVolver>
        <Migas items={migas} />
      </div>

      <div className="pi-unegocio-header-wrapper">
        <div className="pi-mcat-detalle-head">
          <div
            className="pi-mcat-detalle-media"
            style={puesto.logo ? { backgroundImage: `url(${puesto.logo})` } : undefined}
          >
            {!puesto.logo && <FaStore aria-hidden="true" />}
          </div>
          <div>
            <h1>{puesto.nombre}</h1>
            {puesto.descripcion && <p>{puesto.descripcion}</p>}
            <div className="pi-mcat-card__chips pi-mcat-card__chips--mt">
              <Insignia tono="neutro" icono={FaBoxOpen}>
                {puesto.productos.length} producto{puesto.productos.length === 1 ? '' : 's'}
              </Insignia>
              <Insignia tono="info" icono={FaCalendarAlt}>
                activo en {puesto._count?.puestos ?? 0} evento{(puesto._count?.puestos ?? 0) === 1 ? '' : 's'}
              </Insignia>
            </div>
          </div>
        </div>

        <div className="btn-acciones">
          <Boton variante="secundario" tamano="sm" icono={FaPen} onClick={abrirEditarPuesto}>Editar puesto</Boton>
          <Boton variante="peligro-suave" tamano="sm" icono={FaArchive} onClick={archivarPuesto}>Archivar</Boton>
        </div>
      </div>

      <div className="pi-mcat-prod-bar">
        <h2><FaBoxOpen aria-hidden="true" /> Productos del catálogo</h2>
        <div className="btn-acciones">
          <Pestanas
            etiqueta="Ver productos como"
            activo={vista}
            onCambio={setVista}
            items={[
              { id: 'cards', etiqueta: 'Ver como tarjetas', icono: FaThLarge, soloIcono: true },
              { id: 'tabla', etiqueta: 'Ver como tabla', icono: FaListUl, soloIcono: true },
            ]}
          />
          <Boton icono={FaPlus} onClick={abrirAgregar}>Añadir producto</Boton>
        </div>
      </div>

      {puesto.productos.length > 0 && (
        <div className="pi-mcat-prod-buscador">
          <Buscador
            valor={busquedaProd}
            onCambio={setBusquedaProd}
            placeholder="Buscar producto por nombre o categoría…"
            etiqueta="Buscar producto"
          />
        </div>
      )}

      {vista === 'tabla' ? (
        productosFiltrados.length === 0 ? vacioProductos : (
          <Tabla
            card
            columnas={['Producto', 'Categoría', 'Precio base', { texto: 'Acciones', align: 'center' }]}
            datos={productosFiltrados}
            porPagina={8}
            renderFila={pr => (
              <tr key={pr.id}>
                <td>
                  <div className="item-info">
                    {pr.imagen ? (
                      <img width="48" height="48" src={pr.imagen} alt="" className="item-img img-cuadrada" />
                    ) : (
                      <div className="item-no-img img-cuadrada"><FaHamburger aria-hidden="true" /></div>
                    )}
                    <span className="fila-nombre">{pr.nombre}</span>
                  </div>
                </td>
                <td>{pr.categoria ? <Insignia tono="neutro">{pr.categoria}</Insignia> : '—'}</td>
                <td className="fila-nombre">Bs. {Number(pr.precio).toFixed(2)}</td>
                <td className="td-centro">
                  <div className="btn-acciones">
                    <Boton variante="secundario" tamano="sm" icono={FaPen} onClick={() => abrirEditarProducto(pr)}>Editar</Boton>
                    <Boton variante="peligro-suave" tamano="sm" icono={FaTrash} onClick={() => eliminarProducto(pr)}>Quitar</Boton>
                  </div>
                </td>
              </tr>
            )}
          />
        )
      ) : productosFiltrados.length === 0 ? vacioProductos : (
        <>
          {/* Grilla de productos: tarjetas propias por pedido del usuario (no son eventos). */}
          <div className="pi-mcat-prod-grid qp-escalonado">
            {cardsPag.slice.map(pr => (
              <div key={pr.id} className="pi-mcat-prod-card">
                <div
                  className="pi-mcat-prod-card__media"
                  style={pr.imagen ? { backgroundImage: `url(${pr.imagen})` } : undefined}
                >
                  {!pr.imagen && <FaHamburger aria-hidden="true" />}
                </div>
                <div className="pi-mcat-prod-card__body">
                  <span className="pi-mcat-prod-card__nombre">{pr.nombre}</span>
                  <span className="pi-mcat-prod-card__cat">{pr.categoria || 'Sin categoría'}</span>
                  <span className="pi-mcat-prod-card__precio">Bs. {Number(pr.precio).toFixed(2)}</span>
                </div>
                <div className="pi-mcat-prod-card__acciones">
                  <Boton variante="fantasma" tamano="sm" icono={FaPen} onClick={() => abrirEditarProducto(pr)}>Editar</Boton>
                  <Boton variante="peligro-suave" tamano="sm" icono={FaTrash} onClick={() => eliminarProducto(pr)}>Quitar</Boton>
                </div>
              </div>
            ))}
          </div>
          <Paginador
            pagina={cardsPag.paginaActual}
            totalPaginas={cardsPag.totalPaginas}
            onCambio={cardsPag.setPagina}
            total={cardsPag.total}
            unidad="productos"
          />
        </>
      )}

      {/* AÑADIR PRODUCTO */}
      {showAgregar && (
        <Modal titulo={<><FaPlus aria-hidden="true" /> Añadir producto</>} onCerrar={() => setShowAgregar(false)}>
          <FormProducto
            prefijo="mcp-ag" form={formProducto} setForm={setFormProducto} errores={erroresAgregar}
            err={err} guardando={guardando} onEnviar={agregarProducto} onCancelar={() => setShowAgregar(false)}
            textoEnviar="Añadir" iconoEnviar={FaPlus}
          />
        </Modal>
      )}

      {/* EDITAR UN PRODUCTO */}
      {prodEditandoId && (
        <Modal titulo={<><FaPen aria-hidden="true" /> Editar producto</>} onCerrar={() => setProdEditandoId(null)}>
          <FormProducto
            prefijo="mcp-ed" form={formProdEditar} setForm={setFormProdEditar} errores={erroresEditar}
            err={err} guardando={guardando} onEnviar={guardarEdicionProducto} onCancelar={() => setProdEditandoId(null)}
            textoEnviar="Guardar cambios" iconoEnviar={FaSave}
          />
        </Modal>
      )}

      {/* EDITAR EL PUESTO */}
      {showEditarPuesto && (
        <Modal titulo={<><FaStore aria-hidden="true" /> Editar puesto base</>} onCerrar={() => setShowEditarPuesto(false)}>
          <form onSubmit={guardarPuesto} className="formulario" noValidate>
            <Campo
              id="mcp-nombre" etiqueta="Nombre del puesto"
              value={formPuesto.nombre} onChange={(e) => setFormPuesto(f => ({ ...f, nombre: e.target.value }))}
              error={errorNombrePuesto}
            />
            <Campo
              id="mcp-desc" etiqueta="Breve descripción"
              value={formPuesto.descripcion} onChange={(e) => setFormPuesto(f => ({ ...f, descripcion: e.target.value }))}
            />
            <SubirImagen
              id="mcp-logo" etiqueta="Logo o foto del puesto (opcional)" carpeta="puestos" texto="Hacé clic para subir el logo"
              valor={formPuesto.logo} onCambio={(url) => setFormPuesto(f => ({ ...f, logo: url }))}
            />
            {err && <AvisoFijo tono="error">{err}</AvisoFijo>}
            <div className="modal-actions">
              <Boton variante="secundario" onClick={() => setShowEditarPuesto(false)} disabled={guardando}>Cancelar</Boton>
              <Boton type="submit" icono={FaSave} cargando={guardando}>Guardar cambios</Boton>
            </div>
          </form>
        </Modal>
      )}

      {DialogoConfirmar}
    </div>
  );
}
