import { useState } from 'react';
import {
  FaEnvelope, FaWhatsapp, FaMapMarkerAlt, FaCalendarCheck,
  FaArrowRight, FaExternalLinkAlt,
} from 'react-icons/fa';
import { CONTACTO, MOTIVOS_CONTACTO } from '../../constants/contacto.js';
import './ContactoSection.css';
import Boton from '../../components/Boton.jsx';

const MOTIVOS = Object.values(MOTIVOS_CONTACTO);

/**
 * `motivo`: motivo a preseleccionar. Lo cambian los CTA de las secciones de
 * Organizadores / Asistentes antes de saltar a #contacto.
 */
export default function ContactoSection({ motivo = MOTIVOS[0] }) {
  const [form, setForm] = useState({
    nombre: '', correo: '', motivo, mensaje: '',
  });
  const [enviado, setEnviado] = useState(false);

  // Si el padre pide otro motivo, se ajusta durante el render (patrón de React
  // para derivar estado de una prop) sin perder lo que ya se escribió.
  const [motivoPrevio, setMotivoPrevio] = useState(motivo);
  if (motivo !== motivoPrevio) {
    setMotivoPrevio(motivo);
    setForm((f) => ({ ...f, motivo }));
  }

  const elegirOrganizar = () => {
    setForm((f) => ({ ...f, motivo: MOTIVOS_CONTACTO.organizar }));
    setEnviado(false);
    document.getElementById('contacto-nombre')?.focus();
  };

  const cambiar = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    setEnviado(false);
  };

  /**
   * No hay endpoint de contacto: se abre el cliente de correo del visitante
   * con el mensaje ya redactado. Es honesto (el visitante ve exactamente qué
   * se manda y a quién) y no necesita backend. Si más adelante se agrega un
   * POST /contacto, solo cambia este handler.
   */
  const enviar = (e) => {
    e.preventDefault();
    const asunto = `[QPass] ${form.motivo}`;
    const cuerpo = [
      `Nombre: ${form.nombre}`,
      `Correo: ${form.correo}`,
      `Motivo: ${form.motivo}`,
      '',
      form.mensaje,
    ].join('\n');

    window.location.href =
      `mailto:${CONTACTO.correo}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
    setEnviado(true);
  };

  return (
    <div className="qp-contacto__grid">
      {/* --- Canales directos --- */}
      <div className="qp-contacto__canales">
        <h3 className="qp-contacto__canales-titulo">Escribinos por donde te quede cómodo</h3>

        <ul className="qp-contacto__lista">
          <li>
            <span className="qp-contacto__ic" aria-hidden="true"><FaEnvelope /></span>
            <span className="qp-contacto__dato">
              <em>Correo</em>
              <a href={`mailto:${CONTACTO.correo}`}>{CONTACTO.correo}</a>
            </span>
          </li>
          <li>
            <span className="qp-contacto__ic" aria-hidden="true"><FaWhatsapp /></span>
            <span className="qp-contacto__dato">
              <em>WhatsApp</em>
              <a href={CONTACTO.whatsappUrl} target="_blank" rel="noreferrer">
                {CONTACTO.whatsapp}
                <FaExternalLinkAlt className="qp-contacto__ext" aria-hidden="true" />
              </a>
            </span>
          </li>
          <li>
            <span className="qp-contacto__ic" aria-hidden="true"><FaMapMarkerAlt /></span>
            <span className="qp-contacto__dato">
              <em>Dónde estamos</em>
              <span>{CONTACTO.ciudad}</span>
            </span>
          </li>
        </ul>

        {/* Atajo: elige el motivo "organizar" en el formulario y lleva el foco
            al primer campo. Antes era un recuadro solo informativo. */}
        <button type="button" className="qp-contacto__destacado" onClick={elegirOrganizar}>
          <span className="qp-contacto__ic qp-contacto__ic--alt" aria-hidden="true">
            <FaCalendarCheck />
          </span>
          <span className="qp-contacto__destacado-txt">
            <strong>¿Organizás un evento?</strong>
            <span>
              Contanos la fecha y el lugar y te armamos el cashless completo: entradas,
              manillas QR, puntos de recarga y cierre de caja.
            </span>
            <em>Completá el formulario <FaArrowRight aria-hidden="true" /></em>
          </span>
        </button>
      </div>

      {/* --- Formulario --- */}
      <form className="qp-contacto__form formulario glass-morphism" onSubmit={enviar}>
        <div className="input-group">
          <label htmlFor="contacto-nombre">Tu nombre</label>
          <input
            id="contacto-nombre" name="nombre" type="text" required
            value={form.nombre} onChange={cambiar}
            placeholder="Nombre y apellido" autoComplete="name"
          />
        </div>

        <div className="input-group">
          <label htmlFor="contacto-correo">Tu correo</label>
          <input
            id="contacto-correo" name="correo" type="email" required
            value={form.correo} onChange={cambiar}
            placeholder="vos@correo.com" autoComplete="email"
          />
        </div>

        <div className="input-group">
          <label htmlFor="contacto-motivo">¿De qué se trata?</label>
          <select id="contacto-motivo" name="motivo" value={form.motivo} onChange={cambiar}>
            {MOTIVOS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        <div className="input-group">
          <label htmlFor="contacto-mensaje">Tu mensaje</label>
          <textarea
            id="contacto-mensaje" name="mensaje" rows={4} required
            value={form.mensaje} onChange={cambiar}
            placeholder="Contanos brevemente qué necesitás."
          />
        </div>

        <Boton type="submit" variante="acento" pildora anchoCompleto iconoDerecha={FaArrowRight}>
          Enviar mensaje
        </Boton>

        {/* aria-live: quien usa lector de pantalla se entera del cambio sin mover el foco. */}
        <p className="qp-contacto__aviso" role="status" aria-live="polite">
          {enviado
            ? 'Abrimos tu correo con el mensaje listo. Si no se abrió, escribinos directo a ' + CONTACTO.correo
            : 'Se abre tu aplicación de correo con el mensaje ya redactado.'}
        </p>
      </form>
    </div>
  );
}
