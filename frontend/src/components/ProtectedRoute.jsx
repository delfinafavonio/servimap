import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/auth-context';

export default function ProtectedRoute({ roles }) {
  const { usuario, loading } = useAuth();
  if (loading) return <div className="screen-message">Cargando ServiMap…</div>;
  if (!usuario) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(usuario.rol)) return <Navigate to={usuario.rol === 'PRESTADOR' ? '/app/solicitudes' : '/app'} replace />;
  return <Outlet />;
}
