/* ============================================================================
 * EscanerQr — lee un código QR con la cámara (jsQR) y, como alternativa
 * accesible (Manual 10.6: nunca depender solo de un gesto/cámara), permite
 * escribir el código a mano. Detiene la cámara al desmontar.
 * ========================================================================= */

import { useCallback, useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { Button, Input } from '@/shared/components/ui';
import styles from './EscanerQr.module.css';

interface EscanerQrProps {
  /** Se dispara una vez por cada código leído (cámara o manual). */
  onDetectar: (codigo: string) => void;
  /** Deshabilita la lectura mientras el padre procesa el código anterior. */
  ocupado?: boolean;
}

export function EscanerQr({ onDetectar, ocupado = false }: EscanerQrProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const ultimoRef = useRef<string>('');

  const [activa, setActiva] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState('');

  const detener = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setActiva(false);
  }, []);

  const tick = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const res = jsQR(img.data, img.width, img.height, {
      inversionAttempts: 'dontInvert',
    });
    if (res?.data && res.data !== ultimoRef.current && !ocupado) {
      ultimoRef.current = res.data;
      onDetectar(res.data.trim());
      setTimeout(() => (ultimoRef.current = ''), 1500);
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [onDetectar, ocupado]);

  const iniciar = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setActiva(true);
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      setError('No pudimos acceder a la cámara. Escribe el código a mano.');
    }
  }, [tick]);

  useEffect(() => detener, [detener]);

  return (
    <div className={styles.escaner}>
      <div className={styles.marco}>
        <video ref={videoRef} className={styles.video} playsInline muted />
        <canvas ref={canvasRef} className="sr-only" />
        {!activa && (
          <div className={styles.placeholder}>
            <Button onClick={iniciar}>Activar cámara</Button>
          </div>
        )}
        {activa && <div className={styles.mira} aria-hidden="true" />}
      </div>

      {activa && (
        <Button variante="terciario" tamano="sm" onClick={detener}>
          Detener cámara
        </Button>
      )}

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <form
        className={styles.manual}
        onSubmit={(e) => {
          e.preventDefault();
          if (manual.trim()) {
            onDetectar(manual.trim());
            setManual('');
          }
        }}
      >
        <Input
          label="…o escribe el código"
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          autoComplete="off"
        />
        <Button type="submit" variante="secundario" disabled={ocupado}>
          Buscar
        </Button>
      </form>
    </div>
  );
}
