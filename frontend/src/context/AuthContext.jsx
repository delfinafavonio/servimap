import { useEffect, useMemo, useState } from 'react';
import apiClient, { setAuthToken } from '../services/apiClient';
import { AuthContext } from './auth-context';

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authMessage, setAuthMessage] = useState('');

  useEffect(() => {
    apiClient.get('/auth/me').then(({ data }) => setUsuario(data.usuario)).catch(() => setUsuario(null)).finally(() => setLoading(false));
    const expireSession = () => { setUsuario(null); setAuthMessage('Tu sesión venció. Iniciá sesión nuevamente.'); };
    window.addEventListener('servimap:session-expired', expireSession);
    return () => window.removeEventListener('servimap:session-expired', expireSession);
  }, []);

  const authenticate = async (path, payload) => {
    const { data } = await apiClient.post(path, payload);
    if (!data.token) throw new Error('La respuesta de autenticación no incluyó una sesión válida');
    setAuthToken(data.token);
    setAuthMessage('');
    setUsuario(data.usuario);
    return data.usuario;
  };

  const value = useMemo(() => ({
    usuario, loading, authMessage,
    login: (payload) => authenticate('/auth/login', payload),
    register: (payload) => authenticate('/auth/registro', payload),
    logout: async () => { try { await apiClient.post('/auth/logout'); } finally { setAuthToken(null); setUsuario(null); setAuthMessage(''); } },
  }), [usuario, loading, authMessage]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
