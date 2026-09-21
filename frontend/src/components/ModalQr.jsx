import { FaQrcode, FaHourglassHalf, FaSun } from 'react-icons/fa';
import Modal from './Modal.jsx';
import FotoZoom from './FotoZoom.jsx';
import Insignia from './Insignia.jsx';
import { EstadoVacio } from './EstadosAsync.jsx';
import { qrDe } from '../utils/qr.js';
import './ModalQr.css';

/*
  Modal ÚNICO para mostrar el QR de una manilla/entrada (PLAN §2.10). Antes
  cada pantalla armaba el suyo.

    {verQr && (
      <ModalQr
        codigo={entrada.codigoQrVinculado?.codigo}   // sin código: "aún sin vincular"
        titulo={evento.nombre}
        etiquetas={['VIP', 'Noche 1']}               // opcional: insignias
        nota="Mostralo en la puerta para entrar."     // opcional
        onCerrar={() => setVerQr(false)}
      />
    )}
*/
export default function ModalQr({
  codigo,
  titulo,
  etiquetas = [],
  nota = 'Mostrá este código en la puerta o en el puesto.',
  textoSinCodigo = 'Tu manilla todavía no está vinculada. Vas a poder ver el QR apenas se vincule.',
  onCerrar,
}) {
  return (
    <Modal
      titulo={<><FaQrcode aria-hidden="true" /> Tu código QR</>}
      onCerrar={onCerrar}
      tamano="sm"
    >
      <div className="qp-modal-qr">
        {titulo && <strong className="qp-modal-qr-titulo">{titulo}</strong>}
        {etiquetas.filter(Boolean).length > 0 && (
          <div className="qp-modal-qr-etiquetas">
            {etiquetas.filter(Boolean).map((e) => <Insignia key={e} tono="marca">{e}</Insignia>)}
          </div>
        )}

        {codigo ? (
          <>
            <div className="qp-modal-qr-marco">
              <FotoZoom width="240" height="240" src={qrDe(codigo)} alt="Tu código QR" className="qp-modal-qr-img" />
              <span className="qp-modal-qr-laser" aria-hidden="true" />
            </div>
            <code className="qp-modal-qr-codigo">{codigo}</code>
            {nota && <p className="qp-modal-qr-nota">{nota}</p>}
            <p className="qp-modal-qr-tip"><FaSun aria-hidden="true" /> Subí el brillo de la pantalla para que se lea mejor.</p>
          </>
        ) : (
          <EstadoVacio compacto icono={FaHourglassHalf} titulo="Manilla aún sin vincular" mensaje={textoSinCodigo} />
        )}
      </div>
    </Modal>
  );
}
