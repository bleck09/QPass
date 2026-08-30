/* ============================================================================
 * CodigoQr — dibuja un QR a partir de un texto, generado en el cliente con la
 * librería `qrcode` (sin servicio externo: mejor privacidad y no depende de la
 * red). El fondo va SIEMPRE blanco: un QR sobre color oscuro no se escanea.
 * ========================================================================= */

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import styles from './CodigoQr.module.css';

interface CodigoQrProps {
  valor: string;
  /** Lado del QR en px. */
  tamano?: number;
  alt?: string;
}

export function CodigoQr({ valor, tamano = 180, alt }: CodigoQrProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let vivo = true;
    setError(false);
    QRCode.toDataURL(valor, { margin: 1, width: tamano * 2 })
      .then((url) => {
        if (vivo) setSrc(url);
      })
      .catch(() => {
        if (vivo) setError(true);
      });
    return () => {
      vivo = false;
    };
  }, [valor, tamano]);

  if (error) {
    return (
      <span className={styles.fallback} role="img" aria-label="No se pudo generar el código QR">
        {valor}
      </span>
    );
  }

  return (
    <img
      className={styles.qr}
      src={src ?? undefined}
      alt={alt ?? `Código QR ${valor}`}
      width={tamano}
      height={tamano}
    />
  );
}
