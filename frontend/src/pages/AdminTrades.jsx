import { useCallback, useEffect, useState } from 'react';
import apiClient from '../services/apiClient';

const emptyForm = { nombre: '', categoria: '' };

export default function AdminTrades() {
  const [items, setItems] = useState([]); const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null); const [error, setError] = useState(''); const [loading, setLoading] = useState(true);
  const load = useCallback(() => apiClient.get('/oficios/admin').then(({ data }) => setItems(data)).finally(() => setLoading(false)), []);
  useEffect(() => { load().catch(() => setError('No pudimos cargar los oficios')); }, [load]);
  const save = async (event) => {
    event.preventDefault(); setError('');
    try {
      if (editingId) await apiClient.put(`/oficios/${editingId}`, form);
      else await apiClient.post('/oficios', form);
      setForm(emptyForm); setEditingId(null); await load();
    } catch (requestError) { setError(requestError.response?.data?.error || 'No pudimos guardar el oficio'); }
  };
  const edit = (item) => { setEditingId(item.id); setForm({ nombre: item.nombre, categoria: item.categoria }); };
  const toggle = async (item) => { if (!window.confirm(`¿Querés ${item.isActivo ? 'desactivar' : 'activar'} ${item.nombre}?`)) return; try { await apiClient.patch(`/oficios/${item.id}/estado`, { isActivo: !item.isActivo }); await load(); } catch (requestError) { setError(requestError.response?.data?.error || 'No pudimos actualizar el oficio'); } };
  return <section><div className="page-heading"><span className="eyebrow">Administración</span><h1>Catálogo de oficios</h1></div><div className="admin-grid">
    <form className="card stack-form" onSubmit={save}><h2>{editingId ? 'Editar oficio' : 'Nuevo oficio'}</h2><label>Nombre<input value={form.nombre} maxLength="80" onChange={(e) => setForm({ ...form, nombre: e.target.value })} required /></label><label>Categoría<input value={form.categoria} maxLength="80" onChange={(e) => setForm({ ...form, categoria: e.target.value })} required /></label><button className="button primary">{editingId ? 'Guardar cambios' : 'Crear oficio'}</button>{editingId && <button type="button" className="button subtle" onClick={() => { setEditingId(null); setForm(emptyForm); }}>Cancelar edición</button>}</form>
    <div className="card table-wrap">{loading ? <p>Cargando oficios…</p> : items.length === 0 ? <div className="empty-state">Todavía no hay oficios.</div> : <table><thead><tr><th>Oficio</th><th>Categoría</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td>{item.nombre}</td><td>{item.categoria}</td><td>{item.isActivo ? 'Activo' : 'Inactivo'}</td><td><div className="table-actions"><button className="link-button" onClick={() => edit(item)}>Editar</button><button className="link-button" onClick={() => toggle(item)}>{item.isActivo ? 'Desactivar' : 'Activar'}</button></div></td></tr>)}</tbody></table>}</div>
  </div>{error && <p className="form-error">{error}</p>}</section>;
}
