import { useEffect, useMemo, useState } from 'react';
import {
  FaStore, FaShoppingCart, FaPlus, FaMinus, FaTrash, FaQrcode, FaTimes,
  FaIdCard, FaWallet, FaCheckCircle, FaExclamationTriangle, FaHistory,
  FaReceipt, FaHamburger, FaArrowLeft
} from 'react-icons/fa';
import api from '../../api/index.js';
import { leerSesion } from '../../api/client.js';
import EscanerQr from '../../components/EscanerQr.jsx';
import './Ayudante.css';

export default function Ayudante() {
  const sesion = leerSesion();
  const [puestosAsignados, setPuestosAsignados] = useState(null); // null = cargando
  const [puesto, setPuesto] = useState(null);
  const [productos, setProductos] = useState([]);

  const [pestana, setPestana] = useState('vender'); // vender | historial
  const [carrito, setCarrito] = useState([]);

  const [tarjetaQR, setTarjetaQR] = useState(null);
  const [escaneando, setEscaneando] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [errorEscaneo, setErrorEscaneo] = useState('');
  const [ventaExitosa, setVentaExitosa] = useState(null);
  const [ventas, setVentas] = useState([]);

  useEffect(() => {
    api.puestoAyudantes.listar({ ayudanteId: sesion.id }).then(lista => {
      setPuestosAsignados(lista.map(a => a.puesto));
    });
  }, []);

  const seleccionarPuesto = (p) => {
    setPuesto(p);
    api.productos.listar(p.id).then(setProductos);
    api.ventas.listar({ puestoId: p.id }).then(setVentas);
  };

  const totalCarrito = useMemo(
    () => carrito.reduce((suma, item) => suma + Number(item.precio) * item.cantidad, 0),
    [carrito]
  );
  const cantidadItemsCarrito = useMemo(
    () => carrito.reduce((suma, item) => suma + item.cantidad, 0),
    [carrito]
  );
  const totalVentasHoy = useMemo(
    () => ventas.reduce((suma, v) => suma + Number(v.montoTotal), 0),
    [ventas]
  );

  const saldoInsuficiente = tarjetaQR && totalCarrito > Number(tarjetaQR.saldo);

  // --- LÓGICA DEL CARRITO ---
  const agregarProducto = (producto) => {
    setCarrito(prev => {
      const existente = prev.find(i => i.id === producto.id);
      if (existente) {
        return prev.map(i => i.id === producto.id ? { ...i, cantidad: i.cantidad + 1 } : i);
      }
      return [...prev, { ...producto, cantidad: 1 }];
    });
  };

  const cambiarCantidad = (id, delta) => {
    setCarrito(prev => prev.flatMap(item => {
      if (item.id !== id) return [item];
      const nuevaCantidad = item.cantidad + delta;
      return nuevaCantidad <= 0 ? [] : [{ ...item, cantidad: nuevaCantidad }];
    }));
  };

  const quitarDelCarrito = (id) => setCarrito(prev => prev.filter(item => item.id !== id));

  const vaciarCarrito = () => setCarrito([]);

  // --- LÓGICA DE COBRO ---
  const iniciarCobro = () => {
    if (carrito.length === 0) return;
    setErrorEscaneo('');
    setEscaneando(true);
  };

  const handleCodigoDetectado = async (codigo) => {
    setEscaneando(false);
    setBuscando(true);
    try {
      const entrada = await api.entradas.buscarPorCodigo(codigo);
      if (!entrada.usuarioId) {
        setErrorEscaneo('Este participante no tiene una cuenta con billetera — no se le puede cobrar.');
        return;
      }
      setVentaExitosa(null);
      setTarjetaQR({ ...entrada, saldo: Number(entrada.usuario?.saldo ?? 0) });
    } catch (err) {
      setErrorEscaneo(err.message);
    } finally {
      setBuscando(false);
    }
  };

  const cerrarTarjeta = () => {
    setTarjetaQR(null);
    setVentaExitosa(null);
  };

  const confirmarCobro = async () => {
    if (!tarjetaQR || carrito.length === 0 || totalCarrito > Number(tarjetaQR.saldo)) return;

    const nuevoSaldo = Number(tarjetaQR.saldo) - totalCarrito;
    await api.ventas.crear({
      puestoId: puesto.id,
      entradaId: tarjetaQR.id,
      items: carrito.map(i => ({ productoId: i.id, cantidad: i.cantidad })),
    });

    api.ventas.listar({ puestoId: puesto.id }).then(setVentas);
    setVentaExitosa({ monto: totalCarrito, saldo: nuevoSaldo });
    setCarrito([]);
  };

  if (puestosAsignados === null) return null;

  if (puestosAsignados.length === 0) {
    return (
      <div className="pi-ayu-container">
        <div className="pi-ayu-header-wrapper">
          <h2>Vender / Cobrar</h2>
        </div>
        <p className="pi-ayu-carrito-vacio">Todavía no tienes ningún puesto asignado. Pídele a tu Usuario Negocio que te asigne uno.</p>
      </div>
    );
  }

  if (!puesto) {
    return (
      <div className="pi-ayu-container">
        <div className="pi-ayu-header-wrapper">
          <h2>Selecciona tu puesto</h2>
        </div>
        <div className="pi-ayu-productos-grid">
          {puestosAsignados.map(p => (
            <button key={p.id} type="button" className="pi-ayu-producto-card" onClick={() => seleccionarPuesto(p)}>
              {p.logo
                ? <img src={p.logo} alt={p.nombre} className="pi-ayu-producto-img" />
                : <div className="pi-ayu-producto-img-placeholder"><FaStore /></div>}
              <span className="pi-ayu-producto-nombre">{p.nombre}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="pi-ayu-container">

      {/* --- CABECERA CON EL NOMBRE DEL NEGOCIO --- */}
      <div className="pi-ayu-header-wrapper">
        <div className="pi-ayu-header-negocio">
          {puestosAsignados.length > 1 && (
            <button className="pi-ayu-btn-quitar" onClick={() => setPuesto(null)} title="Cambiar de puesto"><FaArrowLeft /></button>
          )}
          {puesto.logo
            ? <img src={puesto.logo} alt={puesto.nombre} className="pi-ayu-logo-negocio" />
            : <div className="pi-ayu-logo-placeholder"><FaStore /></div>}
          <div>
            <span className="pi-ayu-eyebrow">Punto de venta</span>
            <h2>{puesto.nombre}</h2>
            <p>{puesto.descripcion}</p>
          </div>
        </div>

        <div className="pi-ayu-kpi">
          <span className="micro-etiqueta">Vendido hoy</span>
          <div className="kpi-valor">
            <FaReceipt className="kpi-icon" />
            <span className="numero-grande">{totalVentasHoy} pts</span>
          </div>
        </div>
      </div>

      <div className="pi-ayu-tabs">
        <button className={pestana === 'vender' ? 'activo' : ''} onClick={() => setPestana('vender')}>
          <FaShoppingCart /> Vender
        </button>
        <button className={pestana === 'historial' ? 'activo' : ''} onClick={() => setPestana('historial')}>
          <FaHistory /> Historial ({ventas.length})
        </button>
      </div>

      {/* --- PESTAÑA: VENDER --- */}
      {pestana === 'vender' && (
        <div className="pi-ayu-vender-layout">

          <div className="pi-ayu-productos">
            <h3>Catálogo de productos</h3>
            <div className="pi-ayu-productos-grid">
              {productos.map(producto => {
                const enCarrito = carrito.find(i => i.id === producto.id);
                return (
                  <div className="pi-ayu-producto-card" key={producto.id}>
                    {producto.imagen
                      ? <img src={producto.imagen} alt={producto.nombre} className="pi-ayu-producto-img" />
                      : <div className="pi-ayu-producto-img-placeholder"><FaHamburger /></div>}
                    <span className="pi-ayu-producto-nombre">{producto.nombre}</span>
                    <span className="pi-ayu-producto-precio">{Number(producto.precio)} pts</span>

                    {enCarrito ? (
                      <div className="pi-ayu-producto-stepper">
                        <button type="button" onClick={() => cambiarCantidad(producto.id, -1)}><FaMinus /></button>
                        <span>{enCarrito.cantidad}</span>
                        <button type="button" onClick={() => cambiarCantidad(producto.id, 1)}><FaPlus /></button>
                      </div>
                    ) : (
                      <button type="button" className="pi-ayu-btn-agregar" onClick={() => agregarProducto(producto)}>
                        <FaPlus /> Agregar
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pi-ayu-carrito">
            <h3><FaShoppingCart /> Venta actual</h3>

            {carrito.length === 0 ? (
              <p className="pi-ayu-carrito-vacio">Selecciona productos del catálogo para iniciar una venta.</p>
            ) : (
              <>
                <div className="pi-ayu-carrito-lista">
                  {carrito.map(item => (
                    <div className="pi-ayu-carrito-item" key={item.id}>
                      <div className="pi-ayu-carrito-item-info">
                        <span className="nombre">{item.nombre}</span>
                        <span className="precio-unit">{item.precio} pts c/u</span>
                      </div>
                      <div className="pi-ayu-producto-stepper">
                        <button type="button" onClick={() => cambiarCantidad(item.id, -1)}><FaMinus /></button>
                        <span>{item.cantidad}</span>
                        <button type="button" onClick={() => cambiarCantidad(item.id, 1)}><FaPlus /></button>
                      </div>
                      <span className="pi-ayu-carrito-subtotal">{item.precio * item.cantidad} pts</span>
                      <button type="button" className="pi-ayu-btn-quitar" onClick={() => quitarDelCarrito(item.id)}>
                        <FaTrash />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="pi-ayu-carrito-total">
                  <span>Total ({cantidadItemsCarrito} {cantidadItemsCarrito === 1 ? 'producto' : 'productos'})</span>
                  <strong>{totalCarrito} pts</strong>
                </div>

                <button type="button" className="pi-ayu-btn-vaciar" onClick={vaciarCarrito}>
                  Vaciar venta
                </button>
              </>
            )}

            <button
              type="button"
              className="pi-ayu-btn-escanear"
              onClick={iniciarCobro}
              disabled={carrito.length === 0 || escaneando || buscando}
            >
              <FaQrcode /> {buscando ? 'Buscando...' : 'Escanear QR para cobrar'}
            </button>
            {errorEscaneo && (
              <p className="pi-ayu-alerta-error">
                <FaExclamationTriangle /> {errorEscaneo}
              </p>
            )}
          </div>
        </div>
      )}

      {/* --- MODAL: ESCÁNER DE QR (cámara real) --- */}
      {escaneando && (
        <div className="pi-ayu-modal-overlay" onClick={() => setEscaneando(false)}>
          <div className="pi-ayu-modal-tarjeta" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ textAlign: 'center', marginBottom: '14px' }}><FaQrcode /> Escanear manilla</h3>
            <EscanerQr onDetectado={handleCodigoDetectado} onCancelar={() => setEscaneando(false)} />
          </div>
        </div>
      )}

      {/* --- PESTAÑA: HISTORIAL --- */}
      {pestana === 'historial' && (
        <div className="pi-ayu-historial">
          <div className="pi-ayu-tabla-wrapper">
            <table className="pi-ayu-tabla">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Documento</th>
                  <th>Productos</th>
                  <th>Total</th>
                  <th>Fecha</th>
                  <th>Hora</th>
                </tr>
              </thead>
              <tbody>
                {ventas.map(venta => {
                  const cantidadItems = venta.items.reduce((s, i) => s + i.cantidad, 0);
                  return (
                    <tr key={venta.id}>
                      <td>
                        <div className="pi-ayu-fila-persona">
                          {venta.entrada?.foto && <img src={venta.entrada.foto} alt={venta.entrada.nombre} className="pi-ayu-mini-avatar" />}
                          <span>{venta.entrada?.nombre || '—'}</span>
                        </div>
                      </td>
                      <td>{venta.entrada?.documento || '—'}</td>
                      <td>
                        <span className="pi-ayu-badge-items">
                          {cantidadItems} {cantidadItems === 1 ? 'producto' : 'productos'}
                        </span>
                      </td>
                      <td className="pi-ayu-monto-celda">-{Number(venta.montoTotal)} pts</td>
                      <td>{new Date(venta.createdAt).toLocaleDateString('es-BO')}</td>
                      <td>{new Date(venta.createdAt).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}</td>
                    </tr>
                  );
                })}
                {ventas.length === 0 && (
                  <tr>
                    <td colSpan={6} className="pi-ayu-sin-resultados">
                      Aún no has realizado ninguna venta.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TARJETA GRANDE AL ESCANEAR QR --- */}
      {tarjetaQR && (
        <div className="pi-ayu-modal-overlay" onClick={cerrarTarjeta}>
          <div className="pi-ayu-modal-tarjeta" onClick={(e) => e.stopPropagation()}>
            <button className="pi-ayu-btn-cerrar" onClick={cerrarTarjeta}><FaTimes /></button>

            {ventaExitosa ? (
              <div className="pi-ayu-exito">
                <FaCheckCircle size={60} color="var(--verde-recarga)" />
                <h3>¡Venta cobrada!</h3>
                <p>Se descontaron <strong>{ventaExitosa.monto} pts</strong> a {tarjetaQR.nombre}.</p>
                <div className="pi-ayu-exito-saldo">
                  <FaWallet /> Saldo restante: <strong>{ventaExitosa.saldo} pts</strong>
                </div>
                <button className="pi-ayu-btn-confirmar" onClick={cerrarTarjeta}>Listo</button>
              </div>
            ) : (
              <>
                <div className={`pi-ayu-tarjeta-estado ${saldoInsuficiente ? 'aviso' : 'ok'}`}>
                  {saldoInsuficiente
                    ? <><FaExclamationTriangle /> Saldo insuficiente</>
                    : <><FaCheckCircle /> Código QR Válido</>}
                </div>

                {tarjetaQR.foto && <img src={tarjetaQR.foto} alt={tarjetaQR.nombre} className="pi-ayu-tarjeta-foto" />}
                <h2 className="pi-ayu-tarjeta-nombre">{tarjetaQR.nombre}</h2>

                <div className="pi-ayu-tarjeta-datos">
                  <div className="pi-ayu-tarjeta-dato">
                    <FaIdCard />
                    <div>
                      <span className="label">Documento</span>
                      <span className="valor">{tarjetaQR.documento}</span>
                    </div>
                  </div>
                  <div className="pi-ayu-tarjeta-dato">
                    <FaWallet />
                    <div>
                      <span className="label">Saldo Actual</span>
                      <span className="valor">{tarjetaQR.saldo} pts</span>
                    </div>
                  </div>
                </div>

                <div className="pi-ayu-resumen-venta">
                  <span className="pi-ayu-resumen-titulo">Resumen de la venta</span>
                  {carrito.map(item => (
                    <div className="pi-ayu-resumen-item" key={item.id}>
                      <span>{item.cantidad} × {item.nombre}</span>
                      <span>{item.precio * item.cantidad} pts</span>
                    </div>
                  ))}
                  <div className="pi-ayu-resumen-total">
                    <span>Total a cobrar</span>
                    <strong>{totalCarrito} pts</strong>
                  </div>
                </div>

                {saldoInsuficiente && (
                  <div className="pi-ayu-alerta-error">
                    <FaExclamationTriangle /> El saldo disponible ({tarjetaQR.saldo} pts) no alcanza para cubrir esta venta.
                  </div>
                )}

                <div className="pi-ayu-tarjeta-acciones">
                  <button className="pi-ayu-btn-cancelar" onClick={cerrarTarjeta}>Cancelar</button>
                  <button
                    className="pi-ayu-btn-confirmar"
                    onClick={confirmarCobro}
                    disabled={saldoInsuficiente}
                  >
                    <FaCheckCircle /> Confirmar Cobro
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
