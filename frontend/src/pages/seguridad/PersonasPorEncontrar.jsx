import { useCallback, useEffect, useMemo, useState } from 'react';
import { FaCoins, FaHandPaper, FaUserSecret } from 'react-icons/fa';
import { useTituloPagina } from '../../utils/tituloPagina.js';
import { useApi } from '../../utils/useApi.js';
import { useConfirmar } from '../../components/ConfirmarModal.jsx';
import { EstadoCarga, EstadoError } from '../../components/EstadosAsync.jsx';
import Buscador from '../../components/Buscador.jsx';
import Card from '../../components/Card.jsx';
import FotoZoom from '../../components/FotoZoom.jsx';
import Modal from '../../components/Modal.jsx';
import api from '../../api/index.js';
import { leerSesion } from '../../api/client.js';
import { formatearFecha } from '../../utils/eventos.js';
import { ROLES_RECUPERAN, ubicacionAlerta } from '../../utils/duplicados.js';
import './PersonasPorEncontrar.css';

const REFRESCO_MS = 10000;

/*
  "Personas por encontrar": cada manilla duplicada (CasoDuplicado) con la foto de
  quien entró con la copia y dónde se la escaneó por última vez. La ven Admin,
  Supervisor (sus eventos) y Cliente (los que organiza). Supervisor/Admin marcan
  la manilla recuperada; Admin puede reponer saldo (ajuste_manual).
*/
export default function PersonasPorEncontrar() {
  useTituloPagina('Personas por encontrar');
  const sesion = leerSesion();
  const puedeRecuperar = ROLES_RECUPERAN.includes(sesion.rol);
  const esAdmin = sesion.rol === 'Admin';

  const cargar = useCallback(() => api.casosDuplicado.listar(), []);
  const { data: casos, cargando, error, recargar } = useApi(cargar, { inicial: [] });
  const [filtro, setFiltro] = useState('pendiente');
  const [busqueda, setBusqueda] = useState('');
  const [aviso, setAviso] = useState('');
  const [avisoOk, setAvisoOk] = useState('');
  const [reponiendo, setReponiendo] = useState(null);
  const [confirmar, DialogoConfirmar] = useConfirmar();

  // Mismo ritmo que las alertas: la última ubicación se mantiene al día.
  useEffect(() => {
    const t = setInterval(recargar, REFRESCO_MS);
    return () => clearInterval(t);
  }, [recargar]);

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return casos.filter((c) =>
      c.estado === filtro &&
      (!q || `${c.entrada.nombre} ${c.evento.nombre} ${c.codigoCopia.numero}`.toLowerCase().includes(q)),
    );
  }, [casos, filtro, busqueda]);

  const conteo = (estado) => casos.filter((c) => c.estado === estado).length;

  const recuperar = async (caso) => {
    const sancion = await confirmar({
      titulo: '¿Ya le quitaron la manilla?',
      mensaje: `La manilla N.º ${caso.codigoCopia.numero} queda como recuperada y el caso se cierra.`,
      campoNota: {
        etiqueta: 'Sanción que decidió el organizador (opcional)',
        placeholder: 'Ej.: retirado del evento',
      },
      textoConfirmar: 'Marcar recuperada',
    });
    if (sancion === null) return;
    try {
      await api.casosDuplicado.recuperar(caso.id, sancion.trim() || undefined);
      setAviso('');
      await recargar();
    } catch (err) {
      setAviso(err.message);
    }
  };

  return (
    <div className="qp-duplicados">
      <header className="qp-duplicados__header">
        <h1><FaUserSecret aria-hidden="true" /> Personas por encontrar</h1>
        <p>
          Personas que entraron con una copia de la manilla de otro asistente. Su manilla ya no
          sirve para nada: cada vez que alguien la escanea, aparece acá dónde fue.
        </p>
      </header>

      <Buscador
        valor={busqueda}
        onCambio={setBusqueda}
        placeholder="Buscar por titular, evento o N.º de manilla…"
        filtros={[
          { valor: 'pendiente', texto: 'Por encontrar', conteo: conteo('pendiente') },
          { valor: 'resuelto', texto: 'Recuperadas', conteo: conteo('resuelto') },
        ]}
        filtroActivo={filtro}
        onFiltro={setFiltro}
        etiquetaFiltros="Filtrar casos"
      />

      {aviso && <p className="form-nota form-nota--error" role="alert">{aviso}</p>}
      {avisoOk && <p className="qp-duplicados__ok" role="status">{avisoOk}</p>}

      {error ? (
        <EstadoError onReintentar={recargar} />
      ) : cargando && !casos.length ? (
        <EstadoCarga filas={3} />
      ) : visibles.length === 0 ? (
        <p className="qp-duplicados__vacio">
          {filtro === 'pendiente' ? 'No hay nadie por encontrar.' : 'Todavía no se recuperó ninguna manilla.'}
        </p>
      ) : (
        <div className="qp-duplicados__grilla">
          {visibles.map((c) => (
            <Card key={c.id} className="qp-duplicados__caso">
              <div className="qp-duplicados__fotos">
                <figure>
                  {c.fotoSospechoso
                    ? <FotoZoom width={140} height={140} src={c.fotoSospechoso} alt="Persona que entró con la copia" />
                    : <span className="qp-duplicados__sin-foto">Sin foto</span>}
                  <figcaption>Quien tiene la copia</figcaption>
                </figure>
                {c.registroVerificacion?.foto && (
                  <figure className="qp-duplicados__foto-dueno">
                    <FotoZoom width={64} height={64} src={c.registroVerificacion.foto} alt="Dueño real verificado" />
                    <figcaption>Dueño real</figcaption>
                  </figure>
                )}
              </div>

              <dl className="qp-duplicados__datos">
                <dt>Evento</dt>
                <dd>{c.evento.nombre}</dd>
                <dt>Manilla copiada</dt>
                <dd>N.º {c.codigoCopia.numero}</dd>
                <dt>Entrada de</dt>
                <dd>{c.entrada.nombre}</dd>
                <dt>Detectado</dt>
                <dd>{formatearFecha(c.createdAt)} · verificó {c.abiertoPor.nombre}</dd>
                <dt>Última vez vista</dt>
                <dd>
                  {c.ultimaAlerta
                    ? <>{ubicacionAlerta(c.ultimaAlerta)} · {formatearFecha(c.ultimaAlerta.createdAt)}</>
                    : 'Todavía no se volvió a escanear'}
                </dd>
                <dt>Escaneos de la copia</dt>
                <dd>{c.totalAlertas}</dd>
                {c.estado === 'resuelto' && (
                  <>
                    <dt>Recuperada</dt>
                    <dd>{formatearFecha(c.recuperadoEn)} · {c.recuperadoPor?.nombre}</dd>
                    <dt>Sanción</dt>
                    <dd>{c.sancion || '—'}</dd>
                  </>
                )}
              </dl>

              {(puedeRecuperar && c.estado === 'pendiente') || esAdmin ? (
                <div className="qp-duplicados__acciones">
                  {puedeRecuperar && c.estado === 'pendiente' && (
                    <button type="button" className="btn-primario" onClick={() => recuperar(c)}>
                      <FaHandPaper aria-hidden="true" /> Marcar recuperada
                    </button>
                  )}
                  {esAdmin && (
                    <button type="button" className="btn-secundario-sm" onClick={() => setReponiendo(c)}>
                      <FaCoins aria-hidden="true" /> Reponer saldo al dueño
                    </button>
                  )}
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      )}

      {reponiendo && (
        <ReponerSaldoModal
          caso={reponiendo}
          onCerrar={() => setReponiendo(null)}
          onListo={(msg) => {
            setReponiendo(null);
            setAviso('');
            setAvisoOk(msg);
          }}
        />
      )}
      {DialogoConfirmar}
    </div>
  );
}

/*
  Admin repone (todo o parte de) lo que consumió el falso antes de detectarse.
  Es un ajuste_manual NUEVO en el ledger: las ventas originales no se tocan.
  Se listan los consumos de la entrada hasta la verificación como referencia.
*/
function ReponerSaldoModal({ caso, onCerrar, onListo }) {
  const [monto, setMonto] = useState('');
  const [nota, setNota] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const cargarConsumos = useCallback(
    () => api.transacciones.listar({ entradaId: caso.entrada.id, tipo: 'consumo' }),
    [caso.entrada.id],
  );
  const { data: consumos, cargando } = useApi(cargarConsumos, { inicial: [] });
  const antesDeDetectar = consumos.filter(
    (t) => new Date(t.createdAt) <= new Date(caso.createdAt),
  );

  const montoNum = Number(monto);
  const valido = montoNum > 0 && nota.trim().length >= 5;

  const enviar = async () => {
    if (!valido) return;
    setEnviando(true);
    setError('');
    try {
      const { saldo } = await api.transacciones.ajusteManual({
        entradaId: caso.entrada.id,
        monto: montoNum,
        nota: nota.trim(),
        casoDuplicadoId: caso.id,
      });
      onListo(`Se repusieron ${montoNum} pts a ${caso.entrada.nombre}. Saldo actual: ${Number(saldo)} pts.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal titulo={<><FaCoins aria-hidden="true" /> Reponer saldo</>} onCerrar={onCerrar} tamano="md">
      <p className="form-nota">
        Consumos de la entrada de <strong>{caso.entrada.nombre}</strong> hasta que se detectó el
        duplicado. El sistema no sabe cuáles hizo el falso: decide el organizador.
      </p>
      {cargando ? (
        <EstadoCarga filas={2} />
      ) : antesDeDetectar.length === 0 ? (
        <p className="form-nota">No hubo consumos antes de la detección.</p>
      ) : (
        <ul className="qp-duplicados__consumos">
          {antesDeDetectar.map((t) => (
            <li key={t.id}>
              <span>{formatearFecha(t.createdAt)}{t.venta?.puesto?.nombre ? ` · ${t.venta.puesto.nombre}` : ''}</span>
              <strong>{Number(t.monto)} pts</strong>
            </li>
          ))}
        </ul>
      )}

      <div className="formulario">
        <div className="input-group">
          <label htmlFor="qp-reponer-monto">Monto a reponer (pts)</label>
          <input
            id="qp-reponer-monto"
            type="number"
            min="0"
            step="0.01"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
          />
        </div>
        <div className="input-group">
          <label htmlFor="qp-reponer-nota">Motivo</label>
          <textarea
            id="qp-reponer-nota"
            rows={2}
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="Ej.: el organizador repone lo consumido por el falso"
          />
        </div>
        {error && <p className="form-nota form-nota--error" role="alert">{error}</p>}
      </div>

      <div className="modal-actions">
        <button type="button" className="btn-cancelar" onClick={onCerrar}>Cancelar</button>
        <button type="button" className="btn-primario" onClick={enviar} disabled={!valido || enviando}>
          {enviando ? 'Guardando…' : 'Reponer saldo'}
        </button>
      </div>
    </Modal>
  );
}
