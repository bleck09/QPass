import { useEffect, useState } from 'react';
import {
  FaQrcode, FaUser, FaCalendarCheck, FaStore, FaUserFriends, FaWallet,
  FaUserShield, FaUndoAlt, FaCogs, FaCheck,
} from 'react-icons/fa';
import { useRevelar } from '../../utils/useRevelar.js';
import { useContador } from '../../utils/useContador.js';
import './InfoSecciones.css';
import './EcosistemaSection.css';

// Los 8 roles reales del sistema (constants/roles.js), con nombres para el
// público. Lo que "puede" cada uno sale de lo que la app ya hace.
const ROLES = [
  { icono: FaUser, nombre: 'Asistente', grupo: 'Público', texto: 'Compra su entrada, recibe su manilla y paga todo adentro sin efectivo.', puede: ['Comprar entradas para su grupo', 'Ver su saldo e historial', 'Pagar con su manilla'] },
  { icono: FaCalendarCheck, nombre: 'Organizador', grupo: 'Cliente', texto: 'Pide su evento, arma su página y sigue cada venta desde su panel.', puede: ['Solicitar su evento con página propia', 'Seguir ventas en su dashboard', 'Recibir el informe de cierre'] },
  { icono: FaStore, nombre: 'Negocio', grupo: 'Aliado', texto: 'Vende en su puesto dentro del evento y cobra con la manilla.', puede: ['Cargar su catálogo y stock', 'Crear cuentas para ayudantes', 'Ver las ventas de cada puesto'] },
  { icono: FaUserFriends, nombre: 'Ayudante', grupo: 'Equipo del negocio', texto: 'Atiende el puesto y cobra escaneando la manilla del cliente.', puede: ['Escanear manillas para cobrar', 'Vender del catálogo del puesto', 'Trabajar en su puesto asignado'] },
  { icono: FaWallet, nombre: 'Recargador', grupo: 'Personal del evento', texto: 'Carga saldo en las manillas en los puntos de recarga.', puede: ['Cargar saldo en manillas', 'Llevar su propia caja', 'Hacer su corte de caja'] },
  { icono: FaUserShield, nombre: 'Supervisor', grupo: 'Personal del evento', texto: 'Entrega las manillas y está atento a cualquier alerta.', puede: ['Entregar manillas físicas', 'Atender alertas de duplicados', 'Seguir la operación del evento'] },
  { icono: FaUndoAlt, nombre: 'Devolución', grupo: 'Personal del evento', texto: 'Devuelve al asistente el saldo que no llegó a usar.', puede: ['Devolver saldo no usado', 'Registrar cada devolución', 'Cerrar su caja'] },
  { icono: FaCogs, nombre: 'Admin QPass', grupo: 'Equipo QPass', texto: 'Arma y publica los eventos, aprueba pagos y audita todo.', puede: ['Aprobar pagos de entradas', 'Armar y publicar eventos', 'Auditar cada movimiento'] },
];

const INTERVALO = 3500;

function Cifra({ valor, etiqueta, activo }) {
  const actual = useContador(valor, activo);
  return (
    <div className="qp-eco__cifra">
      <strong>{actual}</strong>
      <span>{etiqueta}</span>
    </div>
  );
}

/**
 * "Una plataforma, todos conectados": los roles de QPass en órbita alrededor
 * del QR. Recorre los roles solo (se pausa al pasar el mouse o con foco) y al
 * lado explica el que está activo. Las cifras son REALES (vienen de la
 * cartelera ya cargada), nada inventado.
 */
export default function EcosistemaSection({ enCartelera = 0, realizados = 0 }) {
  const [activo, setActivo] = useState(0);
  const [pausa, setPausa] = useState(false);
  const [ref, visible] = useRevelar();

  useEffect(() => {
    if (pausa || !visible) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => setActivo((a) => (a + 1) % ROLES.length), INTERVALO);
    return () => clearInterval(id);
  }, [pausa, visible]);

  const rol = ROLES[activo];
  const Icono = rol.icono;

  return (
    <div ref={ref} className={`qp-eco${visible ? ' es-visible' : ''}`}>
      <div className="pi-home-section-header qp-eco__header">
        <span className="qp-info__eyebrow">La plataforma</span>
        <h2>Una plataforma, <span className="qp-info__resalte">todos conectados</span></h2>
        <p>
          Cada persona del evento tiene su propia herramienta dentro de QPass, y
          todo pasa por el mismo QR. Tocá un rol para ver qué hace.
        </p>
      </div>

      <div className="qp-eco__cuerpo">
        <div
          className="qp-eco__orbita"
          onPointerEnter={() => setPausa(true)}
          onPointerLeave={() => setPausa(false)}
          onFocus={() => setPausa(true)}
          onBlur={() => setPausa(false)}
        >
          <span className="qp-eco__anillo" aria-hidden="true" />
          <span className="qp-eco__anillo qp-eco__anillo--int" aria-hidden="true" />

          {ROLES.map((r, i) => (
            <span
              key={`rayo-${r.nombre}`}
              className={`qp-eco__rayo${activo === i ? ' es-activo' : ''}`}
              style={{ '--ang': `${i * 45 - 90}deg` }}
              aria-hidden="true"
            />
          ))}

          <span className="qp-eco__centro" aria-hidden="true">
            <FaQrcode />
            <b>QPass</b>
          </span>

          <ul className="qp-eco__roles" aria-label="Roles de QPass">
            {ROLES.map((r, i) => {
              const IconoRol = r.icono;
              return (
                <li key={r.nombre} style={{ '--ang': `${i * 45 - 90}deg`, '--i': i }}>
                  <button
                    type="button"
                    className={`qp-eco__nodo${activo === i ? ' es-activo' : ''}`}
                    aria-pressed={activo === i}
                    onClick={() => setActivo(i)}
                  >
                    <span className="qp-eco__nodo-ic" aria-hidden="true"><IconoRol /></span>
                    <span className="qp-eco__nodo-txt">{r.nombre}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="qp-eco__lado">
          {/* Sin aria-live a propósito: con el recorrido automático el lector de
              pantalla anunciaría un rol nuevo cada 3,5 s sin parar. */}
          <article key={activo} className="qp-eco__detalle pi-home-glass-morphism">
            <span className="qp-eco__detalle-cab">
              <span className="qp-eco__detalle-ic" aria-hidden="true"><Icono /></span>
              <span>
                <small>{rol.grupo}</small>
                <strong>{rol.nombre}</strong>
              </span>
            </span>
            <p>{rol.texto}</p>
            <ul>
              {rol.puede.map((p) => (
                <li key={p}><FaCheck aria-hidden="true" /> {p}</li>
              ))}
            </ul>
            {/* Barra que marca cuánto falta para pasar al siguiente rol. */}
            <span className={`qp-eco__tiempo${pausa ? ' esta-pausada' : ''}`} aria-hidden="true" />
          </article>

          <div className="qp-eco__cifras">
            <Cifra valor={enCartelera} etiqueta="Eventos en cartelera" activo={visible} />
            <Cifra valor={realizados} etiqueta="Eventos realizados" activo={visible} />
            <Cifra valor={ROLES.length} etiqueta="Roles conectados" activo={visible} />
          </div>
        </div>
      </div>
    </div>
  );
}
