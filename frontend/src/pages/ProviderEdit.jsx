import { useCallback, useEffect, useState } from 'react';
import apiClient from '../services/apiClient';
import { formatTradePrice } from '../utils/prices';
import { readProfileImage } from '../utils/images';

const emptyService = { oficioId: '', modalidadPrecio: 'FIJO', precio: '', precioMinimo: '', precioMaximo: '', isDisponible: true };

export default function ProviderEdit() {
  const [profile, setProfile] = useState(null); const [oficios, setOficios] = useState([]); const [editing, setEditing] = useState(false);
  const [service, setService] = useState(emptyService);
  const [message, setMessage] = useState(''); const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const load = useCallback(async () => { const [{ data: current }, { data: trades }] = await Promise.all([apiClient.get('/prestadores/me'), apiClient.get('/oficios')]); setProfile(current); setOficios(trades); }, []);
  useEffect(() => { const timer = window.setTimeout(() => load().catch((requestError) => setError(requestError.response?.data?.error || 'No pudimos cargar tu perfil')), 0); return () => window.clearTimeout(timer); }, [load]);
  const saveProfile = async (event) => { event.preventDefault(); setMessage(''); setError(''); try { const { data } = await apiClient.put('/prestadores/me', profile); setProfile(data); setEditing(false); setMessage(data.perfilCompleto ? 'Perfil guardado.' : 'Perfil guardado. Completá todos los datos y al menos un oficio para aparecer en búsquedas.'); } catch (requestError) { setError(requestError.response?.data?.error || 'No pudimos guardar el perfil'); } };
  const cancelEdit = async () => { setError(''); setMessage(''); try { await load(); setEditing(false); } catch (requestError) { setError(requestError.response?.data?.error || 'No pudimos recuperar tu perfil'); } };
  const locate = () => navigator.geolocation?.getCurrentPosition(({ coords }) => setProfile({ ...profile, latitud: coords.latitude.toFixed(5), longitud: coords.longitude.toFixed(5) }), () => setError('No pudimos acceder a tu ubicación.'));
  const saveService = async (event) => { event.preventDefault(); setError(''); try { await apiClient.put(`/prestadores/me/oficios/${service.oficioId}`, service); await load(); setService(emptyService); setMessage('Servicio actualizado.'); } catch (requestError) { setError(requestError.response?.data?.error || 'No pudimos guardar el servicio'); } };
  const selectService = (oficioId) => { const current = profile.oficios.find((item) => item.id === oficioId); setService(current ? { oficioId: current.id, modalidadPrecio: current.modalidadPrecio || 'FIJO', precio: current.precio ?? '', precioMinimo: current.precioMinimo ?? '', precioMaximo: current.precioMaximo ?? '', isDisponible: current.isDisponible } : { ...emptyService, oficioId }); };
  const removeService = async (id) => { if (!window.confirm('¿Querés quitar este oficio de tu perfil?')) return; try { await apiClient.delete(`/prestadores/me/oficios/${id}`); await load(); setMessage('Servicio eliminado; revisá tu disponibilidad general.'); } catch (requestError) { setError(requestError.response?.data?.error || 'No pudimos eliminar el servicio'); } };
  const upload = async (event) => { try { setError(''); setUploading(true); const dataUrl = await readProfileImage(event.target.files?.[0]); if (!dataUrl) return; const { data } = await apiClient.post('/prestadores/me/foto', { dataUrl }); setProfile(data); setMessage('Foto actualizada.'); } catch (uploadError) { setError(uploadError.response?.data?.error || uploadError.message); } finally { setUploading(false); event.target.value = ''; } };
  if (!profile) return <div className="screen-message">{error || 'Cargando tu perfil…'}</div>;

  const initials = profile.nombre?.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'SM';
  const activeTrades = profile.oficios.filter((item) => item.isDisponible);
  const isUpdatingService = profile.oficios.some((item) => item.id === service.oficioId);
  if (!editing) return <section className="provider-profile-view">
    {!profile.perfilCompleto && <div className="notice">Tu perfil aún está incompleto y no aparece en búsquedas. Completá descripción, teléfono, zona y al menos un oficio disponible.</div>}
    <article className="card provider-profile-card">
      {profile.fotoPerfil ? <img className="provider-profile-photo" src={profile.fotoPerfil} alt={`Foto de ${profile.nombre}`} referrerPolicy="no-referrer" /> : <div className="avatar provider-profile-photo provider-profile-initials">{initials}</div>}
      <div className="provider-profile-copy"><span className="eyebrow">Mi perfil</span><h1>{profile.nombre}</h1><p className="provider-profile-trade">{activeTrades.length ? activeTrades.map((item) => item.nombre).join(' · ') : 'Sin oficio disponible'}</p><p>{profile.descripcionProfesional || 'Todavía no agregaste una descripción profesional.'}</p><div className="provider-profile-details"><span><strong>Zona</strong>{profile.zonaCobertura || 'Sin completar'}</span><span><strong>Precios orientativos</strong>{activeTrades.length ? activeTrades.map((item) => `${item.nombre}: ${formatTradePrice(item)}`).join(' · ') : 'Sin completar'}</span></div></div>
      <button className="button secondary provider-edit-button" onClick={() => { setMessage(''); setEditing(true); }}>Editar perfil</button>
    </article>
    <div className="provider-summary" aria-label="Resumen de actividad"><article className="card"><strong>{profile.promedioCalificaciones ?? 0}</strong><span>Calificación promedio</span></article><article className="card"><strong>{profile.trabajosFinalizados ?? 0}</strong><span>Trabajos finalizados</span></article><article className="card"><strong>{activeTrades.length}</strong><span>Oficios activos</span></article></div>
    {error && <p className="form-error">{error}</p>}{message && <p className="form-success">{message}</p>}
  </section>;

  return <section><div className="page-heading"><span className="eyebrow">Perfil profesional</span><h1>Editar perfil</h1><p>La ubicación publicada es aproximada. Podés usar un punto de referencia de tu zona.</p></div>
    {!profile.perfilCompleto && <div className="notice">Tu perfil aún no aparece en búsquedas. Completá descripción, teléfono, zona y un oficio disponible.</div>}
    <div className="editor-grid"><form className="card form-grid" onSubmit={saveProfile}>
      <label className="full">Descripción profesional<textarea rows="5" value={profile.descripcionProfesional || ''} onChange={(e) => setProfile({ ...profile, descripcionProfesional: e.target.value })} required /></label>
      <label className="full">Foto de perfil<input type="file" accept="image/jpeg,image/png,image/webp" onChange={upload} disabled={uploading} /><small>JPG, PNG o WebP. Máximo 2 MB.</small></label>
      {profile.fotoPerfil && <img className="profile-preview full" src={profile.fotoPerfil} alt="Vista previa del perfil" referrerPolicy="no-referrer" />}
      <label>Teléfono<input value={profile.telefono || ''} onChange={(e) => setProfile({ ...profile, telefono: e.target.value })} required /></label><label>Zona de cobertura<input value={profile.zonaCobertura || ''} onChange={(e) => setProfile({ ...profile, zonaCobertura: e.target.value })} required /></label>
      <label>Latitud aproximada<input type="number" step="any" value={profile.latitud ?? ''} onChange={(e) => setProfile({ ...profile, latitud: e.target.value })} /></label><label>Longitud aproximada<input type="number" step="any" value={profile.longitud ?? ''} onChange={(e) => setProfile({ ...profile, longitud: e.target.value })} /></label>
      <button type="button" className="button subtle" onClick={locate}>Usar mi ubicación</button><label className="check"><input type="checkbox" checked={profile.isDisponible} onChange={(e) => setProfile({ ...profile, isDisponible: e.target.checked })} /> Disponible para nuevos trabajos</label>
      <div className="button-row full"><button className="button primary">Guardar perfil</button><button type="button" className="button subtle" onClick={cancelEdit}>Cancelar</button></div>
    </form>
    <div className="card"><h2>Oficios y precios</h2><div className="service-list editable">{profile.oficios.map((item) => <div key={item.id}><span><strong>{item.nombre}</strong><small>{item.isDisponible ? 'Disponible' : 'Pausado'} · {formatTradePrice(item)}</small></span><button className="link-button danger" onClick={() => removeService(item.id)}>Quitar</button></div>)}</div>
      <form className="stack-form" onSubmit={saveService}><label>Oficio<select aria-label="Oficio ofrecido" value={service.oficioId} onChange={(e) => selectService(e.target.value)} required><option value="" disabled>Seleccioná un oficio</option>{oficios.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select></label>{isUpdatingService && <p className="muted">Estás actualizando este oficio</p>}<label>Modalidad de precio<select aria-label="Modalidad de precio" value={service.modalidadPrecio} onChange={(e) => setService({ ...service, modalidadPrecio: e.target.value, precio: '', precioMinimo: '', precioMaximo: '' })}><option value="FIJO">Precio fijo orientativo</option><option value="RANGO">Rango de precios</option></select></label>{service.modalidadPrecio === 'FIJO' ? <label>Precio orientativo<input type="number" min="0.01" step="0.01" value={service.precio} onChange={(e) => setService({ ...service, precio: e.target.value })} required /></label> : <><label>Precio mínimo<input type="number" min="0.01" step="0.01" value={service.precioMinimo} onChange={(e) => setService({ ...service, precioMinimo: e.target.value })} required /></label><label>Precio máximo<input type="number" min="0.01" step="0.01" value={service.precioMaximo} onChange={(e) => setService({ ...service, precioMaximo: e.target.value })} required /></label></>}<label className="check"><input type="checkbox" checked={service.isDisponible} onChange={(e) => setService({ ...service, isDisponible: e.target.checked })} /> Disponible en este oficio</label><button className="button secondary">{isUpdatingService ? 'Actualizar oficio' : 'Agregar oficio'}</button></form>
    </div></div>{error && <p className="form-error">{error}</p>}{message && <p className="form-success">{message}</p>}
  </section>;
}
