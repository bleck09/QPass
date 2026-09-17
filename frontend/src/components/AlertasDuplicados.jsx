import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaTimes, FaUserSecret } from 'react-icons/fa';
import api from '../api/index.js';
import { leerSesion } from '../api/client.js';
import { formatearFecha } from '../utils/eventos.js';
import { ubicacionAlerta } from '../utils/duplicados.js';
import './AlertasDuplicados.css';

const INTERVALO_MS = 10000;
const MAX_VISIBLES = 4;
// Última alerta vista, por usuario: al recargar la página no se repiten.
const claveDesde = (usuarioId) => `qpass-alertas-duplicado-desde-${usuarioId}`;

const leerDesde = (usuarioId) => {
  try {
    return localStorage.getItem(claveDesde(usuarioId)) || undefined;
  } catch {
    return undefined;
  }
};

const guardarDesde = (usuarioId, valor) => {
  try {
    localStorage.setItem(claveDesde(usuarioId), valor);
  } catch { /* noop */ }
};

/*
  Avisos flotantes para Supervisor / Admin / Cliente: alguien escaneó la COPIA de
  una manilla duplicada. Consulta al backend cada 10 s (no hay websockets) y
  muestra la foto del falso + dónde se lo vio. Se monta una sola vez en MenuLateral.
*/
export default function AlertasDuplicados({ usuarioId }) {
  const navigate = useNavigate();
  const [alertas, setAlertas] = useState([]);
  const desdeRef = useRef(leerDesde(usuarioId));

  useEffect(() => {
    let cancelado = false;
    const consultar = async () => {
      // Sin sesión (token vencido, logout en otra pestaña) no se consulta: si no,
      // este polling sería el que dispara el cierre de sesión por su cuenta.
      if (!leerSesion()?.token) return;
      try {
        const nuevas = await api.casosDuplicado.alertas({ desde: desdeRef.current });
        if (cancelado || !nuevas.length) return;
        // Vienen de la más nueva a la más vieja.
        desdeRef.current = nuevas[0].createdAt;
        guardarDesde(usuarioId, nuevas[0].createdAt);
        setAlertas((previas) => [...nuevas, ...previas].slice(0, MAX_VISIBLES));
      } catch { /* sin conexión: se reintenta en el próximo ciclo */ }
    };
    consultar();
    const t = setInterval(consultar, INTERVALO_MS);
    return () => {
      cancelado = true;
      clearInterval(t);
    };
  }, [usuarioId]);

  if (!alertas.length) return null;

  const descartar = (id) => setAlertas((previas) => previas.filter((a) => a.id !== id));

  return (
    <div className="qp-alertas-dup" role="alert" aria-live="assertive">
      {alertas.map((a) => (
        <div key={a.id} className="qp-alertas-dup__item">
          {a.fotoSospechoso
            ? <img src={a.fotoSospechoso} alt="Persona con la manilla copiada" width="56" height="56" />
            : <span className="qp-alertas-dup__icono"><FaUserSecret aria-hidden="true" /></span>}
          <div className="qp-alertas-dup__texto">
            <strong>Manilla falsa escaneada</strong>
            <span>{ubicacionAlerta(a)}</span>
            <span className="qp-alertas-dup__meta">
              {a.evento.nombre} · manilla N.º {a.numeroManilla} · {formatearFecha(a.createdAt)}
            </span>
            <button
              type="button"
              className="btn-secundario-sm"
              onClick={() => {
                descartar(a.id);
                navigate('/duplicados');
              }}
            >
              Ver personas por encontrar
            </button>
          </div>
          <button
            type="button"
            className="qp-alertas-dup__cerrar"
            onClick={() => descartar(a.id)}
            aria-label="Descartar aviso"
          >
            <FaTimes aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}
