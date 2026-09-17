import { useState } from 'react';
import { FaCamera, FaCheckCircle, FaQrcode, FaSyncAlt, FaUserShield } from 'react-icons/fa';
import Modal from './Modal.jsx';
import CapturarFoto from './CapturarFoto.jsx';
import EscanerQr from './EscanerQr.jsx';
import FotoZoom from './FotoZoom.jsx';
import api from '../api/index.js';
import { subirFotoCapturada } from '../utils/imagenes.js';
import './VerificarDuenoModal.css';

/*
  El dueño real llegó y su manilla ya figura adentro: alguien entró antes con una
  copia del QR. El Supervisor comprueba que es el dueño (foto nueva + carnet +
  cuenta QPass abierta en su celular) y le da una manilla nueva. La vieja queda
  como copia (en_alerta): si el falso la vuelve a usar, no le sirve y avisa.

  Props:
    entrada   la entrada escaneada (con usuario.foto si tiene foto de perfil)
    evento    el evento del control (se usa tipoManilla)
    onVerificado(entradaActualizada)
    onCerrar()
*/
export default function VerificarDuenoModal({ entrada, evento, onVerificado, onCerrar }) {
  const esFisica = evento.tipoManilla !== 'digital';
  const [foto, setFoto] = useState(null);
  const [capturando, setCapturando] = useState(false);
  const [digitos, setDigitos] = useState('');
  const [mostroCarnet, setMostroCarnet] = useState(false);
  const [cuentaVerificada, setCuentaVerificada] = useState(false);
  const [escaneando, setEscaneando] = useState(false);
  const [manillaNueva, setManillaNueva] = useState(null);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const fotoAnterior = entrada.foto;
  const fotoPerfil = entrada.usuario?.foto;

  const listo =
    foto && /^\d{3,4}$/.test(digitos) && mostroCarnet && cuentaVerificada &&
    (!esFisica || manillaNueva);

  const alCapturar = async (dataUrl) => {
    setCapturando(false);
    setError('');
    try {
      setFoto(await subirFotoCapturada(dataUrl, 'ingresos'));
    } catch (err) {
      setError(err.message);
    }
  };

  const alEscanearNueva = async (codigo) => {
    setEscaneando(false);
    setError('');
    try {
      const qr = await api.codigosQr.buscarPorCodigo(codigo);
      if (qr.eventoId !== evento.id) {
        setError('Esa manilla no pertenece a este evento.');
      } else if (qr.anulado || qr.entradaId) {
        setError('Esa manilla ya está usada: escaneá otra del pool.');
      } else {
        setManillaNueva(qr);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const confirmar = async () => {
    if (!listo) return;
    setEnviando(true);
    setError('');
    try {
      const actualizada = await api.entradas.verificarDuplicado(entrada.id, {
        foto,
        ultimosDigitosCi: digitos,
        mostroCarnet,
        cuentaVerificada,
        codigoQrNuevoId: manillaNueva?.id,
        eventoId: evento.id,
      });
      onVerificado(actualizada);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  if (escaneando) {
    return (
      <Modal titulo={<><FaQrcode aria-hidden="true" /> Manilla nueva</>} onCerrar={() => setEscaneando(false)} tamano="sm">
        <EscanerQr onDetectado={alEscanearNueva} onCancelar={() => setEscaneando(false)} />
      </Modal>
    );
  }

  return (
    <Modal
      titulo={<><FaUserShield aria-hidden="true" /> Verificar dueño de la entrada</>}
      onCerrar={onCerrar}
      tamano="md"
      cerrarEnBackdrop={false}
      className="qp-verificar-dueno"
    >
      <p className="qp-verificar-dueno__intro">
        La entrada de <strong>{entrada.nombre}</strong> ya figura adentro. Si esta persona es el dueño,
        alguien entró antes con una copia de su manilla. Comprobá todo antes de confirmar.
      </p>

      <div className="qp-verificar-dueno__fotos">
        <div className="qp-verificar-dueno__foto">
          {fotoAnterior
            ? <FotoZoom width={96} height={96} src={fotoAnterior} alt="Foto tomada en el ingreso anterior" />
            : <span className="qp-verificar-dueno__vacia">Sin foto</span>}
          <span>Quien ya entró</span>
        </div>
        {fotoPerfil && (
          <div className="qp-verificar-dueno__foto">
            <FotoZoom width={96} height={96} src={fotoPerfil} alt="Foto de perfil de la cuenta" />
            <span>Foto de su cuenta</span>
          </div>
        )}
        <div className="qp-verificar-dueno__foto">
          {capturando ? null : foto ? (
            <>
              <FotoZoom width={96} height={96} src={foto} alt="Foto nueva del dueño" />
              <button type="button" className="btn-secundario-sm" onClick={() => setFoto(null)}>
                <FaSyncAlt aria-hidden="true" /> Repetir
              </button>
            </>
          ) : (
            <button type="button" className="qp-verificar-dueno__vacia qp-verificar-dueno__tomar" onClick={() => setCapturando(true)}>
              <FaCamera aria-hidden="true" /> Tomar foto
            </button>
          )}
          <span>Esta persona (obligatoria)</span>
        </div>
      </div>

      {capturando && <CapturarFoto onCapturada={alCapturar} onCancelar={() => setCapturando(false)} />}

      <div className="formulario">
        <div className="input-group">
          <label htmlFor="qp-verificar-digitos">Últimos dígitos de su carnet</label>
          <input
            id="qp-verificar-digitos"
            inputMode="numeric"
            maxLength={4}
            placeholder="Ej.: 4521"
            value={digitos}
            onChange={(e) => setDigitos(e.target.value.replace(/\D/g, ''))}
          />
        </div>

        <label className="checkbox-item">
          <input type="checkbox" checked={mostroCarnet} onChange={(e) => setMostroCarnet(e.target.checked)} />
          Mostró su carnet y coincide con la persona
        </label>
        <label className="checkbox-item">
          <input type="checkbox" checked={cuentaVerificada} onChange={(e) => setCuentaVerificada(e.target.checked)} />
          Mostró su cuenta QPass abierta en su celular, con esta entrada
        </label>

        {esFisica ? (
          <div className="qp-verificar-dueno__manilla">
            {manillaNueva ? (
              <span className="qp-verificar-dueno__ok">
                <FaCheckCircle aria-hidden="true" /> Manilla nueva N.º {manillaNueva.numero} ({manillaNueva.codigo})
              </span>
            ) : (
              <span>Escaneá la manilla nueva que le vas a entregar.</span>
            )}
            <button type="button" className="btn-secundario-sm" onClick={() => setEscaneando(true)}>
              <FaQrcode aria-hidden="true" /> {manillaNueva ? 'Cambiar' : 'Escanear manilla nueva'}
            </button>
          </div>
        ) : (
          <p className="form-nota">Evento digital: el nuevo QR aparece solo en la cuenta del dueño.</p>
        )}

        <p className="form-nota">
          Al confirmar, la manilla anterior queda marcada como copia: no servirá para nada y cada
          vez que alguien la escanee se avisará a seguridad con la foto de quien entró con ella.
        </p>

        {error && <p className="form-nota form-nota--error" role="alert">{error}</p>}
      </div>

      <div className="modal-actions">
        <button type="button" className="btn-cancelar" onClick={onCerrar}>Cancelar</button>
        <button type="button" className="btn-primario" onClick={confirmar} disabled={!listo || enviando}>
          {enviando ? 'Verificando…' : 'Es el dueño: dejar pasar'}
        </button>
      </div>
    </Modal>
  );
}
