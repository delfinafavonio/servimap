import { useState } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AuthProvider } from '../context/AuthContext';
import { useAuth } from '../context/auth-context';
import apiClient, { getAuthToken, setAuthToken } from '../services/apiClient';

const response = (config, data, status = 200) => Promise.resolve({ data, status, statusText: 'OK', headers: {}, config });

function Probe() {
  const auth = useAuth();
  const [failure, setFailure] = useState('');
  if (auth.loading) return <p>Cargando</p>;
  return <div>
    <p>{auth.usuario ? `${auth.usuario.nombre}:${auth.usuario.rol}` : 'Sin sesión'}</p>
    {auth.authMessage && <p role="alert">{auth.authMessage}</p>}
    {failure && <p>{failure}</p>}
    <button onClick={() => auth.login({ email: 'cliente@test.com', password: 'secreto', rol: 'CLIENTE' }).catch(() => setFailure('falló'))}>Login</button>
    <button onClick={() => auth.register({ nombre: 'Pia', apellido: 'Test', email: 'pia@test.com', password: 'secreto', confirmacion: 'secreto', rol: 'PRESTADOR' }).catch(() => setFailure('falló'))}>Registro</button>
  </div>;
}

describe('persistencia de autenticación Bearer', () => {
  const originalAdapter = apiClient.defaults.adapter;

  beforeEach(() => setAuthToken(null));
  afterEach(() => { apiClient.defaults.adapter = originalAdapter; setAuthToken(null); });

  it('guarda los JWT devueltos por login y registro', async () => {
    apiClient.defaults.adapter = (config) => {
      if (config.url === '/auth/me') return response(config, { usuario: null });
      if (config.url === '/auth/login') return response(config, { usuario: { nombre: 'Cleo', rol: 'CLIENTE' }, token: 'jwt-login-prueba' });
      return response(config, { usuario: { nombre: 'Pia', rol: 'PRESTADOR' }, token: 'jwt-registro-prueba' }, 201);
    };
    const user = userEvent.setup();
    render(<AuthProvider><Probe /></AuthProvider>);
    await screen.findByText('Sin sesión');
    await user.click(screen.getByRole('button', { name: 'Login' }));
    expect(await screen.findByText('Cleo:CLIENTE')).toBeInTheDocument();
    expect(getAuthToken()).toBe('jwt-login-prueba');
    await user.click(screen.getByRole('button', { name: 'Registro' }));
    expect(await screen.findByText('Pia:PRESTADOR')).toBeInTheDocument();
    expect(getAuthToken()).toBe('jwt-registro-prueba');
  });

  it('recupera la sesión al recargar y agrega Authorization a rutas protegidas', async () => {
    setAuthToken('jwt-persistido');
    let receivedAuthorization;
    apiClient.defaults.adapter = (config) => {
      receivedAuthorization = config.headers.Authorization;
      return response(config, { usuario: { nombre: 'Pia', rol: 'PRESTADOR' } });
    };
    render(<AuthProvider><Probe /></AuthProvider>);
    expect(await screen.findByText('Pia:PRESTADOR')).toBeInTheDocument();
    expect(receivedAuthorization).toBe('Bearer jwt-persistido');
  });

  it('elimina un token vencido e informa que se debe iniciar sesión nuevamente', async () => {
    setAuthToken('jwt-vencido');
    let expire = false;
    apiClient.defaults.adapter = (config) => expire
      ? Promise.reject({ response: { status: 401 }, config })
      : response(config, { usuario: { nombre: 'Cleo', rol: 'CLIENTE' } });
    render(<AuthProvider><Probe /></AuthProvider>);
    await screen.findByText('Cleo:CLIENTE');
    expire = true;
    await act(async () => { await apiClient.get('/clientes/me').catch(() => {}); });
    await waitFor(() => expect(screen.getByText('Sin sesión')).toBeInTheDocument());
    expect(screen.getByRole('alert')).toHaveTextContent('Tu sesión venció');
    expect(getAuthToken()).toBeNull();
  });
});
