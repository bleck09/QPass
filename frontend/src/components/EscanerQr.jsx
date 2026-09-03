import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { FaTimes } from 'react-icons/fa';
import './EscanerQr.css';

// Ancho máximo del frame que se analiza con jsQR (respaldo cuando el navegador no trae
// BarcodeDetector nativo): jsQR es O(píxeles), así que leer el frame completo de la cámara
// (a veces 1920x1080+) lo vuelve lento. Un QR se detecta igual de bien en una imagen chica.
const ANCHO_ANALISIS = 400;

// La cámara elegida se recuerda en localStorage por origen: al reabrir el escáner
// se vuelve a usar esa misma cámara si sigue disponible (deviceId estable mientras
// el permiso siga concedido). Si ya no existe, se limpia y se cae a la de por defecto.
const CLAVE_CAMARA = 'qpass:escanerQr:camaraId';

function leerCamaraGuardada() {
  try {
    return localStorage.getItem(CLAVE_CAMARA) || '';
  } catch {
    return '';
  }
}

function guardarCamara(id) {
  try {
    if (id) localStorage.setItem(CLAVE_CAMARA, id);
    else localStorage.removeItem(CLAVE_CAMARA);
  } catch {
    // localStorage no disponible (modo privado, etc.): la elección solo dura esta sesión.
  }
}

// Escáner de QR con la cámara real del dispositivo. Cuando el navegador trae BarcodeDetector
// (Chrome/Edge en Android y escritorio, Safari 17+) lo usa — es el decodificador nativo del
// sistema, por hardware, mucho más rápido y confiable que decodificar en JS puro. Si no está
// disponible (ej. Firefox), cae a jsQR sobre un frame achicado.
export default function EscanerQr({ onDetectado, onCancelar }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  // El soporte de cámara se sabe al montar: se calcula como estado inicial en
  // vez de con setState dentro del efecto.
  const [error, setError] = useState(() =>
    typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia
      ? ''
      : 'Este navegador no permite acceder a la cámara en esta conexión. Si estás entrando por una IP de red (no https:// ni localhost), el navegador bloquea la cámara por seguridad — hace falta HTTPS.',
  );
  const [listo, setListo] = useState(false);
  const [camaras, setCamaras] = useState([]);
  // Arranca con la cámara que el usuario dejó elegida en una visita anterior (si hay).
  const [camaraId, setCamaraId] = useState(leerCamaraGuardada);

  useEffect(() => {
    let activo = true;
    let animationId;
    let stream;

    if (!navigator.mediaDevices?.getUserMedia) return () => {};

    const constraints = camaraId
      ? { video: { deviceId: { exact: camaraId }, width: { ideal: 640 }, height: { ideal: 480 } } }
      : { video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } } };

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
              // Solo autoseleccionamos la cámara activa si el usuario todavía no eligió
              // ninguna (ni en esta sesión ni en una anterior). Si ya hay elección
              // guardada y sigue disponible, el stream ya la está usando: no se pisa.
              const idActual = s.getVideoTracks()[0]?.getSettings().deviceId;
              if (!camaraId && idActual) setCamaraId(idActual);
            }
          } catch {
            // no se pudo listar cámaras, seguimos con la que ya está activa
          }
        }

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
      .catch((err) => {
        // La cámara guardada ya no está (otro equipo, se desconectó, cambió el id):
        // se olvida la preferencia y el efecto se reintenta con la cámara por defecto.
        if (camaraId && (err?.name === 'OverconstrainedError' || err?.name === 'NotFoundError')) {
          guardarCamara('');
          setCamaraId('');
          return;
        }
        setError('No se pudo acceder a la cámara. Revisa los permisos del navegador.');
      });

    return () => {
      activo = false;
      cancelAnimationFrame(animationId);
      stream?.getTracks().forEach(t => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camaraId]);

  return (
    <div className="pi-escaner-qr">
      {error ? (
        <p className="pi-escaner-qr-error" role="alert">{error}</p>
      ) : (
        <>
          {camaras.length > 1 && (
            <select
              className="pi-escaner-qr-select-camara"
              aria-label="Elegir cámara"
              value={camaraId}
              onChange={(e) => { setListo(false); guardarCamara(e.target.value); setCamaraId(e.target.value); }}
            >
              {camaras.map((c, i) => (
                <option key={c.deviceId} value={c.deviceId}>
                  {c.label || `Cámara ${i + 1}`}
                </option>
              ))}
            </select>
          )}
          <div className="pi-escaner-qr-video-wrapper">
            <video
              ref={videoRef}
              playsInline
              muted
              className="pi-escaner-qr-video"
              aria-label="Vista de la cámara para escanear el código QR"
            />
            <div className={`pi-escaner-qr-marco ${listo ? 'activo' : ''}`} aria-hidden="true">
              {listo && <div className="pi-escaner-qr-linea" />}
            </div>
            {!listo && (
              <div className="pi-escaner-qr-cargando" role="status">Iniciando cámara...</div>
            )}
            {listo && (
              <span className="pi-escaner-qr-estado" role="status">Buscando código...</span>
            )}
          </div>
        </>
      )}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <button type="button" className="pi-escaner-qr-btn-cancelar" onClick={onCancelar}>
        <FaTimes aria-hidden="true" /> Cancelar
      </button>
    </div>
  );
}
