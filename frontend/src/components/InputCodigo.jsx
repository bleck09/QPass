import { useRef } from 'react';
import './InputCodigo.css';

/*
  Código de verificación de N dígitos, una casilla por dígito (PLAN §2.10:
  estaba copiado en Registrar y Recuperar contraseña).
    - Escribir avanza solo; Borrar en una casilla vacía vuelve a la anterior.
    - Flechas ← → mueven el foco.
    - Pegar el código completo (desde el correo) llena todas las casillas.

    <InputCodigo valor={codigo} onCambio={setCodigo} error={!!errorCodigo}
                 etiqueta="Código de verificación de 6 dígitos" />

  valor: string con los dígitos ('' al empezar). onCambio(nuevoString).
*/
export default function InputCodigo({ valor = '', onCambio, largo = 6, etiqueta, error = false, idError, autoFocus = true }) {
  const casillas = useRef([]);
  const digitos = Array.from({ length: largo }, (_, i) => valor[i] ?? '');

  const poner = (i, d) => {
    const nuevo = [...digitos];
    nuevo[i] = d;
    onCambio(nuevo.join('').slice(0, largo));
  };

  const alCambiar = (i, e) => {
    const d = e.target.value.replace(/\D/g, '').slice(-1);
    if (!d && e.target.value !== '') return;
    poner(i, d);
    if (d && i < largo - 1) casillas.current[i + 1]?.focus();
  };

  const alTecla = (i, e) => {
    if (e.key === 'Backspace' && !digitos[i] && i > 0) casillas.current[i - 1]?.focus();
    if (e.key === 'ArrowLeft' && i > 0) { e.preventDefault(); casillas.current[i - 1]?.focus(); }
    if (e.key === 'ArrowRight' && i < largo - 1) { e.preventDefault(); casillas.current[i + 1]?.focus(); }
  };

  const alPegar = (e) => {
    const pegado = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, largo);
    if (!pegado) return;
    e.preventDefault();
    onCambio(pegado);
    casillas.current[Math.min(pegado.length, largo - 1)]?.focus();
  };

  return (
    <fieldset className={`qp-codigo${error ? ' con-error' : ''}`}>
      <legend className="sr-only">{etiqueta}</legend>
      {digitos.map((d, i) => (
        <input
          key={i}
          ref={(el) => { casillas.current[i] = el; }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          className={`qp-codigo__casilla${d ? ' llena' : ''}`}
          aria-label={`Dígito ${i + 1} de ${largo}`}
          aria-invalid={error || undefined}
          aria-describedby={error && idError ? idError : undefined}
          value={d}
          onChange={(e) => alCambiar(i, e)}
          onKeyDown={(e) => alTecla(i, e)}
          onPaste={alPegar}
          onFocus={(e) => e.target.select()}
          autoFocus={autoFocus && i === 0}
        />
      ))}
    </fieldset>
  );
}
