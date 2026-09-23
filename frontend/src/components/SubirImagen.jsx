import { useState } from 'react';
import { FaImage, FaTimes, FaUpload } from 'react-icons/fa';
import Boton from './Boton.jsx';
import { AvisoFijo, useAvisos } from './Avisos.jsx';
import { subirImagenDeInput } from '../utils/imagenes.js';

/*
  Campo "subir una imagen" (PLAN §2.10). Envuelve las clases GLOBALES de
  forms.css (.upload-zone / .preview-zone / .img-preview): no trae estilos
  propios. Se hizo porque el bloque (zona + vista previa + "Quitar imagen" +
  manejador de subida con su try/catch) estaba copiado en 6 pantallas.

    <SubirImagen id="logo" etiqueta="Logo del puesto (opcional)" carpeta="puestos"
                 valor={form.logo} onCambio={(url) => setForm({ ...form, logo: url })} />

  valor: URL actual ('' = sin imagen). onCambio(url | ''). avatar: vista
  previa redonda (fotos de personas). Mientras sube se ve "Subiendo…"; si
  falla, aviso de error (no se pierde lo que había).

  maxBytes: tope propio de la pantalla, más chico que el del backend (8 MB).
  Ej.: la imagen del evento se ve en la cartelera y no debe pasar de 3 MB.
  Si la imagen guardada no se puede mostrar (URL rota, formato raro), se
  avisa en línea y se ofrece quitarla: antes quedaba un cuadro vacío.
*/
export default function SubirImagen({
  id,
  etiqueta,
  valor,
  onCambio,
  carpeta,
  texto = 'Hacé clic para subir una imagen',
  subtexto = 'PNG o JPG hasta 2 MB',
  altVista = 'Vista previa',
  avatar = false,
  maxBytes = null,
  anchoVista,
  altoVista,
}) {
  const avisos = useAvisos();
  const [subiendo, setSubiendo] = useState(false);
  const [rota, setRota] = useState(false);

  const alElegir = async (e) => {
    const archivo = e.target.files[0];
    e.target.value = '';
    if (!archivo) return;
    if (maxBytes && archivo.size > maxBytes) {
      const mb = Math.round(maxBytes / (1024 * 1024));
      avisos.error(`La imagen no debe superar los ${mb} MB.`, { titulo: 'Imagen muy pesada' });
      return;
    }
    setSubiendo(true);
    setRota(false);
    try {
      onCambio(await subirImagenDeInput(archivo, carpeta));
    } catch (err) {
      avisos.error(err.message, { titulo: 'No se pudo subir la imagen' });
    } finally {
      setSubiendo(false);
    }
  };

  const quitar = () => {
    setRota(false);
    onCambio('');
  };

  return (
    <div className="input-group">
      <label htmlFor={id}><FaImage aria-hidden="true" /> {etiqueta}</label>
      {!valor ? (
        <div className={`upload-zone${subiendo ? ' subiendo' : ''}`} aria-busy={subiendo || undefined}>
          <FaUpload className="upload-icon" aria-hidden="true" />
          <span className="upload-text">{subiendo ? 'Subiendo…' : texto}</span>
          {!subiendo && <span className="upload-subtext">{subtexto}</span>}
          <input id={id} type="file" accept="image/*" onChange={alElegir} className="upload-input-hidden" disabled={subiendo} />
        </div>
      ) : rota ? (
        <>
          <AvisoFijo tono="aviso">
            No se puede mostrar esta imagen. Probá con otra en formato JPG o PNG.
          </AvisoFijo>
          <Boton variante="peligro-suave" tamano="sm" icono={FaTimes} onClick={quitar}>Quitar imagen</Boton>
        </>
      ) : (
        <div className="preview-zone">
          <img
            width={anchoVista ?? (avatar ? 80 : 200)}
            height={altoVista ?? (avatar ? 80 : 200)}
            src={valor}
            alt={altVista}
            className={avatar ? 'img-preview-avatar' : 'img-preview'}
            onError={() => setRota(true)}
          />
          <Boton variante="peligro-suave" tamano="sm" icono={FaTimes} onClick={quitar}>Quitar imagen</Boton>
        </div>
      )}
    </div>
  );
}
