import { useEffect, useRef, useState } from 'react';
import { FaCamera, FaTimes } from 'react-icons/fa';
import './CapturarFoto.css';

// Ancho máximo de la foto guardada: la cámara suele capturar a varios megapíxeles, muy pesado
// para una simple foto de verificación que se guarda en base64. Se achica antes de codificar.
const ANCHO_MAXIMO = 640;

// Cámara real para tomar una sola foto (a diferencia de EscanerQr, que lee continuamente
// buscando un código). Se usa para verificación de identidad en la puerta: quien está
// mostrando la manilla en este momento, no una foto guardada de antes.
export default function CapturarFoto({ onCapturada, onCancelar }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let activo = true;
    let stream;

    navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'environment' } })
      .then((s) => {
        if (!activo) { s.getTracks().forEach(t => t.stop()); return; }
        stream = s;
        videoRef.current.srcObject = s;
        videoRef.current.play();
      })
      .catch(() => setError('No se pudo acceder a la cámara. Revisa los permisos del navegador.'));

    return () => {
      activo = false;
      stream?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const capturar = () => {
    const video = videoRef.current;
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
        <p className="pi-captura-foto-error">{error}</p>
      ) : (
        <div className="pi-captura-foto-video-wrapper">
          <video ref={videoRef} playsInline muted className="pi-captura-foto-video" />
        </div>
      )}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <div className="pi-captura-foto-acciones">
        <button type="button" className="pi-captura-foto-btn-cancelar" onClick={onCancelar}>
          <FaTimes /> Cancelar
        </button>
        {!error && (
          <button type="button" className="pi-captura-foto-btn-tomar" onClick={capturar}>
            <FaCamera /> Capturar
          </button>
        )}
      </div>
    </div>
  );
}
