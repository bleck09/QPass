import { useCallback, useState } from 'react';
import { FaPlus, FaTrash, FaPen, FaClock, FaUsers, FaCheck, FaTimes } from 'react-icons/fa';
import { useApi } from '../../utils/useApi.js';
import api from '../../api/index.js';
import Tabla from '../../components/Tabla.jsx';
import { EstadoCarga, EstadoError } from '../../components/EstadosAsync.jsx';
import './AdminJornadas.css';

// ISO -> "YYYY-MM-DDTHH:mm" (hora local, para <input type="datetime-local">).
const isoALocal = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
};
const fmt = (iso) =>
  new Date(iso).toLocaleString('es-BO', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  });

const FORM_VACIO = { nombre: '', inicio: '', fin: '', aforoMaximo: '' };

export default function AdminJornadas({ eventoId, soloLectura = false }) {
  const cargar = useCallback(() => api.diasEvento.listar(eventoId), [eventoId]);
  const { data: jornadas, cargando, error, recargar } = useApi(cargar, { inicial: [] });

  const [form, setForm] = useState(FORM_VACIO);
  const [editandoId, setEditandoId] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [err, setErr] = useState('');

  const cambiar = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const abrirEditar = (j) => {
    setEditandoId(j.id);
    setForm({
      nombre: j.nombre || '',
      inicio: isoALocal(j.inicio),
      fin: isoALocal(j.fin),
      aforoMaximo: j.aforoMaximo != null ? String(j.aforoMaximo) : '',
    });
    setErr('');
  };

  const cancelar = () => {
    setEditandoId(null);
    setForm(FORM_VACIO);
    setErr('');
  };

  const guardar = async (e) => {
    e.preventDefault();
    if (!form.inicio || !form.fin) return;
    setGuardando(true);
    setErr('');
    try {
      const payload = {
        nombre: form.nombre.trim() || undefined,
        inicio: new Date(form.inicio).toISOString(),
        fin: new Date(form.fin).toISOString(),
        aforoMaximo: form.aforoMaximo === '' ? undefined : Number(form.aforoMaximo),
      };
      if (editandoId) {
        await api.diasEvento.actualizar(editandoId, payload);
      } else {
        await api.diasEvento.crear({ eventoId, ...payload });
      }
      cancelar();
      recargar();
    } catch (e2) {
      setErr(e2?.message || 'No se pudo guardar la jornada.');
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (id) => {
    setErr('');
    try {
      await api.diasEvento.eliminar(id);
      recargar();
    } catch (e2) {
      setErr(e2?.message || 'No se pudo borrar la jornada.');
    }
  };

  if (error) return <EstadoError onReintentar={recargar} />;
  if (cargando) return <EstadoCarga filas={3} />;

  return (
    <section className="pi-jor-seccion">
      <h3 className="pi-jor-titulo"><FaClock aria-hidden="true" /> Jornadas del evento</h3>
      <p className="pi-jor-ayuda">
        Cada jornada es una noche del evento (una fiesta puede ir de 20:00 a 02:00).
        Las categorías de ticket y las manillas se generan <strong>por jornada</strong>,
        y el aforo se controla por jornada. Un evento de una sola noche tiene una.
      </p>

      <Tabla
        columnas={['Jornada', 'Inicio', 'Fin', { texto: 'Aforo', align: 'center' }, { texto: 'Acciones', srOnly: true }]}
        datos={jornadas}
        vacio="Este evento no tiene jornadas."
        renderFila={(j, i) => (
          <tr key={j.id}>
            <td>{j.nombre || `Día ${j.orden ?? i + 1}`}</td>
            <td>{fmt(j.inicio)}</td>
            <td>{fmt(j.fin)}</td>
            <td style={{ textAlign: 'center' }}>{j.aforoMaximo ?? '—'}</td>
            <td className="pi-jor-acciones">
              {!soloLectura && (
                <>
                  <button type="button" className="pi-jor-btn-editar" onClick={() => abrirEditar(j)} title="Editar">
                    <FaPen />
                  </button>
                  <button type="button" className="pi-jor-btn-borrar" onClick={() => eliminar(j.id)} title="Borrar">
                    <FaTrash />
                  </button>
                </>
              )}
            </td>
          </tr>
        )}
      />

      {err && <p className="pi-jor-error"><FaTimes aria-hidden="true" /> {err}</p>}

      {!soloLectura && (
        <form className="pi-jor-form" onSubmit={guardar}>
          <h4>{editandoId ? 'Editar jornada' : 'Agregar jornada'}</h4>
          <div className="pi-jor-grid">
            <label>
              Nombre (opcional)
              <input type="text" name="nombre" value={form.nombre} onChange={cambiar} placeholder="Noche de apertura" />
            </label>
            <label>
              Inicio
              <input type="datetime-local" name="inicio" value={form.inicio} onChange={cambiar} required />
            </label>
            <label>
              Fin
              <input type="datetime-local" name="fin" value={form.fin} onChange={cambiar} required />
            </label>
            <label>
              <span><FaUsers aria-hidden="true" /> Aforo máximo (opcional)</span>
              <input type="number" name="aforoMaximo" min="1" step="1" value={form.aforoMaximo} onChange={cambiar} placeholder="alerta al 95%" />
            </label>
          </div>
          <div className="pi-jor-form-acciones">
            <button type="submit" className="pi-jor-btn-guardar" disabled={guardando}>
              {editandoId ? <><FaCheck /> Guardar cambios</> : <><FaPlus /> Agregar jornada</>}
            </button>
            {editandoId && (
              <button type="button" className="pi-jor-btn-cancelar" onClick={cancelar}>Cancelar</button>
            )}
          </div>
        </form>
      )}
    </section>
  );
}
