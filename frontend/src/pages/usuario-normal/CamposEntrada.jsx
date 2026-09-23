import Campo from '../../components/Campo.jsx';
import { CAMPOS_ENTRADA, idCampoEntrada } from '../../utils/entradas.js';

/**
 * Nombre, correo y celular de UNA entrada, con su error en línea debajo de
 * cada campo. Lo usan "Comprar entradas" y "Revisar mi solicitud" (mismo
 * bloque, mismas reglas: utils/entradas.js). Cada campo es el <Campo> global
 * (.input-group de forms.css).
 *
 * @param {object}   entrada
 * @param {object}   errores  { nombre?, correo?, celular? } de esta entrada
 * @param {(campo, valor) => void} onCambio
 * @param {string}   prefijo  para los id de los campos ('compra', 'rev')
 */
export default function CamposEntrada({ entrada, errores = {}, onCambio, prefijo }) {
  return CAMPOS_ENTRADA.map(({ campo, etiqueta, soloInvitado, ...control }) => (
    <Campo
      key={campo}
      id={idCampoEntrada(prefijo, campo, entrada.id)}
      etiqueta={<>{etiqueta}{campo === 'celular' && entrada.isTitular && ' · opcional'}</>}
      {...control}
      value={entrada[campo] ?? ''}
      onChange={(e) => onCambio(campo, e.target.value)}
      disabled={soloInvitado && entrada.isTitular}
      error={errores[campo]}
    />
  ));
}
