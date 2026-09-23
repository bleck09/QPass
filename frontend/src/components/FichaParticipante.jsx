import FotoZoom from './FotoZoom.jsx';
import './FichaParticipante.css';

/*
  Ficha de la persona de una manilla escaneada: foto, nombre y sus datos
  (PLAN §2.10: estaba copiada en Ayudante, Recargador x2 y Devolución, cada
  una con su prefijo). Sirve para cobrar, recargar y devolver.

    <FichaParticipante
      estado={<Insignia tono="ok" icono={FaCheckCircle} solida>Código QR válido</Insignia>}
      foto={entrada.usuario?.foto || entrada.foto}
      nombre={entrada.nombre}
      datos={[
        { icono: FaIdCard, etiqueta: 'Documento', valor: ciDeEntrada(entrada) },
        { icono: FaWallet, etiqueta: 'Saldo', valor: `${saldo} pts`, destacado: true, nota: '…' },
      ]}
    />

  datos: los que tienen valor null / undefined no se muestran ('' tampoco).
*/
export default function FichaParticipante({ estado, foto, nombre, datos = [], className = '' }) {
  const visibles = datos.filter((d) => d && d.valor != null && d.valor !== '');
  return (
    <div className={`qp-ficha ${className}`.trim()}>
      {estado && <div className="qp-ficha__estado">{estado}</div>}
      {foto && (
        <FotoZoom width={120} height={120} src={foto} alt={`Foto de ${nombre}`} className="qp-ficha__foto" />
      )}
      <h2 className="qp-ficha__nombre">{nombre}</h2>
      {visibles.length > 0 && (
        <dl className="qp-ficha__datos">
          {visibles.map(({ icono: Icono, etiqueta, valor, nota, destacado }) => (
            <div key={etiqueta} className={`qp-ficha__dato${destacado ? ' destacado' : ''}`}>
              {Icono && <Icono className="qp-ficha__ic" aria-hidden="true" />}
              <div>
                <dt>{etiqueta}</dt>
                <dd>{valor}</dd>
                {nota && <small className="qp-ficha__nota">{nota}</small>}
              </div>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
