import { useCallback, useMemo, useRef, useState } from 'react';
import { FaPlus, FaTrash, FaPen, FaClock, FaUsers, FaCheck, FaTag } from 'react-icons/fa';
import { useApi } from '../../utils/useApi.js';
import api from '../../api/index.js';
import Tabla from '../../components/Tabla.jsx';
import Boton from '../../components/Boton.jsx';
import Campo from '../../components/Campo.jsx';
import CalendarioEventos from '../../components/CalendarioEventos.jsx';
import { AvisoFijo, useAvisos } from '../../components/Avisos.jsx';
import { useConfirmar } from '../../components/ConfirmarModal.jsx';
import { diaLocalISO } from '../../utils/eventos.js';
import { limpiarErrores, enfocarPrimero } from '../../utils/validacion.js';
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

const validarJornada = (f) => limpiarErrores({
  'jor-inicio': f.inicio ? null : 'Elegí cuándo empieza.',
  'jor-fin': !f.fin ? 'Elegí cuándo termina.' : f.inicio && f.fin <= f.inicio ? 'Tiene que terminar después de empezar.' : null,
  'jor-aforo': f.aforoMaximo !== '' && !(Number(f.aforoMaximo) >= 1) ? 'El aforo tiene que ser 1 o más.' : null,
});

const nombreDe = (j, i) => j.nombre || `Día ${j.orden ?? i + 1}`;

