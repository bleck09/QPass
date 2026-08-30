/* ============================================================================
 * CapturarFoto — toma una foto con la cámara o sube un archivo (alternativa).
 * Devuelve un data URL (JPEG). Redimensiona a 1024px máx de lado.
 * ========================================================================= */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/shared/components/ui';
import styles from './CapturarFoto.module.css';

interface CapturarFotoProps {
  label: string;
  valor?: string | null;
  onChange: (dataUrl: string | null) => void;
  hint?: string;
}

const MAX_LADO = 1024;

function reducir(canvas: HTMLCanvasElement, w: number, h: number): string {
  const escala = Math.min(1, MAX_LADO / Math.max(w, h));
  const out = document.createElement('canvas');
  out.width = Math.round(w * escala);
  out.height = Math.round(h * escala);
  out.getContext('2d')?.drawImage(canvas, 0, 0, out.width, out.height);
  return out.toDataURL('image/jpeg', 0.85);
}

export function CapturarFoto({ label, valor, onChange, hint }: CapturarFotoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [activa, setActiva] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const detener = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setActiva(false);
  }, []);

  useEffect(() => detener, [detener]);

  const abrirCamara = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setActiva(true);
    } catch {
      setError('No pudimos acceder a la cámara. Sube una foto en su lugar.');
    }
  };

  const tomar = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    onChange(reducir(canvas, canvas.width, canvas.height));
    detener();
  };

  const subir = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      canvas.getContext('2d')?.drawImage(bitmap, 0, 0);
      onChange(reducir(canvas, bitmap.width, bitmap.height));
    } catch {
      setError('No pudimos procesar esa imagen.');
    }
  };

  return (
    <div className={styles.campo}>
      <span className={styles.label}>{label}</span>

      <div className={styles.visor}>
        {activa ? (
          <video ref={videoRef} className={styles.video} playsInline muted />
        ) : valor ? (
          <img src={valor} alt="Foto capturada" className={styles.video} />
        ) : (
          <span className={styles.vacio}>Sin foto</span>
        )}
      </div>

      <div className={styles.acciones}>
        {!activa && (
          <Button variante="secundario" tamano="sm" onClick={abrirCamara}>
            {valor ? 'Volver a tomar' : 'Abrir cámara'}
          </Button>
        )}
        {activa && (
          <>
            <Button tamano="sm" onClick={tomar}>
              Tomar foto
            </Button>
            <Button variante="terciario" tamano="sm" onClick={detener}>
              Cancelar
            </Button>
          </>
        )}
        {!activa && (
          <>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={subir}
            />
            <Button
              variante="terciario"
              tamano="sm"
              onClick={() => fileRef.current?.click()}
            >
              Subir archivo
            </Button>
            {valor && (
              <Button
                variante="terciario"
                tamano="sm"
                onClick={() => onChange(null)}
              >
                Quitar
              </Button>
            )}
          </>
        )}
      </div>

      {hint && !error && <p className={styles.hint}>{hint}</p>}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
