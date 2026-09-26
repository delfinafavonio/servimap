import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/auth-context';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/AppLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import SearchProviders from './pages/SearchProviders';
import ProviderProfile from './pages/ProviderProfile';
import ProviderEdit from './pages/ProviderEdit';
import Requests from './pages/Requests';
import AdminTrades from './pages/AdminTrades';
import AdminReviews from './pages/AdminReviews';
import ClientProfile from './pages/ClientProfile';
import './App.css';

function Entry() {
  const { usuario, loading } = useAuth();
  if (loading) return <div className="screen-message">Cargando ServiMap…</div>;
  return <Navigate to={usuario ? usuario.rol === 'PRESTADOR' ? '/app/solicitudes' : usuario.rol === 'CLIENTE' ? '/app/buscar' : '/app' : '/login'} replace />;
}

export default function App() {
  return <BrowserRouter><AuthProvider><Routes>
    <Route path="/" element={<Entry />} />
    <Route path="/login" element={<Login />} />
    <Route path="/registro/:rol" element={<Register />} />
    <Route path="/prestadores/:id" element={<ProviderProfile />} />
    <Route element={<ProtectedRoute />}><Route path="/app" element={<AppLayout />}>
      <Route index element={<Dashboard />} />
      <Route element={<ProtectedRoute roles={['CLIENTE']} />}><Route path="buscar" element={<SearchProviders />} /></Route>
      <Route element={<ProtectedRoute roles={['CLIENTE']} />}><Route path="prestadores/:id" element={<ProviderProfile />} /></Route>
      <Route element={<ProtectedRoute roles={['CLIENTE']} />}><Route path="cliente/perfil" element={<ClientProfile />} /></Route>
      <Route element={<ProtectedRoute roles={['PRESTADOR']} />}><Route path="perfil" element={<ProviderEdit />} /></Route>
      <Route path="solicitudes" element={<Requests />} />
      <Route element={<ProtectedRoute roles={['ADMINISTRADOR']} />}>
        <Route path="admin/oficios" element={<AdminTrades />} />
        <Route path="admin/resenas" element={<AdminReviews />} />
      </Route>
    </Route></Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></AuthProvider></BrowserRouter>;
}