export default function AdminJornadas({ eventoId, soloLectura = false }) {
  const avisos = useAvisos();
  const [confirmar, DialogoConfirmar] = useConfirmar();
  const cargar = useCallback(() => api.diasEvento.listar(eventoId), [eventoId]);
  const { data: jornadas, cargando, error, recargar } = useApi(cargar, { inicial: [] });

  const [form, setForm] = useState(FORM_VACIO);
  const [editandoId, setEditandoId] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [intento, setIntento] = useState(false);
  const [err, setErr] = useState('');
  const formRef = useRef(null);

  // Rango de días que ocupan TODAS las jornadas del evento (para el mini
  // calendario de referencia de abajo) — de solo lectura, no se puede
  // clickear, es nomás "acá cae la fiesta".
  const rangoDias = useMemo(() => {
    if (jornadas.length === 0) return null;
    const desde = jornadas.reduce((min, j) => diaLocalISO(j.inicio) < min ? diaLocalISO(j.inicio) : min, diaLocalISO(jornadas[0].inicio));
    const hasta = jornadas.reduce((max, j) => diaLocalISO(j.fin) > max ? diaLocalISO(j.fin) : max, diaLocalISO(jornadas[0].fin));
    return { desde, hasta };
  }, [jornadas]);

  const errores = intento ? validarJornada(form) : {};
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
    setIntento(false);
    // Que se note que hay algo cargado para editar (si no, parece que
    // "Editar" no hizo nada).
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const cancelar = () => {
    setEditandoId(null);
    setForm(FORM_VACIO);
    setErr('');
    setIntento(false);
  };

  const guardar = async (e) => {
    e.preventDefault();
    setIntento(true);
    const errs = validarJornada(form);
    if (Object.keys(errs).length) return enfocarPrimero(errs, ['jor-inicio', 'jor-fin', 'jor-aforo']);
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
      avisos.exito(editandoId ? 'Los cambios de la jornada quedaron guardados.' : 'La jornada se agregó al evento.');
      cancelar();
      recargar();
    } catch (e2) {
      setErr(e2?.message || 'No se pudo guardar la jornada.');
    } finally {
      setGuardando(false);
    }
  };

  // Borrar una jornada: destructivo (de ella cuelgan categorías de ticket y
  // manillas) -> se confirma (PLAN §2.4). Antes se borraba al primer clic.
  const eliminar = async (j, i) => {
    const ok = await confirmar({
      titulo: `¿Borrar la jornada "${nombreDe(j, i)}"?`,
      mensaje: 'Las categorías de ticket y las manillas se generan por jornada. Si ya tiene alguna, el sistema no deja borrarla.',
      textoConfirmar: 'Borrar jornada',
      peligroso: true,
    });
    if (!ok) return;
    try {
      await api.diasEvento.eliminar(j.id);
      if (editandoId === j.id) cancelar();
      recargar();
      avisos.exito(`La jornada "${nombreDe(j, i)}" se borró.`);
    } catch (e2) {
      avisos.error(e2?.message || 'No se pudo borrar la jornada.', { titulo: 'No se pudo borrar' });
    }
  };

  if (error) return <EstadoError onReintentar={recargar} />;
  if (cargando) return <EstadoCarga filas={3} />;

  return (
    <section className="pi-jor-seccion">
      <h3 className="pi-jor-titulo"><FaClock aria-hidden="true" /> Jornadas del evento</h3>
      <p className="texto-ayuda">
        Cada jornada es una noche del evento (una fiesta puede ir de 20:00 a 02:00).
        Las categorías de ticket y las manillas se generan <strong>por jornada</strong>,
        y el aforo se controla por jornada. Un evento de una sola noche tiene una.
      </p>

      <div className="pi-jor-arriba">
        <div className="pi-jor-arriba-izq">
          {rangoDias && (
            <div className="pi-jor-mini-calendario">
              <CalendarioEventos eventos={[]} rangoSeleccionado={rangoDias} mini />
            </div>
          )}
        </div>

        <div className="pi-jor-arriba-der">
          <Tabla
            card
            columnas={['Jornada', 'Inicio', 'Fin', { texto: 'Aforo', align: 'center' }, { texto: 'Acciones', srOnly: true }]}
            datos={jornadas}
            vacio="Este evento no tiene jornadas."
            renderFila={(j, i) => (
              <tr key={j.id} className={editandoId === j.id ? 'pi-jor-fila--editando' : ''}>
                <td className="fila-nombre">{nombreDe(j, i)}</td>
                <td>{fmt(j.inicio)}</td>
                <td>{fmt(j.fin)}</td>
                <td className="td-centro">{j.aforoMaximo ?? '—'}</td>
                <td>
                  {!soloLectura && (
                    <div className="btn-acciones">
                      <Boton variante="secundario" tamano="sm" icono={FaPen} onClick={() => abrirEditar(j)}>Editar</Boton>
                      <Boton variante="peligro-suave" tamano="sm" icono={FaTrash} onClick={() => eliminar(j, i)}>Borrar</Boton>
                    </div>
                  )}
                </td>
              </tr>
            )}
          />
        </div>
      </div>

      {!soloLectura && (
        <form ref={formRef} className={`pi-jor-form${editandoId ? ' pi-jor-form--editando' : ''}`} onSubmit={guardar} noValidate>
          <h4>{editandoId ? <><FaPen aria-hidden="true" /> Editando: {form.nombre || 'esta jornada'}</> : <><FaPlus aria-hidden="true" /> Agregar jornada</>}</h4>
          <div className="pi-jor-grid">
            <Campo id="jor-nombre" etiqueta="Nombre (opcional)" icono={FaTag} name="nombre" placeholder="Noche de apertura"
              value={form.nombre} onChange={cambiar} />
            <Campo id="jor-inicio" etiqueta="Inicio" type="datetime-local" name="inicio"
              value={form.inicio} onChange={cambiar} error={errores['jor-inicio']} />
            <Campo id="jor-fin" etiqueta="Fin" type="datetime-local" name="fin" min={form.inicio || undefined}
              value={form.fin} onChange={cambiar} error={errores['jor-fin']} />
            <Campo id="jor-aforo" etiqueta={<><FaUsers aria-hidden="true" /> Aforo máximo (opcional)</>} type="number" name="aforoMaximo"
              min="1" step="1" placeholder="Alerta al 95%" ayuda="Se avisa al llegar al 95%."
              value={form.aforoMaximo} onChange={cambiar} error={errores['jor-aforo']} />
          </div>
          {err && <AvisoFijo tono="error">{err}</AvisoFijo>}
          <div className="btn-acciones">
            <Boton type="submit" icono={editandoId ? FaCheck : FaPlus} cargando={guardando}>
              {editandoId ? 'Guardar cambios' : 'Agregar jornada'}
            </Boton>
            {editandoId && <Boton variante="secundario" onClick={cancelar} disabled={guardando}>Cancelar</Boton>}
          </div>
        </form>
      )}
      {DialogoConfirmar}
    </section>
  );
}
