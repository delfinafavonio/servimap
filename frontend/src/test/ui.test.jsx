import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthContext } from '../context/auth-context';
import Login from '../pages/Login';
import ProtectedRoute from '../components/ProtectedRoute';
import AdminTrades from '../pages/AdminTrades';
import SearchProviders from '../pages/SearchProviders';
import Requests from '../pages/Requests';
import ProviderEdit from '../pages/ProviderEdit';
import AppLayout from '../components/AppLayout';
import apiClient from '../services/apiClient';

vi.mock('../services/apiClient', () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));
vi.mock('leaflet', () => ({ default: { divIcon: vi.fn(() => ({})) } }));
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div data-testid="map">{children}</div>,
  Marker: ({ children, position }) => <div data-testid="marker" data-position={JSON.stringify(position)}>{children}</div>,
  Popup: ({ children }) => <div>{children}</div>, TileLayer: () => null,
  useMap: () => ({ fitBounds: vi.fn() }),
}));

beforeEach(() => vi.clearAllMocks());

describe('formularios y permisos principales', () => {
  it('envía las credenciales desde el login', async () => {
    const login = vi.fn().mockResolvedValue({ rol: 'CLIENTE' });
    const user = userEvent.setup();
    render(<MemoryRouter><AuthContext.Provider value={{ usuario: null, loading: false, login }}><Login /></AuthContext.Provider></MemoryRouter>);
    await user.type(screen.getByLabelText('Correo'), 'cliente@ejemplo.com');
    await user.type(screen.getByLabelText('Contraseña'), 'clave-segura');
    await user.click(screen.getByRole('button', { name: 'Ingresar' }));
    expect(login).toHaveBeenCalledWith({ email: 'cliente@ejemplo.com', password: 'clave-segura', rol: 'CLIENTE' });
  });

  it('envía el rol prestador seleccionado y navega a sus solicitudes', async () => {
    const login = vi.fn().mockResolvedValue({ rol: 'PRESTADOR' });
    const user = userEvent.setup();
    render(<MemoryRouter initialEntries={['/login']}><AuthContext.Provider value={{ usuario: null, loading: false, login }}><Routes><Route path="/login" element={<Login />} /><Route path="/app/solicitudes" element={<h1>Panel prestador</h1>} /></Routes></AuthContext.Provider></MemoryRouter>);
    await user.click(screen.getByRole('button', { name: /Soy Prestador/ }));
    await user.type(screen.getByLabelText('Correo'), 'prestador@ejemplo.com');
    await user.type(screen.getByLabelText('Contraseña'), 'clave-segura');
    await user.click(screen.getByRole('button', { name: 'Ingresar' }));
    expect(login).toHaveBeenCalledWith({ email: 'prestador@ejemplo.com', password: 'clave-segura', rol: 'PRESTADOR' });
    expect(await screen.findByRole('heading', { name: 'Panel prestador' })).toBeInTheDocument();
  });

  it('muestra error de credenciales para una combinación correo y rol inexistente', async () => {
    const login = vi.fn().mockRejectedValue({ response: { data: { error: 'Correo o contraseña incorrectos' } } });
    const user = userEvent.setup();
    render(<MemoryRouter><AuthContext.Provider value={{ usuario: null, loading: false, login }}><Login /></AuthContext.Provider></MemoryRouter>);
    await user.type(screen.getByLabelText('Correo'), 'prestador@ejemplo.com');
    await user.type(screen.getByLabelText('Contraseña'), 'clave-segura');
    await user.click(screen.getByRole('button', { name: 'Ingresar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Correo o contraseña incorrectos');
    expect(screen.getByRole('button', { name: 'Ingresar' })).toBeInTheDocument();
  });

  it('abre el menú del avatar y sólo cierra sesión desde la opción explícita', async () => {
    const logout = vi.fn().mockResolvedValue();
    const user = userEvent.setup();
    render(<MemoryRouter initialEntries={['/app']}><AuthContext.Provider value={{ usuario: { rol: 'PRESTADOR', nombre: 'Olivia', apellido: 'Fernández' }, loading: false, logout }}><Routes><Route path="/app" element={<AppLayout />}><Route index element={<h1>Inicio</h1>} /></Route><Route path="/login" element={<h1>Login</h1>} /></Routes></AuthContext.Provider></MemoryRouter>);
    await user.click(screen.getByRole('button', { name: 'Abrir menú de usuario' }));
    expect(logout).not.toHaveBeenCalled();
    expect(screen.getByRole('link', { name: 'Mi perfil' })).toHaveAttribute('href', '/app/perfil');
    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    expect(logout).toHaveBeenCalledOnce();
    expect(await screen.findByRole('heading', { name: 'Login' })).toBeInTheDocument();
  });

  it('bloquea una ruta cuando el rol no está autorizado', () => {
    render(<MemoryRouter initialEntries={['/privado']}><AuthContext.Provider value={{ usuario: { rol: 'CLIENTE' }, loading: false }}><Routes><Route element={<ProtectedRoute roles={['ADMINISTRADOR']} />}><Route path="/privado" element={<h1>Secreto</h1>} /></Route><Route path="/app" element={<h1>Inicio</h1>} /></Routes></AuthContext.Provider></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Inicio' })).toBeInTheDocument();
    expect(screen.queryByText('Secreto')).not.toBeInTheDocument();
  });

  it('permite editar nombre y categoría de un oficio', async () => {
    apiClient.get.mockResolvedValue({ data: [{ id: '1', nombre: 'Plomería', categoria: 'Instalaciones', isActivo: true }] });
    apiClient.put.mockResolvedValue({ data: {} });
    const user = userEvent.setup();
    render(<AdminTrades />);
    await screen.findByText('Plomería');
    await user.click(screen.getByRole('button', { name: 'Editar' }));
    const category = screen.getByLabelText('Categoría');
    await user.clear(category); await user.type(category, 'Reparaciones');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(apiClient.put).toHaveBeenCalledWith('/oficios/1', { nombre: 'Plomería', categoria: 'Reparaciones' }));
  });

  it('muestra en el mapa la ubicación pública aproximada y filtra por oficio', async () => {
    const provider = { id: 'p1', nombre: 'Profesional Demo', descripcionProfesional: 'Electricista', zonaCobertura: 'Palermo', latitud: -34.58, longitud: -58.43, oficios: [{ id: 'o1', nombre: 'Electricidad', isDisponible: true, precio: 25000 }], promedioCalificaciones: 5 };
    apiClient.get.mockImplementation((url) => Promise.resolve({ data: url === '/oficios' ? [{ id: 'o1', nombre: 'Electricidad' }] : [provider] }));
    const user = userEvent.setup();
    render(<MemoryRouter><SearchProviders /></MemoryRouter>);
    expect((await screen.findAllByText('Profesional Demo')).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Electricidad · \$25\.000 · orientativo/)).toBeInTheDocument();
    expect(screen.getByTestId('marker')).toHaveAttribute('data-position', '[-34.58,-58.43]');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Oficio' }), 'o1');
    await user.click(screen.getByRole('button', { name: 'Buscar' }));
    await waitFor(() => expect(apiClient.get).toHaveBeenCalledWith('/prestadores', { params: { oficioId: 'o1' } }));
  });

  it('muestra prestadores sin coordenadas cuando no se filtra por distancia', async () => {
    const provider = { id: 'p2', nombre: 'Carpintero Real', descripcionProfesional: 'Muebles a medida', zonaCobertura: 'Centro', latitud: null, longitud: null, oficios: [{ id: 'carp', nombre: 'Carpintería', isDisponible: true, modalidadPrecio: 'RANGO', precio: null, precioMinimo: 20000, precioMaximo: 50000 }], promedioCalificaciones: null };
    apiClient.get.mockImplementation((url) => Promise.resolve({ data: url === '/oficios' ? [{ id: 'carp', nombre: 'Carpintería' }] : [provider] }));
    const user = userEvent.setup();
    render(<MemoryRouter><SearchProviders /></MemoryRouter>);
    expect(await screen.findByText('Carpintero Real')).toBeInTheDocument();
    expect(screen.getByText(/Carpintería · \$20\.000 – \$50\.000 · orientativo/)).toBeInTheDocument();
    expect(screen.queryByTestId('marker')).not.toBeInTheDocument();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Oficio' }), 'carp');
    await user.click(screen.getByRole('button', { name: 'Buscar' }));
    await waitFor(() => expect(apiClient.get).toHaveBeenCalledWith('/prestadores', { params: { oficioId: 'carp' } }));
  });

  it('crea una solicitud real desde el modal de búsqueda sólo tras confirmar la API', async () => {
    const provider = { id: 'p1', nombre: 'Profesional Real', descripcionProfesional: 'Electricista', zonaCobertura: 'Centro', latitud: null, longitud: null, fotoPerfil: null, oficios: [{ id: 'o1', nombre: 'Electricidad', isDisponible: true, precio: 25000 }], promedioCalificaciones: null };
    apiClient.get.mockImplementation((url) => Promise.resolve({ data: url === '/oficios' ? [{ id: 'o1', nombre: 'Electricidad' }] : [provider] }));
    apiClient.post.mockResolvedValue({ data: { id: 's1', estado: 'PENDIENTE' } });
    const user = userEvent.setup();
    render(<MemoryRouter><SearchProviders /></MemoryRouter>);
    await user.click(await screen.findByRole('button', { name: 'Solicitar' }));
    await user.type(screen.getByLabelText('Describí el problema'), 'Necesito revisar el tablero eléctrico.');
    await user.click(screen.getByRole('button', { name: 'Enviar solicitud' }));
    await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith('/solicitudes', { prestadorId: 'p1', oficioId: 'o1', descripcion: 'Necesito revisar el tablero eléctrico.' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Solicitud enviada');
  });

  it('permite seguir buscando cuando se rechaza la geolocalización', async () => {
    const original = navigator.geolocation;
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition: (_success, reject) => reject(new Error('denegado')) } });
    apiClient.get.mockImplementation((url) => Promise.resolve({ data: url === '/oficios' ? [] : [] }));
    const user = userEvent.setup(); render(<MemoryRouter><SearchProviders /></MemoryRouter>);
    await user.click(await screen.findByRole('button', { name: 'Usar mi ubicación' }));
    expect(screen.getByText(/Podés buscar normalmente por oficio y zona/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Buscar' })).toBeEnabled();
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: original });
  });

  it('separa las solicitudes del cliente en Activas, Finalizadas y Canceladas', async () => {
    const base = { descripcion: 'Trabajo', fechaCreacion: '2026-09-20T10:00:00Z', oficio: { nombre: 'Electricidad' }, cliente: { usuario: { nombre: 'Ana', apellido: 'Pérez' } }, prestador: { usuario: { nombre: 'Leo', apellido: 'Gómez' } } };
    apiClient.get.mockResolvedValue({ data: [{ ...base, id: 'a', estado: 'ACEPTADA', fechaPropuesta: '2026-09-28T15:00:00Z' }, { ...base, id: 'f', estado: 'FINALIZADA', descripcion: 'Finalizado', fechaFinalizacion: '2026-09-29T15:00:00Z' }, { ...base, id: 'c', estado: 'RECHAZADA', descripcion: 'Rechazado' }] });
    const user = userEvent.setup();
    render(<AuthContext.Provider value={{ usuario: { rol: 'CLIENTE' } }}><Requests /></AuthContext.Provider>);
    expect(await screen.findByText('Aceptada')).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Finalizadas' })); expect(screen.getByText('Finalizado')).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Canceladas' })); expect(screen.getByText('Rechazado')).toBeInTheDocument();
  });

  it('filtra solicitudes del prestador y envía una propuesta futura', async () => {
    const pending = { id: 's1', estado: 'PENDIENTE', descripcion: 'Revisar instalación', fechaCreacion: '2026-09-25T10:00:00Z', distanciaKm: 3.2, oficio: { nombre: 'Electricidad' }, cliente: { usuario: { nombre: 'Ana', apellido: 'Pérez' } }, prestador: { usuario: { nombre: 'Leo', apellido: 'Gómez' } } };
    apiClient.get.mockResolvedValue({ data: [pending, { ...pending, id: 's2', estado: 'ACEPTADA' }] });
    apiClient.patch.mockImplementation((_url, payload) => Promise.resolve({ data: { ...pending, estado: payload.estado, fechaPropuesta: payload.fechaPropuesta, notaPropuesta: payload.notaPropuesta } }));
    const user = userEvent.setup();
    render(<AuthContext.Provider value={{ usuario: { rol: 'PRESTADOR' } }}><Requests /></AuthContext.Provider>);
    expect(await screen.findByText('Revisar instalación')).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Propuestas enviadas' }));
    expect(screen.getByText('Aceptada')).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Pendientes' }));
    await user.click(screen.getByRole('button', { name: 'Aceptar' }));
    await user.type(screen.getByLabelText('Fecha'), '2099-12-30');
    await user.type(screen.getByLabelText('Horario'), '15:30');
    await user.type(screen.getByLabelText('Nota opcional'), 'Disponible por la tarde');
    await user.click(screen.getByRole('button', { name: 'Enviar propuesta' }));
    await waitFor(() => expect(apiClient.patch).toHaveBeenCalledWith('/solicitudes/s1/estado', expect.objectContaining({ estado: 'ACEPTADA', notaPropuesta: 'Disponible por la tarde' })));
    expect(screen.getByRole('tab', { name: 'Propuestas enviadas' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText('Propuesta enviada correctamente.')).toBeInTheDocument();
  });

  it('valida fecha pasada y hora pasada de hoy sin enviar', async () => {
    const pending = { id: 's1', estado: 'PENDIENTE', descripcion: 'Trabajo', fechaCreacion: new Date().toISOString(), oficio: { nombre: 'Electricidad' }, cliente: { usuario: { nombre: 'Ana', apellido: 'Pérez' } }, prestador: { usuario: { nombre: 'Leo', apellido: 'Gómez' } } };
    apiClient.get.mockResolvedValue({ data: [pending] });
    const user = userEvent.setup();
    render(<AuthContext.Provider value={{ usuario: { rol: 'PRESTADOR' } }}><Requests /></AuthContext.Provider>);
    await user.click(await screen.findByRole('button', { name: 'Aceptar' }));
    await user.type(screen.getByLabelText('Fecha'), '2000-01-01'); await user.type(screen.getByLabelText('Horario'), '10:00');
    await user.click(screen.getByRole('button', { name: 'Enviar propuesta' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Seleccioná una fecha y un horario futuros');
    await user.clear(screen.getByLabelText('Fecha')); await user.type(screen.getByLabelText('Fecha'), new Date().toISOString().slice(0, 10));
    await user.clear(screen.getByLabelText('Horario')); await user.type(screen.getByLabelText('Horario'), '00:00');
    await user.click(screen.getByRole('button', { name: 'Enviar propuesta' }));
    expect(apiClient.patch).not.toHaveBeenCalled();
  });

  it('conserva pendiente y pestaña cuando falla la propuesta, y cierra el modal al cambiar pestaña', async () => {
    const pending = { id: 's1', estado: 'PENDIENTE', descripcion: 'Trabajo pendiente', fechaCreacion: new Date().toISOString(), oficio: { nombre: 'Electricidad' }, cliente: { usuario: { nombre: 'Ana', apellido: 'Pérez' } }, prestador: { usuario: { nombre: 'Leo', apellido: 'Gómez' } } };
    apiClient.get.mockResolvedValue({ data: [pending] }); apiClient.patch.mockRejectedValue({ response: { data: { error: 'Conflicto de prueba' } } });
    const user = userEvent.setup();
    render(<AuthContext.Provider value={{ usuario: { rol: 'PRESTADOR' } }}><Requests /></AuthContext.Provider>);
    await user.click(await screen.findByRole('button', { name: 'Aceptar' }));
    await user.type(screen.getByLabelText('Fecha'), '2099-12-30'); await user.type(screen.getByLabelText('Horario'), '15:30');
    await user.click(screen.getByRole('button', { name: 'Enviar propuesta' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Conflicto de prueba');
    expect(screen.getByRole('tab', { name: 'Pendientes' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Trabajo pendiente')).toBeInTheDocument(); expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Rechazadas' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('cancela y confirma el rechazo propio, conservando el modal si falla', async () => {
    const pending = { id: 's1', estado: 'PENDIENTE', descripcion: 'Trabajo pendiente', fechaCreacion: new Date().toISOString(), oficio: { nombre: 'Electricidad' }, cliente: { usuario: { nombre: 'Ana', apellido: 'Pérez' } }, prestador: { usuario: { nombre: 'Leo', apellido: 'Gómez' } } };
    apiClient.get.mockResolvedValue({ data: [pending] });
    const user = userEvent.setup();
    render(<AuthContext.Provider value={{ usuario: { rol: 'PRESTADOR' } }}><Requests /></AuthContext.Provider>);
    await user.click(await screen.findByRole('button', { name: 'Rechazar' }));
    expect(screen.getByRole('heading', { name: '¿Rechazar solicitud?' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancelar' })); expect(apiClient.patch).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Rechazar' }));
    apiClient.patch.mockRejectedValueOnce({ response: { data: { error: 'No se pudo rechazar' } } });
    await user.click(screen.getByRole('button', { name: 'Sí, rechazar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo rechazar'); expect(screen.getByRole('dialog')).toBeInTheDocument();
    apiClient.patch.mockResolvedValueOnce({ data: { ...pending, estado: 'RECHAZADA' } });
    await user.click(screen.getByRole('button', { name: 'Sí, rechazar' }));
    expect(await screen.findByText('Solicitud rechazada correctamente.')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Rechazadas' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('impide finalizar antes del horario acordado y conserva los trabajos en Historial', async () => {
    const accepted = { id: 's1', estado: 'ACEPTADA', descripcion: 'Trabajo acordado', fechaCreacion: '2026-09-20T10:00:00Z', fechaPropuesta: '2099-12-30T15:30:00Z', oficio: { nombre: 'Electricidad' }, cliente: { usuario: { nombre: 'Ana', apellido: 'Pérez' } }, prestador: { usuario: { nombre: 'Leo', apellido: 'Gómez' } } };
    apiClient.get.mockResolvedValue({ data: [accepted] });
    const user = userEvent.setup();
    render(<AuthContext.Provider value={{ usuario: { rol: 'PRESTADOR' } }}><Requests /></AuthContext.Provider>);
    await user.click(await screen.findByRole('tab', { name: 'Propuestas enviadas' }));
    await user.click(screen.getByRole('button', { name: 'Marcar finalizada' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Todavía no podés finalizar el trabajo');
    expect(apiClient.patch).not.toHaveBeenCalled();
  });

  it('muestra el historial finalizado ordenado y con sus fechas', async () => {
    const base = { estado: 'FINALIZADA', descripcion: 'Trabajo terminado', fechaCreacion: '2026-09-20T10:00:00Z', fechaPropuesta: '2026-09-21T15:30:00Z', oficio: { nombre: 'Electricidad' }, cliente: { usuario: { nombre: 'Ana', apellido: 'Pérez' } }, prestador: { usuario: { nombre: 'Leo', apellido: 'Gómez' } } };
    apiClient.get.mockResolvedValue({ data: [{ ...base, id: 'viejo', descripcion: 'Trabajo viejo', fechaFinalizacion: '2026-09-22T18:00:00Z' }, { ...base, id: 'nuevo', descripcion: 'Trabajo nuevo', fechaFinalizacion: '2026-09-24T18:00:00Z' }] });
    const user = userEvent.setup();
    render(<AuthContext.Provider value={{ usuario: { rol: 'PRESTADOR' } }}><Requests /></AuthContext.Provider>);
    await user.click(await screen.findByRole('tab', { name: 'Historial' }));
    const cards = screen.getAllByText(/Trabajo (nuevo|viejo)/);
    expect(cards[0]).toHaveTextContent('Trabajo nuevo');
    expect(screen.getAllByText(/Solicitud:/)).toHaveLength(2);
    expect(screen.getAllByText(/Propuesta:/)).toHaveLength(2);
    expect(screen.getAllByText(/Finalización:/)).toHaveLength(2);
  });

  it('muestra y permite editar el perfil real del prestador', async () => {
    const profile = { nombre: 'María López', descripcionProfesional: 'Electricista matriculada', fotoPerfil: null, telefono: '1100000000', zonaCobertura: 'Palermo', latitud: -34.58, longitud: -58.42, isDisponible: true, perfilCompleto: true, promedioCalificaciones: 4.8, trabajosFinalizados: 12, oficios: [{ id: 'o1', nombre: 'Electricidad', precio: 25000, isDisponible: true }] };
    apiClient.get.mockImplementation((url) => Promise.resolve({ data: url === '/prestadores/me' ? profile : [{ id: 'o1', nombre: 'Electricidad' }] }));
    apiClient.put.mockResolvedValue({ data: { ...profile, descripcionProfesional: 'Instalaciones y reparaciones' } });
    const user = userEvent.setup();
    render(<ProviderEdit />);
    expect(await screen.findByRole('heading', { name: 'María López' })).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Editar perfil' }));
    const description = screen.getByLabelText('Descripción profesional');
    await user.clear(description); await user.type(description, 'Instalaciones y reparaciones');
    await user.click(screen.getByRole('button', { name: 'Guardar perfil' }));
    await waitFor(() => expect(apiClient.put).toHaveBeenCalledWith('/prestadores/me', expect.objectContaining({ descripcionProfesional: 'Instalaciones y reparaciones' })));
    expect(await screen.findByText('Instalaciones y reparaciones')).toBeInTheDocument();
  });

  it('guarda y vuelve a mostrar el oficio y precio seleccionados', async () => {
    let profile = { nombre: 'Juan Pérez', descripcionProfesional: 'Trabajos generales', fotoPerfil: null, telefono: '1100000000', zonaCobertura: 'Centro', latitud: -34.6, longitud: -58.4, isDisponible: true, perfilCompleto: true, promedioCalificaciones: null, trabajosFinalizados: 0, oficios: [{ id: 'alb', nombre: 'Albañilería', modalidadPrecio: 'FIJO', precio: 25, precioMinimo: null, precioMaximo: null, isDisponible: true }] };
    const trades = [{ id: 'alb', nombre: 'Albañilería' }, { id: 'vid', nombre: 'Vidriería' }];
    apiClient.get.mockImplementation((url) => Promise.resolve({ data: url === '/prestadores/me' ? profile : trades }));
    apiClient.put.mockImplementation((url, payload) => { if (url === '/prestadores/me/oficios/vid') profile = { ...profile, oficios: [...profile.oficios, { id: 'vid', nombre: 'Vidriería', modalidadPrecio: payload.modalidadPrecio, precio: Number(payload.precio), precioMinimo: null, precioMaximo: null, isDisponible: payload.isDisponible }] }; return Promise.resolve({ data: profile }); });
    const user = userEvent.setup();
    const view = render(<ProviderEdit />);
    await user.click(await screen.findByRole('button', { name: 'Editar perfil' }));
    expect(screen.getByRole('option', { name: 'Seleccioná un oficio' }).selected).toBe(true);
    await user.selectOptions(screen.getByRole('combobox', { name: 'Oficio ofrecido' }), 'vid');
    await user.type(screen.getByLabelText('Precio orientativo'), '25000');
    await user.click(screen.getByRole('button', { name: 'Agregar oficio' }));
    await waitFor(() => expect(apiClient.put).toHaveBeenCalledWith('/prestadores/me/oficios/vid', expect.objectContaining({ modalidadPrecio: 'FIJO', precio: '25000', isDisponible: true })));
    await waitFor(() => expect(screen.getByText((_, element) => element.tagName === 'SMALL' && element.textContent.includes('$25.000'))).toBeInTheDocument());
    view.unmount();
    render(<ProviderEdit />);
    await screen.findByRole('heading', { name: 'Juan Pérez' });
    expect(screen.getByText((_, element) => element.tagName === 'SPAN' && element.textContent.includes('Vidriería: $25.000'))).toBeInTheDocument();
  });

  it('edita el precio del oficio existente sin crear otro registro', async () => {
    let profile = { nombre: 'Ana Ruiz', descripcionProfesional: 'Carpintería', fotoPerfil: null, telefono: '1100000000', zonaCobertura: 'Centro', latitud: -34.6, longitud: -58.4, isDisponible: true, perfilCompleto: true, promedioCalificaciones: null, trabajosFinalizados: 0, oficios: [{ id: 'carp', nombre: 'Carpintería', modalidadPrecio: 'FIJO', precio: 25000, precioMinimo: null, precioMaximo: null, isDisponible: true }] };
    apiClient.get.mockImplementation((url) => Promise.resolve({ data: url === '/prestadores/me' ? profile : [{ id: 'carp', nombre: 'Carpintería' }] }));
    apiClient.put.mockImplementation((url, payload) => { if (url === '/prestadores/me/oficios/carp') profile = { ...profile, oficios: [{ ...profile.oficios[0], modalidadPrecio: payload.modalidadPrecio, precio: payload.modalidadPrecio === 'FIJO' ? Number(payload.precio) : null, precioMinimo: payload.modalidadPrecio === 'RANGO' ? Number(payload.precioMinimo) : null, precioMaximo: payload.modalidadPrecio === 'RANGO' ? Number(payload.precioMaximo) : null, isDisponible: payload.isDisponible }] }; return Promise.resolve({ data: profile }); });
    const user = userEvent.setup();
    const view = render(<ProviderEdit />);
    await user.click(await screen.findByRole('button', { name: 'Editar perfil' }));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Oficio ofrecido' }), 'carp');
    expect(screen.getByText('Estás actualizando este oficio')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Oficio ofrecido' })).toHaveValue('carp');
    const price = screen.getByLabelText('Precio orientativo');
    expect(price).toHaveValue(25000);
    await user.selectOptions(screen.getByRole('combobox', { name: 'Modalidad de precio' }), 'RANGO');
    expect(screen.queryByLabelText('Precio orientativo')).not.toBeInTheDocument();
    await user.type(screen.getByLabelText('Precio mínimo'), '20000'); await user.type(screen.getByLabelText('Precio máximo'), '50000');
    await user.click(screen.getByRole('button', { name: 'Actualizar oficio' }));
    await waitFor(() => expect(apiClient.put).toHaveBeenCalledWith('/prestadores/me/oficios/carp', expect.objectContaining({ modalidadPrecio: 'RANGO', precio: '', precioMinimo: '20000', precioMaximo: '50000', isDisponible: true })));
    expect(profile.oficios).toHaveLength(1);
    view.unmount(); render(<ProviderEdit />);
    await screen.findByRole('heading', { name: 'Ana Ruiz' });
    expect(screen.getByText((_, element) => element.tagName === 'SPAN' && element.textContent.includes('Carpintería: $20.000 – $50.000'))).toBeInTheDocument();
  });
});
