import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import apiClient from '../services/apiClient';
import { formatTradePrice } from '../utils/prices';

const markerIcon = L.divIcon({ className: 'provider-marker', html: '<span></span>', iconSize: [30, 38], iconAnchor: [15, 38] });
function localDistance(provider, location) {
  if (!location.latitud || !location.longitud || provider.latitud == null || provider.longitud == null) return null;
  const radians = (value) => value * Math.PI / 180; const dLat = radians(provider.latitud - Number(location.latitud)); const dLon = radians(provider.longitud - Number(location.longitud));
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(Number(location.latitud))) * Math.cos(radians(provider.latitud)) * Math.sin(dLon / 2) ** 2;
  return Number((6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1));
}
function MapBounds({ providers, location }) {
  const map = useMap();
  useEffect(() => { const points = [...providers.map((item) => [item.latitud, item.longitud]), ...(location ? [[location.latitud, location.longitud]] : [])]; if (points.length) map.fitBounds(points, { padding: [35, 35], maxZoom: 14, animate: false }); }, [map, providers, location]);
  return null;
}

export default function SearchProviders() {
  const [oficios, setOficios] = useState([]); const [providers, setProviders] = useState([]);
  const [filters, setFilters] = useState({ oficioId: '', zona: '', texto: '', distancia: '', latitud: '', longitud: '' });
  const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const [locationMessage, setLocationMessage] = useState(''); const [requesting, setRequesting] = useState(null); const [sending, setSending] = useState(false); const [success, setSuccess] = useState('');
  const [request, setRequest] = useState({ oficioId: '', descripcion: '' });
  useEffect(() => {
    apiClient.get('/oficios').then(({ data }) => setOficios(data));
    apiClient.get('/prestadores').then(({ data }) => setProviders(data)).catch((requestError) => setError(requestError.response?.data?.error || 'No pudimos realizar la búsqueda')).finally(() => setLoading(false));
  }, []);
  const search = async (event) => {
    event?.preventDefault(); setLoading(true); setError('');
    const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== ''));
    if (params.distancia && (!params.latitud || !params.longitud)) { setError('Usá tu ubicación para filtrar por distancia.'); setLoading(false); return; }
    try { const { data } = await apiClient.get('/prestadores', { params }); setProviders(data); }
    catch (requestError) { setError(requestError.response?.data?.error || 'No pudimos realizar la búsqueda'); }
    finally { setLoading(false); }
  };
  const locate = () => { setError(''); setLocationMessage('Solicitando permiso…'); if (!navigator.geolocation) { setLocationMessage('Tu navegador no permite obtener la ubicación. Podés buscar normalmente.'); return; } navigator.geolocation.getCurrentPosition(({ coords }) => { setFilters((current) => ({ ...current, latitud: coords.latitude, longitud: coords.longitude })); setLocationMessage('Ubicación lista. Ya podés filtrar por distancia.'); }, () => setLocationMessage('No se pudo usar tu ubicación. Podés buscar normalmente por oficio y zona.')); };
  const openRequest = (provider, oficioId = '') => { const available = provider.oficios.filter((item) => item.isDisponible); setRequesting(provider); setRequest({ oficioId: oficioId || filters.oficioId || available[0]?.id || '', descripcion: '' }); setError(''); setSuccess(''); };
  const closeRequest = () => { if (!sending) setRequesting(null); };
  const submitRequest = async (event) => { event.preventDefault(); setSending(true); setError(''); try { await apiClient.post('/solicitudes', { prestadorId: requesting.id, ...request }); setRequesting(null); setSuccess('Solicitud enviada. Podés seguirla desde Mis solicitudes.'); } catch (requestError) { setError(requestError.response?.data?.error || 'No pudimos enviar la solicitud'); } finally { setSending(false); } };
  const mappableProviders = providers.filter((item) => item.latitud != null && item.longitud != null);
  return <section className="client-search"><div className="page-heading"><span className="eyebrow">Explorá tu zona</span><h1>Buscar profesionales</h1><p>Encontrá el servicio que necesitás. Las ubicaciones publicadas son aproximadas.</p></div>
    <form className="filter-bar" onSubmit={search}>
      <select aria-label="Oficio" value={filters.oficioId} onChange={(e) => setFilters({ ...filters, oficioId: e.target.value })}><option value="">Todos los oficios</option>{oficios.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select>
      <input aria-label="Zona" placeholder="Zona o barrio" value={filters.zona} onChange={(e) => setFilters({ ...filters, zona: e.target.value })} />
      <input aria-label="Texto" placeholder="Nombre o especialidad" value={filters.texto} onChange={(e) => setFilters({ ...filters, texto: e.target.value })} />
      <select aria-label="Distancia" value={filters.distancia} onChange={(e) => setFilters({ ...filters, distancia: e.target.value })}><option value="">Cualquier distancia</option><option value="5">Hasta 5 km</option><option value="10">Hasta 10 km</option><option value="25">Hasta 25 km</option><option value="50">Hasta 50 km</option></select>
      <button type="button" className="button subtle" onClick={locate}>{filters.latitud ? 'Ubicación lista' : 'Usar mi ubicación'}</button><button className="button primary">Buscar</button>
    </form>
    {locationMessage && <p className="location-message">{locationMessage}</p>}{error && <p className="form-error" role="alert">{error}</p>}{success && <p className="form-success" role="status">{success}</p>}
    <div className="search-layout">
      <div className="results-list">{loading ? <div className="empty-state">Buscando profesionales…</div> : providers.length === 0 ? <div className="empty-state"><h3>No encontramos resultados</h3><p>Probá ampliando la zona o cambiando los filtros.</p></div> : providers.map((item) => <article className="provider-card" key={item.id}>
        {item.fotoPerfil ? <img className="avatar provider-result-photo" src={item.fotoPerfil} alt={`Foto de ${item.nombre}`} /> : <div className="avatar">{item.nombre.split(/\s+/).slice(0, 2).map((part) => part[0]).join('')}</div>}<div><h3>{item.nombre}</h3><p>{item.descripcionProfesional}</p><div className="chips">{item.oficios.filter((trade) => trade.isDisponible).map((trade) => <span key={trade.id}>{trade.nombre} · {formatTradePrice(trade)}</span>)}</div><small>{item.zonaCobertura}{(item.distanciaKm ?? localDistance(item, filters)) != null ? ` · ${item.distanciaKm ?? localDistance(item, filters)} km aprox.` : ''}{item.promedioCalificaciones != null ? ` · ★ ${item.promedioCalificaciones}` : ''}</small><div className="button-row provider-card-actions"><Link className="button subtle" to={`/app/prestadores/${item.id}`}>Ver perfil</Link><button className="button primary" onClick={() => openRequest(item)}>Solicitar</button></div></div>
      </article>)}</div>
      <div className="map-wrap"><MapContainer center={[-34.6037, -58.3816]} zoom={11} scrollWheelZoom className="provider-map"><TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />{mappableProviders.map((item) => <Marker key={item.id} position={[item.latitud, item.longitud]} icon={markerIcon}><Popup><strong>{item.nombre}</strong><br />{item.zonaCobertura}<br /><Link to={`/app/prestadores/${item.id}`}>Ver perfil</Link></Popup></Marker>)}<MapBounds providers={mappableProviders} location={filters.latitud ? filters : null} /></MapContainer></div>
    </div>
    {requesting && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeRequest(); }}><form className="card request-modal service-request-modal" role="dialog" aria-modal="true" aria-labelledby="request-service-title" onSubmit={submitRequest}><button type="button" className="modal-close" aria-label="Cerrar" onClick={closeRequest} disabled={sending}>×</button><span className="eyebrow">Nueva solicitud</span><h2 id="request-service-title">Solicitar servicio</h2><p>Profesional: <strong>{requesting.nombre}</strong></p><label>Oficio<select value={request.oficioId} onChange={(event) => setRequest({ ...request, oficioId: event.target.value })} required>{requesting.oficios.filter((item) => item.isDisponible).map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select></label><label>Describí el problema<textarea rows="5" maxLength="2000" value={request.descripcion} onChange={(event) => setRequest({ ...request, descripcion: event.target.value })} required /></label><small className="character-count">{request.descripcion.length}/2000</small>{error && <p className="form-error" role="alert">{error}</p>}<div className="button-row"><button className="button primary" disabled={sending}>{sending ? 'Enviando…' : 'Enviar solicitud'}</button><button type="button" className="button subtle" onClick={closeRequest} disabled={sending}>Cancelar</button></div></form></div>}
  </section>;
}
