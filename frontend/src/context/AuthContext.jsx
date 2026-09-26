import { useEffect, useMemo, useState } from 'react';
import apiClient from '../services/apiClient';
import { AuthContext } from './auth-context';

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get('/auth/me').then(({ data }) => setUsuario(data.usuario)).catch(() => setUsuario(null)).finally(() => setLoading(false));
  }, []);

  const authenticate = async (path, payload) => {
    const { data } = await apiClient.post(path, payload);
    setUsuario(data.usuario);
    return data.usuario;
  };

  const value = useMemo(() => ({
    usuario, loading,
    login: (payload) => authenticate('/auth/login', payload),
    register: (payload) => authenticate('/auth/registro', payload),
    logout: async () => { try { await apiClient.post('/auth/logout'); } finally { setUsuario(null); } },
  }), [usuario, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
