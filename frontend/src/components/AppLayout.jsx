import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth-context';
import apiClient from '../services/apiClient';

const links = {
  CLIENTE: [['/app/buscar', 'Buscar profesionales'], ['/app/solicitudes', 'Mis solicitudes']],
  PRESTADOR: [['/app/solicitudes', 'Solicitudes'], ['/app/perfil', 'Perfil']],
  ADMINISTRADOR: [['/app', 'Inicio'], ['/app/solicitudes', 'Solicitudes'], ['/app/admin/oficios', 'Oficios'], ['/app/admin/resenas', 'Reseñas']],
};

export default function AppLayout() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const [accountOpen, setAccountOpen] = useState(false);
  const [clientPhoto, setClientPhoto] = useState(null);
  useEffect(() => { if (usuario.rol === 'CLIENTE') apiClient.get('/clientes/me').then(({ data }) => setClientPhoto(data.fotoPerfil)).catch(() => {}); }, [usuario.rol]);
  return <div className="app-shell">
    <header className="app-header">
      <NavLink to={usuario.rol === 'CLIENTE' ? '/app/buscar' : '/app'} className="brand">ServiMap</NavLink>
      <nav>{links[usuario.rol].map(([to, label]) => <NavLink key={to} to={to} end={to === '/app'}>{label}</NavLink>)}</nav>
      {['PRESTADOR', 'CLIENTE'].includes(usuario.rol) ? <div className="provider-account"><button className="avatar provider-avatar" aria-label="Abrir menú de usuario" aria-expanded={accountOpen} onClick={() => setAccountOpen((open) => !open)}>{usuario.rol === 'CLIENTE' && clientPhoto ? <img src={clientPhoto} alt="" /> : `${usuario.nombre?.[0] || ''}${usuario.apellido?.[0] || ''}`.toUpperCase()}</button>{accountOpen && <div className="card provider-account-menu"><NavLink to={usuario.rol === 'CLIENTE' ? '/app/cliente/perfil' : '/app/perfil'} onClick={() => setAccountOpen(false)}>Mi perfil</NavLink><button className="link-button" onClick={async () => { await logout(); navigate('/login'); }}>Cerrar sesión</button></div>}</div> : <div className="account"><span>{usuario.nombre}</span><button className="link-button" onClick={async () => { await logout(); navigate('/login'); }}>Salir</button></div>}
    </header>
    <main className="app-main"><Outlet /></main>
  </div>;
}
