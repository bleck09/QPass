import { FaMinus, FaPlus } from 'react-icons/fa';
import './SelectorCantidad.css';

/*
  Selector de cantidad [−] n [+] (PLAN §2.10: estaba copiado en Ayudante x2
  y en la calculadora de la página del evento).

    <SelectorCantidad valor={n} onMenos={…} onMas={…} nombre="Hamburguesa" />

  nombre: para los aria-label ("Quitar un Hamburguesa" / "Sumar un …").
  ocultarEnCero: con 0 solo se ve el [+] (calculadora de presupuesto).
  maximo: si valor >= maximo, el [+] queda deshabilitado.
  tamano: 'md' (defecto) | 'sm'.
  Colores tematizables con --cant-* (página del evento con su paleta).
*/
export default function SelectorCantidad({
  valor,
  onMenos,
  onMas,
  nombre = '',
  ocultarEnCero = false,
  maximo = Infinity,
  tamano = 'md',
  className = '',
}) {
  const conMenos = !(ocultarEnCero && valor <= 0);
  return (
    <span className={`qp-cantidad qp-cantidad--${tamano} ${className}`.trim()}>
      {conMenos && (
        <>
          <button type="button" className="qp-cantidad__btn" onClick={onMenos} aria-label={`Quitar un ${nombre}`.trim()}>
            <FaMinus aria-hidden="true" />
          </button>
          <span key={valor} className="qp-cantidad__valor" aria-live="polite">{valor}</span>
        </>
      )}
      <button
        type="button"
        className="qp-cantidad__btn"
        onClick={onMas}
        disabled={valor >= maximo}
        aria-label={`Sumar un ${nombre}`.trim()}
      >
        <FaPlus aria-hidden="true" />
      </button>
    </span>
  );
}
