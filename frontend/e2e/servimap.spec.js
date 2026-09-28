import { test, expect } from '@playwright/test';

const password = process.env.E2E_PASSWORD;
const providerEmail = process.env.E2E_PROVIDER_EMAIL;
const clientEmail = process.env.E2E_CLIENT_EMAIL;

async function register(page, role, email, nombre) {
  await page.goto(`/registro/${role}`);
  await page.getByLabel('Nombre').fill(nombre);
  await page.getByLabel('Apellido').fill('E2E');
  await page.getByLabel('Correo').fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  await page.getByLabel('Confirmar contraseña').fill(password);
  await page.getByRole('button', { name: 'Crear cuenta' }).click();
}

async function login(page, email, role = 'CLIENTE') {
  await page.goto('/login');
  if (role === 'PRESTADOR') await page.getByRole('button', { name: /Soy Prestador/ }).click();
  await page.getByLabel('Correo').fill(email);
  await page.getByLabel('Contraseña').fill(password);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await expect(page).toHaveURL(/\/app/);
}

test('recorrido real de registro, perfil, búsqueda, solicitud y propuesta', async ({ page }) => {
  await register(page, 'prestador', providerEmail, 'Profesional');
  await expect(page).toHaveURL(/\/app\/perfil/);
  await page.getByRole('button', { name: 'Editar perfil' }).click();
  await page.getByLabel('Oficio ofrecido').selectOption({ label: 'Electricidad' });
  await page.getByLabel('Precio orientativo').fill('25000');
  await page.getByRole('button', { name: 'Agregar oficio' }).click();
  await expect(page.getByText('Servicio actualizado.')).toBeVisible();
  await page.getByLabel('Descripción profesional').fill('Electricista matriculado para hogares y comercios.');
  await page.getByLabel('Zona de cobertura').fill('Palermo, Buenos Aires');
  await page.getByLabel('Teléfono').fill('11 1234 5678');
  await page.getByLabel('Latitud aproximada').fill('-34.58321');
  await page.getByLabel('Longitud aproximada').fill('-58.42567');
  await page.getByLabel('Disponible para nuevos trabajos').check();
  await page.getByRole('button', { name: 'Guardar perfil' }).click();
  await expect(page.getByText('Perfil guardado.')).toBeVisible();
  await page.getByRole('button', { name: 'Abrir menú de usuario' }).click();
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();

  await register(page, 'cliente', clientEmail, 'Cliente');
  await expect(page).toHaveURL(/\/app\/buscar$/);
  await expect(page.locator('.leaflet-container')).toBeVisible();
  await expect(page.locator('img.leaflet-tile').first()).toBeAttached();
  await page.getByLabel('Oficio', { exact: true }).selectOption({ label: 'Electricidad' });
  await page.getByRole('button', { name: 'Buscar' }).click();
  await expect(page.getByRole('heading', { name: 'Profesional E2E' })).toBeVisible();
  await expect(page.locator('.leaflet-marker-icon')).toHaveCount(1);
  await page.getByRole('link', { name: 'Ver perfil' }).first().click();
  await page.getByLabel('Contale qué necesitás').fill('Necesito revisar el tablero eléctrico de mi casa.');
  await page.getByRole('button', { name: 'Enviar solicitud' }).click();
  await expect(page.getByText(/Solicitud enviada/)).toBeVisible();
  await page.getByRole('link', { name: 'ServiMap' }).click();
  await page.getByRole('button', { name: 'Abrir menú de usuario' }).click();
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();

  await login(page, providerEmail, 'PRESTADOR');
  await page.getByRole('navigation').getByRole('link', { name: 'Solicitudes', exact: true }).click();
  await page.getByRole('button', { name: 'Aceptar' }).click();
  const proposal = new Date(Date.now() + 86_400_000);
  const date = `${proposal.getFullYear()}-${String(proposal.getMonth() + 1).padStart(2, '0')}-${String(proposal.getDate()).padStart(2, '0')}`;
  await page.getByLabel('Fecha').fill(date);
  await page.locator('input[type="time"]').fill('15:30');
  await page.getByRole('button', { name: 'Enviar propuesta' }).click();
  await expect(page.getByText('Propuesta enviada correctamente.')).toBeVisible();
  await page.getByRole('button', { name: 'Abrir menú de usuario' }).click();
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();

  await login(page, clientEmail);
  await page.getByRole('navigation').getByRole('link', { name: 'Mis solicitudes' }).click();
  await expect(page.getByText('Propuesta enviada')).toBeVisible();
  await expect(page.getByText(/Propuesta:/)).toBeVisible();
  await page.getByRole('button', { name: 'Aceptar propuesta' }).click();
  await expect(page.getByText('Propuesta aceptada correctamente.')).toBeVisible();
  await expect(page.getByText('Aceptada', { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/app');
  await expect(page.getByRole('link', { name: 'ServiMap' })).toBeVisible();
});
