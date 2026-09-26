import { useState } from 'react';
import { FaCheckCircle, FaUserSecret, FaCalendarAlt, FaTicketAlt, FaClock, FaHandPaper } from 'react-icons/fa';
import Modal from './Modal.jsx';
import FotosDuplicado from './FotosDuplicado.jsx';
import Boton from './Boton.jsx';
import api from '../api/index.js';
import { leerSesion } from '../api/client.js';
import { formatearFecha } from '../utils/eventos.js';
import { ROLES_RECUPERAN } from '../utils/duplicados.js';
import './ManillaFalsaModal.css';

/*
  Se escaneó la COPIA de una manilla duplicada (el backend respondió
  MANILLA_FALSA). No se puede hacer nada con ella: se muestra la foto del falso
  para retenerlo. Supervisor/Admin pueden marcarla recuperada ahí mismo.

  Uso en cualquier pantalla que escanee:
    catch (err) { if (esManillaFalsa(err)) setManillaFalsa(err.detalle); ... }
    {manillaFalsa && <ManillaFalsaModal detalle={manillaFalsa} onCerrar={() => setManillaFalsa(null)} />}
*/
export default function ManillaFalsaModal({ detalle, onCerrar }) {
  const sesion = leerSesion();
  const puedeRecuperar =
    ROLES_RECUPERAN.includes(sesion?.rol) && detalle.estadoCaso === 'pendiente';
  const [sancion, setSancion] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [recuperada, setRecuperada] = useState(false);
  const [error, setError] = useState('');

  const recuperar = async () => {
    setGuardando(true);
    setError('');
    try {
      await api.casosDuplicado.recuperar(detalle.casoId, sancion.trim() || undefined);
      setRecuperada(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal
      titulo={<><FaUserSecret aria-hidden="true" /> Manilla falsa</>}
      onCerrar={onCerrar}
      tamano="sm"
      className="qp-manilla-falsa"
    >
      <p className="qp-manilla-falsa__banner" role="alert">
        Esta manilla es una COPIA. No sirve para ingresar, recargar, comprar ni retirar saldo.
      </p>

      <div className="qp-manilla-falsa__foto">
        <FotosDuplicado foto={detalle.fotoSospechoso} />
      </div>

      <dl className="qp-manilla-falsa__datos">
        <div><dt><FaCalendarAlt aria-hidden="true" /> Evento</dt><dd>{detalle.eventoNombre}</dd></div>
        <div><dt><FaTicketAlt aria-hidden="true" /> Entrada de</dt><dd>{detalle.titularNombre}</dd></div>
        <div><dt><FaClock aria-hidden="true" /> Detectado</dt><dd>{formatearFecha(detalle.detectadoEn)}</dd></div>
      </dl>

      <p className="qp-manilla-falsa__instruccion">
        Retén a la persona y avisa a seguridad. El aviso ya les llegó con tu ubicación.
      </p>

      {recuperada ? (
        <p className="qp-manilla-falsa__ok" role="status">
          <FaCheckCircle aria-hidden="true" /> Manilla marcada como recuperada.
        </p>
      ) : puedeRecuperar && (
        <div className="qp-manilla-falsa__recuperar">
          <div className="input-group">
            <label htmlFor="qp-manilla-falsa-sancion">Sanción que decidió el organizador (opcional)</label>
            <textarea
              id="qp-manilla-falsa-sancion"
              rows={2}
              value={sancion}
              onChange={(e) => setSancion(e.target.value)}
              placeholder="Ej.: retirado del evento"
            />
          </div>
          {error && <p className="form-nota form-nota--error">{error}</p>}
          <Boton icono={FaHandPaper} onClick={recuperar} cargando={guardando}>
            Ya le quitamos la manilla
          </Boton>
        </div>
      )}

      <div className="modal-actions">
        <Boton variante="secundario" onClick={onCerrar}>Cerrar</Boton>
      </div>
    </Modal>
  );
}
