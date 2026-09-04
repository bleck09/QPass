import { useEffect, useRef, useState } from 'react';
import { FaCamera, FaTimes } from 'react-icons/fa';
import './CapturarFoto.css';

// Ancho máximo de la foto capturada: la cámara suele capturar a varios megapíxeles, muy pesado
// para una simple foto de verificación. Se achica antes de pasarla a onCapturada (que sube el
// archivo real a /uploads — ver utils/imagenes.js — esto solo entrega el data URL del canvas).
const ANCHO_MAXIMO = 640;

// Cámara real para tomar una sola foto (a diferencia de EscanerQr, que lee continuamente
// buscando un código). Se usa para verificación de identidad en la puerta: quien está
// mostrando la manilla en este momento, no una foto guardada de antes.
export default function CapturarFoto({ onCapturada, onCancelar }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  // El soporte de cámara se sabe al montar: estado inicial, no setState en efecto.
  const [error, setError] = useState(() =>
    typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia
      ? ''
      : 'Este navegador no permite acceder a la cámara en esta conexión. Si estás entrando por una IP de red (no https:// ni localhost), el navegador bloquea la cámara por seguridad — hace falta HTTPS.',
  );
  const [avisoNoListo, setAvisoNoListo] = useState(false);
  const [camaras, setCamaras] = useState([]);
  const [camaraId, setCamaraId] = useState('');

  useEffect(() => {
    let activo = true;
    let stream;

    if (!navigator.mediaDevices?.getUserMedia) return () => {};

    const constraints = camaraId
      ? { video: { deviceId: { exact: camaraId } } }
      : { video: { facingMode: 'environment' } };

    navigator.mediaDevices.getUserMedia(constraints)
      .then(async (s) => {
        if (!activo) { s.getTracks().forEach(t => t.stop()); return; }
        stream = s;
        videoRef.current.srcObject = s;
        videoRef.current.play();

        // Recién con permiso concedido el navegador entrega los labels de las cámaras.
        // Si hay más de una, mostramos el selector; con una sola, no hace falta.
        if (camaras.length === 0) {
          try {
            const dispositivos = await navigator.mediaDevices.enumerateDevices();
            const videos = dispositivos.filter(d => d.kind === 'videoinput');
            if (activo && videos.length > 1) {
              setCamaras(videos);
              const idActual = s.getVideoTracks()[0]?.getSettings().deviceId;
              if (idActual) setCamaraId(idActual);
            }
          } catch {
            // no se pudo listar cámaras, seguimos con la que ya está activa
          }
        }
      })
      .catch(() => setError('No se pudo acceder a la cámara. Revisa los permisos del navegador.'));

    return () => {
      activo = false;
      stream?.getTracks().forEach(t => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camaraId]);

  const capturar = () => {
    const video = videoRef.current;
    if (!video?.videoWidth) {
      setAvisoNoListo(true);
      return;
    }
    const canvas = canvasRef.current;
    const escala = Math.min(1, ANCHO_MAXIMO / video.videoWidth);
    canvas.width = Math.round(video.videoWidth * escala);
    canvas.height = Math.round(video.videoHeight * escala);
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    onCapturada(canvas.toDataURL('image/jpeg', 0.7));
  };

  return (
    <div className="pi-captura-foto">
      {error ? (
        <p className="pi-captura-foto-error" role="alert">{error}</p>
      ) : (
        <>
          {camaras.length > 1 && (
            <select
              className="pi-captura-foto-select-camara"
              aria-label="Elegir cámara"
              value={camaraId}
              onChange={(e) => setCamaraId(e.target.value)}
            >
              {camaras.map((c, i) => (
                <option key={c.deviceId} value={c.deviceId}>
                  {c.label || `Cámara ${i + 1}`}
                </option>
              ))}
            </select>
          )}
          <div className="pi-captura-foto-video-wrapper">
            <video
              ref={videoRef}
              playsInline
              muted
              className="pi-captura-foto-video"
              aria-label="Vista de la cámara para tomar la foto"
            />
          </div>
        </>
      )}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      {avisoNoListo && !error && (
        <p className="pi-captura-foto-error" role="alert">La cámara todavía no está lista. Espera un segundo y volvé a intentar.</p>
      )}
      <div className="pi-captura-foto-acciones">
        <button type="button" className="pi-captura-foto-btn-cancelar" onClick={onCancelar}>
          <FaTimes aria-hidden="true" /> Cancelar
        </button>
        {!error && (
          <button type="button" className="pi-captura-foto-btn-tomar" onClick={capturar}>
            <FaCamera aria-hidden="true" /> Capturar
          </button>
        )}
      </div>
    </div>
  );
}
