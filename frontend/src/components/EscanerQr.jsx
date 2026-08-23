import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { FaTimes } from 'react-icons/fa';
import './EscanerQr.css';

// Ancho máximo del frame que se analiza con jsQR (respaldo cuando el navegador no trae
// BarcodeDetector nativo): jsQR es O(píxeles), así que leer el frame completo de la cámara
// (a veces 1920x1080+) lo vuelve lento. Un QR se detecta igual de bien en una imagen chica.
const ANCHO_ANALISIS = 400;

// Escáner de QR con la cámara real del dispositivo. Cuando el navegador trae BarcodeDetector
// (Chrome/Edge en Android y escritorio, Safari 17+) lo usa — es el decodificador nativo del
// sistema, por hardware, mucho más rápido y confiable que decodificar en JS puro. Si no está
// disponible (ej. Firefox), cae a jsQR sobre un frame achicado.
export default function EscanerQr({ onDetectado, onCancelar }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [error, setError] = useState('');
  const [listo, setListo] = useState(false);

  useEffect(() => {
    let activo = true;
    let animationId;
    let stream;

    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Este navegador no permite acceder a la cámara en esta conexión. Si estás entrando por una IP de red (no https:// ni localhost), el navegador bloquea la cámara por seguridad — hace falta HTTPS.');
      return () => {};
    }

    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } } })
      .then((s) => {
        if (!activo) { s.getTracks().forEach(t => t.stop()); return; }
        stream = s;
        videoRef.current.srcObject = s;
        videoRef.current.play();

        let yaAvisoListo = false;
        const marcarListo = () => {
          if (!yaAvisoListo) { yaAvisoListo = true; setListo(true); }
        };

        if ('BarcodeDetector' in window) {
          const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
          const leerConDetectorNativo = async () => {
            if (!activo) return;
            const video = videoRef.current;
            if (video?.readyState === video?.HAVE_ENOUGH_DATA) {
              marcarListo();
              try {
                const codigos = await detector.detect(video);
                if (codigos.length > 0) {
                  onDetectado(codigos[0].rawValue);
                  return;
                }
              } catch {
                // sigue intentando en el próximo frame
              }
            }
            animationId = requestAnimationFrame(leerConDetectorNativo);
          };
          animationId = requestAnimationFrame(leerConDetectorNativo);
          return;
        }

        // Respaldo sin BarcodeDetector: jsQR sobre un frame achicado.
        let anchoCanvas = 0;
        let altoCanvas = 0;
        const leerConJsQr = () => {
          if (!activo) return;
          const video = videoRef.current;
          const canvas = canvasRef.current;
          if (video && video.readyState === video.HAVE_ENOUGH_DATA) {
            marcarListo();
            if (!anchoCanvas) {
              anchoCanvas = ANCHO_ANALISIS;
              altoCanvas = Math.round(video.videoHeight * (ANCHO_ANALISIS / video.videoWidth));
              canvas.width = anchoCanvas;
              canvas.height = altoCanvas;
            }
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(video, 0, 0, anchoCanvas, altoCanvas);
            const imageData = ctx.getImageData(0, 0, anchoCanvas, altoCanvas);
            const resultado = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' });
            if (resultado?.data) {
              onDetectado(resultado.data);
              return;
            }
          }
          animationId = requestAnimationFrame(leerConJsQr);
        };
        animationId = requestAnimationFrame(leerConJsQr);
      })
      .catch(() => setError('No se pudo acceder a la cámara. Revisa los permisos del navegador.'));

    return () => {
      activo = false;
      cancelAnimationFrame(animationId);
      stream?.getTracks().forEach(t => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="pi-escaner-qr">
      {error ? (
        <p className="pi-escaner-qr-error">{error}</p>
      ) : (
        <div className="pi-escaner-qr-video-wrapper">
          <video ref={videoRef} playsInline muted className="pi-escaner-qr-video" />
          <div className={`pi-escaner-qr-marco ${listo ? 'activo' : ''}`}>
            {listo && <div className="pi-escaner-qr-linea" />}
          </div>
          {!listo && <div className="pi-escaner-qr-cargando">Iniciando cámara...</div>}
          {listo && <span className="pi-escaner-qr-estado">Buscando código...</span>}
        </div>
      )}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <button type="button" className="pi-escaner-qr-btn-cancelar" onClick={onCancelar}>
        <FaTimes /> Cancelar
      </button>
    </div>
  );
}
