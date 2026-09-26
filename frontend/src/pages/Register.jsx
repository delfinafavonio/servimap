import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/auth-context';

export default function Register() {
  const { rol: roleParam } = useParams(); const rol = roleParam === 'prestador' ? 'PRESTADOR' : 'CLIENTE';
  const [form, setForm] = useState({ nombre: '', apellido: '', email: '', password: '', confirmacion: '' });
  const [error, setError] = useState(''); const [sending, setSending] = useState(false);
  const { register, usuario } = useAuth(); const navigate = useNavigate();
  if (usuario) return <Navigate to={usuario.rol === 'PRESTADOR' ? '/app/perfil' : '/app/buscar'} replace />;
  const submit = async (event) => { event.preventDefault(); setError(''); setSending(true); try { await register({ ...form, rol }); navigate(rol === 'PRESTADOR' ? '/app/perfil' : '/app/buscar'); } catch (requestError) { setError(requestError.response?.data?.error || 'No pudimos crear la cuenta'); } finally { setSending(false); } };
  return <div className="auth-page"><section className="auth-card">
    <Link to="/login" className="brand auth-brand">ServiMap</Link><span className="eyebrow">Nueva cuenta</span><h1>Registrate como {rol === 'CLIENTE' ? 'cliente' : 'prestador'}</h1><p>{rol === 'CLIENTE' ? 'Encontrá profesionales cerca tuyo.' : 'Mostrá tus servicios y recibí solicitudes.'}</p>
    <form className="form-grid" onSubmit={submit}>
      <label>Nombre<input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required /></label><label>Apellido<input value={form.apellido} onChange={(e) => setForm({ ...form, apellido: e.target.value })} required /></label>
      <label className="full">Correo<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>
      <label>Contraseña<input type="password" minLength="8" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></label><label>Confirmar contraseña<input type="password" minLength="8" value={form.confirmacion} onChange={(e) => setForm({ ...form, confirmacion: e.target.value })} required /></label>
      {error && <p className="form-error full">{error}</p>}<button className="button primary full" disabled={sending}>{sending ? 'Creando cuenta…' : 'Crear cuenta'}</button>
    </form><p className="auth-switch">¿Querés otro tipo de cuenta? <Link to={`/registro/${rol === 'CLIENTE' ? 'prestador' : 'cliente'}`}>Cambiar a {rol === 'CLIENTE' ? 'prestador' : 'cliente'}</Link></p>
  </section></div>;
}
