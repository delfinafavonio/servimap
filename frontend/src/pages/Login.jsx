import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth-context';
import './Login.css';

export default function Login() {
  const [role, setRole] = useState('CLIENTE');
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const { login, usuario, authMessage } = useAuth();
  const navigate = useNavigate();
  if (usuario) return <Navigate to={usuario.rol === 'PRESTADOR' ? '/app/solicitudes' : '/app'} replace />;

  const submit = async (event) => {
    event.preventDefault(); setError(''); setSending(true);
    try { const authenticatedUser = await login({ ...form, rol: role }); navigate(authenticatedUser.rol === 'PRESTADOR' ? '/app/solicitudes' : authenticatedUser.rol === 'CLIENTE' ? '/app/buscar' : '/app'); }
    catch (requestError) { setError(requestError.response?.data?.error || 'No pudimos iniciar sesión'); }
    finally { setSending(false); }
  };

  return <div className="login-screen">
    <div className="login-hero">
      <h1 className="login-logo">ServiMap</h1><p className="login-tagline">El profesional que buscás, más cerca de lo que pensás</p>
      <svg className="login-skyline" viewBox="0 0 500 140" fill="none" aria-hidden="true"><path d="M0 140 L0 110 L30 110 L30 90 L50 70 L70 90 L70 110 L100 110 L100 60 L120 60 L120 80 L140 80 L140 40 L150 30 L160 40 L160 80 L180 80 L180 100 L210 100 L210 70 L230 70 L230 50 L250 50 L250 90 L270 90 L270 110 L300 110 L300 130 L330 130 L330 90 L350 90 L350 70 L360 60 L370 70 L370 90 L390 90 L390 130 L500 130 L500 140 Z" stroke="#C98A93" strokeWidth="2" /></svg>
    </div>
    <form className="login-form-panel" onSubmit={submit}>
      <h2>Empezá a usar ServiMap</h2><p className="login-intro">Elegí cómo usás la plataforma e ingresá a tu cuenta.</p>
      <div className="login-role-cards">
        <button type="button" className={`login-role-card ${role === 'CLIENTE' ? 'selected' : ''}`} onClick={() => setRole('CLIENTE')}><strong>Soy Cliente</strong><span>Busco un servicio</span></button>
        <button type="button" className={`login-role-card ${role === 'PRESTADOR' ? 'selected' : ''}`} onClick={() => setRole('PRESTADOR')}><strong>Soy Prestador</strong><span>Ofrezco un oficio</span></button>
      </div>
      <label className="sr-only" htmlFor="email">Correo</label><input id="email" type="email" placeholder="nombre@correo.com" className="login-input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
      <label className="sr-only" htmlFor="password">Contraseña</label><input id="password" type="password" placeholder="••••••••••" className="login-input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
      {(error || authMessage) && <p className="form-error" role="alert">{error || authMessage}</p>}
      <button className="login-btn login-btn-primary" disabled={sending}>{sending ? 'Ingresando…' : 'Ingresar'}</button><Link className="login-btn login-btn-secondary" to={`/registro/${role.toLowerCase()}`}>Crear cuenta</Link>
    </form>
  </div>;
}
