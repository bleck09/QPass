import { useMemo, useState } from 'react';
import {
  FaStore, FaShoppingCart, FaPlus, FaMinus, FaTrash, FaQrcode, FaTimes,
  FaIdCard, FaWallet, FaCheckCircle, FaExclamationTriangle, FaHistory,
  FaReceipt, FaHamburger
} from 'react-icons/fa';
import './Ayudante.css';

// --- PUESTO ASIGNADO AL AYUDANTE (con su catálogo de productos) ---
const puestoAsignado = {
  nombre: 'Pizzas El Paso',
  descripcion: 'Pizzas artesanales, porciones y bebidas frías.',
  logo: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?ixlib=rb-4.0.3&w=150&q=80',
  productos: [
    { id: 101, nombre: 'Porción de Pizza Pepperoni', precio: 15, imagen: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&q=80' },
    { id: 102, nombre: 'Porción de Pizza Hawaiana', precio: 15, imagen: null },
    { id: 103, nombre: 'Gaseosa 500ml', precio: 10, imagen: null },
    { id: 104, nombre: 'Agua Mineral', precio: 5, imagen: null },
  ],
};

// --- DATOS SIMULADOS DE CLIENTES (usuarios normales con saldo) ---
const clientesIniciales = [
  { id: 1, nombre: 'María Fernanda Rojas', documento: '7451236 LP', foto: 'https://i.pravatar.cc/300?img=47', saldo: 120 },
  { id: 2, nombre: 'Jorge Luis Quispe', documento: '6621345 SC', foto: 'https://i.pravatar.cc/300?img=12', saldo: 45 },
  { id: 3, nombre: 'Ana Belén Castro', documento: '5589214 CB', foto: 'https://i.pravatar.cc/300?img=32', saldo: 8 },
  { id: 4, nombre: 'Ricardo Alanoca Mamani', documento: '4471258 LP', foto: 'https://i.pravatar.cc/300?img=51', saldo: 300 },
  { id: 5, nombre: 'Daniela Vargas Soto', documento: '7789456 SC', foto: 'https://i.pravatar.cc/300?img=25', saldo: 80 },
  { id: 6, nombre: 'Paola Andrea Terrazas', documento: '6654123 CB', foto: 'https://i.pravatar.cc/300?img=45', saldo: 200 },
];

const fechaHoraActual = () => {
  const ahora = new Date();
  return {
    fecha: ahora.toLocaleDateString('es-BO'),
    hora: ahora.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' }),
  };
};

export default function Ayudante() {
  const [puesto] = useState(puestoAsignado);
  const [clientes, setClientes] = useState(clientesIniciales);

  const [pestana, setPestana] = useState('vender'); // vender | historial
  const [carrito, setCarrito] = useState([]);

  const [tarjetaQR, setTarjetaQR] = useState(null);
  const [escaneando, setEscaneando] = useState(false);
  const [ventaExitosa, setVentaExitosa] = useState(null);
  const [ventas, setVentas] = useState([]);

  const totalCarrito = useMemo(
    () => carrito.reduce((suma, item) => suma + item.precio * item.cantidad, 0),
    [carrito]
  );
  const cantidadItemsCarrito = useMemo(
    () => carrito.reduce((suma, item) => suma + item.cantidad, 0),
    [carrito]
  );
  const totalVentasHoy = useMemo(
    () => ventas.reduce((suma, v) => suma + v.total, 0),
    [ventas]
  );

  const saldoInsuficiente = tarjetaQR && totalCarrito > tarjetaQR.saldo;

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
    setEscaneando(true);
    setTimeout(() => {
      const elegido = clientes[Math.floor(Math.random() * clientes.length)];
      setEscaneando(false);
      setTarjetaQR(elegido);
    }, 700);
  };

  const cerrarTarjeta = () => {
    setTarjetaQR(null);
    setVentaExitosa(null);
  };

  const confirmarCobro = () => {
    if (!tarjetaQR || carrito.length === 0 || totalCarrito > tarjetaQR.saldo) return;

    const nuevoSaldo = tarjetaQR.saldo - totalCarrito;
    const { fecha, hora } = fechaHoraActual();

    setClientes(prev => prev.map(c => c.id === tarjetaQR.id ? { ...c, saldo: nuevoSaldo } : c));

    setVentas(prev => [
      {
        id: Date.now(),
        cliente: tarjetaQR.nombre,
        documento: tarjetaQR.documento,
        foto: tarjetaQR.foto,
        items: carrito.map(i => ({ nombre: i.nombre, cantidad: i.cantidad, precio: i.precio })),
        cantidadItems: cantidadItemsCarrito,
        total: totalCarrito,
        saldoResultante: nuevoSaldo,
        fecha,
        hora,
      },
      ...prev,
    ]);

    setVentaExitosa({ monto: totalCarrito, saldo: nuevoSaldo });
    setCarrito([]);
  };

  return (
    <div className="pi-ayu-container">

      {/* --- CABECERA CON EL NOMBRE DEL NEGOCIO --- */}
      <div className="pi-ayu-header-wrapper">
        <div className="pi-ayu-header-negocio">
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
              {puesto.productos.map(producto => {
                const enCarrito = carrito.find(i => i.id === producto.id);
                return (
                  <div className="pi-ayu-producto-card" key={producto.id}>
                    {producto.imagen
                      ? <img src={producto.imagen} alt={producto.nombre} className="pi-ayu-producto-img" />
                      : <div className="pi-ayu-producto-img-placeholder"><FaHamburger /></div>}
                    <span className="pi-ayu-producto-nombre">{producto.nombre}</span>
                    <span className="pi-ayu-producto-precio">{producto.precio} pts</span>

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
              disabled={carrito.length === 0 || escaneando}
            >
              <FaQrcode /> {escaneando ? 'Escaneando...' : 'Escanear QR para cobrar'}
            </button>
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
                  <th>Saldo Resultante</th>
                  <th>Fecha</th>
                  <th>Hora</th>
                </tr>
              </thead>
              <tbody>
                {ventas.map(venta => (
                  <tr key={venta.id}>
                    <td>
                      <div className="pi-ayu-fila-persona">
                        <img src={venta.foto} alt={venta.cliente} className="pi-ayu-mini-avatar" />
                        <span>{venta.cliente}</span>
                      </div>
                    </td>
                    <td>{venta.documento}</td>
                    <td>
                      <span className="pi-ayu-badge-items">
                        {venta.cantidadItems} {venta.cantidadItems === 1 ? 'producto' : 'productos'}
                      </span>
                    </td>
                    <td className="pi-ayu-monto-celda">-{venta.total} pts</td>
                    <td>{venta.saldoResultante} pts</td>
                    <td>{venta.fecha}</td>
                    <td>{venta.hora}</td>
                  </tr>
                ))}
                {ventas.length === 0 && (
                  <tr>
                    <td colSpan={7} className="pi-ayu-sin-resultados">
                      Aún no has realizado ninguna venta en esta sesión.
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

                <img src={tarjetaQR.foto} alt={tarjetaQR.nombre} className="pi-ayu-tarjeta-foto" />
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
