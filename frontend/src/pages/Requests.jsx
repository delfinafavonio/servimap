import { useCallback, useEffect, useMemo, useState } from 'react';
import apiClient from '../services/apiClient';
import { useAuth } from '../context/auth-context';

const labels = { PENDIENTE: 'Pendiente', ACEPTADA: 'Aceptada', RECHAZADA: 'Rechazada', CANCELADA: 'Cancelada', FINALIZADA: 'Finalizada' };
const providerTabs = [['PENDIENTE', 'Pendientes'], ['ACEPTADA', 'Propuestas enviadas'], ['RECHAZADA', 'Rechazadas'], ['FINALIZADA', 'Historial']];
const clientTabs = [['ACTIVAS', 'Activas'], ['FINALIZADA', 'Finalizadas'], ['CANCELADAS', 'Canceladas']];
const emptyProposal = { solicitudId: '', fecha: '', horario: '', notaPropuesta: '' };
const today = () => { const current = new Date(); return `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`; };

export default function Requests() {
  const { usuario } = useAuth();
  const [items, setItems] = useState([]); const [error, setError] = useState(''); const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState(usuario.rol === 'CLIENTE' ? 'ACTIVAS' : 'PENDIENTE'); const [proposal, setProposal] = useState(emptyProposal); const [rejecting, setRejecting] = useState(null);
  const [proposalError, setProposalError] = useState(''); const [sendingProposal, setSendingProposal] = useState(false); const [rejectingBusy, setRejectingBusy] = useState(false);
  const [review, setReview] = useState({ solicitudId: '', puntaje: 5, comentario: '' });
  const load = useCallback(() => apiClient.get('/solicitudes').then(({ data }) => setItems(data)).catch((requestError) => setError(requestError.response?.data?.error || 'No pudimos cargar las solicitudes')), []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!proposal.solicitudId && !rejecting) return undefined;
    const closeOnEscape = (event) => { if (event.key === 'Escape' && !sendingProposal && !rejectingBusy) { setProposal(emptyProposal); setRejecting(null); setProposalError(''); } };
    window.addEventListener('keydown', closeOnEscape); return () => window.removeEventListener('keydown', closeOnEscape);
  }, [proposal.solicitudId, rejecting, sendingProposal, rejectingBusy]);

  const visibleItems = useMemo(() => {
    if (usuario.rol === 'CLIENTE') {
      if (activeTab === 'ACTIVAS') return items.filter((item) => ['PENDIENTE', 'ACEPTADA'].includes(item.estado));
      if (activeTab === 'CANCELADAS') return items.filter((item) => ['CANCELADA', 'RECHAZADA'].includes(item.estado));
      return items.filter((item) => item.estado === activeTab).sort((a, b) => new Date(b.fechaFinalizacion || b.fechaActualizacion) - new Date(a.fechaFinalizacion || a.fechaActualizacion));
    }
    if (usuario.rol !== 'PRESTADOR') return items;
    const filtered = items.filter((item) => item.estado === activeTab);
    return activeTab === 'FINALIZADA' ? filtered.sort((a, b) => new Date(b.fechaFinalizacion || b.fechaActualizacion) - new Date(a.fechaFinalizacion || a.fechaActualizacion)) : filtered;
  }, [activeTab, items, usuario.rol]);
  const activeCountLabel = activeTab === 'ACEPTADA' ? `${visibleItems.length} ${visibleItems.length === 1 ? 'propuesta enviada' : 'propuestas enviadas'}` : activeTab === 'RECHAZADA' ? `${visibleItems.length} ${visibleItems.length === 1 ? 'solicitud rechazada' : 'solicitudes rechazadas'}` : activeTab === 'FINALIZADA' ? `${visibleItems.length} ${visibleItems.length === 1 ? 'trabajo finalizado' : 'trabajos finalizados'}` : activeTab === 'ACTIVAS' ? `${visibleItems.length} ${visibleItems.length === 1 ? 'solicitud activa' : 'solicitudes activas'}` : activeTab === 'CANCELADAS' ? `${visibleItems.length} ${visibleItems.length === 1 ? 'solicitud cancelada' : 'solicitudes canceladas'}` : `${visibleItems.length} ${visibleItems.length === 1 ? 'solicitud pendiente' : 'solicitudes pendientes'}`;
  const selectTab = (status) => { setActiveTab(status); setProposal(emptyProposal); setRejecting(null); setProposalError(''); setError(''); setSuccess(''); };
  const replaceItem = (updated) => setItems((current) => current.map((item) => item.id === updated.id ? updated : item));
  const changeStatus = async (id, estado) => { if (estado === 'CANCELADA' && !window.confirm('¿Confirmás que querés cancelar esta solicitud?')) return; setError(''); setSuccess(''); try { const { data } = await apiClient.patch(`/solicitudes/${id}/estado`, { estado }); replaceItem(data); if (estado === 'FINALIZADA') { setActiveTab('FINALIZADA'); setSuccess('Trabajo marcado como finalizado.'); } } catch (requestError) { setError(requestError.response?.data?.error || 'No pudimos actualizar la solicitud'); } };
  const openProposal = (item) => { setError(''); setSuccess(''); setProposalError(''); setRejecting(null); setProposal({ ...emptyProposal, solicitudId: item.id }); };
  const closeProposal = () => { if (!sendingProposal) { setProposal(emptyProposal); setProposalError(''); } };
  const proposalDate = () => new Date(`${proposal.fecha}T${proposal.horario}`);
  const validateProposal = () => { const value = proposalDate(); return proposal.fecha && proposal.horario && !Number.isNaN(value.getTime()) && value > new Date(); };
  const sendProposal = async (event) => {
    event.preventDefault(); setError(''); setSuccess('');
    if (!validateProposal()) { setProposalError('Seleccioná una fecha y un horario futuros'); return; }
    setProposalError(''); setSendingProposal(true);
    try {
      const { data } = await apiClient.patch(`/solicitudes/${proposal.solicitudId}/estado`, { estado: 'ACEPTADA', fechaPropuesta: proposalDate().toISOString(), notaPropuesta: proposal.notaPropuesta });
      replaceItem(data); setProposal(emptyProposal); setActiveTab('ACEPTADA'); setSuccess('Propuesta enviada correctamente.');
    } catch (requestError) { setError(requestError.response?.data?.error || 'No pudimos enviar la propuesta'); }
    finally { setSendingProposal(false); }
  };
  const confirmReject = async () => {
    if (!rejecting || rejectingBusy) return;
    setError(''); setSuccess(''); setRejectingBusy(true);
    try { const { data } = await apiClient.patch(`/solicitudes/${rejecting.id}/estado`, { estado: 'RECHAZADA' }); replaceItem(data); setRejecting(null); setActiveTab('RECHAZADA'); setSuccess('Solicitud rechazada correctamente.'); }
    catch (requestError) { setError(requestError.response?.data?.error || 'No pudimos rechazar la solicitud'); }
    finally { setRejectingBusy(false); }
  };
  const sendReview = async (event) => { event.preventDefault(); setError(''); try { await apiClient.post('/calificaciones', review); setReview({ solicitudId: '', puntaje: 5, comentario: '' }); await load(); } catch (requestError) { setError(requestError.response?.data?.error || 'No pudimos guardar la calificación'); } };
  const actions = (item) => usuario.rol === 'PRESTADOR' ? item.estado === 'PENDIENTE' ? [['PROPONER', 'Aceptar'], ['RECHAZAR', 'Rechazar']] : item.estado === 'ACEPTADA' ? [['FINALIZADA', 'Marcar finalizada']] : [] : usuario.rol === 'CLIENTE' && ['PENDIENTE', 'ACEPTADA'].includes(item.estado) ? [['CANCELADA', 'Cancelar']] : [];
  const handleAction = (item, status) => {
    if (status === 'PROPONER') return openProposal(item);
    if (status === 'RECHAZAR') { setProposal(emptyProposal); setRejecting(item); setError(''); setSuccess(''); return; }
    if (status === 'FINALIZADA' && (!item.fechaPropuesta || new Date(item.fechaPropuesta) > new Date())) { setError('Todavía no podés finalizar el trabajo: esperá hasta la fecha y hora acordadas'); setSuccess(''); return; }
    changeStatus(item.id, status);
  };

  const tabs = usuario.rol === 'PRESTADOR' ? providerTabs : usuario.rol === 'CLIENTE' ? clientTabs : [];
  return <section className={['PRESTADOR', 'CLIENTE'].includes(usuario.rol) ? 'provider-requests client-requests' : undefined}><div className={['PRESTADOR', 'CLIENTE'].includes(usuario.rol) ? 'requests-heading' : 'page-heading'}>{usuario.rol === 'ADMINISTRADOR' && <span className="eyebrow">Actividad</span>}<div className="requests-title"><h1>{usuario.rol === 'PRESTADOR' ? 'Solicitudes recibidas' : usuario.rol === 'CLIENTE' ? 'Mis solicitudes' : 'Todas las solicitudes'}</h1>{usuario.rol !== 'ADMINISTRADOR' && <p>{activeCountLabel}</p>}</div>{tabs.length > 0 && <div className="request-tabs" role="tablist" aria-label="Estados de solicitudes">{tabs.map(([status, label]) => <button type="button" role="tab" aria-selected={activeTab === status} key={status} className={`button ${activeTab === status ? 'active' : ''}`} onClick={() => selectTab(status)}>{label}</button>)}</div>}</div>{error && <p className="form-error" role="alert">{error}</p>}{success && <p className="form-success" role="status">{success}</p>}
    <div className="request-list">{visibleItems.length === 0 ? <div className="empty-state"><h3>No hay solicitudes todavía</h3><p>Cuando haya actividad, la vas a ver acá.</p></div> : visibleItems.map((item) => <article className="card request-item" key={item.id}><div><span className={`status ${item.estado.toLowerCase()}`}>{labels[item.estado]}</span><h3>{item.oficio.nombre}</h3><p>{item.descripcion}</p><div className="request-details"><small>{usuario.rol === 'PRESTADOR' ? `Cliente: ${item.cliente.usuario.nombre} ${item.cliente.usuario.apellido}` : `Prestador: ${item.prestador.usuario.nombre} ${item.prestador.usuario.apellido}`}</small><small>Solicitud: {new Date(item.fechaCreacion).toLocaleDateString('es-AR')}{item.distanciaKm != null ? ` · ${item.distanciaKm} km` : ''}</small>{item.fechaPropuesta && <small>Propuesta: {new Date(item.fechaPropuesta).toLocaleString('es-AR')}{item.notaPropuesta ? ` · ${item.notaPropuesta}` : ''}</small>}{item.fechaFinalizacion && <small>Finalización: {new Date(item.fechaFinalizacion).toLocaleString('es-AR')}</small>}</div></div><div className="request-actions">{actions(item).map(([status, label]) => <button key={status} className={`button ${status === 'PROPONER' || status === 'FINALIZADA' ? 'primary' : 'subtle'}`} onClick={() => handleAction(item, status)}>{label}</button>)}{usuario.rol === 'CLIENTE' && item.estado === 'FINALIZADA' && !item.calificacion && <button className="button secondary" onClick={() => setReview({ ...review, solicitudId: item.id })}>Calificar</button>}{item.calificacion && <span className="rating">{'★'.repeat(item.calificacion.puntaje)}</span>}</div></article>)}</div>
    {proposal.solicitudId && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeProposal(); }}><form className="card request-modal" role="dialog" aria-modal="true" aria-labelledby="proposal-title" onSubmit={sendProposal}><button type="button" className="modal-close" aria-label="Cerrar" onClick={closeProposal}>×</button><h2 id="proposal-title">Proponer un horario</h2><label>Fecha<input type="date" min={today()} value={proposal.fecha} onInvalid={(event) => { event.preventDefault(); setProposalError('Seleccioná una fecha y un horario futuros'); }} onChange={(event) => { setProposal({ ...proposal, fecha: event.target.value }); setProposalError(''); }} required /></label><label>Horario<input type="time" value={proposal.horario} onInvalid={(event) => { event.preventDefault(); setProposalError('Seleccioná una fecha y un horario futuros'); }} onChange={(event) => { setProposal({ ...proposal, horario: event.target.value }); setProposalError(''); }} required /></label>{proposalError && <p className="form-error" role="alert">{proposalError}</p>}<label>Nota opcional<textarea rows="4" maxLength="1000" value={proposal.notaPropuesta} onChange={(event) => setProposal({ ...proposal, notaPropuesta: event.target.value })} /></label><div className="button-row"><button className="button primary" disabled={sendingProposal}>{sendingProposal ? 'Enviando…' : 'Enviar propuesta'}</button><button type="button" className="button subtle" disabled={sendingProposal} onClick={closeProposal}>Cancelar</button></div></form></div>}
    {rejecting && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !rejectingBusy) setRejecting(null); }}><div className="card request-modal" role="dialog" aria-modal="true" aria-labelledby="reject-title"><button type="button" className="modal-close" aria-label="Cerrar" disabled={rejectingBusy} onClick={() => setRejecting(null)}>×</button><h2 id="reject-title">¿Rechazar solicitud?</h2><p><strong>{rejecting.oficio.nombre}</strong> · {rejecting.cliente.usuario.nombre} {rejecting.cliente.usuario.apellido}</p><p>El cliente podrá ver que su solicitud fue rechazada.</p><div className="button-row"><button type="button" className="button subtle" disabled={rejectingBusy} onClick={() => setRejecting(null)}>Cancelar</button><button type="button" className="button primary" disabled={rejectingBusy} onClick={confirmReject}>{rejectingBusy ? 'Rechazando…' : 'Sí, rechazar'}</button></div></div></div>}
    {review.solicitudId && <form className="card review-form" onSubmit={sendReview}><h2>Calificar trabajo</h2><label>Puntaje<select value={review.puntaje} onChange={(e) => setReview({ ...review, puntaje: Number(e.target.value) })}>{[5,4,3,2,1].map((score) => <option key={score} value={score}>{score} estrellas</option>)}</select></label><label>Comentario<textarea rows="4" value={review.comentario} onChange={(e) => setReview({ ...review, comentario: e.target.value })} required /></label><div className="button-row"><button className="button primary">Publicar</button><button type="button" className="button subtle" onClick={() => setReview({ ...review, solicitudId: '' })}>Cerrar</button></div></form>}
  </section>;
}
