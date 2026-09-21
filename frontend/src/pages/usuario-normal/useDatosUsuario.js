import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../../api/index.js';
import { useApi } from '../../utils/useApi.js';
import { esVigente } from '../../utils/eventos.js';

/**
 * Datos del Usuario Normal que comparten varias pestañas: cartelera, compras,
 * entradas a mi nombre, billeteras e historial. Se cargan UNA vez en
 * UsuarioNormal.jsx y se pasan a cada pestaña (antes todo vivía en un solo
 * componente de ~2000 líneas).
 */
export function useDatosUsuario(usuario) {
  // Cartelera con estados cargando/error/reintentar (Manual 8.9).
  const cargarEventos = useCallback(() => api.eventos.listar(), []);
  const {
    data: todosEventos,
    cargando: cargandoEventos,
    error: errorEventos,
    recargar: recargarEventos,
  } = useApi(cargarEventos, { inicial: [] });
  const proximosEventos = todosEventos.filter(esVigente);
  // Los últimos 5 (por fecha del evento, no por orden de creación) — no toda
  // la cartelera histórica, que solo va a crecer con el tiempo.
  const eventosPasados = todosEventos
    .filter(ev => !esVigente(ev))
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
    .slice(0, 5);

  // --- ESTADOS DE COMPRAS (traídas del backend; Admin las aprueba desde su panel) ---
  const [compras, setCompras] = useState([]);
  // Entradas a MI nombre (titular o invitado). Incluye las que compró otra persona:
  // esas no aparecen en compras.mias() porque mi cuenta nunca fue "comprador".
  const [entradasANombreMio, setEntradasANombreMio] = useState([]);

  const recargarCompras = () => Promise.all([
    api.compras.mias().then(setCompras),
    api.entradas.mias().then(setEntradasANombreMio).catch(() => setEntradasANombreMio([])),
  ]);
  useEffect(() => { recargarCompras(); }, []);

  // Cada compra con su evento resuelto y si ese evento sigue vigente (para Mis Entradas).
  const comprasConEvento = useMemo(() => {
    return compras
      .filter(compra => compra.evento)
      .map(compra => ({ ...compra, vigente: esVigente(compra.evento) }))
      .sort((a, b) => new Date(b.evento.fecha) - new Date(a.evento.fecha));
  }, [compras]);

  // --- Billeteras (saldo POR EVENTO) e historial de movimientos ---
  const [historial, setHistorial] = useState([]);
  const [billeteras, setBilleteras] = useState([]);

  // eventoId -> saldo disponible: para avisar en la cartelera de eventos que
  // todavía te queda plata ahí (incluidos eventos ya pasados, por el retiro).
  const saldoPorEvento = useMemo(
    () => new Map(billeteras.map(b => [b.eventoId, Number(b.disponible ?? b.saldo)])),
    [billeteras],
  );

  // eventoId -> código QR de mi manilla en ese evento (titular o invitado): para
  // mostrarlo grande en "Mi Saldo" cuando el evento ya pasó y hay que retirar.
  const qrPorEvento = useMemo(() => {
    const m = new Map();
    entradasANombreMio.forEach(e => {
      if (e.evento && e.codigoQrVinculado) m.set(e.evento.id, e.codigoQrVinculado.codigo);
    });
    return m;
  }, [entradasANombreMio]);

  useEffect(() => {
    if (!usuario?.id) return;
    api.billeterasEvento.mias().then(setBilleteras).catch(() => setBilleteras([]));
    api.transacciones.listar({ usuarioId: usuario.id }).then(setHistorial);
  }, [usuario?.id]);

  return {
    todosEventos, cargandoEventos, errorEventos, recargarEventos, proximosEventos, eventosPasados,
    compras, entradasANombreMio, recargarCompras, comprasConEvento,
    historial, billeteras, saldoPorEvento, qrPorEvento,
  };
}
